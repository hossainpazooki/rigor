# 2026-07-22 · `/handoff` + `pick-up` round-trip · **helped, plus a policy gap settled** · credit-risk ML (CLDD)

**Domain:** closed-loop-default-detection (credit-risk ML, Python/sklearn) — the
0.3.0 release session, picked up from the 2026-07-20 brief
(`docs/handoff/2026-07-20-ci-portability-and-state-discrepancies.md`, written by
`/rigor:handoff`). Second independent domain for the `/handoff` round-trip
(first: tic, 2026-07-06/07).

## Helped: the brief survived a full adversarial pick-up, and a release was built on it

Every load-bearing claim was re-verified by **executing the brief's own
`re-verify:` lines**, not trusting them — and all held:

- CI green claim → `gh run list`: 15/15 success on `ec92b43`, re-checked for
  vacuity per the brief's instruction (`pinned-repro` 194 passed + 9 skipped
  = 203; compat 188 + 9 = 197, the `-m "not pinned"` subset — skip count 9,
  not 12, so the identity gate executed).
- `fetch-depth: 0` claim → the brief's own yaml probe: `0` on all three
  pytest jobs, absent on `docs`. Held.
- Suite claim → fresh run: 203 passed under pins, exit 0.
- v3 numbers → `scripts/feedback_sweep_stats.py` recompute: H1 median −0.0028,
  24/25, Holm 2.325e-06; H2 +0.0119, 0/25; H4 max abs err 1e-10 / 300 checks
  × 3 severities. Exact match.
- Drift window: exactly 1 commit (`ec92b43`) — which was the brief's own
  Open/next #1, executed by the operator. Nothing unexplained.

The 0.3.0 release then completed the same session standing only on
verified-now ground, and was effect-verified from a clean consumer venv with a
discriminating probe (v3 flags absent in 0.2.0). Zero drifted or false claims
in the brief: the first time a `/handoff` brief has carried a release across a
session boundary.

## The policy gap, and its settlement

The brief chain's "not folded in" discipline (global `git.md`: call out
untracked files you didn't create rather than silently staging or dropping
them) had carried `docs/superpowers/plans/2026-07-14-cldd-v3-feedback-profit.md`
as **"operator's call" across three consecutive sessions** (07-19 local note,
07-20 brief, 07-22 brief) — honest each time, but with no mechanism to
*settle* the call, so every session re-flagged the same `??` line and the
third one finally re-litigated it from scratch.

**Settled by the operator 2026-07-22:** superpowers working docs — `plans/`
(task-by-task execution scaffolding: checkbox tracking, agent-orchestration
directives, machine paths) — **stay local and gitignored, never committed**.
Applied in cldd by appending `docs/superpowers/plans/` to `.git/info/exclude`;
`git status` is now clean, so no future session sees the flag.

**Scope correction, recorded rather than silently adopted:** the operator's
phrasing was "all superpowers docs are local and gitignored." Checked against
the repo before recording — **false as stated for cldd**:

```
$ git ls-files docs/superpowers/
docs/superpowers/specs/2026-07-13-cldd-v2-emp-design.md
docs/superpowers/specs/2026-07-14-cldd-v3-design.md
docs/superpowers/specs/2026-07-19-wap-firing-evidence.md
```

Those three `specs/` are committed, pushed, and load-bearing public
provenance — the 0.3.0 CHANGELOG cites spec Rev 2.1/2.2, and the handoff
ledger cites `b23dc01` as the pre-registration contract. Un-committing them
would break the auditability of the pre-registration claim. The precise
policy as settled: **`plans/` local everywhere; `specs/` may ship when they
are the scientific contract** (cldd's are, deliberately).

## Standing

Candidate promotion for `/handoff`: 2 independent domains survived (tic Go
durability; CLDD credit-risk release), both round-trips ending in the
receiving session re-running the gates itself. The 2026-07-14 sole-writer
batch-stamping misfire was in the ledger-kit subcomponent (fixed + gated,
tracked under its own row); this session's two cldd learnings entries were
capture-time-anchored (distinct `ts:`, bases re-captured at the named commit).
Scope caveat, same as every promotion so far: **same operator, both domains**.

re-verify (policy applied): `git -C ~/dev/closed-loop-default-detection status --short` → empty; `grep superpowers ~/dev/closed-loop-default-detection/.git/info/exclude` → `docs/superpowers/plans/`
re-verify (specs still shipped): `git -C ~/dev/closed-loop-default-detection ls-files docs/superpowers/` → the three spec files above
