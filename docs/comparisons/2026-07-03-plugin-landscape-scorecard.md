# rigor vs. the plugin landscape — measured scorecard

**Date:** 2026-07-03. All local measurements taken this date from actual plugin
files; adoption figures are web-sourced and dated inline. Token estimates use
bytes ÷ 4 (approximate).
**Amended 2026-07-07:** rigor's column re-measured after Phase 4
(`judgment-dispatch`); comparator columns unchanged from 2026-07-03. New
scorecard row and addendum at the bottom; the comparator-side claims in both
were re-verified 2026-07-07 (see addendum).

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
| Skills | 12 · 37.1 KB · max 8.4 KB *(re-measured 2026-07-07)* | 14 · 128.5 KB · max 26.9 KB (`writing-skills`) | 7 · 175.8 KB · max 44.8 KB (`ml-plan`) | 10 · 106.6 KB · max 26 KB (`build-dashboard`) |
| Slash commands | 6 (thin callers into skills) | 0 | 0 | 7 (skills doubling as commands via `user-invocable` + `argument-hint`) |
| Agents | 5 — all model-pinned: 2 judgment-tier, 2 build-tier, 1 cheap-tier variant *(2026-07-07)* | 0 | 1 (`ml-expert`, 17.5 KB, persistent memory) | 0 |
| Hooks | 2 — git-guard (hard block) + 463 B session pointer *(re-measured 2026-07-07 as the injected `additionalContext` payload — the earlier 516 B included the JSON envelope; the pointer also grew 2 command names)* | 1 — injects full `using-superpowers` (5.9 KB) on startup/clear/**compact** | 1 — injects full `using-superml` (23.6 KB) + verbatim upsell notice in keyless mode | 0 |
| Always-on cost / session | **~120 tokens** *(re-measured 2026-07-07)* | ~1,500 tokens | **~6,000 tokens** | ~0 beyond frontmatter |
| MCP requirement | none | none | 1 proprietary server (Leeroopedia; degraded without account) | 8 optional connectors, tool-agnostic `~~category` placeholders |
| Executable gates | 6 check scripts + `node --test` suite *(re-measured 2026-07-07)* | 0 (discipline is prose + hook) | 0 (has a self-refine eval harness, dev-side) | 0 |
| GitHub stars (API, 2026-07-03) | n/a (personal repo) | **245,363** | 191 | 22,316 (whole knowledge-work-plugins repo) |
| Adoption note | single operator | 752k installs in Anthropic's directory (June 2026, per Composio) | niche/new — "recognized ML plugin" overstates it | Anthropic-official, institutionally maintained |

## Scorecard

● strong / ◐ partial / ○ absent.

| Dimension | rigor | superpowers | SuperML | Data |
|---|---|---|---|---|
| ML pipeline orchestration | ◐ real multi-agent discipline (`fanout-build`, `orchestrate`, `check-fanout`), domain-general | ◐ `subagent-driven-development` (per-task subagent + reviewer loop), domain-general | ◐ `ml-plan` KB-grounded plans; single-agent | ○ |
| Model testing capabilities | ◐ evaluation-integrity gates (`no-lookahead`, DQ fail-closed, `idempotent-restatement`, test-path fidelity) | ◐ TDD + `verification-before-completion` (general, not ML) | ● `ml-verify` + `ml-debug` (configs, math, OOM/NaN — genuinely ML) | ◐ `validate-data` (analysis QA) |
| Build-process discipline | ◐ gate-discipline + git-guard; no planning/TDD layer | ● the category leader: brainstorming → writing-plans → executing-plans → TDD → systematic-debugging → review | ○ | ○ |
| Verification depth | ● adversarial: refute, skeptic dispatch, negative-control effect probes, claim-vs-gate distinction, logged misfires | ◐ evidence-before-claims rule; no adversarial layer, no negative controls | ◐ KB citations ground answers; vendor's 37-task eval is self-reported | ◐ one skill of ten |
| Context-window efficiency | ● ~120 tok/session; bodies ≤ 8.4 KB | ◐ ~1.5k tok/session, refires on compact; two 20 KB+ bodies | ○ ~6k tok/session before any work | ● ~0 always-on |
| Enforcement (machine, not prose) | ● git-guard hard block + 6 executable gates | ○ "YOU MUST" prose + red-flag tables — relies on model compliance | ○ | ○ |
| Model-tier economics (which model runs the check) | ● stakes-routed two-tier dispatch; floors beyond the agent's own inference; downgrades logged; 2 gates (`check-dispatch`, `check-tier-sync`) *(added 2026-07-07)* | ○ no agents, no `model:` frontmatter anywhere (grepped local cache 2026-07-07) | ○ single agent is `model: inherit` (raw fetch 2026-07-07) | ○ no agents |
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
  review loops and far more community mileage.
- **The stack, not the choice:** superpowers drives execution; rigor audits
  the claims execution produces. (This repo's own build plan reached the same
  conclusion independently: "execute with obra's plan-execution harness, keep
  rigor's gates as the per-task acceptance checks, finish with a rigor
  refutation of the final done-claim.")

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
  dependency and the ~6k-token session tax).
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

## Sources

- Local: this repo; `~/.claude/plugins/cache/superpowers-marketplace/superpowers/6.0.2`
- [obra/superpowers](https://github.com/obra/superpowers) · [Leeroo-AI/superml](https://github.com/Leeroo-AI/superml) · [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) (`data/`) · [claude.com/plugins/data](https://claude.com/plugins/data) · [claude.com/plugins/superpowers](https://claude.com/plugins/superpowers)
- Adoption figures: [Composio — Best Claude Code Plugins in 2026](https://composio.dev/content/top-claude-code-plugins) (directory installs, June 1 2026); star counts via GitHub API 2026-07-03
