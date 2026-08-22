# rigor — verification & discipline for Claude Code

**Stops you from trusting an agent's self-reported success.** Agent output
often *looks* finished — a green test run, a confident summary, exit code 0 —
while the test exercised a bypass fixture, the number was restated from memory,
or the feature compiles but was never wired in. rigor calls this a
**correct-shaped lie**, and every component in the plugin is one defense
against it: before "tests pass", "deployed", or "done" is believed, the agent
must try to **break** the claim.

```mermaid
flowchart LR
    C["agent: 'done — tests pass,<br/>deployed, 46/46 green'"] --> D{"believe it?"}
    D -->|default| P["merged —<br/>the test exercised a stub, the number<br/>was remembered, the feature was never wired.<br/>Found out later, downstream"]
    D -->|rigor| R{"refute first:<br/>re-run the real gate ·<br/>recompute from the raw source ·<br/>demand a negative control"}
    R -->|survives| T["trusted — written down"]
    R -->|breaks| F["caught now, not in prod"]

    classDef ok fill:#d7f4de,stroke:#2ea043,color:#0f3d1e;
    classDef bad fill:#ffe0e0,stroke:#f85149,color:#6a0d0d;
    classDef n fill:#ecdfff,stroke:#a371f7,color:#3a1060;
    class C,D,R n;
    class T,F ok;
    class P bad;
```

Why believe the premise? Three specimens from this repo's **own ledger** — the
toolkit applied to itself, misfires kept visible:

- A handoff brief recorded **"39 tests passed"** at its own commit anchor;
  re-running the suite gave **46**. Every required field was present and the
  form gate was green — the basis was still fiction. A form gate is a floor,
  never a verdict.
  ([the kill](docs/feedback/2026-07-14-pick-up-tic-brief-killed-a-claim.md))
- rigor's own skeptic once returned **2 false refutations out of 4** on a
  fan-out — caught only because the orchestrator re-ran the gates itself.
  Verifier verdicts are claims too. ([STATUS](docs/STATUS.md))
