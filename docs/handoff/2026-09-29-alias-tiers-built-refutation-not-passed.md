# Handoff — alias tiers built; the whole-branch refutation has not passed

2026-09-29 (UTC), written about 22:50Z. Newest commit this brief describes:
**`f710402`** ("match alias receipts by family, judge them against the lock")
— pick-up measures drift from here. Written by session `aae428e0`. Branch
**`fix/git-guard-subcommand-parsing`**, **4 commits ahead of its origin and 23
ahead of `origin/main` at write time, not pushed, not merged.**

**Most of this session's work is uncommitted at write time.** Committed:
the two harvests (`3759d6a`, `a83f9bd`) and Tasks 1 to 4 of the plan
(`cdd60b4`, `81ee10f`, `f67ad76`, `f710402`). Uncommitted: everything listed
under "built, uncommitted" below, this brief, and eight learnings entries. If
`git status` is clean when you read this, the operator has committed since, and
every file named below should then be in `git log`.

Commands are for Git Bash, from the repository root.

## Current state

- **built, committed** — two sessions harvested: 8 records, 4 credited, and the
  first harvest whose refutation step ran at the judgment tier. Nothing was
  promoted; five proposed rows are in `docs/harvest/HARVEST.md`.
  re-verify: `node scripts/check-harvest.mjs docs/harvest/5891a78d.jsonl && node scripts/check-harvest.mjs docs/harvest/ed0788c7.jsonl`
  (clean, 3 records 2 credited; clean, 5 records 2 credited).
- **built, committed** — Tasks 1 to 4 of
  `docs/plans/2026-09-29-tier-aliases-plan.md`: three alias receipts from a
  probe run, `scripts/model-id.mjs`, and the alias and lock paths of
  `check-dispatch`. These are the FIRST versions; Tasks 9 and 11 changed both
  scripts and are uncommitted.
  re-verify: `git log --oneline a83f9bd..f710402` (four commits).
- **built, uncommitted** — every tier holds a family alias, in
  `config/models.json` and in the five agents' frontmatter, and
  `config/models.lock.json` records `claude-fable-5-1`, `claude-opus-5-5`,
  `claude-sonnet-5-5`, each since 2026-09-29, run `wf_951f8ae1-35e`.
  re-verify: `node scripts/check-tier-sync.mjs && node scripts/check-dispatch.mjs docs/plans/2026-09-29-tier-aliases-spike.verdicts.jsonl`
  (`tier-sync: clean (5 agents)`; `dispatch: clean (3 records)`, no `TIER MOVED` line).
- **built, uncommitted** — `scripts/tier-lock.mjs` prints the lock a run's
  receipts imply and writes nothing.
  re-verify: `node scripts/tier-lock.mjs docs/plans/2026-09-29-tier-aliases-spike.verdicts.jsonl nonexistent.lock.json --date 2026-09-29 --run wf_951f8ae1-35e 2>/dev/null | diff - config/models.lock.json`
  (no output, exit 0).
- **built, uncommitted** — suite floor 640 → **712**: 38 tests for the alias
  tiers, 24 pins against the first refutation round, 10 against the second.
  re-verify: `node --test` (712 pass, 0 fail).
- **built, uncommitted** — ADR-0015 is **Proposed**; ten documents corrected
  over three tasks. The shipped surface is clean.
  re-verify: `node scripts/check-surface-scrub.mjs && grep -c "Proposed 2026-09-29" docs/adr/0015-tiers-follow-the-latest-model.md`
  (`surface-scrub: clean`; 1).
- **built, untracked, the operator's call whether to commit** — the plan
  (twelve tasks, amended twice the same day), its spec, and two verdict logs.
  One log per config, because a log cannot span a change of tier values.
  re-verify: `node scripts/check-dispatch.mjs docs/plans/2026-09-29-tier-aliases-plan.verdicts-aliases.jsonl`
  (`dispatch: clean (26 records)`), and
  `git show f710402:config/models.json > "${TMPDIR:-/tmp}/models-f710402.json" && node scripts/check-dispatch.mjs docs/plans/2026-09-29-tier-aliases-plan.verdicts.jsonl "${TMPDIR:-/tmp}/models-f710402.json"`
  (`dispatch: clean (15 records)`; this one writes a file outside the repository).
- **built** — eight learnings entries dated 2026-09-29.
  re-verify: `node scripts/check-learnings.mjs docs/learnings` (clean, 56 entries).
- **built, intentionally red, unchanged by this session** —
  `check-misfire-closure` exits 2 with five open records.
  re-verify: `node scripts/check-misfire-closure.mjs docs/learn/closure-log.jsonl` (exit 2).
- **NOT PASSED** — the whole-branch refutation. Three rounds of judgment-tier
  skeptics, all on 2026-09-29:

  | Round | Claims attacked | Survived | Refuted |
  |---|---|---|---|
  | 1 | 5 | 2 | 3 |
  | 2 | the 3 refuted, corrected | 0 | 3 |
  | 3 | the same 3, corrected again | 0 | 3 |

  Every case that refuted one round holds in the next, and each is pinned by a
  test. The two claims that survived round 1 — tiers and agents hold aliases;
  exact pins are not loosened — were not attacked again. The session stopped at
  three rounds. What round 3 found is under "Open / next".
