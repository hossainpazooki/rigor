# STATE — provisional-backlog settlement effort

paused: false
budget: L1 sweep ≤ 150k subagent tokens; recon-scale runs need an explicit operator go, recorded in run-log.jsonl
governed-by: ../../adr/0004-loop-chassis-rigor-conscience.md (**pilot SETTLED 2026-07-14** — chassis kept) · run log: run-log.jsonl (append-only)
last-run: 3 (2026-07-14, L2 — ledger-flaw fix + live tic loop probe; 3 promotions, 1 misfire — see run-log.jsonl) · run queue added 2026-07-22 (ADR-0008), runs 4–5 queued
last-updated: 2026-07-22T18:41:46Z · session 10d1e5e1

**This file is a mutable spine, not evidence.** Pick-up refutes it on every entry; the run log
and `docs/feedback/` entries are the record. Every write here passes `implemented-vs-planned`.
Promotion rules (FEEDBACK.md header) are untouched by this effort: ≥2 genuine independent
non-origin gate-rerunnable domains, gates re-run by the orchestrator. **Domains cannot be
manufactured to feed this loop** — items move when real work happens in real repos.

## Goal

Every provisional rigor component reaches an honest terminal state: settled (evidence), or
provisional-with-named-gap, or a recorded misfire. Honest negatives count as progress.

## Run queue (planned — consumed top-down by /rigor:fanout-loop, ADR-0008)

Standing authorization for this instantiation, recorded here and in the
first run-log entry the loop writes: L1 per iteration (≤150k subagent
tokens), total ceiling 1M, terminate on 2 consecutive dry passes. Queue
entries are PLANNED work; nothing below is done until its run-log entry
and gate evidence exist.

1. **Run 4 — adjudication.** (a) Build `check-runlog` red-first (runs 1–3
   entries as green fixtures, a mutated twin red) BEFORE appending this
   run's entry — discharges ADR-0004's "mechanize on the 4th" condition;
   (b) adjudicate RRE PR #16's merge gate for `gate-discipline` domain 2 —
   did CI actually run the differential harness at merge?; (c) write the
   ADR-0006 criterion-2 FEEDBACK pointer entry (VANTAGE Gate B receipts);
   (d) refresh this file's stale backlog rows (dq-fail-closed 1/2;
   ADR-0005 settled).
2. **Run 5 — ledger-kit domain 2.** Verify passed-vs-true-demo's and
   CLDD's ledger adoptions: run `check-learnings` on each ledger,
   reproduce one entry's quoted basis at its own anchor (the run-2
   lesson); note pvt-demo's build is RED-by-design pending its re-pin.
   Credit ledger kit domain 2 (same-operator caveat) or record a misfire.

After the queue drains: sweep mode (derive items from the backlog rows
below), until dry.

## Backlog (verified by run 1 2026-07-08; **runs 2–3 2026-07-14** moved the starred rows)

