---
description: Harvest ONE past session for evidence about rigor's own components — index the firings, re-run the controls today, refute the survivors, propose ledger rows. Recurrence belongs to the host loop, never to this command.
status: provisional
---

Harvest the session named below (a transcript id, or empty to pop the queue).
Apply the seven steps in order; halting early is a recorded outcome, not a
failure.

**The rule the whole command exists to serve:** a transcript is a **lead**,
never evidence. A past session's word that a control helped is exactly the kind
of self-report this toolkit refuses everywhere else. Credit comes from
**re-running the control now** — the transcript only says where to look. This is
why harvesting old sessions is not a backfill of a ledger that forbids them:
every credited row describes something executed today.

1. **Pop the queue.** Read the harvest queue (the mutable spine, alongside the
   harvest ledger). Take the first session not already carrying a record. If the
   argument names a session, take that instead. **Nothing left ⇒ record an
   honest dry pass and stop** — never invent a session to feed the loop.

2. **Index, do not read.** Run the session indexer over the transcript
   directory. Work only from its rows — `{session, line, cwd, repo, control,
   kind, exit_signal, domain_eligible}` — and read the transcript **only at the
   cited lines**, in bounded slices. A large transcript must never enter context
   whole; a session that cannot be indexed is `unevaluable`, not skipped.

3. **Classify each firing.** One of: `helped` · `misfired` ·
   `silently-skipped` · `not-applicable` · `unevaluable`. Two rows the indexer
   emits are traps, and both must be read before believing a count:
   - `opportunity` rows are **candidates, not defects**. The detector
     over-produces by construction. A trigger whose obligation was discharged
     somewhere the transcript cannot see is `not-applicable`, and saying so is
     the honest outcome, not a failure to find something.
   - `foreign-gate` rows are another repo's own gates. They are never evidence
     about a rigor component, however green they ran.

4. **Convert lead into evidence.** For every firing worth crediting, **re-run
   that control today** against the current state of the repo it fired in, and
   record the command and the exit code you actually observed. Un-re-runnable —
   the repo moved, the state is gone, the artifact no longer exists — is
   `unevaluable`. A third outcome is not a failure to try; coercing it into
   pass or fail is the defect. **The re-run command must be read-only**: a
   verifier will execute it.

5. **Refute the survivors.** Dispatch skeptics per surviving candidate at the
   tiers `judgment-dispatch` assigns, prompted to *break* the reading — that a
   "helped" was incidental, that a "silently-skipped" was discharged elsewhere,
   that a re-run exercised something other than what it claims. Only what
   survives stays credited.

6. **Write, then gate what you wrote.** Append one record per adjudicated
   candidate to the session's harvest record (append-only, `n` +1 monotonic; a
   correction is a new record with `supersedes`, never an edit). Run the harvest
   gate on the file and fix the record until it is clean — the gate, not your
   reading, decides the record is well-formed. Then mark the session done in the
   queue.

   **This command never writes the promotion ledger.** It emits *proposed* rows
   for the human, each carrying its lead, its re-run, and what the skeptics
   tried. Promotion is the human's act; harvesting is not a way to grant a
   component credit on its own authority.

7. **Emit the commit commands** for what was written, grouped by repo, and stop.
   Never commit.

**Budget.** One session per invocation. If the indexed firings for a session
exceed what one pass can adjudicate honestly, record the ones you did, leave the
rest queued, and say so — a partial record that is true beats a full one that is
assumed.

Session: $ARGUMENTS