- **in-progress** — nothing is half-built.
- **planned, not started** — Task 8 of the plan, the live check that each agent
  resolves its own frontmatter alias. It needs a session restart, because the
  agent registry is read at session start.
- **planned, not started** — the fixes for round 3; closure records for the two
  misfires below; the judgment-tier round that gates this branch's merge (open
  since the 2026-09-21 brief, and still unwritten).

## Locked decisions

- **Every tier follows its family's alias, and a lock file records what each
  alias resolved to.** Operator rulings of 2026-09-29, as picked: "All tiers"
  and "C. Aliases plus lock file". *Reason: the operator wants a newer model
  used without an edit; the lock keeps each move visible and dated.*
- **The lock is keyed by family, not by tier.** *Reason: `build` and `cheap`
  share a family, so two tier entries could disagree about one alias, and a
  worker receipt carries no tier field.* Made by the session while planning;
  the spec was corrected the same day.
- **A receipt is one bare id, or it is unreadable.** *Reason: reading an id
  anywhere inside the text let `claude-fable-5-1-mini` and "I am Haiku 4.5, not
  claude-fable-5-1" pass as the locked version.* Made by the session after
  round 1. It is stricter than before: a display-name echo now exits 2. **The
  operator has not ruled on it.**
- **A record logged `downgraded: true` is not judged against the lock.**
  *Reason: the first build exempted it from two of three lock outcomes, which
  was inconsistent; the flag is the orchestrator's own statement that something
  else answered.* Made by the session after round 2; not ruled on.
- **ADR-0015 stays Proposed.** *Reason: the code was built ahead of the
  decision, and the refutation has not passed.*
- **Refutation stopped at three rounds.** *Reason: each round found less, and
  the last findings needed inputs such as a repeated flag or a closed pipe; a
  skeptic told to refute can keep narrowing. Whether a fourth round runs is the
  operator's call.*
- **Nothing from either harvest is promoted.** *Reason: harvest proposes;
  promotion is the operator's act.*
- **`docs/specs/2026-09-15-codex-interop-design.md` stays untracked.** Carried
  from the 2026-09-21 brief. *Reason: committing it would read as acceptance.*
  Premise to check: `check-dispatch` has carried a harness-aware tier lookup
  since `7cdf189`, and `config/models.json` has no block for a second harness.

## Reuse map

- **`scripts/model-id.mjs`** — `isAlias`, `parseModelId`, `compareVersions`.
  Use it wherever a model id is read; do not write a second reader.
- **`tests/alias-refutation.test.mjs`, `tests/alias-refutation-2.test.mjs`** —
  the pattern for pinning a refuting case: build a log and a lock in a temp
  directory, spawn the real command line, assert the exit code and the last
  line. The second file also shows how to guard a file that must not be
  written, by content and modification time.
- **`docs/plans/2026-09-29-tier-aliases-spike.workflow.mjs`** — a three-agent
  probe that records which model id answers each alias. Re-run it to see what
  an alias resolves to now.
- **A snapshot for the reviewer.** When earlier waves are uncommitted, copy each
  file a task will modify to a scratch folder first, and tell the reviewer to
  use `git diff --no-index <snapshot> <file>`. The diff against the base
  commit shows nothing for a created file and mixes uncommitted waves.
- **A task brief that points at the plan.** Pass the task's section of the plan
  file by path, not pasted into the workflow arguments; the implementer and the
  reviewer read the same text, and nothing is retyped.
- **Replacements as data.** For a task of document edits, hold each
  old-text/new-text pair in one list, check mechanically that every old text
  occurs exactly once and ends on a line boundary, then render the plan steps
  from the list. A block that ends mid-line halted an implementer in this run.

## Invariants

- **Tier values in `config/models.json` and agent frontmatter agree.**
  Violated ⇒ `check-tier-sync` is red. They change together or not at all.
- **The lock changes only by a commit the operator runs.** `tier-lock` prints;
  it never writes. Violated ⇒ a model move has no date.
- **A lock entry is never lowered and never replaced unread.**
- **One verdict log per config.** A log that holds records from before and
  after a change of tier values cannot be clean under either config.
- **A historical verdict log is checked against the config in force when it
  was written**, passed as the second argument. Under the alias config every
  older log reads "unbound tier label".
- **The tests in `tests/dispatch-check.test.mjs`, `tests/tier-sync.test.mjs`
  and `tests/tier-placement.test.mjs` stay unedited.** They pin the exact-id
  behaviour that historical logs depend on.
- **A test is made stricter, never looser.** Two tests this plan wrote were
  tightened in Task 9, with a dated comment saying what they asserted before.
