# Spine scope-limitation audit — demonstrated reach is numeric + citation only

2026-06-27 · `refute` / `skeptic-verifier` / `fanout-recon-synthesize` · scope
limitation (audit of this log) · meta / rigor's own ledger · An audit of every
logged independent-domain win shows the spine's **demonstrated** reach is narrow:
each catch bottoms out in one of two mechanizable checks — **recompute a number**
(numeric provenance) or **match a string to its cited source** (citation
fidelity). Concretely: ATLAS (payments/regulatory) = a fabricated citation +
number-anchored overstatements; CLDD (credit-risk ML) = §7 numbers that reproduce
from nothing + a stale `66` test count + the CL2 seed-42-vs-cross-seed-mean
discrepancy. **Not one logged catch** is a pure semantic/logic error (numbers
right, reasoning wrong), a design/architecture error, a "present but does the
wrong thing," or a genuine omission. **Structural reason:** 3 of `refute`'s 4
moves reduce to recompute-a-number or grep-a-string (move 1 recompute; move 2
re-run the gate → stale/failing; move 4 citation fidelity); move 3 (dispatch
skeptics) is broad in principle, but every logged skeptic win was *itself* a
numeric recompute. The architecture is biased toward exactly the two failure
classes it has caught — so the gap between rigor's **claimed** scope ("refute any
load-bearing claim"; "decompose any question") and its **demonstrated** scope
(numeric provenance + citation/string fidelity) is real and currently invisible in
the README. `/recon` (`fanout-recon-synthesize`) is the sharpest case: **zero**
independent-domain exercises — its one run was same-repo (the self-audit) — so it
inherits `refute`'s profile by construction (its verify step *is* `refute`) yet has
independently caught nothing. Same root applies to this session's
`verify-the-effect`: its central move (probe the *effect* — behavior past
numbers-and-strings) is precisely the capability with the least evidence, so that
move is **aspirational, not demonstrated**. Closing it needs: (a) the
numeric-provenance mechanization already planned (commit `af09650`); (b) ≥1
independent-domain `/recon` run that catches a non-numeric defect (semantic or
omission); (c) honest scope language — state in the README/skills that `refute` is
demonstrated for numeric provenance + citation fidelity and **provisional over
semantic/design/omission defects**.
