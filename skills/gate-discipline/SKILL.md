---
name: gate-discipline
description: Use when work is organized into stages or acceptance gates — keeps you from advancing past a gate that isn't green, recording "done" as a local pointer instead of a real merge, or silently diverging from the spec when a criterion is inconvenient.
status: provisional
---

# Gate discipline

Work that ships under acceptance gates fails in predictable ways: a stage is
declared done before its gate is green, a "done" is recorded as a local note
instead of an integrated change, or the spec is quietly contradicted because
meeting it was inconvenient. This skill is the discipline that prevents those.

## The rules

1. **Define the acceptance criteria before you start the stage.** Write down what
   "green" means — the command that must pass, the artifact that must exist —
   before writing code. If you cannot state the gate, you are not ready to start.
2. **No stage starts until the prior stage's gate is green.** Re-run the prior
   gate yourself; a remembered pass is not a pass. (This is `refute` move 2.)
3. **Close work with a real integration, not a local pointer.** "Done" means the
   change is where the next reader will find it — a merged change, a tagged
   release — not a note in your head or a file only you can see.
4. **When you cannot meet a criterion, open an ADR — do not silently diverge.**
   If a gate is unachievable or the spec conflicts with reality, record the
   decision and its consequence in an ADR and surface it. A buried deviation is
   worse than a flagged one.

## What "green" means

Green is evidence you produced, not a status you asserted. Pair this skill with
`refute` whenever a gate rests on an empirical claim or a self-reported pass.

## Example

A build has three stages, each with a test gate. Before starting stage two,
re-run stage one's gate and read its output (rule 2); if it is green, proceed. If
stage two then needs a spec rule relaxed, write an ADR stating the deviation and
why (rule 4) rather than quietly coding around it.
