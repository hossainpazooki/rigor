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

test('the shipped execute-plan example passes the gate (every non-verify call pinned)', () => {
  const example = readFileSync(resolve(here, '../skills/execute-plan/example.mjs'), 'utf8');
  assert.deepEqual(analyzeTierPlacement(example, CONFIG), []);
});

// ---------------------------------------------------------------------------
// One hop of indirection: a pin forwarded through orchestrate guardrail 10's
// stall-retry wrapper. Minimized from the real artifact - wf-datum-coalesce-r1.mjs
// in session cc40b6d1 - where the gate raised 8 silent-collapse warnings across
// three domain repos while the run receipts showed zero collapse.
// ---------------------------------------------------------------------------

test('a pin forwarded through the stall-retry wrapper is seen (harvest cc40b6d1)', () => {
  const src = `
const BUILD = args.build, MID = args.mid;
async function run(prompt, opts) {
  let r = await agent(prompt, opts)
  if (r == null) {
    r = await agent(prompt, Object.assign({}, opts, { label: opts.label + ':retry' }))
  }
  return r
}
phase('Build');
const results = await pipeline(ITEMS, (item) => item.kind === 'build'
  ? run(DATUM_BUILD, { label: 'build-datum', phase: 'Build', model: BUILD, schema: S })
  : run(CONTRACT, { label: 'recon', phase: 'Recon', model: MID, schema: S }));
`;
  assert.deepEqual(analyzeTierPlacement(src, CONFIG), []);
});

test('the agentType fallback variant of the wrapper resolves through its callers', () => {
  const src = `
async function run(prompt, opts, fallback) {
  let r = await agent(prompt, opts)
  if (r == null) r = await agent(prompt, Object.assign({}, opts, { agentType: fallback, label: opts.label + ':fallback' }))
  return r
}
phase('Integrate');
await run('check', { label: 'v', agentType: 'rigor:integration-runner', schema: S }, 'rigor:skeptic-verifier');
`;
  assert.deepEqual(analyzeTierPlacement(src, CONFIG), []);
});

// The two-sided leg: a boundary fix must be tested on the forms a LOOSER boundary
// would wrongly admit, not only on the form the old rule wrongly refused.

test('a wrapper whose callers do not pin is still flagged (looser-boundary guard)', () => {
  const src = `
async function run(prompt, opts) { return await agent(prompt, opts) }
phase('Build');
await run('build it', { label: 'build:a', schema: S });
`;
  const warnings = analyzeTierPlacement(src, CONFIG);
  assert.ok(warnings.some((w) => /tier pin/.test(w)), 'an unpinned caller must still collapse-warn');
});

test('a wrapper is pinned only when EVERY caller pins (one unpinned caller is enough)', () => {
  const src = `
const BUILD = args.build;
async function run(prompt, opts) { return await agent(prompt, opts) }
phase('Build');
await run('a', { label: 'a', model: BUILD, schema: S });
await run('b', { label: 'b', schema: S });
`;
  assert.ok(analyzeTierPlacement(src, CONFIG).some((w) => /tier pin/.test(w)));
});

test('a forwarded opts with no resolvable caller fails closed to a warning', () => {
  const src = `export async function run(prompt, opts) { return await agent(prompt, opts) }`;
  assert.ok(analyzeTierPlacement(src, CONFIG).some((w) => /tier pin/.test(w)));
});

test('a caller that hardcodes a model literal is still flagged through the wrapper', () => {
  const src = `
async function run(prompt, opts) { return await agent(prompt, opts) }
phase('Build');
await run('a', { label: 'a', model: 'claude-opus-5', schema: S });
`;
  assert.ok(analyzeTierPlacement(src, CONFIG).some((w) => /hardcoded model literal/.test(w)));
});
