import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { parseRunlog, resolveSupersession } from './check-runlog.mjs';
import { findVacuousProbes } from './check-effect-probe.mjs';

/**
 * Detective control for ADR-0013's deployment-layer change record (section 5). Extends
 * `check-runlog` (its JSONL parser and supersession resolver) rather than forking
 * it, and imports `check-effect-probe`'s non-vacuity matcher for property 4 so the
 * outcome record's probe shape is checked by the SAME gate that already owns that
 * property - a second non-vacuity gate was refused in the ADR.
 *
 * Record kinds: proposal | outcome | authorization | reproof (ADR-0013 section 2).
 * A correction is a NEW record carrying `supersedes: <change_id>` and the same
 * `change_id` - resolved per kind (proposal corrections supersede proposals;
 * outcome corrections supersede outcomes) with the SAME resolver check-runlog
 * uses for its own append-only ledger (ADR-0004 amendment 2026-08-18).
 *
 * Three outcomes, the `check-misfire-closure` convention:
 *   exit 0  clean
 *   exit 1  FAIL - a violation of one of the six properties, or a malformed /
 *           orphan / out-of-order / badly-superseded record
 *   exit 2  UNEVALUABLE - a change's newest record carries an honestly recorded
 *           `unevaluable` verdict with no break-glass. Unevaluable halts.
 * An empty log passes vacuously and says so.
 *
 * HONEST LIMIT - form only, stated everywhere this file is read: it cannot run a
 * backout, read a metric, or hash an artifact it is not handed. It verifies that
 * a change record has the SHAPE the six properties require, never the target
 * semantics behind it (ADR-0002).
 */

export const KINDS = ['proposal', 'outcome', 'authorization', 'reproof'];

const isText = (v) => typeof v === 'string' && v.trim() !== '';
const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const parses = (v) => isText(v) && !Number.isNaN(Date.parse(v));

// Every timestamp the gate reads must carry an explicit UTC offset (Z or
// +-hh:mm) - a naive timestamp's ordering depends on the runner's timezone.
const OFFSET_RE = /(?:Z|[+-]\d{2}:\d{2})$/;
const hasOffset = (v) => isText(v) && OFFSET_RE.test(v.trim());

// backout.kind vocabulary (ADR-0013 section 2). Any other value - e.g. the
// skeptic-found 'apply-previous-module' - is a form violation and is never
// credited as a backout.
const BACKOUT_KINDS = ['rollout-undo', 'previous-rendered-manifest', 'reverse-plan-ephemeral', 'state-snapshot-restore', 'described'];

const SIGNAL_SCOPES = ['in-radius', 'not-in-scope'];
const SIGNAL_OUTCOMES = ['pass', 'fail', 'unevaluable', 'not-in-scope'];

// P2 - a present sha256 must be a real 64-char lowercase hex digest, never a
// placeholder or wrong-case string.
const SHA256_RE = /^[0-9a-f]{64}$/;

// P2 - an identity path the hook would already refuse: absolute (POSIX '/',
// Windows drive-letter or UNC), or carrying a '..' segment that escapes the
// declared root.
function isUnsafeIdentityPath(p) {
  if (p.startsWith('/') || p.startsWith('\\')) return true;
  if (/^[A-Za-z]:[\\/]/.test(p)) return true;
  return p.split(/[\\/]+/).includes('..');
}

/**
 * sha256 hex over the identity list, reduced to {name, sha256} or {name, value}
 * (path omitted), sorted by name. Empty or invalid input -> ''.
 */
