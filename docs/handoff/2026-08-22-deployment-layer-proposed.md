# Handoff — deployment layer (ADR-0013) proposed and built provisional, five skeptic rounds

2026-08-22 · newest commit this brief describes: **`a8f1bb6`** — pick-up measures
drift from here. **Everything this session produced is uncommitted** (commit
commands were emitted for the operator at session close). Written by session
`1b845026`. Also uncommitted and **not this session's**: the
`docs/comparisons/2026-07-21-dataeng-landscape-deep-research.md` modification,
now carried unresolved across **five** briefs.

## What is and is not claimable

- **Claimable:** "ADR-0013 is Proposed; its units are built, fixture-tested,
  and each has been seen red on known-bad twins; a record-level rehearsal on a
  real rendered overlay refused an honest proposal on four properties." Nothing
  more.
- **Not claimable:** any domain, any live run, any "settled", any production
  claim, any review control (0 of 4 credited), or that either hook is a security
  boundary.

## Current state

- **built** ADR-0013 (`docs/adr/0013-deployment-layer-pre-change-authorization.md`),
  **Proposed**, second draft + post-build amendments (§7). Positioning paragraph,
  both out-of-scope statements, four control shapes, six properties with twins
  and reviewer twins, hook viability argument, class rubric, sweep cadence
  (invented, unmeasured), nine self-refutations.
  re-verify: `grep -n "^\*\*Status:\*\*" docs/adr/0013-deployment-layer-pre-change-authorization.md` (Proposed).
- **built** six skills under `skills/` (change-backout-exercised,
  release-artifact-integrity, health-signal-fail-closed,
  post-implementation-probe, break-glass-on-record, change-class-earned), each
  with rigor + SDLC/SRE names, a four-shape table, detective + reviewer twins,
  record fields, honest limit; domain-neutral; the literal word "settled" absent.
  re-verify: `node scripts/check-surface-scrub.mjs` (clean) and `grep -rli settled skills/change-* skills/release-* skills/health-* skills/post-* skills/break-*` (no match).
- **built** `scripts/check-change-record.mjs` — three-outcome gate over a
  target's change log (exit 0 / 1 / 2), imports `parseRunlog` +
  `resolveSupersession` from `check-runlog` (new export) and
  `findVacuousProbes` from `check-effect-probe`; 143 tests.
  re-verify: `node --test tests/change-record.test.mjs` (143 pass).
- **built** `hooks/change-guard.mjs` — third hook in `hooks/hooks.json`
  (second PreToolUse on Bash); refuses the enumerable deploy surface, reads the
  record from `git --no-replace-objects show <ref>:<path>`; 89 tests.
  re-verify: `printf '{"tool_input":{"command":"kubectl -nprod apply -k x"}}' | node hooks/change-guard.mjs` (deny) and the same with `kubectl auth can-i create pods` (allow, no reason key).
- **built** `hooks/shell-normalize.mjs` — shared by both PreToolUse hooks
  (wrappers, `sh -c`/`pwsh -c`/`cmd /c` bodies, subshells, keywords, lone `&`,
  case, `env -S`, xargs forms); 67 tests.
  re-verify: `node --test tests/shell-normalize.test.mjs`.
- **built** `git-guard` hardening — `-c`, `--no-optional-locks`, `checkout -B`,
  `switch -C`, `symbolic-ref` writes, `replace`, `hash-object -w -t commit`,
  `stash store`, `pull`, refspec fetches, **`reset -q --hard` / `reset <ref>` /
  `tag -a -f` / `branch -df` / `branch -M` (pre-existing holes)**, `gh pr merge`,
  mutating `gh api` (REST + graphql, flag-first, quoted values, `@file` bodies);
  70 tests; closure record pinned with a 33/70 red-proof.
  re-verify: `node --test tests/git-guard.test.mjs` (70 pass) and `node scripts/check-misfire-closure.mjs docs/learn/closure-log.jsonl` (exit 2 — two *other* records are open).
- **built** `docs/plans/2026-08-22-deployment-layer-build.md` + five workflow
  scripts + the 54-record verdict log. `check-fanout` and `check-tier-placement`
  clean on every script; **`check-dispatch` exits 1 on purpose** (one fabricated
  receipt kept as returned).
  re-verify: `node scripts/check-dispatch.mjs docs/plans/2026-08-22-deployment-layer-build.verdicts.jsonl` (exit 1, `worker answered a`).
- **built** `docs/audits/2026-08-22-deployment-layer-first-domain-rehearsal.md`
  + fixture folder: the real ATLAS prod overlay rendered three ways, an honest
  proposal refused (P1×4, form×2, P4), both P2 twins red.
  re-verify: `cd docs/audits/2026-08-22-first-domain-rehearsal && node ../../../scripts/check-change-record.mjs change-log.twin-p2-tampered.jsonl --root .` (exit 1, a P2 line).
