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
  let prevTs = '';
  for (const e of entries) {
    if (!ENTRY_NAME.test(e.file)) {
      bad.push({ file: e.file, reason: 'filename must be YYYY-MM-DD-<topic>.md (lowercase, hyphens)' });
      continue;
    }
    for (const [field, re] of REQUIRED) {
      if (!re.test(e.content)) bad.push({ file: e.file, reason: `missing or malformed required field: ${field}` });
    }
    const ts = (e.content.match(/^(?:- )?`?ts:`?\s*(\S+)/m) || [])[1] ?? '';
    if (ts && prevTs && ts < prevTs) {
      bad.push({ file: e.file, reason: `timestamps not monotonic: ${ts} precedes prior entry's ${prevTs}` });
    }
    if (ts) prevTs = ts;
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
