# rigor — Numeric-Provenance Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `scripts/check-numeric-provenance.mjs` — an executable that mechanizes `refute` move 1 (Recompute) for the common case "a scalar a doc attributes to a specific row/column of a committed data file" — and wire it into the `refute` skill as the move-1 helper.

**Architecture:** A new sibling check next to `scripts/check-surface-scrub.mjs` and `scripts/check-citation-fidelity.mjs`, in the same shape: a **pure matcher** (`findBrokenNumericClaims`) with no filesystem access, plus thin extraction helpers (`readCsv`, `extract`) and a Windows-safe CLI boundary that reads a JSON claims file. It compares each claimed scalar against the value **recomputed from the cited CSV** (row-filtered and reduced), failing closed on any mismatch beyond tolerance.

**Tech Stack:** Node.js ≥18 (ESM `.mjs`), `node:fs` / `node:path` / `node:url` only (no dependencies), `node:test` + `node:assert/strict` for tests. Markdown for the `refute` skill + README wiring.

## Why this exists (motivation + provenance)

This closes a **logged insufficiency**, not a speculative feature. Two facts, each cited to a source:

1. **The citation-fidelity check is insufficient for numbers.** `scripts/check-citation-fidelity.mjs:13` (`findBrokenCitations`) is a *string-substring* matcher (`!source.includes(identifier)`). `FEEDBACK.md` records the misfire: `2026-06-26 · check-citation-fidelity (refute move 4) · misfired (insufficient depth)` — it is brittle to rounding (`0.0734` is a substring of `0.073412…`) and verifies "string appears in *a* source," not "this number equals the output of the *specific* computation it is attributed to." The ledger row carries the same caveat (`FEEDBACK.md`, `check-citation-fidelity` → "insufficient for numeric provenance").

2. **The error class is real, observed, and reproducible.** In `closed-loop-default-detection`, a handoff stated a strong-propagation gap of `+0.0135` attributed to *"Measured (seed 42)"*. The committed raw artifact `artifacts/seed_sweep_25.csv` (seed-42, severity-0.4 row) gives `strong_gap = 0.00788`; the `+0.0135` is the **25-seed cross-seed mean** of that column (`0.0134`), mislabeled as a single seed. A substring check cannot see a single-row-vs-mean-of-rows mismatch; recompute-and-compare can. This check mechanizes `refute` move 1 (`skills/refute/SKILL.md:18`, "recompute it from the raw source … never restate a figure from memory or from a summary").

**Scope boundary:** this plan covers the numeric-provenance *helper* only. The second logged insufficiency — `FEEDBACK.md`, `2026-06-26 · refute (enforcement) · misfired (by omission)` (load-bearing checks are opt-in, not triggered) — is **out of scope here** and tracked separately; it is a fuzzier, partly-non-automatable design question, not a contained script.

## Global Constraints

- **Git is commands-for-Hossain.** The executing agent NEVER runs `git add`/`commit`/`push`. Every "Commit" step **prints the exact command for Hossain to run** and continues. (This is the rule `hooks/git-guard.mjs` enforces.)
- **Node ESM:** the script is `.mjs`, run as `node <path>`, Node ≥18, standard library only (`node:fs`, `node:path`, `node:url`, `node:test`). No new dependencies — match `scripts/check-surface-scrub.mjs` and `scripts/check-citation-fidelity.mjs`.
- **Pure core / IO at the boundary:** the matcher takes data and returns data (no `fs`); CSV reading happens only in helpers called at the CLI boundary. This mirrors `scripts/check-citation-fidelity.mjs:13` (pure `findBrokenCitations`) + `:21` (`loadSource`) + `:26` (CLI guard).
- **Windows-safe main-module guard:** use `process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href`, verbatim from `scripts/check-citation-fidelity.mjs:26` (the author runs Windows-local + Linux-web).
- **Fail closed:** exit `1` and print one `NUMERIC-PROVENANCE FAIL …` line per broken claim; print `numeric-provenance: clean` and exit `0` otherwise. Same contract style as `scripts/check-surface-scrub.mjs:67-70`.
- **Surface-scrub applies to the skill edit, not this plan.** `scripts/check-surface-scrub.mjs:35-51` only scans `skills/`, `commands/`, `agents/`. The Task 4 edit to `skills/refute/SKILL.md` MUST stay domain-neutral (no `closed-loop-default-detection`, no `seed_sweep` — use a neutral example); this plan file under `docs/plans/` is not scanned and may cite the real artifact.
- **Provisional by default:** any new prose carries the toolkit's honest-status framing; the new check enters `FEEDBACK.md` as `provisional`.

