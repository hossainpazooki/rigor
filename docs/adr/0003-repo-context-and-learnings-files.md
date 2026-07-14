# ADR-0003 — Repo context + learnings files (CLAUDE.md / AGENTS.md / LEARNINGS.md)

**Status:** Accepted (2026-07-08) — reviewed; all seven pending decisions resolved (see
"Decisions resolved" below). Implemented 2026-07-12 with a revised folder layout — see the
Amendment at the end and [`docs/plans/2026-07-12-ledger-kit-plan.md`](../plans/2026-07-12-ledger-kit-plan.md).

## Context

Hossain's ask: *"I want rigor to create `CLAUDE.md`, `AGENTS.md`, and `LEARNINGS.md` in each
repo it touches."* The motivation is real — a repo rigor has worked in should carry its own
orientation (so the next agent/tool starts warm) and its own ledger of what was learned
(so hard-won, non-obvious knowledge survives the session).

What already exists in this space:
- **`CLAUDE.md`** — Claude Code auto-loads it into context. `rigor:repo-cartographer` already
  produces/refreshes it as step 0 of the spine (`docs/using-rigor-on-a-new-repo.md`). So one of
  the three files is a *formalization*, not a new capability.
- **`AGENTS.md`** — the emerging cross-tool convention (Codex, Cursor, Copilot, Gemini). Same
  *purpose* as CLAUDE.md — repo orientation for an agent — but portable across ecosystems. rigor
  does not produce it today.
- **`LEARNINGS.md`** — no analogue in a target repo. rigor's own `docs/feedback/FEEDBACK.md`
  promotion ledger (provisional → settled) is the nearest pattern, but that lives in *rigor*, not
  in the repos rigor touches.

Two forces pull against the naive reading of the ask:
1. **rigor's minimalism** — *"Don't run stages the task doesn't earn"* (`using-rigor-on-a-new-repo.md`).
   Writing three files into *every* repo a read-only recon merely glanced at contradicts the
   plugin's own spine.
2. **rigor never writes git history and shouldn't silently litter a repo.** Creating untracked
   files in someone else's tree is a mild outward action; the git-guard hook already embodies
   "hand the human the commit, don't run it." Auto-spraying files cuts against that posture.

## Decision (accepted 2026-07-08, as amended in review)

Adopt the feature, but as a **tiered, opt-in-by-threshold** capability — not an
every-touch auto-write.

**1. CLAUDE.md + AGENTS.md are one source of truth, not two.**
`AGENTS.md` is the **canonical, tool-neutral** repo brief (structure, commands, invariants).
`CLAUDE.md` is a **thin stub** that `@AGENTS.md`-imports it (Claude Code's `@import` is proven —
the user's own global `~/.claude/CLAUDE.md` uses `@rules/*.md`) plus any Claude-Code-only harness
notes. Rationale: identical content in two files drifts; a single canonical brief + import serves
both ecosystems with zero divergence. This mirrors ADR-0001's "self-contained beats elegant."
**The stub is required, not decorative** — probe-verified 2026-07-08 that this harness build does
not load `AGENTS.md` natively (evidence table in "Decisions resolved" §1).

**2. `LEARNINGS.md` is an append-only ledger of log *records*, not dated prose.**
A "date + prose basis" entry is self-report — a claim wearing evidence's clothes. Each entry is
instead a record with required fields:

- **timestamp** — RFC 3339 UTC, captured from the system clock at the moment the finding landed
  (never composed from model memory, never reconstructed later);
- **commit** — the target repo's HEAD at capture, the *against-what-state* anchor (wall-clock time
  is the weakest identifier available);
- **session id** — a provenance pointer into the harness's own transcript
  (`~/.claude/projects/<dir>/<session-id>.jsonl`). Pointer, not proof: transcripts are
  machine-local and ephemeral, so the pointer is never the evidence;
- **fact** — the one-line non-obvious finding;
- **basis** — the command run and its output, *quoted into the entry at capture time* (evidence is
  copied out of the transcript, never left in it);
- **status tag** — verified / refuted-assumption / suspected (`implemented-vs-planned` verbs);
- **`re-verify:`** — an executable line that re-establishes the fact, the same contract handoff
  briefs carry. This is what makes the ledger a batch of *refutable claims* that `pick-up` can
  execute, rather than a wiki with dates.

It records what *survived refutation* and what *got killed* — rigor's whole thesis, made
persistent for the repo. Append-only, mechanically: a wrong entry is never edited in place — a
dated superseding entry with a `kills:` reference to the entry it refutes is appended instead
(corrections stay visible, matching the FEEDBACK.md ledger discipline). **Named residual limit:**
a form gate can verify an entry's fields are present and the file only grew; it can never verify
the basis is genuine. The honest claim for this ledger is "anchored and re-executable," not "true."

**3. Trigger threshold — a repo is "touched" enough to earn files only on a substantive touch:**
- **Read-only work** (`/rigor:recon`, `/rigor:verify-claim`, `/rigor:honesty-check`): **never**
  auto-writes. It may *offer* ("this repo has no AGENTS.md — want one?").
