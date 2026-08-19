# Handoff — re-audit sweep fired; all four data-eng skills settled

2026-08-19 (UTC; session ran 2026-08-18 local) · newest commit this brief
describes: **`f4bca72`** in rigor — pick-up measures drift from here. Sibling
repos this brief also describes: **parallax `39f910a`** (clean) and
**treasury-intent-controller `5c45596`** (5 dirty — operator docs work, not this
session's). Written by session `62dcb1b1`.

**Uncommitted at write time:** the three learnings entries + index rows this
command just wrote, this brief, and the long-standing
`docs/comparisons/2026-07-21-dataeng-landscape-deep-research.md` modification
(80 lines, predates the 2026-07-22 brief, **not this session's** — it has now
been carried unresolved across four briefs).

## Current state

- **built** ADR-0012's re-audit sweep, fired twice. Verification over *standing*
  published state — the gap `docs/SYSTEM.md` had kept visible since 2026-07-09.
  Instantiated in the target repos per ADR-0002, not shipped from rigor.
  re-verify: `cd ~/dev/parallax && .venv/Scripts/python.exe scripts/run_sweep_local.py --gold ~/dev/vantage-data/lake-backfill/gold`
  (exit 1, 6 verified / 1 ROT).
- **built** The sweep's polarity legs, both, on real data.
  re-verify: same runner with `--twin` (exit 0, prints `TWIN OK`). Removes its
  own twin; costs a Delta append on a hardlinked copy, not a 5 GB duplicate.
- **built** `no-lookahead` settled — 2 non-origin domains. PARALLAX's PIT gate
  (timestamped as-of) and tic's durable feed (sequence as-of across a
  close/reopen restatement).
  re-verify: `cd ~/dev/treasury-intent-controller && go test ./core/internal/durable/... -run "AsOf|Recovery|Planted" -v`
  (3 PASS; the planted backdated record is logged as caught).
- **built** `idempotent-restatement` settled — move 1 at pvt-demo + CSL, moves
  2–3 at tic.
  re-verify: `cd ~/dev/treasury-intent-controller && go test ./core/internal/adapter/...` (ok).
- **built** `lineage-replay` settled; its standing "unconfirmed as a true
  replay-diff" gap is **closed** by a genuine batch replay at pvt-demo.
  re-verify: `cd ~/dev/passed-vs-true-demo && npx vitest run` (48 passed).
- **built** `data-quality-fail-closed` settled (2nd non-origin domain = the
  sweep's own three-outcome gate).
  re-verify: read the row in `docs/feedback/FEEDBACK.md`.
- **built** Effort chassis `docs/efforts/re-audit-sweep-parallax/` — 3 run-log
  entries, **0 subagent tokens across all three runs**.
  re-verify: `node scripts/check-runlog.mjs docs/efforts/re-audit-sweep-parallax/run-log.jsonl` (clean, 3 entries).
- **built** Three feedback entries recording the firings, including the caveats
  and one rejected candidate.
  re-verify: `ls docs/feedback/2026-08-18-*.md` (3 files).
- **in-progress** Nothing. No half-finished work was left open.
- **planned, not started** Sweeping PARALLAX's study-001 aggregates (89.4% /
  3.4% / 1.51% / p99 0.696) and its 18,051-filer-quarter cross-check — named
  `NOT SWEPT` by the runner so no report reads as full coverage.
  re-verify: the `NOT SWEPT (3)` line the runner prints.
- **planned, not started** Historical oracles for the six gold claims; only
  `repo.pytest_passed` carries one, so a rot in the others would read as drift.

## Locked decisions

- **PARALLAX, not VANTAGE, was the sweep's first domain** — operator direction
  2026-08-18, overriding the recorded 2026-07-18 direction that named VANTAGE.
  Reason: VANTAGE is the origin repo for every data-eng skill, so a firing there
  exercises the discipline but cannot open a non-origin domain. *Check whether
  the reason still holds if the origin designation ever changes.*
- **All four ADRs (0009–0012) are Accepted** (2026-08-18). ADR-0009's pending
  decision 1 was resolved by its own strict reading: **no backfill**, the
  snapshots folder starts empty everywhere including the motivating tic report.
  Reason: the no-backfill invariant is unamended and outranks convenience.
- **Run-log corrections are supersession, never edits** — operator ruling
  2026-08-18, built as `supersedes:` in `check-runlog`. Reason: an in-place edit
  is exactly what refused pvt-demo ledger-kit credit at run 6; supersession keeps
  append-only *and* a strict schema.
- **`idempotent-restatement` is settled with its moves split across repos**
  (move 1: pvt-demo/CSL; moves 2–3: tic). Reason: no single domain exercised all
  three, and saying so is cheaper than pretending one did.
- **CLDD was rejected as a `no-lookahead` domain.** Reason: its no-leakage is
  cohort disjointness (train/test contamination), not timestamp ordering with
  restatement. Crediting the resemblance would be a manufactured domain.
