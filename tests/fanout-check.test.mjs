import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeFanout, isFanoutScript } from '../scripts/check-fanout.mjs';

const GATE = fileURLToPath(new URL('../scripts/check-fanout.mjs', import.meta.url));

function runGate(args, { write } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'fanout-'));
  let target = args;
  if (write !== undefined) {
    target = join(dir, 'script.mjs');
    writeFileSync(target, write);
  }
  try {
    const out = execFileSync(process.execPath, [GATE, target], { encoding: 'utf8' });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}

const GOOD = `
const CONTRACT = 'exact types + file->owner map';
phase('Build');
await parallel([() => agent(CONTRACT + ' task', { schema: S, label: 'build:a' })]);
phase('Integrate');
await agent('run the gate', { agentType: 'integration-runner', schema: S });
phase('Verify');
await parallel([() => agent('refute the claim', { agentType: 'skeptic-verifier', schema: V })]);
`;

test('a complete fan-out script yields no warnings', () => {
  assert.deepEqual(analyzeFanout(GOOD), []);
});
test('a non-fan-out script is ignored (no parallel/pipeline)', () => {
  assert.deepEqual(analyzeFanout('const x = 1; await agent("hi", { schema: S });'), []);
});
test('flags a fan-out with no adversarial verify phase', () => {
  const src = `const CONTRACT='c'; phase('Build'); await parallel([()=>agent(CONTRACT,{schema:S})]); await agent('gate',{agentType:'integration-runner',schema:S});`;
  assert.ok(analyzeFanout(src).some((w) => /adversarial verify/.test(w)));
});
test('flags a fan-out with no integration step', () => {
  const src = `const CONTRACT='c'; phase('Build'); await parallel([()=>agent(CONTRACT,{schema:S,agentType:'skeptic-verifier'})]);`;
  assert.ok(analyzeFanout(src).some((w) => /integration/.test(w)));
});
test('flags agents without output schemas', () => {
  const src = `const CONTRACT='c'; await parallel([()=>agent('t')]); agent('g',{agentType:'integration-runner'}); agent('r',{agentType:'skeptic-verifier'});`;
  assert.ok(analyzeFanout(src).some((w) => /without schemas/.test(w)));
});
test('flags a fan-out with no shared contract constant', () => {
  const src = `phase('Build'); await parallel([()=>agent('t',{schema:S})]); agent('g',{agentType:'integration-runner',schema:S}); agent('r',{agentType:'skeptic-verifier',schema:V});`;
  assert.ok(analyzeFanout(src).some((w) => /shared contract/.test(w)));
});

// --- Three-outcome CLI, 2026-09-01. Misfire being closed: the old CLI printed
// "trustworthy-build scaffolding present" and exited 0 for ANY file without
// parallel(/pipeline( - an empty file, a prose doc, and a mistyped path that
// happened to name a real non-script file all read as a clean lint (learnings
// entry 2026-08-22-check-fanout-reports-not-applicable-as-passed). ---

test('isFanoutScript separates applicability from cleanliness', () => {
  assert.equal(isFanoutScript(GOOD), true);
  assert.equal(isFanoutScript('# a README, not a workflow'), false);
  assert.equal(isFanoutScript(''), false);
});

test('CLI exit 0 with the scaffolding message only for a real, clean fan-out', () => {
  const r = runGate(null, { write: GOOD });
  assert.equal(r.code, 0);
  assert.match(r.out, /scaffolding present/);
});

test('CLI exit 1 on a fan-out with structural warnings', () => {
  const r = runGate(null, { write: `await parallel([()=>agent('t')]);` });
  assert.equal(r.code, 1);
});

test('RED TWIN: a prose file is NOT APPLICABLE (exit 2), never a clean lint', () => {
  const r = runGate(null, { write: '# rigor\n\nA README with the word workflow in it.\n' });
  assert.equal(r.code, 2, 'the old CLI exited 0 here');
  assert.match(r.out, /NOT APPLICABLE/);
  assert.doesNotMatch(r.out, /scaffolding present/);
});

test('RED TWIN: an empty file is NOT APPLICABLE (exit 2)', () => {
  const r = runGate(null, { write: '' });
  assert.equal(r.code, 2);
});

test('RED TWIN: a missing file is UNEVALUABLE (exit 2), not a crash and not a pass', () => {
  const r = runGate(join(tmpdir(), 'no-such-dir-xyz', 'nope.mjs'));
  assert.equal(r.code, 2, 'a mistyped path must be distinguishable from a clean lint');
  assert.match(r.out, /UNEVALUABLE/);
});
