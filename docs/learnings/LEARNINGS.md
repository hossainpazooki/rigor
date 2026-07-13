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

*(none yet — the first entry lands at the next session boundary)*
