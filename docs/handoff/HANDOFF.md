# Handoff ledger (index)

Transition records — "read this first" briefs frozen at a session boundary.
Entries live beside this file as dated immutable markdown files,
`YYYY-MM-DD-<topic>.md` (chronological listing, newest at the bottom), written
by `/rigor:handoff` and consumed by `/rigor:pickup`, which re-verifies their
claims instead of trusting them.

Each well-known file owns one tense: CLAUDE.md / AGENTS.md are timeless (what
the repo is), a live effort's STATE.md is the mutable present, a handoff entry
is a past→future transition frozen at write time, and run logs / transcripts
are captured past. Pick-up reading order: **repo context → STATE.md (if an
effort is live) → this index → the latest entry → refute its load-bearing
claims before building.**

Entries are immutable once written: a brief is a batch of claims from a
session that can no longer defend them — corrections belong in the *next*
brief, never in edits to an old one. This index holds pointers only, never
evidence.

## Entries

| Date | Entry | Topic / next step |
|---|---|---|
| 2026-07-15 | [2026-07-15-rigor-loop-engineering-conclusion.md](2026-07-15-rigor-loop-engineering-conclusion.md) | Session conclusion — ledger kit + ADR-0004 pilot settled + ADR status index + ADR-0006 proposed. Next: ratify ADR-0005/0006, re-verify the tic-Fable-throughout claim before building ADR-0006 resolution 1 |

Prior sessions' briefs live in `~/dev/briefs/`, the pre-ADR local convention, which remains the
fallback for genuinely multi-repo sessions.
