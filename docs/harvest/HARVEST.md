# Harvest ledger (index)

Records of past sessions mined for evidence about rigor's own components
(ADR-0014, **Proposed**). One `<session>.jsonl` per harvested session, beside
this file, append-only, gated by `scripts/check-harvest.mjs`.

**A transcript is a lead; a re-run is the evidence.** Every `credited: true`
record carries `reverified_at`, the read-only command that was executed, and the
exit code observed — because a past session's word that a control helped is
exactly the self-report this toolkit refuses everywhere else. The gate refuses a
credit that lacks them, which is how mining old sessions stays inside the
"no ledger is ever backfilled" invariant: each entry describes a run that
happened *today*, at a place a transcript told us to look.

This index holds pointers only, never evidence. **Nothing here promotes
anything** — harvest proposes rows for `feedback/FEEDBACK.md`; the human
promotes.

## Harvested

| Session | Records | Credited | Domains touched | Headline |
|---|---|---|---|---|
| [`951cdf1d`](951cdf1d.jsonl) | 3 | 2 | network-as-code | `git-guard` refused an all-read command; bisect found a redirect counted as a positional argument. Fixed and pinned. |
| [`cc40b6d1`](cc40b6d1.jsonl) | 4 | **0** | datum, meridian, baseline | 8 Workflow runs / 93 agents under `orchestrate`, work landed in three repos — but **halted at step 5**: both judgment-tier skeptics died on exhausted credits, so nothing is credited. Candidate misfire: `check-tier-placement` false-positives on the stall-retry wrapper `orchestrate` itself mandates (8/8 scripts red, receipts show zero tier collapse). |

## Queue

**Ordered by inferred deadline, soonest first** (re-ranked 2026-09-15). Transcripts
age out: 8 of the 23 sessions queued on 2026-09-01 were already gone by
2026-09-14 (learnings `2026-09-15-harvest-queue-transcripts-age-out-before-harvest`).
"Purge by" is transcript mtime + 30 days, an **inference** from the observed
window, not a read of the deletion rule; a resumed session moves its mtime.
Firing counts come from `scripts/index-sessions.mjs` (re-derive rather than
trusting them). `opp` = silent-skip **candidates**, which over-produce by
construction and are not defect counts.

**The queue is not the corpus (measured 2026-09-21).** It was built from one
project directory. Re-indexing **all 17** directories under
`~/.claude/projects/` found **45 sessions with firings, 29 of them carrying at
least one domain-eligible firing**, against the **23** session ids this file
names. `cc40b6d1` — the richest `orchestrate` corpus in the archive, 8 Workflow
runs across three repos — was never queued and was found only by re-indexing.
Rank from a full index, never from this table alone.

**Purged since the 2026-09-15 re-rank** (confirmed absent 2026-09-21):
`0295a4ce`, `e6e0badf`, `3ca345ea`, `62dcb1b1`, `15f5e05f`, and `b76699b6` /
`741f21a6` on their inferred date — 15 of the 23 now unrecoverable. The
30-day mtime inference held for both 09-21 rows.

| Session | Domain-eligible | opp | Repos | Transcript mtime (UTC) | Purge by (inferred) | Done |
|---|---|---|---|---|---|---|
| `0295a4ce` | 10 | 1 | intent-plane | 2026-08-16T18:02Z | 2026-09-15 | |
| `e6e0badf` | 1 | 0 | intent-plane | 2026-08-17T02:10Z | 2026-09-16 | |
| `3ca345ea` | 8 | 4 | intent-plane | 2026-08-19T03:02Z | 2026-09-18 | |
| `62dcb1b1` | 4 | 0 | parallax, closed-loop-default-detection | 2026-08-19T03:14Z | 2026-09-18 | |
| `15f5e05f` | 3 | 1 | closed-loop-default-detection | 2026-08-21T03:24Z | 2026-09-20 | |
| `b76699b6` | 2 | 0 | parallax, vantage | 2026-08-22T02:27Z | 2026-09-21 | |
| `741f21a6` | 4 | 0 | treasury-intent-controller, intent-plane | 2026-08-22T03:04Z | 2026-09-21 | |
| `f736547f` | 2 | 5 | agentic-self-instruct, untrusted-self-instruct | 2026-08-23T04:29Z | 2026-09-22 | |
| `6085c0fc` | 1 | 1 | linear-ceiling | 2026-08-27T03:58Z | 2026-09-26 | |
| `951cdf1d` | 11 | 1 | network-as-code | 2026-08-28T03:32Z | 2026-09-27 | 2026-09-01 |
| `d038135c` | 7 | 2 | kv-transfer-replication | 2026-08-31T03:17Z | 2026-09-30 | |
| `925a8227` | 2 | 1 | baseline, meridian | 2026-09-01T22:21Z | 2026-10-01 | |
| `1b845026` | 1 | 0 | regulatory-rule-engine | 2026-09-01T22:35Z | 2026-10-01 | |
| `9b0a4435` | 2 | 1 | baseline, parallax | 2026-09-01T22:40Z | 2026-10-01 | |
| `edf43652` | 11 | 9 | linear-ceiling, kv-transfer-replication | 2026-09-01T23:12Z | 2026-10-01 | |

