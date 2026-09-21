# `execute-plan` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `rigor:execute-plan` is the
> operator's standing mechanism for plan execution when rigor is loaded (in
> place of superpowers:subagent-driven-development). This plan builds that
> mechanism, so it is executed **inline by the orchestrator** in the authoring
> session — it is the bootstrap, not the first domain. Steps use checkbox
> (`- [ ]`) syntax for tracking. Commit steps are emitted for the human; agents
> never write git history.

**Goal:** Ship the `execute-plan` shape — a skill, a slash command, a gated
Workflow example, and a plan-intake utility — so `rigor:orchestrate` performs
the function of superpowers' `subagent-driven-development`: per-task
implementer, per-task spec + quality review with a bounded fix loop, per-wave
integration gate and commit emission, whole-branch refutation, durable ledger.

**Architecture:** One pure parser/wave utility (`scripts/plan-waves.mjs`) turns
a `writing-plans` plan into args; one Workflow script
(`skills/execute-plan/example.mjs`) executes one wave per invocation under the
`orchestrate` guardrails; the skill and command carry the discipline the script
cannot (ledger, resume, stakes markers, halts). Existing gates
(`check-fanout`, `check-tier-placement`, `check-dispatch`) pin the shape; a
stubbed-runtime test pins the script's control flow.

**Tech Stack:** Node stdlib only (`node:test`, `node:fs`, `node:path`,
`node:url`); Markdown for the skill and command. No new dependencies.

Spec: [`../specs/2026-09-15-execute-plan-design.md`](../specs/2026-09-15-execute-plan-design.md).

## Global Constraints

- No runtime dependencies beyond Node; gates and tests are stdlib-only (`node:test`).
- House style for scripts: pure exported matcher, fs only at the CLI boundary; Windows-safe main-module check via `pathToFileURL(resolve(process.argv[1])).href`.
- Three-outcome CLIs: exit 0 clean, 1 fail, 2 UNEVALUABLE / not applicable.
- The shipped surface (`skills/`, `agents/`, `commands/`) stays domain-neutral; `node scripts/check-surface-scrub.mjs` must stay clean.
- Tier → model lives in `config/models.json`; a Workflow script reads tiers from `args`, never hardcodes a `claude-` literal.
- Workflow scripts cannot use `Date.now()`, `Math.random()`, filesystem, or `new Date()` without an argument.
- Agents never write git history; every Commit step below is run by the human.
- `node --test` is the merge floor: 598 passing at branch HEAD `2bfbcc1` before this plan; every task ends green.
- Fix-loop cap: 2 rounds. Reviewer tier: mid (`skeptic-verifier-fast`) for medium stakes, judgment (`skeptic-verifier`) for high stakes. Default high-stakes file pattern: `migrat|deploy|release|helm|terraform|kube|workflows` (case-insensitive).
- Ledger path: `$(git rev-parse --git-path rigor)/execute/<plan-slug>.progress.jsonl` (untracked). Verdict log: `<plan-dir>/<plan-slug>.verdicts.jsonl` (tracked).
- Keep stdout ASCII on Windows.

---

### Task 1: Plan parser — `parsePlan` and `validatePlan`

**Files:**
- Create: `scripts/plan-waves.mjs`
- Test: `tests/plan-waves.test.mjs`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `parsePlan(markdown: string) -> { constraints: string, tasks: Task[] }` where `Task = { n: number, name: string, files: { create: string[], modify: string[], test: string[] }, interfaces: { consumes: string, produces: string }, commits: string[], body: string }`; `validatePlan(parsed) -> string[]` (empty when executable); `allFiles(task) -> string[]`.

- [x] **Step 1: Write the failing tests**

Create `tests/plan-waves.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePlan, validatePlan, allFiles } from '../scripts/plan-waves.mjs';

// A five-task writing-plans fixture. Task 3 modifies Task 1's file; Task 5
// shares Task 2's test file; Task 4 is disjoint from everything.
export const FIXTURE = `# Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: whatever.

**Goal:** Build the widget.

## Global Constraints

- Node stdlib only.
- Every task ends green.

---

### Task 1: Core module

**Files:**
- Create: \`src/a.js\`
- Test: \`tests/a.test.js\`

**Interfaces:**
- Consumes: nothing
- Produces: \`a(x: number) -> number\`

- [x] **Step 1: Write the failing test**

\`\`\`js
test('a', () => assert.equal(a(1), 2));
\`\`\`

- [x] **Step 2: Commit**

\`\`\`bash
git add src/a.js tests/a.test.js
git commit -m "feat: add a"
\`\`\`

### Task 2: Second module

**Files:**
- Create: \`src/b.js\`
- Test: \`tests/b.test.js\`

**Interfaces:**
- Consumes: nothing
- Produces: \`b() -> string\`

- [x] **Step 1: Commit**

\`\`\`bash
git commit -m "feat: add b"
\`\`\`

### Task 3: Extend core

**Files:**
- Modify: \`src/a.js:10-20\`
- Test: \`tests/a2.test.js\`

**Interfaces:**
- Consumes: \`a(x)\` from Task 1
- Produces: \`a2(x: number) -> number\`

- [x] **Step 1: Commit**

\`\`\`bash
git commit -m "feat: extend a"
\`\`\`

### Task 4: Independent helper

**Files:**
- Create: \`src/c.js\`

**Interfaces:**
- Consumes: nothing
- Produces: \`c() -> void\`

### Task 5: More b tests

**Files:**
- Modify: \`tests/b.test.js\`

**Interfaces:**
- Consumes: \`b()\` from Task 2
- Produces: nothing

## Appendix

Not a task.
`;

test('parsePlan finds every task with its number, name, files, interfaces and commits', () => {
  const p = parsePlan(FIXTURE);
  assert.equal(p.tasks.length, 5);
  assert.deepEqual(p.tasks.map((t) => t.n), [1, 2, 3, 4, 5]);
  assert.equal(p.tasks[0].name, 'Core module');
  assert.deepEqual(p.tasks[0].files, { create: ['src/a.js'], modify: [], test: ['tests/a.test.js'] });
  assert.deepEqual(p.tasks[2].files.modify, ['src/a.js'], 'the :10-20 line-range suffix is stripped');
  assert.equal(p.tasks[0].interfaces.produces, '`a(x: number) -> number`');
  assert.equal(p.tasks[2].interfaces.consumes, '`a(x)` from Task 1');
  assert.deepEqual(p.tasks[0].commits, ['git commit -m "feat: add a"']);
  assert.deepEqual(p.tasks[3].commits, []);
  assert.match(p.tasks[0].body, /Write the failing test/);
  assert.doesNotMatch(p.tasks[4].body, /Appendix/, 'a top-level section ends the last task');
});

test('parsePlan lifts Global Constraints verbatim', () => {
  const p = parsePlan(FIXTURE);
  assert.match(p.constraints, /Node stdlib only\./);
  assert.match(p.constraints, /Every task ends green\./);
  assert.doesNotMatch(p.constraints, /Task 1/);
});

test('allFiles unions create, modify and test paths', () => {
  const p = parsePlan(FIXTURE);
  assert.deepEqual(allFiles(p.tasks[0]), ['src/a.js', 'tests/a.test.js']);
});

test('validatePlan is empty for the fixture', () => {
  assert.deepEqual(validatePlan(parsePlan(FIXTURE)), []);
});

test('validatePlan refuses a plan with no tasks, a task with no Files, and placeholder paths', () => {
  assert.match(validatePlan(parsePlan('# Nothing\n\nprose only\n')).join('\n'), /no `### Task N:` headings/);
  const noFiles = parsePlan('### Task 1: X\n\n**Interfaces:**\n- Produces: y\n');
  assert.match(validatePlan(noFiles).join('\n'), /Task 1 names no files/);
  const placeholder = parsePlan('### Task 1: X\n\n**Files:**\n- Create: `exact/path/to/file.py`\n');
  assert.match(validatePlan(placeholder).join('\n'), /placeholder path/);
  const tbd = parsePlan('### Task 1: X\n\n**Files:**\n- Create: `src/TBD.js`\n');
  assert.match(validatePlan(tbd).join('\n'), /placeholder path/);
});
```

- [x] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/plan-waves.test.mjs`
Expected: FAIL — `Cannot find module '../scripts/plan-waves.mjs'`.