- **built** ledgers: feedback (authored entry; git-guard misfire; check-dispatch
  helped), 10 learnings entries (27 total, gate clean), 3 closure records (1
  pinned, 2 open → exit 2), STATUS re-stamped with provisional counts
  (8/20/5/3/11), AGENTS/SYSTEM/DEVELOPMENT/docs README/ADR index updated;
  README left alone per the seed **at the time this brief was written — then
  updated on the operator's instruction after the brief** (stale counts fixed;
  the deployment layer takes the newest-layer slot, labelled proposed; the
  data-eng layer stays settled (scoped)). Same session, before any commit.
  re-verify: `node scripts/check-learnings.mjs docs/learnings` (clean, 27).
- **in-progress** Nothing half-built.
- **planned, not started** A live run in any domain; reviewer-level twins
  seeded for the four review controls; the residual hook tail (ADR-0013 §7).

## Locked decisions

- **The hooks are friction, not a security boundary** (ADR-0013 §1/§4/self-ref
  7; AGENTS.md invariant). Reason: skeptics got agent content into `HEAD` by
  five routes and found a long wrapper tail; the real SoD control is the
  target's branch protection. *Check if the target ever gets required reviewers.*
- **Pre-change evidence in `proposal`, post-change in `outcome`; the break-glass
  record is a standalone file on the configured ref.** Reason: the first draft
  put post-implementation evidence in a pre-change record and every proposal
  was red under `check-effect-probe`.
- **`artifact.identity` is a generic list; identity rules live in the
  authorization, not rigor's schema** (ADR-0002). Reason: per-kind rules in
  rigor were a validator by another name.
- **The class-demotion rule (≥2 clean instances, downward) and the 30d/10th
  cadence are new parameters, not a reuse.** Reason: the promotion ledger counts
  independent domains upward; the first draft's "reuse" claim was refuted.
- **Round 5 was the final fix round; the residual tail is recorded, not
  closed.** Reason: loop-until-dry was not drying on pattern-matching hooks
  (verb-list rot), which is the ADR's own self-refutation 3.
- **The fabricated receipt stays in the verdict log and the two open closure
  records stay open.** Reason: a cleaned log or a forced "declined" would be the
  correct-shaped lie the repo exists to catch; decline is the operator's call.

## Reuse map

- `docs/plans/2026-08-22-deployment-layer-build-round5.workflow.mjs` — the
  final shape of a red-first fix fan-out with a normalizer contract shared
  between two consumers; copy its contract header, not its tasks.
- `scratchpad`-style dry evaluation of a workflow script with stubbed
  `agent/parallel/phase/log/args` globals before launch — it caught a
  `${CLAUDE_PLUGIN_ROOT}` interpolation (7 ms crash) and an escaped-quote syntax
  error that both lints missed. Worth a gate (`check-fanout` evaluates structure
  only).
- `tests/change-record.test.mjs` — 143 tests incl. CLI subprocess tests with
  temp roots and three-outcome separation; `tests/change-guard.test.mjs` —
  injected `io` with a spy that throws if the loader is called on an invalid path.
- `scripts/check-runlog.mjs` → `resolveSupersession(records, { key, label })`.
- `probe-gitguard-old-vs-new.mjs` pattern: import `git show HEAD:<hook>` beside
  the working tree and table the decisions — the cheapest red-proof for a hook.

## Invariants

- Agents never write git history **and never trigger a deployment** — emit the
  command for the human (`git-guard`, `change-guard`).
- Shipped surface domain-neutral (`check-surface-scrub`); **never the literal
  word "settled" in the six ADR-0013 skills** (the repo-wide grep is wrong — it
  hit a settled skill's idiom and an agent edited it out of scope; reverted).
- Ledger indexes hold pointers; dated entries immutable; no backfill.
- Fixers own disjoint files; the orchestrator's gate instructions must be
  scoped to the fixers' files (misfire recorded).
- A worker receipt that fails its schema must be **re-filled, never
  placeholdered**; `check-dispatch` catches only a placeholder that cannot echo
  the requested id.
- `paused: true` honored fail-closed (no effort was touched this session).

## Open / next

**First: the operator's ruling on ADR-0013** — ratify, reject, or amend. Code
exists ahead of it (the 0010 precedent); if rejected, delete the six skills, the
gate, the two hook files, the hooks.json entry, and the tests; keep the
`git-guard` hardening regardless (it closes pre-existing holes).

Then, in rough order:

1. **Decide the two open closure records** (skeptic provenance-by-commit-date;
   fabricated worker receipt): pin or decline with a date. The ledger is exit 2
   until then.
2. **Seed one reviewer-level twin** for one review control in one real repo —
   the cheapest way to credit anything in the layer.
3. **First-domain prerequisites** (the rehearsal's §7): a required-reviewer
   rule on the target's `Production` environment; render-and-commit the
   substituted manifest before dispatch. Until then no live run is possible.
4. **Adjudicate `judgment-dispatch`** — it now has a fourth candidate firing.
5. **Resolve `docs/comparisons/2026-07-21-…`** — fifth brief carrying it.
6. **Residual hook tail** (ADR-0013 §7): variable indirection, `find -exec`,
   graphql via `$(cat)`, `mergeBranch` unpinned, the agent-writable plugin-cache
   hook file, `disableAllHooks`.

**Blocker on none of the above.** Standing constraint: every verdict in the
build record is about the **working tree**; after the operator commits, re-run
`node --test` (523) and the two closure-gate lines above to confirm nothing was
left unstaged.
