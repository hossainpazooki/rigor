# Handoff — harvest live with a first real find; contributions umbrella opened

2026-09-01 (UTC) · newest commit this brief describes: **`13e51e8`**
("contributions umbrella") — pick-up measures drift from here. Written by
session `1b845026` (the same session as the 2026-08-22 briefs, resumed across
compactions). Sibling repo this brief also describes: **`~/dev/site`** at
`cb2da49` (rigor page counts). Six commits since the last brief
(`552ad2d..13e51e8`), all operator-run, `main` in sync with origin at write
time.

**Uncommitted at write time:** the two learnings entries + index rows this
command just wrote, this brief + its index row, and three one-line count
corrections (`docs/STATUS.md` 585→591, `docs/README.md` 10→12 gates,
`docs/DEVELOPMENT.md` 11→12). Nothing else — the seven-brief
`docs/comparisons/` carry is **resolved** (see locked decisions).

## Current state

- **built** ADR-0014 session harvest, **Proposed**
  ([`adr/0014-session-harvest-leads-not-evidence.md`](../adr/0014-session-harvest-leads-not-evidence.md)):
  a transcript firing is a lead; credit requires a read-only re-run executed
  today with its observed exit. Units: `commands/harvest.md`,
  `scripts/index-sessions.mjs` (structural detectors — keyword search matches
  27 transcripts with zero real firings), `scripts/check-harvest.mjs`
  (three-outcome), `docs/harvest/` ledger + queue. Commits `19509bf`,
  `848bab6`.
  re-verify: `node scripts/check-harvest.mjs docs/harvest/951cdf1d.jsonl`
  (clean, 3 records, 2 credited).
