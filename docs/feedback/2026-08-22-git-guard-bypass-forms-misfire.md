# 2026-08-22 · git-guard · misfired · rigor (ADR-0013 skeptic rounds) · ten bypass forms, five predating the session

Domain: rigor itself — the hook was probed by judgment-tier skeptics during the
ADR-0013 build (`docs/plans/2026-08-22-deployment-layer-build.md`), so this is
**use**, not an independent domain. Recorded because the finding moves a
component's honest description: `git-guard` is **friction, not a security
boundary**, and its pre-session matcher let through forms the repo's own
invariant ("agents never write git history") assumes it catches.

## What fired wrong

Recomputed by the orchestrator at 18:44:10Z against `git show
HEAD:hooks/git-guard.mjs` (the hook as installed before this session) —
every one **allowed**:

| form | why it passed |
|---|---|
| `git reset -q --hard HEAD~1` | the mode flag had to sit immediately after `reset` |
| `git reset HEAD~1` | no mode flag = `--mixed`, moves the branch ref; unmatched |
| `git tag -a -f v1 -m x` | `-f` had to follow `tag` directly |
| `git branch -df feature` | `-f`/`-D` matched only as whole tokens, not in a cluster |
| `git branch -M main` | force-rename not in the set |
| `sudo git push origin main`, `GIT push origin main`, `true & git push …`, `if git push …; then …; fi`, `time -p git commit …` | wrappers, case, a lone `&`, shell keywords — the segment never started with `git ` |

Earlier the same day the ADR-review skeptics had already shown `git -c x=y
commit`, `sh -c "git commit"`, absolute-path `git`, stash + `checkout --detach`,
`git replace`, plumbing (`hash-object -t commit -w` + `checkout -B`) and
remote-side `gh pr merge` / `gh api PUT …/merge` all pass the same hook.

## Mechanism (blameless)

A single-regex-per-verb matcher anchored on `^git <verb> <flag>` assumes the
flag adjacency and the bare-`git` segment start that real shells do not
guarantee; nothing in the hook normalized wrappers, clusters, or case, and the
`gh` remote surface was simply absent. The tests pinned only the forms their
author had thought of.

## Pin and red-proof

Closed **pinned** in `docs/learn/closure-log.jsonl`
(`git-guard-bypass-forms-2026-08-22`): `tests/git-guard.test.mjs` (70 tests at
close) + `tests/shell-normalize.test.mjs` (67). Red-proof, re-run by the
orchestrator 19:11:55Z: the current test file against the pre-session hook →
**70 tests, 37 pass, 33 fail**; against the working tree → 70/70.

## Status effect

`git-guard` stays **provisional**. Helped-count unchanged; this entry is a
misfire with a pinned closure. The residual tail (variable indirection,
`node -e`/`python -c`, `find -exec`, the agent-writable plugin-cache copy,
`disableAllHooks`) is named in ADR-0013 §4/§7 and is **not** claimed closed.

## Re-verify

```
cd ~/dev/rigor
node --test tests/git-guard.test.mjs tests/shell-normalize.test.mjs   # 137 pass
node "<scratch>/probe-gitguard-old-vs-new.mjs"                         # HEAD column allow, working-tree BLOCK, until committed
```
