# ADR-0010 — LEARN loop: misfire → blameless mechanism → pinned gate → checkable closure

**Status:** **Accepted 2026-08-18** (Proposed and ratified the same day). The
pre-ratification build (skill, gate + 21 tests, empty ledger, audit) is hereby
regularized; the ledger schema is no longer provisional.

## Context

rigor already practises this loop. It does not ship it.

The repo's own record shows the pattern working end to end at least three times.
`skeptic-verifier` returned 2/4 false refutations at VANTAGE (2026-06-28); the
response was to mandate non-vacuity in the fan-out discipline, and the next
adversarial run came back 6/6 sound. The ledger kit passed a record whose quoted
basis did not reproduce (2026-07-14); the response was identical-`ts` detection
in `check-learnings`, **verified red on the real defective ledger**. A silent tier
collapse was found at tic (2026-07-18); the response was `check-tier-placement`,
whose criterion-1 firing was red on the real collapsed script.

Those are three different qualities of closure, and today nothing distinguishes
them:

| Misfire | What closed it | Is the closure checkable? |
|---|---|---|
| ledger kit batch-stamping (07-14) | `check-learnings` identical-`ts` leg, seen red on the real defect | **Yes** — a test pins it |
| silent tier collapse (07-18) | `check-tier-placement`, red on the real script | **Yes** |
| skeptic false refutations (06-28) | "mandate non-vacuity" — prose in `fanout-build` | **No** — no test fails if the discipline lapses |
| `check-citation-fidelity` numeric provenance (06-26) | a logged limit | **No** — and no dated decision *not* to pin |
| `check-learnings` append-only blind to history (08-08) | nothing yet | **No** — open, and nothing says so |
| `check-runlog` built but never invoked (08-18) | nothing yet | **No** — open |

The middle rows are the problem this ADR exists for. A misfire that produced a
prose fix and a misfire that produced a red-path test are recorded in the same
voice, in the same ledger, and read the same to a future session. "We learned
from this" is a **claim**, and rigor's own law is that a claim is refuted before
it is believed. Today that particular claim is the one class of assertion in the
repo that nothing tries to break.

The gap has a name in the incident literature — a postmortem whose action items
are never verified to have landed — and rigor's version is sharper, because rigor
already owns the mechanism that would verify them: a test that goes **red on the
original failure condition**.

## Decision

Ship the loop as a skill plus one closure ledger and one gate.

**1. The loop is four named stages.** A skill, `learn-from-misfire`, defines them
as judgment (ADR-0002: discipline, not an automated incident bot):

