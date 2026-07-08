---
name: judgment-dispatch
description: Use before dispatching any verifier (skeptic, effect-prober, verdict cross-check, pre-publish honesty check) — decides which model tier the verifier runs on via an explicit stakes rubric, logs the inference so it is refutable, and floors the nodes that inference must never be allowed to cheapen.
status: provisional
---

# Judgment dispatch

Which model runs a judgment node is an architectural decision, not a per-call
accident. rigor's judgment nodes (adversarial verification) run on the
**judgment tier**; routine verification can run on the **cheap tier**. The
tier → model mapping lives in exactly two places — `config/models.json` and the
agent variants' frontmatter — never in prose. `check-tier-sync` enforces that
the two places agree.

Workers are not judgment nodes. Builders, the integration closer, and mappers
run on the **build tier** (`orchestrate` guardrail #11, `fanout-build` step 4)
— this rubric governs only who *verifies*, and a worker never inherits the
judgment tier just because the session model is expensive. The claims workers
produce still route through the rubric below.

**The hazard this skill exists to contain:** stakes are inferred by the
orchestrating agent — the same agent whose claims are being checked. An agent
that under-rates stakes buys itself cheap verification on exactly the claims
that most need the strong skeptic. That self-report problem is neutralized two
ways: the inference is itself a logged, refutable claim (`check-dispatch` lints
it), and floored nodes are beyond inference's reach entirely.

## The stakes rubric

Before dispatching any verifier, score the claim against these criteria and
record the ids of every criterion that fired:

| id | Criterion |
|---|---|
| `irreversibility` | The action the claim gates is hard to undo — a deploy, migration, publish, training run. A local refactor is not. |
| `blast-radius` | The claim being wrong damages consumers downstream — other repos, teams, published artifacts, decisions already in motion. |
| `downstream-decisions` | The claim is load-bearing for a gate, a release, or a published number — something else advances only if it is true. |
| `refutation-history` | The claimant has prior refuted claims this session or in the run's ledger — a worker with a record earns a stronger skeptic. |

Stakes derive mechanically from the hits:

- **high** — any criterion in `high_stakes_criteria` (`config/models.json`;
  ships as `irreversibility`, `blast-radius`) fired.
- **medium** — no high-stakes marker, but at least one other criterion fired.
- **low** — nothing fired.

## Two hard rules

1. **Every dispatch logs which rubric criteria fired.** The inference is a
   claim; it must be refutable like any other. A dispatch with no logged
   inference is treated as **high-stakes, fail-closed** — `check-dispatch`
   flags missing dispatch fields, and an unlogged cheap-tier dispatch never
   passes the gate.
2. **Inference governs the middle band only.** What inferred stakes may
   modulate: skeptic *count*, and whether `refute` move 3 escalates from the
   cheap tier to the judgment tier. What it may never touch: floored nodes.
   `floored_nodes` in `config/models.json` (ships with
   `verify-the-effect.verdict-cross-check` and `honesty-check.pre-publish`)
   always dispatch judgment tier regardless of inferred stakes — enforced
   mechanically by `check-dispatch`, not by prose.

## Tier selection

| Inferred stakes | Verifier variant | Skeptic count (guide) |
|---|---|---|
| high (or floored node) | judgment tier — `skeptic-verifier` / `effect-prober` | 2–3 |
| medium | judgment tier for the primary skeptic; cheap tier (`skeptic-verifier-fast`) for additional votes | 1–2 |
| low | cheap tier — `skeptic-verifier-fast` | 1 |

Dispatch goes through the Workflow tool per `orchestrate` — never ad-hoc.

## The verdict record

Every dispatched verification appends one record to the **run's verdict log**
— a per-run artifact (a JSONL file or the fan-out's structured outputs), not a
session-wide accumulator, so stale records from earlier claims can't mask new
violations. Fields, on top of the verifier's own verdict:

| Field | Meaning |
|---|---|
| `node` | The judgment node dispatched (e.g. `refute.move-3`, `verify-the-effect.verdict-cross-check`) — matched against `floored_nodes`. |
| `dispatch_tier` | `"judgment"` \| `"cheap"` — the tier the rubric selected. |
| `verifier_model` | `{ requested, answered }` — the pinned model and the model that actually answered. A routing substitution is thereby a **logged** downgrade, never silent. |
| `inferred_stakes` | `"low"` \| `"medium"` \| `"high"`. |
| `rubric_criteria_hit` | Array of criterion ids from the rubric above. |
| `downgraded` | `true` when `answered != requested` or a fallback tier was used. |

`requested` comes from the variant's frontmatter (synced to config by
`check-tier-sync`). `answered` comes from the verifier itself: append to every
dispatch prompt — *"End your verdict with one line: `MODEL: <name> | <id>`,
verbatim from your own system prompt."* That is a per-dispatch prompt
addition; the canonical agent bodies stay untouched. Note the honest limit:
`answered` is runtime-asserted (read from the subagent's system prompt), not
API billing metadata.

Before the run's claims are trusted, lint the log:

```
node scripts/check-dispatch.mjs <verdicts.jsonl> [config/models.json]
```

## Degradation

Judgment tier unavailable → fall to the next tier in `fallback_order`, with
`downgraded: true` in the record. Aggregation stays null-safe per the fan-out
survival rules. A downgrade is never a silent pass — `check-dispatch` fails
closed on `answered != requested` without the flag.

## What this skill does not change

Dispatching a verifier — at any tier — never discharges the orchestrator's
duty to re-execute one load-bearing check itself (`orchestrate` guardrail #8).
A judgment-tier skeptic's verdict is still a claim, not a result.
