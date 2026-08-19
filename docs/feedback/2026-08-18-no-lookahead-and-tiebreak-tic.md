# 2026-08-18 · no-lookahead + idempotent-restatement moves 2–3 · treasury-intent-controller · helped

The third and final firing of this session, and the one that closes the last two
gaps. Domain: **treasury-intent-controller** — a Go payment-authorization plane
with a durable append-only event feed. Not VANTAGE, not PARALLAX, not either of
the sibling web/simulation repos used earlier today.

Orchestrator-executed. **Zero subagent tokens.** Every result is a re-executed
command.

**The repo was not mutated to obtain these results.** Both exercises ran through
`go test -overlay`, which substitutes files at build time and leaves the working
tree untouched — deliberately, because tic had uncommitted operator work in
`docs/` throughout. Only after the firing was complete was one regression test
landed as a real file, so the finding leaves a pin.

**The paused effort was not dispatched.** `docs/efforts/payment-loop-randomized`
is `paused: true` on a budget breach. That pause governs *that effort's fan-out
iterations*; it does not seal the repository. Nothing here dispatched an agent,
consumed its budget, or touched its queue.

## 1. `no-lookahead` — domain 2

The durable feed is a genuine point-in-time surface: `GlobalSeq` is its as-of
coordinate, `Open()` recovers history by full scan, and readers take a shared
slice. All three of the skill's moves, applied:

- **Move 1 — name the as-of key.** `GlobalSeq`. The feed implies a point-in-time
  read it does not expose, so the test defines it explicitly: every record whose
  `GlobalSeq <= C`.
- **Move 2 — enumerate the leak candidates.** `Since()`'s filter, `Open()`'s
  recovery renumbering, and the shared `records` slice handed to readers.
- **Move 3 — exercise with RESTATEMENT, not append-only.** The decisive one. A
  session seals a view at `C`, **closes**, a later session **reopens** the same
  feed and appends more history, and the as-of view at `C` is re-read.

Results (`core/internal/durable/asof_nolookahead_test.go`):

| test | result |
|---|---|
| `TestAsOfViewIsImmutableAcrossRestatement` | **PASS** — the as-of view at seq 3 is byte-identical before and after a reopen-and-append; no `intent-b` record leaked backwards |
| `TestRecoveryDoesNotRenumberHistoricalSeqs` | **PASS** — recovery preserves historical seqs, and the next append lands strictly after them |
| `TestPlantedBackdatedRecordIsCaught` | **PASS** — polarity |

**Polarity, which is what earns the credit.** A green as-of test proves nothing
unless it can see the violation. So a record was planted directly into
`events.jsonl` carrying `GlobalSeq: 2` — arriving later but backdating into the
sealed window, which is precisely the leak. The check **caught it**: the as-of
view at seq 3 went from 3 records to 4. Logged verbatim:

```
planted backdated record CAUGHT: as-of 3 went from 3 to 4 records
```

An as-of check that cannot see a backdated write is unevaluable, not passing.
This one is not.

## 2. `idempotent-restatement` — moves 2–3, the gap left open earlier today

Earlier entries settled this component on **move 1 only** (rerun idempotence),
recording that moves 2–3 were unproven: *no same-key restatement tiebreak with
out-of-order arrival was exercised anywhere.* tic closes that.

`ReferenceAdapter.OnAchieved` resolves same-key collisions by an **explicit,
documented first-writer-wins** tiebreak — not by chance and not by arrival order
silently favouring the last writer. `TestOnAchievedSameKeyDifferentIntent`
exercises exactly the adversarial input the skill demands: two *different*
intents (`seed-a`, `seed-b`) sharing one `IdempotencyKey`.

**Non-vacuity, proven rather than assumed.** A test asserting a tiebreak is
worthless if it would pass under the wrong tiebreak. So the adapter was mutated
on an overlay twin to the skill's named anti-pattern — last-writer-wins by
arrival order — and the suite re-run:

- real adapter → `ok ... internal/adapter`
- planted twin → **`--- FAIL: TestOnAchievedSameKeyDifferentIntent`**, surfacing
  both colliding events with their distinct payload hashes

The tiebreak is explicit, tested, and its test provably discriminates. Moves 2–3
are now genuinely exercised.

## 3. Promotion arithmetic — final

| Component | Domains | Status |
|---|---|---|
| `no-lookahead` | 2 non-origin — PARALLAX PIT gate + **tic durable feed** | **settled (scoped)** |
| `idempotent-restatement` | 2 non-origin for move 1 (pvt-demo, CSL) + **tic for moves 2–3** | **settled (scoped)** — all three moves now exercised |

### Caveats, kept visible

- **Same operator** across every domain, as for every promotion in this ledger.
- **Scope of `no-lookahead`'s tic domain** is an *event feed's* as-of coordinate
  (a monotonic sequence), not a *timestamped* as-of instant as at PARALLAX. The
  two domains are genuinely different surfaces, which is what makes them
  independent — but neither exercised a timestamp-vs-sequence disagreement.
- **`idempotent-restatement`'s moves are split across repos**: move 1 in
  pvt-demo/CSL, moves 2–3 in tic. No single domain exercised all three.
- **The as-of read is a test-side construct.** The feed exposes `Since()` (a tail
  read); the point-in-time read was defined in the test. So the invariant is
  proven of the *data*, and the production code has no as-of accessor to get
  wrong — worth knowing before someone adds one.

## Re-verify

```
cd ~/dev/treasury-intent-controller
go test ./core/internal/durable/... -run "AsOf|Recovery|Planted" -v   # 3 PASS, planted CAUGHT
go test ./core/...                                                    # all packages ok
```
The last-writer-wins twin is reproducible with `go test -overlay` against a copy
of `core/internal/adapter/adapter.go` whose early-return is replaced by an
overwrite; it must turn `TestOnAchievedSameKeyDifferentIntent` red.
