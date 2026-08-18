import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Closure gate for the LEARN loop's misfire ledger (ADR-0010). A misfire record
 * claims one of three closure states, and each state must carry the evidence that
 * state implies:
 *
 *   pinned   — a `pin` (the test/gate that now catches it) AND a `red_proof`
 *              ({ cmd, result }) showing that pin goes RED on the ORIGINAL failure
 *              condition. A pin without a red-proof is an always-green gate.
 *   declined — an explicit, dated decision not to pin (decision + decided_by +
 *              decided_on). Declining is legitimate; declining silently is not.
 *   open     — legal to write, but it makes ledger completeness UNEVALUABLE.
 *
 * Three outcomes, per `data-quality-fail-closed` turned on rigor itself:
 *   exit 0  every record closed with its required evidence
 *   exit 1  FAIL — malformed record, or a FALSE CLOSURE CLAIM (a state asserted
 *           without the evidence it requires), duplicate id, or ts_recorded
 *           before ts_captured
 *   exit 2  UNEVALUABLE — one or more records are `open`, so "every misfire is
 *           closed" cannot be asserted either way. Unevaluable halts.
 *
 * HONEST LIMIT — form only. This matcher cannot execute a `pin`, so it cannot
 * know the red-proof was ever really run; it checks that the claim is *shaped*
 * so a third party could re-run it. A form gate is a floor, never a verdict
 * (2026-07-14 learnings entry).
 */

const STATES = ['pinned', 'declined', 'open'];
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const isText = (v) => typeof v === 'string' && v.trim() !== '';

export function findClosureViolations(records) {
  const violations = [];
  const open = [];
  const seen = new Set();

  for (const r of records) {
    const id = isText(r?.id) ? r.id : '<unidentified record>';
    const fail = (reason) => violations.push({ entry: id, reason });

    const missing = [];
    for (const f of ['id', 'component', 'domain', 'capture', 'mechanism']) {
      if (!isText(r?.[f])) missing.push(f);
    }
    if (missing.length) fail(`missing or malformed: ${missing.join(', ')}`);

    if (isText(r?.id)) {
      if (seen.has(r.id)) fail(`duplicate id — the ledger is append-only, ids are never reused`);
      seen.add(r.id);
    }

    for (const f of ['ts_captured', 'ts_recorded']) {
      if (!isText(r?.[f]) || Number.isNaN(Date.parse(r[f]))) {
        fail(`${f} is not a parseable RFC 3339 timestamp`);
      }
    }
    if (!Number.isNaN(Date.parse(r?.ts_captured)) && !Number.isNaN(Date.parse(r?.ts_recorded)) &&
        Date.parse(r.ts_recorded) < Date.parse(r.ts_captured)) {
      fail('ts_recorded is before ts_captured — capture-time anchoring violated');
    }

    const c = r?.closure;
    if (typeof c !== 'object' || c === null || Array.isArray(c)) {
      fail('closure is missing or not an object');
      continue;
    }
    if (!STATES.includes(c.state)) {
      fail(`closure.state must be one of ${STATES.join(' | ')} (got ${JSON.stringify(c.state)})`);
      continue;
    }

    if (c.state === 'pinned') {
      // A closure CLAIM without its evidence is the failure this gate exists for.
      if (!isText(c.pin)) fail('closure.state is "pinned" but no `pin` names the test or gate');
      const rp = c.red_proof;
      if (typeof rp !== 'object' || rp === null || !isText(rp.cmd) || !isText(rp.result)) {
        fail('closure.state is "pinned" but `red_proof` is not { cmd, result } — a pin never seen red on the original condition is an always-green gate');
      }
    } else if (c.state === 'declined') {
      const gaps = [];
      if (!isText(c.decision)) gaps.push('decision');
      if (!isText(c.decided_by)) gaps.push('decided_by');
      if (!isText(c.decided_on) || !DATE_ONLY.test(c.decided_on)) gaps.push('decided_on (YYYY-MM-DD)');
      if (gaps.length) fail(`closure.state is "declined" but the decision is not explicit and dated: missing ${gaps.join(', ')}`);
    } else {
      open.push(id);
    }
  }

  return { violations, open };
}

/** Parse a closure ledger: JSONL, one record per non-empty line. */
export function parseClosureLog(text) {
  return text.split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l));
}

// Windows-safe main-module check.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: check-misfire-closure.mjs <closure-log.jsonl>');
    process.exit(1);
  }
  const records = parseClosureLog(readFileSync(file, 'utf8'));
  const { violations, open } = findClosureViolations(records);

  if (violations.length) {
    for (const v of violations) console.error(`CLOSURE FAIL ${v.entry}: ${v.reason}`);
    console.error('Fix: every closure state carries the evidence it claims — pinned needs a red-proof, declined needs a dated decision.');
    process.exit(1);
  }
  if (open.length) {
    for (const id of open) console.error(`CLOSURE OPEN ${id}: no pin and no dated decision not to pin`);
    console.error(`UNEVALUABLE: ${open.length} misfire(s) open, so "every misfire is closed" cannot be asserted. Unevaluable halts (exit 2).`);
    process.exit(2);
  }
  if (records.length === 0) {
    // Stated out loud: an empty ledger passes because it asserts nothing, not
    // because anything was verified. Never quote this as evidence of closure.
    console.log('misfire-closure: clean (0 entries) — VACUOUS: an empty ledger asserts nothing');
    process.exit(0);
  }
  console.log(`misfire-closure: clean (${records.length} entr${records.length === 1 ? 'y' : 'ies'})`);
}
