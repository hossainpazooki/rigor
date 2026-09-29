import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { findLockFindings } from '../scripts/check-dispatch.mjs';
import { parseModelId } from '../scripts/model-id.mjs';
import { proposeLock } from '../scripts/tier-lock.mjs';

// Pins for what the SECOND whole-branch refutation of 2026-09-29 broke. Each test
// named `seed` failed before the change this file was written ahead of.

const here = dirname(fileURLToPath(import.meta.url));
const DISPATCH = resolve(here, '../scripts/check-dispatch.mjs');
const TIERLOCK = resolve(here, '../scripts/tier-lock.mjs');
const REAL_LOCK = resolve(here, '../config/models.lock.json');
const CONFIG = { judgment: 'fable', mid: 'opus', build: 'sonnet', cheap: 'sonnet', floored_nodes: [], high_stakes_criteria: ['irreversibility', 'blast-radius'] };
const LOCK = { fable: { resolved: 'claude-fable-5-1', since: '2026-09-29', run: 'wf_seed' } };
const META = { date: '2026-10-01', run: 'wf_new' };
const ARGS = ['--date', '2026-10-01', '--run', 'wf_new'];
const worker = (requested, answered, over = {}) => ({ role: 'worker', node: 'n', label: 'l', verifier_model: { requested, answered }, ...over });
const lastLine = (s) => s.trim().split('\n').at(-1);

const dir = () => mkdtempSync(join(tmpdir(), 'alias-refutation-2-'));
const put = (d, name, text) => { const p = join(d, name); writeFileSync(p, text); return p; };
const log = (d, records) => put(d, 'verdicts.jsonl', records.map((r) => JSON.stringify(r)).join('\n') + '\n');
const node = (args) => spawnSync(process.execPath, args, { encoding: 'utf8' });
const dispatch = (records, lockText) => {
  const d = dir();
  return node([DISPATCH, log(d, records), put(d, 'models.json', JSON.stringify(CONFIG)), put(d, 'models.lock.json', lockText)]);
};
const tierLock = (records, lockText) => {
  const d = dir();
  const lk = lockText === undefined ? join(d, 'models.lock.json') : put(d, 'models.lock.json', lockText);
  return node([TIERLOCK, log(d, records), lk, ...ARGS]);
};

// ---- the bracket suffix ----

test('a context-window tag is read; nothing else in brackets is', () => {
  assert.equal(parseModelId('claude-fable-5-1[1m]').id, 'claude-fable-5-1');
  assert.equal(parseModelId('claude-fable-5-1[200k]').id, 'claude-fable-5-1');
});

test('seed: another model named inside the brackets makes the receipt unreadable', () => {
  for (const text of ['claude-fable-5-1[claude-haiku-4-5]', 'claude-fable-5-1[actually-gpt-6-astra,not-fable]', 'claude-fable-5-1[I_am_Haiku_4.5]', 'claude-fable-5-1[' + 'x'.repeat(500) + ']', 'claude-fable-5-1[]', 'claude-fable-5-1[1m][1m]']) {
    assert.equal(parseModelId(text), null, text.slice(0, 60));
    assert.equal(dispatch([worker('fable', text)], JSON.stringify(LOCK)).status, 2, text.slice(0, 60));
  }
});

// ---- a logged downgrade ----

test('seed: a logged downgrade is not judged against the lock, whatever the lock holds', () => {
  const recs = [
    worker('fable', 'claude-fable-5', { downgraded: true }),
    worker('fable', 'claude-haiku-4-5', { downgraded: true }),
    worker('fable', 'Haiku', { downgraded: true }),
  ];
  for (const lock of [{}, { opus: { resolved: 'claude-opus-5-5' } }, { fable: { resolved: 'Fable 5.1' } }, LOCK]) {
    assert.deepEqual(findLockFindings(recs, lock), { moved: [], violations: [], unevaluable: [] }, JSON.stringify(lock));
    assert.equal(dispatch(recs, JSON.stringify(lock)).status, 0, JSON.stringify(lock));
  }
});

