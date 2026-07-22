# 2026-07-22 — check-tier-placement + worker receipts: ADR-0006 criterion 2 pointer entry (VANTAGE Gate B)

ts: 2026-07-22T18:51:25Z · rigor HEAD at write: `e78e902` · session `10d1e5e1` (fanout-loop
run 4, step c). This is the rigor-side pointer entry the 2026-07-18 VANTAGE session
(`bd25871e`) could not write — the seed brief's evidence-routing rule requires FEEDBACK
entries to be written from a rigor session. Source artifacts: VANTAGE
`scripts/gate_b_refute_workflow.mjs`, workflow run `wf_b9a4cbdb-895`,
dispatch log `~/dev/vantage-data/gate-b/dispatch-log.json`.

## The firing (recorded 07-18 from the VANTAGE session; gate re-runs performed here, today)

The VANTAGE Gate B skeptic fan-out (5 workers) ran with tiers sourced from rigor's
`config/models.json` via `args.tiers`, expression pins `model: tiers[c.tier]` on every
call, `check-tier-placement` clean pre-run. Every worker's `model_self_report` receipt
named its PINNED tier: 2 judgment workers answered `claude-fable-5`, 3 build/cheap
workers answered `claude-sonnet-5` — the pinned tier, not the session model. No silent
tier collapse. **Criterion 2 of ADR-0006 answered YES.**

## Gate re-runs by this session (not consulted, re-executed 2026-07-22)

- `node scripts/check-dispatch.mjs ~/dev/vantage-data/gate-b/dispatch-log.json` →
  `dispatch: clean (10 records)` — at rigor `e78e902`, i.e. through the NEW
  `receiptMatches` normalization, doubling as a live regression pass on a real log.

## Caveats, restated not hidden

- At firing time `build == cheap == claude-sonnet-5`, so the build-vs-cheap distinction
  was NOT independently observable; only the fable-vs-sonnet split was. The 2026-07-22
  mid tier (ADR-0007, `claude-opus-4-8`) makes the ladder three-way observable in future
  receipts.
- Same operator across the VANTAGE and rigor sessions.
- Credit: 1 independent domain for `check-tier-placement` + the worker-receipt class
  (VANTAGE is not this gate's extraction origin — that was the tic collapse script,
  rigor's own fixture, which counts as use). Still provisional (1 of ≥2).
