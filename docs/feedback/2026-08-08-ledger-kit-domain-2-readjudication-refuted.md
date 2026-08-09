# Ledger-kit domain 2 re-adjudication — REFUTED (run 6)

ts: 2026-08-08T17:58:30Z (workflow `wf_c0985556-a59` completion; verdicts received)
session: fcb0d613-5fe9-439c-8124-ec75edc46c36 · rigor commit at adjudication: 903759f
(gate-widening + writer-hardening changes uncommitted at adjudication time — the
skeptic verified and noted this itself)

## What was adjudicated

After the 2026-08-08 operator gap-closures (pvt-demo ledger found committed;
`check-learnings` widened to accept bold labels; writer hardened), the proposed
adjudication was:

- (a) pvt-demo **credits** as ledger-kit domain 2 — ledger tracked+clean,
  bases previously reproduced (run 5), single remaining gate red is a trailing
  annotation after a valid `status:` enum value (dialect, not substance);
- (b) cldd does **not** credit — its two 2026-07-29 entries carry no record
  fields at all (substance, not typography);
- (c) the field-record schema applies to `docs/learnings/` only; running it
  over a `docs/handoff/` folder is misapplication.

Dispatch: evidence ×2 [build: claude-sonnet-5] → primary skeptic
[judgment: claude-fable-5, `rigor:skeptic-verifier`] → independent vote
[mid: claude-opus-4-8, answered `claude-opus-4-8[1m]`,
`rigor:skeptic-verifier-fast`]. 172,323 subagent tokens (within the
operator-raised 250k L1). Verdict log:
`docs/efforts/backlog-settlement/runs/run-6-verdicts.jsonl` —
`check-dispatch` clean, 4 records.

## Verdict: REFUTED (both skeptics, independently)

- **(a) refuted on a load-bearing sub-claim.** pvt-demo's two dated learnings
  entries were **edited in place after their first commit**
  (`2026-07-15-pin-drift-fail-loud.md` A@587d656 → M@a645895;
  `2026-07-24-pin-cannot-cover-untracked-artifacts.md` A@aae103a → M@eb2a8f4,
  the latter mutating the `status:` record field itself). Neither correction
  used the kit's superseding `kills:` mechanism. The qualified-status gate red
  is therefore **the fingerprint of an immutability breach**, not an innocent
  dialect variant. Crediting would also have required overriding a red
  fail-closed gate by human judgment.
- **Gate defect found (new):** `check-learnings`' append-only clause diffs
  only working-tree-vs-HEAD, so committed in-history edits pass **vacuously**
  — the exact inversion of "immutability non-vacuous". Verified against the
  gate source and pvt-demo's clean-tree/red-history state.
- **(b) sound** — cldd's two 2026-07-29 entries are prose essays with no
  field block; the bold-label widening cannot help entries with no labels.
- **(c) not cleanly established** — empirically prose briefs fail the field
  checks by construction (rigor's own handoff folder does too), but
  `docs/plans/2026-07-12-ledger-kit-plan.md:60-63` ("do not point the script
  at `docs/handoff/`") contradicts the tool (accepts `HANDOFF.md` as index)
  and AGENTS.md ("same index-plus-entries shape"). Internal scope
  contradiction — needs a decision, not a ruling.
- Shared-operator objection **rejected by the vote** with reasoning worth
  keeping: "independent domain" must mean independent codebase/subject-matter,
  or no promotion could ever reach 2 domains in a single-operator toolkit.
- Evidence-agent misdiagnosis caught by the primary skeptic: the gatherer
  attributed the status failure to an embedded colon; actually the regex fails
  on the enum value not being end-of-line — before any colon is reached.

## What moves it now

- pvt-demo: superseding `kills:` entries for the two in-place edits (in
  pvt-demo), **and** a history-aware append-only leg in `check-learnings` (or
  an explicit ADR scoping the gate to tree-vs-HEAD with the residual named).
- cldd: rewrite/supersede the two 2026-07-29 entries with real field blocks.
- The handoff-scope contradiction: operator decision (gate mode for handoff
  folders, or plan-doc line wins and AGENTS.md prose is corrected).

Honest negative: the second re-adjudication in a row where the kit's own
discipline caught its own demo repos. The kit's *verification* layer is doing
its job; the *adoption* contract is still leaking.
