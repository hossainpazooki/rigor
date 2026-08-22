# rigor — verification controls for agentic software delivery

A Claude Code plugin that applies change-enablement discipline to work done by
agents: **a report of success is a claim, not evidence, and no claim is accepted
until it has been independently verified.** An agent's output is frequently
well-formed and wrong at the same time — a green test run that exercised a
stub, a figure restated from memory instead of recomputed, a feature that
compiles but was never wired in. Each component here is a control against that
class of defect: before "tests pass", "deployed", or "done" is accepted, the
agent must re-run the real gate, recompute from the raw source, and show a
negative control — and every irreversible step stays with a human.

```mermaid
flowchart LR
    A["agent reports<br/>“done — tests pass, deployed”"] --> Q{"accept the<br/>report?"}
    Q -->|"as reported"| P["merged<br/>defect found downstream"]
    Q -->|"with rigor"| V["verify first<br/>re-run the real gate<br/>recompute from source<br/>run a negative control"]
    V -->|"holds"| T["accepted —<br/>evidence attached"]
    V -->|"fails"| F["rejected<br/>before release"]

    classDef n fill:#ecdfff,stroke:#a371f7,color:#3a1060;
    classDef ok fill:#d7f4de,stroke:#2ea043,color:#0f3d1e;
    classDef bad fill:#ffe0e0,stroke:#f85149,color:#6a0d0d;
    class A,Q,V n;
    class T,F ok;
    class P bad;
```

Why the premise holds: three findings from applying the toolkit to **its own
repository**, kept on the record rather than cleaned up —

- A handoff document recorded **39 tests passing** at its own commit;
  re-running the suite at that commit gave **46**. Every required field was
  present and the schema check was green. A schema check is a floor, never a
  verdict. ([record](docs/feedback/2026-07-14-pick-up-tic-brief-killed-a-claim.md))
- The adversarial reviewer itself returned **2 incorrect rejections out of 4**
  on one review pass — caught only because the orchestrator re-ran the gates
  independently. A reviewer's verdict is a claim like any other.
  ([status](docs/STATUS.md))
