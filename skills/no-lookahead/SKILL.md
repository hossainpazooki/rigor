---
name: no-lookahead
description: Use when any as-of / point-in-time dataset or backtest is claimed correct — no row's value may depend on data timestamped after that row's as-of instant, and the leak seam is exercised with restatement, not just append-only data.
status: provisional
---

# no-lookahead

In any as-of / point-in-time dataset, no row's value may depend on data
timestamped **after** that row's as-of instant. Lookahead is future information
bleeding into the past. It invalidates the result silently — the pipeline is
green, the data is wrong.

## Moves

1. Name the as-of key on every row. If there isn't one, that is the first defect.
2. Enumerate every join, window function, and aggregate that can reach a row
   with a later timestamp than the current row's as-of. Each is a leak candidate.
3. Test with **restatement / backfill** — a later-arriving correction to a past
   period — not only append-only forward data. Append-only can pass while
   restatement leaks through the same code. The tiebreak that resolves same-key
   records is a shared seam with `idempotent-restatement`.

## Anti-pattern (correct-shaped lie)

An order-invariance test proves the final transform is order-independent, while
the upstream tiebreak that resolves same-key records by ingest order is never
tested with a same-key restatement. The proven property is real but narrow; the
seam where lookahead actually enters is the one left untested.

## Claim calibration

Say "the final transform is order-invariant," not "the load order cannot leak,"
until a same-key restatement test lands. The stronger claim is unearned until the
seam is exercised. When the claim is "no lookahead," apply `refute`'s data-claim
moves — gate-green is not claim-true.

*Write-audit-publish readers: this skill occupies the **audit slot** of the WAP pattern — the mapping, its polarity upgrade (an audit never seen red on known-bad input is unevaluable, and unevaluable halts), and its honest limits live in the plugin repo at `docs/wap-bridge.md` (ADR-0005).*
