# Provisional-backlog recon audit — one promotion, honest negatives recorded

2026-07-08T19:59:30Z · backlog audit · Workflow run `wf_1955b9bb-7f9` (14 recon
agents + 1 synthesis, ~1.05M subagent tokens, 0 errors) over 30+ session
transcripts. **Read-only; promoted nothing by itself.** This entry records the
negative results so a future session does not re-mine the same ground or mistake
"not promoted" for "not checked."

## Standard applied

Logs index candidate firings; **a repo's own gate re-run moves a status.** A
logged "green / survived / N passed" is a lead, never evidence (VANTAGE 2026-06-28:
logged skeptic verdicts 2/4 FALSE). Independence is strict: different real repo,
non-origin, non-rigor-self-use, and gate-rerunnable.

## Outcome by component

- **Promoted:** `orchestrate` → settled (scoped) — tic + CLDD gates re-run green
  (see `orchestrate-two-domains-gate-reverified_07-08-2026.md`).
- **One clean domain + one partial (NOT promoted):** `integration-runner` — tic
  gate re-run green (clean); upstream-label-correction re-run green on its **lint +
  Go** legs, but its canonical CI `test` job needs a **Postgres service + full
  `[dev,ml,gcp,dspy]` deps** (read from `ulc/.github/workflows/ci.yml`), so the
  Python pytest leg was **not reproducible on this box** and is uncredited. Holds
  at n=1 clean until that leg runs against Postgres or a different clean second
  domain appears. (Corrects the recon, which marked ulc `gate_rerunnable: yes`.)
- **One clean gate-rerunnable domain each (need a second):** `pick-up`
  (passed-vs-true-demo, raw-CSV invariants recomputed), `fanout-recon-synthesize`
  (correct-shaped-lies, pytest 67/1 re-run in-run), `verify-the-effect` (CLDD/CLUE
  PyPI 0.1.0 fresh-venv install probe), `implemented-vs-planned` (CLDD pytest
  re-run + source grep). All four lean on CLDD or a single repo — one more clean
  independent domain firms several at once.
- **Origin-only (VANTAGE = extraction source, n=1 doctrine, does not count):** the
  four data-eng skills — `no-lookahead`, `idempotent-restatement`, `lineage-replay`,
  `data-quality-fail-closed`. Name-coincidence false positives were correctly
  rejected (regulatory-rule-engine "run-twice → git clean" and correct-shaped-lies
  "episode run-twice" are determinism/lineage shapes, not same-key restatement).
- **No genuine firing:** `gate-discipline` (never invoked as a Skill; the one
  real-repo touch READ config, never re-ran a gate), `judgment-dispatch` (built
  2026-07-07 in rigor; zero external application; the only post-build hits are a
  tic-concept-chat design doc marked "NOT implemented" and name-mentions),
  `skeptic-verifier-fast` (never dispatched), `repo-cartographer` (never
  dispatched, and structurally gateless — emits an inventory, runs no suite).

## Over-claims the synthesis stripped (kept stripped)

- `verify-the-effect` ledger credit "1 strong (digital-asset decoder)" is
  self-report-only — a FEEDBACK line + authoring provenance, never an exercised
  probe; the ledger itself concedes "no live end-to-end probe."
- `pick-up` ATLAS/tic/COMPASS cluster only **consulted** `gh pr checks` (a prior
  CI run), did not re-run the 3-language contract gate — consultation is not
  gate-rerunnable.

## Cross-repo concentration (for the next session)

CLDD is a credited domain for four components and tic for two of the most-ready.
A single CLDD pytest re-run or tic Go-gate re-run firms multiple components at
once — legitimate (credit is per-component) but worth knowing. No component
reaches promotion on VANTAGE alone.

**re-verify (this audit's promotion):** re-run the two gates in
`orchestrate-two-domains-gate-reverified_07-08-2026.md`; both green.
