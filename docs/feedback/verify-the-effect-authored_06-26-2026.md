# verify-the-effect — authored from three deploy/release repos

2026-06-26 · `verify-the-effect` · authored (not yet exercised) · derived from mining
three deploy/release repos (a k8s+Terraform infra repo, a FastAPI app repo, and an
ML reproducibility repo). Three convergent disciplines grounded the skill: (1) an
action's success report ≠ its effect — all three close a transition with a probe of
the live state (health-gate + auto-rollback; a layered post-deploy smoke script; a
transfer-validation + verdict/evidence cross-check), not the apply log; (2) the
shipped artifact is pinned and immutable end-to-end (immutable registry tags,
commit/digest-addressed images, pinned base images + a seeded PRNG); (3) "validated"
is labeled by what it was validated against (self-consistent vs. independent oracle).
**Honesty caveat:** the three repos share one author in adjacent domains, so the
convergence is real but *correlated, not independent* — closer to one engineer's
consistent habit observed thrice than three teams discovering the same law. Author
status only; **0 independent domains** until it runs against a repo it did not come
from. The skill composes `refute` (probe, don't trust the report), `gate-discipline`
(ordered gates, re-run not remembered), and `implemented-vs-planned` (the
validated-against axis).
