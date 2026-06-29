# Rigor Performance Audit — VANTAGE build + upstream-label-correction recon

**Date:** 2026-06-28
**Scope:** Two independent-domain exercises of rigor's components, plus the process
lessons from evaluating them. Domain A = a greenfield Scala/Spark/Delta point-in-time
lakehouse built with `fanout-build` (VANTAGE). Domain B = a `/recon` run that verified
the claims of a genomics/proteomics label-error ML + Go service repo
(upstream-label-correction).
**Companion record:** the per-component ledger entries live in `FEEDBACK.md` (entries +
promotion table). This audit is the narrative + lessons; the ledger is the scorecard.

**One-line conclusion:** rigor's verification spine performed as designed in both
domains — and `/recon` finally caught the *non-numeric* defect class the 2026-06-27
spine audit said it had never demonstrated — but every win here shares one
author/operator, and several load-bearing findings rest on a run's self-report rather
than an independent re-run in this audit. Strong evidence, honestly bounded; not yet
"settled."

---

## Evidentiary basis (read this before trusting anything below)

This audit distinguishes three tiers of evidence. They are not interchangeable.

- **[ME-VERIFIED]** — re-derived in this evaluating session from raw source or report
  files. Example: I re-read `Pipeline.scala`/`GoldPit.scala`/`TsvIngest.scala` and
  re-parsed the 12 ScalaTest XML reports (29 tests / 0 fail / 0 err).
