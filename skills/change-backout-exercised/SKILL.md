---
name: change-backout-exercised
description: Use when a change record claims a backout plan exists — a backout is not credited until it has been run against the candidate, before the deploy, and exited 0; a written-but-unrun backout is the correct-shaped lie this catches.
status: provisional
---

# change-backout-exercised

rigor name: **rollback-before-rollout**. SDLC/SRE name: **the backout plan,
tested, not written**. A change record is not credited with a backout because
it names one — it is credited only after the backout path has been run
against the candidate, before the deploy, and exited 0. A backout plan that
exists only in prose is indistinguishable, on paper, from one that works.

## Control shape

| Control | Assigned | What it does here | rigor unit |
|---|---|---|---|
| Review | yes | a named reviewer checks that `backout.run_ref` really points at a run against *this* candidate, not a plausible-looking one from a different candidate | skill (this document, applied inside the target repo) |
| Preventive | yes | refuses a change record whose backout is `described`, failed, unattributed, run against a different identity, or carries a `kind` outside the five-value vocabulary — an out-of-vocabulary `kind` is refused at the edge, the same as any other form violation scoped to the proposal | `hooks/change-guard.mjs` |
| Detective | yes, form-only | verifies `backout.kind !== 'described'`, `exit_code === 0`, `run_ref` non-empty, `exercised_against === identityDigest(artifact.identity)` | `scripts/check-change-record.mjs` (property P1) |
| Evidentiary | yes | the `proposal.backout` fields are the append-only record of what ran, against what, with what result | change-record line (`proposal.backout`) |

This is the one property that takes all four shapes — stated in ADR-0013 §3,
property 1 — because a written-but-unexercised backout is the single most
common correct-shaped lie a change record can carry.

## Moves

1. Read the target's own deploy pipeline for what its "rollback" step actually
   does, and when it runs. Ask specifically: does anything execute a reverse
   path *before* the candidate goes live, or does the pipeline only back out
   after its own deploy step fails? Those are different claims; only the first
   is a tested backout.
2. Terraform has no rollback; for it, exercised means either
   reverse-plan-ephemeral (a) or state-snapshot-restore (b). For each
   declared backout `kind`, confirm it is one of the four real shapes and not
   a fifth thing wearing one of their names: `rollout-undo` (an
   orchestrator's native reverse of the running rollout), `previous-rendered-
   manifest` (the last-known-good manifest re-applied, not re-derived from
   source), `reverse-plan-ephemeral` (the Terraform (a) path: the reverse
   plan applied to an ephemeral workspace against a *copy* of state), or
   `state-snapshot-restore` (the Terraform (b) path: a state snapshot
   restored and rehearsed against the candidate). "Apply the previous module
   version" from source is never a backout — it re-derives, it does not
   reverse — and it is never credited as one.
3. Check that the `run_ref` the record cites resolves to a real, inspectable
   run log, and that the log's target matches `exercised_against` — the
   identity digest of *this* proposal's `artifact.identity`, not a
   look-alike candidate from an earlier or later change.
4. Confirm the exit code recorded is the exit code of the backout run, not of
   the deploy it is meant to protect — a failed backout (`exit_code: 1`) is
   not credited, even if it ran.

## Negative control

Detective twins that must go red before this property is credited: `backout.
kind: "described"` (a claim, not evidence); `exit_code: 1` (it ran and
failed — the discipline this property exists to catch, and the exact case an
earlier draft of this control credited by mistake); `run_ref` empty; and
`exercised_against` naming an identity digest that is not this proposal's.
All four must fail the detective control (`findChangeRecordViolations`,
property `P1`) before the property is trusted on real records.

Reviewer twin, required before the review shape is credited: a seeded
proposal whose `run_ref` points at a backout log that is real and passed —
but against a *different* candidate's identity. The form checks all pass;
only a reviewer reading the run log against the record's own
`artifact.identity` catches the mismatch. Until a named reviewer has refused
this seeded instance and the refusal is logged, the review shape here is a
stated intention, not a control.

## Anti-pattern (correct-shaped lie)

A change record with `backout: { kind: "rollout-undo", run_ref:
"ci-run-4471", exit_code: 0, exercised_against: <this candidate's
identityDigest>, by: "ci" }` that reads as fully credentialed — every field
present, including the identity binding and the actor, the exit code clean —
where `ci-run-4471` is the deploy pipeline's *own* post-failure rollback step,
which only ever fires after its own deploy job fails. Nothing ever exercised
the backout against the candidate before rollout; the record is form-complete
and the only defect is the substantive one no field-level check can see: the
run it cites never ran *before* the deploy it is supposed to protect.

## Refute link

"The backout is tested" is a load-bearing claim about a specific run, not
about the record's shape. Refute it the way `refute` move 2 asks: re-execute
or re-read the cited `run_ref` directly, confirm it targeted this candidate's
identity and not a plausible neighbor, and confirm the exit code is the
backout's own. A record that merely names a `run_ref` has not been refuted
until that ref has been opened.

## Record fields

Reads and writes `proposal.backout` (`kind`, `exercised_against`,
`exit_code`, `run_ref`, `by`) and `proposal.artifact.identity` (to compute
`exercised_against` via `identityDigest`). `backout.kind` is one of five
enumerated values: `rollout-undo`, `previous-rendered-manifest`,
`reverse-plan-ephemeral`, `state-snapshot-restore`, or `described` (a claim,
not evidence, and never credited). Any other string — `apply-previous-
module`, or any name not on that list — is a form violation and is never
credited, whatever it claims to describe. Property 6 (`change-class-earned`)
reads this property's outcome too: a class-0 authorization with
`criteria.backout_exercised: true` requires a *credited* backout on the
instance citing it, not merely a described one.

## Honest limit

Form only. The detective control confirms the record's shape — that a
backout ran, against the right identity, and exited clean — and cannot
confirm the backout *actually reversed the candidate's effect*. Verifying
that a rollback genuinely restored prior behavior is a validator that
understands the target's semantics, which ADR-0002 refuses to build; that
judgment stays with the review control and the authorization's
`backout_rule`, applied inside the target repo.

## Pairs with

`release-artifact-integrity` (the identity this property's `exercised_against`
digests); `change-class-earned` (reads whether a backout was credited as one
of the two class-0 promotion criteria); `verify-the-effect` /
`post-implementation-probe` (post-change evidence that a backout was even
needed — different timing, same discipline of not trusting a self-report).