- [x] **Step 3: Write the parser**

> **The code below is the PLANNED parser, not the shipped one.** Execution found
> two defects in it before anything landed — naive fence toggling and
> commit-lifting from any fence — so `scripts/plan-waves.mjs` at HEAD has
> `fenceStep()` (backtick-length tracking) and `inCommitStep` + `STEP_RE`, which
> appear nowhere here. Read the shipped file, not this fence. See
> "Deviations recorded at execution" at the foot of this plan.

Create `scripts/plan-waves.mjs`:

```js
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Plan intake for the execute-plan shape: turns a writing-plans-format plan
 * (`### Task N: <name>`, a Files block of Create/Modify/Test paths, an
 * Interfaces block, numbered steps) into the args the execute-plan workflow
 * consumes, and derives execution waves from the Files lists alone.
 *
 * Pure parser + wave derivation; fs only at the CLI boundary. A utility, not
 * a gate — but its CLI is three-outcome, because a plan that fails
 * writing-plans' own no-placeholder rule must not be executed on a guess:
 *   exit 0  args JSON on stdout
 *   exit 2  UNEVALUABLE: no tasks, a task with no files, or a placeholder path
 *
 * HONEST LIMIT: waves come from the Files lists only, never from imports.
 * A file named by two tasks is the drift hazard whether or not one imports
 * the other, so this is stricter than a hand derivation, never looser.
 */

const TASK_RE = /^### Task (\d+): (.+?)\s*$/;
const FILE_RE = /^- (Create|Modify|Test): `([^`]+)`/;
const IFACE_RE = /^- (Consumes|Produces): (.*)$/;
const COMMIT_RE = /^git commit\b.*$/;
const PLACEHOLDER_RE = /\b(TBD|TODO)\b|(^|\/)(exact|path)\/|\/to\//i;

const stripRange = (p) => p.replace(/:\d+(-\d+)?$/, '');

export function parsePlan(markdown) {
  const lines = String(markdown).split(/\r?\n/);
  const constraints = [];
  const tasks = [];
  let inConstraints = false;
  let cur = null;
  for (const line of lines) {
    if (/^## Global Constraints\s*$/.test(line)) { inConstraints = true; continue; }
    if (inConstraints) {
      if (/^(---\s*|## .*|### .*)$/.test(line)) inConstraints = false;
      else { constraints.push(line); continue; }
    }
    const m = TASK_RE.exec(line);
    if (m) { cur = { n: Number(m[1]), name: m[2], lines: [] }; tasks.push(cur); continue; }
    if (cur) {
      if (/^## /.test(line)) { cur = null; continue; } // a top-level section ends the task list
      cur.lines.push(line);
    }
  }
  return { constraints: constraints.join('\n').trim(), tasks: tasks.map(parseTask) };
}

function parseTask({ n, name, lines }) {
  const files = { create: [], modify: [], test: [] };
  const interfaces = { consumes: '', produces: '' };
  const commits = [];
  let inFence = false;
  for (const line of lines) {
    if (/^```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) { if (COMMIT_RE.test(line.trim())) commits.push(line.trim()); continue; }
    const f = FILE_RE.exec(line);
    if (f) { files[f[1].toLowerCase()].push(stripRange(f[2])); continue; }
    const i = IFACE_RE.exec(line);
    if (i) interfaces[i[1].toLowerCase()] = i[2].trim();
  }
  return { n, name, files, interfaces, commits, body: lines.join('\n').trim() };
}

export function allFiles(task) {
  return [...task.files.create, ...task.files.modify, ...task.files.test];
}

export function validatePlan(parsed) {
  const problems = [];
  if (!parsed.tasks.length) problems.push('no `### Task N:` headings found - not a writing-plans plan');
  for (const t of parsed.tasks) {
    const files = allFiles(t);
    if (!files.length) problems.push(`Task ${t.n} names no files (no Files block) - waves cannot be derived`);
    for (const f of files) {
      if (PLACEHOLDER_RE.test(f)) problems.push(`Task ${t.n} has a placeholder path: ${f}`);
    }
  }
  return problems;
}
```

- [x] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/plan-waves.test.mjs`
Expected: `tests 5 / pass 5 / fail 0`.

- [x] **Step 5: Commit**

```bash
git add scripts/plan-waves.mjs tests/plan-waves.test.mjs
git commit -m "feat(plan-waves): parse a writing-plans plan"
```

---

### Task 2: Wave derivation and the three-outcome CLI

**Files:**
- Modify: `scripts/plan-waves.mjs` (append below `validatePlan`)
- Modify: `tests/plan-waves.test.mjs` (append)

**Interfaces:**
- Consumes: `parsePlan`, `validatePlan`, `allFiles` from Task 1.
- Produces: `deriveWaves(tasks: Task[]) -> number[][]` (task numbers, plan order within a wave); `toArgs(parsed) -> { constraints, tasks, waves }`; CLI `node scripts/plan-waves.mjs <plan.md>` printing `toArgs` JSON (exit 0) or `plan-waves: UNEVALUABLE - ...` lines on stderr (exit 2).

> **This task's code fences also diverge from HEAD.** The smoke check here is
> what caught Task 1's two parser defects, and the fixes landed inside
> `parsePlan`/`parseTask` rather than as the appends written below. The waves
> for this plan are `[[1,3,4,5,6],[2]]`, as corrected in step 5. See
> "Deviations recorded at execution" at the foot of this plan.

- [x] **Step 1: Write the failing tests**

Append to `tests/plan-waves.test.mjs`:

```js
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveWaves, toArgs } from '../scripts/plan-waves.mjs';

const CLI = fileURLToPath(new URL('../scripts/plan-waves.mjs', import.meta.url));

function runCli(planText) {
  const dir = mkdtempSync(join(tmpdir(), 'plan-waves-'));
  const file = join(dir, 'plan.md');
  writeFileSync(file, planText);
  try {
    const stdout = execFileSync(process.execPath, [CLI, file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, stdout, stderr: '' };
  } catch (e) {
    return { code: e.status, stdout: String(e.stdout || ''), stderr: String(e.stderr || '') };
  }
}

test('deriveWaves: a shared file forces a later wave; disjoint tasks share a wave; plan order holds', () => {
  const p = parsePlan(FIXTURE);
  // Task 3 modifies src/a.js (Task 1); Task 5 modifies tests/b.test.js (Task 2).
  assert.deepEqual(deriveWaves(p.tasks), [[1, 2, 4], [3, 5]]);
});

test('deriveWaves: a chain of shared files produces one wave per link', () => {
  const chain = [
    { n: 1, files: { create: ['x.js'], modify: [], test: [] } },
    { n: 2, files: { create: [], modify: ['x.js'], test: [] } },
    { n: 3, files: { create: [], modify: ['x.js'], test: [] } },
    { n: 4, files: { create: ['y.js'], modify: [], test: [] } },
  ];
  assert.deepEqual(deriveWaves(chain), [[1, 4], [2], [3]]);
});

test('deriveWaves: the wave is fixed by earlier tasks, so a task never moves ahead of plan order', () => {
  const t = [
    { n: 1, files: { create: ['a.js'], modify: [], test: [] } },
    { n: 2, files: { create: [], modify: ['a.js'], test: [] } },
    { n: 3, files: { create: [], modify: ['a.js', 'b.js'], test: [] } },
    { n: 4, files: { create: ['b.js'], modify: [], test: [] } },
  ];
  // Task 4 shares b.js with Task 3 (wave 3) -> wave 4, even though it does not touch a.js.
  assert.deepEqual(deriveWaves(t), [[1], [2], [3], [4]]);
});

test('toArgs carries constraints, tasks and waves', () => {
  const a = toArgs(parsePlan(FIXTURE));
  assert.deepEqual(Object.keys(a), ['constraints', 'tasks', 'waves']);
  assert.deepEqual(a.waves, [[1, 2, 4], [3, 5]]);
  assert.equal(a.tasks[0].n, 1);
});

test('CLI: prints args JSON and exits 0 for an executable plan', () => {
  const r = runCli(FIXTURE);
  assert.equal(r.code, 0, r.stderr);
  const parsed = JSON.parse(r.stdout);
  assert.deepEqual(parsed.waves, [[1, 2, 4], [3, 5]]);
});

test('CLI: a placeholder path is UNEVALUABLE (exit 2), never args', () => {
  const r = runCli('### Task 1: X\n\n**Files:**\n- Create: `exact/path/to/file.py`\n');
  assert.equal(r.code, 2);
  assert.match(r.stderr, /UNEVALUABLE/);
  assert.match(r.stderr, /placeholder path/);
  assert.equal(r.stdout.trim(), '');
});

test('CLI: a prose file with no tasks is UNEVALUABLE (exit 2)', () => {
  const r = runCli('# Just a doc\n\nNo tasks here.\n');
  assert.equal(r.code, 2);
  assert.match(r.stderr, /no `### Task N:` headings/);
});