- A multi-agent build that looked like a swarm of cheap specialized workers
  answered **505 of 505** turns on the expensive orchestrating model — every
  call was unpinned and silently inherited the session model. Invisible in the
  run's own artifacts; found by transcript archaeology; now a gate.
  ([the decision](docs/DECISIONS.md#silent-tier-collapse))

## What ships

- **Refute, don't accept** — the one move under everything: recompute from raw
  sources, re-run the real gate, dispatch adversarial skeptics, demand a
  negative control (a probe that would pass either way proves nothing).
- **Discipline, not content** — 20 skills, 8 commands, 5 agents applied as
  judgment inside *your* repo against *your* gates; deliberately no turnkey
  validator ([why](docs/DECISIONS.md#no-turnkey-validator)).
  Six of the twenty are the **deployment layer**, proposed 2026-08-22 and
  provisional (see below).
- **The expensive model only where it counts** — verifier dispatch is
  stakes-routed across model tiers, floored for the nodes that matter,
  gate-checked for silent downgrades and silent tier collapse
  ([SYSTEM](docs/SYSTEM.md#model-tier-dispatch-putting-the-expensive-model-where-it-counts)).
- **Agents never write your git history** — a hook blocks `git commit`/`push`
  (including wrapped, flag-cluster, and remote-side `gh` forms) and the agent
  emits the commands for you to run. It is friction, not a security boundary,
  and says so.
- **Agents never trigger a deployment** — a second hook refuses deploy-shaped
  commands (`kubectl apply`, `helm upgrade`, `terraform apply`, `gh workflow
  run`, …) unless a committed change record carries the evidence, or a
  committed break-glass record names who/when/why
  ([the deployment layer](docs/DECISIONS.md#deployment-layer), **proposed**).
- **Self-applied** — every component stays *provisional* until it survives ≥2
  independent domains, and the ledger keeps rigor's own misfires visible
  ([STATUS](docs/STATUS.md)).

## Newest layer: pre-change authorization (proposed)

The deployment layer supersedes the data-engineering layer as rigor's latest
addition — the four data-eng skills are **settled (scoped)** and unchanged; this
one is **proposed, fixture-tested, zero domains, zero live runs**, and every
part of it stays provisional until it has been seen red on a known-bad twin in
a real repo.

It sits *upstream* of `verify-the-effect` — before the irreversible step, not
after — and asks one question of an agent's proposed change: **has it earned
the right to proceed?** Six properties, each a control in the shapes it can
make go red (review / preventive / detective / evidentiary): a backout that
**ran against the candidate and exited 0**; artifact bytes attested at review
and recomputed at the edge; a health signal that **halts** on unevaluable
instead of coercing it; a post-implementation probe refused until it has a
negative control; a break-glass record written *before* the bypass; and a
change class every pattern **enters at 2** and only a human demotes. rigor is
the control at the change-approval step — never the pipeline, the CAB, or the
operator. The design's first draft was refuted by three skeptics and its first
build by nine; what ships is what survived five rounds
([the decision](docs/DECISIONS.md#deployment-layer) ·
[build record](docs/plans/2026-08-22-deployment-layer-build.md)).

## Which command, when

| You're about to trust… | Run | What actually happens |
|---|---|---|
| a number, a "tests pass", any agent's "done" | `/rigor:verify-claim` | `refute`: recompute from the raw source, re-run the real gate, dispatch skeptic subagents, check cited sources actually say what's claimed |
| a status doc, README, or commit message | `/rigor:honesty-check` | `implemented-vs-planned`: every claim gets tagged built / in-progress / planned, so proposals can't read as finished work |
| a question too big for one pass | `/rigor:recon` | `fanout-recon-synthesize`: split into disjoint parallel research, refute the findings, synthesize only the survivors |
| a build too big for one pass | `/rigor:fanout` | `fanout-build`: contract-first multi-agent build with tier-pinned workers, an integration gate, and a skeptic pass |
| a deploy / migration / publish that "succeeded" | `/rigor:verify-effect` | `verify-the-effect`: probe the state the action left behind, paired with a negative control — never the action's own exit log |
| the next session (or person) picking this up | `/rigor:handoff` | emits a fixed "read this first" brief: state, locked decisions, invariants — every built claim carrying a `re-verify:` line |
| a handoff brief you've just been handed | `/rigor:pickup` | `pick-up`: refute the brief's load-bearing claims against the current repo, detect drift, re-run the entry gate |

Three hooks run without being asked: **`git-guard`** (blocks agent-initiated git
history writes; per-repo override `RIGOR_GIT_ALLOW=1`), **`change-guard`**
(refuses deploy-shaped commands without a committed change record or
break-glass record — `RIGOR_CHANGE_RECORD`/`RIGOR_CHANGE_ID`, or
`RIGOR_BREAK_GLASS`; provisional), and **`session-start`** (injects the toolkit
pointer before the first claim is made).

## Install

This repo is its own local plugin marketplace. In a Claude Code session:

```
/plugin marketplace add <absolute-path-to-this-repo>
/plugin install rigor@rigor
```

Cross-repo registration and older-harness fallback:
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Tests

```
node --test          # hooks + all 11 check gates; stdlib-only, green is the merge floor
```

The full gate list, one line each: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Where things live

- [docs/SYSTEM.md](docs/SYSTEM.md) — how the layers fit: the refute move,
  code-vs-judgment, model-tier dispatch, the fan-out pipeline, the
  data-engineering layer (settled, scoped), and the deployment layer
  (proposed)
- [docs/STATUS.md](docs/STATUS.md) — what's proven and what isn't, misfires
  included
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — tests, gates, install
- [docs/DECISIONS.md](docs/DECISIONS.md) — the decisions behind the claims on
  this page, each with its status and what is actually built
- [docs/README.md](docs/README.md) — the full docs index: ledgers
  (feedback / learnings / handoff), designs, audits, comparisons
- [AGENTS.md](AGENTS.md) — the canonical repo brief for sessions working here