---

## File Structure

```
~/dev/rigor/
├── scripts/
│   └── check-numeric-provenance.mjs   # NEW: pure matcher + readCsv/extract helpers + CLI
├── tests/
│   └── numeric-provenance.test.mjs    # NEW: node:test, mirrors tests/surface-scrub.test.mjs
├── skills/refute/SKILL.md             # MODIFY: move 1 gains a one-line mechanization pointer
├── README.md                          # MODIFY: Tests section lists the new check
└── FEEDBACK.md                        # MODIFY: ledger note — numeric helper now exists
```

One new responsibility per file: the script owns numeric-provenance checking; the test owns its proof; the doc edits are pointers. No existing behavior changes.

## Build order

```
Task 1 (pure matcher) ──► Task 2 (CSV extract+reduce) ──► Task 3 (CLI + real-artifact smoke) ──► Task 4 (wire into refute/README/FEEDBACK)
```

Tasks 1–3 each leave `node --test` green; Task 4 is docs-only.

---

### Task 1: Pure numeric-claim matcher

**Files:**
- Create: `scripts/check-numeric-provenance.mjs`
- Test: `tests/numeric-provenance.test.mjs`

**Interfaces:**
- Consumes: nothing (leaf).
- Produces: `findBrokenNumericClaims(claims, opts?) -> claims[]` where `claims` is `Array<{ label: string, claimed: number, actual: number }>` and `opts` is `{ absTol?: number, relTol?: number }` (defaults `absTol=5e-4`, `relTol=0`). Returns the subset whose `|claimed - actual|` exceeds `max(absTol, relTol * |actual|)`. NaN-safe (a NaN `actual` is always broken).

- [ ] **Step 1: Write the failing tests**

```js
// tests/numeric-provenance.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findBrokenNumericClaims } from '../scripts/check-numeric-provenance.mjs';

test('a claim matching its source within absTol is not broken', () => {
  assert.deepEqual(findBrokenNumericClaims([{ label: 'x', claimed: 0.0079, actual: 0.00788 }]), []);
});
test('a claim off by more than absTol is broken (the §7 seed-42 case)', () => {
  const broken = findBrokenNumericClaims([{ label: 'seed42-gap', claimed: 0.0135, actual: 0.00788 }]);
  assert.equal(broken.length, 1);
  assert.equal(broken[0].label, 'seed42-gap');
});
test('relTol allows proportional drift (0.110 vs 0.112)', () => {
  assert.deepEqual(findBrokenNumericClaims([{ label: 'mae', claimed: 0.110, actual: 0.112 }], { relTol: 0.02 }), []);
});
test('an exact substring but wrong value is still broken (0.0734 in 0.073412)', () => {
  assert.equal(findBrokenNumericClaims([{ label: 's', claimed: 0.0734, actual: 0.073412 }], { absTol: 1e-5 }).length, 1);
});
test('a NaN actual is treated as broken', () => {
  assert.equal(findBrokenNumericClaims([{ label: 'x', claimed: 1, actual: NaN }]).length, 1);
});
test('empty claims list is clean', () => {
  assert.deepEqual(findBrokenNumericClaims([]), []);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/numeric-provenance.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` (script does not exist yet).

- [ ] **Step 3: Write the minimal matcher**

```js
// scripts/check-numeric-provenance.mjs
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Pure numeric-citation matcher. Each claim pairs a `claimed` scalar (the number a
 * doc states) with an `actual` scalar (recomputed from the cited source). A claim is
 * BROKEN when |claimed - actual| exceeds the tolerance — absolute by default, or
 * relative when `relTol` is given. No fs here; the caller produces `actual` at the
 * CLI boundary. Mirrors check-citation-fidelity's pure findBrokenCitations.
 */
export function findBrokenNumericClaims(claims, { absTol = 5e-4, relTol = 0 } = {}) {
  return claims.filter(({ claimed, actual }) => {
    const bound = Math.max(absTol, relTol * Math.abs(actual));
    return !(Math.abs(claimed - actual) <= bound); // NaN-safe: NaN comparison is false => broken
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/numeric-provenance.test.mjs`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit (print for Hossain)**

```bash
git add scripts/check-numeric-provenance.mjs tests/numeric-provenance.test.mjs
git commit -m "feat(numeric-provenance): pure findBrokenNumericClaims matcher + tests"
```

---

