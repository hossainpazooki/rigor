---
description: Execute ONE iteration of an effort's fan-out loop — pick-up, derive the run, dispatch a tier-laddered pipeline, gate the receipts, write the ledgers, emit commit commands. Recurrence belongs to the host loop, never to this command.
status: provisional
---

Execute one iteration of the fan-out loop for the effort at the path below
(a directory containing `STATE.md` and `run-log.jsonl`). Apply the seven
steps in order; halting early is a recorded outcome, not a failure.

1. **Enter via pick-up.** Refute the effort's STATE.md before trusting it.
   `paused: true` halts fail-closed before any dispatch.
2. **Derive this run.** Pop the next entry from STATE.md's `## Run queue` if
   one exists; otherwise derive a sweep item list from the effort's backlog.
   No real candidate ⇒ record an honest dry pass — never invent an item to
   feed the loop.
3. **Dispatch as one Workflow script** (`orchestrate` guardrails):
   `pipeline(item → evidence-gather [build tier] → primary skeptic
   [judgment tier] → extra votes [mid tier])`, tiers sourced from
   `config/models.json` via `args`; run `check-tier-placement` on the
   script before launch. Budget: ≤150k subagent tokens per iteration (L1);
   anything larger halts and asks the operator.
4. **Exit gates, re-run by the orchestrator.** `check-dispatch` clean on the
   per-run verdict log (`<effort>/runs/run-N-verdicts.jsonl`), and the
   target repos' own gates for any status move — logs index candidates;
   only a gate re-run moves a status.
5. **Ledger writes.** Append the run to `run-log.jsonl` (the first entry
   this loop writes records the standing L1 authorization and the
   instantiation's total token ceiling); refresh STATE.md through
   `implemented-vs-planned`; write dated feedback entries for real firings.
6. **Emit commit commands** for the operator. Never write git history.
7. **Terminate or continue.** End the loop (tell the host loop to stop) on:
   two consecutive dry passes, the instantiation's total ceiling, or
   `paused: true`. A dry pass is a logged run, not a silent skip.

Credit boundary: a dispatch adjudicating a claim in a target repo may credit
that repo as an independent domain; a dispatch about the effort's own
bookkeeping is use only. The workflow's self-reported success is a claim —
re-run the load-bearing checks yourself.

Effort: $ARGUMENTS
