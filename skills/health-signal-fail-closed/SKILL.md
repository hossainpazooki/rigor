---
name: health-signal-fail-closed
description: Use when a pre-deploy or rollout health signal is claimed pass or fail — an unreadable signal is a third outcome, unevaluable, and unevaluable halts rather than being coerced into pass (nothing backs out) or fail (a false alarm).
status: provisional
---

# health-signal-fail-closed

rigor name: **fail-closed on unevaluable**. SRE name: **the SLO/SLI gate on a
progressive rollout — an unreadable SLI halts, never passes.** This property
reuses `data-quality-fail-closed`'s three-outcome vocabulary verbatim: a
health signal that cannot be read is the same failure mode as a data-quality
constraint that cannot be computed, and must not be silently coerced into
either terminal state.

## Control shape

| Control | Assigned | What it does here | rigor unit |
|---|---|---|---|
| Review | yes | a named reviewer enumerates the target's own coercion sites — every place an unreadable-metric branch quietly returns pass or fail | skill (this document, applied inside the target repo) |
| Preventive | yes | selects the **latest non-superseded** proposal for the configured change_id (RIGOR_CHANGE_ID) (a duplicate proposal with no `supersedes` is a form violation and is refused), reads that proposal's `health_baseline.verdict` directly — never through a later record that could mask it — and refuses anything but `pass`: `unevaluable` refuses as HALT, `fail` refuses with reason "baseline fail"; any form violation scoped to that proposal (a stale or missing signal field, a naive timestamp, an under-declared radius) is refused the same way; a later `outcome` never overrides this reading | `hooks/change-guard.mjs` |
| Detective | yes, form-only | verifies each verdict equals the fold of its own signals, that a stale signal reads `unevaluable`, and that the baseline/rollout windows sit on the correct side of `ts_proposed`/`ts_executed` | `scripts/check-change-record.mjs` (property P3) |
| Evidentiary | yes | `proposal.health_baseline` and `outcome.health` are the append-only pre- and post-change readings | change-record fields (`health_baseline`, `health.*`) |

## Moves

1. **Vocabulary.** Three outcomes, not two: pass, fail, unevaluable (missing
   metric, stale probe, empty window, zero denominator). Unevaluable is never
   coerced into pass ("no data, so nothing's wrong") or fail ("no data, so
   treat it as broken") — halt and fail are different terminal states.
   `not-in-scope` is a **fourth** label for signals outside the declared
   blast radius; it is never folded into any of the three.
2. **Enumerate coercion sites** in the target's own health logic — every
   `try/except` around a metric read, every default-fill on a missing value
   — `data-quality-fail-closed` move 1, applied to health signals.
3. **Scope before verdict.** Only in-radius signals are evaluated, and the
   declared radius (`blast_radius.declared`) is itself checked — a subset
   test against the actual diff (`blast_radius.plan_diff`) — **before any
   signal is read**. An under-declared radius is caught first, because a
   verdict computed over the wrong radius looks clean and means nothing.
4. **The fold**, applied identically to `health_baseline` and `outcome.
   health`: any in-radius signal `unevaluable` -> verdict `unevaluable`;
   else any in-radius `fail` -> `fail`; else `pass`; zero in-radius signals
   -> `unevaluable` (evaluating nothing proves nothing, so it never defaults
   to pass). The fold is **bidirectional**: an in-radius signal folds to
   `unevaluable` if its `outcome` is absent or unrecognised, if its `source`
   is absent or empty, if its `last_sample_ts` is absent or unparseable, or
   if the relevant window bound is absent — a missing field is a missing
   metric, not a pass. A signal with scope `in-radius` and outcome
   `not-in-scope` is not folded at all; it is a **form violation** — scope
   and outcome disagree about whether the signal counts. A signal with scope
   `not-in-scope` must itself carry outcome `not-in-scope` — reporting it as
   pass or fail is its own, separate form violation.
5. **Stale-sample rule.** A signal is `unevaluable` regardless of its stated
   outcome if `last_sample_ts` is older than the window's `from`, and
   equally `unevaluable` if `last_sample_ts` is **absent** — a stale value
   and a missing value are the same failure mode, and neither is evidence.
   An inverted window (`window.from` after `window.to`) is itself
   `unevaluable`, never a signal-by-signal read; and a sample timestamped
   after `window.to` is not a staleness question at all — it is a form
   violation, a signal reporting from outside the window that was declared.
6. **Two timings.** `health_baseline` is the pre-change reading the hook
   checks (`window.to` not after `ts_proposed` — nobody deploys onto an
   already-unreadable signal); `outcome.health` is the rollout-window
   reading (`window.from` not before `ts_executed`) that the target's own
   pipeline computes live, which rigor only form-checks.

## Negative control

Detective twins that must go red, each a form of the same coercion: the
**"source absent" twin** — an in-radius signal with no `source`, which folds
to `unevaluable` by move 4, paired with a recorded verdict of `pass`; the
fold and the recorded verdict disagree (`pass != unevaluable`), and that
disagreement is the red (source absent -> fold unevaluable -> verdict
`pass` != fold -> red). The **"absent outcome + pass" twin** — an in-radius
signal with no `outcome` (or one outside the vocabulary), again folding to
`unevaluable`, again paired with a recorded `pass` — is the same mechanism on
a different missing field. Also required red: an in-radius signal stale
(`last_sample_ts` before `window.from`) recorded as `pass`; a declared radius
smaller than the actual diff (caught before the verdict is read); and an
honestly recorded `unevaluable` outcome with no break-glass, which must
**halt at exit 2**, never fail at exit 1.

Reviewer twin, required before the review shape is credited: a seeded health
script whose metric read is wrapped in `try/except: return "pass"`. The
record's form checks may pass cleanly; only a reviewer reading the target's
own code catches the coercion site, which no check over the record's shape
can see.

## Anti-pattern (correct-shaped lie)

A validation step that curls a health endpoint a fixed number of times with
no declared window, and whatever happens on failure the pipeline treats as
"proceed anyway" rather than "halt" — a job that reads as a real health gate
because it runs and produces a verdict, while an unreachable endpoint and a
genuinely unhealthy one look identical from outside, and neither backs
anything out.

## Refute link

"The health gate is green" is refuted by checking whether an unevaluable
input was actually fed and actually halted the pipeline (`refute` moves 1-2),
not merely that a `pass` verdict was recorded. A suite that only feeds
well-formed metrics has never exercised the branch this property protects.

## Record fields

Reads and writes `proposal.health_baseline` (`verdict`, `window`,
`signals[]` — `id`, `scope`, `outcome`, `source`, `last_sample_ts`),
`outcome.health` (same shape, rollout window), and `proposal.blast_radius`
(`declared`, `plan_diff`, `plan_diff_source`).

## Honest limit

Form only. The detective control verifies each verdict equals the fold of
its own signals and that windows/staleness hold — it cannot verify the
signal is a good proxy for real health, or that a per-signal fold is the
right aggregation for burn-rate windows or multi-window SLO alerts. Where a
target's real health logic does not reduce to pass/fail/unevaluable per
signal, that mismatch surfaces in the review control (move 2), inside the
target — not in this property's fold.

## Pairs with

`data-quality-fail-closed` (the vocabulary reused verbatim here);
`change-class-earned` (an under-declared radius or a coerced baseline forces
effective class 2 regardless of what was proposed); `post-implementation-
probe` (the rollout-window reading this property only form-checks is the
same evidence that property's probe carries).
