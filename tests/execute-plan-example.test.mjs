import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parsePlan, toArgs } from '../scripts/plan-waves.mjs';
import { FIXTURE } from './plan-fixture.mjs';

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
    if (kind === 'integrate') return { green: true, commands: [{ cmd: 'node --test', exitCode: 0, tail: 'pass 1' }], drift_fixed: 'none', model: 'm-model' };
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

test('completed tasks are skipped; the final wave runs verify', async () => {
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

// 2026-09-22: three acceptance gaps found by a cross-model review (Codex,
// gpt-6-astra) with simulated agent responses. Each twin below was red first.
test('green is derived from the recorded gate run, not the integrator\'s flag: exit 1 with green: true halts', async () => {
  const lie = { green: true, commands: [{ cmd: 'node --test', exitCode: 1, tail: 'fail 1' }], drift_fixed: 'none', model: 'm-model' };
  const { out } = await run(baseArgs(), { 'integrate:wave-1': async () => lie });
  assert.equal(out.halted, true);
  assert.equal(out.commit_block, undefined);
  // no recorded run of the named gate at all is not green either
  const none = { green: true, commands: [{ cmd: 'git status --short', exitCode: 0, tail: '' }], drift_fixed: 'none', model: 'm-model' };
  const b = await run(baseArgs(), { 'integrate:wave-1': async () => none });
  assert.equal(b.out.halted, true);
  // an honest iteration log (red, then green on the last run of the gate) stays green
  const iter = { green: true, commands: [{ cmd: 'node --test', exitCode: 1, tail: 'fail 1' }, { cmd: 'node --test', exitCode: 0, tail: 'pass 9' }], drift_fixed: 'renamed export', model: 'm-model' };
  const c = await run(baseArgs(), { 'integrate:wave-1': async () => iter });
  assert.equal(c.out.halted, undefined);
  assert.ok(c.out.commit_block);
});

test('a fix agent returning BLOCKED halts the task; the reviewer never sees it', async () => {
  const fail = { spec: { verdict: 'FAIL', missing: ['x'], extra: [] }, quality: { verdict: 'APPROVED', issues: [] }, cannot_verify: [], model: 'm-model' };
  const blocked = { status: 'BLOCKED', files_changed: [], tests: { cmd: '', exit: 1, tail: '' }, concerns: 'schema missing', report_file: '', model: 'b-model' };
  const { out, calls } = await run(baseArgs(), { 'review:task-1:0': async () => fail, 'fix:task-1:1': async () => blocked });
  assert.match(out.results.find((r) => r.task.n === 1).halted, /BLOCKED: schema missing/);
  assert.equal(calls.filter((c) => c.label === 'review:task-1:1').length, 0);
  assert.equal(out.halted, true);
  assert.equal(out.commit_block, undefined);
});

test('a final wave that derives zero claims is unevaluable, never claimTrue', async () => {
  const args = { ...baseArgs(), completed: [1, 2, 4], final: true };
  for (const t of args.plan.tasks) t.interfaces.produces = 'nothing';
  const { out, calls, logs } = await run(args);
  assert.equal(calls.filter((c) => c.label === 'verify').length, 0);
  assert.equal(out.claimTrue, false);
  assert.ok(logs.some((l) => /zero claims/.test(l)), 'the reason is logged');
});

test('the contract prepended to every agent carries the constraints and the ownership map', async () => {
  const { calls } = await run(baseArgs());
  for (const c of calls.filter((x) => !x.label.startsWith('verify'))) {
    assert.match(c.prompt, /Node stdlib only\./, c.label);
    assert.match(c.prompt, /Task 1 owns ONLY: src\/a\.js, tests\/a\.test\.js/, c.label);
  }
});
