# STATE — re-audit sweep, first instantiation (PARALLAX)

paused: false
budget: L1 ≤ 150k subagent tokens per iteration; instantiation total ceiling 500k. Run 1 spent
**0** subagent tokens (orchestrator-executed, no fan-out). Any fan-out run needs an explicit
operator go recorded in run-log.jsonl.
governed-by: ../../adr/0012-re-audit-sweep.md (Accepted 2026-08-18) · ../../adr/0004-loop-chassis-rigor-conscience.md (chassis) · run log: run-log.jsonl (append-only)
last-run: 3 (2026-08-18 — run 1 PARALLAX sweep; run 2 second domains at passed-vs-true-demo +
correct-shaped-lies; run 3 tic closed `no-lookahead` domain 2 and `idempotent-restatement` moves 2–3.
**All five components settled (scoped).** Zero subagent tokens across all three runs)
last-updated: 2026-08-18 · session 62dcb1b1

**This file is a mutable spine, not evidence.** Pick-up refutes it on every entry; the run log and
PARALLAX's `docs/evidence/2026-08-18-re-audit-sweep-lane1.md` are the record. Every write here
passes `implemented-vs-planned`.

## Goal

ADR-0012's design earns its first real firing: a published catalog's standing claims re-audited
against the surfaces they rest on, with drift distinguished from rot, and both polarity legs run
before any verdict is credited.

Honest boundary: this effort makes claims about **the sweep as a discipline**. It makes no claim
about PARALLAX's research findings (the study-001 aggregates were explicitly not swept).

## Why PARALLAX, and the direction it overrides

ADR-0005's 2026-07-18 operator direction said the standing-catalog sweep "targets VANTAGE's
catalog when opened." That direction predates ADR-0012 and the promotion arithmetic. VANTAGE is
the **origin repo** for every data-eng skill, so a firing there exercises the discipline but
cannot open a non-origin domain. Operator directed PARALLAX 2026-08-18; recorded here as a
deliberate override, not an oversight.

## What run 1 established

- **The sweep fires and finds real things.** 1 ROT on a real claim ceiling: PARALLAX's
  `pytest 25 passed 2026-08-08` — a value/anchor pair that held at **no commit**.
- **Drift vs rot is decidable when an independent historical oracle exists**, and only then.
  ADR-0012 self-refutation 3 predicted this would often be undecidable; run 1 confirms the
  prediction *and* shows git history is a usable oracle for regenerator-surface claims.
- **Both polarity legs, on real data.** Negative control on unmutated gold: zero false alarms.
  Planted-drift twin: identity moved, the changed row count was caught, classified STALE not ROT.
- **The instrument's own defects surfaced first.** A false ROT from a hardcoded sentinel, and
  global movement laundering rot into drift. Both fixed and pinned before any credit was taken.

## Run queue (planned — nothing below is done until its run-log entry and evidence exist)

1. **Sweep the study-001 aggregates.** The 89.4% / 3.4% / 1.51% / p99 0.696 figures and the
   18,051-filer-quarter cross-check were named NOT SWEPT in run 1. They need a full study
   re-execution; that is the expensive half and the one that would exercise `lineage-replay` as a
   genuine batch replay-and-diff rather than a claim replay.
2. **A second sweep domain.** One firing is one domain; the sweep is provisional until a second
   independent repo. Candidate: a non-VANTAGE repo with a published artifact carrying a dated
   verdict.
3. **Historical oracles for the gold claims.** Only `repo.pytest_passed` carries one. The six
   INPUTS-surface claims still rest on the movement heuristic, so a rot there would read as drift.
4. **Producer-side sentinel decision** (VANTAGE): is `MAX_SENTINEL = 9999-12-31` intended, given
   the surface saturates at 2262-04-11? Rigor does not decide another repo's constant.

## Backlog / open questions

| Item | Standing | What moves it |
|---|---|---|
| re-audit sweep (ADR-0012) | **settled (scoped)** — 2 domains (PARALLAX; pvt-demo) | — off backlog. Unproven: cost at catalog scale |
| `data-quality-fail-closed` | **settled (scoped)** — 2 non-origin (CLDD 07-19; PARALLAX 08-18) | — off backlog; same-operator caveat stands |
| `lineage-replay` | **settled (scoped)** — 2 non-origin; the "unconfirmed as a true replay-diff" gap is **closed** | — off backlog. Unproven: replay of a *published* dataset rather than a derived bundle |
| `idempotent-restatement` | **settled (scoped)** — move 1 at pvt-demo/CSL; **moves 2–3 closed at tic** (explicit first-writer-wins tiebreak, test proven to discriminate vs a last-writer-wins twin) | — off backlog. Unproven: all three moves in a single domain |
| `no-lookahead` | **settled (scoped)** — 2 non-origin: PARALLAX (timestamped as-of, twin RED on C1+C3) + tic (sequence as-of across a reopen-restatement, planted backdated record caught) | — off backlog. Unproven: a timestamp-vs-sequence disagreement |
| Sweep cost model | untested at scale | run 1 swept 7 cheap claims; ADR-0012 self-refutation 2 (O(catalog) cost) is unexercised |
