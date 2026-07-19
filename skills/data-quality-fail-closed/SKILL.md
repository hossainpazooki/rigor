---
name: data-quality-fail-closed
description: Use when a data-quality constraint, suite, or gate is claimed green — a DQ constraint has three outcomes (pass, fail, unevaluable), and fail-closed means unevaluable halts the pipeline instead of being coerced into pass or fail.
status: provisional
---

# data-quality-fail-closed

A data-quality constraint has three outcomes, not two: pass, fail, and
**unevaluable** — the constraint could not be computed (null or empty input,
missing partition, schema drift, zero denominator, parse failure). Fail-closed
means unevaluable **halts**; it is not silently passed, and it is not coerced
into fail. Halt and fail are different terminal states.

## Moves

1. Enumerate coercion sites: every cast, aggregate, join, division, and
   default-fill where an unevaluable input can become a pass or a fail value.
   These are where three-valued logic collapses to two-valued.
2. Assert the three-valued outcome survives each site end to end.
3. Prove the gate halts on unevaluable: a test that feeds an unevaluable input
   and asserts the pipeline **stops** — not that it returns fail. A test that
   only checks fail has not exercised the halt path.

## Anti-pattern (correct-shaped lie)

A numeric-cast helper that turns a parse failure or null into a fail (or, worse,
a 0), while its unit test feeds only well-formed numbers and never exercises the
failure branch — a green test that never sees the coercion. The arithmetic is
real; the experiment is self-referential.

## Refute link

"The DQ suite is green" → confirm an unevaluable input was actually fed and the
pipeline halted (`refute` moves 1–2: recompute a metric from raw output,
re-execute the gate). Green means the tests ran; it does not mean the
unevaluable branch was one of them.

*Write-audit-publish readers: this skill occupies the **audit slot** of the WAP pattern — the mapping, its polarity upgrade (an audit never seen red on known-bad input is unevaluable, and unevaluable halts), and its honest limits live in the plugin repo at `docs/wap-bridge.md` (ADR-0005).*
