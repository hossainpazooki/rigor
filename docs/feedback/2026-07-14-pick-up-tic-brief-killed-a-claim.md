# 2026-07-14 · `pick-up` · helped · deterministic-systems Go + Python (treasury-intent-controller)

**Domain:** treasury-intent-controller — second independent domain (first was passed-vs-true-demo,
2026-07-07). Gate-rerunnable, and the gates were re-run by the orchestrator, not consulted.

## Why this one counts

The first pick-up domain verified claims that all **survived**. A verification move that has never
killed anything is unproven in the direction that matters. This one killed a claim.

## The five moves, as run

1. **Read the brief, dated it.** `docs/handoff/2026-07-13-atlas-treasury-payment-loop.md`, written
   2026-07-13T22:37Z, anchored at tic `6adff98` / RRE `86a77fc` / COMPASS `bf2b330`.
2. **Drift check.** tic clean and in sync at `9ac6fb8` (docs-only since the anchor). **RRE had
   moved and the brief could not know it**: a new branch `adr/0023-graph-export` with four commits
   built *after* the brief, and the checkout had since been switched to a local `main` that is
   BEHIND `origin/main`. The brief flagged the branch's existence as a heads-up; it could not know
   the checkout state.
3. **Refuted the load-bearing state claims.** Re-ran the brief's own `re-verify:` lines:

   | claim | verdict | evidence |
   |---|---|---|
   | RRE PR #14 merged | **verified-now** | `gh pr view 14` → `MERGED 2026-07-13T22:28:18Z` — matches to the second |
   | R7 fix green on main | **verified-now** | `cargo test -p ke-artifact --test attestation` → 19 passed, both `r7_intentspec_*` arms |
   | tic Go gate green | **verified-now** | `go test ./...` all ok; WSL `go test -race ./...` all ok |
   | Windows scorer lane 41+5 | **verified-now** | `41 passed, 5 skipped` |
   | **WSL lane "39 passed, zero skips"** | **REFUTED** | re-run at the same commit: **46 passed** |
   | full loop probed live w/ negatives | **unverifiable as written** → re-probed | negatives were asserted with no output; re-run with output captured (see the `verify-the-effect` entry) |

4. **Locked-decision premises** — all still hold; none contradicted.
5. **Entry gate re-run** — green before any edit.

## The kill

"39 passed, zero skips" does not describe the tree it is anchored to. 46 − 39 = 7 = exactly the
test count of `scorer/tests/test_main_config.py`, **a file that the anchoring commit itself added**.
The basis was captured mid-session, before that file existed, then stamped with the closing commit.
Windows reconciles independently (41 passed + 5 skips = 46 collected), which is what makes the
arithmetic decisive rather than suggestive.

The *fact* the entry records (the wheel lane was skipping on a wrong module name and could never
have run) is true and untouched. Only its number was fiction. A brief-only convention would have
carried that number forward as evidence — it had already been copied into a learnings entry.

## Second thing pick-up caught

The wheel lane's green **depends on a sibling checkout being on a commit that contains
`fixtures/artifacts/intentspec_payment/`**. It was not, so 5 wheel-lane tests FAIL (not skip) —
the `importorskip` guard covers an absent wheel, and `_atlas_dir()` only checks the directory
exists; neither notices the checkout is on the wrong commit. An environmental red presents as a
code red. Recovered read-only (`git archive origin/main … | tar -x -C <scratch>`); the operator's
checkout was **not** mutated — it holds their branch and untracked work.

re-verify: tic `docs/learnings/2026-07-14-wheel-lane-count-corrected.md` and
`2026-07-14-wheel-lane-depends-on-sibling-checkout-state.md`.