- **After editing `agents/`, restart the session before dispatching an agent by
  type.** Until then a dispatched agent carries its old pin.
- **Agents never write git history.** Every commit of this session was run by
  the operator.
- **Run a brief's re-verify lines after the session's last write.** A harvested
  brief carried two lines that were false when its session ended. Every line in
  this brief was executed after this file and the ledger were written.

## Open / next

**First: the operator's commits.** Nothing below should start on a tree this
far from HEAD. The sequence was simulated on a copy of `f710402`; the suite is
green after each commit (678, 678, 712, 712, 712).

```bash
cd ~/dev/rigor

# 1. the utility; it prints a lock and writes no file
git add scripts/tier-lock.mjs tests/tier-lock.test.mjs
git commit -m "feat(tier-lock): propose the lock a run's receipts imply"

# 2. the switch; config and agents land together or tier-sync goes red
git add config/models.json config/models.lock.json agents/skeptic-verifier.md agents/effect-prober.md agents/skeptic-verifier-fast.md agents/integration-runner.md agents/repo-cartographer.md
git commit -m "feat(tiers): hold family aliases; record the first lock"

# 3. what two refutation rounds broke, with the pins written ahead of each fix
git add scripts/model-id.mjs scripts/check-dispatch.mjs tests/model-id.test.mjs tests/dispatch-alias.test.mjs tests/model-id-strict.test.mjs tests/alias-refutation.test.mjs tests/alias-refutation-2.test.mjs
git commit -m "fix(tiers): a receipt is a bare id; a downgrade is outside the lock"

# 4. the decision record, Proposed
git add docs/adr/0015-tiers-follow-the-latest-model.md docs/adr/README.md docs/adr/0007-mid-tier-opus.md
git commit -m "docs(adr): 0015 tiers follow the latest model, proposed"

# 5. the documents that named a model or described an exact pin
git add skills/judgment-dispatch/SKILL.md skills/orchestrate/SKILL.md AGENTS.md docs/DEVELOPMENT.md docs/DECISIONS.md docs/STATUS.md docs/SYSTEM.md docs/harvest/HARVEST.md
git commit -m "docs: alias tiers, the lock, and the dispatch outcomes"

# 6. this brief and the eight learnings
git add docs/handoff docs/learnings
git commit -m "docs: session-close handoff and eight learnings"
```

Left to the operator and not in the block: the plan and its two verdict logs
under `docs/plans/`, the spec under `docs/specs/`, and the push.

Then, in order:

1. **Fix what round 3 found**, test-first, as one task:
   - **A repeated `--date` or `--run` makes `tier-lock` take the stray value as
     the lock path.** It then reads no lock and prints a lowered one at exit 0.
     Reproduced by the session:
     `node scripts/tier-lock.mjs old.jsonl --date 2026-10-01 --run wf --run wf2`
     with one receipt answering `claude-fable-5` against a lock at
     `claude-fable-5-1`. This is the one real hole. Reject a repeated flag and
     more than two positionals.
   - `tier-lock` prints a stack trace when the reader closes the pipe early
     (an unhandled `EPIPE` on stdout). No lock is lost.
   - When a run has both a violation and an unreadable lock file,
     `check-dispatch` prints only the violation. It is fail-closed; the lock
     problem stays hidden until the next run.
   - `skills/orchestrate/SKILL.md` says a move is reported "after a run with no
     violation". The code prints it only at exit 0, so an unevaluable record
     also suppresses it.
   - `skills/judgment-dispatch/SKILL.md` states the bare-id rule without saying
     it applies to alias receipts that are not logged as a downgrade.
   - Two guards in `check-dispatch` (the lock is an object; the lock problem is
     reported) have no test that fails without them.
2. **Restart the session and run Task 8.** It dispatches five agents and its
   fan-out lint is red by design, so it needs the operator's go.
3. **Write closure records for two misfires found on this run**, by the
   `learn-from-misfire` loop: `execute-plan`'s derived green halted a good wave;
   `check-tier-placement` warns on the text `agent()` inside a string. Both are
   in the learnings ledger; neither is fixed. This was the first real plan
   `execute-plan` has run, so its STATUS row ("0 domains") is a candidate for
   one domain, which is the operator's to record.
4. **The judgment tier answers.** The blocker of the 2026-09-21 brief — no
   judgment-tier credits — did not hold on 2026-09-29: the three verdict logs
   of that day carry 17 judgment-tier records. The refreshed round that gates
   this branch's merge is still unwritten; the held script in `docs/plans/` is
   stale.
5. **Decide the branch.** The alias work sits on a branch named for a
   `git-guard` fix, 23 commits ahead of `main` before the six above.

**Standing caveats.**

- That an alias resolves to the newest model is the harness's property. Its
  documentation says an alias can resolve to an older model. The lock records
  what answered; nothing here checks that it is the newest.
- Every receipt is the answering agent's own report of its model id.
- Outside this repository and not part of this brief's claims: a design for a
  personal skill for working in public repositories was written the same day
  and awaits the operator's review.
