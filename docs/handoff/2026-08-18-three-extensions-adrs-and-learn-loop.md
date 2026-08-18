# Handoff — three extension ADRs proposed; LEARN loop built ahead of ratification

2026-08-18 · newest commit this brief describes: `6565f02` (pick-up measures drift
from here). Written by session `62dcb1b1`. **Everything below is uncommitted at
write time** (operator commits pending): 3 new ADRs, 1 new skill, 1 new gate + 21
tests, `docs/learn/`, 1 audit, 2 learnings entries + index rows, and doc refreshes
across AGENTS.md / SYSTEM.md / STATUS.md / README.md / DEVELOPMENT.md / adr/README.md
and both effort spines. Also uncommitted and **not this session's**: the
`docs/comparisons/2026-07-21-…` modification (80 lines, predates the 07-22 brief).

## Current state

- **built** `learn-from-misfire` skill (`skills/learn-from-misfire/SKILL.md`) —
  the four-stage loop (capture → blameless mechanism → pin → close), three-valued
  closure, five named anti-patterns. Domain-neutral.
  re-verify: `node scripts/check-surface-scrub.mjs` (clean).
- **built** `check-misfire-closure.mjs` + 21 tests. Three outcomes: exit 0 closed,
  exit 1 on a false closure claim (a `pinned` state with no red-proof), exit 2
  unevaluable when any record is `open`. All three demonstrated on real fixture
  files, plus a negative control proving a fully-closed ledger passes.
  re-verify: `node --test tests/misfire-closure.test.mjs` (21 pass).
- **built** `docs/learn/` — `LEARN.md` (schema + gate contract) and an **empty**
  `closure-log.jsonl`. Starts empty by the no-backfill invariant; the CLI prints
  `VACUOUS` on the empty pass so it is never quoted as evidence of closure.
  re-verify: `node scripts/check-misfire-closure.mjs docs/learn/closure-log.jsonl`
  (exit 0, prints the vacuity warning).
- **built** `docs/audits/2026-08-18-misfire-closure-survey.md` — the skill
  self-applied. **5 pinned / 0 declined / 8 open** across 13 recorded misfires;
  pin status determined by grepping `tests/`, not by trusting ledger prose. Two
  items that read as "fixed" (HALT-marker, args-as-string) have no regression test.
  re-verify: `grep -rn "affirmative\|No HALT" tests/` (no match — the missing pin).
- **proposed, nothing built** ADR-0011 (verifier-calibration ledger) and ADR-0012
  (re-audit sweep). Design only, deliberately.
  re-verify: `ls docs/calibration 2>&1` (does not exist).
- **proposed** ADR-0010 (LEARN loop) — **but partly built ahead of ratification**,
  on operator direction. This is the one honesty seam in the session: normally
  ADR-0009's precedent is propose-then-wait. The ledger schema and folder are
  provisional until 0010 is accepted.
  re-verify: `grep -n "^\*\*Status:\*\*" docs/adr/0010-learn-from-misfire.md`.
- **built** doc refresh from the entry pick-up: three ADR index rows that
  described built things as open (0004/0007/0008), gate count 8→10, command count
  7→8, `docs/STATUS.md` re-stamped 2026-08-18.
  re-verify: `node --test` (171 pass) and `git diff --stat`.
- **red, untouched** `check-runlog` on the payment-loop run log. Pre-existing;
  correcting a committed ledger entry collides with immutability, so it is the
  operator's call.
  re-verify: `node scripts/check-runlog.mjs docs/efforts/payment-loop-randomized/run-log.jsonl` (exit 1).

## Locked decisions

- **Capture stays in the existing ledgers; `docs/learn/` holds only closure**
  (ADR-0010 §2) — reason: `feedback/` and `learnings/` already own capture, and a
  fourth capture ledger would fragment it. Closure records point at capture by
  path, with a no-orphan rule.
- **Closure is three-valued and `open` exits 2** (ADR-0010 §4) — reason: a
  two-outcome gate forces open work to read as pass or fail, and the pressure is
  to close records for green. Exit 2 is what stops the loop Goodharting.
- **No backfill; the survey is an audit, not a seed** (ADR-0010 §5) — reason: the
  standing invariant. The eight open items must be closed by *forward* capture
  with real timestamps, never by transcribing the audit table into the ledger.
- **Build order 0010 → 0011 → 0012** (ADR-0012 §8) — reason: pins are sweepable
  standing claims, and sweep verdicts are calibration records; the dependencies
  run one way.
- **Ship discipline, not a sweeper / not an incident bot** (ADR-0002, restated in
  both 0010 and 0012) — automation is a generator stamped into the target repo.

## Reuse map

- Gate house style: `scripts/check-misfire-closure.mjs` is the freshest example of
  pure-exported-matcher + fs-at-CLI + Windows-safe main check, and the first with
  a **three-outcome** CLI (exit 2). Copy it, not the two-outcome gates, when the
  unevaluable rung matters.
- Its test file is the pattern for red-path proof: green fixtures modelled on a
  *real* closed misfire, an explicit `negative control` test, and one RED test per
  false-closure class.
- The three ADRs each carry a **self-refutation** section — a new convention this
  session introduced. If it survives review, it belongs in the ADR template.
- Entry pick-up report (this session, conversation only): the method that found
  the three stale ADR rows was comparing each ADR's "Open" column against the
  tree, not reading the ADR bodies.

## Invariants

- Ledger indexes hold pointers; dated entries are immutable; corrections are new
  entries with `kills:`, never edits. No ledger is ever backfilled.
- `/rigor:handoff` is the **sole writer** of `docs/learnings/` — do not hand-write
  entries, and keep `re-verify:` lines **read-only** (a verifier executes them).
- Agents never write git history — emit commands for the operator.
- The shipped surface (`skills/`, `agents/`, `commands/`) stays domain-neutral and
  must pass surface-scrub; `docs/` may name domains freely.
- `paused: true` in an effort STATE.md is honored fail-closed.
- A proposed ADR is not practice. 0010/0011/0012 are **Proposed**; do not quote
  their resolutions as decided.

## Open / next

**First, four operator decisions:**
1. **Ratify or reject ADR-0010.** Code exists ahead of it; if rejected, delete
   `docs/learn/`, the skill, the gate and its tests. Nothing else depends on it.
2. **ADR-0011's demotion scope** — a control failure voids the whole session's
   verdicts, or only the affected claim class? The ADR states it as genuinely
   undecided and does not pick.
3. **ADR-0012 / ADR-0005 resolution 2** — its precondition is discharged
   (ADR-0004 settled 07-14); opening the sweep still needs an explicit go in a
   run log.
4. **The `check-runlog` red** — how does a committed run-log entry get corrected
   under the immutability rule? Blocks the payment-loop effort's re-entry.

Then, in rough order: wire `check-runlog` into `fanout-loop`'s step 4/5 (the
ADR-0004 residual — the gate exists, nothing calls it); close the two cheap open
misfires from the survey (HALT-marker and args-as-string fixes exist, only the
regression tests are missing); decide the ADR-0009-vs-0010 folder consolidation
before a third ledger folder lands; and the data-engineering promotion work that
was queued when this session was redirected — three of the four skills are still
origin-only and `lineage-replay`'s origin firing is unconfirmed as a true
replay-diff.
