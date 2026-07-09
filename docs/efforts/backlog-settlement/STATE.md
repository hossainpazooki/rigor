# STATE — provisional-backlog settlement effort

paused: false
budget: L1 sweep ≤ 150k subagent tokens; recon-scale runs need an explicit operator go, recorded in run-log.jsonl
governed-by: ../../adr/0004-loop-chassis-rigor-conscience.md · run log: run-log.jsonl (append-only)
last-run: 1 (2026-07-08, recon + gate re-runs + orchestrate promotion — see run-log.jsonl)
last-updated: 2026-07-09T03:43:17Z · session 495274ae

**This file is a mutable spine, not evidence.** Pick-up refutes it on every entry; the run log
and `docs/feedback/` entries are the record. Every write here passes `implemented-vs-planned`.
Promotion rules (FEEDBACK.md header) are untouched by this effort: ≥2 genuine independent
non-origin gate-rerunnable domains, gates re-run by the orchestrator. **Domains cannot be
manufactured to feed this loop** — items move when real work happens in real repos.

## Goal

Every provisional rigor component reaches an honest terminal state: settled (evidence), or
provisional-with-named-gap, or a recorded misfire. Honest negatives count as progress.

## Backlog (as verified by run 1 — recon `wf_1955b9bb-7f9` + operator gate re-runs, 2026-07-08)

| Component | Verified standing | What moves it |
|---|---|---|
| `orchestrate` | **settled (scoped) 2026-07-08** — done | — (off backlog) |
| `integration-runner` | 1 clean (tic, gate re-run green) + 1 partial (ulc: lint+Go green; CI `test` job **unverifiable-here** — requires Postgres via `DATABASE_URL` + `pip install -e ".[dev,ml,gcp,dspy]"`) | Close the ulc pytest leg against Postgres, or a new clean second domain |
| `pick-up` | 1 clean (passed-vs-true-demo: raw-CSV invariants recomputed) | A second genuine pickup whose gate gets *re-run*, not consulted |
| `fanout-recon-synthesize` | 1 clean (correct-shaped-lies: pytest 67/1 re-run in-run) | 2nd domain; strongest candidate = a clean cldd re-run (its prior run crashed mid-recon) |
| `verify-the-effect` | 1 clean (cldd PyPI 0.1.0 fresh-venv install probe) | 2nd non-origin domain; the live-end-to-end-probe gap stands |
| `implemented-vs-planned` | 1 clean (cldd: refused to restate "90 passed", re-ran it) | 2nd domain |
| `no-lookahead` | origin-only (VANTAGE, n=1 doctrine) | First non-origin firing; candidates: regulatory-rule-engine, treasury |
| `idempotent-restatement` | origin-only (VANTAGE) | Same |
| `lineage-replay` | origin-only (VANTAGE; weakest — even origin firing unconfirmed as true replay-diff) | Same, plus confirm a real replay-and-diff anywhere |
| `data-quality-fail-closed` | origin-only (VANTAGE; strongest origin evidence of the four) | First non-origin repo with a real DQ gate |
| `gate-discipline` | no genuine firing (never invoked as a Skill) | First genuine invocation in a staged/gated effort |
| `judgment-dispatch` | no genuine firing (zero external application since 2026-07-07 build) | First external verifier dispatch through the stakes rubric, verdict log through `check-dispatch` |
| `skeptic-verifier-fast` | never dispatched | First cheap-tier dispatch (via judgment-dispatch routing) |
| `repo-cartographer` | never dispatched; **structurally gateless** — "gate-rerunnable firing" unachievable by construction | Needs its own success criterion (brief produced *and used*); ties into ADR-0003 implementation |

## Cross-repo concentration (from run 1)

cldd is the credited domain for four 1-domain components; tic for two. A single clean run in
either firms several at once — legitimate (credit is per-component), noted so it's deliberate.

## Next candidates (when real work exists there)

- ADR-0003 implementation in a target repo → natural first genuine firing for `gate-discipline`
  and a `judgment-dispatch`-routed verifier dispatch.
- VANTAGE Gate B / treasury Stage C / regulatory-rule-engine → non-origin data-eng candidates.
- Any next real pickup → `pick-up` domain 2 (re-run the gate, don't consult it).
