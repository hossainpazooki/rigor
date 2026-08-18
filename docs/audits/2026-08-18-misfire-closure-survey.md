# Misfire-closure survey — 2026-08-18

**Point-in-time audit. Not a ledger, not a backfill.** This reads misfires the
existing ledgers already record and asks one question of each: *does a pin exist,
was it seen red, or is there a dated decision not to pin?* Nothing here is written
into `docs/learn/closure-log.jsonl` — that ledger starts empty and earns records
forward, per the no-backfill invariant (ADR-0010 §5).

First exercise of the `learn-from-misfire` skill, applied to rigor itself.

**Method.** Misfires enumerated from `docs/feedback/FEEDBACK.md` and
`docs/learnings/LEARNINGS.md`. Pin status determined by **grepping `tests/` for a
test that exercises the original failure condition** — not by reading the fix
commit, and not by trusting the ledger's own "hardened" / "fixed" language.
Commit anchor: `6565f02`, working tree carrying this session's changes.

## Result

**5 pinned · 0 declined · 8 open.** By the gate's own rule, a ledger in this shape
would exit **2 (unevaluable)** — completeness cannot be asserted while eight
records sit in the silent middle.

The headline is not that eight are open. It is that **nothing in the repo
currently distinguishes them from the five that are closed** — all thirteen are
recorded in the same voice, and several of the open ones use the words "hardened",
"fixed", or "closed."

### Pinned — a test exercises the original condition

| Misfire | Pin (verified present) |
|---|---|
| ledger kit batch-stamping (2026-07-14) | `tests/learnings-check.test.mjs:110` — "entries sharing an identical ts are flagged as write-time stamping" |
| ledger kit dialect / misfire #2 (2026-07-22) | `tests/learnings-check.test.mjs:52` — "bold-label fields are accepted — the cldd dialect (kit misfire #2)" |
| silent tier collapse (2026-07-18) | `tests/tier-placement.test.mjs:11` — "an unpinned build-stage agent() call is flagged as tier-collapse risk" |
| receipt display-name false-positive (2026-07-19) | `tests/dispatch-check.test.mjs:187` — display-name echo containing the requested id is not a downgrade |
| `git-guard` read-only false-positives (2026-07-07) | `tests/git-guard.test.mjs:142` — an explicit "Finding #17: false-positives on read-only git commands" block |

These five are the repo working as intended, and two of them carry the strongest
form of evidence there is: the 07-14 and 07-18 pins were **verified red on the
real defective artifact**, not on a synthetic re-creation.

### Open — no pin found, and no dated decision not to pin

| Misfire | Recorded as | Why it is open |
|---|---|---|
| `check-citation-fidelity` insufficient for numeric provenance (2026-06-26) | "a logged limit" | A limit is a description, not a decision. No test, no dated decline. The oldest open item. |
| `skeptic-verifier` 2/4 false refutations (2026-06-28) | "non-vacuity MANDATED" in `fanout-build` | **Prose fix.** Nothing fails if the mandate is skipped. This is the motivating case for ADR-0011. |
| `fanout-recon-synthesize` mid-run API crash (2026-06-30) | "infra-resilience gap surfaced" | Surfaced, never closed. No retry/coverage guard, no decline. |
| HALT-marker false halt (2026-07-19) | "shipped example.mjs carried and now fixes the same pattern" | Fix landed in `example.mjs`; **no test anywhere greps for the affirmative-marker rule.** `example.mjs` is referenced by `tier-placement` tests only, which test tier pins, not halt parsing. |
| `args` arrive JSON-encoded (2026-07-22) | fixed 2026-08-09 (`d2fcf48`) | Same shape: real code fix, **zero tests** reference JSON-encoded args. It recurred once already before the fix. |
| `check-learnings` append-only blind to history (2026-08-08) | learnings entry, `status: verified` | Known, unfixed. Backlog spine still lists "a history-aware append-only leg (or a scoping ADR)" as required. Genuinely open — and correctly so. |
| handoff-folder gate-scope contradiction (2026-08-08) | learnings entry | Awaiting an operator decision. This one is open *legitimately*; it is a decision, not a defect — but the decision has no date and no deadline. |
| `check-runlog` built but never invoked (2026-08-18) | found by this session's pick-up | Gate exists, no writer calls it; the payment-loop run log sat red through its own commit. |

## What the survey found that a reading of FEEDBACK.md would not

Three things, and they are the argument for the gate existing at all:

1. **Two "fixed" items have no regression test.** The HALT-marker and
   args-as-string fixes both landed as real code changes and both read as closed
   in the ledger. Neither has a test. The args one had *already recurred once*
   between discovery and fix — precisely the signature of an unpinned defect.
2. **The oldest misfires are the least closed.** 06-26 and 06-28 are the two
   furthest from a pin. Recency drives attention; the survey inverts that.
3. **The distinction between "open because unfixed" and "open because undecided"
   is invisible today.** The 08-08 handoff-folder item is waiting on a human
   decision, which is a fine state to be in — but it is recorded identically to
   the 06-30 item that is simply forgotten. A dated `declined` (or a dated
   deadline) separates them; nothing currently does.

## Honest limits of this survey

- **Pin presence ≠ pin quality.** Grep proves a test exists that names the
  condition. It does not prove that test would fail on the original artifact —
  only the 07-14 and 07-18 pins carry recorded red-proofs against the real defect.
  The other three pinned rows are *shaped* right; their red-proof is unverified
  here.
- **The misfire list may be incomplete.** It is drawn from two ledgers. A misfire
  nobody wrote down is invisible to this method, and by construction there is no
  way to bound how many those are.
- **No record was created.** Per ADR-0010 §5, closing any of these eight requires
  a *forward* capture — a fresh observation with a real timestamp — not an entry
  reconstructed from this table.

## If ADR-0010 is accepted, the first real work

The eight open items each need one of: a pin with a red-proof, or a dated
decision not to pin. Three look genuinely unpinnable and should probably be
**declined on the record** rather than left open (the skeptic-verifier prose
mandate is better answered by ADR-0011's calibration ledger than by a test; the
06-30 infra-resilience gap is a harness property, not a rigor one; the 08-08
handoff-folder scope is a pending operator decision). The other five look
pinnable, and two of them — HALT-marker and args-as-string — are cheap: the fixes
already exist, only the regression tests are missing.
