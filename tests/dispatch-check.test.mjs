import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findDispatchViolations, parseVerdictLog, receiptMatches } from '../scripts/check-dispatch.mjs';

const CONFIG = {
  judgment: 'model-j',
  mid: 'model-m',
  cheap: 'model-c',
  floored_nodes: ['verify-the-effect.verdict-cross-check', 'honesty-check.pre-publish'],
  high_stakes_criteria: ['irreversibility', 'blast-radius'],
};

const clean = (over = {}) => ({
  node: 'refute.move-3',
  claim: 'tests pass on branch X',
  dispatch_tier: 'judgment',
  verifier_model: { requested: 'model-j', answered: 'model-j' },
  inferred_stakes: 'medium',
  rubric_criteria_hit: ['downstream-decisions'],
  downgraded: false,
  ...over,
});

test('a fully-logged judgment-tier dispatch is clean', () => {
  assert.deepEqual(findDispatchViolations([clean()], CONFIG), []);
});

test('a low-stakes cheap-tier dispatch is clean', () => {
  const r = clean({
    dispatch_tier: 'cheap',
    verifier_model: { requested: 'model-c', answered: 'model-c' },
    inferred_stakes: 'low',
    rubric_criteria_hit: [],
  });
  assert.deepEqual(findDispatchViolations([r], CONFIG), []);
});

test('a medium-stakes mid-tier extra vote is clean', () => {
  const r = clean({
    dispatch_tier: 'mid',
    verifier_model: { requested: 'model-m', answered: 'model-m' },
    inferred_stakes: 'medium',
    rubric_criteria_hit: ['downstream-decisions'],
  });
  assert.deepEqual(findDispatchViolations([r], CONFIG), []);
});

test('inferred high stakes on the mid tier is still the fox-and-henhouse case', () => {
  const r = clean({
    dispatch_tier: 'mid',
    verifier_model: { requested: 'model-m', answered: 'model-m' },
    inferred_stakes: 'high',
    rubric_criteria_hit: ['irreversibility'],
  });
  const bad = findDispatchViolations([r], CONFIG);
  assert.equal(bad.length, 1);
  assert.match(bad[0].reason, /high-stakes dispatch on the mid tier/);
});

test('a floored node on the mid tier is still a floor violation', () => {
  const r = clean({
    node: 'honesty-check.pre-publish',
    dispatch_tier: 'mid',
    verifier_model: { requested: 'model-m', answered: 'model-m' },
    inferred_stakes: 'low',
    rubric_criteria_hit: [],
  });
  const bad = findDispatchViolations([r], CONFIG);
  assert.equal(bad.length, 1);
  assert.match(bad[0].reason, /floored node honesty-check.pre-publish dispatched below judgment tier/);
});

test('seed 1a: inferred high stakes on the cheap tier is the fox-and-henhouse case', () => {
  const r = clean({
    dispatch_tier: 'cheap',
    verifier_model: { requested: 'model-c', answered: 'model-c' },
    inferred_stakes: 'high',
    rubric_criteria_hit: ['irreversibility'],
  });
  const bad = findDispatchViolations([r], CONFIG);
  assert.equal(bad.length, 1);
  assert.match(bad[0].reason, /high-stakes dispatch on the cheap tier/);
});

test('seed 1b: understated stakes cannot hide a high-stakes marker from the gate', () => {
  const r = clean({
    dispatch_tier: 'cheap',
    verifier_model: { requested: 'model-c', answered: 'model-c' },
    inferred_stakes: 'low',
    rubric_criteria_hit: ['blast-radius'],
  });
  const bad = findDispatchViolations([r], CONFIG);
  assert.equal(bad.length, 1);
  assert.match(bad[0].reason, /high-stakes markers hit: blast-radius/);
});

test('seed 2: a floored node below judgment tier is flagged regardless of inference', () => {
  const r = clean({
    node: 'honesty-check.pre-publish',
    dispatch_tier: 'cheap',
    verifier_model: { requested: 'model-c', answered: 'model-c' },
    inferred_stakes: 'low',
    rubric_criteria_hit: [],
  });
  const bad = findDispatchViolations([r], CONFIG);
  assert.equal(bad.length, 1);
  assert.match(bad[0].reason, /floored node honesty-check.pre-publish dispatched below judgment tier/);
});

test('seed 3: missing dispatch fields are an unlogged inference, fail-closed', () => {
  const r = { node: 'refute.move-3', claim: 'unlogged' }; // no tier, stakes, criteria, model
  const bad = findDispatchViolations([r], CONFIG);
  assert.equal(bad.length, 1);
  assert.match(bad[0].reason, /unlogged inference — missing /);
  assert.match(bad[0].reason, /treated as high-stakes, fail-closed/);
});

test('seed 4: answered != requested without downgraded: true is a silent downgrade', () => {
  const r = clean({ verifier_model: { requested: 'model-j', answered: 'model-other' }, downgraded: false });
  const bad = findDispatchViolations([r], CONFIG);
  assert.equal(bad.length, 1);
  assert.match(bad[0].reason, /silent downgrade/);
});

