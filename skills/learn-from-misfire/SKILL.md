---
name: learn-from-misfire
description: Use when a check, gate, verifier, or discipline fired wrong — passed something bad, refused something good, or missed what it was built to catch. Runs the loop from incident to pinned regression, so that "we learned from this" becomes a claim someone else can check.
status: provisional
---

# learn-from-misfire

A tool that misfired once will misfire again unless something now fails when it
does. "We fixed it" is a **claim**, and it is the one claim most teams never
refute — the postmortem is written, the action item is agreed, and nobody ever
re-runs the original failure to watch the new gate catch it.

The loop has four stages. Skipping straight to the fix skips the two that matter.

## Moves

1. **Capture** — record what fired wrong, with the artifact trail: the command
   and its output, the record that was wrongly passed or wrongly refused, and
   the commit it happened at. Anchor this at **observation time**. A misfire
   reconstructed from memory later is a capture-shaped lie, and it will get the
   mechanism wrong in the direction that flatters you.

2. **Blameless analysis — the mechanism, never the actor.** The question is not
   who wrote the bad input; it is *what in the system allowed the bad input to
   pass*. This is not politeness. An actor-shaped finding ("they were careless")
   is **unpinnable** — you cannot write a regression test against a person, so
   an actor-shaped analysis guarantees stage 3 fails. Push until the cause is
   something a test could reach.

   The useful form: "the gate compared X, and the defect lived in Y, so no input
   of this class could ever have failed it."

3. **Pin** — turn the misfire into a permanent red path: a test that fails, or a
   gate that exits non-zero, **on the original failure condition**. Then verify
   it the only way that counts: **re-run the original condition and watch the new
   pin go red.** Not by reading the diff, not by reasoning that it should work.
   A pin never seen red on the case that motivated it is an always-green gate,
   and an always-green gate is unevaluable.

   Keep the *original artifact* if you can — the real bad input, minimized. A
   synthetic re-creation tests your understanding of the defect; the original
   tests the defect.

4. **Close** — write the closure record linking capture → mechanism → pin, so a
   later reader who trusts none of it can re-run one line and see for themselves.

## Closure is three-valued

A misfire is closed as **pinned** or **declined**, and anything else is **open**.

- **pinned** — carries the pin *and* the red-proof (the command and its result).
- **declined** — carries an explicit, dated decision not to pin, and who made it.
  Declining is legitimate and common: some misfires are judgment lapses or prose
  disciplines with no reachable test. Declining *silently* is what is banned.
- **open** — legal, and it makes the ledger's completeness **unevaluable**.
  Unevaluable halts: you may not report "every misfire is closed" while one is
  open. Report the open count instead.

The middle state is the whole point. Without it, an unfixed misfire and a fixed
one read identically six months later.

## Anti-patterns (correct-shaped lies)

- **The prose fix.** The response to the misfire is a new paragraph in a
  guideline. Nothing fails if the guideline is ignored, so the discipline decays
  silently and the next occurrence looks like a first occurrence.
- **The pin that was never red.** A test written after the fix, against the fixed
  code, passing on the first run. It proves the current behavior, not that the
  defect is caught — it would have passed before the fix too.
- **The synthetic stand-in.** A cleaned-up fixture that captures your *theory* of
  the defect. When the theory is wrong, the pin is green and the bug is live.
- **Fixing the instance, not the class.** The one bad record is corrected and the
  gate that let it through is untouched.
- **Closure by assertion.** "Addressed in the follow-up" with no pin, no date, no
  decision — the silent middle state wearing the word "closed."

## Claim calibration

Say "pinned, and the pin was seen red on the original input" — not "fixed."
Say "declined on <date>, because <reason>" — not "not applicable."
Say "open" out loud, with a count, rather than omitting it from the summary.
When the mechanism is not yet understood, the honest state is **open**; a pin
built on a guessed mechanism is worse than no pin, because it retires the
incident.

## Self-application

Run this loop over the ledgers you already keep before trusting any of their
"fixed" language: for each recorded misfire, does a pin exist, was it seen red,
or is there a dated decision not to pin? The ones in neither category are the
finding. Report them as a point-in-time audit — do **not** backfill them into
the closure ledger as if they had been captured at the time.

*Mechanized floor: `check-misfire-closure.mjs` gates the closure ledger's form —
required fields, a closure state that carries the evidence it claims, unique ids,
capture-time ordering. It exits 0 clean, 1 on a false closure claim, and 2 when
any record is open. **Standing limit:** it cannot execute a pin, so it verifies
that a claim is shaped to be re-runnable, never that anyone re-ran it. A form
gate is a floor, never a verdict.*
