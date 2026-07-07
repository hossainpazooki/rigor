import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findDispatchViolations, parseVerdictLog } from '../scripts/check-dispatch.mjs';

const CONFIG = {
  judgment: 'model-j',
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
