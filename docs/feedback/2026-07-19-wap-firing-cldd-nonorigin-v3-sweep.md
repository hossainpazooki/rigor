# 2026-07-19 — WAP-shaped publish firing at CLDD v3 sweep (non-origin): criterion 1 verdict = CLARIFIED

ts: 2026-07-19T17:45:21Z · rigor HEAD at write: `ba58192` · CLDD HEAD at write: `9996832`
(v3 core commits landed by operator) · session `0e090857` (orchestrated end-to-end from this
rigor session). Target-repo record: `closed-loop-default-detection/docs/superpowers/specs/2026-07-19-wap-firing-evidence.md`;
spec with dated amendments: `.../specs/2026-07-14-cldd-v3-design.md` (Rev 2.1 + 2.2).

## The firing (ADR-0005 resolution 3, all three parts, at a genuinely non-origin boundary)

CLDD is a Python/sklearn selective-labels research harness — no shared machinery with
VANTAGE, the data-eng skills' extraction source. The publish boundary: the v3 450-run sweep
artifact (`artifacts/feedback_profit_sweep.csv`, 5400 rows) plus the README/CHANGELOG numbers
that recompute from it; the operator's commit is the atomic promotion step.

1. **Audit green on candidate** — `feedback_sweep_stats.py` exit 0: 450/450 runs, H4 integrity
   identity max_abs_error 1e-10 (one round(10) ulp) on all 900 checked rows, H1 CONFIRMED
   (median −0.0028, 24/25, Holm p 2.3e-06, clears the pre-registered noise floor), H2/H3
   honestly NOT confirmed (H2 measured opposite in direction, +0.0119, 0/25 — reported as
   measured).
2. **Same audit demonstrably red on a mutated twin** — +0.001 planted on 11 frozen-arm
   eps.05/sev0.4 rows in a twin CSV → H4 FAIL at exactly 0.0010000000, at exactly the planted
   severity, other severities PASS, exit 1, "publication BLOCKED" — a leak-shaped mutation
   caught at leak precision. Twin never touched the real artifact.
3. **Consumer-path probe + negative control** — the consumer command (stats recompute from the
   artifact) passes with the published numbers; against the effect-absent state it exits 1
   (FileNotFoundError). `check-effect-probe.mjs` on both records: **clean**.

**Seen red on real defects, not only on the staged twin** — the strongest part of the record:
- The **pilot gate** (6 runs) went red on its first firing: H4 broke at 2e-4 because decision-5
  day-90 imputation made book P&L non-additive across slices — a genuine spec-internal
  contradiction, fixed by cohort-basis pricing (spec Rev 2.1), tolerance untouched.
- The **full-matrix gate** then went red where the pilot had passed by 12-row cancellation
  luck: stored round(4) values quantized the identity below its own 1e-6 tolerance. Proven
  quantization (error distribution {0 × 626, exactly-1e-4 × 199}; raw in-process identity
  1.04e-17 at a fresh seed) and fixed by raising artifact precision to round(10) on the
  identity-bearing columns (Rev 2.2). **Tolerance was never loosened in either fix.**

## Criterion 1 verdict: CLARIFIED

The WAP framing named the work correctly and changed behavior: write = shard staging invisible
to the artifact; audit = the gate stack with the *seen-red* obligation; publish = atomic
promotion of artifact + recomputable numbers. The framing's load-bearing claim — real-world
WAP supplies the audit **slot**, rigor supplies the **conscience** — was operative twice: a
producer-authored, green-only audit (the pattern in the fetched AWS/dbt references) would have
shipped both real defects silently. One honest nuance, recorded not hidden: in a research repo
the "consumer-visible publish" is the operator's git commit, so the post-publish probe ran on
the staged artifact with the commit as the final atomic step — the mapping's Publish row fits
imperfectly there, and the bridge doc says so.

## What this moves

- **ADR-0005 criterion 1: satisfied** → framing **Settled (scoped)** per the operator's
  2026-07-19 two-domain directive (VANTAGE origin exemplar + this firing); bridge doc earned.
- **`data-quality-fail-closed`: first non-origin domain** (three-outcome fail-closed audit at
  a publish boundary: pass / fail-blocks-publication / unevaluable-halts on the absent
  artifact). 1 of the ≥2 promotion needs — still provisional.
- **`check-effect-probe`**: another non-vacuous probe/control pair, machine-gated clean.
- NOT moved: `no-lookahead`, `idempotent-restatement`, `lineage-replay` (did not fire here);
  promotion rules untouched throughout.
- Standing caveat on everything above: same operator across both domains.