test('CLI: a missing file is UNEVALUABLE (exit 2)', () => {
  let code = 0, stderr = '';
  try { execFileSync(process.execPath, [CLI, join(tmpdir(), 'does-not-exist.md')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { code = e.status; stderr = String(e.stderr); }
  assert.equal(code, 2);
  assert.match(stderr, /cannot read/);
});
```

- [x] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/plan-waves.test.mjs`
Expected: FAIL — `deriveWaves`/`toArgs` are not exported (SyntaxError on import).

- [x] **Step 3: Write `deriveWaves`, `toArgs`, and the CLI**

Append to `scripts/plan-waves.mjs`:

```js
/**
 * In plan order, a task joins the wave after the latest wave that holds an
 * earlier task naming any file it names; with no such task it joins wave 1.
 * Two tasks sharing a file never share a wave, and plan order holds inside
 * a wave because a task's wave depends only on the tasks before it.
 */
export function deriveWaves(tasks) {
  const waveOf = new Map(); // task n -> wave index
  const waves = [];
  for (const t of tasks) {
    const mine = new Set(allFiles(t));
    let idx = 0;
    for (const prev of tasks) {
      if (prev === t) break;
      if (allFiles(prev).some((f) => mine.has(f))) idx = Math.max(idx, waveOf.get(prev.n) + 1);
    }
    waveOf.set(t.n, idx);
    (waves[idx] ||= []).push(t.n);
  }
  return waves;
}

export function toArgs(parsed) {
  return { constraints: parsed.constraints, tasks: parsed.tasks, waves: deriveWaves(parsed.tasks) };
}

// Windows-safe main-module check.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: node scripts/plan-waves.mjs <plan.md>   (prints execute-plan args JSON)');
    process.exit(2);
  }
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (e) {
    console.error(`plan-waves: UNEVALUABLE - cannot read ${file}: ${e.message}`);
    process.exit(2);
  }
  const parsed = parsePlan(text);
  const problems = validatePlan(parsed);
  if (problems.length) {
    for (const p of problems) console.error(`plan-waves: UNEVALUABLE - ${p}`);
    console.error('A plan that fails writing-plans\' no-placeholder rule is not executed on a guess. Exit 2.');
    process.exit(2);
  }
  process.stdout.write(JSON.stringify(toArgs(parsed), null, 1) + '\n');
}
```

- [x] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/plan-waves.test.mjs`
Expected: `tests 13 / pass 13 / fail 0`.

- [x] **Step 5: Run the CLI on this plan as a smoke check**

Run: `node scripts/plan-waves.mjs docs/plans/2026-09-15-execute-plan-plan.md | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const a=JSON.parse(s);console.log(a.tasks.length,'tasks; waves',JSON.stringify(a.waves))})"`
Expected: `6 tasks; waves [[1,3,4,5,6],[2]]` — only Task 2 shares files with an earlier task (Task 1's). Tasks 4 and 6 depend on Tasks 3 and 5 by import and by name, which a Files-only derivation cannot see: this is the honest limit the spec states, demonstrated on the plan that builds the utility, and the reason this plan is executed inline in plan order rather than by its own waves. (If the printed waves differ from this, the Files blocks of this plan are wrong, not the utility — fix the plan.)

- [x] **Step 6: Commit**

```bash
git add scripts/plan-waves.mjs tests/plan-waves.test.mjs
git commit -m "feat(plan-waves): derive waves; three-outcome CLI"
```

---

### Task 3: The execute-plan Workflow example, gated

**Files:**
- Create: `skills/execute-plan/example.mjs`
- Modify: `tests/tier-placement.test.mjs` (append one test)
- Modify: `tests/fanout-check.test.mjs` (append one test)

**Interfaces:**
- Consumes: the args shape from Task 2 (`{ constraints, tasks, waves }`) passed as `args.plan`.
- Produces: a Workflow script taking `args = { tiers: { build, mid, judgment }, plan, wave: <1-based, default: first wave with incomplete tasks>, completed: [n...], base: <sha>, gate: <command>, plan_slug, scratch, final: <bool>, high_stakes_pattern?, claims?: [] }` and returning `{ wave, results: [{ task, status, rounds, minor, cannot_verify, halted? }], integ, commit_block: [cmd...], receipts, verdictRecords, verdicts, halted?, claimTrue }`.

- [x] **Step 1: Write the failing gate pins**

Append to `tests/tier-placement.test.mjs`:

```js
test('the shipped execute-plan example passes the gate (every non-verify call pinned)', () => {
  const example = readFileSync(resolve(here, '../skills/execute-plan/example.mjs'), 'utf8');
  assert.deepEqual(analyzeTierPlacement(example, CONFIG), []);
});
```

Append to `tests/fanout-check.test.mjs`:

```js
test('the shipped execute-plan example is a clean fan-out (contract, integration, verify, schemas)', () => {
  const src = readFileSync(new URL('../skills/execute-plan/example.mjs', import.meta.url), 'utf8');
  assert.equal(isFanoutScript(src), true);
  assert.deepEqual(analyzeFanout(src), []);
});
```

(`readFileSync` is already imported in `tests/tier-placement.test.mjs`; in `tests/fanout-check.test.mjs` add `readFileSync` to the existing `node:fs` import line: `import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';`.)

- [x] **Step 2: Run the two test files to verify they fail**

Run: `node --test tests/tier-placement.test.mjs tests/fanout-check.test.mjs`
Expected: 2 failures, both `ENOENT ... skills/execute-plan/example.mjs`.

- [x] **Step 3: Write the example script**

Create `skills/execute-plan/example.mjs`:

```js
// execute-plan — one wave of a written plan, under the orchestrate guardrails.
//
// Run via the workflow runtime. Pass args = { tiers, plan, wave, completed,
// base, gate, plan_slug, scratch, final, high_stakes_pattern?, claims? } where
// `plan` is the JSON printed by `node scripts/plan-waves.mjs <plan.md>`. One
// invocation executes ONE wave (command = iteration; the orchestrator is the
// cadence): implementer per task -> reviewer per task (spec + quality) -> a
// bounded fix loop -> the wave's integration gate -> the wave's commit block
// for the human. The whole-branch refutation runs when args.final is true.
// Like fanout-build/example.mjs this uses injected globals and top-level
// return, so it is not a standalone module; check-fanout and
// check-tier-placement validate it.

export const meta = {
  name: 'execute-plan',
  description: 'Execute one wave of a written plan: per-task implementer and reviewer, bounded fix loop, integration gate, commit emission, whole-branch refutation on the last wave.',
  phases: [{ title: 'Build' }, { title: 'Review' }, { title: 'Integrate' }, { title: 'Verify' }],
}

// args can arrive JSON-encoded as a string (live failure, run 4 2026-07-22).
const A = (typeof args === 'string' ? JSON.parse(args) : args) || {};
const TIERS = A.tiers || {};
if (!TIERS.build || !TIERS.mid || !TIERS.judgment) {
  log('halt: args.tiers incomplete - read tiers from config/models.json and pass them via args');
  return { halted: true, reason: 'tiers missing from args; refusing to run unpinned' };
}
const PLAN = A.plan;
if (!PLAN || !Array.isArray(PLAN.waves) || !Array.isArray(PLAN.tasks)) {
  return { halted: true, reason: 'args.plan missing - run scripts/plan-waves.mjs on the plan and pass its output' };
}
if (!A.base || !A.gate || !A.plan_slug || !A.scratch) {
  return { halted: true, reason: 'args.base, args.gate, args.plan_slug and args.scratch are required' };
}

const byN = new Map(PLAN.tasks.map((t) => [t.n, t]));
const allFiles = (t) => [...t.files.create, ...t.files.modify, ...t.files.test];
const completed = new Set(A.completed || []);
let waveIdx = typeof A.wave === 'number' ? A.wave - 1 : PLAN.waves.findIndex((w) => w.some((n) => !completed.has(n)));
if (waveIdx < 0 || waveIdx >= PLAN.waves.length) return { halted: true, reason: 'no wave to run: every task is complete or args.wave is out of range' };
const tasks = PLAN.waves[waveIdx].filter((n) => !completed.has(n)).map((n) => byN.get(n)).filter(Boolean);
if (!tasks.length) return { halted: true, reason: 'wave ' + (waveIdx + 1) + ' has no incomplete tasks' };

// Stakes per task (judgment-dispatch rubric): medium by default; high when a
// task file matches the irreversibility markers, which routes its reviewer to
// the judgment tier because check-dispatch fails a high-stakes vote below it.
const HIGH = new RegExp(A.high_stakes_pattern || 'migrat|deploy|release|helm|terraform|kube|workflows', 'i');
const stakesFor = (t) => (allFiles(t).some((f) => HIGH.test(f)) ? 'high' : 'medium');
const FIX_ROUNDS = 2;

// Worker receipt (ADR-0006 res 3): every worker reports which model answered.
const RECEIPT = ' Report in the "model" field the bare model ID verbatim from your own system prompt.';

const OWNERS = tasks.map((t) => 'Task ' + t.n + ' owns ONLY: ' + allFiles(t).join(', ')).join('\n');
// The shared contract, prepended verbatim to every agent in this wave.
const CONTRACT = [
  'SHARED CONTRACT - execute-plan, wave ' + (waveIdx + 1) + ' of ' + PLAN.waves.length + ' (plan ' + A.plan_slug + ')',
  'Base commit for this wave: ' + A.base + '. Named gate: ' + A.gate + '.',
  'GLOBAL CONSTRAINTS (verbatim from the plan; every task implicitly includes them):',
  PLAN.constraints || '(none stated)',
  'FILE OWNERSHIP (disjoint; touch nothing else):',
  OWNERS,
  'INTERFACES this wave consumes and produces:',
  tasks.map((t) => 'Task ' + t.n + ' consumes: ' + (t.interfaces.consumes || '-') + ' | produces: ' + (t.interfaces.produces || '-')).join('\n'),
  'HARD RULES: never run a Commit step or any git write - the human runs the emitted commit block; never weaken or delete a test; write scratch only under ' + A.scratch + '/<label>/; keep stdout ASCII.',
].join('\n');

const IMPL_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['status', 'files_changed', 'tests', 'concerns', 'report_file', 'model'],
  properties: {
    status: { type: 'string', enum: ['DONE', 'DONE_WITH_CONCERNS', 'BLOCKED', 'NEEDS_CONTEXT'] },
    files_changed: { type: 'array', items: { type: 'string' } },
    tests: { type: 'object', additionalProperties: false, required: ['cmd', 'exit', 'tail'],
      properties: { cmd: { type: 'string' }, exit: { type: 'integer' }, tail: { type: 'string' } } },
    concerns: { type: 'string' },
    report_file: { type: 'string' },
    model: { type: 'string' },
  },
};
const REVIEW_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['spec', 'quality', 'cannot_verify', 'model'],
  properties: {
    spec: { type: 'object', additionalProperties: false, required: ['verdict', 'missing', 'extra'],
      properties: { verdict: { type: 'string', enum: ['PASS', 'FAIL'] }, missing: { type: 'array', items: { type: 'string' } }, extra: { type: 'array', items: { type: 'string' } } } },
    quality: { type: 'object', additionalProperties: false, required: ['verdict', 'issues'],
      properties: { verdict: { type: 'string', enum: ['APPROVED', 'ISSUES'] }, issues: { type: 'array', items: {
        type: 'object', additionalProperties: false, required: ['severity', 'location', 'finding'],
        properties: { severity: { type: 'string', enum: ['critical', 'important', 'minor'] }, location: { type: 'string' }, finding: { type: 'string' } } } } } },
    cannot_verify: { type: 'array', items: { type: 'string' } },
    model: { type: 'string' },
  },
};
const INTEG_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['green', 'commands', 'drift_fixed', 'model'],
  properties: {
    green: { type: 'boolean' }, drift_fixed: { type: 'string' }, model: { type: 'string' },
    commands: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['cmd', 'exitCode', 'tail'],
      properties: { cmd: { type: 'string' }, exitCode: { type: 'integer' }, tail: { type: 'string' } } } },
  },
};
const VERDICT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['claim', 'verdict', 'evidence', 'model'],
  properties: { claim: { type: 'string' }, verdict: { type: 'string', enum: ['true', 'refuted', 'unverifiable'] }, evidence: { type: 'string' }, model: { type: 'string' } },
};

const receipts = [];
const verdictRecords = [];
const receipt = (node, label, out, requested) => {
  if (out && out.model) receipts.push({ role: 'worker', node, label, verifier_model: { requested, answered: out.model } });
};

const implPrompt = (t, findings) =>
  'SHARED CONTRACT (code against this, NOT other tasks\' files):\n' + CONTRACT + '\n\n' +
  (findings
    ? 'You are the FIX agent for Task ' + t.n + ' (' + t.name + '). A reviewer returned these findings; fix every critical and important one, re-run the covering tests, and append a fix report to the report file:\n' + JSON.stringify(findings) + '\n\n'
    : 'You are the IMPLEMENTER for Task ' + t.n + ' (' + t.name + '). Read the task brief below first - it is your requirements, with exact values to use verbatim. Implement exactly what it specifies, test-first where it says so, run the focused tests while iterating and the full named gate once at the end. Skip every Commit step. Write your full report (what you built, tests run with output, TDD evidence, files changed, self-review, concerns) to ' + A.scratch + '/task-' + t.n + '/report.md and put that path in report_file. Use BLOCKED or NEEDS_CONTEXT rather than guessing; DONE_WITH_CONCERNS when finished but unsure.\n\n') +
  'TASK BRIEF:\n' + t.body + RECEIPT;

const reviewPrompt = (t, impl, stakes) =>
  'You are the TASK REVIEWER for Task ' + t.n + ' (' + t.name + '), stakes ' + stakes + '. Two verdicts: spec compliance (nothing missing, nothing extra) and code quality. ' +
  'Treat the implementer\'s report as UNVERIFIED claims - verify them against the diff: run `git diff --stat ' + A.base + '` and `git diff ' + A.base + ' -- <files_changed>` yourself (read-only; never run a git write). Do not re-run tests the implementer already ran - its report carries the test evidence; do inspect code outside the diff only for a concrete named risk. Put requirements you cannot judge from the diff in cannot_verify rather than guessing.\n\n' +
  'SHARED CONTRACT:\n' + CONTRACT + '\n\nTASK BRIEF:\n' + t.body + '\n\nIMPLEMENTER RESULT:\n' + JSON.stringify(impl) + RECEIPT;

phase('Build');
// pipeline, not a barrier: a task's review starts the moment its implementer returns.
const results = await pipeline(
  tasks,
  (t) => agent(implPrompt(t), { label: 'implement:task-' + t.n, phase: 'Build', schema: IMPL_SCHEMA, model: TIERS.build })
    .then((impl) => ({ task: t, impl })),
  async (r, t) => {
    if (!r || !r.impl) return { task: t, halted: 'implementer returned null' };
    receipt('execute-plan.implement', 'task-' + t.n, r.impl, TIERS.build);
    if (r.impl.status === 'BLOCKED' || r.impl.status === 'NEEDS_CONTEXT') {
      return { task: t, impl: r.impl, halted: r.impl.status + ': ' + r.impl.concerns };
    }
    const stakes = stakesFor(t);
    // High stakes earns the judgment tier (skeptic-verifier); medium runs skeptic-verifier-fast on the mid tier.
    const reviewerType = stakes === 'high' ? 'rigor:skeptic-verifier' : 'rigor:skeptic-verifier-fast';
    const tier = stakes === 'high' ? 'judgment' : 'mid';
    let impl = r.impl;
    let review = null;
    for (let round = 0; ; round++) {
      review = await agent(reviewPrompt(t, impl, stakes), {
        label: 'review:task-' + t.n + ':' + round, phase: 'Review', agentType: reviewerType, schema: REVIEW_SCHEMA, model: TIERS[tier],
      });
      if (!review) return { task: t, impl, halted: 'reviewer returned null' };
      verdictRecords.push({
        node: 'execute-plan.task-review', claim: 'task ' + t.n + ' round ' + round, dispatch_tier: tier,
        verifier_model: { requested: TIERS[tier], answered: review.model },
        inferred_stakes: stakes, rubric_criteria_hit: stakes === 'high' ? ['irreversibility', 'downstream-decisions'] : ['downstream-decisions'],
        downgraded: false, verdict: review.spec.verdict + '/' + review.quality.verdict,
      });
      const blocking = review.spec.verdict === 'FAIL' || review.quality.issues.some((i) => i.severity !== 'minor');
      if (!blocking) return { task: t, impl, review, rounds: round, minor: review.quality.issues, cannot_verify: review.cannot_verify };
      if (round >= FIX_ROUNDS) {
        // A task failing review three times is read as a plan defect, not an implementer defect.
        return { task: t, impl, review, rounds: round, halted: 'review still failing after ' + FIX_ROUNDS + ' fix rounds - plan defect?' };
      }
      const findings = { spec: review.spec, issues: review.quality.issues.filter((i) => i.severity !== 'minor') };
      impl = await agent(implPrompt(t, findings), { label: 'fix:task-' + t.n + ':' + (round + 1), phase: 'Build', schema: IMPL_SCHEMA, model: TIERS.build });
      if (!impl) return { task: t, halted: 'fix agent returned null' };
      receipt('execute-plan.fix', 'task-' + t.n + ':' + (round + 1), impl, TIERS.build);
    }
  }
);

const rows = results.filter(Boolean);
const halted = rows.filter((r) => r.halted);
if (halted.length || rows.length < tasks.length) {
  log('halt: ' + (halted.length || tasks.length - rows.length) + ' task(s) need the human - no integration on an incomplete wave');
  return { wave: waveIdx + 1, results: rows, halted: true, receipts, verdictRecords };
}

phase('Integrate');
const integ = await agent(
  'SHARED CONTRACT:\n' + CONTRACT + '\n\n' +
  'Run the named gate `' + A.gate + '` and iterate until it is genuinely green. Fix ONLY cross-file drift between this wave\'s tasks (they each owned only their files); never weaken, skip or delete a test; never run a git write. ' +
  'Also run `git status --short` and `git diff --stat ' + A.base + '` and include them so the touched-file set is evidence. Return the verbatim tail of every command.' + RECEIPT,
  { label: 'integrate:wave-' + (waveIdx + 1), phase: 'Integrate', agentType: 'rigor:integration-runner', schema: INTEG_SCHEMA, model: TIERS.mid }
);
receipt('execute-plan.integrate', 'wave-' + (waveIdx + 1), integ, TIERS.mid);
if (!integ || !integ.green) {
  log('halt: wave ' + (waveIdx + 1) + ' integration not green - no commit block emitted');
  return { wave: waveIdx + 1, results: rows, integ, halted: true, receipts, verdictRecords };
}

// The wave's commit block for the human: the plan's own Commit steps, lifted.
const commit_block = tasks.flatMap((t) => {
  const r = rows.find((x) => x.task.n === t.n);
  const paths = (r && r.impl && r.impl.files_changed) || allFiles(t);
  return t.commits.length
    ? [ 'git add ' + paths.join(' '), ...t.commits ]
    : [ 'git add ' + paths.join(' '), 'git commit -m "feat: task ' + t.n + ' - ' + t.name + '"' ];
});

let verdicts = [];
let claimTrue = true;
if (A.final) {
  phase('Verify');
  // Refute the CLAIM, not just the gate: the plan's Goal and every Produces interface.
  const claims = A.claims || PLAN.tasks.filter((t) => t.interfaces.produces && t.interfaces.produces !== 'nothing').map((t) => 'Task ' + t.n + ' produces ' + t.interfaces.produces);
  verdicts = (await parallel(claims.map((c) => () => agent(
    'Gate-green is not claim-true. REFUTE this claim by re-executing it: is it actually wired, reachable and exercised by a test that fails without it? Recompute from raw output; default to refuted unless proven. Read-only; never run a git write. Claim: ' + c + RECEIPT,
    { label: 'verify', phase: 'Verify', agentType: 'rigor:skeptic-verifier', schema: VERDICT_SCHEMA, model: TIERS.judgment }
  )))).filter(Boolean);
  for (const v of verdicts) {
    verdictRecords.push({ node: 'execute-plan.verify', claim: v.claim, dispatch_tier: 'judgment', verifier_model: { requested: TIERS.judgment, answered: v.model },
      inferred_stakes: 'high', rubric_criteria_hit: ['downstream-decisions', 'blast-radius'], downgraded: false, verdict: v.verdict });
  }
  const missing = claims.length - verdicts.length;
  if (missing) log('WARNING: ' + missing + ' skeptic vote(s) returned null - those claims are NOT verified');
  claimTrue = missing === 0 && verdicts.every((v) => v.verdict === 'true');
}

return { wave: waveIdx + 1, results: rows, integ, commit_block, receipts, verdictRecords, verdicts, claimTrue: Boolean(integ.green) && claimTrue };
```

- [x] **Step 4: Run the gate pins and the two gates directly**

Run: `node --test tests/tier-placement.test.mjs tests/fanout-check.test.mjs`
Expected: all pass (the two new tests green).

Run: `node scripts/check-fanout.mjs skills/execute-plan/example.mjs; echo EXIT=$?`
Expected: `check-fanout: trustworthy-build scaffolding present (structure only).` / `EXIT=0`.

Run: `node scripts/check-tier-placement.mjs skills/execute-plan/example.mjs; echo EXIT=$?`
Expected: `check-tier-placement: every non-verify agent() call carries a tier pin (structure only).` / `EXIT=0`.

- [x] **Step 5: Commit**

```bash
git add skills/execute-plan/example.mjs tests/tier-placement.test.mjs tests/fanout-check.test.mjs
git commit -m "feat(execute-plan): one-wave workflow shape, gated"
```

---

### Task 4: Control-flow pins for the example (stubbed runtime)

**Files:**
- Create: `tests/execute-plan-example.test.mjs`
- Test: `tests/execute-plan-example.test.mjs`

**Interfaces:**
- Consumes: `skills/execute-plan/example.mjs` (Task 3) and its args/return shape; `FIXTURE`, `parsePlan`, `toArgs` from Tasks 1–2.
- Produces: nothing downstream; a regression pin.

- [x] **Step 1: Write the failing tests**

Create `tests/execute-plan-example.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parsePlan, toArgs } from '../scripts/plan-waves.mjs';
import { FIXTURE } from './plan-waves.test.mjs';

// The example uses injected runtime globals and top-level return; run its body
// as an async function with stubs, the way the 2026-08-22 dry-run learning
// prescribes, so control flow is pinned without a live fan-out.
const SRC = readFileSync(new URL('../skills/execute-plan/example.mjs', import.meta.url), 'utf8')
  .replace(/^export const meta/m, 'const meta');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const TIERS = { build: 'b-model', mid: 'm-model', judgment: 'j-model' };

function run(args, behaviour = {}) {
  const calls = [];
  const okImpl = { status: 'DONE', files_changed: ['src/a.js'], tests: { cmd: 't', exit: 0, tail: 'ok' }, concerns: '', report_file: 'r.md', model: 'b-model' };
  const okReview = { spec: { verdict: 'PASS', missing: [], extra: [] }, quality: { verdict: 'APPROVED', issues: [] }, cannot_verify: [], model: 'm-model' };
  const agent = async (prompt, opts) => {
    calls.push({ label: opts.label, model: opts.model, agentType: opts.agentType, prompt });
    const kind = opts.label.split(':')[0];
    if (behaviour[opts.label]) return behaviour[opts.label](prompt, opts);
    if (kind === 'implement' || kind === 'fix') return okImpl;
    if (kind === 'review') return okReview;
    if (kind === 'integrate') return { green: true, commands: [], drift_fixed: 'none', model: 'm-model' };
    if (kind === 'verify') return { claim: 'c', verdict: 'true', evidence: 'e', model: 'j-model' };
    throw new Error('unexpected label ' + opts.label);
  };
  const parallel = async (thunks) => Promise.all(thunks.map((t) => t().catch(() => null)));
  const pipeline = async (items, ...stages) => Promise.all(items.map(async (it, i) => { let v = it; for (const s of stages) v = await s(v, it, i); return v; }));
  const logs = [];
  const fn = new AsyncFunction('args', 'agent', 'parallel', 'pipeline', 'phase', 'log', SRC);
  return fn(JSON.stringify(args), agent, parallel, pipeline, () => {}, (m) => logs.push(m)).then((out) => ({ out, calls, logs }));
}

const baseArgs = () => ({
  tiers: TIERS, plan: toArgs(parsePlan(FIXTURE)), base: 'abc1234', gate: 'node --test', plan_slug: 'widget', scratch: 'SCR',
});

test('halts unpinned: missing tiers or plan returns halted without dispatching', async () => {
  const a = await run({ plan: toArgs(parsePlan(FIXTURE)) });
  assert.equal(a.out.halted, true); assert.equal(a.calls.length, 0);
  const b = await run({ tiers: TIERS });
  assert.equal(b.out.halted, true); assert.equal(b.calls.length, 0);
});

test('runs the first incomplete wave: one implementer and one reviewer per task, one integrator, a commit block, no verify', async () => {
  const { out, calls } = await run(baseArgs());
  assert.equal(out.wave, 1);
  assert.deepEqual(out.results.map((r) => r.task.n), [1, 2, 4]);
  assert.equal(calls.filter((c) => c.label.startsWith('implement:')).length, 3);
  assert.equal(calls.filter((c) => c.label.startsWith('review:')).length, 3);
  assert.equal(calls.filter((c) => c.label.startsWith('integrate:')).length, 1);
  assert.equal(calls.filter((c) => c.label === 'verify').length, 0, 'verify only on the final wave');
  assert.ok(out.commit_block.includes('git commit -m "feat: add a"'), 'the plan\'s own commit step is lifted');
  assert.ok(out.commit_block.some((l) => /git commit -m "feat: task 4 - Independent helper"/.test(l)), 'a task with no commit step gets a default');
  assert.equal(out.halted, undefined);
});

test('every non-verify call is pinned to a tier from args; reviewers run the mid tier at medium stakes', async () => {
  const { calls } = await run(baseArgs());
  for (const c of calls) assert.ok(c.model, c.label + ' has a model');
  const review = calls.find((c) => c.label.startsWith('review:'));
  assert.equal(review.model, 'm-model');
  assert.equal(review.agentType, 'rigor:skeptic-verifier-fast');
  assert.equal(calls.find((c) => c.label.startsWith('implement:')).model, 'b-model');
  assert.equal(calls.find((c) => c.label.startsWith('integrate:')).model, 'm-model');
});

test('a task whose file matches the high-stakes pattern is reviewed on the judgment tier', async () => {
  const args = baseArgs();
  args.plan.tasks[0].files.create = ['db/migrations/001.sql'];
  const { calls, out } = await run(args);
  const review = calls.find((c) => c.label === 'review:task-1:0');
  assert.equal(review.model, 'j-model');
  assert.equal(review.agentType, 'rigor:skeptic-verifier');
  const rec = out.verdictRecords.find((r) => r.claim === 'task 1 round 0');
  assert.equal(rec.inferred_stakes, 'high');
  assert.equal(rec.dispatch_tier, 'judgment');
});

test('completed tasks are skipped; args.wave selects a wave; the final wave runs verify', async () => {
  const args = { ...baseArgs(), completed: [1, 2, 4], final: true };
  const { out, calls } = await run(args);
  assert.equal(out.wave, 2);
  assert.deepEqual(out.results.map((r) => r.task.n), [3, 5]);
  assert.ok(calls.filter((c) => c.label === 'verify').length >= 1);
  assert.equal(calls.find((c) => c.label === 'verify').model, 'j-model');
  assert.equal(out.claimTrue, true);
});

test('BLOCKED halts the wave after the other tasks finish and skips integration', async () => {
  const blocked = { status: 'BLOCKED', files_changed: [], tests: { cmd: '', exit: 1, tail: '' }, concerns: 'need the schema', report_file: '', model: 'b-model' };
  const { out, calls } = await run(baseArgs(), { 'implement:task-2': async () => blocked });
  assert.equal(out.halted, true);
  assert.match(out.results.find((r) => r.task.n === 2).halted, /BLOCKED: need the schema/);
  assert.equal(calls.filter((c) => c.label.startsWith('integrate:')).length, 0);
  assert.equal(out.commit_block, undefined);
});

test('a failing review dispatches a fix and a re-review; a third failure halts as a plan defect', async () => {
  const fail = { spec: { verdict: 'FAIL', missing: ['progress reporting'], extra: [] }, quality: { verdict: 'ISSUES', issues: [{ severity: 'important', location: 'src/a.js:3', finding: 'magic number' }] }, cannot_verify: [], model: 'm-model' };
  const always = { 'review:task-1:0': async () => fail, 'review:task-1:1': async () => fail, 'review:task-1:2': async () => fail };
  const { out, calls } = await run(baseArgs(), always);
  assert.equal(calls.filter((c) => c.label.startsWith('fix:task-1:')).length, 2, 'two fix rounds, no more');
  assert.equal(calls.filter((c) => c.label.startsWith('review:task-1:')).length, 3);
  assert.match(out.results.find((r) => r.task.n === 1).halted, /plan defect/);
  assert.equal(out.halted, true);
  // a fix that satisfies the reviewer on round 1 completes the task
  const once = { 'review:task-1:0': async () => fail };
  const ok = await run(baseArgs(), once);
  assert.equal(ok.out.results.find((r) => r.task.n === 1).rounds, 1);
  assert.equal(ok.out.halted, undefined);
});

test('minor issues never trigger a fix; they ride the row to the whole-branch skeptics', async () => {
  const minor = { spec: { verdict: 'PASS', missing: [], extra: [] }, quality: { verdict: 'ISSUES', issues: [{ severity: 'minor', location: 'src/a.js:9', finding: 'name' }] }, cannot_verify: ['perf budget'], model: 'm-model' };
  const { out, calls } = await run(baseArgs(), { 'review:task-1:0': async () => minor });
  assert.equal(calls.filter((c) => c.label.startsWith('fix:')).length, 0);
  const row = out.results.find((r) => r.task.n === 1);
  assert.equal(row.minor.length, 1);
  assert.deepEqual(row.cannot_verify, ['perf budget']);
});

test('a red integration gate halts without a commit block', async () => {
  const { out } = await run(baseArgs(), { 'integrate:wave-1': async () => ({ green: false, commands: [], drift_fixed: '', model: 'm-model' }) });
  assert.equal(out.halted, true);
  assert.equal(out.commit_block, undefined);
});

test('the contract prepended to every agent carries the constraints and the ownership map', async () => {
  const { calls } = await run(baseArgs());
  for (const c of calls.filter((x) => !x.label.startsWith('verify'))) {
    assert.match(c.prompt, /Node stdlib only\./, c.label);
    assert.match(c.prompt, /Task 1 owns ONLY: src\/a\.js, tests\/a\.test\.js/, c.label);
  }
});
```

- [x] **Step 2: Run the test to verify it fails or passes for the right reasons**

Run: `node --test tests/execute-plan-example.test.mjs`
Expected: with Task 3's script in place every test passes; if any fails, the failure names a control-flow defect in `example.mjs` — fix the script, not the test. (This task is red-first against the script's *absence*: run it before Task 3 lands and it fails on `ENOENT`.)

- [x] **Step 3: Run the whole suite**

Run: `node --test`
Expected: `pass 598 + 5 + 8 + 2 + 10 = 623`, `fail 0`.

- [x] **Step 4: Commit**

```bash
git add tests/execute-plan-example.test.mjs
git commit -m "test(execute-plan): pin the example's control flow with stubs"
```

---

### Task 5: The skill and the slash command

**Files:**
- Create: `skills/execute-plan/SKILL.md`
- Create: `commands/execute-plan.md`

**Interfaces:**
- Consumes: `scripts/plan-waves.mjs` CLI (Task 2), `skills/execute-plan/example.mjs` args/return (Task 3).
- Produces: the discipline other skills point at: `execute-plan` (skill name), `/rigor:execute-plan <plan-path>` (command).

- [x] **Step 1: Write the skill**

Create `skills/execute-plan/SKILL.md`:

````markdown
---
name: execute-plan
description: Use when a written implementation plan (writing-plans format - Task N headings with Files and Interfaces blocks) is to be executed by agents — runs it wave by wave under orchestrate's guardrails: fresh implementer per task, spec + quality review per task with a bounded fix loop, an integration gate and a commit block per wave, whole-branch refutation at the end, and a ledger that survives compaction.
status: provisional
---

# Execute plan

A plan is a batch of claims about what to build; executing it is a batch of
claims about what was built. This shape keeps both honest: every task is
reviewed against its own brief before the next wave starts, every wave ends on
the real named gate, and the finished branch is refuted, not merely green.
It is `orchestrate`'s third shape, for work that already has a plan —
`fanout-build` is for a build with no plan yet.

## The loop (one invocation per wave)

1. **Intake.** `node scripts/plan-waves.mjs <plan.md>` prints the args:
   Global Constraints verbatim, each task's brief, Files, Interfaces and
   lifted Commit steps, and the waves. Exit 2 means the plan is not
   executable as written (no tasks, a task without Files, a placeholder
   path) — fix the plan; never guess a path. Waves come from the Files lists
   only: two tasks naming one file never share a wave. That is stricter than
   an import-aware derivation, never looser.
2. **Read the ledger.** `$(git rev-parse --git-path rigor)/execute/<plan-slug>.progress.jsonl`,
   one row per completed task. Tasks listed there are DONE — pass them as
   `completed` and never re-dispatch them; after a compaction, trust the
   ledger and `git log` over your own recollection.
3. **Dispatch one wave** through the Workflow tool with `example.mjs`
   (beside this file): tiers from `config/models.json`, `base` = the current
   HEAD, `gate` = the plan's test command (else the repo's merge floor),
   `final` = true on the last wave. Lint the script with `check-fanout` and
   `check-tier-placement` first; dry-run it with stubbed globals if you
   changed it.
