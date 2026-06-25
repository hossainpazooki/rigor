# Design — `rigor`: a portable verification-and-discipline plugin for Claude Code

**Date:** 2026-06-25
**Status:** Design (approved-with-revisions; pending user review of this written spec)
**Relocation note (updated 2026-06-25):** this spec was drafted in another repo's
`docs/superpowers/specs/` (the brainstorming skill's default location) before the
`rigor` repo existed. It now lives in its home repo at `rigor/docs/specs/`. The
Phase 1 verification spine described here is **built** and ships tagged
`provisional` (see `README.md` for component status); Phase 2 remains designed-here,
not-yet-built. ADR-0001 lives at `docs/adr/0001-vendor-the-rules.md`.

---

## Context

This plugin packages the operating discipline demonstrated over a long working
session — gated work, fan-out→refute→synthesize recon, adversarial verification of
self-reported success, implemented-vs-planned honesty, handoff briefs, and
command-handoff git — into a portable Claude Code plugin.

**The governing constraint (the reframe):** the toolkit was *extracted from one
session in one domain* (a Rust/regulatory codebase). Its value is only realized if
it **survives leaving that domain** — the acceptance test is *"a clone works for an
engineer in a Java shop who has never seen these repos,"* not *"it fired this
session."* Two consequences run through the whole design:

1. **Surface-scrub.** Every shipped skill separates the *pattern* (which travels)
   from the *surface* (which doesn't). Examples must be domain-neutral — no
   Python/Rust/Temporal, no project-specific artifact names. A clone whose examples
   all speak one stack reads as someone else's toolkit.
2. **Honest provenance (n=1).** Everything here fired *once*. It ships **tagged
   provisional**, not as settled spine. "Settled" is earned by surviving multiple
   independent contexts. This is `implemented-vs-planned` applied to the toolkit
   itself.

## Decisions locked (from brainstorming)

| # | Decision |
|---|---|
| Goal | Portable **personal** toolkit; battle-tested by use, not a heavy eval rig. |
| Source of truth | Hybrid: rules stay always-on `~/.claude` imports on the author's machine; the plugin owns agents/skills/commands/hooks — **and vendors a rules copy** (ADR-0001) for self-containment. |
| v1 scope | Comprehensive operating system, **but built spine-first** (see Build order). |
| Architecture | **C — layered hybrid**: always-on rules → SessionStart surfacing → on-demand skills → ergonomic commands → one hard enforcement hook → bundled agent. |

## Architecture

```
rigor/                              # separate new git repo
├── .claude-plugin/plugin.json
├── skills/
│   ├── refute/SKILL.md
│   ├── fanout-recon-synthesize/SKILL.md
│   ├── gate-discipline/SKILL.md
│   └── implemented-vs-planned/SKILL.md
├── commands/
│   ├── recon.md            # → fanout-recon-synthesize
│   ├── verify-claim.md     # → refute (on a self-reported pass)
│   ├── honesty-check.md    # → implemented-vs-planned (over a path/diff)
│   └── handoff.md          # command + template (no skill)
├── agents/
│   └── skeptic-verifier.md # the only agent that fired; the others are held
├── hooks/
│   ├── session-start.*     # surface the toolkit; inject vendored rules iff absent
│   └── git-guard.*         # PreToolUse/Bash: block commit/push/force/branch -f main
├── rules/                  # VENDORED copy of ~/.claude/rules (ADR-0001)
│   └── PROVENANCE.md       # "vendored from ~/.claude/rules @ 2026-06-25"
├── docs/adr/0001-vendor-the-rules.md
├── BACKLOG.md              # held candidates (repo-cartographer, integration-runner, …)
└── README.md
```

**Update 2026-06-25:** the Phase 2 entries above (`fanout-recon-synthesize`,
`gate-discipline`, `recon.md`, `handoff.md`) are now **built and shipped**, tagged
provisional. `BACKLOG.md` has been **retired** — its live content (held agents,
promotion rule, audit status) moved to the README roadmap and `docs/audits/`. This
tree reflects the original design.

### The refute decision (resolved explicitly — required by review)

`fanout-recon-synthesize` and `claim-verification` rested on the same primitive:
*take a load-bearing claim and try to break it.* Resolution:

- **`refute` is that primitive, as a skill.** Input: one load-bearing claim.
  **Three moves:** (a) **recompute** every empirical number from raw source at the
  point of claim; (b) **re-execute the actual acceptance gate where one exists** —
  run the test suite / validator / live proof yourself rather than trust a reported
  pass; (c) **dispatch** N independent skeptics (via `skeptic-verifier`), each
  prompted to *refute*. The claim survives only if it withstands a genuine
  falsification attempt (vote threshold scales with stakes). All three moves are
  domain-neutral. **Move (b) is load-bearing and nearly fell out of the
  `claim-verification` collapse** (it is neither recompute nor dispatch); it lives
  in the primitive so *both* callers — `fanout-recon-synthesize` and `/verify-claim`
  — inherit "re-run the real gate, don't trust the reported pass." This widens what
  Phase 1 builds.
- **`fanout-recon-synthesize` stays a distinct skill** — it is *not* merged into
  refute, because it adds two judgments refute does not have: (a) decomposing a
  question into **disjoint parallel** recon tasks against one shared contract, and
  (b) **synthesizing** survivors into a conclusion. It *calls* `refute` on its
  load-bearing findings. Scope differs: refute breaks one claim; fanout
  decomposes → gathers → refutes → synthesizes.
- **`claim-verification` does not warrant a skill.** It is `refute` applied to a
  self-reported pass (yours or a subagent's) with no added judgment, so it ships
  as the **`/verify-claim` command** — a thin caller of the primitive.

Net: one primitive (`refute`), two callers (`fanout-recon-synthesize` skill;
`/verify-claim` command). The overlap is removed, not shipped unexamined.

### Components

**Skills (4)** — each carries judgment, with surface-scrubbed (domain-neutral)
examples:
| Skill | Pattern (travels) | Surface-scrub note |
|---|---|---|
| `refute` | break one load-bearing claim: **recompute numbers + re-execute the real gate + dispatch skeptics** | examples use a generic "the test suite passes / the number is X" claim, not any stack |
| `fanout-recon-synthesize` | disjoint parallel recon → refute survivors → synthesize | example question is domain-neutral (e.g. "does feature X exist and work") |
| `gate-discipline` | acceptance criteria before starting; no stage until prior green; close via PR not a local pointer; open an ADR when criteria can't be met / spec conflicts | replace any "ADR referencing PROJECT_AUDIT" example with a neutral one |
| `implemented-vs-planned` | keep built-vs-proposed visible: status tags, precise verbs, never aspirational-as-done. **Empirical-number verification is _not_ here** — that belongs to `refute` (cross-reference it; do not duplicate recompute) | the checklist is generic; no project tags |

**Commands (4)** — entry points that *do* something (dropped `/gate-status`, which
only asks "where am I" — conversational, not an action; and any pure skill-alias):
`/recon <question>`, `/verify-claim <claim>`, `/honesty-check [path]`, `/handoff
[topic]` (command + fixed template → a "read this first" brief: state, locked
decisions, reuse map, invariants).

**Agents (1 shipped, 2 held)** — honesty applied to the inventory:
- **`skeptic-verifier`** — ships. It fired this session and is load-bearing for
  `refute`.
- **`repo-cartographer`, `integration-runner`** — **held** in `BACKLOG.md`. Neither
  fired as the *named agent* this session (`Explore` agents did cartography; the
  author ran integration/verification inline). They are migrated only when they
  actually fire in real use — not on faith.

**Hooks (2):**
- `session-start` — surfaces the toolkit (a short `using-rigor` pointer, the way
  `using-superpowers` self-introduces). **Injects the vendored rules iff the
  machine has no `~/.claude/rules`** — so a fresh clone is self-contained without
  double-loading on the author's own machine.
- `git-guard` — PreToolUse on Bash: blocks `git commit` / `git push` /
  `git push --force` / `git branch -f main`, replying with a reminder to *output*
  the commands for the human. Configurable allowlist for the documented
  web-driven-repo exception. This is the one inviolable rule made hard.

**Rules (vendored)** — a copy of the six rule modules lives in `rules/` with a
one-line provenance note. See ADR-0001.

## ADR-0001 — Vendor the rules (→ becomes `rigor/docs/adr/0001-vendor-the-rules.md`)

**Status:** Accepted (records a consequential, hard-to-reverse choice — the repo's
first ADR, by design).

**Context.** The skills reference operating rules (who-i-am, working-style, git,
verification-and-honesty, workflows, agents). A pointer (`docs/rules-assumed.md`)
assumes the author's `~/.claude` is present. On a fresh machine / a Java shop, the
skills load but the judgment they cite does not — the plugin **half-loads**.

**Decision.** The plugin **vendors its own copy** of the rules it depends on, not a
pointer. Self-contained beats elegant. The `session-start` hook injects the
vendored rules only when no `~/.claude/rules` is present, avoiding double-load on
the author's machine.

**Consequence.** Drift: the vendored copy can fall behind `~/.claude/rules`.
Accepted and managed by a one-line provenance note (`vendored from
~/.claude/rules @ <date>`) and a periodic re-sync. The alternative (assume the
environment) defeats the plugin's entire purpose — portability.

## Build order (spine first)

**Phase 1 — verification spine** (most domain-neutral; *is* the thesis as a working
artifact — it demonstrates the agent-trust gap: don't trust an agent's claim
(`refute`) and don't let an agent write history (`git-guard`)):
`refute` (+ `/verify-claim`) · `implemented-vs-planned` (+ `/honesty-check`) ·
`skeptic-verifier` · `git-guard` hook · minimal `plugin.json` + `session-start`.

**Phase 2 — operating-system layer** (accretes by use):
`gate-discipline` · `fanout-recon-synthesize` (+ `/recon`) · `/handoff` + template ·
vendored `rules/` + provenance · `BACKLOG.md`.

**Plan scope (removes the "comprehensive v1" ambiguity):** the implementation plan
targets **repo scaffold + Phase 1 (the shippable spine) + ADR-0001 + vendored
rules**. Phase 2 components are *designed here* but are added incrementally as real
use justifies them — they are not part of the first shippable cut. "Comprehensive"
means the *design* is complete; the *first build* is the spine.

## Battle-test loop

`rigor` is a versioned git repo; you bump versions as it changes. "Battle-test by
use" = run it across unfamiliar repos. A light **`FEEDBACK.md`** (or `/retro`
convention) logs when a skill *helped* or *misfired* and in *what domain* — the
friction log is the harness, and it is also the evidence that promotes a component
from **provisional** to **settled** (the n=1 → n>1 transition). No heavy eval rig
in v1.

## Provisional/settled tagging

Every skill/command/agent carries a status field in its frontmatter:
`status: provisional` (extracted from one session/domain) or `status: settled`
(survived ≥2 independent contexts). v1 ships **almost everything provisional**;
`README.md` states this plainly. Promotion is driven by `FEEDBACK.md` evidence.

**What the field does (so it isn't mistaken for a gate):** in v1 its *only*
consumer is the `README`, which lists each component's status honestly. It is
**not** functional — `provisional` does not block loading, change behavior, or gate
invocation. It is a truth label for the reader, nothing more. A later version may
make it do work; v1 does not.

**README framing (carry to implementation — edit 4):** the provisional claim must
read *"extracted from one session"* — the honest statement about *this extraction*.
It must **not** read *"fired only once ever,"* which is false: `refute`,
`gate-discipline`, and `implemented-vs-planned` have cross-project history in the
author's work. Provisional = "not yet validated as a *packaged skill* across
domains," not "never used."

## Open questions (for the plan, not blockers)

- Plugin name (`rigor` is a working placeholder — alts: `keystone`, `the-loop`,
  `ops`).
- ~~Hook implementation language (shell vs node)~~ — **resolved:** Node `.mjs`
  (ESM, `node:test`/`fs`/`os`), Node ≥18, for win32/Linux portability without a
  Git-Bash dependency.
- Exact vendored-rules re-sync cadence/mechanism.

## Non-goals (v1)

A marketplace listing / public distribution; a heavy automated eval harness;
migrating agents that did not fire; duplicating rules as a mere pointer.
