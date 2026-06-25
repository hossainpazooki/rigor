# ADR-0001 — Vendor the rules

**Status:** Accepted (2026-06-25)

## Context
The skills reference operating rules (who-i-am, working-style, git,
verification-and-honesty, workflows, agents). A pointer ("assume ~/.claude is
present") half-loads the plugin on a fresh machine: skills load, the judgment they
cite does not.

## Decision
The plugin vendors its own copy of those rules in `rules/`, not a pointer.
`session-start.mjs` injects the vendored copy only when `~/.claude/rules` is
absent. Self-contained beats elegant — portability is the plugin's whole purpose.

## Consequences
- The vendored copy can drift from `~/.claude/rules`. Accepted; managed by
  `rules/PROVENANCE.md` (dated) and periodic re-sync.
- A fresh clone in an unfamiliar shop loads complete and self-supplied.
