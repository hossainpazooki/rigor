# Closure ledger (index)

Append-only record of **what happened after a misfire** (ADR-0010). One record
per misfire, in `closure-log.jsonl` beside this file, gated by
`scripts/check-misfire-closure.mjs`.

This is **not** a fourth capture ledger. Capture already has homes: `feedback/`
records component misfires, `learnings/` records anchored repo facts. A closure
record *points at* the entry that captured the incident and adds only what those
ledgers cannot express — the blameless mechanism, the pin, and the pin's
red-proof. **No orphans:** every record's `capture` field names an existing entry.

## Record schema

| Field | Meaning |
|---|---|
| `id` | unique kebab slug; never reused (the log is append-only) |
| `ts_captured` | RFC 3339 UTC, when the misfire was **observed** — never composed later |
| `ts_recorded` | RFC 3339 UTC, when this record was written; never before `ts_captured` |
| `component` | which component misfired |
| `domain` | the repo / problem domain it fired in |
| `capture` | path to the `feedback/` or `learnings/` entry that records the incident |
| `mechanism` | the blameless, system-level cause — what *allowed* it, not who did it |
| `closure` | three-state object, below |

## Closure states

- **`pinned`** — requires `pin` (the test or gate that now catches it) **and**
  `red_proof: { cmd, result }` — the command and its output showing that pin goes
  **red on the original failure condition**. A pin never seen red is an
  always-green gate.
- **`declined`** — requires `decision`, `decided_by`, `decided_on` (`YYYY-MM-DD`).
  Deciding not to pin is legitimate; deciding it silently is not.
- **`open`** — legal to write, and it makes the ledger's completeness
  **unevaluable**. Unevaluable halts: no summary may claim "every misfire is
  closed" while a record is open.

## Gate outcomes

```
node scripts/check-misfire-closure.mjs docs/learn/closure-log.jsonl
  exit 0   every record closed with the evidence its state requires
  exit 1   FAIL — malformed record, or a false closure claim (a state asserted
           without its evidence), duplicate id, ts_recorded before ts_captured
  exit 2   UNEVALUABLE — one or more records are open
```

**Standing limit.** The gate cannot execute a pin. It verifies that a closure
claim is *shaped* so a third party could re-run it, never that anyone did. A form
gate is a floor, never a verdict (2026-07-14 learnings entry).

## Starts empty, earns forward

No backfill — the standing invariant is unamended here. The repo's historical
misfires are surveyed in a point-in-time audit
([`../audits/2026-08-18-misfire-closure-survey.md`](../audits/2026-08-18-misfire-closure-survey.md)),
which reads existing records; it does not manufacture entries with reconstructed
timestamps. An empty ledger passes the gate **vacuously**, and the CLI says so out
loud — never quote that pass as evidence of closure.

## Entries

| Id | State | Capture → pin |
|---|---|---|
| `check-runlog-built-but-never-invoked` | **pinned** 2026-08-18 | [learnings 2026-08-18](../learnings/2026-08-18-check-runlog-built-but-never-invoked.md) → `tests/runlog-check.test.mjs` wiring pin, seen RED before the fanout-loop edit and green after |
| `git-guard-bypass-forms-2026-08-22` | **pinned** 2026-08-22 | [feedback 2026-08-22](../feedback/2026-08-22-git-guard-bypass-forms-misfire.md) → `tests/git-guard.test.mjs` + `tests/shell-normalize.test.mjs`; current tests vs the pre-session hook: 70 tests, 33 fail; vs working tree 70/70 |
| `skeptic-provenance-from-commit-date-2026-08-22` | **open** | [learnings 2026-08-22](../learnings/2026-08-22-skeptic-read-commit-date-as-provenance.md) — no pin yet; a pin would be a gate that a provenance claim cites a blob, not a commit date; decline is the operator's call |
| `fabricated-worker-receipt-2026-08-22` | **open** | [feedback 2026-08-22](../feedback/2026-08-22-check-dispatch-fabricated-receipt.md) — `check-dispatch` caught it by luck of the id; no mechanical pin for a placeholder that echoes the right id; decline is the operator's call |

With two records `open`, this ledger is **unevaluable (exit 2)** as of
2026-08-22 — by design (ADR-0010 §4).
