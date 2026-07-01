# effect-prober — three independent domains, non-vacuous (treasury / CSL / ULC)

2026-07-01 · `effect-prober` · helped · THREE independent domains (orchestrated
recon→fanout→synthesize, goal-driven) · exercised the effect-prober discipline
against three repos, each an independent problem domain, all EFFECT-CONFIRMED and
**non-vacuous** (`check-effect-probe` → `effect-probe: clean` on all three).
Each probe's negative control genuinely discriminated: **(A) treasury-intent-controller**
(Go authorization gate) — same idempotency key → 1 settlement (dedup fires) vs distinct
keys → 2 settlements (control: dedup does NOT fire, so not a refuse-everything artifact);
**(B) correct-shaped-lies** (adversarial code-gen) — sweep re-run byte-identical vs
perturbed seed → hash mismatch (control proves determinism isn't constant output); **(C)
upstream-label-correction** (genomics mislabel ML) — 9 flagged / recall 1.0 on 30%-injected
swaps vs 0 flags / passed=False on clean labels. All three probes **re-run by the
orchestrator directly** (not trusted from the fanout subagent) and reproduced to the digit
(ULC: f1 0.941, recall 1.0, precision 0.889, TP 8 / FP 1=S024). `orchestrate` #8 held:
fanout cited two treasury tests I hadn't seen in `-list` — I grep-confirmed
`TestIdempotencyCollision`/`TestTerminalSeparation` exist (acceptance_test.go:290,333),
no fabrication.
