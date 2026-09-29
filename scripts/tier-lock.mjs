import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { FAMILIES, isAlias, parseModelId, compareVersions } from './model-id.mjs';
import { parseVerdictLog } from './check-dispatch.mjs';

/**
 * Proposes config/models.lock.json from a run's receipts. NOT a gate: it prints the
 * lock a verdict log implies and writes nothing. The lock records which model id each
 * family alias last resolved to, so a model move is a dated commit and not a silent
 * change under the verifiers.
 *
 * Reads only receipts that requested an alias and were not logged as a downgrade. A
 * receipt answered by another family is check-dispatch's to judge and is skipped here.
 *
 * lock: { <family>: { resolved, since, run } }
 * Returns { lock, moved, conflicts, regressed, unreadable, unreadable_lock, families }.
 *   conflicts       - one family answered on two versions within the run.
 *   regressed       - the run answered on an OLDER version than the lock.
 *   unreadable      - an alias receipt whose answer is not one bare id.
 *   unreadable_lock - a key of the previous lock that is not a family, or whose entry
 *                     does not hold one bare id of that family.
 * Any of the four means no lock is proposed: `lock` is then the previous lock, unchanged.
 * An entry is never lowered and never replaced when it cannot be read. The first version
 * treated an unreadable entry as absent and overwrote it; the second checked only the
 * families the run dispatched and echoed everything else (both refuted 2026-09-29).
 *
 * HONEST LIMIT: a lock file that names one family twice is read as JSON reads it, last
 * entry wins. The earlier entry is never seen, so it cannot be protected.
 */
export function proposeLock(records, prevLock = {}, { date, run } = {}) {
  const seen = new Map();
  const unreadable = [];
  for (const r of records) {
    const req = r?.verifier_model?.requested;
    if (!isAlias(req) || r?.downgraded === true) continue;
    const answered = r?.verifier_model?.answered;
    const got = parseModelId(answered);
    if (got === null) {
      unreadable.push({ label: say(r?.claim ?? r?.label ?? r?.node), answered: say(answered) });
      continue;
    }
    if (got.family !== req.trim()) continue;
    if (!seen.has(got.family)) seen.set(got.family, new Map());
    seen.get(got.family).set(got.id, got);
  }

  const out = { lock: { ...prevLock }, moved: [], conflicts: [], regressed: [], unreadable, unreadable_lock: [], families: [...seen.keys()].sort() };
  for (const key of Object.keys(prevLock)) {
    const entry = parseModelId(prevLock[key]?.resolved);
    if (!FAMILIES.includes(key) || entry === null || entry.family !== key) out.unreadable_lock.push(key);
  }
  const proposed = { ...prevLock };
  for (const family of out.families) {
    const ids = [...seen.get(family).values()];
    if (ids.length > 1) {
      out.conflicts.push({ family, ids: ids.map((i) => i.id).sort() });
      continue;
    }
    const got = ids[0];
    if (!Object.hasOwn(prevLock, family)) {
      proposed[family] = { resolved: got.id, since: date, run };
      out.moved.push({ family, from: null, to: got.id });
      continue;
    }
    const prev = parseModelId(prevLock[family]?.resolved);
    if (prev === null || prev.family !== family) continue; // already in unreadable_lock
    const order = compareVersions(got.version, prev.version);
    if (order > 0) {
      proposed[family] = { resolved: got.id, since: date, run };
      out.moved.push({ family, from: prev.id, to: got.id });
    } else if (order < 0) {
      out.regressed.push({ family, locked: prev.id, answered: got.id });
    }
  }
  const refused = out.conflicts.length || out.regressed.length || out.unreadable.length || out.unreadable_lock.length;
  if (refused) out.moved = [];
  else out.lock = proposed;
  return out;
}

/** A value as text for a message, without ever calling the value's own code. */
function say(v) {
  if (typeof v === 'string') return v;
  if (v === undefined || v === null) return '<none>';
  return `<a ${Array.isArray(v) ? 'list' : typeof v}, not text>`;
}

