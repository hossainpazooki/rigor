# fanout-build — second independent domain (CLDD selective-labels harness)

2026-07-01 · `fanout-build` · helped · credit-risk ML / causal inference
(closed-loop-default-detection — Python/scikit-learn, a domain independent of VANTAGE's
Scala/Spark) · **Second independent domain** for `fanout-build`, run end-to-end to land three
recon-surfaced fixes (portable fidelity data dir / honest marginal labeling / dev-dep Python
floor): Spike -> Contract -> Scaffold -> Build(4 disjoint-file agents) -> Integrate(orchestrator
re-ran the real gate) -> Verify(3 `skeptic-verifier`s, one per claim).

**The spike changed a fix before any code shipped.** Probing item 5 (a py-version mismatch)
showed CI's compat job already tests Python 3.10–3.13 via the *range* install, so
`requires-python>=3.10` is correct and must NOT be bumped; the honest fix moved to documenting the
pinned set's >=3.11 floor in `requirements-dev.txt`. Spiking first prevented an over-restrictive
"fix" that would have broken the 3.10 job — the halt-gate discipline paying off before fan-out.

**Scaffold-gate-before-fan-out held.** The orchestrator wrote the load-bearing central file
(`fidelity.py`) + `requirements-dev.txt` himself and ran the real gate to green (90 passed, seed-42
g-comp byte-exact) BEFORE fanning out, so the 4 build agents coded against a verified base, not a
stub. Disjoint ownership held exactly: 6 files touched, each by its owner, `fidelity.py` carried
only the scaffold change, **zero cross-file drift**.

**Integrate = orchestrator re-ran the named gate himself (`orchestrate` #8), not the agents' word:**
full `pytest` 92 passed / 0 failed (independently reproduced — 92 dots / 0 F-E), `check_fidelity.py`
-> `MARGINAL FIDELITY GATE PASSED`, and seed-42 g-comp reproduced the committed artifact to 10
decimals — confirming the edits did not perturb determinism.

**Verify was clean — a contrast with VANTAGE.** The 3 skeptics (portable-data-dir / marginal-label
/ py-version) each tried hard to refute and **all three SURVIVED**; unlike VANTAGE (2/4 false
refutations), this run had no false refutation to catch. The C2 skeptic did surface one real
cosmetic leak (`run_fidelity_gate` docstring "full fidelity report"), fixed to "complete
marginal-fidelity report". So the pipeline demonstrated it runs end-to-end and emits honest
survivors, but it did NOT stress the orchestrator-as-terminal-skeptic mechanism the way VANTAGE did.

**07-02 follow-up — real CI logs closed the loop and carried the load-bearing lesson.** After the
build, the maintainer surfaced last-week CI failures (both matrices red while local was 92/92 — the
"machine-specific green" the recon had flagged). Two PRE-EXISTING, mis-classified tests, neither in
the files this change touched: (a) compat/range matrix — `test_exploration_stabilizes_blind_spot_bias`,
a float-output-dependent scientific effect whose sign REVERSES across the dependency stack (seed 42:
+0.0996->+0.0210 under the pins vs 0.1364->0.1526 under the py3.10 range stack, bit-identical across
all 3 OSes), left unmarked so the `-m "not pinned"` matrix ran it where the effect isn't present;
(b) pinned-repro — `test_default_built_list_frozen_values`, off by ~1 ULP (1.4e-17) under the SAME
pinned sklearn, because pinning *versions* does not pin the BLAS/CPU. Diagnosed by local rerun + a
6-seed sweep (direction 6/6 robust under the pins; the `<half` threshold 5/6 fragile). Fixed by
CORRECTING CLASSIFICATION, not weakening the science: mark the version-sensitive test
`@pytest.mark.pinned` + scope its docstring; frozen-literal `==` -> `pytest.approx(abs=1e-12, rel=0)`
(still ~12-digit reproducibility, ~10^5x the observed drift). Full suite re-verified green.
**Lesson: pinning versions is not pinning determinism** — the "byte-deterministic per seed" invariant
holds *within* one environment; across machines it is ~12 digits (frozen floats) or direction-only
(scientific effects), and the suite now classifies each assertion accordingly.

**Cross-ref — a `skeptic-verifier` false refutation this session:** the §3 g-comp headline was
declared non-reproducing by a skeptic that had run `run_seed_sweep.py --quick` (reduced config)
against the full-config artifact; the orchestrator caught it by re-running
`run_counterfactual_eval(seed=42)` by hand and matching the committed rows to 10 decimals — the same
skeptic-false-positive theme as `skeptic-verifier-vantage-false-refutation_06-28-2026` and
`recon-orchestrate-transient-api-resilience_06-30-2026`.

**Caveats (honest):** same Claude/rigor operator as all prior domains — a second independent *domain*,
not a second independent *author*. The CLDD change was smaller and more mechanical than VANTAGE's
greenfield build, and its verify stage found no false refutation to catch, so it is weaker
adversarial evidence for the orchestrator-as-skeptic payoff even as it is clean end-to-end evidence
for the pipeline. The 2 new portability tests require the private Intuit dataset, so "92 passed" is
machine-specific (they skip where the data is absent); CI-green rests on the marker/tolerance fixes,
not re-run by the evaluator on the actual py3.10 range stack. Git discipline held throughout — no
commits or pushes by the agent; commit commands emitted for the human.
