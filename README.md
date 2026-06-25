# rigor — verification & discipline for Claude Code

**rigor** packages the operating discipline of a careful engineer into a portable
Claude Code plugin. Its **verification spine** (Phase 1) refutes load-bearing
claims before they are trusted, keeps the built-vs-planned line honest, and never
lets an agent write your git history. Its **operating-system layer** (Phase 2)
adds the wider loop: decompose a question into disjoint parallel recon and keep
only what survives refutation, hold staged work to its gates, and hand off clean.
Every example is domain-neutral, so a clone reads as nobody's specific stack.

## How it works

A layered workflow: two always-on hooks frame every session, the **verification
spine** breaks load-bearing claims, the **operating-system layer** runs the wider
recon → refute → synthesize → gate → handoff loop, and the **orchestration layer**
routes multi-agent work through the Workflow tool under rigor's guardrails. Commands
are thin entry points; skills carry the judgment; agents and hooks do the enforcing.

```mermaid
graph TD
    subgraph always["Always on"]
        SS["session-start<br/>surfaces toolkit + rules"]
        GG["git-guard<br/>blocks agent git-history writes"]
    end

    subgraph spine["Phase 1 · verification spine"]
        VC["/verify-claim"] --> REF["refute<br/>recompute · re-run gate · dispatch"]
        REF --> SK["skeptic-verifier"]
        HC["/honesty-check"] --> IVP["implemented-vs-planned"]
    end

    subgraph osys["Phase 2 · operating-system layer"]
        RC["/recon"] --> FRS["fanout-recon-synthesize<br/>decompose · fan-out · synthesize"]
        GD["gate-discipline"]
        HO["/handoff"]
    end

    subgraph orch["Phase 3 · orchestration discipline"]
        ORC["orchestrate<br/>default to Workflows + guardrails"]
        FO["/fanout"] --> FBS["fanout-build<br/>contract · disjoint · gate · refute claim"]
        CF["check-fanout<br/>lints the workflow script"]
    end

    SS --> spine
    SS --> osys
    SS --> orch
    ORC --> FBS
    ORC --> CF
    FRS -. refutes findings via .-> REF
    FBS -. refutes the claim via .-> REF
    GD -. re-runs the gate via .-> REF

    classDef always fill:#3a2e1a,stroke:#d29922,color:#e6edf3;
    classDef p1 fill:#16331f,stroke:#2ea043,color:#e6edf3;
    classDef p2 fill:#16263a,stroke:#388bfd,color:#e6edf3;
    classDef p3 fill:#2e1a3a,stroke:#a371f7,color:#e6edf3;
    class SS,GG always;
    class VC,REF,SK,HC,IVP p1;
    class RC,FRS,GD,HO p2;
    class ORC,FO,FBS,CF p3;
```

### A sample run

Say you're adding a feature too big for one pass. With rigor loaded:

1. **Session start.** `session-start` surfaces the toolkit — including the rule to
   reach for the Workflow tool, not ad-hoc agent dispatch.
2. **Orchestrate.** You follow `orchestrate`: author the run as a `fanout-build`
   workflow and `check-fanout` it first — it confirms the script carries a shared
   contract, an integration step, a verify phase, and output schemas.
3. **Spike → Contract → Scaffold.** The workflow proves the riskiest unknown builds
   (or halts), writes one shared contract (exact interfaces + a file→owner map),
   and scaffolds the shared files until the project compiles.
4. **Build (fan out).** One agent per file, each carrying the contract verbatim and
   owning only its files — so the parallel writers never collide.
5. **Integrate.** An `integration-runner` runs the real, named gate to green and
   returns the verbatim output — evidence, not a self-report.
6. **Verify.** `skeptic-verifier`s refute the *claim*, not just the gate: is the
   feature actually wired and reachable, or merely present? A green gate hiding an
   unmounted feature gets caught here.
7. **Don't trust the green.** The workflow reports done; you re-run the load-bearing
   gate yourself (`refute`) before believing it.
8. **Commit.** `git-guard` blocks any agent from writing history; the workflow hands
   you the exact commit commands to run.

The same shape minus the build phases is `/recon` (a question, not a build); the
same discipline minus the fan-out is `refute` on a single claim.

```mermaid
flowchart TD
    S0["session-start<br/>surfaces toolkit"] --> S1["orchestrate + check-fanout<br/>script has contract · gate · verify · schemas"]
    S1 --> SP{"Spike: riskiest<br/>unknown builds?"}
    SP -->|no| H["HALT — fix the base first"]
    SP -->|yes| C["Contract<br/>one shared source of truth"]
    C --> SC["Scaffold<br/>shared files compile (stubs)"]
    SC --> B1["build: file A"]
    SC --> B2["build: file B"]
    SC --> B3["build: file C"]
    B1 --> IG["Integrate<br/>integration-runner runs the real gate → green"]
    B2 --> IG
    B3 --> IG
    IG --> V1["skeptic: is it wired?"]
    IG --> V2["skeptic: did the path run?"]
    V1 --> RV["re-run the gate yourself<br/>(refute — green ≠ claim-true)"]
    V2 --> RV
    RV --> GC["git-guard<br/>emit commit commands for the human"]

    classDef p3 fill:#2e1a3a,stroke:#a371f7,color:#e6edf3;
    classDef halt fill:#3a1a1a,stroke:#f85149,color:#e6edf3;
    class S0,S1,SP,C,SC,B1,B2,B3,IG,V1,V2,RV,GC p3;
    class H halt;
```

