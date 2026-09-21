---
name: execute-plan
description: Use when a written implementation plan (writing-plans format - Task N headings with Files and Interfaces blocks) is to be executed by agents — runs it wave by wave under orchestrate's guardrails: fresh implementer per task, spec + quality review per task with a bounded fix loop, an integration gate and a commit block per wave, whole-branch refutation at the end, and a ledger that survives compaction.
status: provisional
---

# Execute plan

A plan is a batch of claims about what to build; executing it is a batch of
claims about what was built. This shape keeps both honest: every task is
reviewed against its own brief before the next wave starts, every wave ends on
the real named gate, and the finished branch is refuted, not merely green.
It is `orchestrate`'s third shape, for work that already has a plan —
`fanout-build` is for a build with no plan yet.

## The loop (one invocation per wave)

1. **Intake.** `node scripts/plan-waves.mjs <plan.md>` prints the args:
   Global Constraints verbatim, each task's brief, Files, Interfaces and
   lifted Commit steps, and the waves. Exit 2 means the plan is not
   executable as written (no tasks, a task without Files, a placeholder
   path) — fix the plan; never guess a path. Waves come from the Files lists
   only: two tasks naming one file never share a wave. That is stricter than
   an import-aware derivation, never looser.
2. **Read the ledger.** `$(git rev-parse --git-path rigor)/execute/<plan-slug>.progress.jsonl`,
   one row per completed task. Tasks listed there are DONE — pass them as
   `completed` and never re-dispatch them; after a compaction, trust the
   ledger and `git log` over your own recollection.
3. **Dispatch one wave** through the Workflow tool with `example.mjs`
   (beside this file): tiers from `config/models.json`, `base` = the current
   HEAD, `gate` = the plan's test command (else the repo's merge floor),
   `final` = true on the last wave. Lint the script with `check-fanout` and
   `check-tier-placement` first; dry-run it with stubbed globals if you
   changed it.
4. **Per task, inside the run:** an implementer (build tier, fresh context,
   the brief as its requirements, Commit steps skipped) → a reviewer with two
   verdicts, spec compliance and code quality, told to treat the
   implementer's report as unverified and to verify it against the diff →
   at most **two** fix rounds. A third failing review halts the wave: a task
   that cannot pass its own brief three times is a plan defect, and the
   plan is the human's to amend. `BLOCKED` and `NEEDS_CONTEXT` halt the
   wave the same way, with the implementer's specifics in the result.
5. **Stakes route the reviewer.** Medium by default (`skeptic-verifier-fast`,
   mid tier). High when a task's files match the irreversibility markers —
   default pattern `migrat|deploy|release|helm|terraform|kube|workflows`,
   overridable via `high_stakes_pattern` — which routes the review to
   `skeptic-verifier` on the judgment tier, because `check-dispatch` fails
   closed on a high-stakes vote below it. Every review is a verdict record;
   every worker leaves a receipt.
6. **Integrate the wave.** `integration-runner` runs the named gate and
   returns verbatim tails; it fixes only cross-file drift between this
   wave's tasks and never weakens a test. Red halts.
7. **Emit the commit block.** Green ⇒ the run returns the wave's commit
   commands — the plan's own Commit steps, lifted — for the human to run.
   Agents never write history. Append one ledger row per task (`task`,
   `wave`, `status`, `review_rounds`, `minor_issues`, `commit_cmds`, `ts`),
   append the verdict records and receipts to
   `<plan-dir>/<plan-slug>.verdicts.jsonl`, and run
   `node scripts/check-dispatch.mjs <that log> config/models.json`. Then
   re-run the named gate yourself (`orchestrate` guardrail 8).
8. **Next wave** once the human has committed: new `base`, same ledger.
   On the last wave the run also refutes the plan's load-bearing claims
   (the Goal, each `Produces` interface) with judgment-tier skeptics;
   `claimTrue` needs a green gate and zero refuted or missing votes.

## What the reviewer reads

The task brief, the implementer's structured result (status, files changed,
the test command with its exit and tail, concerns, the report file), and the
diff against `base`. The implementer's test tail is evidence the reviewer
reads, not a claim it re-runs — the integration step and the orchestrator
re-run the gate. Minor issues are recorded on the task's row, never fixed
inline, and handed to the whole-branch skeptics. `cannot_verify` items are
the orchestrator's to resolve before marking the task complete.

## Halts are outcomes

A halted wave is a recorded result, not a failure of the shape: the return
names the task and the reason. Resume with `resumeFromRunId` after the human
answers; completed agents replay from cache. Never re-dispatch a task the
ledger marks complete.

## Honest limits

- Waves ignore imports; a plan whose tasks share files only through imports
  runs more sequentially than a hand derivation would — and the reverse: two
  tasks coupled only by import can land in one wave, so the reviewer and the
  wave's integration gate are what catch a consumer built against an
  interface that is not there yet.
- Per-task review is one reviewer at the mid tier for medium stakes — cheaper
  than a judgment-tier skeptic and unproven against it.
- Zero domains until a real plan runs through this shape (STATUS).
