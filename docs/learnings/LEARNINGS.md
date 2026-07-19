# Learnings ledger (index)

Anchored, re-executable records of non-obvious facts learned about **this
repo** — what survived refutation and what got killed (ADR-0003). Entries live
beside this file as dated immutable markdown files, `YYYY-MM-DD-<topic>.md`,
so a plain listing sorts chronologically (newest at the bottom). This index
holds **pointers only, never evidence**: every claim here must trace to an
entry file, which traces to its quoted basis.

Each entry is a record with required fields, gated by
`scripts/check-learnings.mjs`:

- `ts:` — RFC 3339 UTC, captured from the system clock when the finding
  landed (never composed from memory, never reconstructed later)
- `commit:` — this repo's HEAD at capture, the against-what-state anchor
- `session:` — provenance pointer into the harness transcript (pointer, not
  proof: transcripts are machine-local and ephemeral)
- `status:` — `verified` | `refuted-assumption` | `suspected`
- `fact:` — the one-line non-obvious finding
- `basis:` — the command run and its output, quoted into the entry at capture
- `re-verify:` — one executable line that re-establishes the fact

Entries are immutable once written; a wrong entry is never edited in place — a
dated superseding entry with a `kills:` reference is appended instead.
`/rigor:handoff` is the sole writer: it curates the per-run scratch buffer's
survivors, carrying their original timestamps — nothing enters un-judged.
The ledger started empty on 2026-07-12 and earns entries forward, never
backfilled (a reconstructed entry is a capture-shaped lie).

This folder is distinct from `docs/feedback/`: feedback holds verdicts about
rigor's **components** (the promotion ledger, rigor-only); learnings hold
anchored facts about the **repo** itself. Target repos rigor works in get a
learnings folder of their own; they never get a feedback folder.

## Entries

| Date | Entry | Status | Fact |
|---|---|---|---|
| 2026-07-14 | [2026-07-14-form-gate-passed-a-record-whose-basis-was-fiction.md](2026-07-14-form-gate-passed-a-record-whose-basis-was-fiction.md) | verified | `check-learnings` passed a ledger green whose quoted basis did not exist at its own commit anchor — a form gate is a floor, never a verdict |
| 2026-07-15 | [2026-07-15-check-fanout-has-no-tier-pin-check.md](2026-07-15-check-fanout-has-no-tier-pin-check.md) | verified | `check-fanout.mjs` checks contract/schema/integration/verify but has no check for a build-tier `model:`/`agentType:` pin on `agent()` calls — the gap ADR-0006 proposes to close *(superseded 2026-07-18: gap closed by `check-tier-placement.mjs`)* |
| 2026-07-18 | [2026-07-18-agenttype-is-not-a-tier-pin.md](2026-07-18-agenttype-is-not-a-tier-pin.md) | verified | `agentType:` alone is not a tier pin — with `model: inherit` frontmatter the call still collapses onto the session model (tic build: 505/505 turns on Fable despite 7 typed agents) |
| 2026-07-18 | [2026-07-18-tier-pin-gate-red-on-real-collapse.md](2026-07-18-tier-pin-gate-red-on-real-collapse.md) | verified | `check-tier-placement.mjs` built (separate gate, operator call) and verified non-vacuous red on the real tic collapse script; example.mjs fixed to config-sourced tiers + worker receipts |
| 2026-07-19 | [2026-07-19-receipt-answered-needs-bare-model-id.md](2026-07-19-receipt-answered-needs-bare-model-id.md) | verified | receipt prompts must demand the bare model id — display-name echoes false-positive check-dispatch's silent-downgrade class (13/16 on first live run); gate-side normalization still unbuilt |
| 2026-07-19 | [2026-07-19-halt-check-needs-affirmative-marker.md](2026-07-19-halt-check-needs-affirmative-marker.md) | verified | `/\bHALT\b/` over spike free text halts on "No HALT" — affirmative markers only (`HALT:` or line-start); live false-halt on the CLDD v3 build; shipped example.mjs carried and now fixes the same pattern |
