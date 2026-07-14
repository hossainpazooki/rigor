# 2026-07-14 · `gate-discipline` · helped · regulatory/legal-rule Rust (regulatory-rule-engine)

**Domain:** regulatory-rule-engine — **first genuine firing** of this component, which has carried
`0 domains` since extraction. Read-only application; the verdict is a refusal to credit.

## The situation it was applied to

ADR-0023 (verify-gated graph export, Neo4j differential harness) was built 2026-07-14. Its own
status line reads:

> **Status:** Proposed — **BUILT 2026-07-14** (trigger fired by Hossain; differential harness ran
> GREEN live, `passed=11 failed=0`; acceptance = PR merge).

And its own claim rule:

> "The claim gate is procedural: the PR that closes the trigger does not merge until the harness's
> green run is recorded in it." … "Nothing from this ADR is claimable until the build is **merged
> and its differential harness green**."

## The verdict: not accepted, and the ADR says so itself

Applying rule 3 — *close work with a real integration, not a local pointer*:

- The four build commits sit on branch `adr/0023-graph-export`, pushed. **`gh pr list --state open`
  → empty.** No PR exists, so the ADR's own acceptance condition (`acceptance = PR merge`) is
  unmet. The repo's CLAUDE.md is explicit that `origin/main` is the source of truth and gates close
  via PR review, never a local pointer move.
- The green evidence (`cargo test --workspace` 187/0; `passed=11 failed=0`) is **author-recorded on
  "this machine"** — not CI-attested, not pasted into a PR body. The differential harness is
  **deliberately non-gating in CI** ("Harness placement: script, non-gating in CI"), so nothing
  re-runs it on merge.
- The status string "Proposed — BUILT" is itself the built-vs-accepted blur that
  `implemented-vs-planned` exists to prevent: two statuses in one line, and the stronger-sounding
  one is the unaccepted one.

**This is not a criticism of the work** — the harness has two real negative controls with vacuity
guards, and the 11 tests are real (`crates/ke-cli/tests/graph_export.rs`, each watched red first).
It is a statement about *what may be claimed today*: built and self-reported green, **not accepted**.

## Why it counts as a firing

The component's failure mode is recording "done" as a local pointer. Here the local pointer (a
pushed branch + a green run on the author's box) is *exactly* what exists, and the discipline's
output is the refusal to let it read as closed. The gate that would move this is a PR whose CI
runs `cargo test --workspace --features test-keys,pyo3` on the Linux+Windows matrix — the repo
already pins that matrix precisely because a Linux-only green can hide a Windows-red.

**Still provisional** — one domain. Promotion needs a second, in a different domain.

re-verify: `gh pr list --state open` in regulatory-rule-engine (expect empty while this stands);
`git log --oneline origin/main -1` vs the branch tip `942d311`.
