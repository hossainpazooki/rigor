# Plan & build record — ledger kit (learnings/handoff folders + tails index)

**Date:** 2026-07-12 (decisions locked 2026-07-10, operator-affirmed in-conversation)
**Implements:** [ADR-0003](../adr/0003-repo-context-and-learnings-files.md) (see its 2026-07-12
amendment) · **Status:** Built. All touched components remain `status: provisional`.

## Motivation, with the number

Reconstructing session state from raw transcripts is archaeology: the backlog-settlement
recon (run 1, `wf_1955b9bb-7f9`) burned **1.05M subagent tokens** producing *leads* that
still required operator gate re-runs before anything moved. The kit replaces archaeology
with three cheap, disciplined surfaces: anchored learnings, frozen handoff briefs, and a
routing-only tails index — each honoring "logs index candidate firings; only a gate re-run
moves a status."

## Locked decisions (2026-07-10; the ADR amendment is the short form)

1. **Per-repo ledger kit** = `docs/learnings/` + `LEARNINGS.md` index and `docs/handoff/` +
   `HANDOFF.md` index, mirroring the `docs/feedback/` shape: index = summary table +
   pointers only, never evidence; entries = dated immutable files. Proven in-house by
   FEEDBACK.md + its dated entries; a single overwritable HANDOFF.md file would be a
   second mutable surface pretending to be a record.
2. **Filenames: ISO `YYYY-MM-DD-<topic>.md`** — a plain listing sorts chronologically, and
   the dominant handoff operation is "latest." *(Amended 2026-07-12: feedback's legacy
   `<topic>_MM-DD-YYYY.md` was originally grandfathered; the operator revoked that — all
   entries were renamed to ISO via `git mv`. One convention everywhere.)*
3. **`docs/feedback/` stays rigor-only and keeps its name.** It holds adjudicated verdicts
   about rigor's *components* (the promotion ledger) — meaningless in a target repo, and
   not a "log" (logs are unjudged capture).
4. **Target-repo kit = learnings + handoff** (+ the effort chassis `STATE.md` /
   `run-log.jsonl` while an effort is live). One event may yield two records with
   different homes: the repo gets the fact, rigor gets the component verdict. Judged vs
   capture stays a hard line.
5. **Tails index is harness-side, never under any repo's `docs/`.** One JSONL row per
   session, `{ts_start, ts_end, session_id, cwd, tail}` — a regenerable cache, not a
   record. Reasons in force order: no single repo owns it (sessions span repos); a
   clone's copy dangles (pointers to machine-local transcripts); derived data with
   per-session churn; tails are unscrubbed self-reports one `git push` from public.
   Doctrine: **tails route, mid-file grep locates, gate re-runs decide.**
6. **`/rigor:handoff` is the sole writer of both ledgers** (ADR-0003's decision carried
   forward unchanged).
7. **Forward-only adoption** — no migrating pre-existing local briefs into the folders
   (no-backfill; the indexes may carry one pointer line to the old location).
8. **The shared local briefs folder survives** as the fallback for genuinely multi-repo
   sessions only.
9. **Recorded as this plan + a dated amendment inside ADR-0003** — no new ADR; this is
   mostly folder layout, and ADR-0004's spine-vs-transition split is untouched.

## What was built

| Piece | File(s) |
|---|---|
| Dogfood instance (both start empty; no backfill) | `docs/learnings/LEARNINGS.md`, `docs/handoff/HANDOFF.md` |
| ADR record | amendment + status line in `docs/adr/0003-repo-context-and-learnings-files.md` |
| Writer skill | `commands/handoff.md` — where the brief lands (in-repo vs multi-repo fallback), sole-writer duty + the seven required learnings fields |
| Reader skill | `skills/pick-up/SKILL.md` move 1 — reading order: repo context → STATE.md → HANDOFF.md index → latest entry → refute |
| Ledger gate | `scripts/check-learnings.mjs` + `tests/learnings-check.test.mjs` — required fields, monotonic timestamps, append-only via git name-status, index↔folder cross-pointing. Fails closed when git is unavailable. |
| Tails extractor | `scripts/extract-tails.mjs` + `tests/extract-tails.test.mjs` — pure `sessionRow()` matcher, CLI walks `~/.claude/projects/` (or a given root) and emits JSONL to stdout |

Scope notes, named: `check-learnings` gates the **learnings** record schema; handoff
entries share the filename/immutability/index discipline but follow the brief template,
not the seven fields — do not point the script at `docs/handoff/` and read a pass as
schema compliance once entries exist. The extractor caps `tail` at 10,000 chars (a
bounded cache, not a truncated record). Its output must stay out of every repo
(decision 5); shipping the *extractor* is fine — it is generic and domain-neutral.

## Gate evidence (2026-07-12)

- `node --test`: **102 pass, 0 fail** (86 before this build; +11 learnings-check,
  +5 extract-tails).
- `node scripts/check-surface-scrub.mjs`: `surface-scrub: clean` (the two shipped-surface
  touches, `commands/handoff.md` + `skills/pick-up/SKILL.md`, carry no fingerprints).
- `node scripts/check-learnings.mjs docs/learnings`: `learnings: clean (0 entries)`.
- `node scripts/extract-tails.mjs` against the real transcript store: **57 rows**, 57/57
  with `ts_start`+`session_id`+`cwd`, 54/57 with a tail (the 3 nulls are sessions that
  ended with no assistant text — honest nulls, not parse failures); sample row
  spot-checked against a known session.

## Not done (deliberately)

First entries in both ledgers — they land at the next genuine session boundary (§6
no-backfill). No FEEDBACK.md promotion entries: nothing here has survived an
independent domain yet.

## Amendment — 2026-07-13: the cartographer piece (closes ADR-0003's mechanism)

The remaining §6 mechanism item, built on operator go-ahead:

- `agents/repo-cartographer.md` (and its synced `~/.claude/agents/` copy, which keeps
  `model: inherit`) now returns the **repo brief pair** — canonical tool-neutral
  `AGENTS.md` + thin `CLAUDE.md` stub whose first line is `@AGENTS.md` — refreshing only
  the `<!-- rigor:generated -->`…`<!-- /rigor:generated -->` block where a brief already
  exists (ADR-0003 §4), emitting only target-repo facts (§5), and, on request, seeding
  the empty ledger folders (indexes only; entries stay the handoff flow's — §6 sole-writer
  unchanged).
- **Dogfood specimen (ADR-0003 §7):** rigor's own root `AGENTS.md` + `CLAUDE.md` stub,
  written from facts measured this session (folder listings, manifests, hooks.json),
  not memory. AGENTS.md stays timeless — effort state lives in STATE.md/handoff, not here.

Gate evidence (2026-07-13): `node --test` 102 pass 0 fail; `surface-scrub: clean`;
`tier-sync: clean` (frontmatter `model:` untouched by the description edit).