### Task 2: CSV extraction + reduction helpers

**Files:**
- Modify: `scripts/check-numeric-provenance.mjs`
- Modify: `tests/numeric-provenance.test.mjs`

**Interfaces:**
- Consumes: `findBrokenNumericClaims` (Task 1), unchanged.
- Produces:
  - `readCsv(path) -> { header: string[], rows: Array<Record<string,string>> }` — minimal reader for the deterministic artifact CSVs (no quoted commas/newlines; documented limitation).
  - `extract(rows, spec) -> number` where `spec` is `{ column: string, where?: Record<string, number|string>, reduce?: 'first' | 'mean' }`. Filters rows where every `where[k]` numerically equals `row[k]`, maps `column` to numbers, then reduces (`'first'` = the single attributed row; `'mean'` = cross-row aggregate). Throws if no rows match.

- [ ] **Step 1: Write the failing tests** (append to `tests/numeric-provenance.test.mjs`)

```js
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readCsv, extract } from '../scripts/check-numeric-provenance.mjs';

// The §7 provenance error in miniature: seed-42 row = 0.0079, cross-seed mean = 0.0134.
test('extract first-row vs mean distinguishes seed-42 from the cross-seed mean', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rigor-num-'));
  try {
    writeFileSync(join(dir, 's.csv'),
      'seed,severity,strong_gap\n42,0.4,0.0079\n7,0.4,0.0190\n2026,0.4,0.0133\n');
    const { rows } = readCsv(join(dir, 's.csv'));
    assert.equal(extract(rows, { column: 'strong_gap', where: { seed: 42, severity: 0.4 }, reduce: 'first' }), 0.0079);
    const mean = extract(rows, { column: 'strong_gap', where: { severity: 0.4 }, reduce: 'mean' });
    assert.ok(Math.abs(mean - 0.0134) < 1e-4); // the value the doc mislabeled as "seed 42"
  } finally { rmSync(dir, { recursive: true }); }
});
test('extract throws when no row matches the filter', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rigor-num-'));
  try {
    writeFileSync(join(dir, 's.csv'), 'seed,strong_gap\n42,0.0079\n');
    const { rows } = readCsv(join(dir, 's.csv'));
    assert.throws(() => extract(rows, { column: 'strong_gap', where: { seed: 99 } }));
  } finally { rmSync(dir, { recursive: true }); }
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `node --test tests/numeric-provenance.test.mjs`
Expected: FAIL — `readCsv`/`extract` are not exported yet.

- [ ] **Step 3: Add the helpers** (insert into `scripts/check-numeric-provenance.mjs` after the matcher)

```js
/**
 * Minimal CSV reader for rigor's deterministic artifact CSVs. Splits on lines and
 * commas only — it does NOT handle quoted commas or embedded newlines (the artifact
 * CSVs have none). Returns header + row objects keyed by column name.
 */
export function readCsv(path) {
  const lines = readFileSync(path, 'utf8').split(/\r?\n/).filter((l) => l.length > 0);
  const header = lines[0].split(',');
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(',');
    return Object.fromEntries(header.map((h, i) => [h, cells[i]]));
  });
  return { header, rows };
}

/**
 * Recompute a scalar from `rows`: keep rows where every where[k] numerically equals
 * row[k], take `column` as numbers, then reduce. reduce 'first' = the single row a
 * claim attributes a value to; 'mean' = the cross-row aggregate (e.g. a cross-seed
 * mean). Throws if the filter selects nothing — an unmatched provenance is itself a
 * finding, not a silent zero.
 */
