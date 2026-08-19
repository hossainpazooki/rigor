ts: 2026-08-19T03:01:15Z
commit: f4bca72
session: 62dcb1b1-ede9-4f82-8ed0-1f55032173d3 (re-audit sweep + data-eng settlement)
status: verified

fact: ADR-0012 self-refutation 3 predicted that drift and rot are often
undecidable without an independent historical oracle. Confirmed live, and the
resolution is cheap for regenerator-surface claims: git history IS such an
oracle, because it is independent of the artifact making the claim. PARALLAX's
claim ceiling published "pytest 25 passed 2026-08-08". The movement heuristic
alone would have called that STALE (the regenerator had moved since). Extracting
every commit dated on the anchor and re-running collection showed the suite
collected 9 that day, 25 only at c8a6e96 on 08-09, and 28 at the commit that
publishes the claim — so the pair (25, 2026-08-08) held at NO commit and the
verdict is ROT. An `anchor_oracle` that answers "did this value ever hold at its
published anchor" therefore OUTRANKS the movement heuristic wherever one exists;
where none exists the heuristic stands, and six gold claims still rest on it.

basis:
```
$ cd ~/dev/parallax && .venv/Scripts/python.exe -m pytest tests/test_sweep.py \
    -k "anchor_oracle" -q
..                                                                       [100%]
2 passed, 22 deselected in 0.08s

# pins both directions: an oracle saying "never held" forces INVALIDATED even
# when the surface moved; an oracle saying "it did hold" leaves the movement
# heuristic in charge.
#   test_anchor_oracle_outranks_movement
#   test_anchor_oracle_saying_it_did_hold_leaves_movement_in_charge
# (live finding 2026-08-18, pre-dating this anchor; committed at parallax 39f910a,
#  evidence in parallax docs/evidence/2026-08-18-re-audit-sweep-lane1.md)
```

re-verify: cd ~/dev/parallax && .venv/Scripts/python.exe -m pytest tests/test_sweep.py -k "anchor_oracle" -q