- A multi-agent build meant to run on lower-cost worker models answered
  **505 of 505** turns on the expensive orchestrating model: every call was
  unpinned and silently inherited the session's model. Invisible in the run's
  own artifacts; found in the transcripts; now enforced by a gate.
  ([decision](docs/DECISIONS.md#silent-tier-collapse))

## What ships

Three roles, kept apart. The agent **proposes** a change and its evidence;
deterministic gates **decide** whether the evidence is sufficient; a human
**promotes** anything irreversible. Two hooks hold that last boundary.

```mermaid
flowchart LR
    subgraph agent["agent — proposes"]
        W["does the work"] --> E["attaches evidence<br/>gate output · recomputed figures<br/>negative control"]
    end
    subgraph gates["gates — decide (code, in the test floor)"]
        G["11 check scripts<br/>form · provenance · non-vacuity<br/>tier pins · change records"]
    end
    subgraph human["human — promotes"]
        H["runs the commit<br/>runs the deploy"]
    end
    E --> G
    G -->|"insufficient"| X["refused —<br/>reason returned to the agent"]
    G -->|"sufficient"| H
    E -.->|"git-guard · change-guard<br/>block the agent here"| H

    classDef n fill:#ecdfff,stroke:#a371f7,color:#3a1060;
    classDef ok fill:#d7f4de,stroke:#2ea043,color:#0f3d1e;
    classDef bad fill:#ffe0e0,stroke:#f85149,color:#6a0d0d;
    class W,E,G n;
    class H ok;
    class X bad;
```

- **Verification before acceptance** — the control under everything:
  recompute from raw sources, re-run the real gate, dispatch independent
  adversarial reviewers, and require a negative control (a check that would
  pass whether or not the change worked proves nothing).
- **Judgment, not a generic validator** — 20 skills, 8 commands, and 5 agents
  that the agent applies inside *your* repository against *your* gates.
  Deliberately no turnkey validator: a checker that certified artifacts whose
  schema it cannot know would itself be unverified
  ([why](docs/DECISIONS.md#no-turnkey-validator)). Six of the twenty skills are
  the **deployment layer**, proposed 2026-08-22 and not yet validated in an
  independent codebase (see below).
- **Cost-aware model placement** — verifiers are routed across model tiers by
  the stakes of the claim, floored for the nodes that must never be cheapened,
  and gate-checked for silent downgrades and silent tier collapse
  ([how](docs/SYSTEM.md#model-tier-dispatch-putting-the-expensive-model-where-it-counts)).
- **Segregation of duties on git history** — a hook blocks agent-initiated
  history writes (including wrapped, flag-cluster, and remote-side `gh` forms);
  the agent emits the commands and a human runs them. The hook is friction
  that keeps the boundary visible, not a security boundary, and its
  documentation says so.
- **Segregation of duties on deployment** — a second hook refuses deploy-shaped
  commands (`kubectl apply`, `helm upgrade`, `terraform apply`, `gh workflow
  run`, …) unless a committed change record carries the required evidence, or
  a committed emergency-change record names who, when, and why
  ([the deployment layer](docs/DECISIONS.md#deployment-layer), **proposed**).
- **Applied to itself** — every component stays *provisional* until it has
  held up in at least two independent codebases, and the ledger keeps the
  toolkit's own failures visible ([status](docs/STATUS.md)).

## Newest layer: pre-change authorization (proposed)

The deployment layer supersedes the data-engineering layer as the latest
addition. The four data-engineering skills are **validated (within their
stated scope)** and unchanged; this layer is **proposed, fixture-tested, with
no independent codebase and no live run yet**, and every part of it remains
provisional until it has been shown to reject a known-bad change in a real
repository.

It sits *upstream* of post-implementation verification — before the
irreversible step, not after — and answers one question about an agent's
proposed change: **has it earned the right to proceed?**

```mermaid
flowchart TD
    P["proposed change<br/>+ change record"] --> B{"backout ran against<br/>this candidate, exit 0?"}
    B -->|"no"| R["refused"]
    B -->|"yes"| I{"artifact hash<br/>recomputed = recorded?"}
    I -->|"no / unrecomputable"| R
    I -->|"yes"| S{"health signal<br/>inside the blast radius"}
    S -->|"unreadable"| HALT["halt —<br/>never coerced to pass or fail"]
    S -->|"fail"| R
    S -->|"pass"| C{"change class?"}
    C -->|"2 · emergency-grade<br/>every new pattern"| HU["human approves<br/>and executes"]
    C -->|"1 · normal<br/>approval on record"| OK["agent may proceed"]
    C -->|"0 · standard<br/>earned by a human, on evidence"| OK
    BG["emergency-change record<br/>who · when · why · exact command<br/>written before the bypass"] -.->|"the one documented exception"| OK

    classDef n fill:#ecdfff,stroke:#a371f7,color:#3a1060;
    classDef ok fill:#d7f4de,stroke:#2ea043,color:#0f3d1e;
    classDef bad fill:#ffe0e0,stroke:#f85149,color:#6a0d0d;
    classDef warn fill:#fff4d6,stroke:#d4a017,color:#5a3e00;
    class P,B,I,S,C,BG n;
    class OK,HU ok;
    class R bad;
    class HALT warn;
```

Six properties, each implemented in the control shapes it can make fail
(review, preventive, detective, evidentiary):

| property | what must be true before the change proceeds |
|---|---|
| backout tested, not written | the backout path has **run against this candidate and exited 0**; a described plan is not evidence |
| release integrity | the artifact's content hash is recorded at review and recomputed at the execution edge; mismatch or an unrecomputable identity refuses |
| health signal fails closed | an SLI that cannot be read **halts** the change — never coerced to pass or fail — and only signals inside the declared blast radius are evaluated |
| post-implementation review with live evidence | a probe is not credited until a paired negative control shows it would fail if the change were absent |
| emergency change on the record | a bypass is written — who, when, why, the exact command — *before* it runs; an incomplete record is refused |
| change class earned, never declared | every pattern enters as an emergency-class change; only a human, on ledger evidence, demotes it toward standard, and one failure re-promotes it |

rigor is the control at the change-approval step. It is not the pipeline, the
change advisory board, the deploy executor, or an SRE platform. The design's
first draft was rejected by three independent reviewers and its first build by
nine; what ships is what survived five review rounds
([the decision](docs/DECISIONS.md#deployment-layer) ·
[build record](docs/plans/2026-08-22-deployment-layer-build.md)).

## Which command, when

```mermaid
flowchart LR
    Q{"what are you<br/>about to accept?"}
    Q -->|"a number, a “tests pass”,<br/>any “done”"| A["/rigor:verify-claim"]
    Q -->|"a status doc, README,<br/>commit message"| B["/rigor:honesty-check"]
    Q -->|"a question too big<br/>for one pass"| C["/rigor:recon"]
    Q -->|"a build too big<br/>for one pass"| D["/rigor:fanout"]
    Q -->|"a deploy / migration /<br/>publish that “succeeded”"| E["/rigor:verify-effect"]
    Q -->|"handing work to<br/>the next session"| F["/rigor:handoff"]
    Q -->|"picking up someone’s<br/>handoff brief"| G["/rigor:pickup"]

    classDef n fill:#ecdfff,stroke:#a371f7,color:#3a1060;
    classDef ok fill:#d7f4de,stroke:#2ea043,color:#0f3d1e;
    class Q n;
    class A,B,C,D,E,F,G ok;
```

| You're about to accept… | Run | What actually happens |
|---|---|---|
| a number, a "tests pass", any agent's "done" | `/rigor:verify-claim` | recompute from the raw source, re-run the real gate, dispatch independent reviewers, confirm cited sources say what is claimed |
| a status doc, README, or commit message | `/rigor:honesty-check` | every claim is tagged built / in-progress / planned so proposed work cannot read as finished |
| a question too big for one pass | `/rigor:recon` | split into disjoint parallel research, review the findings adversarially, keep only what survives |
| a build too big for one pass | `/rigor:fanout` | contract-first multi-agent build with tier-pinned workers, an integration gate, and an independent review pass |
| a deploy / migration / publish that "succeeded" | `/rigor:verify-effect` | probe the state the action left behind, paired with a negative control — never the action's own exit log |
| the next session (or person) picking this up | `/rigor:handoff` | a fixed "read this first" brief: state, locked decisions, invariants — every built claim carrying a re-verification command |
| a handoff brief you've just been handed | `/rigor:pickup` | re-verify the brief's load-bearing claims against the current repository, detect drift, re-run the entry gate |

Three hooks run without being asked: **`git-guard`** (blocks agent-initiated git
history writes; per-repository override `RIGOR_GIT_ALLOW=1`), **`change-guard`**
(refuses deploy-shaped commands without a committed change record or
emergency-change record — `RIGOR_CHANGE_RECORD`/`RIGOR_CHANGE_ID`, or
`RIGOR_BREAK_GLASS`; provisional), and **`session-start`** (injects the toolkit
pointer before the first claim is made).

```mermaid
flowchart LR
    S["session starts"] --> SS["session-start<br/>injects the toolkit pointer"]
    SS --> W["agent works"]
    W --> CMD{"agent runs a<br/>shell command"}
    CMD -->|"git commit · push · rebase …"| GG["git-guard<br/>refused — command<br/>handed to the human"]
    CMD -->|"kubectl apply · helm upgrade ·<br/>terraform apply · gh workflow run …"| CG["change-guard<br/>refused unless a committed<br/>change record carries the evidence"]
    CMD -->|"anything else"| RUN["runs"]

    classDef n fill:#ecdfff,stroke:#a371f7,color:#3a1060;
    classDef ok fill:#d7f4de,stroke:#2ea043,color:#0f3d1e;
    classDef bad fill:#ffe0e0,stroke:#f85149,color:#6a0d0d;
    class S,SS,W,CMD n;
    class RUN ok;
    class GG,CG bad;
```

## Install

This repository is its own local plugin marketplace. In a Claude Code session:

```
/plugin marketplace add <absolute-path-to-this-repo>
/plugin install rigor@rigor
```

```mermaid
flowchart LR
    A["this repository<br/>(a local marketplace)"] -->|"/plugin marketplace add"| B["marketplace<br/>registered"]
    B -->|"/plugin install rigor@rigor"| C["plugin installed"]
    C --> D["skills · commands · agents<br/>available in the session"]
    C --> E["3 hooks active<br/>from the next command on"]

    classDef n fill:#ecdfff,stroke:#a371f7,color:#3a1060;
    classDef ok fill:#d7f4de,stroke:#2ea043,color:#0f3d1e;
    class A,B,C n;
    class D,E ok;
```

Cross-repository registration and older-harness fallback:
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Tests

```
node --test          # hooks + all 11 check gates; stdlib-only, green is the merge floor
```

Every gate ships with at least one fixture it passes and at least one
known-bad input it rejects — a gate that has never been seen to fail is not
credited.

```mermaid
flowchart LR
    T["node --test"] --> H["hook tests<br/>git-guard · change-guard · session-start"]
    T --> G["gate tests<br/>11 check scripts"]
    H --> R{"every test green?"}
    G --> R
    R -->|"yes"| M["merge floor met"]
    R -->|"no"| X["not mergeable"]
    K["each gate: a passing fixture<br/>+ a known-bad input it rejects"] -.-> G

    classDef n fill:#ecdfff,stroke:#a371f7,color:#3a1060;
    classDef ok fill:#d7f4de,stroke:#2ea043,color:#0f3d1e;
    classDef bad fill:#ffe0e0,stroke:#f85149,color:#6a0d0d;
    class T,H,G,R,K n;
    class M ok;
    class X bad;
```

The full gate list, one line each: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Where things live

```mermaid
flowchart TD
    README["README<br/>(this page)"] --> SYS["SYSTEM.md<br/>how the layers fit"]
    README --> ST["STATUS.md<br/>validated vs not, failures included"]
    README --> DEV["DEVELOPMENT.md<br/>tests · gates · install"]
    README --> DEC["DECISIONS.md<br/>the decision behind each claim here<br/>and the full records it links onward to"]
    ST --> FB["feedback/<br/>promotion ledger"]
    README --> IDX["docs/README.md<br/>full index: ledgers · designs · audits"]
    IDX --> LG["learnings/ · handoff/ · learn/<br/>facts · briefs · closure records"]

    classDef n fill:#ecdfff,stroke:#a371f7,color:#3a1060;
    classDef ok fill:#d7f4de,stroke:#2ea043,color:#0f3d1e;
    class README n;
    class SYS,ST,DEV,DEC,IDX ok;
    class FB,LG n;
```

- [docs/SYSTEM.md](docs/SYSTEM.md) — how the layers fit: the verification
  control, code-vs-judgment, model-tier dispatch, the multi-agent build
  pipeline, the data-engineering layer (validated, scoped), and the deployment
  layer (proposed)
- [docs/STATUS.md](docs/STATUS.md) — what is validated and what is not,
  failures included
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — tests, gates, install
- [docs/DECISIONS.md](docs/DECISIONS.md) — the decisions behind the claims on
  this page, each with its status and what is actually built
- [docs/README.md](docs/README.md) — the full docs index: ledgers
  (feedback / learnings / handoff), designs, audits, comparisons
- [AGENTS.md](AGENTS.md) — the canonical repository brief for sessions working here
