---
name: verify-the-effect
description: Use after any irreversible action that reports its own success — a deploy, a migration, a pipeline run, an `apply`, a publish, a model/data rollout. The success report is a claim about the action, not evidence of its effect; this verifies the effect by probing the resulting state, never the action's own exit log.
status: provisional
---

# Verify the effect

Every action that changes the world reports its own success: the build compiled,
the migration ran, the `apply` completed, the job exited 0, the rollout finished.
**Every one of those is a claim about the action, not evidence of its effect.**
The action happening is not the world being in the intended state. This skill is
`refute` aimed at actions — the sibling of `gate-discipline`'s "green ≠
claim-true," for the moment *after* you do something you cannot cheaply undo:
never accept an action's success report as proof of its effect; probe the
resulting state instead.

## The rule: the report is not the effect

For any irreversible action, separate the **report** from the **effect**, and
verify the effect:

| The report (a claim) | The effect (refute by probing) |
|---|---|
| build succeeded | the artifact actually starts and runs |
| migration ran | the schema/data is in the intended shape — a row reads back right |
| `apply` complete | the system converged to the declared state |
| job exited 0 | the output it was meant to produce exists and is correct |
| rollout finished | a real request is served correctly |
| publish accepted | the artifact is retrievable by a consumer |
| `passed: true` | the score actually clears the threshold |

## The moves

1. **Probe the resulting state, not the exit code.** Read the world the action was
   supposed to change — query the row, fetch the artifact, hit the endpoint,
   re-derive the output — rather than trusting the success signal. (This is
   `refute` move 2, generalized from "re-run the gate" to "inspect the effect.")
2. **Prove the probe discriminates — run a negative control.** A probe that passes
   against a broken world proves nothing: a `/health` that returns 200 for a
   service serving stubs, a `SELECT 1` that proves connectivity not correctness, a
   smoke test green against a mock. Before you credit a probe, show it **fails**
   against the effect-absent state — the prior version, a perturbed input, shuffled
   labels, an empty output. If it passes both with and without the effect, it is
   **vacuous** — discard it. This is the move that separates verifying the *effect*
   from re-reading the *report*, and the one with the least precedent — most
   "verified" deploys never run it. `scripts/check-effect-probe.mjs` mechanizes the
   shape: an effect-claim is credited only if its probe passed **and** a paired
   negative control failed.
3. **Probe in layers, narrow to broad.** Confirm the substrate is up → the thing
   answers → its dependencies are reachable → a few real cases return what they
   should. A pass at one layer does not imply the next; **name the layers and
   paths you did not probe** — an unprobed path reads as "working" when it is only
   untested.
4. **Cross-check any verdict against its own evidence; fail closed.** When the
   action returns a verdict plus supporting numbers (`passed: true`, `0 errors`),
   recompute the verdict from the numbers and reject on mismatch. A boolean you
   did not recompute is the self-reported green `refute` exists to break.
5. **Make the effect reversible, and prove the reversal.** If the action can leave
   the world broken, it must be undoable; a failed probe triggers the undo and
   **re-verifies** that the reverted state is itself healthy. An action you cannot
   reverse is an unclosed gate, not a finished one.
6. **Name what you verified against.** The probe checked the effect against *some*
   oracle — say which, using `implemented-vs-planned`'s axis: **self-consistent**
   (the same source produced and judged it — dev-grade only), **independent** (a
   separate oracle — claim-grade), or **oracle-gap** (no real oracle yet — name
   the blocker). Never quote a self-consistent probe as production-truth.

Dispatch the `effect-prober` agent to run moves 1–3 adversarially — it probes the
resulting state, tries to show the effect is *absent*, and returns
`VACUOUS-PROBE` when a probe cannot tell the effect's presence from its absence.

## Action types — each has its own oracle and its own vacuity trap

The discipline is one shape; the probe and the control that proves it differ by
action. The trap is always the same: a check that would pass even if the action
had no effect.

| Action | The report (don't trust) | Probe the effect | Negative control (must fail) |
|---|---|---|---|
| Deploy / rollout | rollout finished, `/health` 200 | a real request returns correct output | the same probe against the *previous* version still passes → not testing this deploy |
| Migration | `upgrade head` succeeded | a row reads back in the new shape | the read would have passed *before* the migration → not testing the migration |
| Pipeline / batch job | exit 0 | the output has the expected rows and values | exit 0 with an empty or stale output still passes a presence-only check |
| Publish / release | the registry accepted the push | a consumer pulls and loads the *exact* artifact | a floating tag resolves to an older artifact and still loads |
| Model / eval rollout | `passed: true`, metric ≥ target | the metric holds on a held-out split | the threshold was tuned and scored on the same data, or the metric survives shuffled labels → measures fit, not signal |

The last row is the general form: a verdict produced on the data it is judged
against cannot discriminate the effect from its absence.

## Preconditions the probe assumes

- **The artifact you verified is the artifact that acted** — pinned and immutable,
  content-addressed, with no floating reference that can be re-pointed between
  verify and act. Pin the environment too (a lockfile, a pinned base image and
  dependencies, a seeded random stream) so the effect is reproducible, not a
  moving target.
- **Secrets never enter the artifact or git history** — they are injected at
  runtime; a leaked secret is an effect the action faithfully reproduces.
- **A manual step inside an automated action is an ungated gate** — under momentum
  it *will* be skipped. Gate it, or record it as a hard, checked precondition.
- **Agents never write git history or trigger a production change** — they emit the
  command for the human; a stage closes via a real, reversible transition, not a
  local pointer.

## Worked example: a release / deploy pipeline

The build → promote → deploy chain is this discipline applied end-to-end — a chain
of actions each reporting its own success:

1. **Build one pinned, immutable artifact**; the artifact you test is
   byte-identical to the one you ship.
2. **Gate before the artifact exists** — lint / type-check / tests / scans green
   and re-run, not remembered; a red gate blocks artifact creation.
3. **Promote one direction, strictness rising** — lower environments auto-promote;
   the production transition needs an explicit human action plus a check that
   *this exact artifact* exists in the registry. No stage starts until the prior
   stage's post-deploy probe — not its apply log — is green.
4. **Verify the effect after rollout** — wait for readiness, then probe the live
   state in layers (workload up → healthy → dependencies reachable → real paths
   correct).
5. **Reverse on red** — a failed probe rolls back to the last-good artifact and
   re-verifies the rollback is itself healthy, then alerts.
6. **Report what the green run was verified against** — "validated in staging
   against synthetic load," not "production-ready," until an independent
   production smoke passes.

At no point is "the apply succeeded" accepted as "the service works." The same
moves carry to a **migration** (did a row read back correctly, not just exit 0?),
a **data-pipeline run** (does the output table have the rows?), or a **model
rollout** (does it score on held-out data, not merely load?).

## Pairs with

`refute` (probe, don't trust the report), `gate-discipline` (ordered gates,
re-run not remembered), `implemented-vs-planned` (the validated-against axis).
