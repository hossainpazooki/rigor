# ADR-0006 — Silent tier collapse: an unpinned swarm is Fable doing all the work, and nothing catches it

**Status:** **Accepted 2026-07-18** — operator ratified the three resolutions in-session and
resolved both pending calls (addendum below); resolutions 1–3 are **built**. Proposed 2026-07-15.

## Context

`orchestrate` guardrail #11 and `fanout-build` step 4 already say, in prose, that workers run on
the **build tier** (`config/models.json` → `claude-sonnet-5`) and verifiers route through
`judgment-dispatch`'s stakes rubric onto the **judgment tier** (`claude-fable-5`). The stated
reason (`fanout-build` §4): "don't burn the judgment tier writing code it will later have to
judge." That separation is the entire premise of "a swarm of specialized Sonnet 5 workers" as
distinct from "Fable doing all the work" — a fan-out is only a swarm if its agents actually run on
a different, cheaper, disjoint-role tier than the orchestrating session.

**The gap: that separation is prose, not mechanism.** `check-fanout.mjs` (the executable gate over
a fan-out script) checks for a shared contract, a schema on every `agent()` call, an integration
step, and a verify phase — it does not check that any `agent()` call in a build/scaffold/integrate
stage carries a model or `agentType` pin at all. Nothing in the shipped surface verifies that
guardrail #11 was followed by a given script; a fan-out with zero tier pins passes `check-fanout`
exactly as cleanly as one that pins every builder correctly.

**Why this is not hypothetical.** A prior session (project memory, `rigor-loop-chassis`,
2026-07-08/09) recorded a transcript-checked fact from the `orchestrate` promotion recon on the
tic build: *the build ran on Fable-5 throughout — not "Fable orchestrates, Sonnet 5 builds" as the
skill prose assumes — because an un-typed `agent()` call in the Workflow tool inherits the
**session** model; a tier pin engages only when the call explicitly sets `agentType` or `model`.*
That finding is carried here as **context, not independently re-verified in this session** — the
same caveat ADR-0005 applied to its operator-provided input. It is load-bearing for this ADR's
Context and should be treated as a claim to re-check (its own `re-verify:` line, once this ADR's
resolution 2 exists, is exactly the mechanism that would have caught it live instead of after the
fact).

**The failure mode, named:** a session running on the judgment-tier model (Fable-5, expensive,
tuned for adversarial refutation) can drive a Workflow script that *looks* like a specialized
swarm — separate `agent()` calls, a contract, disjoint files, a schema — while every one of those
calls silently answers on Fable-5 because nobody passed `model` or `agentType`. The gate is green.
The fan-out completed. Nothing in the surface distinguishes this from a real swarm. Call this
**silent tier collapse**: the swarm illusion holds structurally (parallel calls, schemas, an
integration step) while the tier separation the whole design rests on has quietly not happened.
This is the same shape `judgment-dispatch` already names for verifiers — "a routing substitution
is thereby a **logged** downgrade, never silent" — but that skill's `answered != requested`
discipline covers judgment-tier dispatch only (`skeptic-verifier`, `effect-prober`). It was never
extended to the build tier, because `check-fanout.mjs` predates `judgment-dispatch` and nobody has
gone back to close the gap between the two.

**What this costs when it happens:** none of the stated reasons for tiering hold. Token cost is
wrong (judgment-tier tokens spent on rote file writes). The "don't burn the judgment tier writing
code it will later have to judge" separation — the actual conscience-vs-worker boundary `orchestrate`
and `fanout-build` exist to enforce — silently does not exist for that run. And the run's own
records (Workflow's `journal.jsonl`) capture each agent's *return value*, not which model answered
it, so a silent collapse is invisible even in the artifact meant to make fan-outs auditable —
someone has to go read raw transcripts after the fact, which is exactly what surfaced the tic
finding this ADR is built on.

## Decision (proposed — one mechanism, one convention, zero new plugin surface until ratified)

**1. Extend `check-fanout.mjs` with a build-tier-pin check, mirroring the existing schema check.**
The gate already flags `agent(...)` calls without a `schema:` option (line 24 of the current
script). The same shape — `/\bagent\s*\(/.test(src)` matched against the *absence* of a marker —
extends to tier placement: any `agent()` call inside a stage this script can identify as
build-shaped (heuristically: not inside a `phase('Verify'...)`/`skeptic-verifier`/`refute`-named
block) that carries neither `model:` nor `agentType:` in its options is a new warning class,
`'agent() call without a tier pin: an unpinned call inherits the SESSION model, not the build
tier — the swarm may silently collapse onto whatever model is orchestrating (config/models.json)'`.
This is a heuristic, structural check — exactly as honestly scoped as the rest of `check-fanout`
("checks STRUCTURE... NOT SEMANTICS"). It cannot prove the pinned model is *correct*, only that a
pin exists. That is still strictly more than today, which checks nothing.

**2. `config/models.json` becomes the only place a tier name is written, for builders too.**
`fanout-build` step 4 already says "pass it per call... don't burn the judgment tier" but every
example encodes the string `claude-sonnet-5` directly rather than reading `build` from
`config/models.json`, which is exactly the drift `tier-sync` exists to prevent for agent
frontmatter. Extend `check-tier-sync.mjs`'s discipline (or document the pattern in `fanout-build`'s
`example.mjs`) so a fan-out script reads its build-tier model from config, not from a hardcoded
literal — a config change should not require re-auditing every workflow script by hand.

