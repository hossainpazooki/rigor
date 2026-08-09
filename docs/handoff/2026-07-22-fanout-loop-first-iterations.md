# Handoff — mid tier + fanout-loop built; settlement runs 4–5 executed; loop halted on budget

2026-07-22 · newest commit this brief describes: `e9e38bf` (pick-up measures drift from
here). Written at 20:36Z by session `10d1e5e1`. **Uncommitted at write time** (operator
commits pending): run-5 effort files (STATE.md, run-log entry 5, `runs/run-5-verdicts.jsonl`),
the run-5 feedback entry + FEEDBACK.md rows, this brief, 4 learnings entries + index rows,
and the pre-existing `docs/comparisons/2026-07-21-…` modification (not this session's).

## Current state

- **built** ADR-0007 mid tier: `mid: claude-opus-4-8` in `config/models.json`;
  `integration-runner` + `skeptic-verifier-fast` repinned; `check-dispatch` accepts
  `"mid"`. Exercised live twice (runs 4–5), receipts three-way both times.
  re-verify: `node scripts/check-tier-sync.mjs` (clean, 5 agents) and
  `node --test tests/dispatch-check.test.mjs` (26 pass).
- **built** `receiptMatches` normalization (fail-closed on ambiguity) — non-vacuously
  exercised: first mid receipt answered `claude-opus-4-8[1m]`.
  re-verify: `node --test tests/dispatch-check.test.mjs`.
- **built** ADR-0008 `commands/fanout-loop.md` (one invocation = one iteration; spec
  `docs/specs/2026-07-22-fanout-loop-design.md`, plan `docs/plans/2026-07-22-fanout-loop-plan.md`).
  re-verify: `node scripts/check-surface-scrub.mjs` (clean).
- **built** `check-runlog` gate, red-first — discharges ADR-0004's "mechanize on the
  4th run" condition. re-verify:
  `node scripts/check-runlog.mjs docs/efforts/backlog-settlement/run-log.jsonl` (clean, 5 entries).
- **built** Runs 4–5 executed and fully recorded (run-log entries 4–5; verdict logs under
  `docs/efforts/backlog-settlement/runs/`; dated feedback entries 2026-07-22 ×3).
  re-verify: `node scripts/check-dispatch.mjs docs/efforts/backlog-settlement/runs/run-5-verdicts.jsonl` (clean, 4 records).
- **halted** The settlement loop: run 5 breached the L1 budget (185,212 > 150k,
  `within_cap: false` in entry 5). Queue empty; sweep mode blocked on an explicit
  operator go. re-verify: read run-log entry 5's `budget.breach` + STATE.md's queue section.
- **planned** (never started): ADR-0005 resolution-2 catalog sweep (needs operator go);
  ulc Postgres pytest leg (environment).

## Locked decisions

- **Mid tier exists and is Opus** (ADR-0007) — reason: operator-reported usage economics
  (recorded as operator-reported, NOT measured; that premise is the re-check point).
  Builders stay Sonnet; `floored_nodes` stay Fable — never cheapen floors.
- **fanout-loop = one iteration per invocation; recurrence belongs to the host `/loop`**
  (ADR-0008) — reason: command/cadence separation keeps the budget go explicit.
- **Gate-discipline domain 2 requires a DIFFERENT repo** (run 4) — RRE is domain 1;
  same-repo work extends domain 1. STATE's old "live candidate" line was wrong; corrected.
- **Ledger-kit domain 2 NOT credited** (run 5) — cldd = kit misfire #2 (serialization
  dialect); pvt-demo = bases genuine but ledger untracked. Do not re-credit without the
  gap-closures below.
- **Honest negatives count as progress** (effort goal) — runs 4–5 moved zero promotion
  rows and that is the correct outcome, not a failure to fix.

## Reuse map

- Workflow-script pattern for tier-laddered adjudication: quoted in the run records and
  reproducible from `skills/fanout-build/example.mjs` + the three learnings entries below
  (scratchpad copies are session-local and gone). Key pieces: parse-args-if-string +
  halt-if-unpinned; bare-id RECEIPT instruction; `model_self_report` in every schema;
  evidence [build] → primary [judgment, `agentType: rigor:skeptic-verifier`] → vote
  [mid, `rigor:skeptic-verifier-fast`]; verdict JSONL per run under `<effort>/runs/`.
- Gates: `check-tier-placement` pre-launch, `check-dispatch` post, `check-runlog` on the
  log you append to. All pure-matcher + CLI; tests show usage.
- Fresh learnings (this session): args-as-string, `[1m]` receipt suffixes,
  check-learnings dialect+cwd limits — read before writing any new workflow or
  cross-repo gate run.

## Invariants

- Budget: ≤150k subagent tokens per iteration; breach ⇒ halt and ask (run 5 is the
  precedent). Instantiation ceiling 1M (284k spent). `paused: true` fail-closed.
- No manufactured firings; domains move only on real work in real repos; same-repo
  firings extend an existing domain, never open a new one.
- Ledger discipline: indexes are pointers; entries immutable; capture-time anchors
  (never batch-stamp — check-learnings flags identical ts).
- **Re-verify lines must be read-only** (new, from run 5's incident — a mutating
  `--yes` re-verify was executed by a verification agent; effect no-op, harness-flagged).
- git-guard: agents never write history; surface stays domain-neutral (scrub gate).

## Open / next

**First: three operator decisions gate everything** (the loop stays halted until made):
1. Budget policy for sweep mode — keep 150k with ≤3 agents/iteration, or raise the cap.
2. cldd serialization — harden the `/rigor:handoff` writer's emitted dialect, widen the
   check-learnings regexes to accept bold labels, or both (misfire #2's fix).
3. Commit pvt-demo's ledger (`git add docs/learnings docs/handoff` there) — that alone
   likely completes ledger-kit domain 2 on re-adjudication.

Then, in rough order: restart the loop (`/loop /rigor:fanout-loop
docs/efforts/backlog-settlement`) for sweep mode; adjudicate `judgment-dispatch` +
`skeptic-verifier-fast` domain credit (both FIRED in runs 4–5 with logged verdicts —
target-repo claims, so plausibly creditable; unadjudicated); gate-discipline domain-2
candidate = CLDD 0.3.0 release gate; probe and amend AGENTS.md's "registry is
session-start-static" claim (`/reload-plugins` reported 17 agents reloaded mid-session —
suggestive, unproven); example.mjs still lacks parse-args-if-string.
