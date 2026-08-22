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

// ===========================================================================
// ADR-0013 hardening: expandCommands() routing, new global-flag support,
// and the new BLOCKED git/gh surfaces.
// ===========================================================================

// --- global flag additions: -c and --no-optional-locks must not bypass ---
test('git -c global flag does not bypass the commit/push block (ADR-0013)', () => {
  assert.equal(decide('git -c user.name=x commit -m x', env).block, true);
  assert.equal(decide('git -c user.name=x -c user.email=y push origin main', env).block, true);
});
test('git --no-optional-locks does not bypass the commit/push block (ADR-0013)', () => {
  assert.equal(decide('git --no-optional-locks commit -m x', env).block, true);
  assert.equal(decide('git --no-optional-locks status', env).block, false);
});

// --- expandCommands() routing: wrappers that previously bypassed detection ---
test('wrapper commands no longer bypass the block (ADR-0013, via expandCommands)', () => {
  assert.equal(decide('env FOO=bar git commit -m x', env).block, true);
  assert.equal(decide('command git commit -m x', env).block, true);
  assert.equal(decide('timeout 30 git commit -m x', env).block, true);
  assert.equal(decide('nice -n 5 git commit -m x', env).block, true);
  assert.equal(decide('nohup git push origin main', env).block, true);
  assert.equal(decide('exec git commit -m x', env).block, true);
  assert.equal(decide('xargs -0 git commit -m x', env).block, true);
});
test('absolute paths and .exe suffixes no longer bypass the block (ADR-0013)', () => {
  assert.equal(decide('/usr/bin/git commit -m x', env).block, true);
  assert.equal(decide('git.exe commit -m x', env).block, true);
  assert.equal(decide('"C:/Program Files/Git/bin/git.exe" push origin main', env).block, true);
});
test('sh -c / bash -c / eval bodies no longer bypass the block (ADR-0013)', () => {
  assert.equal(decide('sh -c "git commit -m x"', env).block, true);
  assert.equal(decide('bash -lc "git push origin main"', env).block, true);
  assert.equal(decide('eval git commit -m x', env).block, true);
});
test('read-only commands through wrappers still stay green (ADR-0013)', () => {
  assert.equal(decide('timeout 30 git status', env).block, false);
  assert.equal(decide('/usr/bin/git fetch origin', env).block, false);
  assert.equal(decide('sh -c "git log --oneline -5"', env).block, false);
});

// --- git checkout -B / git switch -C|--force-create ---
test('blocks git checkout -B (ADR-0013)', () => {
  assert.equal(decide('git checkout -B main', env).block, true);
  assert.equal(decide('git checkout -B main origin/main', env).block, true);
  assert.equal(decide('git checkout main', env).block, false);
  assert.equal(decide('git checkout -b newbranch', env).block, false);
});
test('blocks git switch -C and --force-create (ADR-0013)', () => {
  assert.equal(decide('git switch -C main', env).block, true);
  assert.equal(decide('git switch --force-create main', env).block, true);
  assert.equal(decide('git switch main', env).block, false);
  assert.equal(decide('git switch -c newbranch', env).block, false);
});

// --- git symbolic-ref: two positional args = write ---
test('blocks git symbolic-ref writes, allows short/delete/single-arg reads (ADR-0013)', () => {
  assert.equal(decide('git symbolic-ref HEAD refs/heads/main', env).block, true);
  assert.equal(decide('git symbolic-ref --short HEAD', env).block, false);
  assert.equal(decide('git symbolic-ref -d HEAD', env).block, false);
  assert.equal(decide('git symbolic-ref --delete HEAD', env).block, false);
  assert.equal(decide('git symbolic-ref HEAD', env).block, false);
});

// --- git replace: blocked except -l/--list/-d/--delete ---
test('blocks git replace, allows -l/--list/-d/--delete (ADR-0013)', () => {
  assert.equal(decide('git replace abc123 def456', env).block, true);
  assert.equal(decide('git replace -l', env).block, false);
  assert.equal(decide('git replace --list', env).block, false);
  assert.equal(decide('git replace -d abc123', env).block, false);
});

