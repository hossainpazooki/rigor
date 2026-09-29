import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseModelId } from '../scripts/model-id.mjs';

// 2026-09-29: the whole-branch refutation of the alias tiers found that a receipt was
// read by finding an id anywhere inside it. A receipt is a bare id, or it is unreadable.

test('a bare id, with or without a bracket suffix or a date suffix, is readable', () => {
  assert.equal(parseModelId('claude-fable-5-1').id, 'claude-fable-5-1');
  assert.equal(parseModelId('  claude-opus-5-5[1m]\n').id, 'claude-opus-5-5');
  assert.equal(parseModelId('claude-haiku-4-5-20251001').id, 'claude-haiku-4-5');
});

test('seed: an id embedded in a longer word is unreadable', () => {
  assert.equal(parseModelId('claude-fable-5-1-mini'), null);
  assert.equal(parseModelId('xclaude-fable-5-1'), null);
  assert.equal(parseModelId('claude-fable-5-1x'), null);
  assert.equal(parseModelId('not-claude-fable-5-1-lite-preview'), null);
});

test('seed: text around an id makes the receipt unreadable, whoever it says answered', () => {
  assert.equal(parseModelId('I am Haiku 4.5, not claude-fable-5-1'), null);
  assert.equal(parseModelId('Claude Haiku 4.5 (claude-fable-5-1)'), null);
  assert.equal(parseModelId('gpt-6-astra (asked for claude-fable-5-1)'), null);
  assert.equal(parseModelId('Fable 5.1 (claude-fable-5-1)'), null);
});

test('seed: a dotted version is unreadable, not read as its first number', () => {
  assert.equal(parseModelId('claude-fable-5.1'), null);
});

test('seed: a date standing where the version should be is unreadable', () => {
  assert.equal(parseModelId('claude-fable-20250101'), null);
  assert.equal(parseModelId('claude-fable-5-1-260901'), null);
});

test('seed: a version part longer than three digits is unreadable', () => {
  assert.equal(parseModelId('claude-fable-' + '9'.repeat(400)), null);
  assert.equal(parseModelId('claude-fable-5-1234'), null);
});

test('a leading zero does not make a second id', () => {
  assert.deepEqual(parseModelId('claude-haiku-04-5'), { family: 'haiku', version: [4, 5], id: 'claude-haiku-4-5' });
});