export function extract(rows, { column, where = {}, reduce = 'first' }) {
  const sel = rows.filter((r) =>
    Object.entries(where).every(([k, v]) => Number(r[k]) === Number(v)));
  if (sel.length === 0) throw new Error(`no rows match ${JSON.stringify(where)}`);
  const vals = sel.map((r) => Number(r[column]));
  return reduce === 'mean' ? vals.reduce((a, b) => a + b, 0) / vals.length : vals[0];
}
```

- [ ] **Step 4: Run to verify all tests pass**

Run: `node --test tests/numeric-provenance.test.mjs`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit (print for Hossain)**

```bash
git add scripts/check-numeric-provenance.mjs tests/numeric-provenance.test.mjs
git commit -m "feat(numeric-provenance): readCsv + extract (row-filter + first/mean reduce)"
```

---

### Task 3: CLI boundary + real-artifact smoke

**Files:**
- Modify: `scripts/check-numeric-provenance.mjs`

**Interfaces:**
- Consumes: `findBrokenNumericClaims`, `readCsv`, `extract` (Tasks 1–2).
- Produces: a CLI. Input: `node scripts/check-numeric-provenance.mjs <claims.json>`, where `claims.json` is `[{ label, claimed, source, column, where?, reduce?, absTol?, relTol? }]`. For each spec it recomputes `actual = extract(readCsv(source).rows, spec)`, compares via `findBrokenNumericClaims`, prints `NUMERIC-PROVENANCE FAIL <label>: doc says <claimed> but <source>[<column>,<where>,<reduce>] = <actual>` per break, else `numeric-provenance: clean`. Exit `1` on any break.

- [ ] **Step 1: Add the CLI guard** (append to `scripts/check-numeric-provenance.mjs`)

```js
// Windows-safe main-module check (verbatim shape from check-citation-fidelity.mjs).
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const claimsFile = process.argv[2];
  if (!claimsFile) {
    console.error('usage: check-numeric-provenance.mjs <claims.json>  ' +
      '# [{label, claimed, source, column, where?, reduce?, absTol?, relTol?}]');
    process.exit(1);
  }
  const specs = JSON.parse(readFileSync(claimsFile, 'utf8'));
  const broken = [];
  for (const s of specs) {
    const actual = extract(readCsv(s.source).rows, s);
    const claim = { label: s.label, claimed: Number(s.claimed), actual };
    if (findBrokenNumericClaims([claim], { absTol: s.absTol ?? 5e-4, relTol: s.relTol ?? 0 }).length) {
      console.error(`NUMERIC-PROVENANCE FAIL ${s.label}: doc says ${s.claimed} but ` +
        `${s.source}[${s.column}, ${JSON.stringify(s.where ?? {})}, ${s.reduce ?? 'first'}] = ${actual}`);
      broken.push(s);
    }
  }
  if (broken.length) process.exit(1);
  console.log('numeric-provenance: clean');
}
```

- [ ] **Step 2: Confirm the unit gate is still green**

Run: `node --test`
Expected: PASS — the full suite (existing tests + the 8 numeric-provenance tests), 0 fail.

- [ ] **Step 3: Smoke the CLI against the real artifact** (regression evidence for the documented defect)

Write a temp claims file with the two §7 framings and run it (use a real `closed-loop-default-detection` checkout if present; otherwise skip with a note):

```bash
node scripts/check-numeric-provenance.mjs - <<'JSON' 2>&1 || true
[
  { "label": "wrong: +0.0135 as seed-42",
    "claimed": 0.0135, "source": "../closed-loop-default-detection/artifacts/seed_sweep_25.csv",
    "column": "strong_gap", "where": { "seed": 42, "severity": 0.4 }, "reduce": "first" },
  { "label": "right: +0.0134 is the 25-seed mean",
    "claimed": 0.0134, "source": "../closed-loop-default-detection/artifacts/seed_sweep_25.csv",
    "column": "strong_gap", "where": { "severity": 0.4 }, "reduce": "mean", "absTol": 0.0005 }
]
JSON
```

(If reading from stdin is not wired, write the JSON to a temp file and pass its path.)
Expected: the first claim **FAILS** (`doc says 0.0135 but …[strong_gap,{seed:42,severity:0.4},first] = 0.00788…`), the second is clean — proving the check distinguishes the mislabeled per-seed claim from the true cross-seed-mean provenance. Record the output verbatim in the commit body.

- [ ] **Step 4: Commit (print for Hossain)**

```bash
git add scripts/check-numeric-provenance.mjs
git commit -m "feat(numeric-provenance): CLI boundary; smoke catches the seed-42 mislabel"
```

---

### Task 4: Wire into `refute`, README, and FEEDBACK

**Files:**
- Modify: `skills/refute/SKILL.md` (move 1 — domain-neutral, surface-scrub applies)
- Modify: `README.md` (Tests section)
- Modify: `FEEDBACK.md` (ledger note)

**Interfaces:** none (docs only).

- [ ] **Step 1: Point move 1 at the helper** — in `skills/refute/SKILL.md`, move 1 ("Recompute", currently `skills/refute/SKILL.md:18`), append one neutral sentence:

```markdown
   For a scalar a claim attributes to a specific row/column of a committed data file,
   `scripts/check-numeric-provenance.mjs` mechanizes this: it recomputes the value from
   the cited file (row-filtered and reduced) and flags any claim off by more than a
   tolerance — catching a number sourced from nowhere, or one attributed to the wrong
   row (e.g. a cross-row mean reported as a single row).
