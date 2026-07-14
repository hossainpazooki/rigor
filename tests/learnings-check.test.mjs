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

test('a ts that does not fall on the date in its filename is flagged', () => {
  const f = '2026-07-12-topic.md';
  const bad = findLedgerViolations({
    entries: [entry(f, GOOD.replace('2026-07-12T15:00:00Z', '2026-07-10T09:00:00Z'))],
    index: indexWith(f),
  });
  assert.deepEqual(bad, [{ file: f, reason: 'ts 2026-07-10T09:00:00Z does not fall on the date in its filename (2026-07-12)' }]);
});

test('same-day entries out of clock order are clean — filenames sort by topic, not by capture time', () => {
  // The regression that taught us this: three findings captured 14:48:52, 14:49:13, 14:49:35
  // land in files whose alphabetical order is payment… < wheel-count… < wheel-depends…, so the
  // clock runs backwards in filename order. That is correct behavior, not a defect.
  const a = '2026-07-14-payment-loop.md';
  const b = '2026-07-14-wheel-count.md';
  const c = '2026-07-14-wheel-depends.md';
  const at = (f, t) => entry(f, GOOD.replace('2026-07-12T15:00:00Z', t));
  const bad = findLedgerViolations({
    entries: [at(a, '2026-07-14T14:49:35Z'), at(b, '2026-07-14T14:48:52Z'), at(c, '2026-07-14T14:49:13Z')],
    index: indexWith(a, b, c),
  });
  assert.deepEqual(bad, []);
});

test('entries sharing an identical ts are flagged as write-time stamping', () => {
  const first = '2026-07-12-first.md';
  const second = '2026-07-12-second.md';
  const bad = findLedgerViolations({
    entries: [entry(first), entry(second)],
    index: indexWith(first, second),
  });
  assert.deepEqual(bad, [
    { file: second, reason: `ts identical to ${first} — entries stamped at write time, not at capture (anchor each to when its basis landed)` },
  ]);
});

test('entries with distinct timestamps in the same batch are clean', () => {
  const first = '2026-07-13-first.md';
  const second = '2026-07-13-second.md';
  const bad = findLedgerViolations({
    entries: [
      entry(first, GOOD.replace('2026-07-12T15:00:00Z', '2026-07-13T09:00:00Z')),
      entry(second, GOOD.replace('2026-07-12T15:00:00Z', '2026-07-13T11:30:00Z')),
    ],
    index: indexWith(first, second),
  });
  assert.deepEqual(bad, []);
});

test('a malformed ts is reported once, not also as a date mismatch', () => {
  const f = '2026-07-12-topic.md';
  const bad = findLedgerViolations({
    entries: [entry(f, GOOD.replace('ts: 2026-07-12T15:00:00Z', 'ts: July'))],
    index: indexWith(f),
  });
  assert.deepEqual(bad, [{ file: f, reason: 'missing or malformed required field: ts' }]);
});

test('an index anchor-rule-since date exempts older entries but not newer ones', () => {
  const old1 = '2026-07-13-old-a.md';
  const old2 = '2026-07-13-old-b.md';
  const new1 = '2026-07-15-new-a.md';
  const new2 = '2026-07-15-new-b.md';
  const at = (f, t) => entry(f, GOOD.replace('2026-07-12T15:00:00Z', t));
  const index = `anchor-rule-since: 2026-07-14\n${indexWith(old1, old2, new1, new2)}`;
  const bad = findLedgerViolations({
    entries: [
      at(old1, '2026-07-13T22:00:00Z'), // identical pair, predates the rule → exempt
      at(old2, '2026-07-13T22:00:00Z'),
      at(new1, '2026-07-15T08:00:00Z'), // identical pair, on/after the rule → flagged
      at(new2, '2026-07-15T08:00:00Z'),
    ],
    index,
  });
  assert.deepEqual(bad, [
    { file: new2, reason: `ts identical to ${new1} — entries stamped at write time, not at capture (anchor each to when its basis landed)` },
  ]);
});

test('with no anchor-rule-since declared, the rule applies to every entry', () => {
  const a = '2026-07-12-a.md';
  const b = '2026-07-12-b.md';
  const bad = findLedgerViolations({ entries: [entry(a), entry(b)], index: indexWith(a, b) });
  assert.equal(bad.length, 1);
  assert.match(bad[0].reason, /stamped at write time/);
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
