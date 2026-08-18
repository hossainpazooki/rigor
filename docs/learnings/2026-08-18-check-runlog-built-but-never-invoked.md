ts: 2026-08-18T14:43:57Z
commit: 6565f02
session: 62dcb1b1-ede9-4f82-8ed0-1f55032173d3 (pick-up)
status: verified

fact: `check-runlog` was built 2026-07-22 to gate effort run logs, and **no
writer invokes it**. `commands/fanout-loop.md` step 5 says append the run to
`run-log.jsonl`; step 4's exit-gate list names `check-dispatch` and the target
repo's gates, not this one. The gate therefore runs only when a human remembers
it. Consequence, found live: the payment-loop instantiation's first entry
(2026-08-13) invented its own field dialect — `cap_tokens`/`spent_tokens` for
`budget.cap`/`budget.spent_subagent_tokens`, an object where
`gates_rerun_by_orchestrator` must be an array, and no `re-verify` pointer at
all — and sat RED through its own commit, unnoticed. backlog-settlement passes
only because its entries were hand-written by sessions that knew the dialect.
Mechanizing a check and mechanizing its *invocation* are two separate pieces of
work; ADR-0004's exit did only the first.

basis:
```
$ node scripts/check-runlog.mjs docs/efforts/payment-loop-randomized/run-log.jsonl
RUNLOG FAIL run 1: missing or malformed: budget.cap, budget.spent_subagent_tokens, gates_rerun_by_orchestrator
RUNLOG FAIL run 1: re-verify pointer missing or empty (re-verify / legacy reverify)
(exit 1)

$ grep -rn "check-runlog" commands/
(no match in commands/)

# and the run's own record confirms which gates it did re-run:
# gates_rerun_by_orchestrator: check-dispatch, check-tier-placement,
#   the target repo's go gate, the randomized driver — check-runlog absent.
```

re-verify: node scripts/check-runlog.mjs docs/efforts/payment-loop-randomized/run-log.jsonl; grep -rn "check-runlog" commands/
