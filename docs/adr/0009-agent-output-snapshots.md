# ADR-0009 — Snapshots ledger: verbatim agent-output exhibits

**Status:** **Accepted 2026-08-18** (Proposed 2026-08-02). Pending decision 1 is
resolved by the ADR's own strict reading: **no backfill** — the folder starts
empty everywhere, including the motivating tic report. Pending decisions 2–3
(run-log citations; gate placement) are deferred to build time and remain open;
nothing is built yet.

## Context

The ADR-0003 kit gives a target repo two ledgers: `docs/learnings/` (anchored,
re-executable facts) and `docs/handoff/` (session-transition briefs). Both are
*distillations*. The primary material they distill — a skeptic's full
refutation report, a red-run capture, an integration-runner's terminal
evidence — lives only in the session transcript and the per-run scratch
buffer, both machine-local and ephemeral. ADR-0003 §2 already says the quiet
part: transcripts are "pointer, not proof … the pointer is never the
evidence," which is why a basis is *quoted into* the entry at capture time.
But a basis quote is an excerpt. The full report dies with the session.

The motivating case (2026-08-02, treasury-intent-controller): a
skeptic-verifier dispatched against a gate build refuted the build's totality
claim with a concrete counter-case (an out-of-domain score value falling
through a switch as an implicit pass), which drove a same-session code fix.
That report is the single most valuable artifact the session produced after
the diff itself — and its only durable trace is a four-line verdict summary in
the handoff brief. The spec governing that session mandates actor/evaluator
separation: the evaluator gets the actor's *summary of* the skeptic, which is
exactly the second-hand claim rigor tells people not to trust.

The counter-force, and it is the design's center of gravity: **an agent's
report is claimant text, not verified fact.** rigor's whole thesis is that a
subagent's output is a claim set to refute, not a result to accept. A folder
of raw agent output sitting beside two refutation-grounded ledgers will, over
time, get read as a third ledger of facts. Any design that does not make
exhibit-status structural is worse than the status quo.

## Decision

Add a third folder to the ADR-0003 kit: **`docs/snapshots/`** — dated,
immutable, *verbatim* agent-output exhibits, plus a pointer-only
`SNAPSHOTS.md` index (the proven index-plus-entries shape).

**1. An exhibit is evidence-of-what-was-said, never evidence-of-truth.**
Required header fields, gated mechanically:

- `ts:` — capture time, machine-stamped when the output landed (ADR-0003's
  capture-time anchoring rule applies unchanged: never composed later);
- `commit:` — target repo HEAD at capture;
- `session:` — provenance pointer into the harness transcript;
- `agent:` — agent type **and the model that actually answered** (the
  snapshot doubles as a dispatch receipt in the ADR-0006/0007 sense);
- `status: claimant-report` — a **fixed literal**, the field's only legal
  value. Verification status never lives on the exhibit; it lives on the
  ledger entry that cites it. This is the structural guard against the
  third-ledger-of-facts failure mode;
- `cited-by:` — at least one learnings entry, handoff brief, or run-log
  record that used this output. **No orphans**: a snapshot exists only
  because a ledger entry needed it. The citing entry carries a reciprocal
  `exhibit:` pointer.

**2. Threshold — only load-bearing output earns an exhibit** (rigor
minimalism; don't snapshot the swarm's prose). Qualifying: a verifier report
whose verdict changed the build or a decision rests on it; a
fails-then-passes / red-run capture cited as a basis; an integration-runner's
terminal evidence. Routine build-agent output never qualifies.

**3. Sole writer: `/rigor:handoff`**, same as the other two ledgers, curating
from the per-run scratch buffer (which already holds output verbatim as it
lands — so sole-writer-at-close and capture-time anchoring coexist, per the
ADR-0003 07-14 amendment's mechanism).

**4. Verbatim means verbatim.** Exhibits are never edited — not for length,
not for vocabulary. Consequence for target repos that gate prose in `docs/`
(the motivating repo's vocabulary gate walks all markdown): the convention is
that **snapshot exhibits are exempt from prose gates** — a quoted term inside
an exhibit is the *agent* speaking, not the repo. rigor can only state this
norm; the exemption itself is a one-line change in the target repo's gate,
made by that repo's own amendment discipline. A wrong exhibit is superseded
by a later ledger entry that says so; the exhibit stands.

**5. Mechanization: `check-snapshots.mjs`** (house style: pure exported
matcher, fs at the CLI boundary): required fields present; `status:` is the
exact literal; every `cited-by:` target file exists; prior entries
byte-unchanged; `ts:` distinctness shared with `check-learnings`' batch-stamp
rule. Standing limit, same as ADR-0003's: the gate verifies form and
append-onlyness — it cannot verify the text is genuinely what the agent said.
The honest claim is "captured and pointed-at," never "true," and not even
"anchored and re-executable" (an exhibit has no `re-verify:` — that field
belongs to the citing ledger entry, deliberately).

**6. Dogfooding:** rigor hosts `docs/snapshots/` itself, starts empty, earns
entries forward. No backfill (ADR-0003 §6 stands).

## Consequences

- **If accepted:** a brief's "skeptic pass, 4 claims" line points at the
  primary report instead of paraphrasing it; `pick-up` and evaluator sessions
  read the claimant's own words and then still re-run the citing entry's
  `re-verify:` line — exhibits change what can be *read*, never what may be
  *trusted*. Verifier reports stop being the only session artifact with no
  durable home.
- **Risk — read as a third ledger of facts.** Mitigated structurally: fixed
  `status: claimant-report`, no `re-verify:` field, verification status only
  on citing entries, and the no-orphan rule keeping volume tied to actual
  ledger use.
- **Risk — sprawl.** Mitigated by the load-bearing threshold and no-orphan
  rule; an exhibit without a citing entry is a gate failure, not a judgment
  call.
- **Cost.** One new check script + tests; text edits to `handoff` (writer) and
  `pick-up` (reader) skills and the cartographer's seed step; one index file
  per adopting repo. No new hook, no new command, no new agent.

## Pending decisions (operator)

1. **Seed-vs-forward for the motivating case.** The 2026-08-02 skeptic report
   still exists verbatim in the live session at proposal time — capturing it
   now is arguably genuine capture (text at hand), not reconstruction. But it
   was not machine-stamped when it landed, so its `ts:` would be a
   proposal-time stamp of a session-time event — precisely the anchor drift
   the 07-14 amendment exists to prevent. Strict reading: no-backfill applies;
   the folder starts empty everywhere. Operator's call, in the open.
2. **Run-log citations.** Whether ADR-0004 chassis run-log records may appear
   in `cited-by:` (they are append-only JSONL, not markdown entries) or
   citations are restricted to the two markdown ledgers.
3. **Gate placement.** Own script vs a mode of `check-learnings.mjs` — the ts
   rule is shared, the field schema is not.

---
*Extends ADR-0003 (the kit gains a third folder; record schema and triggers of
the existing two unchanged). Related: ADR-0006/0007 (the `agent:` field is a
dispatch receipt), `docs/feedback/FEEDBACK.md` (the index-plus-entries shape),
the git-guard posture (exhibits sit untracked until the human commits).*