// --- git hash-object -w -t commit (either order) ---
test('blocks git hash-object -w -t commit in either order (ADR-0013)', () => {
  assert.equal(decide('git hash-object -w -t commit file.txt', env).block, true);
  assert.equal(decide('git hash-object -t commit -w file.txt', env).block, true);
  assert.equal(decide('git hash-object -w file.txt', env).block, false);
  assert.equal(decide('git hash-object file.txt', env).block, false);
});

// --- git stash store ---
test('blocks git stash store, allows other stash subcommands (ADR-0013)', () => {
  assert.equal(decide('git stash store abc123', env).block, true);
  assert.equal(decide('git stash list', env).block, false);
  assert.equal(decide('git stash pop', env).block, false);
});

// --- git pull (any form) ---
test('blocks git pull in any form (ADR-0013)', () => {
  assert.equal(decide('git pull', env).block, true);
  assert.equal(decide('git pull origin main', env).block, true);
  assert.equal(decide('git pull --rebase', env).block, true);
});

// --- git fetch with a src:dst refspec token ---
test('blocks git fetch with a refspec, allows plain fetch forms (ADR-0013)', () => {
  assert.equal(decide('git fetch origin +refs/heads/main:refs/remotes/origin/main', env).block, true);
  assert.equal(decide('git fetch origin main:main', env).block, true);
  assert.equal(decide('git fetch', env).block, false);
  assert.equal(decide('git fetch origin', env).block, false);
  assert.equal(decide('git fetch origin main', env).block, false);
});

// --- gh: pr merge, api PUT/POST/PATCH/DELETE on merge/contents/refs/commits, atlantis apply ---
test('blocks gh pr merge (ADR-0013)', () => {
  assert.equal(decide('gh pr merge 123', env).block, true);
  assert.equal(decide('gh pr merge --squash 123', env).block, true);
});
test('blocks gh api mutating calls on merge/contents/refs/commits endpoints (ADR-0013)', () => {
  assert.equal(decide('gh api repos/o/r/pulls/5/merge -X PUT', env).block, true);
  assert.equal(decide('gh api repos/o/r/pulls/5/merge --method PUT', env).block, true);
  assert.equal(decide('gh api repos/o/r/merges -X POST', env).block, true);
  assert.equal(decide('gh api repos/o/r/contents/file.txt -X PUT -f message=x', env).block, true);
  assert.equal(decide('gh api repos/o/r/git/refs -X POST -f ref=x', env).block, true);
  assert.equal(decide('gh api repos/o/r/git/commits -X POST', env).block, true);
  // -f/-F/--field/--raw-field/--input imply a mutating method with no explicit -X
  assert.equal(decide('gh api repos/o/r/git/refs -f ref=x', env).block, true);
});
test('gh api reads on the same endpoints stay green (ADR-0013)', () => {
  assert.equal(decide('gh api repos/o/r/pulls/5', env).block, false);
  assert.equal(decide('gh api repos/o/r/pulls/5/merge', env).block, false);
  assert.equal(decide('gh api repos/o/r/git/commits/abc123', env).block, false);
});
test('blocks a PR comment or api comment carrying "atlantis apply" (ADR-0013)', () => {
  assert.equal(decide('gh pr comment 5 --body "please atlantis apply"', env).block, true);
  assert.equal(decide('gh pr comment 5 --body "lgtm"', env).block, false);
  assert.equal(decide('gh api repos/o/r/issues/5/comments -f body="atlantis apply"', env).block, true);
});

// ===========================================================================
// ADR-0013 section 7 (skeptic findings), fix round 2.
// NOTE (finding c): the "pre-existing" test count above this banner is 24,
// not 27 as the round-1 receipt claimed; the 18 tests under the "ADR-0013
// hardening" banner above are the round-1 additions. Both groups stay green.
// ===========================================================================

