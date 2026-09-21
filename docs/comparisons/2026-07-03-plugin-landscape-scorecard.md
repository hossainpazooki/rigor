# rigor vs. the plugin landscape — measured scorecard

**Date:** 2026-07-03. All local measurements taken this date from actual plugin
files; adoption figures are web-sourced and dated inline. Token estimates use
bytes ÷ 4 (approximate).
**Amended 2026-07-07:** rigor's column re-measured after Phase 4
(`judgment-dispatch`); comparator columns unchanged from 2026-07-03. New
scorecard row and addendum at the bottom; the comparator-side claims in both
were re-verified 2026-07-07 (see addendum).
**Amended 2026-09-15:** multi-agent execution moves from superpowers'
`subagent-driven-development` to rigor's `orchestrate` by standing operator
preference; rigor's column and superpowers 6.0.2 re-measured; two
superpowers-side statements corrected. Addendum at the bottom; inline
*(2026-09-15)* markers point to it.

## Method

- **Local plugins** (rigor, superpowers 6.0.2) measured directly: skill/agent/
  command file sizes via `wc -c`, session-start injection measured by running
  the hook (rigor) or reading the injected file the hook `cat`s (superpowers).
- **Remote plugins** (SuperML, Anthropic Data) measured from their GitHub trees
  (`gh api .../git/trees`) and raw file fetches — manifests, `.mcp.json`,
  hooks, and every SKILL.md frontmatter were read; no claim below rests on
  marketing copy alone.
- Star counts recomputed from the GitHub API on 2026-07-03, not restated from
  articles (one article was stale by ~241k stars).

## The comparator set, and the taxonomy that matters

The plugins fall into two categories, and cross-category scoring is a category
error:

- **Capability plugins** ship domain knowledge: SuperML (ML engineering),
  Anthropic Data (SQL/viz/dashboards), Frontend Design, Context7.
- **Discipline plugins** ship process/epistemics: **superpowers** (how to
  build: brainstorming → plans → TDD → debugging → review) and **rigor**
  (whether to believe: refute claims, probe effects, keep status honest).

superpowers is rigor's true peer. SuperML and Data are complements a session
would run *alongside* either.

## Measured surface (2026-07-03)

