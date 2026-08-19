ts: 2026-08-19T03:01:08Z
commit: f4bca72
session: 62dcb1b1-ede9-4f82-8ed0-1f55032173d3 (re-audit sweep + data-eng settlement)
status: refuted-assumption

fact: ADR-0012's drift-vs-rot rule ("upstream unmoved + value mismatch => rot")
is wrong when applied against a single global movement flag, and wrong in the
dangerous direction. A re-audit sweep tracks claims resting on different
surfaces (inputs / regenerator / world); if any one surface has moved and the
flag is global, a claim resting on a DIFFERENT surface gets excused as STALE
(drift, "merely expired") when it is actually INVALIDATED (rot, "wrong when
published"). Found live: the planted-drift twin moved the gold Delta table, and
`repo.pytest_passed` — a regenerator-surface claim with nothing to do with gold —
was reclassified from ROT to STALE. Movement must be resolved per surface
(inputs = content-addressed log identity; regenerator = git HEAD plus a dirty
flag, where a dirty tree counts as moved). Unknown movement must stay unknown,
never collapse to "unmoved", or the sweep invents retroactive invalidations.

basis:
```
$ cd ~/dev/parallax && .venv/Scripts/python.exe -m pytest tests/test_sweep.py \
    -k "regenerator_claim_is_not_excused or inputs_claim_still" -q
..                                                                       [100%]
2 passed, 22 deselected in 0.11s

# the two regression tests pin both directions:
#   test_regenerator_claim_is_not_excused_by_a_moved_inputs_surface
#   test_inputs_claim_still_uses_the_inputs_surface
# (defect observed 2026-08-18 on the live twin run, pre-dating this anchor;
#  the fix and its pins are committed at parallax 39f910a)
```

re-verify: cd ~/dev/parallax && .venv/Scripts/python.exe -m pytest tests/test_sweep.py -k "regenerator_claim_is_not_excused or inputs_claim_still" -q
