# Design — `judgment-dispatch`: tiered model routing for rigor's judgment nodes

**Date:** 2026-07-05
**Status:** Implemented 2026-07-07 — Task-1 pin probe passed (non-vacuous); build record and resolved open questions in [`docs/plans/2026-07-07-judgment-dispatch-plan.md`](../plans/2026-07-07-judgment-dispatch-plan.md)
**Phase:** 4 (orchestration-economics layer). Note: the previously noted "Phase 4
learning loop" (Phase 3 plan, *Future work*) is renumbered by this phase or this
phase takes the next free number — resolve in the README when this ships.

---

## Context

rigor already separates **judgment nodes** (adversarial verification: `skeptic-verifier`,
`effect-prober`, verdict cross-checks, pre-publish `honesty-check`) from **mechanical
nodes** (deterministic `check-*` gates, which need no model at all). Until now, which
model runs a judgment node has been an unmanaged per-call accident of the session.

The thesis of this phase: **efficient use of a premium judgment-tier model (today:
Claude Fable 5) is a core differentiator** — but only if it is shipped as machinery,
not prose. In the measured plugin landscape (2026-07-03 scorecard), rigor's
differentiators counted only where they were mechanical and measurable (~130-token
session footprint; four executable gates). A README claim of "we use the expensive
model wisely" would fail rigor's own standard. This design makes model placement an
architectural decision enforced by a gate.

**The named hazard (drove the design):** stakes are **inferred by the orchestrating
agent** (locked decision below). Inference puts the agent in charge of deciding how
hard its own claims get checked — an agent that under-rates stakes buys itself cheap
verification on exactly the claims that most need the strong verifier. This is the
self-report problem appearing inside rigor's own dispatch. The design neutralizes it
two ways: inference must itself be **refutable** (rubric-driven, logged in the
verdict), and certain nodes are **floored** to judgment tier mechanically, beyond
inference's reach.

## Decisions locked (from brainstorming)

| # | Decision |
|---|---|
| Form | **Shipped component** — a dispatch/routing layer, not positioning prose and not (yet) the measurement play. |
| Stakes | **Inferred by the orchestrating agent** from context, via an explicit rubric; every inference logged and refutable. |
| Floors | Inference modulates the middle band only. `verify-the-effect` verdict cross-check and pre-publish `honesty-check` always dispatch judgment tier. |
| Abstraction | Shipped prose says **"judgment tier" / "cheap tier"**, never a literal model name. Model strings live in exactly two places: agent frontmatter and `models.json`. (Same rule as the plugin's working-name discipline.) Fable (`claude-fable-5`) is the shipped judgment-tier default and the headline. |
| Roadmap | The full-router extension (usage ledger, availability probing, exported checkpoint manifest, per-call override) is **recorded in the roadmap, not built** (see *Roadmap — Phase C* below). This phase's verdict fields are deliberately its raw material. |

## Components (5)

### 1. `judgment-dispatch` skill (policy; sibling of `orchestrate`)

`skills/judgment-dispatch/SKILL.md`, `status: provisional`. Carries the stakes
rubric the orchestrating agent applies before dispatching any verifier:

- **Irreversibility** of the action the claim gates (deploy, migration, publish,
  training run vs. a local refactor).
- **Blast radius** of the claim being wrong (who/what consumes it downstream).
- **Downstream decisions** resting on the claim (is it load-bearing for a gate,
  a release, a published number?).
- **Claimant's refutation history** (a worker with prior refuted claims earns
  a stronger skeptic).

Two hard rules stated in the skill:

1. **Every dispatch logs which rubric criteria fired.** An unlogged inference is
   treated as high-stakes (fail-closed). The inference is a claim; it must be
   refutable like any other.
2. **Inference governs the middle band only:** skeptic *count* and whether
   `refute` move 3 escalates from cheap tier to judgment tier. Floored nodes
   (component 5) ignore inference entirely.

The skill cross-references `orchestrate` guardrail #8 unchanged: dispatching a
verifier — at any tier — never discharges the orchestrator's duty to re-execute
one load-bearing check itself.

### 2. Tiered agent variants

Same prompt body, different `model:` frontmatter:

| Agent | Tier | Frontmatter model (shipped default) |
|---|---|---|
| `skeptic-verifier` | judgment | `claude-fable-5` |
| `skeptic-verifier-fast` | cheap | (cheap-tier default from `models.json`) |
| `effect-prober` | judgment (floored) | `claude-fable-5` |

The two skeptic variants share one body (the existing settled-with-caveats
`skeptic-verifier` prompt); the `-fast` variant is a copy with only the
frontmatter differing, plus a one-line provenance note pointing at the canonical
body. Divergence between the bodies is a defect (`check-tier-sync` flags it).

`config/models.json` maps tier → model string:

```json
{
  "judgment": "claude-fable-5",
  "cheap": "<cheap-tier model string>",
  "fallback_order": ["judgment", "cheap"]
}
```

Model churn is a config edit plus a frontmatter sync, never a prose hunt.
Surface-scrub is unaffected: model strings are confined to frontmatter and
config, which the scrub gate does not scan and which carry no project
fingerprints.

