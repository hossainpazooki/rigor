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
