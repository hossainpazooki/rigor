# ADR-0004 — Loop chassis + rigor conscience (pilot: the provisional-backlog effort)

**Status:** Accepted (2026-07-08) — pilot operator-authorized ("let's pilot the composition on
the backlog effort"); all four parameters resolved same day (see "Decisions resolved"). Nothing
ships into the plugin surface from this ADR until the pilot's success criteria are met.

## Context

rigor has no concept of time. Every command is invoked by a human inside a session; state crosses
session boundaries only as per-transition handoff briefs; there is no cadence, no budget ceiling,
no run log, no durable "where are we" for an effort that spans many sessions. The
provisional-backlog effort — settling rigor's own component statuses against real repos' gates —
is exactly such an effort: multi-session by design (domains cannot be manufactured; they arrive
when real work happens in real repos), and already producing runs worth logging (2026-07-08: a
14-agent read-only recon, ~1.05M subagent tokens, followed by operator gate re-runs and one
promotion).

The missing layer has prior art: **loop-engineering** (cobusgreyling/loop-engineering; comparison
from operator-provided clones at HEAD 2026-07-08, not independently re-verified here) — a
methodology for recurring agent jobs built on a mutable `STATE.md` spine, an append-only per-run
log, budget files with kill switches, and a graduated autonomy ladder (L1 report-only → L3
unattended). Its verifier, by its own caveat ("verification is still on you"), trusts the gate —
the hole rigor exists to fill. The two are complementary with almost no overlap: the loop decides
*when* work happens; rigor decides *what gets believed*.

Two shape-validations worth recording: (1) loop-engineering independently converged on the same
pairing ADR-0003 adopted — mutable spine for orientation + immutable dated log for evidence —
from a different failure mode; (2) the 2026-07-08 recon demonstrated the cost of having neither:
~1.05M tokens of transcript archaeology to reconstruct what anchored records would have made three
file reads.

A naming decision folded in here because it was the question that opened this design: **`STATE.md`
does not replace the handoff brief.** A brief is a *transition* artifact — written once at a
boundary, by an author who can no longer be cross-examined, licensed for refutation by `pick-up`.
`STATE.md` is a *spine* — mutable, continuously rewritten, current-truth-as-of-now. Merging them
would inherit the mutable-snapshot failure mode (silently rewritten history) rigor exists to
prevent. The composition keeps both, plus the append-only log between them.

## Decision (proposed)

Run the composition as an **effort-level pilot on the provisional-backlog effort only** — a
process experiment, not plugin surface. No new skills, commands, agents, or hooks until the pilot
survives.

**1. The effort gets the three-layer state pairing.**
- `STATE.md` — mutable spine: effort goal, `paused:` flag, budget line, the backlog table with
  current per-component status, next candidates, pointer to the last run. Every write goes through
  `implemented-vs-planned` (an unattended or hurried loop must not record aspirational work as
  done — the failure mode that compounds worst without a human reading each run).
- `run-log.jsonl` — append-only, one record per run, ADR-0003 record schema (RFC 3339 UTC
  timestamp captured from the clock, commit anchors per repo touched, session id as
  pointer-not-proof, gates re-run with quoted results, `re-verify:` lines **with prerequisites
  named** when nontrivial — the ulc/Postgres lesson: a re-verify line nobody can run on this box
  reads as rigor while providing none; `unverifiable-here` is the honest tag).
- Handoff briefs — unchanged, per-transition, refutable by `pick-up`. On entry, `pick-up` treats
  `STATE.md` as one more batch of claims: the spine is *more* in need of refutation than a dated
  brief, not less.

**2. The autonomy ladder, named — with git-guard as the ceiling, not an obstacle.**
- **L1 (unattended allowed):** read-only sweeps — re-run the `re-verify:` lines of standing
  records/briefs, detect drift, report. Produces reports and commit-commands-for-the-human only.
  The 2026-07-08 recon was an L1 job avant la lettre.
- **L2 (current posture, the ceiling):** edits to files, gates re-run by the orchestrator, ledger
  writes proposed — history written only by the human. loop-engineering's "human gate" and rigor's
  git-guard are the same checkpoint discovered from opposite directions.
- **L3 (forbidden):** agent-initiated commits/pushes. Not a pilot parameter; a standing invariant.

**3. Budget with a kill switch.**
Each run states its token cap up front in `STATE.md`'s budget line; the run log records actual
spend (the `usage` block a Workflow run returns). `paused: true` in `STATE.md` is a fail-closed
kill switch: any session picking up the effort must honor it before spawning agents. Run-log spend
records are deliberately Phase C's raw material (cost-per-verified-claim), so the ledger is
measured from run one.

**4. The loop shape (one iteration).**
`pick-up` against `STATE.md` + newest brief → L1 re-verify sweep (drift since last run) → work at
most the backlog items for which a *genuine* domain exists right now (real work in a real repo
with its own gate — never manufactured to feed the loop) → orchestrator re-runs the load-bearing
gates itself (`orchestrate` #8; logs index, gates decide) → record per the schema → update
`STATE.md` through `implemented-vs-planned` → append the run record → brief if the session ends
mid-effort.

**5. Explicitly not imported from loop-engineering:**
- L3 graduated trust toward the loop itself.
- Any verifier that terminates at "the gate passed" — gate-green is not claim-true.
- Clock-cadence for domain work. A cron cannot manufacture independent domains; the pilot's
  cadence is session-triggered (the sweep runs when a session touches the effort). Clock-triggered
  L1 sweeps are a possible later step, listed pending below.

**6. Promotion rules are untouched by the chassis.** ≥2 genuine independent non-origin
gate-rerunnable domains, gates re-run by the orchestrator, honest misfire entries — the loop
changes *when and how the work is organized*, never *what counts as evidence*.

## Pilot success criteria (what "survives" means)

Evaluated after ≥3 runs spanning ≥2 sessions:

1. `STATE.md` caught at least one drift or staleness that the brief-only convention would have
   missed — or demonstrably cheapened a pick-up (fewer tokens to re-orient than brief archaeology).
2. Every run-log record passes a form check (fields present, timestamps monotonic, file
   append-only via git diff) — manual until/unless a `check-runlog` gate is earned.
3. Budget line respected on every run; kill switch never needed or, if used, honored.
4. At least one component's status legitimately moved through the loop (promotion **or** an honest
   misfire/`unverifiable-here` record — both count; a run of honest negatives is a success, a
   manufactured domain is the failure).
5. No `STATE.md` write contradicted `implemented-vs-planned` on review.

Exit: fold what survived into the plugin (a skill or an amendment to `handoff`/`pick-up`, its own
ADR) — or record the misfire in FEEDBACK.md and retire the chassis. Goodhart guard, named: the
pilot's metric is *honest records per run*, not *components settled per run*; pressure to settle
faster than domains arrive is the exact correct-shaped-lie failure mode, and criterion 4 is
written to make honest negatives count.

## Decisions resolved (review 2026-07-08, all on the recommended option)

1. **Effort state lives tracked in rigor** at `docs/efforts/backlog-settlement/` — git history
   mechanically enforces the run log's append-only property, and the pilot artifacts double as the
   reference specimen of the pattern.
2. **Sweep trigger: session-triggered only** for the pilot — the L1 re-verify sweep runs as part
   of picking the effort up. Clock-triggered sweeps are considered only after the pilot survives.
3. **Budget: L1 sweeps ≤ 150k subagent tokens**; recon-scale runs (~1M, like 2026-07-08's) require
   an explicit operator go in the prompt, recorded in the run log.
4. **Run-log format: JSONL** (`run-log.jsonl`, one record per run, ADR-0003 schema fields) —
   machine-checkable, append-only-diffable, and directly the Phase-C ledger's raw feed.

## Consequences

- **If it survives:** rigor gains its missing operational layer without compromising its
  epistemics — durable effort state, measured spend from run one (Phase C seeded), a legible
  answer to "can rigor run unattended" (L1 yes, L2 with the human, L3 never), and the backlog
  effort gets a spine instead of brief archaeology.
- **Risk — spine rot.** A mutable STATE.md that drifts from reality is worse than no spine.
  Mitigated: pick-up refutes it on every entry; every write passes `implemented-vs-planned`; the
  run log is the durable record, the spine only orients.
- **Risk — budget theater.** A stated cap nobody checks is decoration. Mitigated: actual spend
  recorded per run from the Workflow usage block; criterion 3 audits it.
- **Risk — pilot success pressure** (Goodhart). Named above; honest negatives satisfy criterion 4.
- **Cost.** Two files and a discipline; zero plugin surface, zero new hooks, zero always-on tokens.

---
*Related: ADR-0001 (self-contained beats elegant), ADR-0002 (judgment, not a universal gate),
ADR-0003 (anchored records; the schema this pilot's run log uses), `docs/feedback/FEEDBACK.md`
(promotion rules the chassis must not touch),
`docs/feedback/provisional-backlog-recon-audit_07-08-2026.md` (the run this formalizes).
Prior art: cobusgreyling/loop-engineering (STATE.md spine, run logs, budgets, autonomy ladder) —
composition, not adoption; its trust-the-gate verifier and L3 are deliberately excluded.*
