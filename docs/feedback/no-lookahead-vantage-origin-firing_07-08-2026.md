# no-lookahead — origin-repo firing (VANTAGE restatement seam test)

2026-07-08 · `no-lookahead` · helped · point-in-time SEC fundamentals lakehouse
(VANTAGE — the origin project the data-eng skills were extracted from) ·
**origin-repo firing — does not count toward ≥2-context promotion; doctrine now
demonstrated at n=1.**

**The state the skill names as its anti-pattern was VANTAGE's exact state.** The
skill's anti-pattern section — "an order-invariance test proves the final transform is
order-independent, while the upstream tiebreak that resolves same-key records by ingest
order is never tested with a same-key restatement" — described the origin repo verbatim:
`PitNoLookaheadSpec` proved the gold transform on a hand-built frame; nothing exercised
the `_ingest_ts` seam through the production merge path with an out-of-order correction.
Doctrine was ahead of demonstration. This session closed it, in the skill-prescribed
order: seam test FIRST, 69-quarter backfill only after.

**Move 3 (test with restatement, not append-only) caught a real defect before it could
ship wrong data at full history.** Run through the production path
(`Pipeline.runFromFrames` → `SilverMerge.upsert` → `GoldPit.buildGold` → `asOf`), the
same-key out-of-order restatement test went RED on first run — not on lookahead, but on
silent history loss: gold was rebuilt per batch against only that batch's `sub` slice,
so every multi-batch lake dropped all prior filings' facts. Every committed test had
used single-batch lakes — the one input distribution that hides the defect. A second
latent defect (accepted-tie ordering falling to physical row order) was fixed in the
same pass. Both fixes gated, suite 40/40.

**Claim calibration applied as prescribed.** README upgraded to exactly "load-order
independence at the tiebreak seam is tested with same-key restatements" — not "load
order cannot leak" — only after the negative control went red under a mutated seam
(ephemeral `_ingest_ts`-ordered mutation: 3/5 tests red with the exact leak signature
`Some(100.0) != Some(150.0)` at `as_of(D ≥ T2)` in the out-of-order lake; plus a
committed non-vacuity companion that stays in the suite).

Evidentiary basis: session-run test output and the mutation red captured in VANTAGE's
local negative-control record; suite green re-run by the operator's session, not taken
from a subagent's word.
