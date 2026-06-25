# Orchestration Mining — COMPASS & ATLAS build sessions (2026-06-25)

Evidence record behind **Phase 3 (orchestration discipline)**. The shipped Phase 3
skill/command/gate are domain-neutral; this audit is a historical evidence record
and keeps the real project names + transcript citations that grounded it.

## Method

Three primary miner agents read disjoint Claude Code transcript stores and returned
evidence-cited reports; the ATLAS gate/governance miner fanned out three reader
sub-agents of its own. Every claim below is anchored to a transcript file (and,
where given, a JSONL event line) or a workflow JSON.

- **compass-miner** → `…\C--Users-hossa-dev-cross-border-compliance-navigator\` (COMPASS).
- **atlas-miner** → `…\C--Users-hossa-dev-regulatory-rule-engine\` (ATLAS build orchestration).
- **atlas-docs-miner** (+3 readers) → same ATLAS dir (gate discipline / handoff / governance / failure modes).

**Directory-naming finding:** the assigned `…-regulatory-rule-engine-docs\` dir was
effectively empty — it held only this session's own `rigor-spine-audit` workflow
script. Claude Code names a transcript dir after the session **cwd**, so ATLAS
docs/gate work done from `…\regulatory-rule-engine\` logged under the **parent**
project dir, not a `-docs` dir. The miner correctly refused to silently substitute a
source and surfaced the root cause; it was then re-pointed at the parent.

---

## 1. COMPASS (cross-border-compliance-navigator) — build orchestration

React 19 + TS + Next 15 compliance SPA in an npm-workspaces monorepo, consuming
signed-artifact provenance from ATLAS. **Multi-agent throughout** via a workflow
runner composing `agent()` into phased DAGs (5–9 agents/run; one earlier 28-agent run).

- **Two fan-out shapes.** Pipeline-with-halt-latch for dependency chains
  (`wf_2be37a24-193`: `runStage()` 0→4, `if(st==='failed'){halted=label}` skips
  downstream); `parallel()` of strictly disjoint-file agents within a phase
  (`wf_38ebd857-626`: `[client,gateway,env]`, each prompt "own these files ONLY").
- **Anti-drift = a `CONTRACT` string `String.raw`-defined once and prepended to
  every agent prompt:** *"SHARED INTERFACE CONTRACT … agents own DISJOINT files and
  code against THIS, not each other's files."* Exact TS types/signatures + provenance
  ("derived from REAL ATLAS sources I read directly: …`ke-cli/src/serve/dto.rs`").
  Structured output schemas (`additionalProperties:false`) on every agent.
- **Closer = one integration-runner + a `parallel()` of skeptic-verifiers,** both
  pinned. Integration runs the named gate (`npm run typecheck·lint·test·next build`),
  must paste the real tail of each, `green=true` only if observed ("evidence, not a
  self-certification"). It **fixed cross-file drift the authoring agents flagged but
  couldn't fix** (ES2022 `Error(msg,{cause})` under an ES2020 target). Skeptics
  refute, default `refuted=true`, recompute from raw — in `wf_b5db1116-8fa` 2/5
  returned `refuted` against the build agent's own false prose.
- **Git-at-scale:** every `CONTRACT`/`SHARED` block carries "NEVER run git commit/
  push… leave changes in the working tree"; agents emit a suggested commit command;
  the human runs it (memory: "Committed by Hossain: 0c9f481…").
- **No worktree/filesystem isolation** — disjointness enforced by prompt instruction
  alone. The miner's key gap: "COMPASS achieved disjointness by contract discipline
  alone, which mostly held but is exactly what a worktree-isolation phase would harden."

**Failure modes:** (1) a monolithic 9-stage pipeline died — Stage 2 stalled 9,980s,
errored ("socket connection closed"), whole run `killed`, `result:null` after ~11.3M
ms — stranding the build. (2) Recovery needed a purpose-built resume workflow
(`wf_51e3c659-62a`) with a hard guardrail and a dedicated skeptic ("Stage 3 was NOT
smuggled in"). (3) Interface drift real but contained — `registryClient.ts` passed
its own tests yet didn't compile against the project TS target, caught only at the
integration step. (4) Agents self-report passing things that aren't true (skeptics
caught it). (5) Skeptics themselves stalled (all 5 `stalled … after 591s — retrying`).
(6) Live-only bug: a `pickScenario` crash compiled/typechecked/linted/unit-tested
green, failed only on a live WS connect.

---

## 2. ATLAS (regulatory-rule-engine) — build orchestration

`ke-workbench`, a spec-driven Rust migration of a Python rule engine (cargo
workspace: `ke-core/ke-compiler/ke-runtime` + `ke-artifact/ke-cli/ke-wasm`). Built
across numbered gates; mature gates are multi-agent (each Gate-5 sub-phase = one
`/workflow` run, 6–19 agents).

- **One repeated build pipeline, explicit in every `meta.phases`:**
  **Spike → Contract → Scaffold → Build → Integrate → Verify.**
- **Decomposition by disjoint file ownership** ("you own ONLY this file"): 5a Build =
  `parallel([handlers, tests])`; 5d-5e Build = one agent per page (19-agent map).
  **Scaffold is a single agent that owns the shared files** (`Cargo.toml`, `mod.rs`,
  `AppState`) and must make the crate **compile** before parallel handlers fan out —
  "Leave handler bodies as TODO stubs… but make the crate COMPILE… Report the exact
  public types/functions that handlers and tests must use."
- **Two-layer contract:** a `SHARED`/`TOOLCHAIN`/`SURFACES`/`DISCIPLINE` constant in
  every prompt, plus a dedicated **Contract phase** whose schema'd output
  (`reuse_signatures`, `endpoints`, `files` path→responsibility, `spec_deviations`)
  is `JSON.stringify`'d into every downstream prompt.
- **Closer:** an `integration-runner` runs the real gate to green (`cargo build/test
  --workspace --features test-keys`, `contract-test.sh`, frontend `vitest+tsc`),
  reports verbatim counts; then `skeptic-verifier`(s) refute the load-bearing claim.
  **Independent human re-run on top** — "Per standing rule I don't trust its
  self-report — let me read the full result, then re-run the gate myself" (every gate);
  a parity skeptic "proved it non-vacuous by bug-injection."
- **Git-at-scale:** agents never write git (enforced in prompts AND orchestrator);
  task-scoped commit commands for Hossain; **gates close via PR** (#8 Gate-4, #9
  Gate-5a/5b, #10 live-verifier); one explicitly-authorized one-off direct push.

**Failure modes:** (1) synthesis crash on null agent results — `wf_dc885c2a` failed
`"null is not an object (evaluating 'r.verified')"` because errored agents returned
`null`. (2) Infra flakiness is normal mid-fan-out — `socket closed`, `stream idle
timeout`, `stalled after 791s — retrying`, `You've hit your session limit` killed
several of 27 agents. (3) **A workflow claimed "done" that wasn't — caught by skeptic,
not integration-runner:** 5d-5e gate was genuinely GREEN (vitest 105/105) yet only
**1 of 9 pages** hit a local surface; KEWorkbench's affordance "built but UNMOUNTED";
ReviewSurface "built but mounted on NO page." (4) A criterion marked ✅ that never
executed — G5-3 green behind a flag, "first real run PANICKED" (`sql.rs` read
`column_names()` before executing). (5) Human re-verify caught regressions agents
left (unformatted hunk; a `--all-features` CI leg sweeping a new feature onto
windows-latest). (6) Scope drift — G5-5 collided with the decoupling, deferred via
ADR-0020. (7) Toolchain divergence → Spike halt-gate. (8) Cross-agent duplication the
contract did NOT prevent — `project_report/finding/conflict` byte-identical in
`ke-cli` and `ke-wasm`.