4. **Per task, inside the run:** an implementer (build tier, fresh context,
   the brief as its requirements, Commit steps skipped) → a reviewer with two
   verdicts, spec compliance and code quality, told to treat the
   implementer's report as unverified and to verify it against the diff →
   at most **two** fix rounds. A third failing review halts the wave: a task
   that cannot pass its own brief three times is a plan defect, and the
   plan is the human's to amend. `BLOCKED` and `NEEDS_CONTEXT` halt the
   wave the same way, with the implementer's specifics in the result.
5. **Stakes route the reviewer.** Medium by default (`skeptic-verifier-fast`,
   mid tier). High when a task's files match the irreversibility markers —
   default pattern `migrat|deploy|release|helm|terraform|kube|workflows`,
   overridable via `high_stakes_pattern` — which routes the review to
   `skeptic-verifier` on the judgment tier, because `check-dispatch` fails
   closed on a high-stakes vote below it. Every review is a verdict record;
   every worker leaves a receipt.
6. **Integrate the wave.** `integration-runner` runs the named gate and
   returns verbatim tails; it fixes only cross-file drift between this
   wave's tasks and never weakens a test. Red halts.
7. **Emit the commit block.** Green ⇒ the run returns the wave's commit
   commands — the plan's own Commit steps, lifted — for the human to run.
   Agents never write history. Append one ledger row per task (`task`,
   `wave`, `status`, `review_rounds`, `minor_issues`, `commit_cmds`, `ts`),
   append the verdict records and receipts to
   `<plan-dir>/<plan-slug>.verdicts.jsonl`, and run
   `node scripts/check-dispatch.mjs <that log> config/models.json`. Then
   re-run the named gate yourself (`orchestrate` guardrail 8).
