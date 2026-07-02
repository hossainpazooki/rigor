# Feedback log (provisional → settled)

Each entry records a time a rigor component **helped** or **misfired**, and in
**what domain**. A component is promoted from `provisional` to `settled` after it
survives **≥2 independent domains** here. "Independent" means a different repo /
problem domain — exercising a component against rigor's own files counts as use,
but not as an independent domain.

Format: `<date> · <component> · <helped|misfired> · <domain> · <one-line note>`

## Promotion ledger

| Component | Independent domains survived | Status |
|---|---|---|
| `refute` | 2 (payments/regulatory, credit-risk ML) | **settled** — demonstrated for numeric provenance + citation fidelity; reach over semantic/design/omission defects **unproven** (see 2026-06-27) |
| `implemented-vs-planned` | 1 (point-in-time lakehouse — VANTAGE) | provisional — first independent domain; final summary flagged the `main()` stub + CI-defined-not-run + Databricks-configured-not-deployed without overclaim; flagged gap since closed end-to-end & re-verified green (see 2026-06-28 + follow-up) |
| `fanout-recon-synthesize` | 1 (genomics label-error ML + Go service — upstream-label-correction); 2nd domain (credit-risk ML — CLDD) attempted 2026-06-30 but **crashed mid-run on transient API errors**, so not yet a clean 2nd | provisional — **first independent-domain run** caught 4 non-numeric defects (semantic / logic / mechanism), closing the 2026-06-27 gap (b); orchestrator reproduced the headline F1 0.9143; cracks are run-reported (file:line cited), not re-read this session (see 2026-06-28). **Infra-resilience gap** surfaced 2026-06-30: no retry/coverage-guard for mid-workflow API connection errors (see entry) |
| `gate-discipline` | 0 | provisional |
| `verify-the-effect` | 1 strong (digital-asset API decoder) + 1 convergent detector (CLUE) + 1 convergent builder (VANTAGE) — all same-author, no live end-to-end probe | provisional — short of `refute`'s standard until a live end-to-end probe (see 2026-06-27, 2026-06-28) |
| `effect-prober` | 3 non-vacuous, self-verified (treasury Go authorization-gate / correct-shaped-lies determinism / upstream-label-correction mislabel-ML) — all machine-gated `effect-probe: clean` | **settled (scoped)** — proven for constructing a discriminating probe + a non-vacuous negative control across ≥2 independent domains (same scoped-settled model as `refute`/`skeptic-verifier`). **UNPROVEN reach:** an independent (non-self-consistent) oracle, and probing the *aftermath of a genuine live irreversible action* — the same open gap tracked under `verify-the-effect`; ULC's independent precisionFDA oracle skips here (data withheld) (see 2026-07-01) |
| `check-effect-probe` | 3 (treasury / correct-shaped-lies / upstream-label-correction — `effect-probe: clean` on all 3, 2026-07-01) + 2 earlier same-session | provisional — credited only non-vacuous probes; every 2026-07-01 control genuinely discriminated (distinct-key→2 events, perturbed-seed→hash mismatch, clean-labels→0 flags) (see 2026-07-01) |
| `skeptic-verifier` | 2 (payments/regulatory, credit-risk ML) | **settled** — every prior logged win was a numeric recompute (same scope caveat as `refute`); VANTAGE (2026-06-28) is a **misfire** — default-refute skeptics returned 2/4 false refutations, caught only by orchestrator re-run |
| `integration-runner` | 1 (point-in-time lakehouse — VANTAGE) | provisional — ran the real `sbt` gate to green and fixed 5 cross-file drifts without weakening any assertion (see 2026-06-28) |
| `orchestrate` | 1 (point-in-time lakehouse — VANTAGE) | provisional — guardrail #8 (re-run ≥1 load-bearing check yourself) caught 2 false refutations the fan-out missed (see 2026-06-28) |
| `/verify-claim`, `/honesty-check`, `/recon`, `/handoff`, `/fanout`, `/verify-effect` | 0 | provisional |
| `git-guard`, `session-start` | 0 | provisional |
| `fanout-build` | 2 (VANTAGE lakehouse — Scala/Spark; CLDD selective-labels harness — Python/sklearn) | **settled (scoped)** — 2 independent domains end-to-end. VANTAGE (2026-06-28): orchestrator-as-skeptic caught 2/4 false refutations; run 2 closed gaps, 29 green. CLDD (2026-07-01): items 1/3/5, spike corrected a fix pre-fan-out, disjoint ownership held, gate re-run by orchestrator (92 green), 3 skeptics all SURVIVED (no false refutation to catch — cleaner but **less adversarial stress**); 07-02 real-CI follow-up fixed 2 pre-existing float-determinism mis-classifications ("pinning versions ≠ pinning determinism"). **Scope caveat:** same operator both domains; CLDD was smaller/mechanical with an unstressed verify (see 2026-07-01) |
| `check-fanout` | 0 | provisional |
| `check-citation-fidelity` | 0 | provisional — verified for identifier/quote fidelity; **insufficient for numeric provenance** (see 2026-06-26 misfire) |

## Entries

Individual feedback entries now live as dated markdown files in this folder —
`docs/feedback/<topic>_MM-DD-YYYY.md`. This file keeps only the promotion-ledger
summary above; open the dated files for the full record behind each row.
