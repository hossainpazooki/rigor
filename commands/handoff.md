---
description: Produce a "read this first" handoff brief — current state, locked decisions, reuse map, and invariants — for the next session or person.
status: provisional
---

Produce a handoff brief for the topic below by filling in the template. Be
concrete: link files and commits, state each decision as locked with its reason,
and list the invariants a newcomer would otherwise violate. Omit a section only
if it genuinely does not apply; never leave a placeholder.

Topic: $ARGUMENTS

--- TEMPLATE ---

# Handoff — <topic>

## Current state
What is built and verified, what is in progress, what is not started. Tag each
item built / in-progress / planned. (Pair with `implemented-vs-planned`.)

## Locked decisions
Decisions already made and NOT to relitigate — each with its one-line reason and
a link to the ADR or discussion if one exists.

## Reuse map
What already exists that the next person should use instead of rebuilding —
files, helpers, patterns — with paths.

## Invariants
Rules that must stay true (gates, contracts, the hard rules) and what breaks if
they are violated.

## Open / next
The first thing the next session should pick up, and any blocker in its way.
