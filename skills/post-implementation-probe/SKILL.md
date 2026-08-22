---
name: post-implementation-probe
description: Use when a change record's post-implementation check is written or reviewed — the outcome's probe must be credited by verify-the-effect's non-vacuity rule, never by a checkbox that a deploy "looked fine."
status: provisional
---

# post-implementation-probe

The rigor name is **vacuous-probe rejection**; the change-enablement / SRE name
is **post-implementation review with live evidence, not a checkbox**. A change
record's `outcome.probe` claims the change had the intended effect. This skill
is the **handoff point**, not a second gate: it refuses to credit that claim
until it has passed through `verify-the-effect`'s discipline, in
`check-effect-probe`'s own record shape, and it builds nothing new to check
that. The generic anti-pattern this handoff exists to catch: a post-deploy
check that curls the root and passes whether or not the new artifact is
live — exactly the vacuous probe `verify-the-effect` and
`check-effect-probe` already exist to catch.

## Control shape

| Control | Assigned? | What it does here | rigor unit |
|---|---|---|---|
| Review (judgment) | assigned | a named reviewer reads the `proposal.probe_plan` before execution and refuses a claim whose control is not a real negative control (e.g. "the same request against the previous version, which also returns 200") | skill (this document) |
| Preventive (blocking) | not assigned | no property-4 hook exists; crediting happens after the fact, in the record, not at the change-execution edge - by design, a probe plan is reviewed, not gated at the edge; an empty plan is a P4 detective finding, and the hook does not refuse on it | — |
| Detective (after the fact) | assigned, imported not rebuilt | verifies `outcome.probe` against the non-vacuity rule: `probePassed === true`, `controlRan === true`, `controlPassed === false` | `scripts/check-effect-probe.mjs` (`findVacuousProbes`), invoked by `scripts/check-change-record.mjs` |
| Evidentiary (record) | assigned | `proposal.probe_plan` (pre-registered claim + control + ref) and `outcome.probe` (`{ claim, probePassed, controlRan, controlPassed, ref }`) — the same shape `check-effect-probe` already matches | change-record fields `probe_plan`, `probe` |

## Moves

1. **Read the pre-registered plan before the change runs.** `proposal.probe_plan`
   is `{ claim, control, ref }`, written before execution. Refuse a proposal
   whose `claim` or `control` is missing or empty — a probe plan invented after
   the fact is not pre-registered, it is a post-hoc rationalization.
2. **Name what the control would have to fail against.** A real negative control
   fails against the effect-absent state: the previous version, a rolled-back
   candidate, a request that should not exist yet. Ask, concretely: "if this
   change had done nothing, would this control still pass?" If yes, refuse it.
3. **Do not invent a second matcher.** The outcome's `probe` field is written in
   `check-effect-probe`'s own shape (`probePassed`, `controlRan`, `controlPassed`)
   specifically so the existing matcher runs on it unchanged. This skill's job
   ends at "the plan is non-vacuous and the outcome carries the right shape" —
   `verify-the-effect` and its `effect-prober` agent own running the probe
   itself.
4. **Route a firing forward, not sideways.** A red `findVacuousProbes` result on
   an `outcome.probe` is a `check-change-record` violation (property 4), not a
   new incident type; it closes through the same `learn-from-misfire` /
   ADR-0010 loop as any other vacuous-probe finding.

## Negative control

**Detective twin (must go red):** an `outcome.probe` with `controlRan: false`
(no negative control was ever run); an `outcome.probe` with `controlPassed:
true` (the control passed against the effect-absent state — vacuous by
construction). The two outcome twins are refused by `findVacuousProbes`,
imported unchanged — it is the matcher `verify-the-effect` already owns,
reading an `outcome.probe`'s three fields. A `proposal.probe_plan` whose
`control` field is empty or absent is a **different** twin, checked
differently: it is a form check in `check-change-record`'s **proposal**
pass (property P4), not something `findVacuousProbes` sees, since that
existing matcher reads only outcome-shaped records and a `probe_plan` is
pre-registered, pre-execution — there is no `outcome.probe` yet for it to
match against.

**Reviewer twin (must be refused before the review shape is credited):** a
seeded `probe_plan` whose `control` reads "the same request against the
previous version, which also returns 200" — a control that is guaranteed to
pass regardless of the change, dressed as a real one. The named reviewer must
name it as vacuous by design, not accept it as a plausible-sounding check.
Until that refusal is logged as a firing in `docs/feedback/`, the review shape
here is a stated intention, not a credited control.

## Anti-pattern (correct-shaped lie)

A post-implementation check that returns 200, has a `claim`, and even names a
`control` — but the control is chosen so it can never fail (hitting a static
asset, checking a port is open, re-running the same request the deploy itself
just made succeed). The record has every field populated and reads as
diligence; it verifies the report, not the effect.

## Refute link

"The outcome's probe is clean" is a claim about a JSON record, not about the
deployed system. Refute it by asking `verify-the-effect`'s question directly:
would `controlPassed` have been `false` if the change had never happened? If
nobody can answer that from the record alone, the probe is unevaluable as
evidence, whatever its stored booleans say.

## Record fields

Writes/reads (ADR-0013 §2): `proposal.probe_plan = { claim, control, ref }`
(pre-registered, before execution); `outcome.probe = { claim, probePassed,
controlRan, controlPassed, ref }` (post-execution, `check-effect-probe`'s
shape plus `ref`).

## Honest limit

This property builds **no second detective control**. It cannot run a probe,
judge whether a control is a *real* negative control for the target's
semantics, or tell whether the claim in `probe_plan` matches what actually
shipped — those are `verify-the-effect`'s job (running the probe) and the
named reviewer's job (judging the control's design). What it mechanizes is
narrow: does the outcome record have the form `check-effect-probe` already
requires. Form-only, same as the rest of the detective control in ADR-0013 §5.

## Pairs with

`verify-the-effect` (the discipline this property hands off to), `refute`
(the question "would this control have failed without the effect" is a refute
move), `learn-from-misfire` (where a red finding here closes), `change-class-
earned` (its `nonvacuousProbes` count is **computed by `earnedClassEvidence`
for the human's authorization query** over this property's records, not
gate-enforced here; note also that `criteria.probe_nonvacuous` on an
`authorization` record is form-recorded, not gate-read — the gate checks the
records this property writes, not the criteria field a human wrote down).
