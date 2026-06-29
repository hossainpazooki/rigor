# Using rigor on a new repo

Rigor isn't a fixed pipeline — it's a spine you walk as far as the task needs. For a
new repo the canonical order is **orient → recon → refute the load-bearing claims →
honesty-check before you write anything → (build via fanout, gated) → verify-effect
after any irreversible action → handoff.** Recon is the *understand* step; what follows
depends on whether you're auditing, building, or deploying.

## The spine

| # | Step | Command / agent | When you reach for it |
|---|------|-----------------|------------------------|
| 0 | **Map the repo** | `rigor:repo-cartographer` (agent) | Repo is unfamiliar — get module layout, entry points, build/test/deploy commands, refresh `CLAUDE.md`. Skip if you already know the layout. |
| 1 | **Recon** | `/rigor:recon` | Ask the real question ("what's the actual state of X?"). Decomposes → disjoint parallel recon → refutes its own findings → synthesizes, naming what it dropped. |
| 2 | **Refute the specific claims you'll rely on** | `/rigor:verify-claim` | Recon refutes *its* findings, but before you bet a decision on a particular number or a "tests pass," refute that one specifically (recompute from source, re-run the real gate, dispatch `skeptic-verifier`). |
| 3 | **Honesty-check before publishing** | `/rigor:honesty-check` | Before any status into a doc/README/commit/reply — runs the implemented-vs-planned checklist so aspirational work doesn't read as done. |

Steps 1–3 are the **audit loop** — for many tasks you stop here.

## The branches (pick the tail that fits)

**If you're going to build something** (multi-file / multi-agent):
- `/rigor:fanout` — the trustworthy build: one shared contract, disjoint-file ownership,
  scaffold-first, an **integration gate** (`integration-runner` runs the real
  test/validate to green), then a **skeptic pass** that refutes the *claim*, not just the
  gate.
- Underneath it, `orchestrate` is the guardrail: use the Workflow tool (deterministic
  fan-out), not ad-hoc agent dispatch — and never trust the workflow's self-report; the
  orchestrator re-runs the load-bearing check itself.

**If you ran an irreversible action** (deploy, migration, pipeline run, `apply`, publish,
model/data rollout):
- `/rigor:verify-effect` — the success report is a claim about the *action*, not evidence
  of its *effect*. `effect-prober` probes the resulting state, and refuses to credit a
  probe that can't tell the effect's presence from its absence (the non-vacuity /
  negative-control move).

**When you're done / pausing:**
- `/rigor:handoff` — a "read this first" brief: current state, locked decisions, reuse
  map, invariants. Critical because the next session starts cold.

## Two things that are always on (you don't invoke them)
- **git-guard** (PreToolUse hook) — blocks `git commit`/`push`/history-rewrite via Bash;
  rigor outputs the commit command for you instead.
- **session-start** (SessionStart hook) — injects the "reach for refute, keep
  built-vs-planned honest, never write git history" framing at the top of every session.

## The shortest honest path
The everyday minimum is **recon → verify-claim → honesty-check**. Add **fanout** only when
the task involves a real build, **verify-effect** only when you shipped something
irreversible, and **handoff** when you're closing out. Don't run stages the task doesn't
earn.

---
*See also:* `docs/audits/` for what these components have actually caught in practice, and
`FEEDBACK.md` for the per-component promotion ledger (provisional → settled after ≥2
independent domains).
