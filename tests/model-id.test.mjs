import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAlias, parseModelId, compareVersions } from '../scripts/model-id.mjs';

test('a family name is an alias; a full id and an unknown word are not', () => {
  assert.equal(isAlias('sonnet'), true);
  assert.equal(isAlias(' fable '), true);
  assert.equal(isAlias('claude-sonnet-5'), false);
  assert.equal(isAlias('best'), false);
  assert.equal(isAlias(undefined), false);
});

test('a bare id parses to family and version', () => {
  assert.deepEqual(parseModelId('claude-sonnet-5-5'), { family: 'sonnet', version: [5, 5], id: 'claude-sonnet-5-5' });
  assert.deepEqual(parseModelId('claude-fable-5'), { family: 'fable', version: [5], id: 'claude-fable-5' });
});

test('a [1m] suffix and a date suffix are not part of the version', () => {
  assert.deepEqual(parseModelId('claude-opus-5[1m]').version, [5]);
  assert.deepEqual(parseModelId('claude-haiku-4-5-20251001'), { family: 'haiku', version: [4, 5], id: 'claude-haiku-4-5' });
});

// Tightened 2026-09-29 after the whole-branch refutation: this test first asserted
// that an id inside a display-name echo is read. A receipt is a bare id or unreadable.
test('seed: a display-name echo is unreadable, even when it contains one id', () => {
  assert.equal(parseModelId('Sonnet 5.5 (claude-sonnet-5-5)'), null);
  assert.equal(parseModelId('claude-opus-5 | claude-opus-5[1m]'), null);
});

test('seed: a receipt naming two different ids is unreadable, not a pick of one', () => {
  assert.equal(parseModelId('claude-fable-5 (fallback: claude-sonnet-5)'), null);
});

test('seed: text with no readable id is unreadable', () => {
  assert.equal(parseModelId('unknown'), null);
  assert.equal(parseModelId('model-j'), null);
  assert.equal(parseModelId(''), null);
  assert.equal(parseModelId(null), null);
});

test('versions compare as tuples, a missing part counting as zero', () => {
  assert.ok(compareVersions([5], [5, 1]) < 0);
  assert.ok(compareVersions([5, 1], [5, 5]) < 0);
  assert.ok(compareVersions([5, 5], [5]) > 0);
  assert.ok(compareVersions([5, 10], [5, 9]) > 0);
  assert.equal(compareVersions([5], [5, 0]), 0);
});