8. **Next wave** once the human has committed: new `base`, same ledger.
   On the last wave the run also refutes the plan's load-bearing claims
   (the Goal, each `Produces` interface) with judgment-tier skeptics;
   `claimTrue` needs a green gate and zero refuted or missing votes.

## What the reviewer reads

The task brief, the implementer's structured result (status, files changed,
the test command with its exit and tail, concerns, the report file), and the
diff against `base`. The implementer's test tail is evidence the reviewer
reads, not a claim it re-runs — the integration step and the orchestrator
re-run the gate. Minor issues are recorded on the task's row, never fixed
inline, and handed to the whole-branch skeptics. `cannot_verify` items are
the orchestrator's to resolve before marking the task complete.

## Halts are outcomes

A halted wave is a recorded result, not a failure of the shape: the return
names the task and the reason. Resume with `resumeFromRunId` after the human
answers; completed agents replay from cache. Never re-dispatch a task the
ledger marks complete.

## Honest limits

- Waves ignore imports; a plan whose tasks share files only through imports
  runs more sequentially than a hand derivation would.
- Per-task review is one reviewer at the mid tier for medium stakes — cheaper
  than a judgment-tier skeptic and unproven against it.
- Zero domains until a real plan runs through this shape (STATUS).
````

- [x] **Step 2: Write the command**