- **The paused payment-loop effort was not dispatched.** Reason: `paused: true`
  is honored fail-closed. It governs that effort's fan-out iterations, not the
  repository — which is why direct, zero-subagent work in tic was still allowed.

## Reuse map

- **`scripts/check-misfire-closure.mjs`** — the freshest gate in house style and
  the **first with a three-outcome CLI** (exit 2 = unevaluable). Copy this, not
  the two-outcome gates, when the unevaluable rung matters.
- **`tests/misfire-closure.test.mjs`** — the pattern for red-path proof: green
  fixtures modelled on a *real* closed misfire, an explicit negative-control
  test, one RED test per false-closure class.
- **`parallax/sweep/`** — the sweep implementation. `claims.py` holds the
  drift/rot decision rule and the demotion ladder; `sweep.py` holds per-surface
  identity and the `anchor_oracle` hook; `parallax_claims.py` shows how to lift
  a claim ceiling into probes. Copy the shape, not the claims.
- **`parallax/scripts/run_sweep_local.py: plant_drift()`** — twin staging that
  hardlinks parquet parts and appends a real Delta commit, so a 5 GB surface
  costs nothing to twin.
- **`go test -overlay`** — plant a twin in a repo you must not mutate; see the
  2026-08-19 learnings entry.
- **`skills/learn-from-misfire/SKILL.md` + `docs/learn/`** — the closure ledger,
  1 record, gate clean.
- The three ADRs 0010–0012 each carry a **self-refutation** section, a
  convention introduced this session. If it survives review it belongs in the
  ADR template.

## Invariants

- **No manufactured domains.** Components move only on real work in real repos;
  same-repo firings extend a domain, never open one. Violated ⇒ the promotion
  ledger becomes decorative, which is the failure rigor exists to prevent.
- **Polarity before credit.** A gate never seen red on known-bad input is
  unevaluable, not passing — and **verify the plant actually landed**: a planted
  twin silently failed to mutate its file this session and was not recorded as a
  pass until re-planted.
- **A probe is a claim too.** A false ROT retroactively invalidates correct work
  and notifies downstream for nothing; this session's first ROT was a wrong
  probe, not a wrong artifact.
- **Ledger indexes hold pointers; dated entries are immutable**; corrections are
  new entries (`kills:` in learnings, `supersedes:` in run logs). No ledger is
  ever backfilled — the misfire survey is an *audit*, deliberately not seed data.
- **`/rigor:handoff` is the sole writer of `docs/learnings/`**, and every
  `re-verify:` line must be **read-only**: a verifier executes it.
- **Agents never write git history.** Emit commands for the operator.
- **`paused: true` is honored fail-closed.**
- Shipped surface (`skills/`, `agents/`, `commands/`) stays domain-neutral —
  `node scripts/check-surface-scrub.mjs`.

## Open / next

**First: the misfire closure ledger is the live view, and it is not green.**
`docs/learn/closure-log.jsonl` holds 1 record; the 2026-08-18 audit found
**5 pinned / 0 declined / 8 open** across the repo's recorded misfires, and one
has since been closed. Under `check-misfire-closure`'s own rule that shape is
exit 2 — unevaluable, not passing. The two cheapest are the HALT-marker and
args-as-string fixes, where the code fix already exists and only the regression
test is missing.
re-verify: `node scripts/check-misfire-closure.mjs docs/learn/closure-log.jsonl`
and `docs/audits/2026-08-18-misfire-closure-survey.md`.

Then, in rough order:

1. **Decide the ADR-0009-vs-0010 folder consolidation** before a third ledger
   folder lands. Both are Accepted; `docs/snapshots/` is unbuilt, so this is the
   cheap moment.
2. **Adjudicate backlog-settlement queue item 2a** (`judgment-dispatch`) — its
   verdict logs already exist on disk and only need an operator go. Item 2b was
   removed: `skeptic-verifier-fast` has never been dispatched, so there is no
   firing to adjudicate.
3. **The payment-loop budget ruling** — that effort stays `paused: true` until
   the cap is raised or the shape tightened. Its entry gate is no longer red.
4. **Resolve the `docs/comparisons/…` file**, carried unresolved across four
   briefs now. It is finished-looking DQX/Databricks content; commit it or drop
   it, but stop carrying it.
5. **Producer-side call at VANTAGE:** is `MAX_SENTINEL = 9999-12-31` intended,
   given gold saturates at 2262-04-11? Latent, pinned by tests in parallax, but
   rigor does not decide another repo's constant.

**Blocker on none of the above.** The only standing constraint is that
`no-lookahead`'s two domains use different as-of coordinates (timestamp vs
sequence) and neither exercised a timestamp-vs-sequence disagreement — worth
knowing before anyone claims the skill covers both.
