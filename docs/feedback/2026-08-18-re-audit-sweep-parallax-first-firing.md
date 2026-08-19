# 2026-08-18 · re-audit sweep first firing · PARALLAX (non-origin) · helped

First firing of ADR-0012's re-audit sweep, and the first non-origin exercise of two
data-engineering skills. Executed by the orchestrator directly — **zero subagent
tokens, no fan-out, no agent verdicts.** Every claim below rests on a re-executed
command, not on a subagent's report.

Domain: PARALLAX (`pit-revision-examiner`) — a point-in-time revision research repo,
consumer of VANTAGE gold. Independent of every prior domain and, critically,
**not** VANTAGE, which is the origin repo for all four data-eng skills.

## What fired, and what it caught

The sweep re-audits *standing* claims, which nothing in rigor did before: every gate
fires at the publish moment and nothing re-checks the verdict afterwards. It lifted
7 numeric claims from PARALLAX's `STATUS.md` claim ceiling and re-executed each.

**6 verified. 1 ROT.**

`STATUS.md` published ``pytest`` **25 passed** 2026-08-08. The movement heuristic
alone would have called that STALE — the regenerator has moved since — which would
have been wrong in the dangerous direction. An independent historical oracle (git
history, extracted per commit and re-collected) settled it: on 2026-08-08 the suite
collected **9**; 25 was true only at `c8a6e96` on 08-09; the commit that publishes
the claim carries **28**. The pair *(25, 2026-08-08)* held at **no commit**. Not
stale — wrong when published. Same anchor-drift class as the 2026-07-14 ledger-kit
misfire.

Corrected in PARALLAX's `STATUS.md`, with the correction stated in place rather than
silently overwritten.

## Polarity — both legs, before any credit

- **Negative control**, unmutated live gold (86,615,392 rows): all six INPUTS-surface
  claims verified, `inputs` reported unmoved, **zero false alarms**. A sweep that
  alarms on a quiet surface would be switched off in a week.
- **Planted-drift twin**: hardlinked parquet parts + copied log, then a genuine Delta
  append of 1,000 re-keyed rows. Identity moved v1→v2; `gold.row_count` caught
  86,615,392 → 86,616,392 (exactly the planted magnitude); every gold mismatch
  classified **STALE**, not ROT. Twin exits 0 only if all three hold. Twin removed after.

## Two self-defects, found before the sweep was credited

Recorded because an instrument's own errors are the first thing to distrust, and both
are the kind that would have produced confident wrong output.

1. **A false ROT from a wrong probe.** The first run flagged `gold.non_terminal_rows`
   as ROT (stated 40,953,522, actual 86,615,392 — the whole table). The *claim was
   right and the probe was wrong*: it filtered `valid_to != MAX_SENTINEL`, and no row
   carries that value. A false ROT is the sweep's worst failure mode — it retroactively
   invalidates a correct artifact and notifies downstream for nothing. Caught by
   disbelieving a verdict that was too convenient.
2. **Global movement laundered rot into drift.** The first twin run classified
   `repo.pytest_passed` STALE because *gold* had moved — but that claim rests on the
   regenerator. Movement is now tracked per surface. Pinned by
   `test_regenerator_claim_is_not_excused_by_a_moved_inputs_surface`.

Neither defect is hypothetical; both fired on real data before the fix.

## Latent defect found in the target repo

`readers/protocol.py` declares `MAX_SENTINEL = 9999-12-31`, but live gold's open
intervals carry **2262-04-11T23:47:16.854775Z** — int64-nanosecond saturation — and
**zero rows** carry 9999. Fixtures use one value, production the other. **Latent, not
live**: `as_of()` compares with `>`, so nothing breaks today, but any open-interval
check written `valid_to == MAX_SENTINEL` is green on fixtures and vacuous in
production. Pinned by two tests; the constant was **not** patched — it is credited
surface and the call belongs to the producer.

## Promotion arithmetic — stated precisely, including what did NOT move

| Component | Before | After | Basis |
|---|---|---|---|
| `data-quality-fail-closed` | 1 non-origin (CLDD 07-19) | **2 non-origin ⇒ settled (scoped)** | three-outcome fail-closed audit at a real boundary: pass / FAIL exit 1 / **UNEVALUABLE exit 2 halts**; seen red on a staged twin at exactly the planted magnitude AND on a real defect (the ROT). Directly parallel to the CLDD credit |
| `lineage-replay` | origin-only (VANTAGE) | **1 non-origin domain** | content-addressed identity recorded (Delta log sha256), claims **re-executed and diffed** rather than asserted — its moves 1–2, in a non-origin repo. Still 1 of ≥2 |
| re-audit sweep (ADR-0012) | never fired | **1 domain, provisional** | first firing; both polarity legs |
| `no-lookahead` | origin-only | **unchanged** | not exercised. The sentinel finding is PIT-adjacent but no restatement-through-the-seam test was run. Crediting it would be a manufactured domain |
| `idempotent-restatement` | origin-only | **unchanged** | not exercised at all |

**Scope caveats.** Same operator as every prior domain. `lineage-replay`'s exercise is
a *claim* replay, not a *batch* replay-diff — its recorded gap ("even the origin firing
unconfirmed as a true replay-diff") is narrowed, **not closed**. Only 7 claims were
swept; PARALLAX's study-001 aggregates and its 18,051-filer-quarter cross-check were
explicitly named NOT SWEPT and remain unverified by this run.

## Re-verify

```
cd ~/dev/parallax
.venv/Scripts/python.exe -m pytest -q                                     # 52 passed
.venv/Scripts/python.exe scripts/run_sweep_local.py --gold <gold>         # exit 1, 1 ROT
.venv/Scripts/python.exe scripts/run_sweep_local.py --gold <gold> --twin  # exit 0, TWIN OK
```
Evidence: `parallax/docs/evidence/2026-08-18-re-audit-sweep-lane1.md`.
