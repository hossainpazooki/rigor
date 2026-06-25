import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeFanout } from '../scripts/check-fanout.mjs';

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
