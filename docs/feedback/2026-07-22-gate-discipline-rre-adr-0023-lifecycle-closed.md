# 2026-07-22 — gate-discipline: RRE ADR-0023 lifecycle closed; honest negative on domain 2

ts: 2026-07-22T18:58:40Z · rigor HEAD at write: `e78e902` · session `10d1e5e1` (fanout-loop
run 4b) · workflow `wf_6b0df83b-dca` (3 agents, 98,921 subagent tokens, L1-clean) · verdict
log: `docs/efforts/backlog-settlement/runs/run-4-verdicts.jsonl` (`dispatch: clean (3 records)`).

## What was adjudicated

STATE.md's standing question from run 2 (2026-07-14, when ADR-0023 sat BUILT + self-green
with zero open PRs): when the PR opens, does the merge gate actually run the differential
harness, or does the non-gating script stay non-gating?

## Findings (evidence-gathered build-tier, refuted judgment-tier, re-run by the orchestrator)

- **PR #16 merged 2026-07-15T15:00:02Z** at head `fad03947` — ADR-0023's own acceptance
  rule (acceptance = PR merge) is now genuinely satisfied. The 07-14 "built, NOT accepted"
  verdict resolved by a real merge, not a local pointer: rule 3 completed its lifecycle.
- **The harness stayed non-gating, by first-party design.** Zero references to
  neo4j/differential in any of the 6 workflow files at the PR head; 13 CI checks ran (all
  green, twice); the script's own header reads "NON-GATING (deliberately not in CI…)".
  Re-run by the orchestrator: `gh pr view 16` reproduces the merge instant + SHA exactly;
  `git grep -ilE "neo4j|differential" <head> -- .github/workflows` exits 1.
- **New finding: `main` has no branch protection at all** (genuine 404 "Branch not
  protected"; rulesets empty) — so NO check was formally merge-blocking. "Acceptance =
  PR merge" is a convention the operator honors, not a mechanism the repo enforces.
  Caveat: current-state evidence, not a certified 2026-07-15 snapshot (REST has no
  historical endpoint); disclosed by the evidence agent and both skeptics.
- Skeptic verdicts: primary (judgment tier) SURVIVED after re-running the raw commands;
  mid-tier vote SURVIVED — **the first live mid-tier dispatch (ADR-0007)**, receipt
  `claude-opus-4-8[1m]`, which the new `receiptMatches` normalization correctly accepted
  (the old exact-equality gate would have false-positived it — ADR-0008's folded
  obligation exercised non-vacuously on its first real log).

## Credit adjudication: honest negative

**No status move.** RRE is already gate-discipline's domain 1 (2026-07-14); the
independence rule (different repo / problem domain) means this firing EXTENDS domain 1 —
lifecycle closed, richer record — and cannot be domain 2. STATE.md's "live candidate"
line implied otherwise and is corrected this run. Promotion ledger stays at 1 domain.
Next genuine domain-2 candidate: CLDD's 0.3.0 release gate (different repo, release held
until CI green 15/15, 2026-07-20→22) — to be adjudicated in a future run, not credited
here.

Standing caveat: same operator throughout.