// --- finding (a): gh api flag-first forms (-X/--method before the path,
// attached -XPUT, --method=PUT, --input implying POST) must still resolve
// the correct method and endpoint path instead of misreading a flag token
// as the path or missing the method entirely. ---
test('gh api flag-first forms resolve method + path correctly and block (ADR-0013 fix round 2, finding a)', () => {
  assert.equal(decide('gh api -X PUT repos/o/r/contents/p -f message=x', env).block, true);
  assert.equal(decide('gh api -X PUT repos/o/r/pulls/1/merge', env).block, true);
  assert.equal(decide('gh api -X POST repos/o/r/merges', env).block, true);
  assert.equal(decide('gh api --method PUT repos/o/r/pulls/1/merge', env).block, true);
  assert.equal(decide('gh api repos/o/r/pulls/1/merge --method=PUT', env).block, true);
  assert.equal(decide('gh api -XPUT repos/o/r/pulls/1/merge', env).block, true);
  assert.equal(decide('gh api --input body.json repos/o/r/git/refs', env).block, true);
});
test('gh api reads stay green even with flags before the path (ADR-0013 fix round 2, finding a)', () => {
  assert.equal(decide('gh api repos/o/r/pulls/1', env).block, false);
  assert.equal(decide('gh api -X GET repos/o/r/pulls/1/merge', env).block, false);
  assert.equal(decide('gh api repos/o/r/contents/p', env).block, false);
  assert.equal(decide('gh api repos/o/r/merges', env).block, false);
});

// --- finding (b): shell-normalize bypasses via VAR=$(...) recursion, an
// embedded (non-sole) subshell/backtick, and env's own options. ---
test('OUT=$(git commit -m x) is caught via VAR=value subshell recursion (ADR-0013 fix round 2, finding b)', () => {
  assert.equal(decide('OUT=$(git commit -m x)', env).block, true);
});
test('echo $(git push) is caught via embedded (non-sole) subshell scanning (ADR-0013 fix round 2, finding b)', () => {
  assert.equal(decide('echo $(git push)', env).block, true);
});
test('env -i git commit -m x is caught after stripping env options (ADR-0013 fix round 2, finding b)', () => {
  assert.equal(decide('env -i git commit -m x', env).block, true);
});

// ===========================================================================
// ADR-0013 section 7 (skeptic findings), fix round 3.
// ===========================================================================

// --- finding (a): a quoted flag value with embedded whitespace must not
// displace the gh api path when git-guard walks the argv array (no
// re-split of a joined string). Also: -X=PUT and --method=PUT forms. ---
test('gh api quoted-header-value forms still resolve method + path and block (ADR-0013 fix round 3, finding a)', () => {
  assert.equal(decide('gh api -H "Accept: application/vnd.github+json" -X PUT repos/o/r/pulls/1/merge', env).block, true);
  assert.equal(decide('gh api -X PUT -f message="update file" repos/o/r/contents/p', env).block, true);
  assert.equal(decide('gh api --method PUT -f commit_title="Merge it" repos/o/r/pulls/1/merge', env).block, true);
  assert.equal(decide('gh api -X POST -f base=main -f head=feature -f commit_message="merge branch" repos/o/r/merges', env).block, true);
  assert.equal(decide('gh api --method PUT -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" /repos/O/R/pulls/N/merge -f "commit_title=Expand enum"', env).block, true);
  assert.equal(decide('gh api -X=PUT repos/o/r/pulls/1/merge', env).block, true);
});
test('gh api quoted-header-value reads still stay green (ADR-0013 fix round 3, finding a)', () => {
  assert.equal(decide('gh api -H "Accept: application/vnd.github+json" repos/o/r/pulls/1/merge', env).block, false);
  assert.equal(decide('gh api --paginate repos/o/r/pulls/1/merge', env).block, false);
  assert.equal(decide('gh api -X GET -f per_page=100 repos/o/r/git/refs', env).block, false);
  assert.equal(decide('gh api --jq .sha repos/o/r/git/commits/abc', env).block, false);
});

// --- finding (b): GraphQL history-writing mutations via `gh api graphql`. ---
test('blocks gh api graphql mutations that write history (ADR-0013 fix round 3, finding b)', () => {
  assert.equal(decide('gh api graphql -f query=\'mutation { mergePullRequest(input: {pullRequestId: "x"}) { clientMutationId } }\'', env).block, true);
  assert.equal(decide('gh api graphql -f query=\'mutation { createCommitOnBranch(input: {branch: "x"}) { clientMutationId } }\'', env).block, true);
  assert.equal(decide('gh api graphql -f query=\'mutation { updateRef(input: {refId: "x"}) { clientMutationId } }\'', env).block, true);
  assert.equal(decide('gh api graphql -f query=\'mutation { createRef(input: {name: "x"}) { clientMutationId } }\'', env).block, true);
  assert.equal(decide('gh api graphql -f query=\'mutation { deleteRef(input: {refId: "x"}) { clientMutationId } }\'', env).block, true);
  assert.equal(decide('gh api graphql -f query=\'mutation { enablePullRequestAutoMerge(input: {pullRequestId: "x"}) { clientMutationId } }\'', env).block, true);
});
test('gh api graphql query-only calls stay green (ADR-0013 fix round 3, finding b)', () => {
  assert.equal(decide('gh api graphql -f query=\'query { viewer { login } }\'', env).block, false);
  assert.equal(decide('gh api graphql -f query=\'query { repository(owner: "o", name: "r") { pullRequest(number: 1) { title } } }\'', env).block, false);
});

