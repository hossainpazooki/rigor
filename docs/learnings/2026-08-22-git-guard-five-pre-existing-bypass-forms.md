# 2026-08-22 - git guard five pre existing bypass forms

ts: 2026-08-22T18:44:10Z
commit: a8f1bb6
session: 1b845026-b1af-4fd8-b589-7cdf5e2dce7a
status: verified
fact: the pre-session git-guard matched reset --hard, tag -f and branch -f/-D only when the flag sat immediately after the verb, so git reset -q --hard HEAD~1, git reset HEAD~1, git tag -a -f v1, git branch -df feature and git branch -M main all passed - as did sudo/uppercase/lone-&/if-keyword/time -p wrappers; found by the round-4 skeptic, closed red-first in round 5 (current tests vs the pre-session hook: 70 tests, 33 fail)
basis: scratchpad/probe-gitguard-old-vs-new.mjs (imports git show HEAD:hooks/git-guard.mjs and the working tree) -> HEAD column: allow on all ten forms; working tree after round 5: BLOCK on all ten; controls: git commit -m x BLOCK/BLOCK, git status allow/allow. Red-proof 19:11:55Z: tests/git-guard.test.mjs against the pre-session hook -> tests 70, pass 37, fail 33; against the working tree -> 70/70
re-verify: git show HEAD:hooks/git-guard.mjs > /tmp/old.mjs && node -e "import('/tmp/old.mjs').then(m=>console.log(m.decide('git reset -q --hard HEAD~1',{}).block))"  (false until the fix is committed)
