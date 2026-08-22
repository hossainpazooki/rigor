# Handoff ledger (index)

Transition records — "read this first" briefs frozen at a session boundary.
Entries live beside this file as dated immutable markdown files,
`YYYY-MM-DD-<topic>.md` (chronological listing, newest at the bottom), written
by `/rigor:handoff` and consumed by `/rigor:pickup`, which re-verifies their
claims instead of trusting them.

Each well-known file owns one tense: CLAUDE.md / AGENTS.md are timeless (what
the repo is), a live effort's STATE.md is the mutable present, a handoff entry
is a past→future transition frozen at write time, and run logs / transcripts
are captured past. Pick-up reading order: **repo context → STATE.md (if an
effort is live) → this index → the latest entry → refute its load-bearing
claims before building.**

Entries are immutable once written: a brief is a batch of claims from a
session that can no longer defend them — corrections belong in the *next*
brief, never in edits to an old one. This index holds pointers only, never
evidence.

## Entries

| Date | Entry | Topic / next step |
|---|---|---|
| 2026-07-15 | [2026-07-15-rigor-loop-engineering-conclusion.md](2026-07-15-rigor-loop-engineering-conclusion.md) | Session conclusion — ledger kit + ADR-0004 pilot settled + ADR status index + ADR-0006 proposed. Next: ratify ADR-0005/0006, re-verify the tic-Fable-throughout claim before building ADR-0006 resolution 1 |
| 2026-07-22 | [2026-07-22-fanout-loop-first-iterations.md](2026-07-22-fanout-loop-first-iterations.md) | Mid tier (ADR-0007) + fanout-loop (ADR-0008) built; runs 4–5 executed — two honest negatives, kit misfire #2, loop HALTED on budget breach. Next: three operator decisions (budget policy, cldd serialization, commit pvt-demo ledger), then sweep mode |
| 2026-08-18 | [2026-08-18-three-extensions-adrs-and-learn-loop.md](2026-08-18-three-extensions-adrs-and-learn-loop.md) | Three extension ADRs proposed (0010 LEARN loop, 0011 verifier calibration, 0012 re-audit sweep); LEARN loop built ahead of ratification — skill + `check-misfire-closure` (3 outcomes, 21 tests) + empty closure ledger + self-application audit (5 pinned / 0 declined / 8 open). Next: four operator decisions — ratify 0010, 0011's demotion scope, the 0012/ADR-0005 go, and how a committed run-log entry gets corrected |
| 2026-08-19 | [2026-08-19-re-audit-sweep-fired-dataeng-settled.md](2026-08-19-re-audit-sweep-fired-dataeng-settled.md) | Re-audit sweep (ADR-0012) fired twice and **all four data-eng skills settled (scoped)** across PARALLAX, passed-vs-true-demo, correct-shaped-lies and treasury-intent-controller; 0 subagent tokens. `lineage-replay`'s replay-diff gap closed; 1 ROT found and corrected in a real claim ceiling. Next: the misfire closure ledger is at exit 2 (8 open at survey), then the ADR-0009/0010 folder consolidation and the `judgment-dispatch` adjudication |
| 2026-08-22 | [2026-08-22-deployment-layer-proposed.md](2026-08-22-deployment-layer-proposed.md) | ADR-0013 deployment layer **Proposed** and built provisional (6 skills, `check-change-record`, `change-guard`, `shell-normalize`, `git-guard` hardening incl. 5 pre-existing holes); 1 build + 4 fix rounds, 54 agents, 6.1M tokens, round 5 first to survive; suite 178 → 523; first domain rehearsed at record level only. Next: operator ruling on ADR-0013, two open closure records, a reviewer-level twin |

Prior sessions' briefs live in `~/dev/briefs/`, the pre-ADR local convention, which remains the
fallback for genuinely multi-repo sessions.
