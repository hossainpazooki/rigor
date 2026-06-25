# rigor

A portable Claude Code plugin packaging a verification-and-discipline toolkit:
refute load-bearing claims, keep built-vs-planned honest, and never let an agent
write git history.

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

Status, the self-audit (37 findings — spine code fixes applied and independently
verified), and what remains live in [`docs/BACKLOG.md`](docs/BACKLOG.md) and
[`docs/audits/2026-06-25-spine-audit.md`](docs/audits/2026-06-25-spine-audit.md).

## Tests

`node --test` (auto-discovers `tests/*.test.mjs` — hooks + surface-scrub).
`node scripts/check-surface-scrub.mjs` gates skill/command examples against
project fingerprints.

## Roadmap

See [`docs/BACKLOG.md`](docs/BACKLOG.md) — the live work queue: spine remediation
(top priority), the held agents (`repo-cartographer`, `integration-runner`) that
migrate only when they actually fire, and the promotion rule. Detail on the
remediation lives in [`docs/audits/2026-06-25-spine-audit.md`](docs/audits/2026-06-25-spine-audit.md).