- **Capture** — what fired wrong, with the artifact trail: the command and its
  output, the record that was wrongly passed or wrongly refuted, the commit.
  Capture is anchored at observation time (ADR-0003's capture-time rule), because
  a misfire reconstructed later is a capture-shaped lie.
- **Blameless analysis** — the mechanism, never the actor. The question is not
  "who wrote the bad entry" but *what in the system allowed a bad entry to pass*.
  The 07-14 answer was not "the author batch-stamped"; it was "a form gate cannot
  tell capture-time from write-time, so identical `ts` values were invisible."
  Blameless is not a courtesy here — an actor-shaped analysis produces an
  unpinnable finding, because you cannot write a regression test against a person.
- **Pin** — the misfire becomes a permanent red path: a test that fails, or a gate
  that exits non-zero, **on the original failure condition**. The pin is verified
  by re-running that condition and watching the new gate catch it — never by
  reading the diff. This is `refute` move 2 applied to the fix itself.
- **Close** — a closure record links capture → mechanism → pin, so the claim "we
  learned from this" becomes checkable by a third party who trusts none of it.

**2. The closure ledger: `docs/learn/closure-log.jsonl`**, append-only JSONL
(ADR-0004's proven run-log shape) plus a pointer-only `docs/learn/LEARN.md`.
Deliberately **not** a fourth capture ledger — capture already has homes
(`docs/feedback/` for component misfires, `docs/learnings/` for repo facts). A
closure record *points at* the entry that captured the misfire and adds only what
is missing: the mechanism, the pin, and the pin's red-proof. Required fields:

- `id`, unique kebab slug; `ts_captured` (observation) and `ts_recorded` (write),
  in that order;
- `component`, `domain`, and `capture` — a path to the existing entry that
  records the incident. **No orphans**, mirroring ADR-0009's rule;
- `mechanism` — the blameless system-level cause;
- `closure` — a three-state object, below.

**3. Closure is three-valued, and the middle state is not silent.** This is
`data-quality-fail-closed` turned on rigor itself:

- `pinned` — requires `pin` (the test or gate reference) **and** `red_proof` (the
  command and result showing that pin goes red on the original condition). A pin
  without a red-proof is an always-green gate, which the repo's own law calls
  unevaluable.
- `declined` — requires `decision`, `decided_by`, `decided_on`. Deciding not to
  pin is legitimate and common; deciding it *silently* is what is banned.
- `open` — legal to write, but it makes the ledger's completeness **unevaluable**,
  and unevaluable halts.

**4. `check-misfire-closure.mjs`, three outcomes** (house style: pure exported
matcher, fs at the CLI boundary):

- **exit 0** — every record closed with the evidence its state requires;
- **exit 1 (FAIL)** — a malformed record, or a *false closure claim*: `pinned`
  without `red_proof`, `declined` without a dated decision, a duplicate `id`,
  `ts_recorded` before `ts_captured`;
- **exit 2 (UNEVALUABLE / HALT)** — one or more records are `open`, so
  "every misfire is closed" cannot be asserted either way.

The exit-2 rung is the load-bearing part. A two-outcome gate would force every
open incident to read as either a failure or a pass, and the pressure would be to
close records to get green — Goodharting the loop into a rubber stamp. Exit 2
says the honest thing: *there is unfinished work and I will not pretend otherwise.*

**5. Self-application, without backfilling.** The repo's no-backfill invariant
stands unamended: `docs/learn/closure-log.jsonl` starts **empty** and earns
records forward. The first exercise of the skill is therefore an **audit**, not a
seed — a point-in-time survey in `docs/audits/` of the misfires the existing
ledgers already record, reporting which have pins, which have dated declines, and
which are in the silent middle. An audit reads existing records; a backfill
manufactures new ones with reconstructed timestamps. Only the first is legal here.

## Consequences

- **If accepted:** "we fixed it" stops being self-certifying. A pick-up session
  can run one gate and learn whether the repo's stated lessons have teeth, without
  reading a single postmortem.
- The loop's output is a **test**, not a document. That is the whole point, and it
  is also the cost: some misfires are genuinely unpinnable (a judgment lapse, a
  prose discipline), and those must take the `declined` path honestly rather than
  being forced into a fake pin.
- **Cost.** One skill, one gate + tests, one ledger folder, one audit. No new
  hook, no new agent, no new command. The gate runs in the existing `node --test`
  floor.
- **Interlock** (ADR-0011, ADR-0012): a verifier that fails its calibration
  controls is an incident that enters *this* loop; a re-audit sweep that misfires
  likewise; and a pin produced here becomes part of what the sweep re-checks as
  standing state. The three are one cycle, entered at different points.

## Self-refutation — what would make this a correct-shaped lie?

1. **The gate measures paperwork, not learning.** A record can carry a `pin` and a
   `red_proof` string that no one re-ran; the matcher cannot execute the pin. This
   is the same standing limit as every form gate here (`check-learnings` 07-14:
   "a form gate is a floor, never a verdict"), and it must be stated on the skill,
   not discovered later. **Partial mitigation:** `red_proof` demands a command
   *and* its output, so a fabricated one is falsifiable by re-running it — the
   ledger becomes re-executable rather than self-proving.
2. **Closure pressure corrupts the record.** If green-on-this-gate is ever treated
   as a goal, the cheap way to get it is to mark everything `declined` with a
   one-word decision. Exit 2 blunts the opposite failure (hiding open work) but
   nothing stops lazy declines. Honest answer: this gate is a floor on *visibility*,
   not on judgment quality, and it should never appear in any promotion criterion.
3. **It may be ceremony for a repo this size.** Six misfires in two months does not
   obviously need a ledger and a gate. The counter is that the two oldest ones
   (06-26, 06-28) are precisely the ones that quietly lack pins — the failure mode
   is slow, so the instrument has to predate the pain. If after ~10 records the
   ledger has produced no finding a plain reading of `FEEDBACK.md` would not, this
   ADR should be superseded and the folder deleted.
4. **A fourth ledger folder is sprawl** — ADR-0009 already proposes a third.
   Mitigated by holding capture in the existing ledgers and storing only closure
   here; if ADR-0009 is accepted, the two should be reviewed together for a merge
   into one `docs/` ledger convention rather than accreting folders per concern.
5. **Three-valued may be over-engineering.** If `open` records are rare and
   short-lived, exit 2 never fires and the complexity bought nothing. Falsifiable:
   if no record sits `open` across two sessions in the first ten, collapse the gate
   to two outcomes.

---
*Related: ADR-0002 (ship discipline, not an automated bot), ADR-0003 (capture-time
anchoring; index-plus-entries), ADR-0004 (the append-only JSONL shape this reuses),
ADR-0009 (the no-orphan citation rule), and the `data-quality-fail-closed` skill,
whose three-outcome rule this gate applies to rigor itself.*