Create `commands/execute-plan.md`:

```markdown
---
description: Execute a written implementation plan wave by wave — fresh implementer and spec/quality reviewer per task, bounded fix loop, integration gate and commit block per wave, whole-branch refutation on the last wave, ledger that survives compaction. Agents never write history.
status: provisional
---

Invoke the `execute-plan` skill on the plan at the path below. Run
`scripts/plan-waves.mjs` on it first and refuse to proceed on exit 2; read
the progress ledger before dispatching; dispatch one wave per Workflow run
with tiers from `config/models.json`; halt the wave to me on `BLOCKED`,
`NEEDS_CONTEXT`, a third failing review, or a red gate; emit each wave's
commit block for me to run and wait for the new HEAD before the next wave;
refute the plan's claims on the last wave. Re-run the named gate yourself
after every wave — the workflow's green is a claim.

$ARGUMENTS
```

- [x] **Step 3: Run the surface gates**

Run: `node scripts/check-surface-scrub.mjs; echo EXIT=$?`
Expected: `surface-scrub: clean` / `EXIT=0` (the new skill and command are under the scanned roots).

Run: `node --test`
Expected: `pass 623 / fail 0` (no test counts skills or commands).

- [x] **Step 4: Commit**

```bash
git add skills/execute-plan/SKILL.md commands/execute-plan.md
git commit -m "feat(execute-plan): skill and slash command"
```