- **built** first harvest executed end-to-end on session `951cdf1d`
  (network-as-code, 2026-08-25): one **live misfire found in shipped code** —
  `git-guard` refused an all-read command because `2>&1` survived
  normalization into argv and counted as the positional that makes
  `symbolic-ref` a write. Fixed in `shell-normalize.stripRedirections`
  (`552ad2d`), 4 twins pinned, three proving no blocked verb was weakened.
  Also: a candidate second domain for the ledger kit (tracked ledger, 0
  in-history edits — both legs that refuted the prior attempt checked this
  time), and one honest `unevaluable` (the checked artifact no longer exists).
  re-verify: `node --test tests/git-guard.test.mjs` (74 pass, incl. "a read
  with a trailing redirect is still a read (harvest 951cdf1d)").
- **built** `check-fanout` misfire **closed, pinned** (`8881a56`): the CLI
  reported not-applicable as passed; now three-outcome (0 clean fan-out / 1
  warnings / 2 NOT APPLICABLE or UNEVALUABLE), twins written red-first,
  closure record appended.
  re-verify: `node scripts/check-fanout.mjs README.md` (exit 2, "NOT
  APPLICABLE").
- **built** contributions umbrella (`13e51e8`):
  [`contributions/STRATEGY.md`](../contributions/STRATEGY.md) (mutable working
  reference — three lanes, lane rules, claim-card discipline),
  [`contributions/2026-09-01-otel-lane-evidence.md`](../contributions/2026-09-01-otel-lane-evidence.md)
  (dated measurements), and the DQX addendum absorbed as
  [`contributions/2026-07-21-dqx-adjacency-survey.md`](../contributions/2026-07-21-dqx-adjacency-survey.md)
  with its provenance gap stated in-file; `docs/comparisons/` restored to HEAD.
  re-verify: `git diff --stat docs/comparisons/` (empty) and the survey's
  first 18 lines.
- **built** external-venue evidence, measured not asserted: prototype-first is
  the target's **written process** (semconv CONTRIBUTING.md); the founding
  `gen_ai.evaluation.result` discussion (PR #2563, 122 review comments, 6,301
  words) contains **zero** mentions of negative control / calibration /
  ground truth / ability-to-fail; OpenLineage docs-only PRs merged 5/5 with
  zero written review while every sampled semconv merge carried written
  contest.
  re-verify: the three `gh api` lines at the foot of the evidence doc (behind
  a `wc -w` positive control — see invariants).
- **built** rigor page re-derived from the tree (site `cb2da49`): 20 skills ·
  9 commands · 5 agents · 3 hooks · 12 gates; the seven-commands map scoped as
  "per-unit-of-work (loop drivers not shown)" rather than renumbering a 7-node
  picture.
  re-verify: `git -C ~/dev/site show HEAD:rigor/index.html | grep -c '<b>12</b> check gates'` (1).
- **built** suite floor 523 → **591**; `check-surface-scrub` clean.
  re-verify: `node --test` (591 pass, 0 fail).
- **built, intentionally red** `check-dispatch` exit 1 (fabricated receipt
  kept) and `check-misfire-closure` exit 2 (two 08-22 records still open) —
  unchanged, awaiting operator.
  re-verify: `node scripts/check-misfire-closure.mjs docs/learn/closure-log.jsonl` (exit 2).
- **in-progress** Nothing half-built.
- **planned, not started** The emitter demo (rigor gates →
  `gen_ai.evaluation.result` events with negative-control attributes); the
  OTel issue-tracker full scan; the first claim card (written when the
  baseline filing is prepared); 22 queued harvest sessions (`edf43652` next,
  11 domain-eligible firings).

## Locked decisions

- **Leads-only** (ADR-0014, operator-chosen from three options): credit only
  from a re-run executed today; the "no ledger is ever backfilled" invariant
  is preserved, not amended. *Reason: fanout-loop step 4 and the 2026-07-08
  orchestrate precedent already define logs as candidate indexes.*
- **Silent skips are hunted first; one session per invocation, queue-driven.**
  *Reason: the silent-skip class exists only in history, and the fanout-loop
  shape (recurrence belongs to the host loop) is proven.*
- **rigor is the thesis anchor of the contributions program, not the queue
  head; merge order is baseline → rigor → intent.** *Reason: baseline has the
  written spec and the rigor article's hook ("the same hole, one ecosystem
  over") requires baseline's contribution to exist first.* See
  `contributions/STRATEGY.md`.
- **External venues verify the doctrine, never the components.** *Reason: no
  maintainer runs the twins; a merge laundered onto component credit would be
  a correct-shaped promotion.*
- **The DQX addendum was absorbed, not committed in place** (operator ruling
  2026-09-01: "don't do it… so the dqx work now lives under a larger more
  coherent umbrella"). *Reason: DQX is adjacent-OSS surveyed-not-chosen in the
  operator's portfolio index; the addendum is the earliest dated record of the
  ability-to-fail gap.* The comparisons doc is immutable-restored; do not
  re-add sections to it.
- **The commands map on the site page stays a 7-node picture with a scoped
  caption.** *Reason: renumbering the label without redrawing the picture
  would make the diagram lie differently; the two loop drivers route
  differently by design.*

## Reuse map

- **`scripts/index-sessions.mjs`** — structural transcript detectors
  (tool_use / tool_result / hook-attachment keyed), per-firing `cwd`
  attribution, `RIGOR_GATES` with a drift-guard test that fails when
  `scripts/` and the constant diverge (it fired once this session, on
  `check-harvest` itself).
- **`resolveSupersession(records, { key, label, numeric })`** — the shared
  resolver now states key TYPE explicitly; three consumers.
- **Old-vs-new hook probe** — import `decide()` from the hook beside a table
  of command forms; bisect a refusal to one segment (this session: six forms
  → `2>&1` on `symbolic-ref`). Write the probe file with a file tool — a
  heredoc body quoting git verbs gets blocked by the hook itself.
- **Review-depth measurement** — classify merged PRs docs-only vs code by
  changed files, compare `review_comments + comments`; method + limitations in
  `contributions/2026-09-01-otel-lane-evidence.md`.
- **`docs/harvest/951cdf1d.jsonl`** — the record shape for a harvest: lead
  pointer, verdict, `credited` + `reverified_at` + observed exit, honest
  `unevaluable`.

## Invariants

- **`credited: true` without a dated read-only re-run and its observed
  integer exit is a gate violation**, not a style issue (`check-harvest`).
  Violated ⇒ harvesting becomes the backfill it exists to avoid.
- **A foreign gate never credits rigor; a rigor-tree firing never earns
  `credit_kind: "domain"`.** Violated ⇒ the promotion ledger's independence
  rule is quietly broken.
- **Harvest proposes FEEDBACK rows; only the human writes them.** Violated ⇒
  the credit mechanism marks its own homework.
- **Positive-control every zero count from a piped fetch.** `gh api -f` on a
  GET silently POSTs (422) and a downstream `grep -c` counts the error body —
  this session reported "0 mentions in 122 comments" from exactly that before
  the control caught it. Prove the fetch returned text (`wc -w`, print one
  record) before believing any zero. Companion to the standing
  independent-statements rule.
- **Claim cards are committed before filing and immutable after** — post-hoc
  editing is the laundering channel. No card exists yet; the rule binds the
  first one.
- Ledger indexes hold pointers, never evidence; dated entries are immutable;
  `docs/contributions/STRATEGY.md` is the one deliberately **mutable** doc in
  that tree (STATE.md tense) — corrections there are edits, everywhere else
  they are new dated entries.
- The shipped surface stays domain-neutral (`check-surface-scrub` clean at
  write time); `docs/` may name repos and vendors freely.

## Open / next

**First: the operator's rulings, now three deep** — ADR-0013, ADR-0014 (with
the claim-card ledger folded into that conversation), and the two proposed
FEEDBACK rows in `docs/harvest/HARVEST.md` (git-guard second domain;
ledger-kit candidate second domain). Plus the two open closure records
(unchanged since 08-22).

Then, in rough order:

1. **Gap found while writing this brief: the git-guard redirect misfire has
   pinned twins but no closure-log record** — `check-fanout`'s closure was
   recorded, the redirect one was not. Add the pinned record (capture exists:
   harvest record n=1 + the 552ad2d twins); the closure ledger should not
   depend on which misfire happened to be fixed nearest the practice moment.
2. **Baseline lane files first** — and writes the program's first claim card.
   The rigor lane's filing is blocked on it by design.
3. **Rigor lane prep in parallel:** the emitter demo (the target's own
   CONTRIBUTING.md asks for the prototype), then the OTel issue-tracker scan
   to upgrade "novel in the founding PR" to "confirmed absence."
4. **Next harvest: `edf43652`** (linear-ceiling + kv-transfer-replication, 11
   domain-eligible firings, 9 opportunity candidates — the silent-skip
   detector's residual false-positive rate gets its first measurement here).
5. **STATUS.md re-stamp** — the header still says "State as of 2026-08-22";
   rows added since are dated inline but the stamp lags.

**Blocker on none of the above.** Standing caveat: every external-venue
measurement in `contributions/` is a small recent-window sample from one day;
re-derive before print, per the halt-gate rule in STRATEGY.md.
