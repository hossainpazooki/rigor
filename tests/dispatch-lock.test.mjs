import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { findDispatchViolations, findLockFindings } from '../scripts/check-dispatch.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(here, '../scripts/check-dispatch.mjs');

// Tiers hold family aliases; the lock records what each alias last resolved to.
const CONFIG = {
  judgment: 'fable',
  mid: 'opus',
  build: 'sonnet',
  cheap: 'sonnet',
  floored_nodes: ['verify-the-effect.verdict-cross-check'],
  high_stakes_criteria: ['irreversibility', 'blast-radius'],
};
const LOCK = {
  fable: { resolved: 'claude-fable-5-1', since: '2026-09-29', run: 'wf_seed' },
  opus: { resolved: 'claude-opus-5-5', since: '2026-09-29', run: 'wf_seed' },
  sonnet: { resolved: 'claude-sonnet-5', since: '2026-09-29', run: 'wf_seed' },
};

const verdict = (over = {}) => ({
  node: 'refute.move-3',
  claim: 'tests pass on branch X',
  dispatch_tier: 'judgment',
  verifier_model: { requested: 'fable', answered: 'claude-fable-5-1' },
  inferred_stakes: 'medium',
  rubric_criteria_hit: ['downstream-decisions'],
  downgraded: false,
  ...over,
});
const worker = (over = {}) => ({
  role: 'worker',
  node: 'fanout-build.build',
  label: 'build:a',
  verifier_model: { requested: 'sonnet', answered: 'claude-sonnet-5' },
  ...over,
});

test('a receipt at the locked version is clean and moves nothing', () => {
  assert.deepEqual(findLockFindings([verdict(), worker()], LOCK), { moved: [], violations: [], unevaluable: [] });
});

test('a newer version than the lock is a move, not a violation, reported once per family', () => {
  const recs = [
    worker({ verifier_model: { requested: 'sonnet', answered: 'claude-sonnet-5-5' } }),
    worker({ label: 'build:b', verifier_model: { requested: 'sonnet', answered: 'claude-sonnet-5-5' } }),
  ];
  assert.deepEqual(findLockFindings(recs, LOCK), {
    moved: [{ family: 'sonnet', from: 'claude-sonnet-5', to: 'claude-sonnet-5-5' }],
    violations: [],
    unevaluable: [],
  });
});

test('seed: an older version than the lock is a regression', () => {
  const found = findLockFindings([verdict({ verifier_model: { requested: 'opus', answered: 'claude-opus-5[1m]' }, dispatch_tier: 'mid' })], LOCK);
  assert.equal(found.violations.length, 1);
  assert.match(found.violations[0].reason, /tier regressed — opus answered claude-opus-5, older than the locked claude-opus-5-5/);
});

test('a regression logged as a downgrade is not a violation', () => {
  const r = verdict({ dispatch_tier: 'mid', verifier_model: { requested: 'opus', answered: 'claude-opus-5' }, downgraded: true });
  assert.deepEqual(findLockFindings([r], LOCK).violations, []);
});

test('a [1m] suffix at the locked version is the locked version', () => {
  const r = verdict({ dispatch_tier: 'mid', verifier_model: { requested: 'opus', answered: 'claude-opus-5-5[1m]' } });
  assert.deepEqual(findLockFindings([r], LOCK), { moved: [], violations: [], unevaluable: [] });
});

test('seed: an unreadable receipt under an alias is unevaluable, and class 4 does not also call it a downgrade', () => {
  const r = verdict({ verifier_model: { requested: 'fable', answered: 'unknown' } });
  assert.deepEqual(findDispatchViolations([r], CONFIG), []);
  const found = findLockFindings([r], LOCK);
  assert.equal(found.unevaluable.length, 1);
  assert.match(found.unevaluable[0].reason, /names no readable model id/);
});

test('seed: a family with no lock entry is unevaluable', () => {
  const found = findLockFindings([verdict()], { opus: LOCK.opus });
  assert.equal(found.unevaluable.length, 1);
  assert.match(found.unevaluable[0].reason, /no lock entry for family fable/);
});

test('a record that requested an exact id is not judged against the lock', () => {
  const r = verdict({ verifier_model: { requested: 'claude-fable-5', answered: 'claude-fable-5' } });
  assert.deepEqual(findLockFindings([r], {}), { moved: [], violations: [], unevaluable: [] });
});

// ---- the CLI's three outcomes ----
const run = (records, { config = CONFIG, lock = LOCK } = {}) => {
  const dir = mkdtempSync(join(tmpdir(), 'dispatch-lock-'));
  const log = join(dir, 'verdicts.jsonl');
  const cfg = join(dir, 'models.json');
  writeFileSync(log, records.map((r) => JSON.stringify(r)).join('\n') + '\n');
  writeFileSync(cfg, JSON.stringify(config));
  const args = [CLI, log, cfg];
  if (lock) {
    const lk = join(dir, 'models.lock.json');
    writeFileSync(lk, JSON.stringify(lock));
    args.push(lk);
  }
  return spawnSync(process.execPath, args, { encoding: 'utf8' });
};
const lastLine = (s) => s.trim().split('\n').at(-1);

test('CLI: clean log exits 0 and says so on its last line', () => {
  const r = run([verdict(), worker()]);
  assert.equal(r.status, 0);
  assert.equal(lastLine(r.stdout), 'dispatch: clean (2 records)');
});

test('CLI: a moved tier exits 0 and prints the move', () => {
  const r = run([worker({ verifier_model: { requested: 'sonnet', answered: 'claude-sonnet-5-5' } })]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /TIER MOVED sonnet: claude-sonnet-5 -> claude-sonnet-5-5/);
  assert.equal(lastLine(r.stdout), 'dispatch: clean (1 record)');
});

test('CLI seed: a regression exits 1', () => {
  const r = run([worker({ verifier_model: { requested: 'opus', answered: 'claude-opus-5' } })]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /DISPATCH FAIL build:a: tier regressed/);
});

test('CLI seed: an alias log with no lock exits 2, never 0', () => {
  const r = run([verdict()], { lock: null });
  assert.equal(r.status, 2);
  assert.match(lastLine(r.stderr), /dispatch: unevaluable/);
});

test('CLI seed: an unreadable receipt exits 2', () => {
  const r = run([verdict({ verifier_model: { requested: 'fable', answered: 'unknown' } })]);
  assert.equal(r.status, 2);
});

test('CLI: a violation outranks an unevaluable record', () => {
  const r = run([
    verdict({ verifier_model: { requested: 'fable', answered: 'unknown' } }),
    worker({ verifier_model: { requested: 'opus', answered: 'claude-opus-5' } }),
  ]);
  assert.equal(r.status, 1);
});

test('CLI: an exact-id config needs no lock', () => {
  const legacy = { ...CONFIG, judgment: 'claude-fable-5' };
  const r = run([verdict({ verifier_model: { requested: 'claude-fable-5', answered: 'claude-fable-5' } })], { config: legacy, lock: null });
  assert.equal(r.status, 0);
  assert.equal(lastLine(r.stdout), 'dispatch: clean (1 record)');
});
