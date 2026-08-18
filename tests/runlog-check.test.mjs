import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findRunlogViolations, parseRunlog } from '../scripts/check-runlog.mjs';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Green fixtures mirror the real runs 1–3 shape (ADR-0004): the invariant core is
// what all three hand-validated entries share, not any one run's optional fields.
const entry = (over = {}) => ({
  run: 1,
  ts_executed: '2026-07-08T19:59:30Z',
  ts_recorded: '2026-07-09T03:43:17Z',
  recorded_same_session: true,
  kind: 'recon + operator gate re-runs',
  session: '495274ae-4189-4c09-b42d-8027685f9f5b',
  rigor_commit: 'e1f4be0 (promotion files uncommitted at record time)',
  budget: { cap: 'L1 sweep <= 150k subagent tokens', spent_subagent_tokens: 123807 },
  gates_rerun_by_orchestrator: [{ cmd: 'node --test', result: 'green' }],
  're-verify': 'docs/feedback/2026-07-14-example.md',
  ...over,
});

test('a well-formed single entry is clean', () => {
  assert.deepEqual(findRunlogViolations([entry()]), []);
});

test('runs 1..3 with +1 monotonic numbering are clean', () => {
  const log = [entry(), entry({ run: 2 }), entry({ run: 3 })];
  assert.deepEqual(findRunlogViolations(log), []);
});

test("run 1's legacy 'reverify' key satisfies the re-verify requirement", () => {
  const e = entry();
  delete e['re-verify'];
  e.reverify = ['cmd one'];
  assert.deepEqual(findRunlogViolations([e]), []);
});

test('a missing required field is flagged with the field name', () => {
  const e = entry();
  delete e.budget;
  const bad = findRunlogViolations([e]);
  assert.equal(bad.length, 1);
  assert.match(bad[0].reason, /missing .*budget/);
});

test('a non-numeric budget.spent_subagent_tokens is flagged', () => {
  const bad = findRunlogViolations([entry({ budget: { cap: 'L1', spent_subagent_tokens: 'lots' } })]);
  assert.equal(bad.length, 1);
  assert.match(bad[0].reason, /spent_subagent_tokens/);
});

test('ts_recorded earlier than ts_executed is flagged (batch-stamping shape)', () => {
  const bad = findRunlogViolations([entry({ ts_recorded: '2026-07-08T00:00:00Z' })]);
  assert.equal(bad.length, 1);
  assert.match(bad[0].reason, /ts_recorded .*before ts_executed/);
});

test('an unparseable timestamp is flagged', () => {
  const bad = findRunlogViolations([entry({ ts_executed: 'yesterday-ish' })]);
  assert.equal(bad.length, 1);
  assert.match(bad[0].reason, /ts_executed/);
});

test('a gap in run numbering is flagged (append-only, +1 monotonic)', () => {
  const bad = findRunlogViolations([entry(), entry({ run: 3 })]);
  assert.equal(bad.length, 1);
  assert.match(bad[0].reason, /run 3 follows run 1/);
});

test('a duplicate run number is flagged', () => {
  const bad = findRunlogViolations([entry(), entry({ run: 1 })]);
  assert.equal(bad.length, 1);
  assert.match(bad[0].reason, /run 1 follows run 1/);
});

test('an empty re-verify pointer is flagged', () => {
  const bad = findRunlogViolations([entry({ 're-verify': '' })]);
  assert.equal(bad.length, 1);
  assert.match(bad[0].reason, /re-verify/);
});

test('one record can carry multiple violations', () => {
  const e = entry({ ts_executed: 'bad', budget: undefined });
  delete e.budget;
  const bad = findRunlogViolations([e]);
  assert.ok(bad.length >= 2);
});

test('empty log is clean (a new effort starts at zero entries)', () => {
  assert.deepEqual(findRunlogViolations([]), []);
});

test('parseRunlog reads JSONL with blank lines', () => {
  assert.deepEqual(parseRunlog('{"a":1}\n\n{"a":2}\n'), [{ a: 1 }, { a: 2 }]);
});

// ---------- supersession (ADR-0004 amendment 2026-08-18) ----------
// A committed entry is never edited; a correction is a NEW record with
// supersedes: N and the same run number. Modeled on the real payment-loop
// run-1 dialect incident.

const malformedOriginal = () => {
  // the real defect shape: invented keys, object where an array is required, no re-verify
  const e = entry();
  delete e.budget;
  delete e['re-verify'];
  e.cap_tokens = 150000;
  e.gates_rerun_by_orchestrator = { 'check-dispatch': 'clean' };
  return e;
};

const correction = (over = {}) => ({ ...entry(), supersedes: 1, ...over });

test('a malformed entry corrected by a valid superseding record is clean', () => {
  assert.deepEqual(findRunlogViolations([malformedOriginal(), correction()]), []);
});

test('a superseding record does not break the +1 chain', () => {
  const log = [malformedOriginal(), entry({ run: 2 }), correction()];
  assert.deepEqual(findRunlogViolations(log), []);
});

test('RED: supersedes with no earlier matching run is flagged', () => {
  const bad = findRunlogViolations([entry(), correction({ run: 5, supersedes: 5 })]);
  assert.equal(bad.length, 1);
  assert.match(bad[0].reason, /no earlier record/);
});

test('RED: a correction whose run differs from its supersedes target is flagged', () => {
  const bad = findRunlogViolations([entry(), correction({ run: 2, supersedes: 1 })]);
  assert.equal(bad.length, 1);
  assert.match(bad[0].reason, /keeps the number/);
});

test('RED: a superseding record must itself pass every field check', () => {
  const c = correction();
  delete c.budget;
  const bad = findRunlogViolations([malformedOriginal(), c]);
  assert.equal(bad.length, 1);
  assert.match(bad[0].reason, /budget/);
});

test('RED: a non-integer supersedes is flagged', () => {
  const bad = findRunlogViolations([entry(), correction({ supersedes: '1' })]);
  assert.ok(bad.some((b) => /positive run number/.test(b.reason)));
});

// PIN (ADR-0010 closure record check-runlog-built-but-never-invoked): the gate
// existed for 22 days with no writer invoking it, and a new effort's first entry
// invented its own dialect and sat red through its own commit. The command that
// writes the run log must name the gate that validates it.
test('fanout-loop names check-runlog on the log it appends to (misfire pin)', () => {
  const cmd = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../commands/fanout-loop.md'), 'utf8');
  assert.match(cmd, /check-runlog/);
});
