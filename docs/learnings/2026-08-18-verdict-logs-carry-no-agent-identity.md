ts: 2026-08-18T14:44:05Z
commit: 6565f02
session: 62dcb1b1-ede9-4f82-8ed0-1f55032173d3 (pick-up)
status: refuted-assumption

fact: No verdict record in any effort carries an `agentType`, and
`check-dispatch`'s record schema has no agent-identity field at all — it
validates tier and model receipts only. So the gate structurally cannot
distinguish "the named agent was dispatched" from "a generic workflow agent ran
with a `model:` pin." This refutes the backlog-settlement STATE.md queue item
claiming `judgment-dispatch` + `skeptic-verifier-fast` "FIRED in runs 4-6": the
tier routing fired, the named agent did not. The one committed workflow script
dispatches with `model: TIERS.x` and no `agentType`, while the canonical
`skills/fanout-build/example.mjs` does pin `agentType` on its verify stage — so
the shipped pattern is right and the executed runs diverged from it. Runs 4-6's
scripts were never committed, so for those the status is unverifiable from the
record rather than refuted; `docs/STATUS.md` independently says "never
dispatched". Blind spot of the same class as `check-learnings`' history-blind
append-only leg: a gate that passes vacuously on the question being asked of it.

basis:
```
$ grep -c "agentType" docs/efforts/*/runs/*.jsonl
docs/efforts/backlog-settlement/runs/run-4-verdicts.jsonl:0
docs/efforts/backlog-settlement/runs/run-5-verdicts.jsonl:0
docs/efforts/backlog-settlement/runs/run-6-verdicts.jsonl:0
docs/efforts/payment-loop-randomized/runs/run-1-verdicts.jsonl:0

$ grep -nE "phase: '(Refute|Vote)'" docs/efforts/payment-loop-randomized/runs/run-1-workflow.mjs
100:    { label: `refute:${c.key}`, phase: 'Refute', model: TIERS.judgment, schema: VERDICT_SCHEMA },
106:    { label: `vote:${r.claim.key}`, phase: 'Vote', model: TIERS.mid, schema: VERDICT_SCHEMA },

$ grep -nE "agentType|agent_type" scripts/check-dispatch.mjs
(none in the gate's schema)
```

re-verify: grep -c "agentType" docs/efforts/*/runs/*.jsonl; grep -nE "agentType|agent_type" scripts/check-dispatch.mjs
