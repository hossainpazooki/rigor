import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide } from '../hooks/git-guard.mjs';

const env = {}; // no override

test('blocks git commit', () => {
  assert.equal(decide('git commit -m "x"', env).block, true);
});
test('blocks git push and force push', () => {
  assert.equal(decide('git push origin main', env).block, true);
  assert.equal(decide('git push --force', env).block, true);
});
test('blocks branch -f and --no-verify', () => {
  assert.equal(decide('git branch -f main HEAD', env).block, true);
  assert.equal(decide('git commit --no-verify -m x', env).block, true);
});
test('blocks commit inside a chain', () => {
  assert.equal(decide('git add . && git commit -m x', env).block, true);
});
test('allows read-only git', () => {
  assert.equal(decide('git status', env).block, false);
  assert.equal(decide('git log --oneline -5', env).block, false);
  assert.equal(decide('git fetch origin', env).block, false);
});
test('does not false-positive on echo', () => {
  assert.equal(decide('echo "remember to git commit later"', env).block, false);
});
test('override allows when RIGOR_GIT_ALLOW=1', () => {
  assert.equal(decide('git commit -m x', { RIGOR_GIT_ALLOW: '1' }).block, false);
});