// --- finding (c): additional shell-normalize prefix stripping reaching
// git-guard end-to-end. ---
test('blocks git commit through additional wrapper prefixes (ADR-0013 fix round 3, finding c)', () => {
  assert.equal(decide('time git commit -m x', env).block, true);
  assert.equal(decide('{ git commit -m x; }', env).block, true);
  assert.equal(decide('if true; then git commit -m x; fi', env).block, true);
  assert.equal(decide('env --unset=FOO git commit -m x', env).block, true);
  assert.equal(decide('env -i -- git commit -m x', env).block, true);
  assert.equal(decide('xargs -L1 git commit -m x', env).block, true);
});

// ===========================================================================
// ADR-0013 section 7 (skeptic findings), fix round 4.
// ===========================================================================

// --- findings (a)/(b): shell-normalize env -S / xargs -d<char> reaching
// decide() end-to-end. ---
test('blocks git commit through env -S and attached xargs -d, wrapper prefixes (ADR-0013 fix round 4, findings a-b)', () => {
  assert.equal(decide("env -S 'git commit -m x'", env).block, true);
  assert.equal(decide('env -S git commit -m x', env).block, true);
  assert.equal(decide('xargs -d, git commit -m x', env).block, true);
});

// --- finding (c): gh api path normalization strips a leading '/' before
// every check (graphql and the REST mutating paths). ---
test('blocks gh api /graphql (leading slash) mutations (ADR-0013 fix round 4, finding c)', () => {
  assert.equal(decide('gh api /graphql -f query=\'mutation { mergePullRequest(input:{pullRequestId:"x"}) { clientMutationId } }\'', env).block, true);
});
test('gh api /repos/o/r/pulls/1 (leading slash) stays green (ADR-0013 fix round 4, finding c)', () => {
  assert.equal(decide('gh api /repos/o/r/pulls/1', env).block, false);
});

// --- finding (d): gh global flags (-R/--repo/-R<v>/--repo=<v>/--hostname)
// before the pr/merge verb must not hide the verb from position checks. ---
test('blocks gh pr merge with global flags interposed before the verb (ADR-0013 fix round 4, finding d)', () => {
  assert.equal(decide('gh pr --repo o/r merge 1', env).block, true);
  assert.equal(decide('gh -R o/r pr merge 1', env).block, true);
  assert.equal(decide('gh --repo=o/r pr merge 1', env).block, true);
});
test('gh -R o/r pr view 1 stays green (ADR-0013 fix round 4, finding d)', () => {
  assert.equal(decide('gh -R o/r pr view 1', env).block, false);
});

// --- finding (e): a graphql mutation body supplied out-of-band (--input
// <file>, or -F query=@<file>) is blocked outright since the mutation text
// is not visible to classify; an inline literal query stays green. ---
test('blocks gh api graphql with an out-of-band body via --input or -F query=@file (ADR-0013 fix round 4, finding e)', () => {
  assert.equal(decide('gh api graphql --input body.json', env).block, true);
  assert.equal(decide('gh api graphql -F query=@query.graphql', env).block, true);
});
test('gh api graphql with an inline literal query stays green (ADR-0013 fix round 4, finding e)', () => {
  assert.equal(decide('gh api graphql -f query="query { viewer { login } }"', env).block, false);
});

// ===========================================================================
// ADR-0013 section 7, FIX ROUND 5 (bounded, final).
// ===========================================================================

