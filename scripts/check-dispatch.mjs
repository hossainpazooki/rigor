import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isAlias, parseModelId, compareVersions } from './model-id.mjs';

/**
 * Fail-closed lint over a run's verdict log (judgment-dispatch). Stakes are
 * inferred by the orchestrating agent — the same agent whose claims are being
 * checked — so the inference itself must be logged and mechanically checkable,
 * and certain nodes are floored to the judgment tier beyond inference's reach.
 * Five violation classes, per the design (docs/specs/2026-07-05-judgment-dispatch-design.md):
 *
 *   1. fox-and-henhouse — a high-stakes dispatch (inferred_stakes: "high", or any
 *      rubric marker from config.high_stakes_criteria) ran below the judgment tier.
 *   2. floor violation — a node in config.floored_nodes dispatched below judgment tier.
 *   3. unlogged inference — missing dispatch fields; treated as high-stakes, fail-closed.
 *   4. silent downgrade — verifier_model.answered != requested without downgraded: true.
 *   5. unbound tier label — verifier_model.requested is not the model the config assigns
 *      dispatch_tier (in the record's harness block, if it names one). Added 2026-09-22
 *      after a cross-model review showed classes 1–4 never tied the label to the receipt.
 *
 * record: { node, claim, dispatch_tier, verifier_model: { requested, answered },
 *           inferred_stakes, rubric_criteria_hit, downgraded, harness? }
 * config: needs the tier→model keys, floored_nodes and high_stakes_criteria
 *         (config/models.json shape); an optional <harness> block with its own tiers.
 * No fs in the matcher; the caller loads records and config at the CLI boundary.
 *
 * Worker receipts (ADR-0006 res 3) share this log, tagged role: "worker":
 * { role: "worker", node, label?, verifier_model: { requested, answered }, downgraded? }.
 * Workers have no stakes rubric, so classes 1–3's rubric fields are not required
 * of them — but the receipt itself is (fail-closed), and class 4 applies as-is:
 * a worker answering on a model it did not request is a silent tier collapse.
 *
 * Alias tiers (ADR-0015). A tier may hold a family alias instead of a model id. The
 * harness resolves the alias at dispatch, so a receipt is matched by FAMILY (class 4)
 * and its VERSION is judged against the lock, config/models.lock.json, by
 * findLockFindings: equal is clean, newer is a move (reported, not a failure), older
 * is a regression (a violation unless logged as a downgrade), and a receipt that
 * cannot be placed is unevaluable. CLI exits: 0 clean, 1 violation, 2 unevaluable.
 */
/** A receipt matches when answered IS the requested id, or unambiguously contains it
 * as a whole token (display-name echo). Any other configured tier model also present
 * makes the receipt ambiguous — fail-closed. Complements, never replaces, the bare-id
 * prompt discipline (learnings 2026-07-19). */
