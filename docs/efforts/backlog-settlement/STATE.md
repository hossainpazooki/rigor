# STATE — provisional-backlog settlement effort

paused: false
budget: L1 sweep ≤ 250k subagent tokens (**raised from 150k by operator 2026-08-08** after run-5 breach — "raise the cap" chosen over agent-count tightening; 250k is the orchestrator's operationalization, covering the observed 185k 4-agent shape); recon-scale runs need an explicit operator go, recorded in run-log.jsonl
governed-by: ../../adr/0004-loop-chassis-rigor-conscience.md (**pilot SETTLED 2026-07-14** — chassis kept) · run log: run-log.jsonl (append-only)
last-run: 6 (2026-08-08, fanout-loop iteration 3, operator-authorized single iteration — ledger-kit domain 2 **REFUTED again**, both skeptics independent: pvt-demo's committed ledger has two dated entries edited in-place after commit (immutability breach; no `kills:`), and check-learnings' append-only leg is blind to in-history edits (vacuous pass); cldd non-credit confirmed sound. 172,323 tokens, within the raised 250k cap; see run-log entry 6)
last-updated: 2026-08-18 · pick-up (no run dispatched) — queue item 2's premise refuted and the
item split; see the correction in the queue below. Prior: 2026-08-08T18:05:00Z · session fcb0d613
(single-iteration go consumed; loop idle pending operator)

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

**Loop UNHALTED 2026-08-08** — operator decisions recorded: (1) L1 cap
raised to 250k (header); (2) kit dialect fixed both sides in rigor
(gate widened to accept bold labels, writer hardened to emit bare
labels + read-only re-verify; suite 150/150); (3) pvt-demo ledger found
committed (6 files tracked+clean, entries through 07-24). Explicit
operator go for one sweep iteration given 2026-08-08.

~~1. Re-adjudicate ledger-kit domain 2~~ — **CONSUMED by run 6
(2026-08-08): REFUTED ×2.** pvt-demo does not credit (in-history entry
edits, no `kills:` supersession; append-only gate leg found blind to
history); cldd non-credit sound. See run-log entry 6 + the 2026-08-08
feedback entry. New gap-closures required before any re-credit:
pvt-demo `kills:` supersessions, a history-aware append-only leg (or
scoping ADR), cldd entry rewrites, and the handoff-folder gate-scope
decision (contradiction logged in learnings 2026-08-08).

2. ~~**Adjudicate judgment-dispatch + skeptic-verifier-fast domain
   credit** — FIRED in runs 4–6~~ — **PREMISE REFUTED 2026-08-18 (pick-up);
   item SPLIT.** "FIRED in runs 4–6" was true of the routing and false of
   the agent, and the two were bundled into one credit decision.

   2a. **judgment-dispatch** — genuinely fired: tiers config-sourced, the
   stakes inference logged, receipts three-way, `check-dispatch` clean ×3
   (plus payment-loop run 1). Adjudicable. Still needs a fresh operator go.

   2b. **skeptic-verifier-fast** — **there is no firing to adjudicate.**
   No verdict record in either effort carries an `agentType`; the one
   committed workflow script (payment-loop `runs/run-1-workflow.mjs`)
   dispatches generic workflow agents with a `model:` pin and no
   `agentType`. Runs 4–6's scripts were never committed, so for those the
   status is *unverifiable from the record* rather than refuted — but
   `docs/STATUS.md` independently says "never dispatched", and nothing
   contradicts it. Crediting this agent off those runs would credit a
   component that never ran. Removed from the queue until a real dispatch
   exists.

   Gate gap behind the confusion: `check-dispatch`'s record schema has no
   agent-identity field, so it cannot tell a named-agent dispatch from a
   model-pinned generic one. Same class as the append-only blind spot
   (learnings 2026-08-08).

After the queue: sweep mode (derive items from the backlog rows below,
until dry) under the 250k cap — still requires its own explicit
operator go.

## Backlog (verified by run 1 2026-07-08; **runs 2–3 2026-07-14** moved the starred rows)

| Component | Verified standing | What moves it |
|---|---|---|
| `orchestrate` | **settled (scoped) 2026-07-08** — done | — (off backlog) |
| ★ `verify-the-effect` | **settled (scoped) 2026-07-14** — done. 2 domains (cldd PyPI probe; **tic live payment loop**), and the standing live-end-to-end-probe gap is CLOSED: 2 paired negative controls, each red on a one-input delta, non-vacuity proven by recovery | — (off backlog). Residual, tracked under `effect-prober`: an oracle independent of the gate's own implementation; a genuinely irreversible external action |
| ★ `pick-up` | **settled (scoped) 2026-07-14** — done. 2 domains (passed-vs-true-demo; **tic** — where it *killed* a claim: refuted "39 passed" against the same commit, actual 46) | — (off backlog). Unproven: picking up someone *else's* brief (same operator throughout) |
| ★ `gate-discipline` | 1 (RRE ADR-0023, 2026-07-14) — **lifecycle CLOSED 2026-07-22 (run 4)**: PR #16 merged 07-15 per the ADR's own rule; harness never ran in CI (first-party NON-GATING header); `main` has NO branch protection (current-state evidence) — acceptance-by-merge is convention, not mechanism | 2nd independent domain **in a different repo** (run 4 corrected the old "same ADR's PR" candidate — same repo extends domain 1, it cannot be domain 2). Candidate: CLDD 0.3.0 release gate (release held until CI green, 07-20→22) |
| ★ ledger kit (`docs/learnings/`+`docs/handoff/`, `check-learnings`) | 1 domain (tic) + **2 logged misfires** (batch-stamping 07-14; serialization dialect 07-22 — **CLOSED 2026-08-08**: gate widened for bold labels, writer hardened). **Run 6 (2026-08-08): re-adjudication REFUTED ×2** — pvt-demo's now-committed ledger has two dated entries edited in-place after commit (immutability breach, no `kills:`), and the gate's append-only leg is blind to in-history edits (vacuous pass); cldd's two 07-29 entries lack all record fields (substance) | pvt-demo credits after `kills:` supersessions there AND a history-aware append-only leg here (or a scoping ADR); cldd credits after its two prose entries are superseded with real field blocks; handoff-folder gate scope needs an operator decision (contradiction logged). Remaining contract gap: durable re-verify queries (read-only rule now in the writer spec) |
| `integration-runner` | 1 clean (tic, gate re-run green) + 1 partial (ulc: lint+Go green; CI `test` job **unverifiable-here** — requires Postgres via `DATABASE_URL` + `pip install -e ".[dev,ml,gcp,dspy]"`) | Close the ulc pytest leg against Postgres, or a new clean second domain |
| `fanout-recon-synthesize` | 1 clean (correct-shaped-lies: pytest 67/1 re-run in-run) | 2nd domain; strongest candidate = a clean cldd re-run (its prior run crashed mid-recon) |
| `implemented-vs-planned` | 1 clean (cldd: refused to restate "90 passed", re-ran it) | 2nd domain. **Candidate not yet credited:** tic's 07-13 brief tags built/PR-open/not-run/planned consistently — but the same brief carried an unreproducible number, so crediting it would reward the tag while ignoring the basis. Needs a clean firing |
| `no-lookahead` | origin-only (VANTAGE, n=1 doctrine) | First non-origin firing; candidates: regulatory-rule-engine, treasury |
| `idempotent-restatement` | origin-only (VANTAGE) | Same |
| `lineage-replay` | origin-only (VANTAGE; weakest — even origin firing unconfirmed as true replay-diff) | Same, plus confirm a real replay-and-diff anywhere |
| ★ `data-quality-fail-closed` | **1 non-origin domain (CLDD v3 sweep publish gate, 2026-07-19)** — three-outcome fail-closed audit at a real publish boundary, seen red on a staged twin AND two real defects; plus the origin evidence (VANTAGE, strongest of the four) | 2nd non-origin repo with a real DQ gate (1 of ≥2; see 2026-07-19 · wap-firing-cldd-nonorigin-v3-sweep) |
| `judgment-dispatch` | **candidate firings, uncredited** (2026-08-18): tier routing ran in runs 4–6 + payment-loop run 1, stakes inference logged, `check-dispatch` clean each time — a log indexes a candidate; only an adjudication moves it | Queue item 2a — adjudicate the existing verdict logs; needs an operator go |
| `skeptic-verifier-fast` | **still never dispatched**, re-confirmed 2026-08-18 — no `agentType` in any verdict record; the mid *tier* running is not this *agent* running | A real dispatch: an `agentType: rigor:skeptic-verifier-fast` call, per the canonical `skills/fanout-build/example.mjs` pattern, which does pin the agent |
| `repo-cartographer` | never dispatched; **structurally gateless** — "gate-rerunnable firing" unachievable by construction | Needs its own success criterion (brief produced *and used*); ties into ADR-0003 implementation |

## Cross-repo concentration (from run 1)

cldd is the credited domain for four 1-domain components; tic for two. A single clean run in
either firms several at once — legitimate (credit is per-component), noted so it's deliberate.

## Next candidates (when real work exists there)

- **ADR-0005 settled (scoped) 2026-07-19** (two-domain basis; bridge doc built). Resolution 2's
  standing-catalog sweep remains **not started** — settlement does not open it; it needs an
  explicit operator go recorded in the run log.
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