**Purged before harvest** (no transcript on 2026-09-14 or 2026-09-15; never
harvested, nothing recoverable): `1c43d113` (10 / 10, parallax), `fcb0d613`
(10 / 0, passed-vs-true-demo, closed-loop-default-detection), `6435db0b` (5 / 0,
treasury-intent-controller), `c4006536` (5 / 1, treasury-intent-controller,
intent-plane), `578f8105` (4 / 2, vantage), `6c30e95a` (3 / 3,
institutional-defi-platform-infra), `98157576` (1 / 0, nav-reconciliation-demo),
`b6167acd` (1 / 1, closed-loop-default-detection).

## Proposed ledger rows (for the human, not written by the command)

- **`git-guard` — second independent domain of the read-only-compound misfire**
  (network-as-code, lead 2026-08-25, re-verified 2026-09-01). The 2026-07-07 row
  logged this class at n=1 and called it "blocks read-only compound git
  commands"; the mechanism is now known and narrower — a redirection token
  surviving into argv and counting as a positional. Fixed, 4 twins pinned.
- **ledger kit / `check-learnings` — candidate second domain** (network-as-code,
  15 entries clean). Unlike the previous domain-2 attempt, the ledger is tracked
  **and** no dated entry was edited in history. Still form-only evidence.

- **`check-tier-placement` — candidate misfire, uncredited** (`cc40b6d1`, datum
  / meridian / baseline, re-verified 2026-09-21). The gate cannot see a tier pin
  that arrives through an `opts` object, so it false-positives on the
  stall-retry wrapper `orchestrate` guardrail 10 mandates: 8/8 scripts exit 1,
  warning count equals wrapper call-site count every time, while the run
  receipts show the answering models were exactly the configured mid/build/
  judgment tiers — 8 silent-collapse alarms, zero collapse. **Not refuted**: the
  judgment tier was out of credits. Needs a skeptic to attack the reading that a
  wrapper legitimately makes a pin unverifiable by static reading.

- **`orchestrate` — three domains of `helped`, uncredited** (`cc40b6d1`; datum,
  meridian, baseline; re-verified 2026-09-21). 8 Workflow runs / 93 agents,
  guardrail 7 honored before every dispatch, work landed as commits in all
  three repos. Adds domains to a row already at 3 and already **settled
  (scoped)** — so it does **not** move the status. The open item on that row is
  the same-operator caveat, which no self-harvest can lift.

## Corpus measurements (re-derive before citing)

44 transcripts, ~106 MB → **378 firings**, **108 domain-eligible**, across **16
repositories other than rigor**; 23 of 23 sessions carry at least one
domain-eligible firing. *(Indexed 2026-09-01T18:05Z.)*

**The corpus is live, so these counts drift while you read them.** Re-indexing at
18:30Z the same day returned **390**, because the session doing the indexing was
appending to its own transcript as it ran. Two runs at the same instant are
byte-identical (verified: two writes, 180,748 bytes each, `diff` clean, with a
truncated-input control returning 5 firings where the full file returns 12) —
but a count quoted from a different instant is a different measurement, not a
contradiction. Always cite the index you actually ran.

Two false-positive classes were found by reading the indexer's own output and
fixed before any of it was used:

- **~50 of 91** first-version silent-skip candidates were `/rigor:handoff`
  writing its own ledger entries — the command doing its job, scored as an
  unchecked claim. Ledger paths excluded; total fell 104 → 43.
- **15 runs** of two sibling repos' own `check-ledger.mjs` were scored as rigor
  firings by a bare `check-*.mjs` match. Now classified `foreign-gate` and never
  creditable.

Keyword search does not work here and is not used: every session's system prompt
lists every skill, so `grep -l no-lookahead` matches **27 transcripts with zero
real firings**.
