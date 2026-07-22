# ADR-0008 — fanout-loop: one command per iteration, chassis plus tier ladder

**Status:** Accepted 2026-07-22 — operator approved the design in-session
(spec: `docs/specs/2026-07-22-fanout-loop-design.md`); built same day.

## Context

The backlog-settlement effort needs recurring runs, and ADR-0007's tier
ladder needs real dispatches (at acceptance, no mid-tier dispatch had ever
run). Both existed as settled machinery with no composition: the ADR-0004
chassis has no notion of a fan-out, and `fanout-build` has no notion of
recurrence. Hand-running each iteration re-derives the same skeleton every
time and invites drift on exactly the steps (budget, gates, ledgers) that
must not drift.

## Decision

Ship `commands/fanout-loop.md`: **one invocation = one iteration** of a
named effort's loop — pick-up entry, run derivation (queue then sweep),
one tier-laddered Workflow dispatch, receipt + target-gate exit, ledger
writes, emitted commit commands. Recurrence belongs to the host
(`/loop /rigor:fanout-loop <effort>`), self-paced; the command never
schedules its own wakeups.

Authorization: invoking the host loop IS the recorded standing go for L1
iterations (≤150k subagent tokens each); recon-scale halts and asks. Each
instantiation sets a total ceiling, recorded in its first run-log entry.
Termination: two consecutive dry passes, the ceiling, or `paused: true`.

Two open items from prior ADRs are folded into the first instantiation as
obligations, not left dangling: ADR-0004's `check-runlog` gate is built by
run 4 itself (the ADR's "mechanize on the 4th run" condition), and
ADR-0006's receipt normalization was fixed gate-side before any verdict
log from this loop is trusted (`receiptMatches`, fail-closed on ambiguity).

## Consequences

- Every iteration emits a verdict log with the three-way
  Fable/Opus/Sonnet receipt split — each run is also ADR-0006/0007
  receipt evidence.
- The loop inherits the settlement rules it serves: no manufactured
  firings (a dry pass is a logged run), and the domain-credit boundary —
  target-repo adjudications may credit domains; effort bookkeeping is use
  only.
- Honest caveats: the first instantiation is rigor's own effort (use, not
  an independent domain for the command); same operator throughout; the
  mid tier is unexercised until the first iteration actually runs — a
  receipt mismatch there is a finding, not a design failure.