test('a lock file that cannot be read is unevaluable whatever the records say', () => {
  const r = dispatch([worker('fable', 'claude-fable-5', { downgraded: true })], '{ not json');
  assert.equal(r.status, 2);
  assert.match(lastLine(r.stderr), /dispatch: unevaluable/);
});

test('a move is printed only on a run with no violation', () => {
  const r = dispatch([worker('fable', 'claude-fable-5-2'), worker('fable', 'claude-fable-5')], JSON.stringify(LOCK));
  assert.equal(r.status, 1);
  assert.doesNotMatch(r.stdout, /TIER MOVED/);
});

// ---- tier-lock: anything it cannot read, in words ----

test('seed: an answer or a label that is not text is unreadable, in words, with no stack trace', () => {
  const cases = [
    worker('sonnet', { toString: 1 }),
    worker('sonnet', { toString: null, valueOf: null }),
    worker('sonnet', 'Sonnet 5.5', { label: { toString: 1 } }),
    worker('sonnet', ['claude-sonnet-5-5']),
    worker('sonnet', 55),
  ];
  for (const rec of cases) {
    const r = tierLock([rec]);
    assert.equal(r.status, 2, JSON.stringify(rec));
    assert.equal(r.stdout, '', JSON.stringify(rec));
    assert.match(lastLine(r.stderr), /tier-lock: unevaluable/);
    assert.doesNotMatch(r.stderr, /TypeError|RangeError|\n\s+at /);
  }
});

test('seed: a lock key that is not a family, or an entry that is not one bare id, stops the proposal', () => {
  const good = worker('sonnet', 'claude-sonnet-5-5');
  const locks = [
    { opus: 5 },
    { junk: [1, 2] },
    { fable: 'claude-fable-9' },
    { sonnet: { resolved: 'claude-sonnet-5' }, junk: { resolved: 'claude-sonnet-5' } },
    { opus: { resolved: 'claude-sonnet-5' } },
  ];
  for (const lock of locks) {
    const found = proposeLock([good], lock, META);
    assert.ok(found.unreadable_lock.length > 0, JSON.stringify(lock));
    assert.deepEqual(found.lock, lock, JSON.stringify(lock));
    const r = tierLock([good], JSON.stringify(lock));
    assert.equal(r.status, 2, JSON.stringify(lock));
    assert.equal(r.stdout, '', JSON.stringify(lock));
  }
});

test('seed: a lock nested too deep to print is refused in words', () => {
  let deep = '[]';
  for (let i = 0; i < 5000; i++) deep = '[' + deep + ']';
  const r = tierLock([worker('sonnet', 'claude-sonnet-5-5')], '{"junk":' + deep + '}');
  assert.equal(r.status, 2);
  assert.equal(r.stdout, '');
  assert.doesNotMatch(r.stderr, /RangeError|\n\s+at /);
});

test('a verdict log that is not a list of records is refused in words', () => {
  const d = dir();
  const r = node([TIERLOCK, put(d, 'v.json', '[[{"a":1}], 5, null]'), join(d, 'lk.json'), ...ARGS]);
  assert.equal(r.status, 2);
  assert.equal(r.stdout, '');
  assert.doesNotMatch(r.stderr, /TypeError|\n\s+at /);
});

test('the repository lock is not written when the lock path is left to its default', () => {
  const before = { text: readFileSync(REAL_LOCK, 'utf8'), mtime: statSync(REAL_LOCK).mtimeMs };
  const d = dir();
  const r = node([TIERLOCK, log(d, [worker('fable', 'claude-fable-99')]), ...ARGS]);
  assert.equal(r.status, 0);
  assert.equal(JSON.parse(r.stdout).fable.resolved, 'claude-fable-99');
  assert.equal(readFileSync(REAL_LOCK, 'utf8'), before.text);
  assert.equal(statSync(REAL_LOCK).mtimeMs, before.mtime);
});
