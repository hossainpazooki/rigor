# `execute-plan` — design

Date: 2026-09-15 · Status: design approved in-session on four operator
decisions (below); spec awaiting operator review before a plan is written ·
Session 44a40c81.

## Why

On 2026-09-14 the operator made `rigor:orchestrate` the mechanism for
multi-agent implementation work whenever rigor is loaded, in place of
superpowers' `subagent-driven-development` (SDD). `orchestrate` is a dispatch
policy (use the Workflow tool, under eleven guardrails); it does not perform
SDD's function. Read from SDD 6.0.2's source, that function is: take a written
plan, run a fresh implementer per task, review each task for spec compliance
and code quality, loop fixes until clean, review the whole branch at the end,
keep a progress ledger that survives compaction, and route implementer
statuses back to a controller. Of those, rigor has only the whole-branch check.
The 2026-09-15 scorecard addendum names the same five gaps: plan intake,
per-task review, a durable ledger, implementer statuses, and the plan's commit
steps.

## Operator decisions (locked 2026-09-15)

1. **A new shape, `execute-plan`**, beside `fanout-build` — skill + slash
   command + gated `example.mjs`; `orchestrate` lists it as the third shape.
   `fanout-build` stays the greenfield shape (spike → contract → scaffold).
2. **Task review by `skeptic-verifier-fast`** (mid tier) with a two-verdict
   schema; no new agent.
3. **Waves derived from the plan's Files lists** — tasks with disjoint files
   run in parallel, any shared file forces sequence.
4. **Commit commands emitted per wave**, after that wave's integration gate is
   green; agents never write history.

## What it is

A shipped skill (`skills/execute-plan/SKILL.md`), command
(`commands/execute-plan.md`), Workflow example (`skills/execute-plan/example.mjs`)
and one non-gate utility (`scripts/plan-waves.mjs`) that together execute a
`writing-plans`-format implementation plan under `orchestrate`'s guardrails.

Input: the path of a plan whose tasks follow the `writing-plans` structure —
`### Task N: <name>`, a **Files** block (`Create:` / `Modify:` / `Test:` paths),
an **Interfaces** block (`Consumes:` / `Produces:`), numbered steps, and a
**Global Constraints** section in the header. A plan whose header names SDD
routes here when rigor is loaded; that header is the operator's standing
preference, not a conflict to resolve per run.

## Pipeline

```
plan-waves (orchestrator, no agent)
  -> for each wave (sequential):
       parallel over tasks in the wave:
         implementer [build tier]  -> task reviewer [mid tier, judgment if high-stakes]
         -> fix loop (<= 2 rounds)  -> ledger row
       integration-runner on the plan's named gate [mid tier]
       -> emit the wave's commit commands (human runs them)
  -> whole-branch refutation: skeptic-verifier per load-bearing claim [judgment tier]
  -> verdict log linted by check-dispatch
```

### 1. Plan intake — `scripts/plan-waves.mjs`

Pure exported parser + CLI, house style (fs only at the CLI boundary):

- `parsePlan(markdown)` → `{ constraints, tasks: [{ n, name, files: { create,
  modify, test }, interfaces: { consumes, produces }, body, commits: [...] }] }`.
  `body` is the task's full text (the brief). `commits` are the `git commit`
  lines found in the task's steps, lifted out for later emission.
- `deriveWaves(tasks)` → `[[task n, ...], ...]`. Rule, in plan order: a task
  joins the wave after the latest wave holding an earlier task that names any
  file it names (any of create / modify / test); with no such task it joins
  wave 1. Two tasks sharing a file therefore never share a wave, and a task's
  wave is fixed by the tasks before it, so plan order is preserved within a
  wave. Deterministic;
  no import analysis (a documented limit — the operator's 2026-09-11 wave
  derivation for a real plan used import lines too; this utility uses Files
  only, which is stricter, never looser, because a file named in two tasks is
  the drift hazard whether or not one imports the other).
- CLI: `node scripts/plan-waves.mjs <plan.md>` prints the args JSON the
  example script consumes; exit 2 (UNEVALUABLE) when the file has no
  `### Task N:` headings, a task has no Files block, or a Files path is a
  placeholder (`exact/path/...`, `TBD`) — a plan that fails `writing-plans`'
  own no-placeholder rule is not executed on a guess.

The orchestrator runs this once, passes the output via `args` (a Workflow
script has no filesystem), and passes tiers from `config/models.json`.

### 2. Per task: implementer