export function receiptMatches(requested, answered, config = {}) {
  const req = (requested ?? '').trim();
  const ans = (answered ?? '').trim();
  // A family alias is matched by family: the harness resolves it to a version at
  // dispatch, so the version is judged against the lock (findLockFindings), not here.
  if (isAlias(req)) return parseModelId(ans)?.family === req;
  if (req !== '' && req === ans) return true;
  const token = (hay, needle) => {
    const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^A-Za-z0-9-])${esc}($|[^A-Za-z0-9-])`).test(hay);
  };
  if (req === '' || !token(ans, req)) return false;
  const others = ['judgment', 'mid', 'build', 'cheap']
    .map((t) => config[t])
    .filter((m) => typeof m === 'string' && m !== req);
  return !others.some((m) => token(ans, m));
}

export function findDispatchViolations(records, config) {
  const floored = config.floored_nodes ?? [];
  const highMarkers = config.high_stakes_criteria ?? [];
  const bad = [];
  for (const r of records) {
    const id = r.claim ?? r.label ?? r.node ?? '<unidentified record>';

    if (r.role === 'worker') {
      const missing = [];
      if (typeof r.node !== 'string') missing.push('node');
      if (typeof r.verifier_model?.requested !== 'string') missing.push('verifier_model.requested');
      if (typeof r.verifier_model?.answered !== 'string') missing.push('verifier_model.answered');
      if (missing.length) {
        bad.push({ claim: id, reason: `unlogged worker receipt — missing ${missing.join(', ')}; treated as a silent collapse, fail-closed` });
        continue;
      }
      if (!unreadableUnderAlias(r) && !receiptMatches(r.verifier_model.requested, r.verifier_model.answered, config) && r.downgraded !== true) {
        bad.push({ claim: id, reason: `silent downgrade — worker answered ${r.verifier_model.answered} != requested ${r.verifier_model.requested} without downgraded: true` });
      }
      continue;
    }

    // 3. unlogged inference — fail-closed before anything else is judged.
    const missing = [];
    if (typeof r.node !== 'string') missing.push('node');
    if (!['judgment', 'mid', 'cheap'].includes(r.dispatch_tier)) missing.push('dispatch_tier');
    if (!['low', 'medium', 'high'].includes(r.inferred_stakes)) missing.push('inferred_stakes');
    if (!Array.isArray(r.rubric_criteria_hit)) missing.push('rubric_criteria_hit');
    if (typeof r.verifier_model?.requested !== 'string') missing.push('verifier_model.requested');
    if (typeof r.verifier_model?.answered !== 'string') missing.push('verifier_model.answered');
    if (missing.length) {
      bad.push({ claim: id, reason: `unlogged inference — missing ${missing.join(', ')}; treated as high-stakes, fail-closed` });
      continue;
    }

    // 5. unbound tier label — dispatch_tier is only evidence once it is tied to the model
    //    the config assigns that tier; a "judgment" label over a cheap-tier receipt passed
    //    classes 1–4 (found by a cross-model review, 2026-09-22). A record may name the
    //    harness whose tier block applies (harness: "codex" → config.codex); absent or
    //    "claude" means the top-level tiers. A historical log is checked against the
    //    models.json in force when it was written, passed as the CLI's second argument.
    const harness = typeof r.harness === 'string' && r.harness !== 'claude' ? r.harness : null;
    const block = harness ? config[harness] : config;
    const tierModel = block && typeof block[r.dispatch_tier] === 'string' ? block[r.dispatch_tier] : null;
    if (!tierModel) {
      bad.push({ claim: id, reason: `unbound tier label — no model configured for tier ${r.dispatch_tier} in harness ${harness ?? 'claude'}; fail-closed` });
      continue;
    }
    if (r.verifier_model.requested.trim() !== tierModel) {
      bad.push({ claim: id, reason: `unbound tier label — dispatch_tier ${r.dispatch_tier} names ${tierModel} in this config but requested ${r.verifier_model.requested} (pass the models.json in force at the run if this log is historical)` });
    }

    // 1. fox-and-henhouse — high stakes (declared or evidenced by markers) on the cheap tier.
    const markersHit = r.rubric_criteria_hit.filter((c) => highMarkers.includes(c));
    if (r.dispatch_tier !== 'judgment' && (r.inferred_stakes === 'high' || markersHit.length)) {
      const why = r.inferred_stakes === 'high' ? 'inferred_stakes: high' : `high-stakes markers hit: ${markersHit.join(', ')}`;
      bad.push({ claim: id, reason: `high-stakes dispatch on the ${r.dispatch_tier} tier (${why})` });
    }

    // 2. floor violation — floors ignore inference entirely.
    if (floored.includes(r.node) && r.dispatch_tier !== 'judgment') {
      bad.push({ claim: id, reason: `floored node ${r.node} dispatched below judgment tier` });
    }

    // 4. silent downgrade — a substitution is a logged downgrade, never a silent one.
    if (!unreadableUnderAlias(r) && !receiptMatches(r.verifier_model.requested, r.verifier_model.answered, config) && r.downgraded !== true) {
      bad.push({ claim: id, reason: `silent downgrade — answered ${r.verifier_model.answered} != requested ${r.verifier_model.requested} without downgraded: true` });
    }
  }
  return bad;
}

/** An alias was requested and the receipt names no readable id: neither a match nor a
 * downgrade can be asserted, so class 4 stays silent and findLockFindings reports it
 * as unevaluable. */
function unreadableUnderAlias(r) {
  return isAlias(r.verifier_model.requested) && parseModelId(r.verifier_model.answered) === null;
}

/**
 * Judge alias receipts against the lock: the record of which model id each family
 * alias last resolved to. lock: { <family>: { resolved, since, run } }.
 * Returns { moved, violations, unevaluable }. Records that request an exact id are
 * not the lock's business; a wrong-family answer is class 4's.
 */
export function findLockFindings(records, lock) {
  const out = { moved: [], violations: [], unevaluable: [] };
  for (const r of records) {
    const id = r.claim ?? r.label ?? r.node ?? '<unidentified record>';
    const req = r?.verifier_model?.requested;
    const ans = r?.verifier_model?.answered;
    if (!isAlias(req) || typeof ans !== 'string') continue;
    const family = req.trim();
    const got = parseModelId(ans);
    if (got === null) {
      if (r.downgraded !== true) out.unevaluable.push({ claim: id, reason: `answered "${ans}" names no readable model id, so it cannot be placed against the lock` });
      continue;
    }
    if (got.family !== family) continue;
    const locked = parseModelId(lock?.[family]?.resolved);
    if (locked === null || locked.family !== family) {
      out.unevaluable.push({ claim: id, reason: `no lock entry for family ${family}` });
      continue;
    }
    const order = compareVersions(got.version, locked.version);
    if (order > 0) {
      if (!out.moved.some((m) => m.family === family && m.to === got.id)) out.moved.push({ family, from: locked.id, to: got.id });
    } else if (order < 0 && r.downgraded !== true) {
      out.violations.push({ claim: id, reason: `tier regressed — ${family} answered ${got.id}, older than the locked ${locked.id}, without downgraded: true` });
    }
  }
  return out;
}

/** Parse a verdict log: a JSON array, or JSONL (one record per non-empty line). */
export function parseVerdictLog(text) {
  const trimmed = text.trim();
  if (trimmed === '') return [];
  if (trimmed.startsWith('[')) return JSON.parse(trimmed);
  return trimmed.split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l));
}

// Windows-safe main-module check.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: check-dispatch.mjs <verdicts.jsonl|json> [models.json] [models.lock.json]  # records per judgment-dispatch verdict schema; for a historical log pass the models.json and the lock in force when it was written');
    process.exit(1);
  }
  const here = dirname(fileURLToPath(import.meta.url));
  const configPath = process.argv[3] ?? resolve(here, '../config/models.json');
  // The default lock goes with the default config only: a historical config names its own lock, or none.
  const lockPath = process.argv[4] ?? (process.argv[3] ? null : resolve(here, '../config/models.lock.json'));
  const records = parseVerdictLog(readFileSync(file, 'utf8'));
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const lock = lockPath && existsSync(lockPath) ? JSON.parse(readFileSync(lockPath, 'utf8')) : {};
  const found = findLockFindings(records, lock);
  const bad = [...findDispatchViolations(records, config), ...found.violations];
  if (bad.length) {
    for (const b of bad) console.error(`DISPATCH FAIL ${b.claim}: ${b.reason}`);
    console.error('Fix: log the rubric inference on every dispatch, keep floored nodes on the judgment tier, and flag every downgrade.');
    process.exit(1);
  }
  if (found.unevaluable.length) {
    for (const u of found.unevaluable) console.error(`DISPATCH UNEVALUABLE ${u.claim}: ${u.reason}`);
    console.error('dispatch: unevaluable - a receipt could not be placed against the lock. Unevaluable halts (exit 2).');
    process.exit(2);
  }
  for (const m of found.moved) console.log(`TIER MOVED ${m.family}: ${m.from} -> ${m.to} (propose the lock update with scripts/tier-lock.mjs)`);
  console.log(`dispatch: clean (${records.length} record${records.length === 1 ? '' : 's'})`);
}
