---
name: fanout-build
description: Use when a build is too big for one pass and you'll split it across parallel agents — the discipline that makes a multi-agent build trustworthy: one shared contract, disjoint-file ownership, scaffold-first, an integration gate, and a skeptic pass that refutes the CLAIM, not just the gate.
status: provisional
---

# Fan-out build

Splitting a build across parallel agents is fast and dangerous: each agent can
pass its own tests while the assembled tree is broken, and a green gate can hide a
false claim. This is the pipeline that makes a multi-agent build trustworthy — the
build-shaped sibling of `fanout-recon-synthesize`.

## The pipeline

Run in order; only **Build** and **Verify** fan out.

1. **Spike (+ halt gate).** Prove the riskiest unknown first — does the toolchain
   build, does the dependency resolve, is the assumed approach viable. If the spike
   fails, **halt**; do not let build agents diverge on an unbuildable base.
2. **Contract.** One read-only agent produces the **single source of truth**: the
   exact types, signatures, file→owner map, and reuse points every build agent
   codes against. Emit it as a structured schema.
3. **Scaffold.** One agent owns the **shared files** (manifests, shared types,
   module wiring) and makes the project **compile** with stubbed bodies — so the
   parallel build agents never touch a shared declaration.
4. **Build (fan out).** One agent per file. Each prompt carries the contract
   verbatim and an explicit ownership line: "you own ONLY <these files>; code
   against the contract, not each other's files." Disjoint ownership is the whole
   game — two agents on one file is the drift hazard. Builders run on the
   **build tier** — an unpinned `agent()` call inherits the SESSION model, so a
   swarm with no pins silently collapses onto whatever model is orchestrating
   (silent tier collapse, ADR-0006). Three rules make the tier real:
   - **Pin every non-verify call** with `model:` — the orchestrator reads the
     tier from `config/models.json` and passes it via `args` (a workflow script
     has no filesystem; a hardcoded model literal is drift the gate flags).
     `agentType:` pins a tier only if that agent's frontmatter pins `model:` —
     an `inherit` agent still collapses (live-verified 2026-07-18).
   - **Demand a receipt**: every worker reports the model that actually answered
     (a `model` field in its schema); a mismatch is a **logged** collapse, never
     a silent one — record it `role: "worker"` in the run's verdict log
     (`judgment-dispatch`'s schema; `check-dispatch` lints it).
   - **Gate the script**: `node scripts/check-tier-placement.mjs <script>`
     before running it; don't burn the judgment tier writing code it will later
     have to judge.
5. **Integrate.** One `integration-runner` runs the **real, named gate** to green
   (build + test + lint + a live probe), fixes only the cross-file drift the
   authors could not (they owned only their files), and returns the **verbatim**
   command output — evidence, not a self-certification. It's a worker, not a
   judgment node: build tier (its frontmatter pins it).
6. **Verify (fan out).** `skeptic-verifier`s refute the **load-bearing claim** —
   one per claim, default refuted unless proven, recomputing from raw output.
   Verifier tier is `judgment-dispatch`'s call, not the builder's — the claim
   gating the merge earns the judgment tier.

## The contract — what prevents drift

Define it ONCE and prepend it verbatim to every build agent:
- the exact types and signatures the agents must produce and consume;
- a file→owner map — who owns what, with no overlaps;
- "code against THIS, not each other's files; you own ONLY <files>";
- the hard rules (no new fixtures, never weaken a test, never run git).
Give every agent a structured output schema so results merge mechanically.

## Gate-green is not claim-true (the load-bearing rule)

A passing gate proves the **gate ran**, not that the **claim is true**. The two
diverge constantly — a feature can compile, typecheck, lint, and unit-test green
while being unmounted, unreachable, behind an off flag, or green only on one OS.
Before you write "done":
- **Re-run the named gate yourself** — do not trust the integration agent's word.
- **Refute the claim, not the gate** — is the thing actually wired / mounted /
  reachable by a user, or merely present? One skeptic per claim. (This is `refute`.)
- **Probe execution** — did the path actually *run*, or just pass a test behind a
  flag? "Tests pass" is not "the path ran."
- **Probe the environment** — is "green" a function of the developer's OS? Re-check
  a determinism-sensitive gate on a second platform.
- **Prove the test is non-vacuous** — inject the bug; if the test still passes, it
  proves nothing.

## Survival rules for the fan-out itself

- **One risky stage per run; the human commits between runs.** A long monolithic
  pipeline that dies mid-stage strands a half-mutated tree.
- **A resume run restores the interrupted stage — it must not smuggle in the next
  stage's code.**
- **Tolerate partial results** — agents stall, hit limits, return null; aggregation
  must be null-safe and stalls must retry.
- **Agents never write git** — emit the commit command for the human; close a stage
  via a real merge, not a local pointer.

## Example

A runnable, domain-neutral skeleton of this exact pipeline ships beside this skill
at `example.mjs` (workflow-runtime script). It is the shape two independent real
builds converged on: a shared contract prepended to every disjoint-file build
agent, an `integration-runner` closer on the named gate, and `skeptic-verifier`s
refuting each load-bearing claim — with null-safe result handling throughout.