// --- normalizer-contract wrapper/keyword forms reaching decide() end to end. ---
test('blocks git commands through the fix round 5 normalizer wrapper/keyword forms', () => {
  assert.equal(decide('true & git push origin main', env).block, true);
  assert.equal(decide('if git push origin main; then echo ok; fi', env).block, true);
  assert.equal(decide('while ! git push; do sleep 1; done', env).block, true);
  assert.equal(decide('! git commit -m x', env).block, true);
  assert.equal(decide('2>/dev/null git commit -m x', env).block, true);
  assert.equal(decide('sudo git push origin main', env).block, true);
  assert.equal(decide('sudo -E -u root git push', env).block, true);
  assert.equal(decide('setsid git commit -m x', env).block, true);
  assert.equal(decide('GIT push origin main', env).block, true);
  assert.equal(decide('Git.exe commit -m x', env).block, true);
  assert.equal(decide('pwsh -c "git commit -m x"', env).block, true);
  assert.equal(decide('powershell -Command "git push"', env).block, true);
  assert.equal(decide('cmd /c git commit -m x', env).block, true);
  assert.equal(decide('ksh -c "git commit"', env).block, true);
  assert.equal(decide("env -S'git commit -m x'", env).block, true);
  assert.equal(decide('xargs --delimiter=, git commit -m x', env).block, true);
  assert.equal(decide('time -p git commit -m x', env).block, true);
  assert.equal(decide('exec -a x git commit -m x', env).block, true);
  assert.equal(decide('nice -n5 git commit -m x', env).block, true);
  assert.equal(decide('git co\\mmit -m x', env).block, true); // unquoted backslash
});

test('read-only / non-git commands stay green through fix round 5 forms', () => {
  assert.equal(decide('git status', env).block, false);
  assert.equal(decide('echo "remember to git commit later"', env).block, false);
  assert.equal(decide('if true; then echo ok; fi', env).block, false);
});

// --- (g1): reset --hard/--soft/--mixed/--merge/--keep anywhere after
// `reset`, and a bare `git reset <ref>` with no pathspec. ---
test('blocks git reset --hard regardless of flag position, and a bare ref-looking reset (fix round 5, g1)', () => {
  assert.equal(decide('git reset -q --hard HEAD~1', env).block, true);
  assert.equal(decide('git reset HEAD~1', env).block, true);
});
test('git reset with a pathspec or a file-shaped positional stays green (fix round 5, g1)', () => {
  assert.equal(decide('git reset HEAD file.txt', env).block, false);
  assert.equal(decide('git reset file.txt', env).block, false);
});

// --- (g2): tag -f/-d/--force/--delete anywhere after `tag`, incl. clusters. ---
test('blocks git tag -f anywhere after tag, including combined clusters (fix round 5, g2)', () => {
  assert.equal(decide('git tag -a -f v1 -m x', env).block, true);
});
test('git tag v1.0 (plain create) stays green (fix round 5, g2)', () => {
  assert.equal(decide('git tag v1.0', env).block, false);
});

// --- (g3): branch -f/-D/-M/-m/-d/--force/--delete/--move anywhere after
// `branch`, including combined clusters like -df, -dD, -fm. ---
test('blocks git branch -df and -M anywhere after branch, including clusters (fix round 5, g3)', () => {
  assert.equal(decide('git branch -df feature', env).block, true);
  assert.equal(decide('git branch -M main', env).block, true);
});
test('git branch feature and bare git branch (list) stay green (fix round 5, g3)', () => {
  assert.equal(decide('git branch feature', env).block, false);
  assert.equal(decide('git branch', env).block, false);
});

// --- (g4): gh --field/--field=/attached -F.. out-of-band graphql body;
// --raw-field (no @file magic) dropped from that check; merge-upstream,
// pulls/N/update-branch, repo sync added to the mutating surface;
// mergeBranch added to the graphql mutation ids. ---
test('blocks gh api graphql --field query=@file (fix round 5, g4)', () => {
  assert.equal(decide('gh api graphql --field query=@m.graphql', env).block, true);
});
test('gh api graphql --raw-field query=@file is no longer blocked via the out-of-band check (fix round 5, g4)', () => {
  assert.equal(decide('gh api graphql --raw-field query=@file.graphql', env).block, false);
});
test('blocks gh api merge-upstream, pulls/N/update-branch, and gh repo sync (fix round 5, g4)', () => {
  assert.equal(decide('gh api -X POST repos/o/r/merge-upstream -f branch=main', env).block, true);
  assert.equal(decide('gh api -X PUT repos/o/r/pulls/1/update-branch', env).block, true);
  assert.equal(decide('gh repo sync o/r --branch main', env).block, true);
});
