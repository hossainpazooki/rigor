---
name: refute
description: Use before trusting or writing down any load-bearing claim — a number, a "tests pass", a subagent's "done", any assertion a decision rests on. Tries to break the claim four ways before it survives.
status: provisional
---

# Refute

A claim is "true" only after it survives a genuine attempt to break it. Run this
on any **load-bearing** claim before it goes into a doc, a commit message, a
status report, or a reply — especially a claim of success you did not personally
watch happen.

## The four moves

Apply every move that applies to the claim:

1. **Recompute.** If the claim contains an empirical number, recompute it from the
   raw source (the log, the file, the API response) at the point of claiming.
   Never restate a figure from memory or from a summary.
2. **Re-execute the gate.** If an acceptance gate exists — a test suite, a
   validator, a build, a reproducible check — run it yourself. Do not trust a
   reported pass. "The suite is green" is a claim; the green suite is the evidence.
3. **Dispatch skeptics.** Spawn independent skeptics (the `skeptic-verifier`
   agent), each prompted to *refute*, not confirm. The claim survives only if it
   withstands them; raise the vote threshold with the stakes. Dispatching
   skeptics does not discharge your duty — independently re-execute at least one
   load-bearing check yourself; a fan-out of skeptics can collectively miss what a
   single direct read of the source catches (this is `orchestrate` guardrail #8
   applied to a bare skeptic dispatch).
4. **Check citation fidelity.** Every named source/identifier/quote a claim
   attributes to a file or document must actually appear in that source; grep the
   cited source — a citation that does not hit is fabricated or drifted.
   `scripts/check-citation-fidelity.mjs` mechanizes the check: *you* supply the
   `(identifier, source)` pairs and it flags any identifier that does not appear in
   its cited source (it greps the pairs you give it — it does not extract citations
   from prose for you).

## When it survives

Write the claim down with the evidence attached (the recomputed number, the gate
output, the skeptic verdicts). When it does not, say so plainly and adjust —
a flagged unknown beats a confident wrong answer.

## Example

A worker reports: "migration complete, all 412 checks pass, per `SPEC.md §19`."
Refute: re-run the check command yourself (move 2) and read the count from its
output (move 1); if it prints 0 failures over 412, dispatch two skeptics to attack
the strongest-looking claim (move 3); and grep `SPEC.md` for `§19` to confirm the
cited section exists and says what the worker claims (move 4) — don't lean on the
skeptics for that, read the source yourself. Only a claim that survives all four is
"complete."

## Red flags that mean STOP and refute

"It probably passes." "The subagent said it's done." "I remember the number was…"
"Looks right." Each is an untested claim wearing the clothes of a fact.