## What's in v1 (the verification spine)

Listed in **build order** — enforcement infra lands before the content it guards.

| Component | Kind | Status |
|---|---|---|
| `git-guard` | hook (enforced) | provisional |
| `session-start` | hook | provisional |
| `skeptic-verifier` | agent | provisional |
| `refute` | skill | provisional |
| `implemented-vs-planned` | skill | provisional |
| `/verify-claim`, `/honesty-check` | commands | provisional |

**`status: provisional` means:** *extracted from one working session and not yet
validated as a packaged skill across multiple unfamiliar domains.* It does **not**
mean "used only once" — these patterns have cross-project history. The status field
is read by **this README only**; it is not a functional gate. A component becomes
`settled` after it survives ≥2 independent contexts (logged in `FEEDBACK.md`).

## Phase 2 (operating-system layer)

| Component | Kind | Status |
|---|---|---|
| `fanout-recon-synthesize` | skill | provisional (exercised once — see `FEEDBACK.md`) |
| `gate-discipline` | skill | provisional |
| `/recon` | command | provisional |
| `/handoff` | command + template | provisional |

`fanout-recon-synthesize` is the decompose → fan-out → refute → synthesize loop;
`/recon` is its thin caller. A runnable, domain-neutral example of the proven
shape ships at `skills/fanout-recon-synthesize/example.mjs` — it is the loop that
audited this toolkit's own spine. `gate-discipline` keeps staged work honest
(no stage past a red gate; close via real integration; ADR a deviation rather
than bury it). `/handoff` emits a fixed "read this first" brief.

## Phase 3 (orchestration discipline)

| Component | Kind | Status |
|---|---|---|
| `orchestrate` | skill (policy) | provisional |
| `fanout-build` | skill | provisional |
| `/fanout` | command | provisional |
| `check-fanout` | gate (heuristic) | provisional |

`orchestrate` is the policy: for multi-agent work, default to the **Workflow tool**
wrapped in rigor's guardrails (shared contract, disjoint files, an integration
gate, a skeptic claim-refutation, `check-fanout`, never-trust-the-self-report) —
not ad-hoc dispatch. `fanout-build` packages the trustworthy multi-agent
**build** — one shared
contract, disjoint-file ownership, scaffold-first, an `integration-runner` gate,
and a `skeptic-verifier` pass that refutes the *claim* (a green gate is not a true
claim). `/fanout` is its entry point; `check-fanout` flags a fan-out workflow
script missing that scaffolding (structure only — it cannot prove file-disjointness
or that a claim is true). Grounded in two independent real multi-agent builds.

## Build order (the dependency spine)

```mermaid
graph TD
    T1[scaffold + manifest] --> T2[git-guard hook]
    T1 --> T3[session-start hook]
    T1 --> T4[surface-scrub gate]
    T5[vendored rules + ADR-0001] --> T3
    T4 -.guards.-> T7[refute skill]
    T4 -.guards.-> T8[implemented-vs-planned]
    T6[skeptic-verifier agent] --> T7
    T7 --> T9["/verify-claim + /honesty-check"]
    T8 --> T9
```

Enforcement infra (`git-guard`, the `surface-scrub` gate) is built before the
content it guards; `refute` is built before the two commands that call it. Full
task-by-task plan: [`docs/plans/2026-06-25-rigor-plugin-phase1.md`](docs/plans/2026-06-25-rigor-plugin-phase1.md);
design rationale: [`docs/specs/2026-06-25-rigor-plugin-design.md`](docs/specs/2026-06-25-rigor-plugin-design.md).

## Install

Add this repo as a local Claude Code plugin (see current Claude Code plugin docs).
The `SessionStart` hook needs a one-time `~/.claude/settings.json` registration to
deliver context — see [`docs/session-start-setup.md`](docs/session-start-setup.md).

## The one hard rule

`git-guard` blocks agent-initiated git-history writes; Claude outputs the command
for you to run instead. Override per web-driven repo with `RIGOR_GIT_ALLOW=1`.

The full self-audit (37 findings — spine code fixes applied and independently
verified) is in [`docs/audits/2026-06-25-spine-audit.md`](docs/audits/2026-06-25-spine-audit.md).

## Tests

`node --test` (auto-discovers `tests/*.test.mjs` — hooks + surface-scrub).
`node scripts/check-surface-scrub.mjs` gates skill/command examples against
project fingerprints.

## Agents

Three vendored agents live in [`agents/`](agents/), each tagged `provisional` —
`skeptic-verifier`, `repo-cartographer`, `integration-runner`. See each file for
what it does and when to use it. Promotion `provisional` → `settled` is tracked in
`FEEDBACK.md`.
