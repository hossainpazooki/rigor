# idempotent-restatement — origin-repo firing (VANTAGE same-key tiebreak)

2026-07-08 · `idempotent-restatement` · helped · point-in-time SEC fundamentals
lakehouse (VANTAGE — the origin project the data-eng skills were extracted from) ·
**origin-repo firing — does not count toward ≥2-context promotion; doctrine now
demonstrated at n=1.**

**Move 3 (adversarial same-key input, out-of-order arrival) fired and is now a
committed test.** The silver MERGE tiebreak (`s._ingest_ts > t._ingest_ts`, strict,
equal = no-op) had only ever been tested with in-order arrival. `PipelineRestatementSpec`
now pins the contract under out-of-order arrival — max `_ingest_ts` wins regardless of
arrival order — and states in-test why a same-`adsh` resend is a re-publish contract,
not a lookahead vector (`accepted` unchanged). The gold-side tiebreak was made TOTAL
(`accepted, adsh, version`) after the probe showed an `accepted` tie had no defined
order at all; red-before could not be forced for that case (green-by-luck), so the
assertion's discriminating power was proven by the negative-control mutation instead —
recorded honestly in the origin repo's finding doc.

**Move 2 (explicit, tested tiebreak — the shared seam with `no-lookahead`)** is the
same firing viewed from the other side; see the companion entry
`no-lookahead-vantage-origin-firing_07-08-2026.md` for the defect it caught.

**Move 1 (rerun twice and diff — re-execute, don't trust): fired at unit level;
full-lake refute IN FLIGHT at write time.** Bronze/silver idempotent-merge unit tests
were already green; the full-history backfill's rerun-one-quarter-and-diff (bronze
counts identical, silver content anti-joined both ways excluding the `_ingest_ts`
audit column, gold content identical after a second GoldRebuild; quarantine growth
asserted as append-mode-by-design, by exact count) is scheduled at the tail of the
69-quarter backfill running now. This entry records the tiebreak firing; the rerun-diff
result belongs to the origin repo's backfill record either way.
