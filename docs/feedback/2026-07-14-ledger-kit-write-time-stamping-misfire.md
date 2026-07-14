# 2026-07-14 · ledger kit (`/handoff` as sole writer, `check-learnings`) · **misfired, then helped** · treasury-intent-controller

**Domain:** treasury-intent-controller — first non-origin adoption of the ADR-0003 ledger kit
(built 2026-07-12/13, adopted in tic 2026-07-13, one day later). The kit's first real use
produced a **defective record**, and the defect was in the kit, not the adopter.

## The misfire

tic's six 2026-07-13 learnings entries all carry an **identical `ts:`** (`2026-07-13T22:37:24Z`)
and an **identical `commit:`** (`6adff98`) — the instant the batch was written at session close.
One entry's basis (`39 passed in 2.22s`, zero skips) had been captured mid-session against a tree
that did not yet contain `scorer/tests/test_main_config.py`, and was then stamped with the commit
that **added** that file. Re-run at the anchored commit: **46 passed**. The 7-test gap is exactly
that file.

The record looked anchored. It was not. And `check-learnings` **passed it green** the day it was
written — which is the honest, named limit of a form gate (ADR-0003: "it can never verify the basis
is genuine"). It took re-running the `re-verify:` line to find it.

## Root cause: mine, in the shipped skill text

ADR-0003 Decision §6 makes `/rigor:handoff` the sole **writer**. The command text I shipped let
that silently become the sole **observer** — it dropped §5's continuous scratch-buffer capture
("machine-stamped as they land … carrying their *original* timestamps"). Sole-writer-at-close and
capture-time anchoring cannot both hold unless the buffer sits between them. The adopting session
followed the shipped instructions exactly and got a bad record for its trouble.

## Then it helped — the fix, and its non-vacuity

1. `commands/handoff.md` now states the anchoring rule and both failure modes it prevents
   (write-time stamping; anchor drift), and requires a stale basis to be **re-captured** or
   labelled.
2. `check-learnings.mjs` flags **identical `ts:` across entries** — distinct findings do not land
   in the same second, so a shared timestamp is the mechanical fingerprint of a batch stamp.
   **Verified red on the real defective ledger** before being trusted (it had passed that same
   ledger green 24 hours earlier):
   ```
   $ node check-learnings.mjs docs/learnings     # tic, before the fix
   LEARNINGS FAIL 2026-07-13-contract-test-equality-blindspot.md: ts identical to … — entries
     stamped at write time, not at capture   … (5 entries flagged)   exit=1
   ```
3. An immutable ledger cannot be repaired in place, and a permanently-red gate is theater. The
   **index** (a mutable pointer file, never a record) may declare `anchor-rule-since: YYYY-MM-DD`
   **once**; older entries are exempt, entries from that date on must comply. Not a per-entry
   excuse — you cannot silently forgive one bad anchor, only date the rule's start, in the open.
4. The wrong entry was **superseded, never edited**: tic
   `docs/learnings/2026-07-14-wheel-lane-count-corrected.md` carries `kills:` and the re-captured
   number, and kills only the *number* — the fact it recorded still stands.

## A second, self-inflicted gate bug, found by using it

The gate also enforced "timestamps monotonic **in filename order**." That rule is simply wrong:
within one date, filenames sort by *topic*, alphabetically, not by capture time — so three findings
captured at 14:48:52 / 14:49:13 / 14:49:35 land in files whose alphabetical order runs the clock
backwards. It false-positived on the very entries written to fix the original defect. Replaced with
the correct, stronger invariant: **an entry's `ts` must fall on the date in its filename** (sorted
filenames then give non-decreasing dates for free). Both the false-positive case and the real one
are now pinned by tests.

## Standing

The kit is **provisional, 1 domain, 1 logged misfire** — and the misfire is the useful part: the
component's own gate did not catch it, a `pick-up` re-running the claim did. That is the intended
division of labour (`logs index; gates decide; only a re-run moves a status`) working exactly as
designed, and it is the reason the ledger is credible at all.

Evidence: `node --test` 108/108 in rigor; `check-learnings docs/learnings` in tic →
`learnings: clean (9 entries)` after the fix and the superseding entry.

re-verify: `node scripts/check-learnings.mjs <ledger-dir>` on a ledger whose entries share a `ts:`
— must exit 1 with the write-time-stamping reason.