| Component | Verified standing | What moves it |
|---|---|---|
| `orchestrate` | **settled (scoped) 2026-07-08** — done | — (off backlog) |
| ★ `verify-the-effect` | **settled (scoped) 2026-07-14** — done. 2 domains (cldd PyPI probe; **tic live payment loop**), and the standing live-end-to-end-probe gap is CLOSED: 2 paired negative controls, each red on a one-input delta, non-vacuity proven by recovery | — (off backlog). Residual, tracked under `effect-prober`: an oracle independent of the gate's own implementation; a genuinely irreversible external action |
| ★ `pick-up` | **settled (scoped) 2026-07-14** — done. 2 domains (passed-vs-true-demo; **tic** — where it *killed* a claim: refuted "39 passed" against the same commit, actual 46) | — (off backlog). Unproven: picking up someone *else's* brief (same operator throughout) |
| ★ `gate-discipline` | 1 (ATLAS ADR-0023, 2026-07-14 — verdict: BUILT + self-reported green, **not accepted**; zero open PRs while its own rule says acceptance = PR merge) | 2nd independent domain. Live candidate: the same ADR when its PR opens — does the merge gate actually run the harness? |
| ★ ledger kit (`docs/learnings/`+`docs/handoff/`, `check-learnings`) | 1 domain (tic) + **1 logged misfire** — first non-origin adoption produced a record whose basis did not reproduce; form gate passed it green, a pick-up re-run killed it. Gate hardened, verified red on the real defect | 2nd repo adopting the kit, ideally one whose entries are written by a session I don't run |
| `integration-runner` | 1 clean (tic, gate re-run green) + 1 partial (ulc: lint+Go green; CI `test` job **unverifiable-here** — requires Postgres via `DATABASE_URL` + `pip install -e ".[dev,ml,gcp,dspy]"`) | Close the ulc pytest leg against Postgres, or a new clean second domain |
| `fanout-recon-synthesize` | 1 clean (correct-shaped-lies: pytest 67/1 re-run in-run) | 2nd domain; strongest candidate = a clean cldd re-run (its prior run crashed mid-recon) |
| `implemented-vs-planned` | 1 clean (cldd: refused to restate "90 passed", re-ran it) | 2nd domain. **Candidate not yet credited:** tic's 07-13 brief tags built/PR-open/not-run/planned consistently — but the same brief carried an unreproducible number, so crediting it would reward the tag while ignoring the basis. Needs a clean firing |
| `no-lookahead` | origin-only (VANTAGE, n=1 doctrine) | First non-origin firing; candidates: regulatory-rule-engine, treasury |
| `idempotent-restatement` | origin-only (VANTAGE) | Same |
| `lineage-replay` | origin-only (VANTAGE; weakest — even origin firing unconfirmed as true replay-diff) | Same, plus confirm a real replay-and-diff anywhere |
| `data-quality-fail-closed` | origin-only (VANTAGE; strongest origin evidence of the four) | First non-origin repo with a real DQ gate |
| `judgment-dispatch` | no genuine firing (zero external application since 2026-07-07 build) | First external verifier dispatch through the stakes rubric, verdict log through `check-dispatch` |
| `skeptic-verifier-fast` | never dispatched | First cheap-tier dispatch (via judgment-dispatch routing) |
| `repo-cartographer` | never dispatched; **structurally gateless** — "gate-rerunnable firing" unachievable by construction | Needs its own success criterion (brief produced *and used*); ties into ADR-0003 implementation |

## Cross-repo concentration (from run 1)

cldd is the credited domain for four 1-domain components; tic for two. A single clean run in
either firms several at once — legitimate (credit is per-component), noted so it's deliberate.

## Next candidates (when real work exists there)

- **ADR-0005 resolution 2 is now UNBLOCKED** — it was gated on ADR-0004's pilot evaluation, which
  settled 2026-07-14. The standing-catalog sweep may open as the second L1 sweep class.
- ATLAS ADR-0023's PR, when it opens → `gate-discipline` domain 2 (does the merge gate actually
  re-run the differential harness, or does the non-gating script stay non-gating?).
- A second repo adopting the ledger kit → its domain 2, ideally with entries written by a session
  the orchestrator did not run (the current 1 domain shares an operator).
- VANTAGE Gate B / treasury KV-ledger slice / regulatory-rule-engine → non-origin data-eng
  candidates for `no-lookahead` / `idempotent-restatement` / `data-quality-fail-closed`, all still
  origin-only. **Not credited from the 07-13 treasury work:** its restatement claim lives in COMPASS
  on an open PR with no run-twice-and-diff output, and its as-of instant is plumbed but never probed
  across a validity boundary. Crediting either would be a manufactured domain.
- `judgment-dispatch` + `skeptic-verifier-fast`: still zero firings. Neither was dispatched in
  runs 2–3 — the verifications were run by the orchestrator directly.
