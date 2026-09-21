# Handoff — execute-plan landed; a harvest that halted and paid for itself twice

2026-09-21 (UTC) · newest commit this brief describes: **`e118250`**
("execute-plan plan of record, as executed") — pick-up measures drift from here.
Written by session `3e2af12f`. Branch **`fix/git-guard-subcommand-parsing`**,
in sync with its origin at write time, **13 commits ahead of `origin/main`
(`8f91906`) and not merged** — see the blocker. Seven commits this session
(`2bfbcc1..e118250`), all operator-run.

**Uncommitted at write time:** the two learnings entries this command just wrote
and their index rows. Nothing else, except
`docs/specs/2026-09-15-codex-interop-design.md`, deliberately left untracked
(see locked decisions).

## Current state

- **built** `execute-plan` — skill, slash command, gated Workflow example, and
  the `plan-waves` intake utility (`9267953`, `4beca81`). Built inline from its
  own plan on 2026-09-15 by a prior session; this session only committed it.
  **Provisional, fixture-tested, 0 domains — it has never executed a plan.**
  re-verify: `node scripts/check-fanout.mjs skills/execute-plan/example.mjs`
  and `node scripts/check-tier-placement.mjs skills/execute-plan/example.mjs`
  (both exit 0).
- **built** the plan of record, now honest about what executed (`e118250`): 35
  boxes ticked, and blockquote pointers under Task 1 Step 3 and Task 2 warning
  that their code fences are the PLANNED parser, not the shipped one.
  re-verify: `node scripts/plan-waves.mjs docs/plans/2026-09-15-execute-plan-plan.md`
  (exit 0, waves `[[1,3,4,5,6],[2]]`).
- **built** second harvest, session `cc40b6d1` (`9626f06`): **5 records, 0
  credited**. `orchestrate` drove 8 Workflow runs / 93 agents in datum, meridian
  and baseline, work landed as commits in all three.
  re-verify: `node scripts/check-harvest.mjs docs/harvest/cc40b6d1.jsonl`
  (exit 0, "clean (5 records, 0 credited)").
- **built** `check-tier-placement` resolves one hop of forwarded pin
  (`88f3546`): when the options argument is a bare identifier or
  `Object.assign({}, opts, {…})` adding no pin, the pin is sought at the
  enclosing helper's call sites. Fails closed — unresolvable forward, or one
  unpinned caller of many, still warns; stops at one hop.
  re-verify: `node --test tests/tier-placement.test.mjs` (20 pass, 0 fail).
- **built** `check-harvest` counts superseded numbers in its chain (`7638bc8`)
  — **a real misfire, closed pinned**: the gate forbade the correction
  discipline it ships for any record but the last.
  re-verify: `node --test tests/harvest-check.test.mjs` (27 pass, 0 fail).
- **built** suite floor 626 → **634**; scrub clean.
  re-verify: `node --test` (634 pass, 0 fail).
- **built, intentionally red** `check-misfire-closure` exit 2 (13 records, 8
  pinned / 5 open) and `check-dispatch` exit 1 on
  `docs/plans/2026-09-14-closure-ledger-pair.verdicts.jsonl` (4 high-stakes
  votes on the mid tier) — both awaiting the judgment tier, not a defect.
  re-verify: `node scripts/check-misfire-closure.mjs docs/learn/closure-log.jsonl` (exit 2).
- **in-progress** Nothing half-built.
- **planned, not started** The `execute-plan` dogfood run from base `2bfbcc1`;
  the judgment-tier refutation round; a gate comparing STATUS rows to
  FEEDBACK.md; the codex-interop plan; re-ranking the harvest queue from a full
  index.

## Locked decisions

- **The `check-tier-placement` finding is NOT a misfire; no closure record was
  written.** *Reason: the gate's own header documented "cannot see through
  indirection (a helper that sets model: away from the call site)" before this
  session, so it behaved as specified — a firing that matches a documented limit
  is not evidence of a component misfiring.* Recorded as `not-applicable` in
  harvest record 2's superseding entry. The closure ledger stays at 5 open.
- **The `check-harvest` finding IS a misfire and is closed pinned.** *Reason: it
  refused a well-formed correction — "refused something good" is squarely what
  `learn-from-misfire` covers.*
- **Nothing from the `cc40b6d1` harvest is credited.** *Reason: step 5 never
  ran; both judgment-tier skeptics died on exhausted credits, and the
  2026-09-14 precedent is that a mid-tier substitute makes `check-dispatch` red
  rather than creditable. A verdict without refutation is the orchestrator's
  unrefuted reading, not evidence.*
- **The plan's predicted counts (623) and the deviations' 626 were left
  unedited.** *Reason: `docs/plans/` are point-in-time build records; editing a
  recorded measurement to match today's tree falsifies it. The same rule kept
  "632/632" in two entries, with the instant made explicit.*
