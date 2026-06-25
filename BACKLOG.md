# Backlog (accretes by use)

## Phase 2 — operating-system layer
- `gate-discipline` skill — acceptance criteria before starting; no stage until
  prior green; close via PR not a local pointer; ADR when criteria can't be met.
- `fanout-recon-synthesize` skill (+ `/recon`) — disjoint parallel recon → refute
  survivors → synthesize.
- `/handoff` command + template — "read this first" brief (state, locked
  decisions, reuse map, invariants).

## Held agents (did NOT fire as named agents in the source session)
- `repo-cartographer` — its job was done by generic explore agents; migrate when
  the named agent actually fires.
- `integration-runner` — its job was done inline by the operator; migrate when it
  actually fires.

## Promotion
A component moves provisional → settled after surviving ≥2 independent domains;
record the evidence in `FEEDBACK.md`.
