# docs/ index

What is authoritative now, what is an append-only ledger, and what is a
point-in-time record. (Added 2026-07-18, when the README was cut down to a
skimmer-first page and its content moved here.)

## Authoritative, current-state (must track the tree)

| Doc | What it binds |
|---|---|
| [`SYSTEM.md`](SYSTEM.md) | How the layers fit: the refute core move, code-vs-judgment boundary, model-tier dispatch, the fan-out worked example, the data-engineering layer. |
| [`STATUS.md`](STATUS.md) | The component status table — settled vs provisional, misfires kept visible. Tracks the promotion ledger. |
| [`DEVELOPMENT.md`](DEVELOPMENT.md) | Tests, the 8 check gates, install (marketplace + cross-repo + session-start fallback). |
| [`adr/`](adr/README.md) | All decisions + the decided-vs-as-built index. |
| [`../AGENTS.md`](../AGENTS.md) | The canonical repo brief: structure, operation, invariants (CLAUDE.md is a stub that imports it, ADR-0003). |

## Append-only ledgers (immutable entries; corrections are new dated entries)

- [`feedback/`](feedback/FEEDBACK.md) — the component promotion ledger
  (provisional → settled after ≥2 independent domains), rigor-only.
- [`learnings/`](learnings/LEARNINGS.md) — anchored, re-executable facts about
  this repo; every entry carries `ts:`/`commit:`/`basis:`/`re-verify:`.
- [`handoff/`](handoff/HANDOFF.md) — session-transition briefs, verified by
  `pick-up` at the other end, never trusted as written.
- [`efforts/`](efforts/) — live effort chassis: a mutable `STATE.md` spine +
  append-only `run-log.jsonl` per effort (ADR-0004).

## Point-in-time records (historical; do not "fix" retroactively)

- [`specs/`](specs/) — designs: the original plugin design
  (`2026-06-25-rigor-plugin-design.md`), judgment-dispatch
  (`2026-07-05-judgment-dispatch-design.md`).
- [`plans/`](plans/) — build records: phase 1, judgment-dispatch, ledger kit.
- [`audits/`](audits/) — the 37-finding spine self-audit and later audits.
- [`comparisons/`](comparisons/) — measured scorecard vs. superpowers /
  SuperML / Anthropic's Data plugin.
- [`session-start-setup.md`](session-start-setup.md) — manual hook
  registration for older harness versions.
- [`using-rigor-on-a-new-repo.md`](using-rigor-on-a-new-repo.md) — onboarding
  walk.