- **Substantive touch** (`/rigor:fanout` build, `/rigor:handoff`, a state-changing
  `/rigor:verify-effect`): **ensure the files exist** — create if missing (confirm-first the first
  time per repo), and update the relevant one (AGENTS.md on a structure change; LEARNINGS.md on any
  refuted assumption or gotcha found).

**4. Never overwrite; merge the rigor-owned section only.** If a repo already has a CLAUDE.md /
AGENTS.md (e.g. hand-written), rigor refreshes a delimited `<!-- rigor:generated -->` block and
leaves everything else alone.

**5. Domain-neutral output.** Generated files carry only the *target repo's* facts and must pass
`surface-scrub` — rigor's jargon never leaks into a client repo (ADR-0002, `rigor-domain-neutral`).

**6. Mechanism:** extend `repo-cartographer` (already owns CLAUDE.md) to emit AGENTS.md + the
CLAUDE.md stub + seed LEARNINGS.md — rather than adding a new top-level command. Keeps rigor's
surface small. **Not a hook** (too automatic; conflicts with confirm-first). Capture is staged:

- **During the session**, findings append continuously to a **per-run scratch JSONL** in the
  scratchpad, machine-stamped as they land — the verdict-log per-run pattern reused (stale records
  must not mask new findings; timestamps are captured, not reconstructed). Fanout and
  state-changing verify-effect write to this buffer *only*.
- **`/rigor:handoff` is the sole LEARNINGS.md writer**: it curates the buffer's survivors into the
  repo file, carrying their *original* timestamps. Those flows end in a handoff/checkpoint anyway,
  so a single curation point loses nothing and runs the honesty pass exactly once.
- **`check-learnings.mjs`** (house style: pure matcher, fs at the CLI boundary, caller supplies
  the file) gates the result: required fields present, timestamps monotonic, and — via git diff —
  prior entries byte-unchanged (append-only enforced, not aspired to). Phase C's usage ledger can
  read the same scratch buffer; one capture mechanism, two consumers.

## Decisions resolved (review 2026-07-08)

1. **Canonical direction: AGENTS.md-canonical + CLAUDE.md `@AGENTS.md` stub — and the stub is
   required.** Resolved empirically, not by preference. Probe (Claude Code **2.1.204**,
   2026-07-08): three scratch dirs, fresh headless session each (`claude -p`, haiku), asked to
   report a marker codename planted in the context file. Oracle: self-consistent (the model's
   report of its own context).

   | Dir | Context file | Reported | Reading |
   |---|---|---|---|
   | A | `AGENTS.md` only | `NONE` | AGENTS.md **not** loaded natively |
   | B | none (negative control) | `NONE` | baseline |
   | C | `CLAUDE.md` only (positive control) | its marker | loading is detectable → probe discriminates |

   C ≠ B proves the probe can see a loaded file, so A = B is a real negative, not a vacuous one.
   **Re-probe on harness upgrades** — if a future build loads AGENTS.md natively, the stub becomes
   droppable and this resolution should be revisited.
2. **Mechanism: extend `repo-cartographer` + `/rigor:handoff`** (as amended in Decision §6). No
   new command, no hook.
3. **Trigger threshold: as proposed, tightened** — `/rigor:handoff` is the *only* LEARNINGS.md
   writer; fanout and state-changing verify-effect append to the per-run scratch buffer only.
4. **Confirm-first-once**, not suggest-only. rigor never commits, so every file it creates sits
   untracked until the human commits it — the git boundary is already a second, structural
   confirmation. Suggest-only would double-gate an action that is already gated.
5. **Cadence: hybrid** — continuous capture to the scratch JSONL (original timestamps, machine-
   stamped), curated once into LEARNINGS.md at handoff. Timestamps reconstructed at handoff time
   would be fiction; either pure option loses something the hybrid keeps.
6. **Backfill: never, for LEARNINGS.** A backfilled entry is composed from memory and summaries —
   a reconstruction wearing a capture's clothes; by this repo's own standard, a correct-shaped
   lie. AGENTS.md arrives per repo on its next *genuine* substantive touch via a fresh
   cartographer run (a new measurement, not backfill). LEARNINGS starts empty everywhere and
   earns entries forward.
7. **Dogfooding: split.** rigor's own repo gets AGENTS.md (it doubles as the reference specimen
   of rigor's output format); it does **not** get LEARNINGS.md, which would shadow FEEDBACK.md.
   Instead the record schema (timestamp / commit / session-id / `re-verify:`) is **back-ported
   onto FEEDBACK.md entries**, so the provisional-backlog loop's "genuine independent domain"
   claims become auditable rather than asserted.

## Consequences

- **If accepted as scoped:** a repo rigor has genuinely built in or handed off from carries a
  portable brief (any agent tool starts warm) and a refutation-grounded learnings ledger. The
  tiered trigger keeps read-only work noise-free and honors "don't run stages the task doesn't earn."
