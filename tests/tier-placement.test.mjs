import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeTierPlacement } from '../scripts/check-tier-placement.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const CONFIG = JSON.parse(readFileSync(resolve(here, '../config/models.json'), 'utf8'));

test('an unpinned build-stage agent() call is flagged as tier-collapse risk', () => {
  const src = `phase('Build'); await parallel([() => agent('build the file', { label: 'build:a', schema: S })]);`;
  const warnings = analyzeTierPlacement(src, CONFIG);
  assert.ok(warnings.some((w) => /tier pin/.test(w) && /SESSION model/.test(w)));
});

test('a call pinned via model: (config-sourced expression) is clean', () => {
  const src = `const T = args.tiers; phase('Build'); await parallel([() => agent('t', { model: T.build, schema: S })]);`;
  assert.deepEqual(analyzeTierPlacement(src, CONFIG), []);
});

test('agentType naming a config tier agent counts as a pin, plugin prefix stripped', () => {
  const src = `phase('Integrate'); await agent('gate', { agentType: 'rigor:integration-runner', schema: S });`;
  assert.deepEqual(analyzeTierPlacement(src, CONFIG), []);
});

test('agentType alone is NOT a pin when the agent is not tier-mapped (tic durability regression 2026-07-18)', () => {
  // In the tic build, agentType-typed calls still answered on the session model
  // because the named agents' frontmatter said `model: inherit`.
  const src = `phase('Build'); await agent('t', { agentType: 'my-custom-builder', schema: S });`;
  const warnings = analyzeTierPlacement(src, CONFIG);
  assert.ok(warnings.some((w) => /agentType/.test(w) && /frontmatter/.test(w)));
});

test('with no config at all, an agentType pin fails closed to a warning', () => {
  const src = `phase('Build'); await agent('t', { agentType: 'integration-runner', schema: S });`;
  const warnings = analyzeTierPlacement(src, undefined);
  assert.ok(warnings.some((w) => /agentType/.test(w)));
});

test('verify-shaped stages are exempt from the unpinned warning (judgment-dispatch owns verifiers)', () => {
  const src = `phase('Verify'); await parallel([() => agent('refute the claim', { schema: V })]);`;
  assert.deepEqual(analyzeTierPlacement(src, CONFIG), []);
});

test('a per-call phase: option marks the call verify-shaped even without a phase() call', () => {
  const src = `await agent('refute it', { phase: 'Verify', schema: V });`;
  assert.deepEqual(analyzeTierPlacement(src, CONFIG), []);
});

test('a hardcoded model literal is flagged: tiers come from config via args', () => {
  const src = `phase('Build'); await agent('t', { model: 'claude-sonnet-5', schema: S });`;
  const warnings = analyzeTierPlacement(src, CONFIG);
  assert.ok(warnings.some((w) => /hardcoded model literal/.test(w)));
  assert.ok(!warnings.some((w) => /SESSION model/.test(w)), 'a hardcoded pin is still a pin');
});

test('parens inside prompt strings do not derail call-site extraction', () => {
  const src = `phase('Build'); await agent('build f(x) (see spec (v2))', { label: 'b', schema: S });`;
  const warnings = analyzeTierPlacement(src, CONFIG);
  assert.equal(warnings.length, 1);
  assert.ok(/tier pin/.test(warnings[0]));
});

test('agent() mentioned in comments is not a call site', () => {
  const src = `// an unpinned agent() call inherits the session model\n/* agent('x') */\nconst y = 1;`;
  assert.deepEqual(analyzeTierPlacement(src, CONFIG), []);
});

test('a script with no agent() calls yields no warnings', () => {
  assert.deepEqual(analyzeTierPlacement(`const x = 1; log('hi');`, CONFIG), []);
});

test('the unpinned warning names the call label when one is present', () => {
  const src = `phase('Build'); await agent('t', { label: 'build:server.go', schema: S });`;
  const warnings = analyzeTierPlacement(src, CONFIG);
  assert.ok(warnings.some((w) => /build:server\.go/.test(w)));
});

test('the shipped fanout-build example passes the gate (resolution 2 compliance)', () => {
  const example = readFileSync(resolve(here, '../skills/fanout-build/example.mjs'), 'utf8');
  assert.deepEqual(analyzeTierPlacement(example, CONFIG), []);
});
