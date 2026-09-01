# rigor

<!-- rigor:generated -->

Portable verification-and-discipline toolkit, packaged as a Claude Code plugin
and its own local plugin marketplace (`.claude-plugin/`). It ships discipline,
not domain content: refute load-bearing claims before trusting them, keep the
built-vs-planned boundary honest, and never let an agent write git history.
No runtime dependencies beyond Node; the test suite and all gates are
stdlib-only (`node:test`).

## Structure

- `skills/` — 20 discipline skills (one folder per skill, `SKILL.md` inside):
  refute, implemented-vs-planned, gate-discipline, verify-the-effect,
  fanout-build, fanout-recon-synthesize, orchestrate, judgment-dispatch,
  pick-up, learn-from-misfire, the four data-engineering gates
  (data-quality-fail-closed, no-lookahead, idempotent-restatement,
  lineage-replay), and the six deployment-layer properties proposed by
  ADR-0013 (change-backout-exercised, release-artifact-integrity,
  health-signal-fail-closed, post-implementation-probe,
  break-glass-on-record, change-class-earned — **provisional, fixture-tested
  only, zero domains**).
- `commands/` — 9 slash commands (`/rigor:verify-claim`, `honesty-check`,
  `recon`, `fanout`, `verify-effect`, `handoff`, `pickup`, `fanout-loop`, and
  `harvest` — one past session per invocation, mined for evidence about rigor's
  own components; **provisional**, ADR-0014 Proposed).
- `agents/` — 5 subagents: skeptic-verifier (+ `-fast` mid-tier variant,
  body byte-identical by gate), effect-prober, integration-runner,
  repo-cartographer. `model:` frontmatter is pinned per tier.
- `hooks/` — `hooks.json` wires three hooks: `git-guard.mjs` (PreToolUse on
  Bash — blocks git-history writes incl. wrapped/`-c`/plumbing forms and
  remote-side `gh pr merge` / mutating `gh api` calls), `change-guard.mjs`
  (PreToolUse on Bash — refuses deploy-shaped commands unless a change record
  on the configured ref carries the ADR-0013 evidence, or a break-glass
  record exists; provisional), and `session-start.mjs` (delivers the toolkit
  pointer). Both PreToolUse hooks share `shell-normalize.mjs` (wrapper /
  subshell / `sh -c` / absolute-path normalization).
- `scripts/` — 12 check gates (`check-*.mjs`: surface-scrub,
  citation-fidelity, effect-probe, fanout, tier-placement, dispatch,
  tier-sync, learnings, runlog, misfire-closure, change-record — the
  ADR-0013 three-outcome gate over a target's change log, provisional — and
  harvest, the ADR-0014 three-outcome gate that refuses a credit standing on a
  transcript rather than a re-run, provisional) plus `extract-tails.mjs` and
  `index-sessions.mjs`, non-gate utilities whose
  output stays out of every repo. House style: pure exported matcher, fs only
  at the CLI boundary.
- `tests/` — `node --test` suite, auto-discovered; green is the merge floor.
- `config/models.json` — single source of model-tier truth (tiers, floors,
  tier→agent map); two gates enforce agreement with agent frontmatter.
- `rules/` — working-agreement modules vendored for self-containment
  (point-in-time copy; see `rules/PROVENANCE.md`).
- `docs/` — indexed by `docs/README.md` (authoritative vs ledger vs
  point-in-time). Authoritative current-state: `SYSTEM.md` (how the layers
  fit), `STATUS.md` (component status table), `DEVELOPMENT.md` (tests +
  install) — all three moved out of the README 2026-07-18, which is now a
  skimmer-first page. Records: `adr/` (decisions), `plans/` + `specs/`
  (build records and designs), `feedback/` (component promotion ledger:
  provisional → settled after ≥2 independent domains; pointer-only index +
  dated immutable entries), `learnings/` + `handoff/` (same
  index-plus-entries shape for repo facts and session transitions),
  `efforts/` (live effort chassis: STATE.md spine + append-only
  run-log.jsonl), `audits/`, `comparisons/`.
- `surface-scrub.denylist.example` — template for the scrub gate's denylist;
  the real denylist is local and gitignored.

## How it's operated

```
node --test                                  # the merge floor
node scripts/check-surface-scrub.mjs         # shipped surface carries no project fingerprints
node scripts/check-learnings.mjs docs/learnings
```

Install into a session: `/plugin marketplace add <path-to-this-repo>` then
`/plugin install rigor@rigor`. The agent registry is session-start-static:
after editing `agents/`, restart the session before dispatching them.

## Invariants

- Agents never write git history — emit the commands for the human
  (`git-guard` enforces it; `git mv` is allowed). `git-guard` is friction,
  not a security boundary: `node -e`/`python -c` wrappers and the hook
  script's own plugin-cache path remain open (ADR-0013 self-refutation 7).
- Agents never trigger a deployment — `change-guard` refuses deploy-shaped
  commands (kubectl/helm/terraform/pulumi/gh workflow/argocd/flux mutating
  verbs) and the human runs them; the authorized path is a committed change
  record, the emergency path a committed break-glass record (ADR-0013,
  Proposed).
- The shipped plugin surface (`skills/`, `agents/`, `commands/`) stays
  domain-neutral and must pass the surface-scrub gate; `docs/` may name
  domains freely.
- Ledger indexes hold pointers, never evidence; dated entries are immutable —
  corrections are new entries with a `kills:` reference, never edits. No
  ledger is ever backfilled.
- Logs index candidate firings; only a gate re-run moves a status. Component
  promotions live in `docs/feedback/FEEDBACK.md` and require ≥2 independent
  domains.
- A `paused: true` in any effort's STATE.md is honored fail-closed.

<!-- /rigor:generated -->
