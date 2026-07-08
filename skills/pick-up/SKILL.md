---
name: pick-up
description: Use when starting from a handoff brief — yours from a past session or someone else's. A brief is a batch of load-bearing claims whose author can no longer defend them; pick-up verifies the claims the next step rests on and detects drift before any work begins.
status: provisional
---

# Pick-up

The receiving end of `handoff`. A handoff brief is written by a session that is
gone: every "built", "merged", "green", and "blocked" in it is a claim from a
claimant who can no longer be cross-examined — and the repo may have moved
since it was written. Starting work directly from a brief is trusting a batch
of self-reported successes at once, which is exactly what rigor exists to
prevent. Pick-up is `refute` scoped to a brief.

## The five moves

1. **Read the brief whole, and date it.** Locate the brief (given path or
   topic; otherwise the newest handoff brief in the repo's convention —
   `briefs/`, `docs/`, `HANDOFF-*.md`). Fix its write date and the newest
   commit it references. An undated brief gets no benefit of recency: treat
   every state claim in it as stale until re-verified.
2. **Drift check.** The brief was true — at best — at write time. List what
   the author could not know: commits since the brief's date
   (`git log --oneline --since=...`), the current working tree (`git status`),
   and any change touching files the brief names. Drift is not a failure;
   *unnoticed* drift is.
3. **Refute the load-bearing state claims.** Not everything — the claims the
   brief's "next" rests on. Prefer the brief's own `re-verify:` lines when it
   carries them (post-contract handoffs do); otherwise derive the check:
   "merged" → read the log, "tests green" → run the suite, "file X does Y" →
   read file X. Tag each claim **verified-now / drifted / unverifiable** —
   "the brief says built" is never itself evidence (pair with
   `implemented-vs-planned`). Tier any skeptic dispatch per
   `judgment-dispatch`: the claim gating your first irreversible action earns
   the judgment tier.
4. **Honor locked decisions — but check their premises.** Locked decisions are
   not relitigated; that is what "locked" means. But each one was locked *for
   a stated reason*, and if current reality contradicts that reason, do not
   silently obey it and do not silently override it — surface the
   contradiction to the human and stop on that path.
5. **Re-run the entry gate.** Whatever gate the brief claims green — the test
   suite, the validator, the smoke check — gets one fresh run before you
   build. Its output is your baseline. Red on arrival means the pick-up
   report's confirmed next step is *the fix*, overriding the brief's
   "Open / next" — never build on a red gate (`gate-discipline`).

## The pick-up report

Produce this before the first edit; the report is the deliverable of the
pick-up, the same way the brief is the deliverable of the handoff:

```
# Pick-up — <topic>
## Brief          <path> · written <date> · drift window: <N commits / tree state since>
## State, as verified now
   <claim> — verified-now | drifted | unverifiable — <evidence: command run + result, or file read>
## Drift the brief doesn't know
   <commits / tree changes touching named files, and what they affect>
## Contradicted premises (for the human)
   <locked decision whose stated reason no longer holds — or "none">
## Confirmed next
   <first action, standing only on verified-now ground — with the red-gate override applied if the entry gate failed>
```

## What pick-up is not

Not a full re-audit — only the load-bearing claims get refuted, or picking up
would cost more than the work. Not a relitigation of locked decisions — only
their premises are checked. And not a substitute for reading the code you are
about to change: the brief's reuse map tells you where to look, never what you
would have seen.
