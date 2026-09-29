import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { findLockFindings } from '../scripts/check-dispatch.mjs';
import { proposeLock } from '../scripts/tier-lock.mjs';

// Pins for what the whole-branch refutation of 2026-09-29 broke. Each test named
// `seed` exited 0, or crashed, before the change this file was written ahead of.
// The tests not named `seed` pin behaviour that already held and had no test.

const here = dirname(fileURLToPath(import.meta.url));
const DISPATCH = resolve(here, '../scripts/check-dispatch.mjs');
const TIERLOCK = resolve(here, '../scripts/tier-lock.mjs');
const CONFIG = { judgment: 'fable', mid: 'opus', build: 'sonnet', cheap: 'sonnet', floored_nodes: [], high_stakes_criteria: ['irreversibility', 'blast-radius'] };
const LOCK = {
  fable: { resolved: 'claude-fable-5-1', since: '2026-09-29', run: 'wf_seed' },
  sonnet: { resolved: 'claude-sonnet-5-5', since: '2026-09-29', run: 'wf_seed' },
};
const META = { date: '2026-10-01', run: 'wf_new' };
const ARGS = ['--date', '2026-10-01', '--run', 'wf_new'];
const worker = (requested, answered, over = {}) => ({ role: 'worker', node: 'n', label: 'l', verifier_model: { requested, answered }, ...over });
const lastLine = (s) => s.trim().split('\n').at(-1);

const dir = () => mkdtempSync(join(tmpdir(), 'alias-refutation-'));
const put = (d, name, text) => { const p = join(d, name); writeFileSync(p, text); return p; };
const log = (d, records) => put(d, 'verdicts.jsonl', records.map((r) => JSON.stringify(r)).join('\n') + '\n');
const node = (args) => spawnSync(process.execPath, args, { encoding: 'utf8' });
const dispatch = (records, lockText) => {
  const d = dir();
  const args = [DISPATCH, log(d, records), put(d, 'models.json', JSON.stringify(CONFIG))];
  if (lockText !== undefined) args.push(put(d, 'models.lock.json', lockText));
  return node(args);
};
const tierLock = (records, lockText, extra = ARGS) => {
  const d = dir();
  const lk = lockText === undefined ? join(d, 'models.lock.json') : put(d, 'models.lock.json', lockText);
  return { ...node([TIERLOCK, log(d, records), lk, ...extra]), d };
};

// ---- check-dispatch ----

test('seed: an id embedded in a longer word does not pass as the locked version', () => {
  for (const answered of ['claude-fable-5-1-mini', 'xclaude-fable-5-1', 'claude-fable-5-1x']) {
    assert.equal(dispatch([worker('fable', answered)], JSON.stringify(LOCK)).status, 2, answered);
  }
});

test('seed: another model echoing the requested id does not pass', () => {
  for (const answered of ['I am Haiku 4.5, not claude-fable-5-1', 'gpt-6-astra (asked for claude-fable-5-1)']) {
    assert.equal(dispatch([worker('fable', answered)], JSON.stringify(LOCK)).status, 2, answered);
  }
});

test('seed: a date read as a version is not a move', () => {
  for (const answered of ['claude-fable-20250101', 'claude-fable-5-1-260901']) {
    const r = dispatch([worker('fable', answered)], JSON.stringify(LOCK));
    assert.equal(r.status, 2, answered);
    assert.doesNotMatch(r.stdout, /TIER MOVED/);
  }
});

test('seed: a dotted id is unevaluable, not a regression', () => {
  assert.equal(dispatch([worker('fable', 'claude-fable-5.1')], JSON.stringify(LOCK)).status, 2);
});

test('seed: a lock file that is empty or not JSON exits 2 in words, not a stack trace', () => {
  for (const text of ['', '   \n', '{ not json']) {
    const r = dispatch([worker('fable', 'claude-fable-5-1')], text);
    assert.equal(r.status, 2, JSON.stringify(text));
    assert.match(lastLine(r.stderr), /dispatch: unevaluable/);
    assert.doesNotMatch(r.stderr, /SyntaxError/);
  }
});

test('a lock file that is not an object of entries exits 2', () => {
  for (const text of ['null', '[]', '"claude-fable-5-1"']) {
    assert.equal(dispatch([worker('fable', 'claude-fable-5-1')], text).status, 2, text);
  }
});

test('a logged downgrade is accepted whatever answered, readable or not', () => {
  const recs = [worker('fable', 'Fable 5.1', { downgraded: true }), worker('fable', 'claude-opus-5-5', { downgraded: true })];
  assert.deepEqual(findLockFindings(recs, LOCK), { moved: [], violations: [], unevaluable: [] });
  assert.equal(dispatch(recs, JSON.stringify(LOCK)).status, 0);
});

