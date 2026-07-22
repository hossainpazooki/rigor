import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Form gate for an effort's append-only run log (ADR-0004; mechanized at run 4 per the
 * ADR's own condition — criterion 2 was met by hand on runs 1–3). Verifies the invariant
 * core every hand-validated entry shares: required fields, parseable capture-time
 * timestamps in order, a numeric budget spend, +1 monotonic run numbering, and a
 * non-empty re-verify pointer ('re-verify', or run 1's legacy 'reverify').
 * HONEST LIMIT: form only — it cannot verify a basis is genuine (see the 2026-07-14
 * learnings entry: a form gate is a floor, never a verdict).
 */
export function findRunlogViolations(records) {
  const bad = [];
  let prevRun = null;
  for (const r of records) {
    const id = `run ${r?.run ?? '<unnumbered>'}`;

    const missing = [];
    if (!Number.isInteger(r.run) || r.run < 1) missing.push('run');
    for (const f of ['kind', 'session', 'rigor_commit']) {
      if (typeof r[f] !== 'string' || r[f].trim() === '') missing.push(f);
    }
    if (typeof r.recorded_same_session !== 'boolean') missing.push('recorded_same_session');
    if (typeof r.budget?.cap !== 'string') missing.push('budget.cap');
    if (typeof r.budget?.spent_subagent_tokens !== 'number') missing.push('budget.spent_subagent_tokens');
    if (!Array.isArray(r.gates_rerun_by_orchestrator)) missing.push('gates_rerun_by_orchestrator');
    if (missing.length) bad.push({ entry: id, reason: `missing or malformed: ${missing.join(', ')}` });

    for (const f of ['ts_executed', 'ts_recorded']) {
      if (typeof r[f] !== 'string' || Number.isNaN(Date.parse(r[f]))) {
        bad.push({ entry: id, reason: `${f} is not a parseable RFC 3339 timestamp` });
      }
    }
    if (!Number.isNaN(Date.parse(r.ts_executed)) && !Number.isNaN(Date.parse(r.ts_recorded)) &&
        Date.parse(r.ts_recorded) < Date.parse(r.ts_executed)) {
      bad.push({ entry: id, reason: 'ts_recorded is before ts_executed — capture-time anchoring violated (batch-stamping shape)' });
    }

    const rv = r['re-verify'] ?? r.reverify;
    const rvOk = (typeof rv === 'string' && rv.trim() !== '') || (Array.isArray(rv) && rv.length > 0);
    if (!rvOk) bad.push({ entry: id, reason: 're-verify pointer missing or empty (re-verify / legacy reverify)' });

    if (Number.isInteger(r.run)) {
      if (prevRun !== null && r.run !== prevRun + 1) {
        bad.push({ entry: id, reason: `run ${r.run} follows run ${prevRun} — numbering must be +1 monotonic, append-only` });
      }
      prevRun = r.run;
    }
  }
  return bad;
}

/** Parse a run log: JSONL, one record per non-empty line. */
export function parseRunlog(text) {
  return text.split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l));
}

// Windows-safe main-module check.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: check-runlog.mjs <run-log.jsonl>');
    process.exit(1);
  }
  const records = parseRunlog(readFileSync(file, 'utf8'));
  const bad = findRunlogViolations(records);
  if (bad.length) {
    for (const b of bad) console.error(`RUNLOG FAIL ${b.entry}: ${b.reason}`);
    console.error('Fix: every entry carries the invariant core; numbering is +1 monotonic; a form pass is a floor, never a verdict.');
    process.exit(1);
  }
  console.log(`runlog: clean (${records.length} entr${records.length === 1 ? 'y' : 'ies'})`);
}
