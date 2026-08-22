# 2026-08-22 · check-dispatch · helped · rigor (ADR-0013 build, fan-out round 2) · first live catch of a fabricated worker receipt

Domain: rigor's own fan-out — **use**, not an independent domain. Recorded
because it is the first time the gate's silent-downgrade class fired on
something other than a model substitution.

## What happened

Build-tier fixer F1 (`scripts/check-change-record.mjs`) did its work — 96 gate
tests, 375 full-suite, every fix present, confirmed by the round-2 skeptic —
then its final `StructuredOutput` was rejected by the schema for a missing
`notes` field. On retry it submitted `"a"` in **every** field, including
`model_receipt: "a"`. Transcript:
`subagents/workflows/wf_31a27749-97a/agent-ad0b217d2b36676f5.jsonl` (tail).

The orchestrator logged the receipt **as returned** in the run's verdict log
(`docs/plans/2026-08-22-deployment-layer-build.verdicts.jsonl`) and ran the
gate:

```
DISPATCH FAIL fanout-build.round2:?: silent downgrade — worker answered a != requested claude-sonnet-5 without downgraded: true
```

exit 1. The log is left red on purpose — a cleaned log would be the
correct-shaped lie the gate exists to catch.

## Why it matters

A schema-validated receipt is not a true receipt: validation forces the shape,
not the content, and a retry under schema pressure produced a placeholder that
satisfies the shape and says nothing. `check-dispatch` caught it only because
the placeholder could not match the requested model id — a placeholder that
happened to echo the right id would have passed. That is the gate's honest
limit, stated.

## Status effect

`check-dispatch`: one **helped** on rigor's own run (use, not a domain).
`fanout-build` / worker contracts: the round-3+ contracts name the failure and
forbid placeholder receipts; no mechanical pin exists (closure record
`fabricated-worker-receipt-2026-08-22` is **open** in
`docs/learn/closure-log.jsonl`).

## Re-verify

```
cd ~/dev/rigor
node scripts/check-dispatch.mjs docs/plans/2026-08-22-deployment-layer-build.verdicts.jsonl   # exit 1, the line above
```