test('downgraded must be the boolean true', () => {
  assert.equal(dispatch([worker('fable', 'Fable 5.1', { downgraded: 'true' })], JSON.stringify(LOCK)).status, 2);
});

// ---- tier-lock ----

test('seed: a lock entry that cannot be read is never replaced', () => {
  for (const resolved of ['claude-sonnet-5.5', 'Claude-Sonnet-5-5', 'sonnet-6', 'claude-sonnet-6 (was claude-sonnet-5)', 'claude-opus-6', 'claude-3-5-sonnet-20241022']) {
    const prev = { sonnet: { resolved, since: '2026-09-29', run: 'wf_seed' } };
    const found = proposeLock([worker('sonnet', 'claude-sonnet-4')], prev, META);
    assert.deepEqual(found.unreadable_lock, ['sonnet'], resolved);
    assert.deepEqual(found.lock, prev, resolved);
    assert.deepEqual(found.moved, [], resolved);
  }
});

test('seed: a lock entry that is not an object with a resolved id is never replaced', () => {
  const prev = { sonnet: 'claude-sonnet-6' };
  const found = proposeLock([worker('sonnet', 'claude-sonnet-4')], prev, META);
  assert.deepEqual(found.unreadable_lock, ['sonnet']);
  assert.deepEqual(found.lock, prev);
});

test('CLI seed: an unreadable lock entry exits 2 and prints no lock', () => {
  const r = tierLock([worker('sonnet', 'claude-sonnet-4')], JSON.stringify({ sonnet: { resolved: 'claude-sonnet-5.5', since: '2026-09-29', run: 'x' } }));
  assert.equal(r.status, 2);
  assert.equal(r.stdout, '');
  assert.match(lastLine(r.stderr), /tier-lock: unevaluable/);
});

test('CLI seed: a lock file that is null, an array, empty or not JSON exits 2 and prints no lock', () => {
  for (const text of ['null', '[]', '', '{ not json']) {
    const r = tierLock([worker('sonnet', 'claude-sonnet-5-5')], text);
    assert.equal(r.status, 2, JSON.stringify(text));
    assert.equal(r.stdout, '', JSON.stringify(text));
    assert.doesNotMatch(r.stderr, /SyntaxError/);
  }
});

test('seed: an alias receipt that cannot be read stops the proposal', () => {
  const recs = [worker('sonnet', 'claude-sonnet-5-5'), worker('sonnet', 'claude-sonnet-5 and claude-sonnet-5-5')];
  const found = proposeLock(recs, {}, META);
  assert.equal(found.unreadable.length, 1);
  assert.deepEqual(found.lock, {});
  const r = tierLock(recs);
  assert.equal(r.status, 2);
  assert.equal(r.stdout, '');
});

test('CLI seed: a missing or unparseable verdict log exits 2 in words', () => {
  const d = dir();
  const missing = node([TIERLOCK, join(d, 'nope.jsonl'), join(d, 'lk.json'), ...ARGS]);
  assert.equal(missing.status, 2);
  assert.match(lastLine(missing.stderr), /tier-lock: unevaluable/);
  const garbage = node([TIERLOCK, put(d, 'bad.jsonl', '{"role":"worker"\nnot json\n'), join(d, 'lk.json'), ...ARGS]);
  assert.equal(garbage.status, 2);
  assert.match(lastLine(garbage.stderr), /tier-lock: unevaluable/);
});

test('CLI seed: a date that is not a real day, or a run id that is a flag, is a usage error', () => {
  assert.equal(tierLock([worker('sonnet', 'claude-sonnet-5-5')], undefined, ['--date', '2026-99-99', '--run', 'wf_new']).status, 1);
  assert.equal(tierLock([worker('sonnet', 'claude-sonnet-5-5')], undefined, ['--date', '2026-10-01', '--run', '--date']).status, 1);
});

test('CLI: the tool writes nothing, with or without a previous lock', () => {
  const snapshot = (d) => readdirSync(d).sort().map((f) => f + ':' + statSync(join(d, f)).size + ':' + readFileSync(join(d, f), 'utf8')).join('|');
  const first = tierLock([worker('sonnet', 'claude-sonnet-5-5')]);
  assert.equal(first.status, 0);
  assert.deepEqual(readdirSync(first.d), ['verdicts.jsonl']);
  const d = dir();
  const lg = log(d, [worker('fable', 'claude-fable-5-2')]);
  const lk = put(d, 'models.lock.json', JSON.stringify(LOCK));
  const before = snapshot(d);
  const moved = node([TIERLOCK, lg, lk, ...ARGS]);
  assert.equal(moved.status, 0);
  assert.equal(JSON.parse(moved.stdout).fable.resolved, 'claude-fable-5-2');
  assert.equal(snapshot(d), before);
});
