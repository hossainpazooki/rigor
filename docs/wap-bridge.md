# WAP bridge — rigor for write-audit-publish readers

Earned 2026-07-19 by ADR-0005 success criterion 1 (a genuine non-origin WAP-shaped firing
whose record says the framing **clarified** the work); the decision record and its
refutation of the naive mapping is [ADR-0005](adr/0005-wap-composition-and-catalog-drift.md).
WAP terms are a **reader's bridge only** — rigor's stages keep their own names, because the
mapping is deliberately not 1:1.

## The mapping

| WAP stage | What real WAP provides | rigor component in that slot | What rigor adds in the slot |
|---|---|---|---|
| Write | isolated branch/temp schema, invisible to consumers | `gate-discipline` rule 1 (define green before the stage starts) | acceptance criteria stated *before* the write, not discovered at audit time |
| Audit | producer-authored DQ rules / the project's own test suite | `data-quality-fail-closed` (three outcomes; unevaluable **halts**) + the predicate skills (`no-lookahead`, `idempotent-restatement`, `lineage-replay`) | **polarity upgrade**: the audit must be **shown able to fail** — red on a mutated twin of the candidate, or it is unevaluable and the publish halts |
| Publish | atomic fast-forward / schema swap; red blocks it | `verify-the-effect` + `gate-discipline` rule 3 (a real integration, not a local pointer) | probe the **consumer-visible** state after the swap, paired with a negative control that fails against the effect-absent state |
| *(absent)* | — | `pick-up` (brief-scoped today) / the L1 re-verify sweep class | the temporal gap: nothing in practiced WAP re-audits standing published state as reality drifts (ADR-0005 resolution 2 — designed, not yet opened) |

The load-bearing distinction: in every WAP reference implementation examined (ADR-0005
Context, fetched sources), the audit is the **producer's own pre-specified checks** — the
same team authoring data and audit, never shown red on known-bad input. That is a *slot*
where a conscience could go, not a conscience. rigor is not "WAP for agents"; **rigor is
what WAP's audit slot is missing.**

## Evidence this survived contact (both firings 2026-07-19, same operator — caveat carried)

- **Origin exemplar** — a lakehouse publish to an external warehouse: audit green on
  candidate and published state, red on a mutated twin at exactly the planted row count,
  post-publish consumer probe with a pre-publish negative control
  ([entry](feedback/2026-07-19-wap-firing-vantage-origin-gate-b.md)).
- **Non-origin adjudication** — a research-harness dataset publish: the seen-red obligation
  caught **two real defects** the producer-authored green path would have shipped
  (a pricing-basis contradiction at the pilot gate; artifact precision below the gate's own
  tolerance at the full matrix — fixed by raising precision, never by loosening tolerance)
  ([entry](feedback/2026-07-19-wap-firing-cldd-nonorigin-v3-sweep.md)).
- Honest fit limit: for a research artifact the "consumer-visible publish" is the operator's
  commit, so the Publish row's post-swap probe runs on the staged artifact with the commit
  as the atomic final step. The mapping bends there; it is recorded, not smoothed over.
