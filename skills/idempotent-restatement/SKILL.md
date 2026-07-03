---
name: idempotent-restatement
description: Use when a pipeline rerun, backfill, or reprocessing is claimed safe — reruns must not double-count, and same-key restatements must resolve by an explicit, tested tiebreak, proven by running twice and diffing.
status: provisional
---

# idempotent-restatement

Rerunning a pipeline, or reprocessing a source that resends or revises records,
must not double-count and must resolve same-key records deterministically.

## Moves

1. Reruns are idempotent: same input → same output, no accumulation. Prove it by
   running twice and diffing (`refute` move 2: re-execute, don't trust), not by
   reasoning about the code.
2. Same-key restatement resolves by an **explicit, tested** tiebreak — not by
   arrival order and not by chance. This tiebreak is the same seam where
   `no-lookahead` leaks enter.
3. Exercise the tiebreak with adversarial same-key input: two records, same key,
   different values, out-of-order arrival. If that path never runs in a test, the
   tiebreak is assumed, not verified.

## Anti-pattern

A merge that assumes last-writer-wins by arrival order, tested only with distinct
keys, so the same-key collision path is never executed. The test suite is green
on the one input distribution that hides the defect.
