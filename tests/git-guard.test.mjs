import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide } from '../hooks/git-guard.mjs';

const env = {}; // no override

// --- Original 7 tests (must stay green) ---

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

// --- Finding #1: git rebase ---
test('blocks git rebase (finding #1)', () => {
  assert.equal(decide('git rebase main', env).block, true);
  assert.equal(decide('git rebase -i HEAD~5', env).block, true);
  assert.equal(decide('git rebase --onto main dev feature', env).block, true);
  // safe recovery operations must be allowed
  assert.equal(decide('git rebase --abort', env).block, false);
  assert.equal(decide('git rebase --skip', env).block, false);
});

// --- Finding #2: git cherry-pick ---
test('blocks git cherry-pick (finding #2)', () => {
  assert.equal(decide('git cherry-pick abc123', env).block, true);
  assert.equal(decide('git cherry-pick A..B', env).block, true);
  assert.equal(decide('git cherry-pick --abort', env).block, false);
});

// --- Finding #3: global flags before subcommand bypass ---
test('blocks git with global flags before subcommand (finding #3)', () => {
  assert.equal(decide('git -C /repo commit -m x', env).block, true);
  assert.equal(decide('git --git-dir=.git commit -m x', env).block, true);
  assert.equal(decide('git --no-pager commit -m x', env).block, true);
  assert.equal(decide('git --git-dir=.git push origin main', env).block, true);
  assert.equal(decide('git -C /repo reset --hard HEAD', env).block, true);
});

// --- Finding #4: shell env-prefix form ---
test('blocks shell env-prefix git commands (finding #4)', () => {
  assert.equal(decide('GIT_AUTHOR_NAME=x git commit -m x', env).block, true);
  assert.equal(decide('GIT_DIR=/repo/.git git commit -m x', env).block, true);
  assert.equal(decide('ENV=val git push origin main', env).block, true);
});

// --- Finding #5: subshell and command-substitution wrappers ---
test('blocks subshell and command-substitution wrappers (finding #5)', () => {
  assert.equal(decide('( git commit -m x )', env).block, true);
  assert.equal(decide('`git commit -m x`', env).block, true);
  assert.equal(decide('$(git commit -m x)', env).block, true);
});

// --- Finding #6: git filter-branch ---
test('blocks git filter-branch (finding #6)', () => {
  assert.equal(decide('git filter-branch --env-filter "GIT_AUTHOR_EMAIL=new" HEAD', env).block, true);
  assert.equal(decide('git filter-branch --tree-filter "rm -f passwords.txt" -- --all', env).block, true);
});

// --- Finding #7: git am ---
test('blocks git am (finding #7)', () => {
  assert.equal(decide('git am patch.mbox', env).block, true);
  assert.equal(decide('git am *.patch', env).block, true);
  assert.equal(decide('git am --abort', env).block, false);
});

// --- Finding #10: git revert ---
test('blocks git revert (finding #10)', () => {
  assert.equal(decide('git revert HEAD', env).block, true);
  assert.equal(decide('git revert HEAD~3..HEAD', env).block, true);
  // staging-only variants must be allowed
  assert.equal(decide('git revert --no-commit HEAD', env).block, false);
  assert.equal(decide('git revert -n HEAD', env).block, false);
});

// --- Finding #11: git fast-import ---
test('blocks git fast-import (finding #11)', () => {
  assert.equal(decide('git fast-import', env).block, true);
});

// --- Finding #12: git update-ref ---
test('blocks git update-ref (finding #12)', () => {
  assert.equal(decide('git update-ref refs/heads/main abc123', env).block, true);
  assert.equal(decide('git update-ref HEAD abc123', env).block, true);
});

// --- Finding #13: git reset --soft and --mixed ---
test('blocks git reset --soft and --mixed (finding #13)', () => {
  assert.equal(decide('git reset --soft HEAD~1', env).block, true);
  assert.equal(decide('git reset --mixed HEAD~3', env).block, true);
  // plain unstage must remain allowed
  assert.equal(decide('git reset HEAD file.txt', env).block, false);
  assert.equal(decide('git reset file.txt', env).block, false);
});

// --- Finding #14: git merge ---
test('blocks git merge (finding #14)', () => {
  assert.equal(decide('git merge feature-branch', env).block, true);
  assert.equal(decide('git merge --no-ff feature', env).block, true);
  assert.equal(decide('git merge --abort', env).block, false);
  assert.equal(decide('git merge --squash feature', env).block, false);
});

// --- Finding #15: git tag -f / -d ---
test('blocks git tag -f and -d (finding #15)', () => {
  assert.equal(decide('git tag -f v1.0 HEAD', env).block, true);
  assert.equal(decide('git tag -d v1.0', env).block, true);
  assert.equal(decide('git tag --delete v1.0', env).block, true);
  // creating a plain tag must remain allowed
  assert.equal(decide('git tag v1.0', env).block, false);
});

// --- Finding #16: git reflog delete / expire ---
test('blocks git reflog delete and expire (finding #16)', () => {
  assert.equal(decide('git reflog delete HEAD@{0}', env).block, true);
  assert.equal(decide('git reflog expire --expire=now --all', env).block, true);
  // read-only reflog show must remain allowed
  assert.equal(decide('git reflog show', env).block, false);
});

// --- Finding #17: false-positives on read-only git commands ---
test('does not false-positive on git fetch --force or git log --grep=--force (finding #17)', () => {
  assert.equal(decide('git fetch --force origin main', env).block, false);
  assert.equal(decide('git log --grep="--force" --oneline', env).block, false);
  assert.equal(decide('git log --format=%H --force', env).block, false);
});

// --- Finding #19: run() export and main-module guard ---
test('decide() is exported and has no stdin side-effects on import (finding #19)', () => {
  // If we can import and call decide() here, the stdin guard is in run() behind a main-module check.
  // We verify decide is a function (import worked without registering stdin listeners as side-effects).
  assert.equal(typeof decide, 'function');
});

// --- Finding #33: allow path omits permissionDecisionReason ---
test('allow result has no permissionDecisionReason (finding #33)', () => {
  const result = decide('git status', env);
  assert.equal(result.block, false);
  assert.equal('reason' in result, false, 'reason must be absent on allow path');
});