---

### Task 6: Wire the shape into orchestrate and the current-state docs

**Files:**
- Modify: `skills/orchestrate/SKILL.md:51-57`
- Modify: `AGENTS.md:11-45`
- Modify: `docs/STATUS.md:22-27` and `docs/STATUS.md:65`
- Modify: `README.md:80-84`
- Modify: `docs/SYSTEM.md:63`
- Modify: `docs/DEVELOPMENT.md:28`
- Modify: `docs/README.md:47-50`
- Modify: `docs/comparisons/2026-07-03-plugin-landscape-scorecard.md` (the 2026-09-15 addendum's "What the move gives up" paragraph)

**Interfaces:**
- Consumes: the names `execute-plan`, `/rigor:execute-plan`, `scripts/plan-waves.mjs` (Tasks 2 and 5).
- Produces: nothing; counts become 21 skills / 10 commands / 12 gates + 3 utilities.

- [x] **Step 1: Add the shape to orchestrate**

In `skills/orchestrate/SKILL.md`, under `## The shapes`, after the `fanout-build` bullet add:

```markdown
- `execute-plan` — a written plan, wave by wave: implementer + spec/quality
  reviewer per task, bounded fix loop, integration gate and commit block per
  wave, whole-branch refutation on the last wave. This is the shape that takes
  over from a per-task subagent loop when a plan already exists.
```

- [x] **Step 2: Update AGENTS.md**

Line 11: `- \`skills/\` — 21 discipline skills` and in the list after `orchestrate,` insert `execute-plan,`. Line 21: `- \`commands/\` — 10 slash commands (\`/rigor:verify-claim\`, \`honesty-check\`, \`recon\`, \`fanout\`, \`execute-plan\`, \`verify-effect\`, ...`. Lines 44–45: `plus \`extract-tails.mjs\`, \`index-sessions.mjs\` and \`plan-waves.mjs\`, non-gate utilities ...` (plan-waves' output is the args for a run, not a record).

- [x] **Step 3: Update STATUS.md**

Claim-ceiling line: `**10** commands / **21** skills / 5 agents / **3** hooks / **12** check gates` and the test count to the measured `node --test` total (623 if every task added exactly what this plan says — re-measure, never copy). Row 65: `all 10 commands`. Add a row directly above the `git-guard` row:

```markdown
| `execute-plan` + `plan-waves` | skill + command + workflow example + utility | **provisional — built 2026-09-15, fixture-tested, 0 domains.** Gives `orchestrate` the plan-execution function that superpowers' `subagent-driven-development` performed before the 2026-09-14 routing change: implementer and two-verdict reviewer per task, ≤2 fix rounds, integration gate + commit block per wave, judgment-tier refutation on the last wave, `.git`-side ledger. Unproven until a real plan runs through it: that a mid-tier per-task review catches what a per-task subagent reviewer catches, that two fix rounds suffice, and the cost per task (no same-plan comparison exists) |
```

- [x] **Step 4: Fix the stale counts in README.md and SYSTEM.md**

`README.md:80`: `20 skills, 8 commands, and 5 agents` → `21 skills, 10 commands, and 5 agents`; line 84: `Six of the twenty skills` → `Six of the twenty-one skills`. `docs/SYSTEM.md:63`: `the 20 skills, 8 commands, and 5 agents` → `the 21 skills, 10 commands, and 5 agents`. (Both said 8 against 9 shipped since 2026-08-22 — drift folded in here.)

- [x] **Step 5: Update DEVELOPMENT.md, docs/README.md, and the scorecard addendum**

`docs/DEVELOPMENT.md:28`: after the `extract-tails.mjs` sentence add: `` `plan-waves.mjs` turns a writing-plans plan into execute-plan args and derives waves from its Files lists (exit 2 on a placeholder path). ``

`docs/README.md:47-48` (the comparisons bullet) leave as is; in the `docs/README.md` line that lists `specs/` add nothing — `docs/specs/2026-09-15-execute-plan-design.md` is discoverable by listing.

In the scorecard's 2026-09-15 addendum, at the end of the "**What the move gives up.**" paragraph append: `*(Later the same day: the `execute-plan` shape adds plan intake, per-task review with a bounded fix loop, and a durable ledger — spec `../specs/2026-09-15-execute-plan-design.md`; zero domains at write time.)*`

- [x] **Step 6: Run every gate**

Run: `node --test; node scripts/check-surface-scrub.mjs; node scripts/check-fanout.mjs skills/execute-plan/example.mjs; node scripts/check-tier-placement.mjs skills/execute-plan/example.mjs; node scripts/check-learnings.mjs docs/learnings`
Expected: suite green at the measured count, scrub clean, both example gates exit 0, learnings clean (unchanged).

Run: `grep -rn "20 skills\|8 commands\|9 commands" README.md AGENTS.md docs/*.md`
Expected: no output.

- [x] **Step 7: Commit**

```bash
git add skills/orchestrate/SKILL.md AGENTS.md docs/STATUS.md README.md docs/SYSTEM.md docs/DEVELOPMENT.md docs/comparisons/2026-07-03-plugin-landscape-scorecard.md
git commit -m "docs: wire execute-plan into orchestrate; counts 21/10"
```

---

## Deviations recorded at execution (2026-09-15, inline by the orchestrator)

- **Task 1/4:** the fixture moved to `tests/plan-fixture.mjs` (not a `.test.`
  file, so `node --test` does not run it). Importing `FIXTURE` from the
  plan-waves test file re-registered its 16 tests under the example test —
  the first full run reported 642 for that reason; the real total is **626**
  (598 + 16 + 10 + 2), not the 623 predicted above.
- **Task 2 smoke check found two parser defects** before anything shipped, both
  pinned red-first in `tests/plan-waves.test.mjs`: (1) `parsePlan` ignored
  fences at the top level, so the FIXTURE plan quoted inside Task 1's test
  code was read as five extra tasks; fences are now tracked by backtick count
  (a ```` block may quote ``` lines). (2) `git commit` lines were lifted from
  any fence, so the fixture's ghost commits became Task 1's; commits are now
  lifted only from a fence under a `**Step N: Commit**` heading. `allFiles`
  also dedupes a path listed under both Create and Test.
- **One heredoc was refused by `git-guard`** because its body contained
  `git commit` lines (the hook matches heredoc bodies); the test snippets were
  written to scratch files and appended with `cat`.
- The plan's own waves are `[[1,3,4,5,6],[2]]`, as corrected in Task 2 step 5.

## Self-review (run 2026-09-15 at write time)

- **Spec coverage:** intake + placeholder refusal (T1–T2), waves from Files (T2), implementer with statuses (T3), two-verdict reviewer + stakes routing + fix cap (T3, pinned T4), per-wave gate + commit emission (T3), whole-branch refutation on the last wave (T3), ledger and resume rule (T5, skill), one wave per invocation (T3), gates on the example (T3), docs and count drift (T6). No spec requirement without a task.
- **Placeholder scan:** none; every code step carries the code, every run step its expected output. The one intentionally derived value is the final test count in T3–T6 ("re-measure, never copy").
- **Type consistency:** `allFiles`, `parsePlan`, `validatePlan`, `deriveWaves`, `toArgs` names match across T1, T2, T4; the example's `results[].task.n`, `commit_block`, `halted`, `verdictRecords`, `receipts` match T4's assertions; `IMPL_SCHEMA` fields match T4's stubs.
