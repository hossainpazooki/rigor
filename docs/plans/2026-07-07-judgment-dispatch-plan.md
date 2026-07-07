# Plan & build record — `judgment-dispatch` (Phase 4)

**Date:** 2026-07-07
**Spec:** [`docs/specs/2026-07-05-judgment-dispatch-design.md`](../specs/2026-07-05-judgment-dispatch-design.md)
**Status:** Built. All components ship `status: provisional`.

## Phase numbering (resolves the spec's open question)

This is **Phase 4** (orchestration-economics). The learning loop noted in the
Phase 3 plan's *Future work* is renumbered to **Phase 5**. The README carries no
phase numbering, so this file is the record.

## Task 1 — empirical pin verification (ran first, per the spec)

**Claim tested:** an agent with pinned `model:` frontmatter actually runs on
that model in the current runtime.

**Method:** three throwaway probe agents in `dev/.claude/agents/`, each with a
body whose only job is to report the model identity line from its own system
prompt. Dispatched from a fresh headless session (`claude -p --model opus`) so
the negative control's expected answer differs from both pins.

| Probe | `model:` frontmatter | Reported | Verdict |
|---|---|---|---|
| pin A | `claude-fable-5` | `Fable 5 \| claude-fable-5` | pin holds |
| pin B | `claude-haiku-4-5-20251001` | `Haiku 4.5 \| claude-haiku-4-5-20251001` | pin holds |
| negative control | `inherit` (session model: opus) | `Opus 4.8 \| claude-opus-4-8` | control diverges from both pins → probe discriminates, non-vacuous |

**Result: pinning holds.** Build proceeded on the frontmatter mechanism.

Caveats, named:

- **Oracle class: self-consistent.** "Reported" is the model identity the
  runtime asserts in the subagent's own system prompt — not API billing
  metadata. Same limit applies to the `verifier_model.answered` field at
  runtime; the skill documents it.
- **Finding: the agent registry is session-start-static** in this runtime
  (Claude Code, 2026-07-07). Probe agents written mid-session were not
  dispatchable (`Agent type not found`); a fresh headless session picked them
  up. Consequence for users: after installing/updating rigor's agent variants,
  a session restart is required before they dispatch.
- Probe agents were deleted after the run; they are not part of the plugin.

## Resolved open questions (from the spec)

| Question | Resolution |
|---|---|
| Cheap-tier default model string | `claude-haiku-4-5-20251001` — verified live by pin probe B. |
| Where verdict logs accumulate | **Per-run artifact** (JSONL or the fan-out's structured outputs), not a session-wide accumulator — stale records from earlier claims must not mask new violations, and it matches the caller-supplies-the-file pattern of the other check scripts. |
| Phase number | Phase 4; learning loop renumbered Phase 5 (above). |

## What was built

| Component | File(s) |
|---|---|
| Config (single source of tier truth) | `config/models.json` — tiers, `fallback_order`, `floored_nodes`, `high_stakes_criteria`, `tier_agents`, `synced_bodies` |
| Policy skill | `skills/judgment-dispatch/SKILL.md` — rubric (criterion ids: `irreversibility`, `blast-radius`, `downstream-decisions`, `refutation-history`), the two hard rules, verdict record fields, degradation |
| Judgment-tier pins | `agents/skeptic-verifier.md`, `agents/effect-prober.md` — `model: inherit` → judgment tier (frontmatter only; bodies untouched per the spec's non-goals) |
| Cheap-tier variant | `agents/skeptic-verifier-fast.md` — body byte-identical to canonical; provenance note lives in *frontmatter* so the body-sync check stays byte-exact |
| Dispatch gate | `scripts/check-dispatch.mjs` + `tests/dispatch-check.test.mjs` — 4 fail-closed flag classes |
| Sync gate | `scripts/check-tier-sync.mjs` + `tests/tier-sync.test.mjs` — frontmatter↔config agreement + variant body identity |

One deviation from the spec's letter, in its spirit: `high_stakes_criteria`,
`tier_agents`, and `synced_bodies` were added to `models.json` so both gates
stay mechanical (no agent names or criterion ids hard-coded in scripts).

## Gate evidence (2026-07-07)

- `node --test`: **86 pass, 0 fail** (suite includes both new test files).
- `node scripts/check-tier-sync.mjs`: `tier-sync: clean (3 agents)` against the
  real shipped agents — pins agree with config, `-fast` body byte-identical.
- `node scripts/check-dispatch.mjs` on a clean 2-record fixture: `dispatch: clean`.
- Same CLI on a fixture with one seeded violation per class: all **4 classes
  flagged** (fox-and-henhouse, floor, unlogged inference, silent downgrade),
  exit 1.

## Not done (deliberately)

Phase C roadmap items (usage ledger, availability probing, exported checkpoint
manifest, per-call override) — recorded in the spec, not built. No FEEDBACK.md
promotion entries: nothing here has survived an independent domain yet.
