# fanout-recon-synthesize (/recon) — first independent domain, non-numeric catches (upstream-label-correction)

2026-06-28 · `fanout-recon-synthesize` (`/recon`) · helped · genomics/proteomics label-error
ML + Go FSM service (upstream-label-correction) · **First independent-domain exercise** for
`/recon` (was 0 — prior only the same-repo self-audit, per 2026-06-27), and the run that
**closes requirement (b) of the 2026-06-27 scope entry: an independent-domain `/recon` that
catches NON-numeric defects.** Decomposed ~23 load-bearing claims into 4 disjoint clusters
(headline numbers / loop+detector impl / integrity hardening / architecture-migration), fanned
out 4 recon agents under one shared return contract, had each refute its own findings, then
synthesized — and the orchestrator independently re-ran the single most load-bearing number
rather than trust the agent. **Numeric (orchestrator-reproduced in-session):** F1 0.9143 from
its own `TransferValidationEval().evaluate('train')` run — score=0.9142857, precision 0.8421
(16/19), recall 1.0 (16/16), FP {Training_1,18,19}, FN 0; 8 proteomics + 8 rnaseq + 4 clinical
= 20 mislabels, 16 molecular positives; threshold fixed at 0.5 with no tune-on-test;
`evaluate('test')` abstains (`applicable=False`, labels absent). **Non-numeric catches (the
milestone — none inflate a number):** (1) "4-stage GENERATE→VERIFY→MEASURE→IMPROVE loop, built
and tested" — IMPROVE only regenerates and never imports/calls the fidelity gate; VERIFY is a
separate eval, not a loop stage (`clue/loop.py`) → *present-but-does-the-wrong-thing*; (2)
`dual_validate` documented HIGH/REVIEW/**PASS** — the PASS branch is **unreachable** (iterates
the union of flagged samples) (`core/cross_omics_matcher.py:210`) → *dead-code/logic*; (3) "one
of six evals" — actually 8 routes (7 sync + async robustness) (`README:267`) → *miscount*; (4)
fidelity's 2nd detector billed as an "MSE-residual linear model (imports sklearn
`LinearRegression`)" — fits no regression, it's raw mean-squared difference
(`evals/fidelity_gate.py`) → *mechanism-mislabel*. These are precisely the semantic / logic /
mechanism classes the 2026-06-27 entry said the spine had **never** caught. Git discipline held
(offered the doc fixes, declined to edit/commit). **Evidentiary basis (honest):** the F1 was
orchestrator-reproduced in-session; the four cracks are the **run's reported findings with
file:line cites, recorded here as the run reported them — not independently re-read by this
evaluating session** (recorded per direction). Same author/operator caveat. `/recon` stays
provisional (1 independent domain; needs ≥2 to settle).
