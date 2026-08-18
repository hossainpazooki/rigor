import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findClosureViolations, parseClosureLog } from '../scripts/check-misfire-closure.mjs';

// The green fixture mirrors a real closed misfire: the 2026-07-14 ledger-kit
// batch-stamping defect, whose pin (identical-ts detection in check-learnings)
// was verified red on the real defective ledger before it was called closed.
const pinned = (over = {}) => ({
  id: 'ledger-kit-batch-stamping',
  ts_captured: '2026-07-14T10:02:00Z',
  ts_recorded: '2026-07-14T18:40:00Z',
  component: 'ledger kit',
  domain: 'treasury-intent-controller',
  capture: 'docs/feedback/2026-07-14-ledger-kit-misfire.md',
  mechanism: 'a form gate cannot distinguish capture-time from write-time, so identical ts values were invisible',
  closure: {
    state: 'pinned',
    pin: 'tests/learnings-check.test.mjs :: identical ts values are flagged',
    red_proof: { cmd: 'node scripts/check-learnings.mjs <the real defective ledger>', result: 'exit 1, batch-stamp finding on 13 entries' },
  },
  ...over,
});

const declined = (over = {}) => ({
  id: 'git-guard-compound-read-only',
  ts_captured: '2026-07-07T12:00:00Z',
  ts_recorded: '2026-07-07T12:30:00Z',
  component: 'git-guard',
  domain: 'treasury-intent-controller',
  capture: 'docs/feedback/2026-07-07-git-guard.md',
  mechanism: 'the matcher rejects compound git commands wholesale, so read-only compounds are blocked with the writes',
  closure: {
    state: 'declined',
    decision: 'the conservative posture is deliberate; splitting the compound is cheap and a parser is not',
    decided_by: 'operator',
    decided_on: '2026-07-07',
  },
  ...over,
});

const open = (over = {}) => ({
  ...pinned(),
  id: 'check-learnings-append-only-blind-to-history',
  closure: { state: 'open' },
  ...over,
});

// ---------- green ----------

test('a well-formed pinned record is clean', () => {
  assert.deepEqual(findClosureViolations([pinned()]), { violations: [], open: [] });
});

test('a well-formed declined record is clean', () => {
  assert.deepEqual(findClosureViolations([declined()]), { violations: [], open: [] });
});

test('an empty ledger yields nothing to report (vacuous pass, flagged at the CLI)', () => {
  assert.deepEqual(findClosureViolations([]), { violations: [], open: [] });
});

// NEGATIVE CONTROL: the gate must not be always-red. A mixed, fully-closed ledger
// produces zero findings on both channels — otherwise every red below is worthless.
test('negative control: a mixed closed ledger produces no violations and no open', () => {
  const { violations, open: o } = findClosureViolations([pinned(), declined()]);
  assert.deepEqual(violations, []);
  assert.deepEqual(o, []);
});

// ---------- red path: false closure claims (the defect class this gate exists for) ----------

test('RED: "pinned" without a red_proof is flagged as an always-green gate', () => {
  const r = pinned();
  delete r.closure.red_proof;
  const { violations } = findClosureViolations([r]);
  assert.equal(violations.length, 1);
  assert.match(violations[0].reason, /red_proof/);
  assert.match(violations[0].reason, /always-green/);
});

test('RED: a red_proof missing its result half is flagged (a cmd alone proves nothing)', () => {
  const r = pinned({ closure: { state: 'pinned', pin: 'some test', red_proof: { cmd: 'node --test' } } });
  const { violations } = findClosureViolations([r]);
  assert.equal(violations.length, 1);
  assert.match(violations[0].reason, /red_proof/);
});

test('RED: "pinned" without a pin reference is flagged', () => {
  const r = pinned();
  delete r.closure.pin;
  const { violations } = findClosureViolations([r]);
  assert.equal(violations.length, 1);
  assert.match(violations[0].reason, /pin/);
});

