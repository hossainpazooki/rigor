import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Pure form gate for a learnings/handoff-style ledger folder (ADR-0003, as
 * amended 2026-07-12): dated immutable entry files + a pointer-only index.
 * Verifies each entry carries the required record fields, timestamps are
 * monotonic in filename order, prior entries are byte-unchanged (append-only
 * enforced, not aspired to), and index and folder point at each other.
 *
 * Named residual limit (from the ADR): a form gate can verify the fields are
 * present and the files unchanged; it can never verify a basis is genuine.
 * The honest claim it gates is "anchored and re-executable," not "true."
 * No fs in the matcher; the caller loads everything at the CLI boundary.
 *
 * entries — [{file, content}] sorted by filename
 * index   — the index file's content (LEARNINGS.md)
 * changes — [{status, file}] from git name-status vs HEAD for the folder
 */
const ENTRY_NAME = /^\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9-]*\.md$/;
const REQUIRED = [
  ['ts', /^(?:- )?`?ts:`?\s*\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\s*$/m],
  ['commit', /^(?:- )?`?commit:`?\s*\S+/m],
  ['session', /^(?:- )?`?session:`?\s*\S+/m],
  ['status', /^(?:- )?`?status:`?\s*(?:verified|refuted-assumption|suspected)\s*$/m],
  ['fact', /^(?:- )?`?fact:`?\s*\S/m],
  ['basis', /^(?:- )?`?basis:`?/m],
  ['re-verify', /^(?:- )?`?re-verify:`?\s*\S/m],
];

export function findLedgerViolations({ entries, index, changes = [] }) {
  const bad = [];
  const seenTs = new Map();
  // A ledger that predates the capture-time-anchoring rule cannot be fixed in place — its entries
  // are immutable. The index (a mutable pointer file, not a record) may declare ONCE when the rule
  // took effect; entries older than that are exempt from the ts-distinctness check, entries from
  // that date on must comply. Forward-only, stated in the open, and not per-entry — you cannot
  // silently excuse one bad anchor, only date the rule's start.
  const since = (index.match(/^anchor-rule-since:\s*(\d{4}-\d{2}-\d{2})/m) || [])[1] ?? '';
  for (const e of entries) {
    if (!ENTRY_NAME.test(e.file)) {
      bad.push({ file: e.file, reason: 'filename must be YYYY-MM-DD-<topic>.md (lowercase, hyphens)' });
      continue;
    }
    for (const [field, re] of REQUIRED) {
      if (!re.test(e.content)) bad.push({ file: e.file, reason: `missing or malformed required field: ${field}` });
    }
    const ts = (e.content.match(/^(?:- )?`?ts:`?\s*(\S+)/m) || [])[1] ?? '';
    // The entry's capture instant must fall on the date its filename claims. This is the real
    // anchor-consistency invariant; a cross-entry "monotonic ts" rule is NOT — within one date,
    // filenames sort by topic alphabetically, not by capture time, so two same-day findings
    // legitimately appear out of clock order. (That rule's false positive is what taught us this.)
    // With this check, sorted filenames give non-decreasing dates for free.
    if (/^\d{4}-\d{2}-\d{2}T/.test(ts) && ts.slice(0, 10) !== e.file.slice(0, 10)) {
      bad.push({ file: e.file, reason: `ts ${ts} does not fall on the date in its filename (${e.file.slice(0, 10)})` });
    }
    // Distinct findings do not land in the same second. An identical ts across entries is the
    // fingerprint of a batch stamp applied at WRITE time — the entry looks anchored to the moment
    // its basis was captured, and is not. (Learned the hard way: a mid-session test count stamped
    // with the session's closing commit described a tree that commit did not contain.)
    if (ts && seenTs.has(ts) && ts.slice(0, 10) >= since) {
      bad.push({ file: e.file, reason: `ts identical to ${seenTs.get(ts)} — entries stamped at write time, not at capture (anchor each to when its basis landed)` });
    }
    if (ts) seenTs.set(ts, e.file);
    if (!index.includes(e.file)) {
      bad.push({ file: e.file, reason: 'entry has no pointer row in the index' });
    }
  }
  const names = new Set(entries.map(e => e.file));
  for (const ref of index.match(/\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md/g) ?? []) {
    if (!names.has(ref)) bad.push({ file: ref, reason: 'index points at an entry file that does not exist' });
  }
  for (const c of changes) {
    if (ENTRY_NAME.test(basename(c.file)) && c.status !== 'A') {
      bad.push({ file: basename(c.file), reason: `prior entries are immutable — git reports '${c.status}' (append a superseding entry with a kills: reference instead)` });
    }
  }
  return bad;
}

// Windows-safe main-module check.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const dir = process.argv[2];
  if (!dir) {
    console.error('usage: check-learnings.mjs <ledger-dir>  # e.g. docs/learnings');
    process.exit(1);
  }
  const indexFile = readdirSync(dir).find(f => /^[A-Z]+\.md$/.test(f));
  if (!indexFile) {
    console.error(`LEARNINGS FAIL: no index file (LEARNINGS.md / HANDOFF.md) in ${dir}`);
    process.exit(1);
  }
  const index = readFileSync(join(dir, indexFile), 'utf8');
  const entries = readdirSync(dir)
    .filter(f => f.endsWith('.md') && f !== indexFile)
    .sort()
    .map(f => ({ file: f, content: readFileSync(join(dir, f), 'utf8') }));
  let changes;
  try {
    changes = execSync(`git diff HEAD --name-status -- "${dir}"`, { encoding: 'utf8' })
      .split('\n').filter(Boolean)
      .map(l => { const [status, ...paths] = l.split('\t'); return { status: status[0], file: paths.at(-1) }; });
  } catch {
    // Fail closed: append-only is unevaluable without git, and unevaluable is not a pass.
    console.error('LEARNINGS FAIL: git diff unavailable — append-only check unevaluable (run inside the git repo)');
    process.exit(1);
  }
  const bad = findLedgerViolations({ entries, index, changes });
  if (bad.length) {
    for (const b of bad) console.error(`LEARNINGS FAIL ${b.file}: ${b.reason}`);
    console.error('Fix: every entry needs ts/commit/session/status/fact/basis/re-verify, an index row, and prior entries stay byte-unchanged.');
    process.exit(1);
  }
  console.log(`learnings: clean (${entries.length} entries)`);
}
