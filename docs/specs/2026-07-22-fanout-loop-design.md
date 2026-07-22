# `/rigor:fanout-loop` — design (ADR-0008)

Date: 2026-07-22 · Status: design approved in-session, ADR-0008 to be written from this
spec · Operator decisions locked: one phased loop; standing L1 authorization per wakeup;
adjudication-pipeline iteration shape (approach 1 of 3); ships as a separate command on
the plugin surface.

## What it is

A shipped slash command (`commands/fanout-loop.md`) composing two settled pieces:

- the **loop chassis** (ADR-0004): STATE.md spine, append-only `run-log.jsonl`,
  L1/L2/never-L3 budget classes, `paused: true` honored fail-closed;
- the **tier ladder** (ADR-0007): judgment (Fable) / mid (Opus) / build (Sonnet)
  dispatch through `judgment-dispatch`'s stakes rubric, receipts linted by
  `check-dispatch`.

One invocation executes **one iteration** of a named effort's loop. Recurrence belongs
to the host: `/loop /rigor:fanout-loop <effort-path>`, self-paced. The command never
schedules its own wakeups — command = iteration, host loop = cadence.

## Iteration contract

1. **Enter via pick-up.** Refute the effort's STATE.md before trusting it (the spine is
   mutable, not evidence). `paused: true` halts fail-closed before any dispatch.
2. **Derive this run.** Pop the next queued run from STATE.md's `## Run queue` section
   if one exists; otherwise derive a sweep item list from the effort's backlog rows. An
   empty derivation is an **honest dry pass** (see termination), never an invented item.
3. **Dispatch as one Workflow script.**
   `pipeline(item → evidence-gather [build tier] → primary skeptic [judgment tier] →
   extra votes [mid tier, skeptic-verifier-fast])`. Tiers are sourced from
   `config/models.json` and passed via `args` (no hardcoded model literals);
   `check-tier-placement` gates the script before launch. Status-moving claims sit in
   the rubric's medium band (`downstream-decisions`), which is what routes the primary
   to judgment and the extra votes to mid — every iteration therefore emits a verdict
   log with the three-way Fable/Opus/Sonnet receipt split.
4. **Exit gates, re-run by the orchestrator.** `check-dispatch` clean on the per-run
   verdict log (`<effort>/runs/run-N-verdicts.jsonl`, beside the run log), plus the
   target repos' **own gates** for any status move — logs index candidates; only a gate
   re-run moves a status.
5. **Ledger writes.** Run-log append; STATE.md refresh (every write passes
   `implemented-vs-planned`); dated feedback entries for real firings.
6. **Emit commit commands.** git-guard holds; history stays the operator's.
7. **Terminate or continue.** The loop ends on: K=2 consecutive dry passes · the
   instantiation's total token ceiling · `paused: true` · an operator stop. A dry pass
   is recorded in the run log as a run, not silently skipped.

## Authorization semantics

Invoking `/loop /rigor:fanout-loop <effort>` **is** the recorded standing go for L1
iterations: ≤150k subagent tokens per wakeup. Recon-scale work halts and asks; the
authorization, its ceiling, and its date are recorded in the first run-log entry the
loop writes. Each instantiation sets a **total ceiling** across all iterations
(settlement instantiation: 1M subagent tokens, then hard stop).

## Honesty guardrails (command text)

- **No manufactured firings.** A loop is exactly the pressure the STATE.md rule exists
  for: items move when real work happens in real repos; a wakeup with no real candidate
  records a dry pass.
- **Domain-credit boundary.** A dispatch adjudicating a claim in a *target* repo may
  credit that repo as an independent domain for the components it fires; a dispatch
  about the effort's own bookkeeping counts as use only.
- **Self-report discipline.** The workflow's self-reported success is a claim; the
  orchestrator re-runs the load-bearing checks itself (exit-gate step 4).

## Folded-in obligations (open items from prior ADRs that intersect this loop)

- **ADR-0004 → `check-runlog`.** Criterion 2 was met by hand on runs 1–3; the ADR's own
  condition says mechanize on the 4th. The first iteration of the settlement
  instantiation IS run 4, so it must **build `check-runlog` red-first** (the three
  existing hand-validated entries as green fixtures; a mutated twin as the red fixture)
  **before appending its own entry**, and every later iteration runs it as an exit gate.
- **ADR-0006 → receipt normalization.** `check-dispatch` can false-positive on
  display-name echoes (e.g. an agent answering a display name rather than a bare model
  id). This loop's halt condition depends on `check-dispatch` clean, so a known
  false-positive source is a spurious-halt generator: fix normalization (red-first,
  reusing the 2026-07-19 receipt learnings entries as fixtures) **before the first
  verdict log is trusted**.

## Domain-neutrality boundary

The shipped command is effort-agnostic: it names no repos, runs, or projects, and must
pass `check-surface-scrub`. Instantiation content — the settlement effort's run queue
(run 4: gate-discipline adjudication of a merged target-repo PR + the ADR-0006
criterion-2 feedback pointer entry; run 5: ledger-kit second-domain verification) —
lives in `docs/efforts/backlog-settlement/STATE.md`, never in `commands/`.

## What ships vs what is instantiation

| Piece | Where | Status when built |
|---|---|---|
| `commands/fanout-loop.md` | plugin surface | new |
| ADR-0008 + index row | `docs/adr/` | new |
| `check-runlog.mjs` + tests | `scripts/`, `tests/` | new (folded obligation, built in run 4) |
| `check-dispatch` receipt normalization + tests | `scripts/`, `tests/` | change (folded obligation) |
| `## Run queue` section (runs 4–5) | settlement STATE.md | instantiation content |
| Per-run verdict logs | `<effort>/runs/` | produced at runtime |

No new agents. Existing gates (`check-tier-placement`, `check-dispatch`,
`check-surface-scrub`, `node --test`) cover the rest.

## Honest caveats (to be carried into ADR-0008)

- The first instantiation runs against rigor's own settlement effort — **use, not an
  independent domain** for the command itself.
- Same operator throughout; the standing same-operator caveat applies to anything the
  loop credits.
- The mid tier has still never answered a dispatch at design time; the first iteration
  is the experiment, and a receipt mismatch there is a finding, not a failure of the
  design.