- **Risk — file sprawl / staleness.** Mitigated by: substantive-touch threshold, append-only
  LEARNINGS with dated evidentiary basis, and the delimited generated-block merge (never clobber
  human content).
- **Risk — CLAUDE/AGENTS drift.** Eliminated by the single-canonical-file + `@import` decision;
  reintroduced if we instead duplicate content (rejected).
- **Cost.** One extended agent + one skill touch-up + one new check script
  (`check-learnings.mjs`). No new hook, no new always-on surface.

## Amendment — 2026-07-12 (implemented; folder layout revised)

Implemented per [`docs/plans/2026-07-12-ledger-kit-plan.md`](../plans/2026-07-12-ledger-kit-plan.md),
which records the full decision set (locked 2026-07-10, operator-affirmed). Three revisions to
the letter of this ADR, none to its record schema or triggers:

- **Learnings are a folder, not a single file.** Dated immutable entries in
  `docs/learnings/YYYY-MM-DD-<topic>.md` plus a pointer-only `LEARNINGS.md` index — the shape
  proven by `docs/feedback/`. The Decision §2 record schema is unchanged; append-only is now
  enforced as "prior entry files byte-unchanged" rather than "file only grew."
- **Handoff briefs live in-repo.** A companion `docs/handoff/` + `HANDOFF.md` index holds
  single-repo session briefs (locality: the next session starts in that repo). A shared local
  briefs folder outside any repo remains the fallback for genuinely multi-repo sessions only.
- **§7 dogfooding revised.** rigor now hosts both folders itself. The shadowing concern is
  resolved by scope, not avoidance: `docs/feedback/` holds verdicts about rigor's *components*
  (rigor-only), `docs/learnings/` holds anchored facts about the *repo*. §7's back-port clause
  is satisfied differently than written — the feedback entries kept their prose form; the
  anchored-record schema is enforced forward via `docs/learnings/` instead. Both new ledgers
  start empty and earn entries forward (§6 no-backfill stands).

`check-learnings.mjs` + tests ship with this amendment. `/rigor:handoff` remains the sole
writer of both ledgers.

## Amendment — 2026-07-14 (capture-time anchoring; found by the kit's first non-origin use)

The first target-repo adoption (treasury-intent-controller, 6 entries, 2026-07-13) produced a
**defective record**, and the defect was in this ADR's implementation, not the adopter's
discipline. All six entries carried an identical `ts:` and an identical `commit:` — the instant
the batch was written at session close. One entry's basis (`39 passed in 2.22s`, zero skips)
was captured mid-session against a tree that did not yet contain `test_main_config.py`, then
stamped with the commit that *added* that file. Re-run at the anchored commit: **46 passed**.
The number is 7 short — exactly that file's test count. The qualitative claim (the wheel lane
executes) survived; the anchor did not.

Root cause: Decision §6 makes `/rigor:handoff` the sole **writer**, and the shipped command text
silently let that become the sole **observer** — dropping §5's continuous scratch-buffer capture
(*"machine-stamped as they land … carrying their original timestamps"*). Sole-writer-at-close and
capture-time anchoring cannot both hold unless the buffer sits between them.

Resolved, forward-only:

1. **`commands/handoff.md` states the rule and both failure modes it prevents** — write-time
   stamping (one `ts:` for every entry) and anchor drift (a basis captured against a tree the
   named commit does not contain). A basis whose tree has since changed is **re-captured** now,
   or the entry says so explicitly.
2. **`check-learnings.mjs` flags identical `ts:` across entries** — distinct findings do not land
   in the same second, so a shared timestamp is the mechanical fingerprint of a batch stamp. This
   check was written against the real defective ledger and **verified red on it** before being
   trusted (it had passed that ledger green the day before).
3. **A ledger predating the rule cannot be repaired in place** — its entries are immutable. The
   *index* (a mutable pointer file, never a record) may declare `anchor-rule-since: YYYY-MM-DD`
   once; entries older than that date are exempt from the distinctness check, entries from it on
   must comply. It is not a per-entry excuse — you cannot silently forgive one bad anchor, only
   date the rule's start, in the open.
4. **The wrong entry is superseded, never edited** (§2 unchanged): a new dated entry with a
   `kills:` reference carries the corrected number and its re-captured basis.

Standing limit, restated because this proves it: the gate verifies fields, ordering, and
append-onlyness. It **cannot verify that a basis is genuine** — a green ledger is "anchored and
re-executable," never "true." Only re-running the `re-verify:` line does that, and here it took
exactly that to find the defect.

---
*Supersedes nothing. Related: ADR-0001 (vendor for portability), ADR-0002 (ship discipline not
content), `docs/using-rigor-on-a-new-repo.md` (the spine this slots into), `docs/feedback/FEEDBACK.md`
(the ledger pattern LEARNINGS.md mirrors).*