- **`docs/specs/2026-09-15-codex-interop-design.md` stays untracked.** *Reason:
  its own header says the spec awaits operator review before a plan is written;
  committing it would read as acceptance.*
- **`orchestrate` is settled (scoped) with 3 domains, not provisional.**
  *Reason: `docs/feedback/2026-07-08-orchestrate-two-domains-gate-reverified.md`
  promoted it on gate re-runs the operator executed; STATUS simply never caught
  up.* Its open item is the same-operator caveat.

## Reuse map

- **`scripts/check-tier-placement.mjs`** — `secondArgText`, `forwardedIdent`,
  `resolveCallerOptions`, `enclosingHelper`, `scanBalancedBraces`,
  `splitTopLevelArgs`: string-aware, length-preserving source analysis with no
  parser dependency. Reusable for any one-hop call-site question.
- **The two-sided twin pattern** — for any boundary change, pin the forms a
  LOOSER boundary would wrongly admit alongside the form the old rule wrongly
  refused. `tests/tier-placement.test.mjs` carries three of each; the guards
  were green before and after, which is what proves the rule was not just
  removed.
- **Re-index the whole corpus, not the queue** — `scripts/index-sessions.mjs`
  over every directory under `~/.claude/projects/` (17 of them), not the one the
  queue was built from. See `docs/harvest/HARVEST.md` "The queue is not the
  corpus".
- **Persisted Workflow run records** —
  `~/.claude/projects/<proj>/<session>/workflows/*.json` carry `script`,
  `scriptPath`, `args`, `result`, `agentCount`. Far better evidence than
  transcript prose: agent counts and answering-model receipts are recomputable.
- **`docs/harvest/cc40b6d1.jsonl`** — the record shape for a harvest that
  halted: adjudicated verdicts, `credited: false`, and a superseding record
  correcting an earlier one's verdict.

## Invariants

- **A transcript is a lead; credit comes from a re-run executed today.**
  Violated ⇒ harvesting becomes the backfill it exists to avoid
  (`check-harvest`).
- **A correction is a new record carrying `supersedes`, never an edit** — and
  it keeps the `n` of the record it corrects. Violated ⇒ the append-only
  guarantee is gone.
- **A pin must be seen red on the original condition before the fix.** Both
  fixes here carry TAP output from before the change; a pin never seen red is
  an always-green gate.
- **Re-verify lines are READ-ONLY** — a verifier executes them.
- **Agents never write git history**; every commit here was emitted for the
  operator and run by them.
- **A high-stakes vote below the judgment tier fails `check-dispatch` closed.**
  Violated ⇒ the credit ladder is decorative.
- **The shipped surface stays domain-neutral** (`check-surface-scrub` clean at
  write time); `docs/` may name repos freely.

## Open / next

**Blocker, and it now gates three things: the judgment tier has been out of
credits since 2026-09-14.** It blocks (1) the `git-guard` no-weakening claim,
which gates merging this branch to `main`; (2) crediting any of the five
`cc40b6d1` harvest records; (3) refuting this session's two gate findings. One
judgment-tier round clears all three. Until then `check-dispatch` stays red on
`plans/2026-09-14-closure-ledger-pair.verdicts.jsonl` by design.

Then, in rough order:

1. **Merge the branch** once the no-weakening claim survives refutation. 13
   commits ahead of `main`, zero PRs open, and the branch name no longer
   describes its contents — worth renaming before the merge.
2. **Give `execute-plan` its first domain.** Running it at HEAD is vacuous —
   every file exists, so implementers report COMPLETE on empty diffs. Base
   `2bfbcc1` is verified clean of all six paths (`git ls-tree`); run it there in
   a detached worktree, with the committed inline build as the control. Caveat
   to state in any resulting claim: Task 1's body contains the finished source,
   so implementers transcribe rather than design — it tests the shape, not
   invention.
3. **Build the STATUS-vs-FEEDBACK gate** (learnings
   `2026-09-21-no-gate-checks-a-status-row-against-the-promotion-ledger`). Three
   rows have contradicted the ledger, one for ten weeks, each caught by a human.
4. **Fix `check-learnings`' exit code** (learnings
   `2026-09-21-check-learnings-coerces-unevaluable-into-fail`): it exits 1 while
   printing "unevaluable".
5. **Re-rank the harvest queue from a full index.** It names 23 session ids; a
   full re-index finds 45 sessions with firings, 29 domain-eligible. 15 of the
   23 are already unrecoverable.
6. **Operator rulings, still outstanding:** ADR-0013, ADR-0014 + claim cards,
   and the proposed FEEDBACK rows in `docs/harvest/HARVEST.md`.

**Standing caveat:** every verdict in `docs/harvest/cc40b6d1.jsonl` is an
unrefuted reading by the session that wrote it. Treat all five as claims, not
findings, until a judgment-tier skeptic has attacked them.
