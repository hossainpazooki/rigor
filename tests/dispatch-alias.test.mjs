import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findDispatchViolations, receiptMatches } from '../scripts/check-dispatch.mjs';

// Tiers hold family aliases; the harness resolves an alias to a version at dispatch.
const CONFIG = {
  judgment: 'fable',
  mid: 'opus',
  build: 'sonnet',
  cheap: 'sonnet',
  floored_nodes: ['verify-the-effect.verdict-cross-check'],
  high_stakes_criteria: ['irreversibility', 'blast-radius'],
};

const verdict = (over = {}) => ({
  node: 'refute.move-3',
  claim: 'tests pass on branch X',
  dispatch_tier: 'judgment',
  verifier_model: { requested: 'fable', answered: 'claude-fable-5-1' },
  inferred_stakes: 'medium',
  rubric_criteria_hit: ['downstream-decisions'],
  downgraded: false,
  ...over,
});

test('an alias receipt answered by its own family matches, whatever the version', () => {
  assert.equal(receiptMatches('sonnet', 'claude-sonnet-5', CONFIG), true);
  assert.equal(receiptMatches('sonnet', 'claude-sonnet-5-5', CONFIG), true);
  assert.equal(receiptMatches('opus', 'claude-opus-5[1m]', CONFIG), true);
  assert.equal(receiptMatches('fable', 'Fable 5.1 (claude-fable-5-1)', CONFIG), true);
});

test('seed: an alias receipt answered by another family is a silent downgrade', () => {
  assert.equal(receiptMatches('fable', 'claude-sonnet-5-5', CONFIG), false);
  const bad = findDispatchViolations([verdict({ verifier_model: { requested: 'fable', answered: 'claude-opus-5-5' } })], CONFIG);
  assert.equal(bad.length, 1);
  assert.match(bad[0].reason, /silent downgrade/);
});

test('an exact-id request still needs the exact id: a newer version of the family does not match', () => {
  assert.equal(receiptMatches('claude-fable-5', 'claude-fable-5-1', CONFIG), false);
});

test('seed: under an alias config, a judgment label that requested an exact id is unbound', () => {
  const bad = findDispatchViolations([verdict({ verifier_model: { requested: 'claude-fable-5', answered: 'claude-fable-5' } })], CONFIG);
  assert.equal(bad.length, 1);
  assert.match(bad[0].reason, /dispatch_tier judgment names fable/);
});