| | rigor | superpowers 6.0.2 | SuperML 1.0.1 | Data 1.1.0 (Anthropic) |
|---|---|---|---|---|
| Skills | 12 · 37.1 KB · max 8.4 KB *(re-measured 2026-07-07)* → 20 · 105.5 KB · max 11.0 KB *(2026-09-15)* | 14 · 128.5 KB · max 26.9 KB (`writing-skills`) | 7 · 175.8 KB · max 44.8 KB (`ml-plan`) | 10 · 106.6 KB · max 26 KB (`build-dashboard`) |
| Slash commands | 6 (thin callers into skills) → 9 *(2026-09-15)* | 0 | 0 | 7 (skills doubling as commands via `user-invocable` + `argument-hint`) |
| Agents | 5 — all model-pinned: 2 judgment-tier, 2 build-tier, 1 cheap-tier variant *(2026-07-07)* → 5, pinned 2 judgment / 2 mid / 1 build *(2026-09-15)* | 0 | 1 (`ml-expert`, 17.5 KB, persistent memory) | 0 |
| Hooks | 2 — git-guard (hard block) + 463 B session pointer *(re-measured 2026-07-07 as the injected `additionalContext` payload — the earlier 516 B included the JSON envelope; the pointer also grew 2 command names)* → 3: git-guard, change-guard, and the same 463 B pointer *(2026-09-15)* | 1 — injects full `using-superpowers` (5.9 KB) on startup/clear/**compact** | 1 — injects full `using-superml` (23.6 KB) + verbatim upsell notice in keyless mode | 0 |
| Always-on cost / session | **~120 tokens** *(re-measured 2026-07-07; unchanged 2026-09-15, same 463 B payload)* | ~1,500 tokens | **~6,000 tokens** | ~0 beyond frontmatter |
| MCP requirement | none | none | 1 proprietary server (Leeroopedia; degraded without account) | 8 optional connectors, tool-agnostic `~~category` placeholders |
| Executable gates | 6 check scripts + `node --test` suite *(re-measured 2026-07-07)* → 12 check scripts + `node --test` *(2026-09-15)* | 0 (discipline is prose + hook) | 0 (has a self-refine eval harness, dev-side) | 0 |
| GitHub stars (API, 2026-07-03) | n/a (personal repo) | **245,363** | 191 | 22,316 (whole knowledge-work-plugins repo) |
| Adoption note | single operator | 752k installs in Anthropic's directory (June 2026, per Composio) | niche/new — "recognized ML plugin" overstates it | Anthropic-official, institutionally maintained |

## Scorecard

● strong / ◐ partial / ○ absent.

| Dimension | rigor | superpowers | SuperML | Data |
|---|---|---|---|---|
| ML pipeline orchestration | ◐ real multi-agent discipline (`fanout-build`, `orchestrate`, `check-fanout`), domain-general *(2026-09-15: now this operator's multi-agent execution mechanism)* | ◐ `subagent-driven-development` (per-task subagent + reviewer loop), domain-general *(2026-09-15: replaced by `orchestrate` in this operator's stack)* | ◐ `ml-plan` KB-grounded plans; single-agent | ○ |
| Model testing capabilities | ◐ evaluation-integrity gates (`no-lookahead`, DQ fail-closed, `idempotent-restatement`, test-path fidelity) | ◐ TDD + `verification-before-completion` (general, not ML) | ● `ml-verify` + `ml-debug` (configs, math, OOM/NaN — genuinely ML) | ◐ `validate-data` (analysis QA) |
| Build-process discipline | ◐ gate-discipline + git-guard; no planning/TDD layer | ● the category leader: brainstorming → writing-plans → executing-plans → TDD → systematic-debugging → review | ○ | ○ |
| Verification depth | ● adversarial: refute, skeptic dispatch, negative-control effect probes, claim-vs-gate distinction, logged misfires | ◐ evidence-before-claims rule; no adversarial layer, no negative controls | ◐ KB citations ground answers; vendor's 37-task eval is self-reported | ◐ one skill of ten |
| Context-window efficiency | ● ~120 tok/session; bodies ≤ 8.4 KB *(2026-09-15: max body 11.0 KB)* | ◐ ~1.5k tok/session, refires on compact; two 20 KB+ bodies | ○ ~6k tok/session before any work | ● ~0 always-on |
| Enforcement (machine, not prose) | ● git-guard hard block + 6 executable gates *(2026-09-15: + change-guard; 12 gates)* | ○ "YOU MUST" prose + red-flag tables — relies on model compliance | ○ | ○ |
| Model-tier economics (which model runs the check) | ● stakes-routed two-tier dispatch; floors beyond the agent's own inference; downgrades logged; 2 gates (`check-dispatch`, `check-tier-sync`) *(added 2026-07-07)* | ○ no agents, no `model:` frontmatter anywhere (grepped local cache 2026-07-07) *(2026-09-15: ◐ is fairer — `subagent-driven-development` tells the controller to pick and pass a model per dispatch, in prose; see correction)* | ○ single agent is `model: inherit` (raw fetch 2026-07-07) | ○ no agents |
| Vendor/dependency risk | ● zero external services | ● zero | ○ value prop is one vendor's hosted KB | ◐ connectors optional |
| Maturity / community evidence | ○ n=1 operator, honest ledger | ● 245k stars, 752k installs, community-battle-tested | ○ 191 stars | ● official, versioned |

## rigor vs. superpowers — the head-to-head that matters

Same category, complementary halves of one loop:

- **superpowers answers "how do I build this well?"** Its skills form a
  pipeline (brainstorm → plan → execute → TDD → debug → review → finish) and
  its enforcement is rhetorical — rationalization tables, "not negotiable"
  framing. It has no concept of probing an irreversible action's aftermath, no
  negative controls, no status-honesty pass, and no machine gates.
- **rigor answers "should I believe what just happened?"** Its skills are all
  specializations of refute, and its enforcement is partly executable
  (git-guard blocks history writes; check scripts refuse vacuous probes and
  drifted citations). It has no planning/TDD/debugging methodology at all.
- **Overlap is thin and instructive.** superpowers'
  `verification-before-completion` ("run the command before claiming") is
  refute-lite: it re-runs the gate but doesn't attack the claim — rigor's
  distinction between gate-green and claim-true (the unwired-feature case) is
  precisely what it lacks. Conversely, superpowers'
  `subagent-driven-development` and rigor's `fanout-build` share the
  contract-and-review shape; rigor adds disjoint-file ownership, a lintable
  workflow script, and a skeptic pass; superpowers adds per-task human-shaped
  review loops and far more community mileage. *(2026-09-15 correction: the
  per-task loops are subagent reviewers, not a human — see addendum.)*
- **The stack, not the choice:** superpowers drives execution; rigor audits
  the claims execution produces. (This repo's own build plan reached the same
  conclusion independently: "execute with obra's plan-execution harness, keep
  rigor's gates as the per-task acceptance checks, finish with a rigor
  refutation of the final done-claim.") *(2026-09-15: for multi-agent work,
  rigor now drives execution too — see addendum.)*

## Other relevant/popular plugins (not measured — surveyed only)

From Anthropic's public directory (June 2026 figures via Composio): **Frontend
Design** (829k installs) and **Context7** (349k installs — live library-docs
grounding; the open-ecosystem answer to SuperML's proprietary KB). Community
staples in team stacks: Composio (cross-app actions), the official code-review
/ PR-review toolkit, commit-commands, CLAUDE.md-management, and per-language
LSP plugins. None of these compete on rigor's axis; Context7 is the one most
worth watching as a grounding layer that composes with everything else.

## Verdict

- rigor is **best-in-class of the four on context efficiency and machine
  enforcement**, unique on adversarial verification and — as of 2026-07-07 —
  alone on model-tier dispatch (addendum below) — and last on community
  evidence. By its own ledger standard: settled for its author's use,
  provisional for third-party adoption.
- superpowers' 245k-star process methodology and rigor's verification layer
  are complements; the credible professional stack this comparison supports is
  **superpowers (process) + rigor (epistemics) + one capability plugin per
  domain** (Data for warehouses; SuperML only if you accept the vendor-KB
  dependency and the ~6k-token session tax). *(2026-09-15: in this operator's
  stack, multi-agent execution runs through rigor's `orchestrate`; superpowers
  keeps planning, TDD, debugging, review and branch finishing — see addendum.)*
- The earlier framing of SuperML as a "recognized" ML plugin does not survive
  measurement: 191 stars, one vendor, self-reported evals. The Data plugin's
  `user-invocable` skills-as-commands pattern is the one concrete design idea
  rigor should consider adopting.

## Addendum — 2026-07-07: model-tier dispatch opens a fifth axis

Phase 4 (`judgment-dispatch`, spec 2026-07-05, built 2026-07-07) added a
dimension none of the comparators occupy: **which model runs each verification
is a stakes-routed, gate-checked decision.** A premium judgment tier takes
high-stakes and floored checks; a cheap tier takes the rest; the routing
inference is itself logged and refutable, and `check-dispatch` fails closed on
the fox-and-henhouse case (an agent under-rating stakes to buy itself cheap
verification).

Comparator side, re-verified 2026-07-07 rather than assumed:

- **superpowers 6.0.2** — 0 agents; `grep -rl "^model:"` over the local plugin
  cache returns nothing. Its discipline runs entirely on the session model.
  *(2026-09-15 correction: overstated — see the 2026-09-15 addendum.)*
- **SuperML 1.0.1** — its one agent (`ml-expert`) ships `model: inherit`
  (raw-fetched from GitHub `main` this date): explicitly *not* pinned, no
  tiering.
- **Data 1.1.0** — 0 agents, 0 hooks; nothing to route.

Honesty line, per rigor's own standard: the *mechanism* (frontmatter pinning)
is live-verified with a non-vacuous probe, and the gates are tested
(`node --test`, 86 passing incl. seeded-violation fixtures) — but the rubric
has **zero independent domains** behind it, and the claimed economics
(cost-per-verified-claim) are **unmeasured** until the Phase-C usage ledger
exists. This addendum records a differentiator of *machinery*, not yet of
*measured savings*. Build record:
[`../plans/2026-07-07-judgment-dispatch-plan.md`](../plans/2026-07-07-judgment-dispatch-plan.md).

## Addendum — 2026-09-15: multi-agent execution moves from `subagent-driven-development` to `orchestrate`

**What changed.** A standing operator preference, recorded 2026-09-14 in the
operator's Claude Code memory — not a plugin setting; both plugins stay enabled
and no global rule changed. When rigor is loaded and a task would trigger
superpowers' `subagent-driven-development` (SDD below), the work runs through
`rigor:orchestrate` instead: `fanout-build` for an implementation build,
`fanout-recon-synthesize` for a research-style decomposition. **The opt-in bar
is unchanged** — agents fan out only after an explicit "use workflows" /
"ultracode" (the operator's `workflows.md`). This swaps one skill; it does not
replace superpowers.

**What moves and what stays.** superpowers 6.0.2's 14 skills, listed from the
local plugin cache on 2026-09-15:

| superpowers skill | after this change | rigor counterpart |
|---|---|---|
| `subagent-driven-development` | **replaced** | `orchestrate` → `fanout-build` |
| `dispatching-parallel-agents` | not named by the preference | overlaps `orchestrate` (Workflow tool, not ad-hoc dispatch) and `fanout-recon-synthesize` |
| `brainstorming`, `writing-plans`, `executing-plans`, `test-driven-development`, `systematic-debugging` | stay | none — rigor has no planning, TDD or debugging method |
| `using-git-worktrees`, `requesting-code-review`, `receiving-code-review`, `finishing-a-development-branch` | stay | none (`orchestrate` mentions worktree isolation as a tactic only) |
| `verification-before-completion` | stays | `refute` goes further on claims; it does not remove the floor |
| `writing-skills`, `using-superpowers` | stay | none |

SDD names `writing-plans`, `using-git-worktrees`, `requesting-code-review` and
`finishing-a-development-branch` as required companions. `orchestrate` requires
none of them, so a plan still has to come from somewhere, and branch finishing
stays a superpowers step whenever it is used.

**The two mechanisms, read from source on 2026-09-15** (superpowers cache
`6.0.2/skills/subagent-driven-development/`; rigor `skills/orchestrate/`,
`skills/fanout-build/`):

| | superpowers `subagent-driven-development` | rigor `orchestrate` + `fanout-build` |
|---|---|---|
| Size | SKILL.md 21.5 KB + implementer prompt 5.5 KB + task-reviewer prompt 7.9 KB + 2 scripts (`task-brief`, `review-package`) | `orchestrate` 3.5 KB + `fanout-build` 6.1 KB + `example.mjs` 6.6 KB (`fanout-recon-synthesize` 2.8 KB) |
| Dispatch | hand-dispatched subagents, one task at a time — its "Never" list includes "Dispatch multiple implementation subagents in parallel (conflicts)" | a Workflow-tool script (`agent` / `parallel` / `pipeline`); parallel only across disjoint files |
| Shared context | a per-task brief extracted from the plan, plus the plan's Global Constraints copied verbatim | one shared contract prepended verbatim to every agent, with a file→owner map |
| Review | a task reviewer after every task (two verdicts: spec compliance, code quality; told to treat the implementer's report as unverified claims and check them against the diff), a fix loop until clean, then a whole-branch reviewer | no per-task review; an `integration-runner` re-runs the named gate and returns verbatim output, then `skeptic-verifier`s refute each load-bearing claim by re-executing it |
| Test evidence | carried by the implementer's report; reviewers are told not to re-run tests the implementer already ran | re-run by the integration step and again by the orchestrator (guardrail 8) |
| Model placement | a prose rule: least capable adequate model per role, always passed explicitly | tier→model in `config/models.json`, pinned agent frontmatter, `check-tier-placement` on the script, per-dispatch receipts linted by `check-dispatch` |
| Checks on the orchestration itself | none (the scripts produce briefs and diff packages) | `check-fanout` and `check-tier-placement` on the script; `check-dispatch` on the verdict log |
| Git history | implementers commit per task; the review package diffs BASE..HEAD | agents never write history (`git-guard`); the human runs the emitted commit commands |
| Recovery after compaction | a progress ledger under `.git/sdd/` plus `git log` | Workflow `resumeFromRunId` replays unchanged agent calls from cache (same session only) |
| Human in the loop | none between tasks; one batched pre-flight question on plan conflicts; escalation on BLOCKED | the orchestrator; commits stay with the human |

**What the move gives up.** SDD's per-task review catches a spec deviation
right after the task that made it; `fanout-build`'s skeptics run once, after
integration, on claims, so a wrong early task can shape later work before
anything checks it. SDD avoids file conflicts by never running implementers in
parallel; `fanout-build` needs an ownership map and a scaffold, and tightly
coupled tasks fit it poorly. `orchestrate` has no plan-writing or
branch-finishing step. SDD carries superpowers' community mileage, while
`orchestrate` is provisional with one independent domain (`STATUS.md`). And
rigor's verification quality depends on the judgment tier being available.
*(Later the same day: the `execute-plan` shape adds plan intake, per-task
review with a bounded fix loop, and a durable ledger — spec
[`../specs/2026-09-15-execute-plan-design.md`](../specs/2026-09-15-execute-plan-design.md);
zero domains at write time.)*

**What it gains.** Evidence re-executed rather than carried in a report;
refutation of the claim, not only review of the diff; machine lints on the
orchestration and on which model ran each check; no agent-written history.

**The most recent `orchestrate` run — 2026-09-14, rigor's own `git-guard` fix**
(a few hours before the preference was recorded; use, not a domain). From the
Workflow runtime's own usage reports: three runs — build, integrate and verify
(8 agents, 347,683 subagent tokens; all 4 judgment-tier skeptics errored on
exhausted credits), a resumed verify on the mid tier (reported 363,514; the
report does not say whether that figure counts the 4 agents replayed from
cache), and a second verify round (4 agents, 308,195). The build worker's first
fix passed its own red-first twins and the integration gate, and the
orchestrator's own old-vs-new differential refuted it (`git merge>out`, a real
merge, flipped to allowed). Mid-tier skeptics refuted two further versions and
surfaced two bypasses already in shipped code. The final state is held for a
judgment-tier round
([`../plans/2026-09-14-closure-ledger-pair.verify3.workflow.mjs`](../plans/2026-09-14-closure-ledger-pair.verify3.workflow.mjs)),
and `check-dispatch` is red on that run's verdict log because four high-stakes
votes ran below the judgment tier. **What this does not show:** that SDD would
have missed those defects — no SDD run on the same task exists — or what either
mechanism costs per task. n=1, same operator, rigor's own repo.

**Corrections to earlier text in this document**, re-read against the same
6.0.2 files:

- The 2026-07-07 addendum said superpowers' "discipline runs entirely on the
  session model". No agent frontmatter pins a model (still true —
  `grep -rl "^model:"` over the cache returns nothing on 2026-09-15), but SDD's
  Model Selection section tells the controller to choose a model per role and
  to "Always specify the model explicitly when dispatching a subagent". The
  difference from rigor is prose-instructed versus pinned and linted, not
  absent versus present; the Model-tier economics row's ○ for superpowers is
  better read as ◐.
- The head-to-head said SDD adds "per-task human-shaped review loops". The
  loops are subagent reviewers; SDD tells the controller not to check in with
  the human between tasks.

**Re-measured 2026-09-15.** rigor at `c810129` (branch
`fix/git-guard-subcommand-parsing`, which carries the 2026-09-14 `git-guard`
change and no surface-count change; `main` is 4 commits behind): 20 skills ·
105.5 KB · max 11.0 KB (`change-class-earned`); 9 commands; 5 agents, pinned 2
judgment (`claude-fable-5`) / 2 mid (`claude-opus-5`) / 1 build
(`claude-sonnet-5`); 3 hooks; a 463 B session pointer (~116 tokens); 12 check
scripts; `node --test` 598 on that branch. superpowers 6.0.2 (installed
2026-06-18): unchanged — 14 skills · 128.5 KB · max 26.9 KB, 0 agents, 0
commands, one SessionStart hook on startup / clear / compact, no `model:`
frontmatter. SuperML and Data were not re-measured.

## Sources

- Local: this repo; `~/.claude/plugins/cache/superpowers-marketplace/superpowers/6.0.2`
  (for the 2026-09-15 addendum: `skills/subagent-driven-development/SKILL.md`,
  `task-reviewer-prompt.md`, `implementer-prompt.md`, `scripts/`)
- [obra/superpowers](https://github.com/obra/superpowers) · [Leeroo-AI/superml](https://github.com/Leeroo-AI/superml) · [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) (`data/`) · [claude.com/plugins/data](https://claude.com/plugins/data) · [claude.com/plugins/superpowers](https://claude.com/plugins/superpowers)
- Adoption figures: [Composio — Best Claude Code Plugins in 2026](https://composio.dev/content/top-claude-code-plugins) (directory installs, June 1 2026); star counts via GitHub API 2026-07-03