### 3. Verdict schema extension

Every verifier verdict (skeptic and effect-prober alike) gains:

| Field | Meaning |
|---|---|
| `dispatch_tier` | `"judgment"` \| `"cheap"` — the tier the rubric selected |
| `verifier_model` | `{ requested, answered }` — the pinned model and the model that actually answered. A safeguards-routing substitution (e.g. Fable → Opus 4.8 on LLM R&D-adjacent queries) is thereby a **logged** downgrade, never silent. |
| `inferred_stakes` | `"low"` \| `"medium"` \| `"high"` |
| `rubric_criteria_hit` | array of criterion ids from the `judgment-dispatch` rubric |
| `downgraded` | boolean — `answered != requested` or fallback tier used |

These fields are deliberately the raw material of the Phase-C usage ledger
(cost-per-verified-claim), so the ledger bolts on without rework.

### 4. Executable gates (2 scripts)

- **`scripts/check-dispatch.mjs`** — lints a verdict log (JSONL or the structured
  outputs of a fan-out). Flags, fail-closed:
  - high-stakes rubric markers paired with a cheap-tier verifier (the
    fox-and-henhouse case);
  - a floored node whose verdict is not judgment-tier;
  - missing dispatch fields (unlogged inference);
  - silent downgrades (`answered != requested` without `downgraded: true`).
- **`scripts/check-tier-sync.mjs`** — verifies agent frontmatter agrees with
  `config/models.json`, and that the two skeptic variant bodies are identical
  below the frontmatter.

Both: Node ≥18 ESM `.mjs`, side-effect-free on import (CLI gated behind the
`import.meta.url` main-module check, Windows-safe via
`pathToFileURL(resolve(argv[1]))`), tested with `node:test`.

### 5. Floors (mechanical, non-negotiable)

`verify-the-effect`'s verdict cross-check and any pre-publish `honesty-check`
always dispatch judgment tier, regardless of inferred stakes. The floor list
lives in `config/models.json` (a `floored_nodes` array) so `check-dispatch` can
enforce it mechanically rather than by prose.

## Data flow

```
claim
  → orchestrator applies judgment-dispatch rubric (logs criteria hit)
  → tier + variant + skeptic count selected (floors override)
  → dispatch (Workflow tool per orchestrate; never ad-hoc)
  → verdicts carry dispatch fields (schema §3)
  → check-dispatch lints the verdict log
  → orchestrator re-runs one load-bearing check itself (orchestrate #8 — unchanged)
```

## Degradation

Judgment-tier model unavailable in the environment → dispatch falls to the next
tier in `fallback_order` with `downgraded: true` in the verdict. Aggregation
stays null-safe per the existing fan-out survival rules (errored agents return
null; synthesis must not crash). A downgrade is never a silent pass:
`check-dispatch` requires the flag.

## Testing

- `node --test` suites for both scripts against a **fixture verdict log with
  seeded violations** (one of each flag class) — the gate must catch all seeds
  and pass a clean log.
- **Task 1 of the implementation plan is empirical, before anything else is
  built:** verify in a live `claude` session that an agent variant with pinned
  `model:` frontmatter actually runs on that model (read it back from the
  session). Frontmatter dispatch behavior is version-sensitive — same posture as
  the Phase 1 hook-schema verification. If pinning does not hold, halt and
  redesign around whatever dispatch mechanism the current runtime does honor;
  the rubric, schema, floors, and gates are mechanism-independent and survive.

## Status & promotion

Everything ships `status: provisional`. Promotion to `settled` via
`docs/feedback/FEEDBACK.md` under the existing scoped-settled model (≥2
independent contexts; scope caveats stay named inline).

## Roadmap — Phase C (recorded, not built)

The full-router extension, banked deliberately:

- **Usage ledger** — compute **cost-per-verified-claim** from the verdict
  fields this phase logs (tier, model, downgrades) joined with token usage;
  the measured claim that would make efficiency externally demonstrable.
- **Availability probing** — detect judgment-tier availability up front instead
  of discovering it via downgrade.
- **Exported checkpoint manifest** — a machine-readable list of rigor's
  judgment nodes + floors that external routers (e.g. Gastown's model-aware
  molecules) can consume: rigor supplies the *where*, the external router the
  *how*.
- **Per-call model override** — adopt if/when the runtime grows one; collapses
  the two-variant pattern back into one agent.

## Non-goals (this phase)

The ledger and any cost measurement (Phase C); multi-provider routing;
benchmark-based model scoring (that is the external router's job); changing
`skeptic-verifier`'s prompt body or its settled-with-caveats status; any change
to the mechanical `check-*` gates' no-model posture.

## Open questions (for the plan, not blockers)

- Cheap-tier default model string (pick at implementation from what the
  runtime offers).
- Where verdict logs accumulate for `check-dispatch` to lint (per-run artifact
  vs. a session-scoped JSONL) — decide when wiring the fan-out outputs.
- Exact phase number in the README (this vs. the noted learning loop).
