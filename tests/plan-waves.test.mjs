import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePlan, validatePlan, allFiles } from '../scripts/plan-waves.mjs';

import { FIXTURE } from './plan-fixture.mjs';

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

// Found by the smoke check on the plan that built this utility: a task step
// quoting another plan inside a fenced block was parsed as real tasks.
test('headings inside fenced code blocks are never tasks or constraints', () => {
  const nested = [
    '## Global Constraints', '', '- Real constraint.', '', '---', '',
    '### Task 1: Real', '', '**Files:**', '- Create: `src/real.js`', '',
    '- [ ] **Step 1: Write the fixture**', '', '```js',
    'const FIXTURE = `', '## Global Constraints', '', '- Ghost constraint.', '',
    '### Task 9: Ghost', '', '**Files:**', '- Create: `src/ghost.js`', '`;', '```', '',
    '- [ ] **Step 2: Commit**', '', '````markdown', 'text', '```bash', 'git commit -m "inner"', '```', 'more', '````', '',
  ].join('\n');
  const p = parsePlan(nested);
  assert.deepEqual(p.tasks.map((t) => t.n), [1]);
  assert.deepEqual(p.tasks[0].files.create, ['src/real.js']);
  assert.equal(p.constraints, '- Real constraint.');
  assert.deepEqual(p.tasks[0].commits, ['git commit -m "inner"'], 'a fence nested inside a longer fence is still scanned for commit lines');
});

test('allFiles dedupes a path listed under both Create and Test', () => {
  const t = { files: { create: ['tests/x.test.mjs'], modify: [], test: ['tests/x.test.mjs'] } };
  assert.deepEqual(allFiles(t), ['tests/x.test.mjs']);
});

// Same smoke check: a commit line quoted in a non-Commit step (the fixture
// inside a test file) was lifted as if it were the task's own commit.
test('commit lines are lifted only from a Commit step\'s fence', () => {
  const plan = [
    '### Task 1: X', '', '**Files:**', '- Create: `src/x.js`', '',
    '- [ ] **Step 1: Write the test**', '', '```js', 'const FIXTURE = `', '- [ ] **Step 2: Commit**', '',
    '\\`\\`\\`bash', 'git commit -m "ghost"', '\\`\\`\\`', '`;', '```', '',
    '- [ ] **Step 2: Commit**', '', '```bash', 'git add src/x.js', 'git commit -m "feat: x"', '```', '',
  ].join('\n');
  assert.deepEqual(parsePlan(plan).tasks[0].commits, ['git commit -m "feat: x"'],
    'a commit line, or a Commit heading, quoted inside another step\'s fence is text');
});