/** A day that exists, written YYYY-MM-DD. */
function isRealDate(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text ?? '')) return false;
  const d = new Date(text + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === text;
}

function unevaluable(lines) {
  for (const l of lines) console.error(l);
  console.error('tier-lock: unevaluable - no lock proposed (exit 2).');
  process.exit(2);
}

function main(args) {
  const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const date = flag('--date');
  const run = flag('--run');
  // Positionals are what is left once each flag and the value after it are taken out by position.
  const taken = new Set();
  for (const name of ['--date', '--run']) { const i = args.indexOf(name); if (i >= 0) { taken.add(i); taken.add(i + 1); } }
  const positional = args.filter((a, i) => !taken.has(i) && !a.startsWith('--'));
  const file = positional[0];
  if (!file || !isRealDate(date) || !run || run.startsWith('--')) {
    console.error('usage: tier-lock.mjs <verdicts.jsonl|json> [models.lock.json] --date YYYY-MM-DD --run <run id>  # prints the proposed lock; writes nothing');
    process.exit(1);
  }
  const lockPath = positional[1] ?? resolve(dirname(fileURLToPath(import.meta.url)), '../config/models.lock.json');

  let records;
  try {
    records = parseVerdictLog(readFileSync(file, 'utf8'));
  } catch (e) {
    unevaluable([`TIER-LOCK UNEVALUABLE: cannot read the verdict log ${file}: ${e.message}`]);
  }
  if (!Array.isArray(records)) unevaluable([`TIER-LOCK UNEVALUABLE: the verdict log ${file} is not a list of records`]);
  let prev = {};
  if (existsSync(lockPath)) {
    try {
      prev = JSON.parse(readFileSync(lockPath, 'utf8'));
    } catch (e) {
      unevaluable([`TIER-LOCK UNEVALUABLE: cannot read the lock ${lockPath}: ${e.message}`]);
    }
    if (prev === null || typeof prev !== 'object' || Array.isArray(prev)) {
      unevaluable([`TIER-LOCK UNEVALUABLE: the lock ${lockPath} is not an object of entries`]);
    }
  }
  const found = proposeLock(records, prev, { date, run });

  if (found.unreadable_lock.length) {
    unevaluable(found.unreadable_lock.map((k) => `TIER-LOCK UNEVALUABLE ${say(k)}: this lock entry is not one bare id of a family, and an entry that cannot be read is never replaced`));
  }
  if (found.unreadable.length) {
    unevaluable(found.unreadable.map((u) => `TIER-LOCK UNEVALUABLE ${u.label}: answered "${u.answered}" is not one bare model id`));
  }
  if (found.families.length === 0) {
    unevaluable(['TIER-LOCK UNEVALUABLE: no alias receipt in this log - an empty run is not a pass']);
  }
  if (found.conflicts.length) {
    unevaluable(found.conflicts.map((c) => `TIER-LOCK UNEVALUABLE ${c.family}: answered on ${c.ids.join(' and ')} within one run`));
  }
  if (found.regressed.length) {
    for (const g of found.regressed) console.error(`TIER-LOCK FAIL ${g.family}: answered ${g.answered}, older than the locked ${g.locked}`);
    console.error('tier-lock: the lock is never lowered (exit 1).');
    process.exit(1);
  }
  const text = JSON.stringify(found.lock, null, 2) + '\n';
  for (const m of found.moved) console.error(`tier-lock: ${m.family} ${m.from ?? '(no entry)'} -> ${m.to}`);
  console.error(`tier-lock: ${found.families.length} famil${found.families.length === 1 ? 'y' : 'ies'} read, ${found.moved.length} moved`);
  console.error('tier-lock: lock proposed - nothing written, the human applies it (exit 0).');
  process.stdout.write(text);
}

// Windows-safe main-module check.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main(process.argv.slice(2));
  } catch (e) {
    // Anything not foreseen above is reported in words. A stack trace is not an outcome.
    unevaluable([`TIER-LOCK UNEVALUABLE: ${e?.name ?? 'error'}: ${say(e?.message)}`]);
  }
}