**3. Extend the `verifier_model` receipt pattern down to workers.** `judgment-dispatch` already
solved "how do you know which model actually answered" for verifiers: append *"End your output
with one line: `MODEL: <name>`"* to the dispatch prompt and log `{requested, answered}`. Reuse the
identical mechanism for build-tier workers in `fanout-build` step 4 and `integration-runner`
dispatches — not because build claims need adversarial-grade scrutiny, but because **this is the
only way a silent collapse becomes visible inside the run's own artifact** instead of requiring
post-hoc transcript archaeology, which is how the tic finding was actually found. Log it to the
same per-run verdict log `judgment-dispatch` already defines, tagged `role: "worker"` rather than
`role: "verifier"`, so `check-dispatch.mjs` can eventually lint both from one file.

**4. Nothing ships to plugin surface until ratified.** Like ADR-0005, this ADR is the artifact. The
three resolutions above are recommendations against a gate (`check-fanout.mjs`), a convention
(`fanout-build`'s example script), and a receipt pattern (`judgment-dispatch`'s existing verdict
log) that already exist — this is a mechanization of an existing rule, not new architecture, and
should ship as a small patch to those three files once ratified, not a new skill.

## Success criteria (when does this ADR earn more than a document)

1. `check-fanout.mjs` flags an unpinned `agent()` call in a build-shaped stage, verified
   **non-vacuously**: run it against a real fan-out script with a deliberately unpinned worker call
   and confirm it goes red, the same discipline used to verify `check-learnings.mjs`'s identical-ts
   check (ADR-0003's 2026-07-14 amendment).
2. A subsequent real fan-out build (the next candidate is tic or ATLAS, per
   `docs/efforts/backlog-settlement/STATE.md`'s open items) is run with resolution 3's receipt
   line, and its verdict log shows `requested: "build"` / `answered:` actually naming a Sonnet-5
   response — not Fable — closing the exact gap this ADR is named for. If `answered` names Fable
   anyway even with pins in place, that is a more serious finding (a pin was silently ignored) and
   gets its own dated entry, not a quiet retry.
3. Promotion rules untouched: this ADR changes a gate and a convention, not the ≥2-independent-
   domain bar any component still has to clear in `docs/feedback/FEEDBACK.md`.

## Decisions pending (operator review)

1. Ratify the three resolutions (gate extension, config-sourced tier reads, worker receipt line).
2. Whether resolution 1 ships as a new warning class inside `check-fanout.mjs` (recommended — one
   gate, one file, matches the existing pattern) or a separate `check-tier-placement.mjs` (more
   surface, cleaner separation of concerns — the operator's call).
3. Whether the tic-build "Fable did all the work" finding this ADR leans on gets independently
   re-verified against that session's own transcript before resolution 1 is built, or whether the
   gate's own non-vacuity test (success criterion 1) is sufficient evidence on its own. Recommend
   re-verifying first — the finding is load-bearing for the whole Context section and has not been
   re-checked this session.

## Consequences

- **If ratified:** the gap between "a Workflow script that looks like a specialized swarm" and "a
  Workflow script that actually dispatches a specialized swarm" becomes mechanically checkable
  instead of resting on whether the orchestrating agent remembered `fanout-build` step 4's prose.
  Token cost and the judgment/build separation both become auditable per run, not just assumed.
- **Risk — the heuristic both over- and under-fires.** `check-fanout`'s own honesty caveat applies:
  a structural check can't tell a deliberately judgment-tier build stage (rare, but not impossible)
  from an accidentally-unpinned one, and can't see through indirection (a helper function that sets
  `model:` two calls away from the literal `agent(...)` text). False positives get silenced with a
  documented escape hatch, not by weakening the check; false negatives are exactly why criterion 1
  demands a red-on-known-bad non-vacuity run before this is trusted.
- **Risk — this becomes vocabulary without a firing.** Like ADR-0005's resolution 3, this could sit
  ratified-but-unbuilt. Mitigated the same way: success criterion 1 requires the gate to exist and
  go red on a real bad script before anything here counts as done, not merely proposed.
- **Cost.** One ADR now. If ratified: a warning-class addition to one existing gate, a doc change to
  one example script, and a field addition to an existing verdict-log schema — no new skill, no new
  command, no new agent.

## Addendum — 2026-07-18: ratification, re-verification outcome, as built

**Ratification.** The operator ratified the three resolutions in-session and resolved pending
decision 2: resolution 1 ships as a **separate gate**, `scripts/check-tier-placement.mjs` — not a
warning class inside `check-fanout.mjs`. (This revises resolution 1's letter — "extend
`check-fanout.mjs`" — placement only; the check's substance is as proposed.)

**Pending decision 3 resolved — the tic finding was independently re-verified, and the ADR's
carried mechanism clause did not fully survive.** A judgment-tier skeptic re-derived the claim from
the raw transcripts (`wf_5e8bf6e5-9df`, session `943d1e81`), and the orchestrator recomputed the
load-bearing numbers first-hand:

- **Empirical part CONFIRMED, stronger than carried:** all 13 workflow agents, **505/505**
  assistant-turn model fields `claude-fable-5`, zero `claude-sonnet-5`; the script carried no
  `model:` anywhere.
- **Mechanism clause PARTIALLY REFUTED:** the Context sentence "a tier pin engages only when the
  call explicitly sets `agentType` or `model`" is wrong about `agentType` — 7 of the 13 agents
  *were* `agentType`-typed (`rigor:integration-runner`, `rigor:skeptic-verifier`) and still
  answered on the session model, because the agent frontmatter said `model: inherit` until commit
  `8ba7d8f` (2026-07-07). **`agentType:` is a pin only when the named agent's frontmatter pins
  `model:`** — so the built gate credits `agentType:` only for agents tier-mapped in
  `config/models.json` `tier_agents` (`check-tier-sync` enforces the frontmatter agreement). A
  gate that accepted bare `agentType:` as a pin would have passed the exact script that motivated
  this ADR.
- **Scope caveat:** "ran on Fable-5 *throughout*" is literally false across all tic work — the
  Jun-30 tic workflows answered `claude-opus-4-8`, matching *that* session's model. This is not a
  counterexample but a second independent demonstration of session-model inheritance.
- Anchored record: `docs/learnings/2026-07-18-agenttype-is-not-a-tier-pin.md`.

**As built (2026-07-18):**

- Resolution 1: `scripts/check-tier-placement.mjs` + `tests/tier-placement.test.mjs` (12 tests,
  incl. the agentType regression by name). **Success criterion 1 met against a real collapse, not
  a synthetic one**: run on the actual tic durability script it goes red with exactly the 3
  unpinned build-stage calls and no false positive on the two tier-mapped `agentType:` calls;
  record: `docs/learnings/2026-07-18-tier-pin-gate-red-on-real-collapse.md`.
- Resolution 2: `fanout-build/example.mjs` now takes tiers from `config/models.json` via
  `args.tiers` and **halts fail-closed** when `args.tiers.build` is absent; the gate flags
  hardcoded model literals as a separate warning class. `fanout-build` step 4 documents the
  pattern.
- Resolution 3: workers return a `model` receipt field (required in their schemas); receipts are
  logged `role: "worker"` to the judgment-dispatch verdict log, and `check-dispatch.mjs` lints
  worker records (missing receipt = fail-closed; `answered != requested` without `downgraded` =
  silent downgrade). `judgment-dispatch` documents the shared-log shape.
- **Success criterion 2 remains open** — no real fan-out build has yet run with receipts in place;
  the next tic/ATLAS build is the test. Criterion 3 untouched (promotion rules unchanged).

---
*Related: `orchestrate` (guardrail #11, the rule this mechanizes), `fanout-build` (step 4, the same
rule with the worked example), `judgment-dispatch` (the `requested`/`answered` receipt pattern
resolution 3 reuses), `config/models.json` + `check-tier-sync.mjs` (the existing single-source-of-
truth precedent resolution 2 extends to builders), ADR-0003 (non-vacuity precedent for a new gate:
verify red-on-bad before trusting green), ADR-0005 (the "ADR is the artifact, zero surface until
ratified" precedent this follows). Evidence: project memory `rigor-loop-chassis` (tic build model-
dispatch facts, transcript-checked in a prior session, not re-verified in this one — see Decisions
pending, item 3).*
