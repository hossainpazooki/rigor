# ADR-0002 — Data-eng verification is judgment, not a universal gate

**Status:** Accepted (2026-07-02)

## Context

The verified object in data engineering (a table, a transform) lives in the
target repo with a schema rigor cannot know. A shipped `check-*.mjs` claiming to
validate arbitrary pipelines would certify pipelines it never understood — the
exact correct-shaped lie rigor exists to catch.

## Decision

Ship the discipline (skills), the refutation moves (refute specialization), and
the fingerprint gate (surface-scrub) — not a universal automated data validator.
The agent applies the checks inside the target repo. Generators (templates
stamped into the target) are deferred to phase 2.

## Consequences

- rigor makes no claim to auto-verify pipelines; the README says so.
- test-path-fidelity and no-lookahead remain semantic: rigor ships how to attack
  them, not automation that closes them.