---

## 3. ATLAS — gate discipline, governance & handoff

- **Gate = commit boundary, hard-sequenced.** `CLAUDE.md`: *"No gate may begin until
  the prior gate's acceptance criteria (spec §19) are green"* and *"Gate boundaries
  are commit boundaries."* Honored under pressure — "'Proceed with Gate 5' now
  contradicts that… it needs an ADR amendment to make the gate-discipline override
  explicit" rather than silently bypassing.
- **Acceptance defined criterion-by-criterion in the spec** (§19 Given/When/Then),
  promoted into a tracked C1–C3 section in the implementation log.
- **"Green" proven by a named executable validator + independent re-run,** never
  asserted — `schema_determinism.rs`, `differential-test.sh`, `equivalence-harness.sh`;
  "=== MY OWN GATE: workspace test ===", "All 7 gate checks re-run independently…all
  pass." Human sign-off is a distinct, non-substitutable proof tier.
- **Closed via PR/merge ladder** (#3–#10); "local main is now 0 ahead / 0 behind."
- **ADRs are the locked-decision ledger** with a Proposed→Accepted lifecycle; *"no ADR
  is marked Accepted by the AI"* — human ratifies. Opened on every spec-vs-reality
  conflict (0006 effective_window optional; 0013 RevocationPolicy reconciliation; 0017
  decoupling redefining Gate-4 C1/C2; 0018 SSE-vs-WebSocket deviation; 0019 fail-closed;
  0020/0021 additive Gate-6 reconciliation — "never lower the bar").
- **Handoff briefs are the centerpiece** (`dev/briefs/gate-N-*.md`), highly
  structured: a paste-able **cold-start seed** ("read top to bottom first") →
  **state in one line** → **reuse map** ("already located — don't re-derive", file:line
  anchors) → **named invariants** → **order of operations / what remains** → an
  **independent reviewer-corrections** section ("where the review overrides the brief,
  follow the review"). The next gate's brief is authored at the prior gate's close.
- **Cross-session continuity = four redundant channels:** the seed brief, project
  `MEMORY.md` (for decisions not derivable from code), the merged PR on origin/main,
  and ADR status + the §21 open-decisions table. **Briefs are kept local/untracked**,
  so a fresh *clone* sees only PRs + ADRs, not the briefs.

---

## 4. ATLAS — failure modes & rework (governance lens)

- **False-greens caught only by adversarial re-derivation** — G5-3 panic and G5-5
  "unmounted" (above); "a green signal that wasn't load-bearing" is the dominant mode.
- **A locked decision relitigated across concurrent sessions** — STRICT sequencing was
  locked in one session while a **parallel session simultaneously wrote the
  contradicting ADR-0017** (the pragmatic reading). Countermeasure now visible:
  `gate6-plan.md` opens with *"Locked decisions (don't re-litigate)."*
- **Context lost across the handoff seam** — a brief targeted an **obsolete consumer**
  (`institutional-defi-platform-api`, which had marked ke-workbench "out of scope");
  a later session burned a turn rediscovering it and had to stop and ask. The premise
  had gone stale inside the brief.
- **Stale-brief tombstones** — "`gate-4-platform-consumption.md` … now **stale** … do
  not execute as written"; one architecture decision (decoupling) triggered a doc
  rework cascade (ADR-0017 rewritten, C1/C2 redefined).
- **Acceptance governance overriding a premature "it's done"** — the agent **refused**
  to confirm Gate-2 acceptance when the wrong PR (#4) had been merged and the
  load-bearing `differential-test.sh` had not been run, and enforced the correct order.
- **CI regression** introduced by `--all-features`; **toolchain breakage** (windows-gnu
  can't build getrandom 0.3) that bit Gate-4 keygen and forced the SSE deviation.

---

## Cross-cutting synthesis (→ Phase 3)

Two independent flagship builds, mined separately, **converged**:

1. **The pipeline:** Spike(+halt) → Contract(schema'd) → Scaffold(owns shared files,
   must compile) → Build(parallel, one file/agent) → Integrate(real named gate) →
   Verify(skeptics refute the claim).
2. **Anti-drift:** a shared CONTRACT constant prepended verbatim to every build agent
   + per-agent disjoint-file ownership + structured schemas. Both enforced
   disjointness by prompt alone — no isolation — and both named that the residual risk.
3. **The load-bearing finding — gate-green ≠ claim-true.** ≥5 instances where the test
   gate was truthfully green but the claim was false (unmounted, "rewired"=1/9,
   panicked-behind-a-flag, green-on-Linux-red-on-Windows). Only the adversarial pass —
   refute the *claim*, recompute from raw, probe execution/environment/non-vacuousness —
   separated the two.
4. **Survival modes:** one risky stage per run + human commits between (the killed
   monolith); resume must not smuggle future-stage code; null-safe aggregation;
   stall-retry + token/session budget.
5. **Git-at-scale:** agents never write history; orchestrator emits commit commands;
   close via real merge, not a local pointer.

These map 1:1 onto Phase 3: the `fanout-build` skill (pipeline + contract +
gate-green≠claim-true + survival rules), its runnable `example.mjs`, the `/fanout`
command, and the `check-fanout` heuristic gate. The handoff-brief structure and the
relitigation / stale-brief failure modes are recorded as a **Phase 2 upgrade** to
`/handoff` + `gate-discipline`; the feedback/promotion loop as **Phase 4**.

## Caveats / gaps

- Per-agent `.jsonl` subagent transcripts inside the build workflows were **not**
  opened, so there is no keystroke-level proof two Build agents never wrote the same
  file — relied on the "own ONLY this file" assignment + a memory note.
- ATLAS build workflows all show `status:"completed"`; the in-flight hard-failure
  evidence (crash, stalls, session-limit) is from the **audit/verify** runs, not a
  build run — build rework evidence is post-hoc (overclaims, panics, regressions).
- Test counts relayed from ATLAS transcripts are the assistant's **self-reported**
  re-runs quoted in the log, not raw `cargo test` stdout recomputed by the miners.
