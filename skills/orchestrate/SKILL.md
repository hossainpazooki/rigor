---
name: orchestrate
description: Use when work needs more than one agent — rigor's default is the Workflow tool (deterministic agent/parallel/pipeline), not ad-hoc Agent dispatch or a hand-run review loop, wrapped in the guardrails a bare workflow lacks.
status: provisional
---

# Orchestrate

When a task needs more than one agent, **reach for the Workflow tool** —
deterministic `agent()` / `parallel()` / `pipeline()` / `phase()` that return their
results in-process. Do **not** hand-dispatch `Agent` calls and poll them, and do
**not** hand-run a per-task review loop; those are slower, lossier, and
model-driven where this is deterministic. (Reserve a hand-run loop for the rare
step that genuinely needs human adjudication between iterations.)

## A bare workflow has no guardrails

The Workflow tool will happily fan agents onto overlapping files, with no shared
contract and no verification, and report green. The guardrails are rigor's job:

1. **One shared contract**, defined once and prepended verbatim to every agent —
   the exact interfaces, plus "you own ONLY `<these files>`; code against the
   contract, not each other's files."
2. **Disjoint file ownership.** Overlap is the drift hazard; worktree-isolate
   agents that must mutate files in parallel.
3. **A structured output schema on every agent**, so results merge mechanically.
4. **`pipeline()` by default** — each item flows through all stages without a
   barrier. Use a `parallel()` barrier only when a stage genuinely needs *all*
   prior-stage results at once.
5. **An integration step** (`integration-runner`) that runs the real, named gate to
   green and returns verbatim evidence — not a self-certification.
6. **A skeptic pass** (`skeptic-verifier`) that refutes the **claim**, not just the
   gate. A green gate proves the gate ran, not that the claim is true.
7. **Lint the script with `check-fanout` before you run it** — it flags a fan-out
   missing the contract, the integration step, the verify phase, or schemas.
8. **Never trust the workflow's self-reported green.** After it returns, re-run the
   load-bearing gate yourself — this is `refute`. The same holds for *any* fan-out,
   including a bare `skeptic-verifier` dispatch (`refute` move 3): the dispatch does
   not discharge your duty — independently re-execute at least one load-bearing
   check yourself, since a fan-out can collectively miss what a single direct read
   of the source catches.
9. **Git stays commands-for-the-human** — agents never write history.
10. **Survive the fan-out:** null-safe aggregation (errored agents return null),
    stall-retry, and a token budget — long fan-outs stall and hit limits.
11. **Model placement is part of the dispatch.** Workers (builders, mappers)
    run on the **build tier**, the integration closer and a delegated
    contract author on the **mid tier**; verifiers route
    through `judgment-dispatch`'s stakes rubric. Tier → model lives in
    `config/models.json`, never in the prompt.

## The shapes

- `fanout-recon-synthesize` — decompose a question into disjoint recon, refute the
  findings, synthesize the survivors.
- `fanout-build` — the trustworthy multi-agent build (spike → contract → scaffold →
  build → integrate → verify).
- `check-fanout` — the executable gate over a fan-out workflow script.

This skill operationalizes the operating rule in `rules/workflows.md` onto the
Workflow tool specifically; read that for the why.
