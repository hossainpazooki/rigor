# verify-the-effect — independent domain #2 (CLUE in-sample F1)

2026-06-27 · `verify-the-effect` / `check-effect-probe` · helped · genomics
label-error ML (CLUE) · **Independent domain #2 — a different action type
(model/eval rollout, not a service deploy).** The IMPROVE step
`tune_decision_threshold()` (`clue/loop.py:88-112`) picks the threshold that
maximises F1 **and reports that maximum on the very cohort it tuned on** — an
in-sample number that took selection on the data it is then scored against (the
repo's own documented gap #2). The non-vacuity move classifies that reported F1 as
a *vacuous-probe* result: it cannot discriminate generalization from in-sample fit.
The discriminating control already exists in the repo — `select_threshold_holdout()`
(`loop.py:115-144`) applies a threshold chosen on a disjoint `tune_cohort` to a
held-out `measure_cohort`; `check-effect-probe.mjs` **credits** that record (probe
passed, control failed) and flags the in-sample one. Honest framing — convergence,
not novel discovery: CLUE independently arrived at the same negative-control
discipline and even labels the residual *shared-generator-structure* optimism as
gap #1 (the oracle-gap — move 6). An independent methodology landing on a known real
defect validates the lens; it does not get full credit for finding it. Confirmed
from `loop.py` source.
