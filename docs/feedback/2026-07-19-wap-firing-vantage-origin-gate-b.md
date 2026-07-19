# 2026-07-19 — WAP-shaped publish firing at VANTAGE Gate B (origin repo) + ADR-0006 criterion 2 answered

ts: 2026-07-19T16:15:38Z · rigor HEAD at write: `ba58192` · session `0e090857` (rigor side)
Target-repo record: `vantage/docs/GATE-B-WAP-EVIDENCE.md` (tracked there, their commit `8f0304f`);
session brief `vantage/docs/superpowers/plans/2026-07-19-HANDOFF-gate-b-conclusion.md` (local-only).

## What fired

The **first end-to-end firing of ADR-0005 resolution 3's three-part publish-credit rule**, at a
real external publish boundary (Databricks workspace `dbc-a430129d-60c9`, serverless):

1. **Audit green on candidate and on published state** — `gate_b_audit.py`, three-outcome
   fail-closed, on the local lake and on the downloaded workspace tables.
2. **Same audit demonstrably red on a mutated twin** — A1 (no-lookahead) fired at **exactly the
   planted count (429,949 rows)** on the twin lake; an audit never seen red credits nothing.
3. **Post-publish consumer-path probe with a pre-publish negative control** — probe expectations
   pre-derived from the *local* lake (independent of the probed workspace gold),
   `check-effect-probe.mjs` clean.

Also fired at the same boundary: `data-quality-fail-closed` (the audit's three-outcome halt
shape), `no-lookahead` (A1 red-on-twin), `check-tier-placement` (their skeptic fan-out script
gated before running), and judgment-dispatch worker receipts.

**ADR-0006 success criterion 2: ANSWERED YES.** Their workflow `wf_b9a4cbdb-895` ran 5
tier-pinned skeptics; every `answered:` named the pinned tier; `check-dispatch` clean over
`~/dev/vantage-data/gate-b/dispatch-log.json` (10 records). Caveat carried verbatim from their
brief: `build == cheap == sonnet-5` in current `config/models.json`, so only the fable-vs-sonnet
split was observable — a build-vs-cheap substitution would not have been.

## Evidentiary basis (what is mine vs theirs)

**Re-run by this rigor session, live, 2026-07-19:**
- `python scripts/gate_b_audit.py --lake .../gate-b/workspace-lake` → 8/8 PASS, `outcome=GREEN exit=0`
- `node scripts/check-effect-probe.mjs .../gate-b/probe-records-workspace.json` → `effect-probe: clean`
- `node scripts/check-dispatch.mjs .../gate-b/dispatch-log.json` → `dispatch: clean (10 records)`
- `gh run list` in vantage → CI `success` on both HEAD pushes (their open item 3, closed)

**Carried from their records, not re-executed here:** the twin-red run itself (429,949 — the twin
lake is a 5.3G disposable artifact; the count is quoted from `GATE-B-WAP-EVIDENCE.md`), the sbt
40/40 suite, and the live Databricks job run. These are target-repo claims with their own
re-verify lines.

## What this does and does not move

- **Origin-repo firing.** VANTAGE is the extraction source of the four data-eng skills: this
  counts toward **no** promotion and does **not** unlock ADR-0005's bridge doc (ADR-0005
  addendum 2026-07-18). It is the *exemplar*, not the adjudicating domain.
- `verify-the-effect`'s two long-open unproven-reach items — **an oracle independent of the gate
  under test** and **the aftermath of a genuine irreversible external action** — are both
  exercised here (independent expectation source; a real workspace publish), gates re-run by this
  session. Recorded as evidence on the ledger row; scope caveat unchanged (same operator).
- The adjudicating non-origin domain for ADR-0005 criterion 1 is **CLDD's v3 sweep publish**,
  designated by operator directive 2026-07-19 (see ADR-0005 addendum #2) — in flight at this
  entry's write time.
