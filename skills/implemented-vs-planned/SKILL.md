---
name: implemented-vs-planned
description: Use before writing any status into a doc, README, commit message, or reply — keeps the built-vs-proposed boundary visible so aspirational work never reads as done.
status: provisional
---

# Implemented vs planned

Keep the line between what is **built** and what is **proposed** visible
everywhere. The failure mode this prevents: a plan, a stub, or a "should work"
reading to a future reader as a finished, working thing.

## The checklist (run before status goes into writing)

1. **Tag every claim** built / in-progress / planned / deferred. If you cannot
   tag it, you do not know its state — find out.
2. **Use precise verbs.** "We built / we run / we propose / future extension" —
   never a blur that defaults to "done".
3. **Mark the boundary in the artifact itself**, not just in your head: a status
   column, a tag, an explicit "not yet" — so the reader sees it without asking.
4. **Aspirational work ships labeled provisional**, not as settled fact.

## Not in scope here

Verifying empirical numbers or re-running gates is **not** this skill — that is
`refute`. This skill is about the honesty of the *status label*; `refute` is about
the truth of the *claim*. Cross-reference, don't duplicate.

## Example

A design doc describes a feature in present tense. Before it ships, tag it:
"proposed — not built". One word turns a claim that would mislead into one that
informs.
