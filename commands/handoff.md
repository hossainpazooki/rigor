---
description: Produce a "read this first" handoff brief — current state, locked decisions, reuse map, and invariants — for the next session or person.
status: provisional
---

Produce a handoff brief for the topic below by filling in the template. Be
concrete: link files and commits, state each decision as locked with its reason,
and list the invariants a newcomer would otherwise violate. Omit a section only
if it genuinely does not apply; never leave a placeholder.

Write for a skeptical reader: the receiving session runs `/rigor:pickup`
against this brief, which re-verifies your claims instead of trusting them —
so every claim should carry the means of its own re-verification.

Where the brief lands:

- **Single-repo session:** write the filled template to
  `docs/handoff/YYYY-MM-DD-<topic>.md` in that repo and append a pointer row
  to the `docs/handoff/HANDOFF.md` index (create both on first use — confirm
  with the human once per repo; the files sit untracked until the human
  commits them). Entries are immutable once written: a later session writes a
  new entry, never edits an old one. The index holds pointers only, never
  evidence.
- **Multi-repo session** (no single repo owns the work): fall back to the
  operator's shared local briefs folder outside any repo.

This command is also the **sole writer of the repo's learnings ledger**
(`docs/learnings/`, same index-plus-dated-entries shape). Before writing the
brief, curate the session's surviving non-obvious findings — one fact per
`YYYY-MM-DD-<topic>.md` file — each carrying the required record fields:
`ts:` (RFC 3339 UTC), `commit:`, `session:` (transcript pointer), `status:`
(`verified` | `refuted-assumption` | `suspected`), `fact:`, `basis:` (the
command and its output, quoted), `re-verify:` (one executable line). Append a
pointer row per entry to `docs/learnings/LEARNINGS.md`.

**Anchor each entry to the moment its basis was captured, not to the moment
you write it.** `ts:` is when the finding *landed* and `commit:` is what HEAD
*was then* — both read off the clock and the repo as the finding happens, and
carried unchanged into the entry at curation. Being the sole writer at session
close does not make you the sole *observer*: keep findings in a per-run scratch
buffer as they land, stamped there, and curate the survivors at the end. Two
failure modes this exists to prevent, both of which produce a record that looks
anchored and is not:

- **Write-time stamping.** Every entry receives the same `ts:` and the same
  `commit:` — the instant you happened to write them. Distinct findings do not
  land in the same second; identical timestamps across entries are the
  fingerprint of a batch stamp, and `check-learnings` flags them.
- **Anchor drift.** A basis captured mid-session (a test count, a probe output)
  is stamped with the commit that *closed* the session. The quoted output then
  describes a tree that the named commit does not contain. If a basis was
  captured against a tree that has since changed, either **re-capture it now**
  against the commit you are about to name, or say so in the entry
  (`basis: … (captured at <sha>, pre-dates this entry's anchor)`).

Never backfill from memory: a finding without a captured basis is not an entry.
A wrong entry is superseded by a new dated entry with a `kills:` reference,
never edited.

Topic: $ARGUMENTS

--- TEMPLATE ---

# Handoff — <topic>
<date, and the newest commit this brief describes — pick-up measures drift from here>

## Current state
What is built and verified, what is in progress, what is not started. Tag each
item built / in-progress / planned. (Pair with `implemented-vs-planned`.) For
each **built** item add a `re-verify:` line — the one command to run or file
to read that shows it is still true; pick-up executes these rather than
believing the tag.

## Locked decisions
Decisions already made and NOT to relitigate — each with its one-line reason and
a link to the ADR or discussion if one exists. State the reason precisely:
pick-up honors the decision but checks whether the reason still holds.

## Reuse map
What already exists that the next person should use instead of rebuilding —
files, helpers, patterns — with paths.

## Invariants
Rules that must stay true (gates, contracts, the hard rules) and what breaks if
they are violated.

## Open / next
The first thing the next session should pick up, and any blocker in its way.
