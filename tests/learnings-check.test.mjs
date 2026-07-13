import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findLedgerViolations } from '../scripts/check-learnings.mjs';

const GOOD = `# Entry
ts: 2026-07-12T15:00:00Z
commit: 93f64e0
session: 495274ae-4189-4c09-b42d-8027685f9f5b
status: verified
fact: the harness does not load AGENTS.md natively
basis: probe run \`claude -p\` reported NONE for the AGENTS.md marker
re-verify: re-run the three-dir marker probe from ADR-0003
`;

const entry = (file, content = GOOD) => ({ file, content });
const NAME = '2026-07-12-agents-md-not-loaded.md';
const indexWith = (...files) => `# Index\n${files.map(f => `| 2026-07-12 | ${f} | verified | x |`).join('\n')}\n`;

test('a complete entry with an index row is clean', () => {
  assert.deepEqual(findLedgerViolations({ entries: [entry(NAME)], index: indexWith(NAME) }), []);
});

test('an empty ledger is clean', () => {
  assert.deepEqual(findLedgerViolations({ entries: [], index: '# Index\n' }), []);
});

test('each missing required field is flagged', () => {
  for (const field of ['ts', 'commit', 'session', 'status', 'fact', 'basis', 're-verify']) {
    const content = GOOD.split('\n').filter(l => !l.startsWith(`${field}:`)).join('\n');
    const bad = findLedgerViolations({ entries: [entry(NAME, content)], index: indexWith(NAME) });
    assert.deepEqual(bad, [{ file: NAME, reason: `missing or malformed required field: ${field}` }], field);
  }
});

test('a status outside the three allowed values is flagged', () => {
  const content = GOOD.replace('status: verified', 'status: done');
  const bad = findLedgerViolations({ entries: [entry(NAME, content)], index: indexWith(NAME) });
  assert.deepEqual(bad, [{ file: NAME, reason: 'missing or malformed required field: status' }]);
});

test('a non-UTC or non-RFC3339 timestamp is flagged', () => {
  const content = GOOD.replace('ts: 2026-07-12T15:00:00Z', 'ts: July 12, evening');
  const bad = findLedgerViolations({ entries: [entry(NAME, content)], index: indexWith(NAME) });
  assert.deepEqual(bad, [{ file: NAME, reason: 'missing or malformed required field: ts' }]);
});

test('bullet-prefixed fields are accepted', () => {
  const content = GOOD.replace(/^(ts|commit|session|status|fact|basis|re-verify):/gm, '- $1:');
  assert.deepEqual(findLedgerViolations({ entries: [entry(NAME, content)], index: indexWith(NAME) }), []);
});

test('a bad filename is flagged and field checks are skipped for it', () => {
  const bad = findLedgerViolations({ entries: [entry('notes_07-12-2026.md', 'no fields')], index: '' });
  assert.deepEqual(bad, [{ file: 'notes_07-12-2026.md', reason: 'filename must be YYYY-MM-DD-<topic>.md (lowercase, hyphens)' }]);
});

test('timestamps must be monotonic in filename order', () => {
  const earlier = '2026-07-11-first.md';
  const later = '2026-07-12-second.md';
  const outOfOrder = GOOD.replace('2026-07-12T15:00:00Z', '2026-07-10T09:00:00Z');
  const bad = findLedgerViolations({
    entries: [entry(earlier, GOOD.replace('2026-07-12T15:00:00Z', '2026-07-11T09:00:00Z')), entry(later, outOfOrder)],
    index: indexWith(earlier, later),
  });
  assert.deepEqual(bad, [{ file: later, reason: "timestamps not monotonic: 2026-07-10T09:00:00Z precedes prior entry's 2026-07-11T09:00:00Z" }]);
});

test('an entry without an index row is flagged', () => {
  const bad = findLedgerViolations({ entries: [entry(NAME)], index: '# Index\n(no rows)\n' });
  assert.deepEqual(bad, [{ file: NAME, reason: 'entry has no pointer row in the index' }]);
});

test('an index row pointing at a missing entry is flagged', () => {
  const ghost = '2026-07-01-never-written.md';
  const bad = findLedgerViolations({ entries: [entry(NAME)], index: indexWith(NAME, ghost) });
  assert.deepEqual(bad, [{ file: ghost, reason: 'index points at an entry file that does not exist' }]);
});

test('a modified or deleted prior entry violates append-only; a new entry does not', () => {
  const changes = [
    { status: 'A', file: `docs/learnings/${NAME}` },
    { status: 'M', file: 'docs/learnings/2026-07-11-first.md' },
    { status: 'D', file: 'docs/learnings/2026-07-10-gone.md' },
    { status: 'M', file: 'docs/learnings/LEARNINGS.md' },
  ];
  const bad = findLedgerViolations({ entries: [entry(NAME)], index: indexWith(NAME), changes });
  assert.deepEqual(bad, [
    { file: '2026-07-11-first.md', reason: "prior entries are immutable — git reports 'M' (append a superseding entry with a kills: reference instead)" },
    { file: '2026-07-10-gone.md', reason: "prior entries are immutable — git reports 'D' (append a superseding entry with a kills: reference instead)" },
  ]);
});
