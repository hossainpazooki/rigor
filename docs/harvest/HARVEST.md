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

## Queue

Ranked by domain-eligible firings (from `scripts/index-sessions.mjs`; re-derive
rather than trusting these counts). `opp` = silent-skip **candidates**, which
over-produce by construction and are not defect counts.

| Session | Domain-eligible | opp | Repos | Done |
|---|---|---|---|---|
| `951cdf1d` | 11 | 1 | network-as-code | 2026-09-01 |
| `edf43652` | 11 | 9 | linear-ceiling, kv-transfer-replication | |
| `0295a4ce` | 10 | 1 | intent-plane | |
| `1c43d113` | 10 | 10 | parallax | |
| `fcb0d613` | 10 | 0 | passed-vs-true-demo, closed-loop-default-detection | |
| `3ca345ea` | 8 | 4 | intent-plane | |
| `d038135c` | 7 | 2 | kv-transfer-replication | |
| `6435db0b` | 5 | 0 | treasury-intent-controller | |
| `c4006536` | 5 | 1 | treasury-intent-controller, intent-plane | |
| `578f8105` | 4 | 2 | vantage | |
| `62dcb1b1` | 4 | 0 | parallax, closed-loop-default-detection | |
| `741f21a6` | 4 | 0 | treasury-intent-controller, intent-plane | |
| `15f5e05f` | 3 | 1 | closed-loop-default-detection | |
| `6c30e95a` | 3 | 3 | institutional-defi-platform-infra | |
| `925a8227` | 2 | 1 | baseline, meridian | |
| `9b0a4435` | 2 | 1 | baseline, parallax | |
| `b76699b6` | 2 | 0 | parallax, vantage | |
| `f736547f` | 2 | 5 | agentic-self-instruct, untrusted-self-instruct | |
| `1b845026` | 1 | 0 | regulatory-rule-engine | |
| `6085c0fc` | 1 | 1 | linear-ceiling | |
| `98157576` | 1 | 0 | nav-reconciliation-demo | |
| `b6167acd` | 1 | 1 | closed-loop-default-detection | |
| `e6e0badf` | 1 | 0 | intent-plane | |

## Proposed ledger rows (for the human, not written by the command)

- **`git-guard` — second independent domain of the read-only-compound misfire**
  (network-as-code, lead 2026-08-25, re-verified 2026-09-01). The 2026-07-07 row
  logged this class at n=1 and called it "blocks read-only compound git
  commands"; the mechanism is now known and narrower — a redirection token
  surviving into argv and counting as a positional. Fixed, 4 twins pinned.
- **ledger kit / `check-learnings` — candidate second domain** (network-as-code,
  15 entries clean). Unlike the previous domain-2 attempt, the ledger is tracked
  **and** no dated entry was edited in history. Still form-only evidence.

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