export function identityDigest(identity) {
  if (!Array.isArray(identity) || identity.length === 0) return '';
  const reduced = identity
    .filter((e) => e && typeof e === 'object' && isText(e.name))
    .map((e) => {
      if (e.sha256 !== undefined) return { name: e.name, sha256: e.sha256 };
      if (e.value !== undefined) return { name: e.name, value: e.value };
      return { name: e.name };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  if (reduced.length === 0) return '';
  return createHash('sha256').update(JSON.stringify(reduced)).digest('hex');
}

/**
 * The fold, verbatim from `data-quality-fail-closed`: any in-radius unevaluable
 * -> unevaluable; else any in-radius fail -> fail; else pass; zero in-radius
 * signals -> unevaluable. A stale in-radius signal (last_sample_ts before
 * window.from) counts as unevaluable regardless of its stated outcome.
 */
export function foldHealth(health) {
  const window = isObj(health?.window) ? health.window : {};
  const signals = Array.isArray(health?.signals) ? health.signals : [];
  const inRadius = signals.filter((s) => s?.scope === 'in-radius');
  if (inRadius.length === 0) return 'unevaluable';
  // An absent/unparseable window.from or window.to is an empty evaluation
  // window - unevaluable, never coerced by reading past it. An INVERTED
  // window (from after to) is the same empty-window case: the range from
  // `from` to `to` contains no instants, so nothing can have been read in it.
  if (!parses(window.from) || !parses(window.to) || Date.parse(window.from) > Date.parse(window.to)) return 'unevaluable';
  let anyFail = false;
  let anyUnevaluable = false;
  for (const s of inRadius) {
    const hasSource = isText(s?.source);
    const hasSampleTs = parses(s?.last_sample_ts);
    const stale = hasSampleTs && Date.parse(s.last_sample_ts) < Date.parse(window.from);
    const validOutcome = SIGNAL_OUTCOMES.slice(0, 3).includes(s?.outcome); // pass|fail|unevaluable only - not-in-scope is never a valid in-radius reading
    // BLOCKING coercion: a missing metric (no source), a stale reading, or an
    // outcome outside pass|fail|unevaluable (absent, 'ok', 'PASS', 'not-in-scope',
    // anything else) folds to unevaluable - it must never silently fold to pass.
    const outcome = (!hasSource || !hasSampleTs || stale || !validOutcome) ? 'unevaluable' : s.outcome;
    if (outcome === 'unevaluable') anyUnevaluable = true;
    else if (outcome === 'fail') anyFail = true;
  }
  if (anyUnevaluable) return 'unevaluable';
  return anyFail ? 'fail' : 'pass';
}

/**
 * Gaps in a proposal's `approval` field ([] when complete). `null`/`undefined`
 * (pending - no sign-off recorded yet) is reported as a single gap so a
 * caller can distinguish "not yet approved" from "approved but malformed"
 * only by inspecting the gap text, while both still count as incomplete.
 */
function approvalGaps(approval) {
  if (approval === null || approval === undefined) return ['approval is null/absent'];
  const gaps = [];
  for (const f of ['who', 'ref']) {
    if (!isText(approval?.[f])) gaps.push(f);
  }
  if (!isText(approval?.when)) {
    gaps.push('when (missing)');
  } else if (Number.isNaN(Date.parse(approval.when))) {
    gaps.push('when (unparseable)');
  } else if (!hasOffset(approval.when)) {
    gaps.push('when (no explicit UTC offset)');
  }
  return gaps;
}

function isBackoutCredited(proposal) {
  const b = proposal?.backout;
  if (!isObj(b)) return false;
  if (!BACKOUT_KINDS.includes(b.kind)) return false;
  if (b.kind === 'described') return false;
  if (b.exit_code !== 0) return false;
  if (!isText(b.run_ref)) return false;
  const expected = identityDigest(proposal?.artifact?.identity);
  return expected !== '' && b.exercised_against === expected;
}

/** Outcome records (as {r, i}) whose proposal belongs to `pattern`. */
function patternOutcomes(records, pattern) {
  const patternChangeIds = new Set(
    records.filter((r) => r?.kind === 'proposal' && r?.pattern === pattern).map((r) => r.change_id),
  );
  return records
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r?.kind === 'outcome' && patternChangeIds.has(r.change_id));
}

/**
 * True when the pattern's latest outcome (by ts_executed, ties broken by
 * append-only record position) is a misfire with no later reproof recorded
 * for the pattern (append-only position, since `reproof` carries no timestamp).
 */
function latestOutcomeIsMisfireUnrepaired(records, pattern, beforeTs) {
  let outcomes = patternOutcomes(records, pattern);
  if (beforeTs !== undefined) {
    // Bounded AS OF EXECUTION: an outcome whose own ts_executed is not
    // strictly before beforeTs (the outcome under check itself, or anything
    // recorded after it) must never demote the proposal beforeTs anchors.
    outcomes = outcomes.filter(({ r }) => parses(r.ts_executed) && Date.parse(r.ts_executed) < Date.parse(beforeTs));
  }
  if (outcomes.length === 0) return false;
  outcomes = outcomes.slice().sort((a, b) => {
    const ta = Date.parse(a.r.ts_executed);
    const tb = Date.parse(b.r.ts_executed);
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return ta - tb;
    return a.i - b.i;
  });
  const latest = outcomes[outcomes.length - 1];
  if (latest.r.outcome !== 'misfire') return false;
  const reproofAfter = records.some((r, idx) => r?.kind === 'reproof' && r?.pattern === pattern && idx > latest.i);
  return !reproofAfter;
}

/**
 * proposed 2 -> 2. Class 0/1 must cite an authorization record that exists,
 * kind 'authorization', same pattern, same class - else the effective class is
 * 2 (fail-closed on an unclassifiable or bad citation). A class-0 pattern whose
 * latest outcome is an unrepaired misfire is demoted to 1.
 *
 * `beforeTs`, when supplied, computes the class AS OF that instant: only
 * outcomes with ts_executed strictly before it can demote the pattern. This
 * keeps an outcome's own execution (or anything recorded after it) from
 * retroactively demoting its own proposal - the outcome loop passes its own
 * ts_executed so a class-0 instance whose own outcome is a misfire is still
 * evaluated at the class it was proposed at, while a LATER proposal for the
 * same pattern sees the misfire and is demoted as before.
 */
export function effectiveClass(records, proposal, beforeTs) {
  const proposed = proposal?.class?.proposed;
  if (proposed === 2) return 2;
  if (proposed !== 0 && proposed !== 1) return 2;
  const authId = proposal?.class?.authorization;
  const auth = records.find((r) => r?.kind === 'authorization' && r?.id === authId);
  // A cited authorization that fails its own form check (granted_by,
  // granted_on, criteria missing/malformed, ...) is unresolved - it is never
  // trusted to earn a class down from 2 just because its id/pattern/class
  // happen to match.
  if (!auth || auth.pattern !== proposal?.pattern || auth.class !== proposed || authorizationFormGaps(auth).length > 0) return 2;
  if (proposed === 0 && latestOutcomeIsMisfireUnrepaired(records, proposal.pattern, beforeTs)) return 1;
  return proposed;
}

/**
 * The ledger evidence a human reads to earn a pattern downward: cleanInstances
 * (outcomes recorded before `beforeTs`, if given, with outcome 'clean' whose
 * probe is non-vacuous), backoutsExercised (this pattern's proposals with a
 * CREDITED backout), nonvacuousProbes (this pattern's outcomes whose probe is
 * non-vacuous).
 */
export function earnedClassEvidence(records, pattern, beforeTs) {
  const proposals = records.filter((r) => r?.kind === 'proposal' && r?.pattern === pattern);
  const patternChangeIds = new Set(proposals.map((r) => r.change_id));
  const outcomes = records.filter((r) => r?.kind === 'outcome' && patternChangeIds.has(r.change_id));

  const cleanInstances = outcomes.filter((o) => {
    if (beforeTs !== undefined) {
      if (!parses(o.ts_recorded) || Date.parse(o.ts_recorded) >= Date.parse(beforeTs)) return false;
    }
    if (o.outcome !== 'clean') return false;
    return findVacuousProbes([o.probe ?? {}]).length === 0;
  }).length;

  const backoutsExercised = proposals.filter((p) => isBackoutCredited(p)).length;
  const nonvacuousProbes = outcomes.filter((o) => findVacuousProbes([o.probe ?? {}]).length === 0).length;

  return { cleanInstances, backoutsExercised, nonvacuousProbes };
}

function isSubset(sub, sup) {
  if (!Array.isArray(sub) || !Array.isArray(sup)) return false;
  const supSet = new Set(sup);
  return sub.every((x) => supSet.has(x));
}

function labelFor(r) {
  if (r?.kind === 'proposal' || r?.kind === 'outcome') return `${r.kind} ${r?.change_id ?? '<unnumbered>'}`;
  if (r?.kind === 'authorization') return `authorization ${r?.id ?? '<unnumbered>'}`;
  if (r?.kind === 'reproof') return `reproof ${r?.pattern ?? '<pattern?>'}/${r?.closure_id ?? '<unnumbered>'}`;
  return '<unknown record>';
}

function checkHealthRecord(h, id, property, violations, { field, boundaryCheck }) {
  if (!isObj(h)) return;

  // Form: window.from/to required, parseable, explicit UTC offset.
  const window = isObj(h.window) ? h.window : {};
  for (const wf of ['from', 'to']) {
    if (!isText(window[wf])) {
      violations.push({ entry: id, property: 'form', reason: `${field}.window.${wf} is missing` });
    } else if (Number.isNaN(Date.parse(window[wf]))) {
      violations.push({ entry: id, property: 'form', reason: `${field}.window.${wf} is not a parseable RFC 3339 timestamp` });
    } else if (!hasOffset(window[wf])) {
      violations.push({ entry: id, property: 'form', reason: `${field}.window.${wf} has no explicit UTC offset (naive timestamp)` });
    }
  }

  // Form: an inverted window (from after to) is an empty evaluation window -
  // flagged directly rather than left to silently fold to unevaluable.
  if (isText(window.from) && isText(window.to) &&
      !Number.isNaN(Date.parse(window.from)) && !Number.isNaN(Date.parse(window.to)) &&
      Date.parse(window.from) > Date.parse(window.to)) {
    violations.push({ entry: id, property: 'form', reason: `${field}.window is inverted (from after to) - empty evaluation window` });
  }

  const fold = foldHealth(h);
  if (h.verdict !== fold) {
    violations.push({ entry: id, property, reason: `${field}.verdict is ${JSON.stringify(h.verdict)} but the fold of its signals is ${fold}` });
  }

  for (const s of Array.isArray(h.signals) ? h.signals : []) {
    const sid = s?.id ?? '<unnamed>';

    // Form: each signal requires id, scope in {in-radius, not-in-scope},
    // outcome in {pass, fail, unevaluable, not-in-scope}, non-empty source,
    // last_sample_ts (parseable, explicit UTC offset).
    if (!isText(s?.id)) {
      violations.push({ entry: id, property: 'form', reason: `${field} has a signal missing id` });
    }
    if (!SIGNAL_SCOPES.includes(s?.scope)) {
      violations.push({ entry: id, property: 'form', reason: `signal ${sid} has an invalid scope ${JSON.stringify(s?.scope)}` });
    }
    if (!SIGNAL_OUTCOMES.includes(s?.outcome)) {
      violations.push({ entry: id, property: 'form', reason: `signal ${sid} has an outcome outside pass/fail/unevaluable/not-in-scope: ${JSON.stringify(s?.outcome)}` });
    }
    if (!isText(s?.source)) {
      violations.push({ entry: id, property: 'form', reason: `signal ${sid} is missing a non-empty source` });
    }
    if (!isText(s?.last_sample_ts)) {
      violations.push({ entry: id, property: 'form', reason: `signal ${sid} is missing last_sample_ts` });
    } else if (Number.isNaN(Date.parse(s.last_sample_ts))) {
      violations.push({ entry: id, property: 'form', reason: `signal ${sid} last_sample_ts is not a parseable RFC 3339 timestamp` });
    } else if (!hasOffset(s.last_sample_ts)) {
      violations.push({ entry: id, property: 'form', reason: `signal ${sid} last_sample_ts has no explicit UTC offset (naive timestamp)` });
    }

    // Form: a scope/outcome mismatch either direction.
    if (s?.scope === 'in-radius' && s?.outcome === 'not-in-scope') {
      violations.push({ entry: id, property: 'form', reason: `signal ${sid} is in-radius but its outcome is not-in-scope` });
    }
    if (s?.scope === 'not-in-scope' && s?.outcome !== 'not-in-scope') {
      violations.push({ entry: id, property, reason: `signal ${sid} is not-in-scope but its outcome is ${JSON.stringify(s?.outcome)}` });
    }
    if (s?.scope === 'in-radius' && isText(window.from) && isText(s?.last_sample_ts)) {
      const stale = !Number.isNaN(Date.parse(s.last_sample_ts)) && !Number.isNaN(Date.parse(window.from)) &&
        Date.parse(s.last_sample_ts) < Date.parse(window.from);
      if (stale && s.outcome !== 'unevaluable') {
        violations.push({ entry: id, property, reason: `signal ${sid} is stale (last_sample_ts before window.from) but outcome is ${JSON.stringify(s.outcome)}, not unevaluable` });
      }
    }

    // Form: a signal sampled AFTER window.to is outside the declared
    // evaluation window just as one sampled before window.from (stale) is.
    if (isText(window.to) && isText(s?.last_sample_ts) &&
        !Number.isNaN(Date.parse(window.to)) && !Number.isNaN(Date.parse(s.last_sample_ts)) &&
        Date.parse(s.last_sample_ts) > Date.parse(window.to)) {
      violations.push({ entry: id, property: 'form', reason: `signal ${sid} last_sample_ts is after ${field}.window.to - sample outside the window` });
    }
  }
  if (boundaryCheck) {
    const msg = boundaryCheck(h);
    if (msg) violations.push({ entry: id, property, reason: msg });
  }
}

function checkProposalForm(r, id, violations) {
  const missing = [];
  for (const f of ['change_id', 'pattern', 'ts_proposed', 'ts_recorded', 'proposed_by']) {
    if (!isText(r?.[f])) missing.push(f);
  }
  if (!isObj(r?.target) || !isText(r.target.kind) || !isText(r.target.ref)) missing.push('target.kind/ref');
  if (![0, 1, 2].includes(r?.class?.proposed)) missing.push('class.proposed');
  if (!isObj(r?.class) || !('authorization' in r.class)) missing.push('class.authorization');
  if (!isObj(r?.artifact) || !Array.isArray(r.artifact.identity)) missing.push('artifact.identity');
  if (!isObj(r?.backout)) {
    missing.push('backout');
  } else {
    for (const f of ['kind', 'exercised_against', 'run_ref', 'by']) {
      if (!isText(r.backout[f])) missing.push(`backout.${f}`);
    }
    if (typeof r.backout.exit_code !== 'number') missing.push('backout.exit_code');
    if (isText(r.backout.kind) && !BACKOUT_KINDS.includes(r.backout.kind)) {
      missing.push(`backout.kind (${JSON.stringify(r.backout.kind)} is not one of ${BACKOUT_KINDS.join('|')})`);
    }
  }
  if (!isObj(r?.blast_radius) || !Array.isArray(r.blast_radius.declared) || !Array.isArray(r.blast_radius.plan_diff)) {
    missing.push('blast_radius');
  } else if (!isObj(r.blast_radius.plan_diff_source) || !isText(r.blast_radius.plan_diff_source.cmd) || !isText(r.blast_radius.plan_diff_source.sha256)) {
    missing.push('blast_radius.plan_diff_source');
  }
  if (!isObj(r?.health_baseline) || !['pass', 'fail', 'unevaluable'].includes(r.health_baseline.verdict) ||
      !isObj(r.health_baseline.window) || !Array.isArray(r.health_baseline.signals)) {
    missing.push('health_baseline');
  }
  if (!isObj(r?.probe_plan)) missing.push('probe_plan');
  if (missing.length) violations.push({ entry: id, property: 'form', reason: `missing or malformed: ${missing.join(', ')}` });

  for (const f of ['ts_proposed', 'ts_recorded']) {
    if (isText(r?.[f])) {
      if (Number.isNaN(Date.parse(r[f]))) {
        violations.push({ entry: id, property: 'form', reason: `${f} is not a parseable RFC 3339 timestamp` });
      } else if (!hasOffset(r[f])) {
        violations.push({ entry: id, property: 'form', reason: `${f} has no explicit UTC offset (naive timestamp) - ordering would depend on the runner's timezone` });
      }
    }
  }
  if (parses(r?.ts_proposed) && parses(r?.ts_recorded) && Date.parse(r.ts_recorded) < Date.parse(r.ts_proposed)) {
    violations.push({ entry: id, property: 'form', reason: 'ts_recorded is before ts_proposed - capture-time anchoring violated' });
  }

  // Schema rule: approval on a class-1 proposal, when present, needs who,
  // when (explicit UTC offset), and ref all non-empty. Absent/null is NOT
  // flagged here - a proposal with no outcome yet is pending, not violating
  // (the P6 check below covers what happens once it has executed).
  if (r?.class?.proposed === 1 && r?.approval !== null && r?.approval !== undefined) {
    const gaps = approvalGaps(r.approval);
    if (gaps.length) {
      violations.push({ entry: id, property: 'form', reason: `approval is missing/invalid: ${gaps.join(', ')}` });
    }
  }
}

function checkOutcomeForm(r, id, violations) {
  const missing = [];
  for (const f of ['change_id', 'ts_executed', 'ts_recorded', 'executed_by']) {
    if (!isText(r?.[f])) missing.push(f);
  }
  if (!isObj(r?.health)) missing.push('health');
  if (!isObj(r?.probe)) missing.push('probe');
  if (!['clean', 'misfire'].includes(r?.outcome)) missing.push('outcome');
  if (missing.length) violations.push({ entry: id, property: 'form', reason: `missing or malformed: ${missing.join(', ')}` });

  for (const f of ['ts_executed', 'ts_recorded']) {
    if (isText(r?.[f])) {
      if (Number.isNaN(Date.parse(r[f]))) {
        violations.push({ entry: id, property: 'form', reason: `${f} is not a parseable RFC 3339 timestamp` });
      } else if (!hasOffset(r[f])) {
        violations.push({ entry: id, property: 'form', reason: `${f} has no explicit UTC offset (naive timestamp) - ordering would depend on the runner's timezone` });
      }
    }
  }
  if (parses(r?.ts_executed) && parses(r?.ts_recorded) && Date.parse(r.ts_recorded) < Date.parse(r.ts_executed)) {
    violations.push({ entry: id, property: 'form', reason: 'ts_recorded is before ts_executed - capture-time anchoring violated' });
  }
}

/**
 * Missing/malformed fields on an authorization record. Shared by the form
 * checker (which reports them) and `effectiveClass` (which treats any gap as
 * an unresolved citation - a cited authorization that is itself malformed
 * must never be trusted to resolve a class down from 2, P6).
 */
function authorizationFormGaps(r) {
  const missing = [];
  for (const f of ['id', 'pattern', 'granted_by', 'granted_on', 'identity_rule', 'backout_rule']) {
    if (!isText(r?.[f])) missing.push(f);
  }
  if (![0, 1].includes(r?.class)) missing.push('class');
  if (!isObj(r?.criteria)) {
    missing.push('criteria');
  } else {
    if (typeof r.criteria.min_clean_instances !== 'number') missing.push('criteria.min_clean_instances');
    if (typeof r.criteria.backout_exercised !== 'boolean') missing.push('criteria.backout_exercised');
  }
  if (!isText(r?.basis)) missing.push('basis');
  return missing;
}

function checkAuthorizationForm(r, id, violations) {
  const missing = authorizationFormGaps(r);
  if (missing.length) violations.push({ entry: id, property: 'form', reason: `missing or malformed: ${missing.join(', ')}` });
}

function checkReproofForm(r, id, violations) {
  const missing = [];
  for (const f of ['pattern', 'closure_id', 'by', 'on']) {
    if (!isText(r?.[f])) missing.push(f);
  }
  if (missing.length) violations.push({ entry: id, property: 'form', reason: `missing or malformed: ${missing.join(', ')}` });
}

export function findChangeRecordViolations(records, { digests = {} } = {}) {
  const violations = [];

  records.forEach((r) => {
    if (!KINDS.includes(r?.kind)) {
      violations.push({ entry: labelFor(r), property: 'form', reason: `unknown kind ${JSON.stringify(r?.kind)}` });
    }
  });

  const byKind = { proposal: [], outcome: [], authorization: [], reproof: [] };
  records.forEach((r, i) => { if (KINDS.includes(r?.kind)) byKind[r.kind].push(i); });

  // Supersession, per kind, using the same resolver check-runlog's own ledger uses.
  const superseded = new Set();
  for (const kind of ['proposal', 'outcome']) {
    const idxs = byKind[kind];
    const subset = idxs.map((i) => records[i]);
    const { superseded: localSuperseded, violations: supViolations } = resolveSupersession(subset, {
      key: 'change_id',
      label: (r) => `${kind} ${r?.change_id ?? '<unnumbered>'}`,
    });
    localSuperseded.forEach((li) => superseded.add(idxs[li]));
    supViolations.forEach((v) => violations.push({ entry: v.entry, property: 'form', reason: v.reason }));
  }

  // Duplicate change_id among non-superseding (original) proposals.
  const seenChangeId = new Map();
  byKind.proposal.forEach((i) => {
    const r = records[i];
    if (r?.supersedes !== undefined) return;
    if (!isText(r?.change_id)) return;
    if (seenChangeId.has(r.change_id)) {
      violations.push({ entry: `proposal ${r.change_id}`, property: 'form', reason: `duplicate change_id - a second original proposal cannot reuse change_id ${r.change_id} (use supersedes for a correction)` });
    } else {
      seenChangeId.set(r.change_id, i);
    }
  });

  // Duplicate change_id among non-superseding (original) outcomes - mirrors
  // the proposal duplicate check above.
  const seenOutcomeChangeId = new Map();
  byKind.outcome.forEach((i) => {
    const r = records[i];
    if (r?.supersedes !== undefined) return;
    if (!isText(r?.change_id)) return;
    if (seenOutcomeChangeId.has(r.change_id)) {
      violations.push({ entry: `outcome ${r.change_id}`, property: 'form', reason: `duplicate outcome - a second original outcome cannot reuse change_id ${r.change_id}; use supersedes for a correction` });
    } else {
      seenOutcomeChangeId.set(r.change_id, i);
    }
  });

  // Orphan outcomes: no proposal record shares the change_id.
  const proposalChangeIds = new Set(byKind.proposal.map((i) => records[i]?.change_id).filter(isText));
  byKind.outcome.forEach((i) => {
    const r = records[i];
    if (isText(r?.change_id) && !proposalChangeIds.has(r.change_id)) {
      violations.push({ entry: `outcome ${r.change_id}`, property: 'form', reason: `outcome has no matching proposal (orphan) for change_id ${r.change_id}` });
    }
  });

  // Field-level form checks, skipping superseded (stale) records the way check-runlog does.
  byKind.proposal.forEach((i) => { if (!superseded.has(i)) checkProposalForm(records[i], labelFor(records[i]), violations); });
  byKind.outcome.forEach((i) => { if (!superseded.has(i)) checkOutcomeForm(records[i], labelFor(records[i]), violations); });
  byKind.authorization.forEach((i) => checkAuthorizationForm(records[i], labelFor(records[i]), violations));
  byKind.reproof.forEach((i) => checkReproofForm(records[i], labelFor(records[i]), violations));

  // ---- Properties 1-6, over non-superseded proposals/outcomes ----

  byKind.proposal.forEach((i) => {
    if (superseded.has(i)) return;
    const r = records[i];
    const id = labelFor(r);

    // P1 - backout, form-only.
    const b = r?.backout;
    if (isObj(b)) {
      if (b.kind === 'described') {
        violations.push({ entry: id, property: 'P1', reason: 'backout.kind is "described" - a claim, not evidence; a backout must be run against the candidate before the deploy' });
      }
      if (b.exit_code !== 0) {
        violations.push({ entry: id, property: 'P1', reason: `backout.exit_code is ${JSON.stringify(b.exit_code)}, not 0 - a run that failed is not a credited backout` });
      }
      if (!isText(b.run_ref)) {
        violations.push({ entry: id, property: 'P1', reason: 'backout.run_ref is empty - no evidence the backout ran' });
      }
      const expectedDigest = identityDigest(r?.artifact?.identity);
      if (b.exercised_against !== expectedDigest) {
        violations.push({ entry: id, property: 'P1', reason: 'backout.exercised_against does not match this candidate\'s identity digest - the backout ran against a different candidate' });
      }
    }

    // P2 - artifact identity.
    const identity = r?.artifact?.identity;
    if (!Array.isArray(identity) || identity.length === 0) {
      violations.push({ entry: id, property: 'P2', reason: 'artifact.identity is empty' });
    } else {
      identity.forEach((e, ei) => {
        const hasSha = !!e && e.sha256 !== undefined;
        const hasValue = !!e && e.value !== undefined;
        if (!e || (!hasSha && !hasValue)) {
          violations.push({ entry: id, property: 'P2', reason: `artifact.identity[${ei}] (${e?.name ?? '<unnamed>'}) has neither sha256 nor value` });
        } else if (hasValue && !hasSha) {
          // Value-only identity entry (e.g. Terraform's state_serial): the
          // value must be a non-empty string or a finite number - '' / null
          // is a placeholder, not an attested identity.
          const v = e.value;
          const validValue = (typeof v === 'string' && v.trim() !== '') || (typeof v === 'number' && Number.isFinite(v));
          if (!validValue) {
            violations.push({ entry: id, property: 'P2', reason: `artifact.identity[${ei}] (${e?.name ?? '<unnamed>'}) value must be a non-empty string or a finite number` });
          }
        }

        // A present sha256 must be a real 64-char lowercase hex digest.
        if (hasSha && (typeof e.sha256 !== 'string' || !SHA256_RE.test(e.sha256))) {
          violations.push({ entry: id, property: 'P2', reason: `artifact.identity[${ei}] (${e?.name ?? '<unnamed>'}) sha256 is not a valid 64-char lowercase hex digest` });
        }

        // A sha256-bearing entry with NO path key at all is unrecomputable -
        // there is nothing to hash to check the digest against, ever. This
        // sits OUTSIDE the hasOwnProperty(path) guard below (which only
        // covers entries that DO carry a path, valid or not).
        if (hasSha && e && !Object.prototype.hasOwnProperty.call(e, 'path')) {
          violations.push({ entry: id, property: 'P2', reason: `artifact.identity[${ei}] (${e?.name ?? '<unnamed>'}) sha256 without a path is unrecomputable` });
        }

        if (e && Object.prototype.hasOwnProperty.call(e, 'path')) {
          const pathVal = e.path;
          // A sha256-bearing entry whose path is '' or non-string is never
          // silently skipped - it is unhashable and must be flagged, not
          // dropped from the digest-mismatch check with no trace.
          if (hasSha && (typeof pathVal !== 'string' || pathVal.trim() === '')) {
            violations.push({ entry: id, property: 'P2', reason: `artifact.identity[${ei}] (${e?.name ?? '<unnamed>'}) has a sha256 but an empty or non-string path` });
          }
          if (typeof pathVal === 'string' && pathVal.trim() !== '') {
            if (isUnsafeIdentityPath(pathVal)) {
              violations.push({ entry: id, property: 'P2', reason: `artifact.identity[${ei}] (${e?.name ?? pathVal}) path ${JSON.stringify(pathVal)} is absolute or escapes with '..' - refused` });
            } else if (hasSha && Object.prototype.hasOwnProperty.call(digests, pathVal)) {
              if (digests[pathVal] !== e.sha256) {
                violations.push({ entry: id, property: 'P2', reason: `artifact.identity[${ei}] (${e?.name ?? pathVal}) sha256 does not match the recomputed digest for ${pathVal}` });
              }
            }
          }
        }
      });
    }

    // P3 - blast radius (checked before any verdict is read), then health_baseline.
    const br = r?.blast_radius;
    if (isObj(br) && !isSubset(br.plan_diff, br.declared)) {
      violations.push({ entry: id, property: 'P3', reason: 'blast_radius.plan_diff is not a subset of blast_radius.declared - under-declared radius' });
    }
    checkHealthRecord(r?.health_baseline, id, 'P3', violations, {
      field: 'health_baseline',
      boundaryCheck: (h) => {
        if (isText(h.window?.to) && isText(r?.ts_proposed) &&
            !Number.isNaN(Date.parse(h.window.to)) && !Number.isNaN(Date.parse(r.ts_proposed)) &&
            Date.parse(h.window.to) > Date.parse(r.ts_proposed)) {
          return 'health_baseline.window.to is after ts_proposed - the baseline reads past the proposal time';
        }
        return null;
      },
    });

    // P4 - pre-registered probe plan.
    const pp = r?.probe_plan;
    if (isObj(pp) && (!isText(pp.claim) || !isText(pp.control))) {
      violations.push({ entry: id, property: 'P4', reason: 'probe_plan is missing a non-empty claim or control' });
    }

    // P6 - class earned.
    const proposed = r?.class?.proposed;
    if (proposed === 0 || proposed === 1) {
      const eff = effectiveClass(records, r);
      if (eff === 2) {
        violations.push({ entry: id, property: 'P6', reason: `class ${proposed} cited authorization does not resolve - effective class 2` });
      } else if (proposed === 0) {
        const auth = records.find((a) => a?.kind === 'authorization' && a?.id === r?.class?.authorization);
        if (auth?.criteria?.backout_exercised === true && !isBackoutCredited(r)) {
          violations.push({ entry: id, property: 'P6', reason: 'authorization requires an exercised backout but this proposal\'s backout is not credited' });
        }
        const minClean = auth?.criteria?.min_clean_instances;
        if (typeof minClean === 'number') {
          const evidence = earnedClassEvidence(records, r.pattern, r.ts_proposed);
          if (evidence.cleanInstances < minClean) {
            violations.push({ entry: id, property: 'P6', reason: `class 0 requires >= ${minClean} clean instances, evidence shows ${evidence.cleanInstances}` });
          }
        }
        if (latestOutcomeIsMisfireUnrepaired(records, r.pattern, r.ts_proposed)) {
          violations.push({ entry: id, property: 'P6', reason: `class 0 proposed for pattern ${JSON.stringify(r.pattern)} whose latest prior outcome is misfire with no later reproof` });
        }
      }
    }
  });

  // Non-superseded proposal per change_id, for the outcome loop's P5 check below.
  const proposalByChangeId = new Map();
  byKind.proposal.forEach((i) => {
    if (superseded.has(i)) return;
    const r = records[i];
    if (isText(r?.change_id)) proposalByChangeId.set(r.change_id, r);
  });

  byKind.outcome.forEach((i) => {
    if (superseded.has(i)) return;
    const r = records[i];
    const id = labelFor(r);

    // P5 - an outcome that executed onto a non-pass baseline (fail OR
    // unevaluable) with no break-glass record: the hook would have refused
    // (HALT on unevaluable, refuse on fail), so either a bypass was recorded
    // or the record is lying.
    const linkedProposal = proposalByChangeId.get(r?.change_id);

    // Form - a post-hoc proposal: the outcome's ts_executed is before its
    // (live, non-superseded) proposal's ts_proposed. The irreversible step
    // cannot have run before the change was even proposed - a record shaped
    // this way was backfilled after the fact.
    if (linkedProposal && parses(r?.ts_executed) && parses(linkedProposal?.ts_proposed) &&
        Date.parse(r.ts_executed) < Date.parse(linkedProposal.ts_proposed)) {
      violations.push({ entry: id, property: 'form', reason: 'outcome executed before its proposal was proposed - post-hoc proposal' });
    }

    const baselineVerdict = linkedProposal?.health_baseline?.verdict;
    if (isText(baselineVerdict) && baselineVerdict !== 'pass' && (r?.break_glass === null || r?.break_glass === undefined)) {
      violations.push({ entry: id, property: 'P5', reason: `executed onto a non-pass baseline (${baselineVerdict}) with no break-glass record` });
    }

    // P6 - a class-1 proposal is allowed to sit with approval null/absent
    // while pending (no outcome yet). Once it has an outcome - the
    // irreversible step ran - an incomplete approval is no longer a pending
    // state, it is a control that was bypassed: the human sign-off never
    // made it onto the record before execution.
    if (linkedProposal && effectiveClass(records, linkedProposal, r.ts_executed) === 1) {
      const gaps = approvalGaps(linkedProposal.approval);
      if (gaps.length) {
        violations.push({ entry: id, property: 'P6', reason: `executed at class 1 with no complete approval on record: ${gaps.join(', ')}` });
      }
    }

    // P3 - outcome health.
    checkHealthRecord(r?.health, id, 'P3', violations, {
      field: 'outcome.health',
      boundaryCheck: (h) => {
        if (isText(h.window?.from) && isText(r?.ts_executed) &&
            !Number.isNaN(Date.parse(h.window.from)) && !Number.isNaN(Date.parse(r.ts_executed)) &&
            Date.parse(h.window.from) < Date.parse(r.ts_executed)) {
          return 'outcome.health.window.from is before ts_executed - the rollout window starts before execution';
        }
        return null;
      },
    });

    // P4 - the outcome's probe, checked by check-effect-probe's own matcher.
    if (isObj(r?.probe)) {
      const bad = findVacuousProbes([r.probe]);
      if (bad.length) violations.push({ entry: id, property: 'P4', reason: bad[0].reason });
    }

    // P5 - break-glass, if present, is refutable or refused.
    const bg = r?.break_glass;
    if (bg !== null && bg !== undefined) {
      const gaps = [];
      for (const f of ['who', 'why', 'command']) if (!isText(bg?.[f])) gaps.push(f);
      if (!isText(bg?.when) || Number.isNaN(Date.parse(bg.when)) || !hasOffset(bg.when)) gaps.push('when');
      if (gaps.length) {
        violations.push({ entry: id, property: 'P5', reason: `break_glass is present but missing/invalid: ${gaps.join(', ')}` });
      }
    }
  });

  // ---- Unevaluable channel (NOT violations): per change_id, newest record only ----
  const unevaluable = [];
  const changeIds = new Set(
    records.filter((r) => r?.kind === 'proposal' || r?.kind === 'outcome').map((r) => r.change_id).filter(isText),
  );
  for (const cid of changeIds) {
    const proposalsFor = byKind.proposal.map((i) => records[i]).filter((r) => r.change_id === cid);
    const outcomesFor = byKind.outcome.map((i) => records[i]).filter((r) => r.change_id === cid);
    const newestOutcome = outcomesFor[outcomesFor.length - 1];
    const newestProposal = proposalsFor[proposalsFor.length - 1];
    if (newestOutcome) {
      const bg = newestOutcome.break_glass;
      if (newestOutcome?.health?.verdict === 'unevaluable' && (bg === null || bg === undefined)) {
        unevaluable.push(cid);
      }
    } else if (newestProposal && newestProposal?.health_baseline?.verdict === 'unevaluable') {
      unevaluable.push(cid);
    }
  }

  return { violations, unevaluable };
}

export const parseChangeLog = parseRunlog;

// Windows-safe main-module check.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const file = args[0];
  if (!file) {
    console.error('usage: check-change-record.mjs <change-log.jsonl> [--root <dir>]');
    process.exit(1);
  }
  let root = process.cwd();
  const rootFlagIdx = args.indexOf('--root');
  if (rootFlagIdx !== -1 && args[rootFlagIdx + 1]) root = args[rootFlagIdx + 1];

  const records = parseChangeLog(readFileSync(file, 'utf8'));

  // Only a NON-superseded proposal's identity is live - a corrected proposal's
  // stale identity paths must never be collected (and so never hashed, never
  // reported unevaluable) once a later record supersedes it.
  const proposalRecords = records.filter((r) => r?.kind === 'proposal');
  const { superseded: supersededProposalIdxs } = resolveSupersession(proposalRecords, {
    key: 'change_id',
    label: (r) => `proposal ${r?.change_id ?? '<unnumbered>'}`,
  });
  const paths = new Set();
  proposalRecords.forEach((r, i) => {
    if (supersededProposalIdxs.has(i)) return;
    if (Array.isArray(r?.artifact?.identity)) {
      for (const e of r.artifact.identity) {
        if (isText(e?.path)) paths.add(e.path);
      }
    }
  });
  const digests = {};
  // Paths whose file could not be found, or found but not readable as a plain
  // file, under --root: an unrecomputable identity is unevaluable, never
  // verified (a path-bearing identity entry that cannot be hashed must never
  // fall through to "clean" just because the digest-mismatch check has
  // nothing to compare against). A directory at the path, or any other
  // read failure, is caught rather than left to crash with a stack trace.
  const unhashablePaths = [];
  for (const p of paths) {
    const abs = resolve(root, p);
    let hashed = false;
    try {
      if (existsSync(abs) && statSync(abs).isFile()) {
        digests[p] = createHash('sha256').update(readFileSync(abs)).digest('hex');
        hashed = true;
      }
    } catch {
      hashed = false;
    }
    if (!hashed) {
      console.log(`cannot hash ${p} - unevaluable`);
      unhashablePaths.push(p);
    }
  }

  const { violations, unevaluable } = findChangeRecordViolations(records, { digests });

  if (violations.length) {
    for (const v of violations) console.error(`CHANGE-RECORD FAIL ${v.entry} [${v.property}]: ${v.reason}`);
    console.error('Fix: every change record carries the evidence its property requires - an exercised backout, an attested artifact, a fail-closed health baseline, a pre-registered probe, a class citation that resolves, and a break-glass record before any bypass.');
    process.exit(1);
  }
  if (unevaluable.length || unhashablePaths.length) {
    for (const cid of unevaluable) console.error(`CHANGE-RECORD UNEVALUABLE ${cid}: newest record carries an honest unevaluable verdict with no break-glass`);
    for (const p of unhashablePaths) console.error(`CHANGE-RECORD UNEVALUABLE: cannot hash ${p} - unevaluable`);
    console.error(`UNEVALUABLE: ${unevaluable.length + unhashablePaths.length} item(s) cannot be asserted clean or failed. Unevaluable halts (exit 2).`);
    process.exit(2);
  }
  if (records.length === 0) {
    console.log('change-record: clean (0 records) - VACUOUS: an empty log asserts nothing');
    process.exit(0);
  }
  console.log(`change-record: clean (${records.length} record${records.length === 1 ? '' : 's'})`);
}