test('RED: "declined" without decided_on is flagged as an undated decision', () => {
  const r = declined();
  delete r.closure.decided_on;
  const { violations } = findClosureViolations([r]);
  assert.equal(violations.length, 1);
  assert.match(violations[0].reason, /decided_on/);
});

test('RED: a decided_on that is not YYYY-MM-DD is flagged', () => {
  const r = declined({ closure: { state: 'declined', decision: 'x', decided_by: 'operator', decided_on: 'July 2026' } });
  const { violations } = findClosureViolations([r]);
  assert.equal(violations.length, 1);
  assert.match(violations[0].reason, /decided_on/);
});

test('RED: "declined" with no decided_by is flagged (a decision nobody owns)', () => {
  const r = declined();
  delete r.closure.decided_by;
  const { violations } = findClosureViolations([r]);
  assert.equal(violations.length, 1);
  assert.match(violations[0].reason, /decided_by/);
});

// ---------- three-outcome separation ----------

test('an open record is UNEVALUABLE, not a violation — the two channels stay distinct', () => {
  const { violations, open: o } = findClosureViolations([open()]);
  assert.deepEqual(violations, []);
  assert.deepEqual(o, ['check-learnings-append-only-blind-to-history']);
});

test('open records do not mask violations in the same ledger', () => {
  const bad = pinned({ id: 'bad-one' });
  delete bad.closure.red_proof;
  const { violations, open: o } = findClosureViolations([open(), bad]);
  assert.equal(violations.length, 1);
  assert.equal(o.length, 1);
});

test('an unknown closure.state fails closed rather than being treated as open', () => {
  const r = pinned({ closure: { state: 'mitigated' } });
  const { violations, open: o } = findClosureViolations([r]);
  assert.equal(violations.length, 1);
  assert.match(violations[0].reason, /closure\.state/);
  assert.deepEqual(o, []);
});

test('a missing closure object is flagged, not crashed on', () => {
  const r = pinned();
  delete r.closure;
  const { violations } = findClosureViolations([r]);
  assert.equal(violations.length, 1);
  assert.match(violations[0].reason, /closure/);
});

// ---------- ledger integrity ----------

test('a duplicate id is flagged — the ledger is append-only', () => {
  const { violations } = findClosureViolations([pinned(), pinned()]);
  assert.equal(violations.length, 1);
  assert.match(violations[0].reason, /duplicate id/);
});

test('ts_recorded before ts_captured is flagged as an anchoring violation', () => {
  const r = pinned({ ts_captured: '2026-07-14T18:40:00Z', ts_recorded: '2026-07-14T10:02:00Z' });
  const { violations } = findClosureViolations([r]);
  assert.equal(violations.length, 1);
  assert.match(violations[0].reason, /capture-time anchoring/);
});

test('an unparseable timestamp is flagged by field name', () => {
  const r = pinned({ ts_captured: 'last Tuesday' });
  const { violations } = findClosureViolations([r]);
  assert.ok(violations.some((v) => /ts_captured/.test(v.reason)));
});

test('missing required fields are flagged by name', () => {
  const r = pinned();
  delete r.mechanism;
  delete r.capture;
  const { violations } = findClosureViolations([r]);
  assert.equal(violations.length, 1);
  assert.match(violations[0].reason, /capture/);
  assert.match(violations[0].reason, /mechanism/);
});

test('a record with no id is still reported rather than silently skipped', () => {
  const r = pinned();
  delete r.id;
  const { violations } = findClosureViolations([r]);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].entry, '<unidentified record>');
});

test('a whitespace-only mechanism does not satisfy the field (blameless analysis is required)', () => {
  const { violations } = findClosureViolations([pinned({ mechanism: '   ' })]);
  assert.equal(violations.length, 1);
  assert.match(violations[0].reason, /mechanism/);
});

// ---------- parsing ----------

test('parseClosureLog skips blank lines', () => {
  const text = `${JSON.stringify(pinned())}\n\n${JSON.stringify(declined())}\n`;
  assert.equal(parseClosureLog(text).length, 2);
});
