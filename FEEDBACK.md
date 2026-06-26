# Feedback log (provisional → settled)

Each entry records a time a rigor component **helped** or **misfired**, and in
**what domain**. A component is promoted from `provisional` to `settled` after it
survives **≥2 independent domains** here. "Independent" means a different repo /
problem domain — exercising a component against rigor's own files counts as use,
but not as an independent domain.

Format: `<date> · <component> · <helped|misfired> · <domain> · <one-line note>`

## Entries

- 2026-06-25 · `fanout-recon-synthesize` · helped · rigor's own Phase-1 spine
  (self-audit) · ran end-to-end — 5 disjoint recon dimensions fanned out under one
  shared findings schema, each finding refuted by an independent `skeptic-verifier`,
  survivors synthesized. Proves the loop executes; **n=1 and same-repo**, so still
  provisional until it survives an independent domain.

- 2026-06-26 · `refute` · helped · payments/regulatory compliance (ATLAS
  regulatory-rule-engine) · ran the refute spine by hand against a payments-compliance
  brief, in a domain INDEPENDENT of rigor's own repo. Recompute + dispatch caught a
  fabricated citation and several regulatory overstatements before they were written
  down. **First independent domain** for `refute` (n=1 outside rigor's own files).

- 2026-06-26 · `skeptic-verifier` · helped · payments/regulatory compliance (ATLAS
  regulatory-rule-engine) · skeptics dispatched by that same refute pass refuted the
  regulatory overstatements — load-bearing for refute's dispatch move. **First
  independent domain** for `skeptic-verifier`.

- 2026-06-26 · `refute` · misfired (by omission) · payments/regulatory compliance
  (ATLAS regulatory-rule-engine) · the same pass surfaced two gaps now being fixed.
  **GAP 1 (citation fidelity):** no move caught a claim citing a source that does not
  actually contain the named identifier/quote — a fabricated or drifted citation slips
  through unless someone reads the source by hand. **GAP 2 (dispatch ≠ discharge):**
  refute's dispatch move read as if spawning skeptics discharges the duty, yet the
  fabricated citation was caught only by the orchestrator's own direct read of the
  source — the fan-out of skeptics collectively missed it. Fixes: new 4th move
  **Check citation fidelity** + `scripts/check-citation-fidelity.mjs`, and a
  dispatch-move cross-link to `orchestrate` guardrail #8 (independently re-execute at
  least one load-bearing check yourself).

- 2026-06-26 · `refute` · helped · credit-risk ML / causal inference
  (closed-loop-default-detection) · ran the full spine against the CLDD repo, a domain
  independent of both rigor's own files and the ATLAS regulatory work. Re-executed the
  gate (`pytest` → **90 passed / 0 failed**, byte-determinism confirmed in-process) and
  recomputed numbers from raw artifact CSVs. Caught two load-bearing defects in
  `SESSION_HANDOFF.md`: (a) the §7 g-computation numbers attributed to "Measured (seed
  42)" — `0.0734→0.0598 (+0.0135)` / `+0.0038` — reproduce from nothing; the raw
  `seed_sweep_25.csv` seed-42 rows are `0.0714→0.0635 (+0.0079)` / `+0.0017`, and the
  `+0.0135` is the 25-seed cross-seed mean mislabeled as a single seed; (b) the test
  count "66" is stale (suite is 90; README already says 90). **Second independent
  domain** for `refute`.

- 2026-06-26 · `skeptic-verifier` · helped · credit-risk ML / causal inference
  (closed-loop-default-detection) · the dispatched skeptic recomputed CL1–CL5 from the
  artifact CSVs and live `src/` runs, returned CL2 REFUTED with the exact seed-42 vs
  cross-seed-mean discrepancy (independently re-confirmed by the orchestrator from the
  raw CSV before being written here — `orchestrate` #8 in action), plus a "shrinks toward
  noise" overstatement (p=1.4e-4 at sev 1.0 is still significant). **Second independent
  domain** for `skeptic-verifier`.

## Promotion ledger

| Component | Independent domains survived | Status |
|---|---|---|
| `refute` | 2 (payments/regulatory, credit-risk ML) | **settled** |
| `implemented-vs-planned` | 0 | provisional |
| `fanout-recon-synthesize` | 0 (1 same-repo exercise) | provisional |
| `gate-discipline` | 0 | provisional |
| `skeptic-verifier` | 2 (payments/regulatory, credit-risk ML) | **settled** |
| `/verify-claim`, `/honesty-check`, `/recon`, `/handoff`, `/fanout` | 0 | provisional |
| `git-guard`, `session-start` | 0 | provisional |
| `fanout-build` | 0 | provisional |
| `orchestrate` | 0 | provisional |
| `check-fanout` | 0 | provisional |