test('a flagged downgrade (downgraded: true) is not a violation', () => {
  const r = clean({ verifier_model: { requested: 'model-j', answered: 'model-other' }, downgraded: true });
  assert.deepEqual(findDispatchViolations([r], CONFIG), []);
});

test('one record can carry multiple violations', () => {
  const r = clean({
    node: 'verify-the-effect.verdict-cross-check',
    dispatch_tier: 'cheap',
    verifier_model: { requested: 'model-c', answered: 'model-x' },
    inferred_stakes: 'high',
    downgraded: false,
  });
  const bad = findDispatchViolations([r], CONFIG);
  assert.equal(bad.length, 3); // fox-and-henhouse + floor + silent downgrade
});

test('a mixed log returns only the bad subset', () => {
  const bad = findDispatchViolations(
    [clean(), clean({ claim: 'floored-cheap', node: 'verify-the-effect.verdict-cross-check', dispatch_tier: 'cheap', verifier_model: { requested: 'model-c', answered: 'model-c' } })],
    CONFIG,
  );
  assert.equal(bad.length, 1);
  assert.equal(bad[0].claim, 'floored-cheap');
});

// Worker receipts (ADR-0006 res 3): role: "worker" records share the verdict log.
// Workers have no stakes rubric — only the receipt is linted, fail-closed.
const worker = (over = {}) => ({
  role: 'worker',
  node: 'fanout-build.build',
  label: 'build:src/server.go',
  verifier_model: { requested: 'model-b', answered: 'model-b' },
  ...over,
});

test('a worker receipt with matching requested/answered and no rubric fields is clean', () => {
  assert.deepEqual(findDispatchViolations([worker()], CONFIG), []);
});

test('a worker answering on a different model than requested without downgraded: true is a silent collapse', () => {
  const r = worker({ verifier_model: { requested: 'model-b', answered: 'model-j' } });
  const bad = findDispatchViolations([r], CONFIG);
  assert.equal(bad.length, 1);
  assert.match(bad[0].reason, /silent downgrade/);
});

test('a worker record missing its receipt is unlogged, fail-closed', () => {
  const bad = findDispatchViolations([{ role: 'worker', node: 'fanout-build.build' }], CONFIG);
  assert.equal(bad.length, 1);
  assert.match(bad[0].reason, /missing .*verifier_model/);
});

test('a worker record is exempt from verifier-only rubric requirements but not from node identity', () => {
  const bad = findDispatchViolations([{ role: 'worker', verifier_model: { requested: 'model-b', answered: 'model-b' } }], CONFIG);
  assert.equal(bad.length, 1);
  assert.match(bad[0].reason, /missing node/);
});

// Gate-side receipt normalization (ADR-0006 open item; learnings 2026-07-19-receipt-
// answered-needs-bare-model-id): display-name echoes that CONTAIN the requested id are
// not downgrades; anything ambiguous or genuinely different still fails closed.
test('a worker display-name echo containing the requested id is not a downgrade', () => {
  const r = worker({ verifier_model: { requested: 'model-b', answered: 'Builder 5 (model-b)' } });
  assert.deepEqual(findDispatchViolations([r], CONFIG), []);
});

test('a verifier display-name echo containing the requested id is not a downgrade', () => {
  const r = clean({ verifier_model: { requested: 'model-j', answered: 'Judgment 5 (model ID: model-j)' } });
  assert.deepEqual(findDispatchViolations([r], CONFIG), []);
});

test('normalization never matches an extended id (token boundary, not substring)', () => {
  assert.equal(receiptMatches('model-j', 'model-j2', CONFIG), false);
  assert.equal(receiptMatches('model-j', 'model-j-mini', CONFIG), false);
});

test('a display echo of the WRONG id is still a downgrade', () => {
  const r = worker({ verifier_model: { requested: 'model-b', answered: 'Judgment 5 (model-j)' } });
  const bad = findDispatchViolations([r], CONFIG);
  assert.equal(bad.length, 1);
  assert.match(bad[0].reason, /silent downgrade/);
});

test('an answered echoing a second configured model is ambiguous — fail-closed', () => {
  const r = clean({ verifier_model: { requested: 'model-j', answered: 'model-j (fallback: model-c)' } });
  const bad = findDispatchViolations([r], CONFIG);
  assert.equal(bad.length, 1);
  assert.match(bad[0].reason, /silent downgrade/);
});

test('empty log is clean', () => {
  assert.deepEqual(findDispatchViolations([], CONFIG), []);
});

test('parseVerdictLog accepts a JSON array', () => {
  assert.deepEqual(parseVerdictLog('[{"a":1},{"a":2}]'), [{ a: 1 }, { a: 2 }]);
});

test('parseVerdictLog accepts JSONL with blank lines', () => {
  assert.deepEqual(parseVerdictLog('{"a":1}\n\n{"a":2}\n'), [{ a: 1 }, { a: 2 }]);
});

test('parseVerdictLog of empty text is an empty log', () => {
  assert.deepEqual(parseVerdictLog('  \n'), []);
});
