# ADR-0007 — A mid tier: the ladder was three names on two models

**Status:** Accepted 2026-07-22 — operator-directed ("go ahead" on the fourth-tier route),
built same session. **Amended 2026-08-22 (operator-directed):** the mid tier's model is
re-pinned from `claude-opus-4-8` to **`claude-opus-5`** in `config/models.json` and in
both mid-tier agents' frontmatter (`integration-runner`, `skeptic-verifier-fast`),
`check-tier-sync` green after the re-pin. The decision (a mid tier exists and routes
judgment-adjacent work) is unchanged; only the model string moves, and every
2026-08-22 receipt that reads `claude-opus-4-8[1m]` is a record of what answered
*before* the re-pin. The usage-economics premise remains unmeasured on Opus 5 too.

## Context

`config/models.json` declared three tiers but mapped only two models: `build` and `cheap`
were both `claude-sonnet-5`, `judgment` was `claude-fable-5`. Consequences, both observed:

- The ADR-0006 criterion-2 evidence carried a standing caveat — with `build == cheap`, the
  build-vs-cheap distinction was unobservable in receipts; only the fable-vs-sonnet split was.
- Every mid-stakes role was mis-served: the integration closer (judgment-adjacent — diagnosing
  cross-file drift without weakening assertions) ran on the builders' tier, and extra
  medium-stakes skeptic votes ran on the same model as the mechanical builders.

The unlock is an operator observation (2026-07-22): Opus can serve several fan-out stages
without drawing much usage. **That premise is operator-reported, not measured here** — it is
the clause to re-check if this ADR is ever relitigated (`pick-up` move 4).

## Decision

Add a **mid tier** mapped to `claude-opus-4-8` and route judgment-adjacent, non-floored work
to it:

1. `integration-runner` → mid (was build).
2. `skeptic-verifier-fast` → mid (was cheap): low-stakes dispatches and extra medium-stakes
   votes now run Opus.
3. A *delegated* contract author in `fanout-build` earns the mid tier (prose guidance — a
   wrong contract is the most expensive defect a fan-out can produce).
4. **Unchanged, deliberately:** parallel builders and `repo-cartographer` stay on the build
   tier (contract-following volume work is what Sonnet is good at, and the volume stage is
   where usage would actually accumulate); `floored_nodes` stay judgment-tier beyond
   inference's reach; the `cheap` rung stays in config as the terminal `fallback_order` entry
   with no agent currently mapped to it.

`check-dispatch` accepts `"mid"` as a valid below-judgment `dispatch_tier`; fox-and-henhouse
and floor violations apply to it exactly as to `cheap`.

## As built (this session)

Config + `fallback_order` (`judgment, mid, build, cheap`); both agents' frontmatter repinned
(tier-sync gate watched red on the stale pins, then green); `check-dispatch.mjs` mid
acceptance with 3 tests written red-first; prose synced in `judgment-dispatch`,
`fanout-build`, `orchestrate`, `AGENTS.md`, `docs/SYSTEM.md`, `docs/STATUS.md`.

## Consequences

- The receipt ladder becomes genuinely three-way observable (fable / opus / sonnet), which
  strengthens future ADR-0006-style receipt evidence for free — the `build == cheap` caveat
  no longer blinds the mid rung.
- Honest status *(as written 2026-07-22)*: **no mid-tier dispatch has ever run.**
  `skeptic-verifier-fast` has never been dispatched on any tier; this ADR changes its pin,
  not its provisional standing.
  - **Amended 2026-08-18.** Half of that has since changed, and the halves must not be
    conflated. The mid **tier** has run: backlog-settlement runs 4–6 and the payment-loop
    run-1 vote stage all pinned `TIERS.mid`, receipts came back three-way, and
    `check-dispatch` was clean each time. The **agent** claim stands exactly as written —
    `skeptic-verifier-fast` has still never been dispatched. Evidence: no verdict record in
    either effort carries an `agentType` field, and the one committed workflow script
    (`docs/efforts/payment-loop-randomized/runs/run-1-workflow.mjs`) dispatches generic
    workflow agents with a `model:` pin and no `agentType`. `check-dispatch` has no
    agent-identity field in its record schema, so it cannot distinguish the two cases — a
    blind spot of the same class as `check-learnings`' history-blind append-only leg.
    Anything crediting this agent on the strength of those runs would be crediting a
    component that never ran.