```

(No project names — surface-scrub scans this file; see `scripts/check-surface-scrub.mjs:35-51`.)

- [ ] **Step 2: Run surface-scrub on the edited skill**

Run: `node scripts/check-surface-scrub.mjs`
Expected: `surface-scrub: clean`.

- [ ] **Step 3: Add the check to README Tests** — in `README.md`'s Tests section (`README.md:204-207`), extend the list to include `numeric-provenance`.

```markdown
`node --test` (auto-discovers `tests/*.test.mjs` — hooks + surface-scrub +
citation-fidelity + numeric-provenance).
```

- [ ] **Step 4: Update the FEEDBACK ledger row** — in `FEEDBACK.md`, change the `check-citation-fidelity` caveat to note the gap is now covered by a sibling, and add a `check-numeric-provenance` row:

```markdown
| `check-citation-fidelity` | 0 | provisional — identifier/quote fidelity; numeric provenance now handled by `check-numeric-provenance` |
| `check-numeric-provenance` | 0 | provisional — mechanizes refute move 1 for scalars attributed to a CSV row/column |
```

- [ ] **Step 5: Verify the whole gate once more**

Run: `node --test`
Expected: PASS, 0 fail.

- [ ] **Step 6: Commit (print for Hossain)**

```bash
git add skills/refute/SKILL.md README.md FEEDBACK.md
git commit -m "docs(refute): wire check-numeric-provenance into move 1; README + FEEDBACK"
```

---

## Self-Review

- **Spec coverage:** the logged numeric-depth insufficiency (`FEEDBACK.md`, `check-citation-fidelity … misfired (insufficient depth)`) → Tasks 1–3 (the check) + Task 4 (move-1 wiring). The enforcement insufficiency is explicitly out of scope (stated above), not silently dropped.
- **Placeholder scan:** every code step carries complete code; the CLI smoke (Task 3 Step 3) has exact input/expected output; no "TBD"/"add validation"/"similar to Task N".
- **Type consistency:** `findBrokenNumericClaims(claims, opts)`, `readCsv(path) -> {header, rows}`, `extract(rows, {column, where, reduce})` are named identically in their defining task (1/2) and their consumer (CLI, Task 3). The CLI's per-spec `absTol`/`relTol` flow into the same `opts` shape Task 1 defines.
- **Determinism / no-deps:** standard library only; the matcher is pure; CSV reader limitation (no quoted commas) is documented, not hidden.

## Provenance (every load-bearing citation in this plan)

Each reference below was opened and verified while writing this plan; the `path:line` anchors are exact. The numeric claims are themselves checkable by the script this plan builds (a self-referential regression fixture).

| Claim in this plan | Source |
|---|---|
| citation-fidelity is a substring matcher | `scripts/check-citation-fidelity.mjs:13` (`!source.includes(identifier)`) |
| pure-fn + `loadSource` + CLI-guard pattern to mirror | `scripts/check-citation-fidelity.mjs:13,21,26` |
| surface-scrub only scans skills/commands/agents | `scripts/check-surface-scrub.mjs:35-51` |
| fail-closed CLI contract style | `scripts/check-surface-scrub.mjs:67-70` |
| refute move 1 = "recompute from raw source" | `skills/refute/SKILL.md:18` |
| numeric-depth insufficiency is logged | `FEEDBACK.md` → `2026-06-26 · check-citation-fidelity (refute move 4) · misfired (insufficient depth)` |
| enforcement insufficiency (out of scope) is logged | `FEEDBACK.md` → `2026-06-26 · refute (enforcement) · misfired (by omission)` |
| seed-42 sev-0.4 `strong_gap = 0.00788` | `../closed-loop-default-detection/artifacts/seed_sweep_25.csv` (seed 42, severity 0.4 row) |
| `+0.0135` is the 25-seed cross-seed mean (`0.0134`) | mean of `strong_gap` over severity-0.4 rows of the same CSV |
| existing rigor plan format/header | `docs/plans/2026-06-25-rigor-plugin-phase1.md:1-19` |

## Execution Handoff

Plan complete and saved to `docs/plans/2026-06-26-numeric-provenance-check.md`. Two execution options:

1. **Subagent-Driven (recommended)** — a fresh subagent per task, review between tasks.
2. **Inline Execution** — execute tasks in this session with checkpoints.

This is a small, single-file build (one script + one test file + three doc pointers); inline execution is reasonable if you want it done in one pass.
