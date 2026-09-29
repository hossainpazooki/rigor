import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { proposeLock } from '../scripts/tier-lock.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(here, '../scripts/tier-lock.mjs');
const META = { date: '2026-10-01', run: 'wf_new' };
const PREV = {
  sonnet: { resolved: 'claude-sonnet-5', since: '2026-09-29', run: 'wf_seed' },
  fable: { resolved: 'claude-fable-5-1', since: '2026-09-29', run: 'wf_seed' },
};
const receipt = (requested, answered, over = {}) => ({ role: 'worker', node: 'n', label: 'l', verifier_model: { requested, answered }, ...over });

test('a first run creates an entry per family it saw', () => {
  const found = proposeLock([receipt('sonnet', 'claude-sonnet-5-5'), receipt('opus', 'claude-opus-5-5[1m]')], {}, META);
  assert.deepEqual(found.lock, {
    sonnet: { resolved: 'claude-sonnet-5-5', since: '2026-10-01', run: 'wf_new' },
    opus: { resolved: 'claude-opus-5-5', since: '2026-10-01', run: 'wf_new' },
  });
  assert.deepEqual(found.moved.map((m) => m.family).sort(), ['opus', 'sonnet']);
});

test('a newer version replaces the entry; an unchanged family keeps its since and run', () => {
  const found = proposeLock([receipt('sonnet', 'claude-sonnet-5-5'), receipt('fable', 'claude-fable-5-1')], PREV, META);
  assert.deepEqual(found.lock.sonnet, { resolved: 'claude-sonnet-5-5', since: '2026-10-01', run: 'wf_new' });
  assert.deepEqual(found.lock.fable, PREV.fable);
  assert.deepEqual(found.moved, [{ family: 'sonnet', from: 'claude-sonnet-5', to: 'claude-sonnet-5-5' }]);
});

test('a family the run did not dispatch keeps its entry', () => {
  const found = proposeLock([receipt('sonnet', 'claude-sonnet-5')], PREV, META);
  assert.deepEqual(found.lock, PREV);
  assert.deepEqual(found.moved, []);
});

test('seed: one family on two versions within a run is a conflict and changes nothing', () => {
  const found = proposeLock([receipt('sonnet', 'claude-sonnet-5'), receipt('sonnet', 'claude-sonnet-5-5')], PREV, META);
  assert.deepEqual(found.conflicts, [{ family: 'sonnet', ids: ['claude-sonnet-5', 'claude-sonnet-5-5'] }]);
  assert.deepEqual(found.lock, PREV);
});

test('seed: an older version than the lock never lowers it', () => {
  const found = proposeLock([receipt('fable', 'claude-fable-5')], PREV, META);
  assert.deepEqual(found.regressed, [{ family: 'fable', locked: 'claude-fable-5-1', answered: 'claude-fable-5' }]);
  assert.deepEqual(found.lock, PREV);
});

test('exact-id requests, logged downgrades, wrong-family and unreadable answers are not read', () => {
  const recs = [
    receipt('claude-sonnet-5', 'claude-sonnet-5'),
    receipt('sonnet', 'claude-sonnet-5-5', { downgraded: true }),
    receipt('fable', 'claude-opus-5-5'),
    receipt('opus', 'unknown'),
  ];
  const found = proposeLock(recs, PREV, META);
  assert.deepEqual(found.families, []);
  assert.deepEqual(found.lock, PREV);
});

// ---- CLI ----
const run = (records, { prev = PREV, extra = ['--date', '2026-10-01', '--run', 'wf_new'] } = {}) => {
  const dir = mkdtempSync(join(tmpdir(), 'tier-lock-'));
  const log = join(dir, 'verdicts.jsonl');
  const lk = join(dir, 'models.lock.json');
  writeFileSync(log, records.map((r) => JSON.stringify(r)).join('\n') + '\n');
  if (prev) writeFileSync(lk, JSON.stringify(prev));
  return spawnSync(process.execPath, [CLI, log, lk, ...extra], { encoding: 'utf8' });
};

test('CLI: prints the proposed lock as JSON on stdout and exits 0', () => {
  const r = run([receipt('sonnet', 'claude-sonnet-5-5')]);
  assert.equal(r.status, 0);
  assert.equal(JSON.parse(r.stdout).sonnet.resolved, 'claude-sonnet-5-5');
  assert.match(r.stderr, /tier-lock: sonnet claude-sonnet-5 -> claude-sonnet-5-5/);
});

test('CLI: a missing previous lock is a first run, not an error', () => {
  const r = run([receipt('opus', 'claude-opus-5-5')], { prev: null });
  assert.equal(r.status, 0);
  assert.deepEqual(Object.keys(JSON.parse(r.stdout)), ['opus']);
});

test('CLI seed: a conflict exits 2 and prints no lock', () => {
  const r = run([receipt('sonnet', 'claude-sonnet-5'), receipt('sonnet', 'claude-sonnet-5-5')]);
  assert.equal(r.status, 2);
  assert.equal(r.stdout, '');
});

test('CLI seed: a log with no alias receipt exits 2', () => {
  const r = run([receipt('claude-sonnet-5', 'claude-sonnet-5')]);
  assert.equal(r.status, 2);
  assert.equal(r.stdout, '');
});

test('CLI seed: a regression exits 1 and prints no lock', () => {
  const r = run([receipt('fable', 'claude-fable-5')]);
  assert.equal(r.status, 1);
  assert.equal(r.stdout, '');
});

test('CLI seed: a missing --date or --run is a usage error', () => {
  assert.equal(run([receipt('sonnet', 'claude-sonnet-5-5')], { extra: ['--run', 'wf_new'] }).status, 1);
  assert.equal(run([receipt('sonnet', 'claude-sonnet-5-5')], { extra: ['--date', '2026-10-01'] }).status, 1);
});