- **[ORCH-REPRODUCED]** — the *run's own orchestrator* independently re-ran the check
  inside its session (not a subagent's word), and I confirmed the resulting on-disk
  state is consistent. Example: VANTAGE's F1-equivalent gate re-run; the upstream
  F1 0.9143.
- **[RUN-REPORTED]** — the run states it, with file:line cites, but it was **not**
  independently re-read in this audit. Example: the four upstream-label-correction
  "cracks." Recorded as reported, per direction; flagged so they don't read as
  ME-VERIFIED.

**Two standing caveats over everything here:**
1. **Same operator.** Both domains were driven by the same Claude/rigor operator as the
   prior ledger domains. These are independent *domains*, not independent *authors* — no
   third-party adoption yet.
2. **No live `sbt` re-run.** The evaluation box is JDK 21 with no `sbt` on PATH; VANTAGE
   pins Temurin 17. VANTAGE's green rests on the produced XML reports + the run's
   clean-gate log, not a fresh run by me. Honest `UNVERIFIABLE-on-live-rerun`, mitigated
   (reports newer than source; realistic Spark timings) but not eliminated.

---

## Domain A — VANTAGE (`fanout-build`)

### What was built
A point-in-time SEC fundamentals lakehouse: bronze→silver→gold over Spark/Delta, whose
load-bearing property is "fundamentals as of D return only what was filed and accepted
on or before D — no lookahead, across restatements." Built as a fan-out: Spike(halt-gate)
→ Contract → Scaffold → Build(7 disjoint agents) → Integrate(`integration-runner`,
real `sbt` gate) → Verify(`skeptic-verifier`).

### Results
- **[ME-VERIFIED] The load-bearing PIT property is real and non-vacuously tested.**
  `GoldPit.buildGold` orders validity strictly by the SEC `accepted` timestamp, never
  `_ingest_ts`; `asOf` filters `accepted <= D` and takes the latest restatement.
  `PitNoLookaheadSpec` asserts the across-restatement leak value and permutation
  invariance, and is proven non-vacuous by bug-injection (inject the leak → test goes
  red).
- **[ME-VERIFIED] The DQ gate fails closed on unevaluable.** `DataQualityGate.gate`
  returns `Unevaluable` on missing/mistyped column, empty batch, or analyzer exception,
  with a source-level precondition so a missing column isn't masked into a `Fail`.
- **[ME-VERIFIED] Tests green and current.** 24/24 at `be70645`, then 29/29 at `3bcc0de`,
  0 fail / 0 err, report XMLs newer than all committed source.
- **[ORCH-REPRODUCED] The decisive verification result: orchestrator-as-terminal-skeptic.**
  The verify stage's `skeptic-verifier` agents refuted **all four** pipeline claims;
  re-running each prescribed probe by hand showed **2 of 4 were FALSE refutations**
  (`permutation-silver` is order-invariant; the §7 test is non-vacuous) and 1 was a TRUE
  refutation (`missing-col`), which was then fixed (23→24 green). I confirmed the
  resulting source carries the fix (`requiredColumnsPresent` precondition in
  `Pipeline.runFromFrames`).

### The implemented-vs-planned boundary moved correctly
At `be70645` the build **honestly flagged** that `Pipeline.main` was a `println` stub
("the engine is tested" vs "you can point it at `2023q2`") and that CI was
defined-not-run, Databricks configured-not-deployed. The very next fan-out **closed the
stub end-to-end**: `main` now drives `TsvIngest.ingestQuarter → runFromFrames`, with
`TsvIngestSpec` test 3 ("the real read path composes through runFromFrames to a non-empty
gold") covering exactly that composition. **[ME-VERIFIED]** from source + the 29-test
report. The label tracked reality rather than ossifying — which is the point of the tag.

### Residual gaps (unchanged / honest)
- `main()`'s thin wrapper (SparkSession builder, env var, quarter `foreach`) is not
  directly invoked by a test — its *composition* is.
- §8 gold interval contract (no-overlap, `accepted <= valid_from`) untested; permutation
  test doesn't cover same-`accepted` ties.
- CI-on-Actions still configured-not-run (needs a push).

---

## Domain B — upstream-label-correction (`/recon`)

### What it did
A single `/recon` decomposed ~23 load-bearing claims into 4 disjoint clusters (headline
numbers / loop+detector impl / integrity hardening / architecture-migration), fanned out
4 recon agents under one shared return contract, had each refute its own findings, then
synthesized. This is `/recon`'s **first independent-domain exercise** — prior to today it
had only been run same-repo (the self-audit), per the 2026-06-27 spine entry.

### Results
- **[ORCH-REPRODUCED] Headline number holds.** F1 0.9143 reproduced by the orchestrator's
  own `TransferValidationEval().evaluate('train')` run — score 0.9142857, precision 0.8421
  (16/19), recall 1.0 (16/16), FP {Training_1,18,19}, FN 0; threshold fixed at 0.5 with no
  tune-on-test; `evaluate('test')` abstains. (Confirmed by the run's shell, not a subagent.)
- **[RUN-REPORTED] Four non-numeric "cracks" — the milestone.** None inflate a number;
  all are doc/mechanism overstatements, with file:line cites:
  1. "4-stage GENERATE→VERIFY→MEASURE→IMPROVE loop, built and tested" — IMPROVE only
     regenerates and never calls the fidelity gate; VERIFY is a separate eval, not a loop
     stage (`clue/loop.py`). → *present-but-does-the-wrong-thing.*
  2. `dual_validate` documented HIGH/REVIEW/**PASS** — PASS branch unreachable
     (`core/cross_omics_matcher.py:210`). → *dead-code/logic.*
  3. "one of six evals" — actually 8 routes (`README:267`). → *miscount.*
  4. fidelity's 2nd detector billed as an "MSE-residual linear model (imports sklearn
     `LinearRegression`)" — fits no regression, raw mean-squared difference
     (`evals/fidelity_gate.py`). → *mechanism-mislabel.*

### Why this matters
The 2026-06-27 spine audit found that **every** logged rigor catch bottomed out in
*recompute-a-number* or *match-a-string* — never a pure semantic/logic/mechanism defect —
and named "≥1 independent-domain `/recon` run that catches a non-numeric defect" as the
explicit gap to close. Cracks 1, 2, and 4 are exactly that class. **So this run
demonstrates the capability the spine had only claimed.**

### The honest bound
The four cracks are **[RUN-REPORTED]**, not re-read in this audit (per direction to record
the run rather than re-verify the target). "Demonstrated once, same operator" — it moves
`/recon` from 0 to 1 independent domain, not to settled.

---

## Ledger impact (`FEEDBACK.md`)
- Promotion table moved **above** the entries (status reads first).
- `fanout-build` 0→1; `implemented-vs-planned` 0→1; `orchestrate` 0→1 (guardrail #8);
  added `integration-runner` at 1; `fanout-recon-synthesize` 0→1.
- `skeptic-verifier` annotated with the VANTAGE **misfire** (default-refute returned 2/4
  false refutations); `verify-the-effect` annotated with the VANTAGE convergent-builder
  datapoint (not an independent-detector catch).
- Nothing promoted to **settled** — every component above is at 1 independent domain or is
  a same-operator convergence; settling needs a genuine second independent domain (and,
  ideally, a second author).

---

## Lessons

1. **Fan-out + skeptics produce leads, not verdicts; the orchestrator's own re-run is
   what discharges.** VANTAGE proved this twice over: run 1, the skeptics' refutations
   were 50% false and only the re-run corrected the record; run 2, the skeptics *agreed*
   (all `true`) and the orchestrator **still** re-ran a clean gate rather than trust the
   agreement. The guardrail (`orchestrate` #8) is the load-bearing part of the loop, not
   the fan-out.

2. **rigor's "numbers-and-strings" scope ceiling is breachable — `/recon` did it.** The
   four upstream cracks are semantic/logic/mechanism defects, the class the spine had
   never caught. But "breachable" ≠ "reliably caught": this is one run, run-reported,
   same operator. Treat it as a demonstrated capability under probation, not a settled one.

3. **When the test *is* the probe, one green run discharges the claim.** VANTAGE run 2's
   `TsvIngestSpec` end-to-end fixture test *is* the `main-real` proof; a clean-green build
   confirmed the claim and the test in one shot. Designing the verification probe to
   coincide with a committed test is stronger and cheaper than a separate refute pass.

4. **Honest `implemented-vs-planned` tags are self-correcting.** Because the VANTAGE
   stub was flagged rather than hidden, the gap was visible, actionable, and closed in the
   next pass — and the closeout language stayed accurate at each step. The tag earns its
   keep precisely when it admits incompleteness.

5. **Dead/interrupted agents get discarded, not summarized.** During this evaluation two
   miner subagents died mid-response (Connection-closed, ~200 tokens, no usable output). The
   correct move was to discard them entirely and re-derive from source/transcript myself —
   never let a partial agent's summary leak into a load-bearing claim. (This is the
   recompute-from-source rule applied to one's own tooling.)

6. **Record a shown run from its result, with an evidentiary line — don't silently
   re-verify the target.** When a `/recon`/build transcript is presented for the ledger,
   the deliverable is the ledger entry, tagged [ORCH-REPRODUCED] vs [RUN-REPORTED]. The
   honesty lives in the *tag*, not in duplicating the run's work. (Saved as a working
   preference for future sessions.)

7. **Second independent domain ≠ second independent author.** The single biggest caveat on
   all of today's wins. Until rigor's components survive a domain driven by someone other
   than this operator, the convergence is "one engineer's consistent habit observed across
   domains," not a law others have independently hit.

---

## What would strengthen this evidence (open items)
- **Independently re-read the four upstream cracks** from source (move them
  [RUN-REPORTED] → [ME-VERIFIED]); confirm crack 2's PASS branch is truly unreachable and
  crack 4 fits no regression.
- **A non-same-author run** of any settled-candidate component — the only thing that
  converts "demonstrated" into "settled" without the operator caveat.
- **A live `sbt test` re-run** of VANTAGE on Temurin 17 to retire the
  UNVERIFIABLE-on-live-rerun caveat.
- **Close VANTAGE's §8 no-overlap + same-`accepted`-tie test gaps** so the gold temporal
  contract is fully pinned, not just the no-lookahead property.
