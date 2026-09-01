# docs/ index

What is authoritative now, what is an append-only ledger, and what is a
point-in-time record. (Added 2026-07-18, when the README was cut down to a
skimmer-first page and its content moved here.)

## Authoritative, current-state (must track the tree)

| Doc | What it binds |
|---|---|
| [`SYSTEM.md`](SYSTEM.md) | How the layers fit: the refute core move, code-vs-judgment boundary, model-tier dispatch, the fan-out worked example, the data-engineering layer. |
| [`STATUS.md`](STATUS.md) | The component status table — settled vs provisional, misfires kept visible. Tracks the promotion ledger. |
| [`DEVELOPMENT.md`](DEVELOPMENT.md) | Tests, the 10 check gates, install (marketplace + cross-repo + session-start fallback). |
| [`DECISIONS.md`](DECISIONS.md) | The bridge from the README's claims to the decisions behind them (the README carries no ADR numbers; this page does). |
| [`adr/`](adr/README.md) | All decisions + the decided-vs-as-built index. |
| [`wap-bridge.md`](wap-bridge.md) | The earned reader's bridge to write-audit-publish (ADR-0005, settled 2026-07-19): the mapping, the polarity upgrade, both firing records. |
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
- [`learn/`](learn/LEARN.md) — the misfire **closure** ledger: mechanism, pin,
  and the pin's red-proof (ADR-0010, **Accepted 2026-08-18**).
  Starts empty; capture stays in `feedback/` and `learnings/`.
- [`harvest/`](harvest/HARVEST.md) — past sessions mined for evidence about
  rigor's own components (ADR-0014, **Proposed**). A transcript is a lead; every
  credited record carries the read-only re-run executed *today* and its observed
  exit. Proposes rows for `feedback/`; never writes them.

## Point-in-time records (historical; do not "fix" retroactively)

- [`specs/`](specs/) — designs: the original plugin design
  (`2026-06-25-rigor-plugin-design.md`), judgment-dispatch
  (`2026-07-05-judgment-dispatch-design.md`).
- [`plans/`](plans/) — build records: phase 1, judgment-dispatch, ledger kit,
  and the 2026-08-22 deployment-layer build (ADR-0013 — its fan-out scripts,
  verdict log, and the skeptic findings from both rounds).
- [`audits/`](audits/) — the 37-finding spine self-audit and later audits,
  including the 2026-08-18 misfire-closure survey (5 pinned / 0 declined / 8 open).
- [`comparisons/`](comparisons/) — measured scorecard vs. superpowers /
  SuperML / Anthropic's Data plugin.
- [`contributions/`](contributions/STRATEGY.md) — the open-source contribution
  umbrella: `STRATEGY.md` is the mutable working reference (targets, lane
  rules, claim-card discipline); dated entries beside it are point-in-time
  evidence records and adjacency surveys (the 2026-07-21 DQX survey moved
  here from an uncommitted comparisons addendum, provenance stated in-file).
- [`session-start-setup.md`](session-start-setup.md) — manual hook
  registration for older harness versions.
- [`using-rigor-on-a-new-repo.md`](using-rigor-on-a-new-repo.md) — onboarding
  walk.