One `agent()` per task on the **build tier**, fresh context. Prompt carries:
the shared contract (Global Constraints verbatim + this task's Interfaces +
the wave's file→owner map + "you own ONLY these files"), the task brief, the
report-file path, and the report contract. It runs the plan's steps except
**Commit** steps, which it must not run (git-guard refuses them anyway).

Schema: `{ status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT,
files_changed: [], tests: { cmd, exit, tail }, concerns, report_file, model }`.
`BLOCKED` / `NEEDS_CONTEXT` halt the wave after its other tasks finish and
return to the orchestrator with the specifics — human adjudication is the one
place `orchestrate` reserves a hand-run step. Resume with `resumeFromRunId`
once answered; completed tasks replay from cache. `tests.tail` is evidence the
reviewer reads, not a claim it re-runs (SDD's rule, kept).

### 3. Per task: reviewer and fix loop

`skeptic-verifier-fast` on the **mid tier** reads the brief, the report and a
diff package (`git diff BASE..` written to a file by the implementer's
`files_changed`; BASE is the tree at wave start). Prompt rule carried from SDD:
treat the implementer's report as unverified claims; verify against the diff;
never told what not to flag.

Schema: `{ spec: { verdict: PASS | FAIL, missing: [], extra: [] },
quality: { verdict: APPROVED | ISSUES, issues: [{ severity: critical |
important | minor, location, finding }] }, cannot_verify: [], model }`.

Stakes per task follow `judgment-dispatch`'s rubric: **medium** by default
(`downstream-decisions`); **high** when any task file matches an
irreversibility marker (migrations, deploy manifests, release configs —
the list lives in the skill, not the script), in which case the reviewer is
`skeptic-verifier` on the **judgment tier**, because `check-dispatch` fails
closed on a high-stakes vote below it. Every review appends a verdict record;
every worker appends a receipt.

Fix loop: a `FAIL` spec verdict or any critical / important issue dispatches
one fix agent (build tier) with the complete findings list, then a re-review.
At most **two** rounds; a third failure halts the wave to the orchestrator
(SDD loops until clean; rigor's `learn-from-misfire` reading is that a task
failing three reviews is a plan defect, not an implementer defect). Minor
issues are recorded in the ledger row, never fixed inline, and handed to the
whole-branch skeptics. `cannot_verify` items are the orchestrator's to resolve
before the task is marked complete, as in SDD.

### 4. Per wave: integration gate and commit emission

After a wave's tasks pass review, `integration-runner` (mid tier) runs the
plan's named gate (the test command from Global Constraints, else the repo's
`AGENTS.md` merge floor) and returns verbatim tails. Red halts; the runner may
fix only cross-file drift between this wave's tasks, never weaken a test.

Green ⇒ the orchestrator emits the wave's commit block for the human: one
commit per task, subjects taken from the plan's lifted Commit steps, paths from
`files_changed`. The ledger row records the emitted commands; after the human
runs them the next wave's BASE is the new HEAD. (Decision 4 — a long run never
leaves the whole tree uncommitted, and the ledger can name commits.)

Because a Workflow run cannot pause for the human, **one invocation of the
example script executes one wave** (the `fanout-loop` precedent: command =
iteration, the orchestrator = cadence). The orchestrator runs waves in
sequence, emitting each wave's commit block before launching the next with the
new HEAD as `base`; the whole-branch refutation runs in the invocation that
executes the last wave.

### 5. Whole branch: refutation

After the last wave, `skeptic-verifier`s on the **judgment tier** refute the
plan's load-bearing claims — the Goal line, each `Produces` interface, and any
claim the orchestrator adds — by re-execution, one skeptic per claim
(`fanout-build` step 6 verbatim). The orchestrator re-runs the named gate
itself (guardrail 8). `claimTrue` requires green integration and zero refuted
or missing votes.

### 6. Ledger and recovery

`$(git rev-parse --git-path rigor)/execute/<plan-slug>.progress.jsonl` —
untracked, survives compaction and session loss, the same location class SDD
uses (`.git/sdd/progress.md`). One row per task: `{ task, wave, status,
review_rounds, minor_issues, commit_cmds, ts }`. At skill start the
orchestrator reads it; tasks marked complete are not re-dispatched (the SDD
rule, kept; "re-dispatched a completed sequence after compaction" is SDD's
own most expensive observed failure). The verdict log is tracked beside the
plan: `<plan-dir>/<plan-slug>.verdicts.jsonl`, linted by `check-dispatch`.

## Files

| Path | Owner of | Notes |
|---|---|---|
| `skills/execute-plan/SKILL.md` | the discipline: intake, statuses, review schema, stakes markers, halt rules, ledger | provisional; domain-neutral |
| `skills/execute-plan/example.mjs` | runnable Workflow shape, args-driven, tiers via args | gated by `check-fanout`, `check-tier-placement` |
| `commands/execute-plan.md` | `/rigor:execute-plan <plan-path>` | thin caller, `fanout.md` pattern |
| `scripts/plan-waves.mjs` | parser + wave derivation + CLI | non-gate utility, 3-outcome CLI |
| `tests/plan-waves.test.mjs` | parser/wave twins incl. placeholder refusal, shared-file sequencing, plan-order ties | red-first |
| `tests/tier-placement.test.mjs`, `tests/fanout-check.test.mjs` | +1 test each: the new example passes both gates | mirrors the fanout-build pins |
| `skills/orchestrate/SKILL.md` | shapes list gains `execute-plan` | one bullet |
| `AGENTS.md`, `docs/STATUS.md`, `docs/README.md`, `README.md`, `docs/SYSTEM.md` | counts → 21 skills / 10 commands / 13 scripts; STATUS row "provisional, 0 domains" | README and SYSTEM already say 8 commands against 9 shipped (stale since 2026-08-22) — corrected in the same change |

Not in scope: a new agent (decision 2); alias/hook work; changing
`writing-plans` (it stays the plan author); Codex portability (the shape runs
on the Workflow tool, like `fanout-build`).

## What is honest to claim on landing

Built and fixture-tested: parser, waves, gates on the example. **Zero domains**
until a real plan runs through it; the first candidate is the operator's own
next multi-task plan. Unproven until then: that per-task mid-tier review
catches what SDD's reviewer catches, that two fix rounds are enough, and the
cost per task against SDD (no SDD run on the same plan exists to compare).
Recorded as provisional in STATUS with those three gaps named.

## Testing

- `node --test` — new twins for `plan-waves` (a fixture plan with five tasks
  in three waves; a placeholder-path plan refused with exit 2; two tasks
  naming one test file forced sequential), plus the two example-gate pins.
- `node scripts/check-fanout.mjs skills/execute-plan/example.mjs` → 0.
- `node scripts/check-tier-placement.mjs skills/execute-plan/example.mjs` → 0.
- `node scripts/check-surface-scrub.mjs` → clean (new skill and command are
  inside the scanned roots automatically).
- Dry-run of `example.mjs` with stubbed runtime globals, per the
  2026-08-22 learning, before any live run.
