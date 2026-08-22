import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import {
  KINDS,
  identityDigest,
  foldHealth,
  effectiveClass,
  earnedClassEvidence,
  findChangeRecordViolations,
  parseChangeLog,
} from '../scripts/check-change-record.mjs';

const SCRIPT = fileURLToPath(new URL('../scripts/check-change-record.mjs', import.meta.url));

// ---------------------------------------------------------------------------
// Fixtures: a realistic class-2 k8s image-bump change (ADR-0013 section 2/6).
// ---------------------------------------------------------------------------

const IDENTITY = [{ name: 'rendered-manifest', path: 'kube/rendered/prod.yaml', sha256: 'a'.repeat(64) }];
const CANDIDATE_DIGEST = identityDigest(IDENTITY);

function classTwoProposal(over = {}) {
  return {
    kind: 'proposal',
    change_id: 'chg-1',
    pattern: 'k8s-image-bump',
    ts_proposed: '2026-08-20T10:00:00Z',
    ts_recorded: '2026-08-20T10:05:00Z',
    proposed_by: 'agent:claude',
    target: { kind: 'k8s', ref: 'kube/overlays/prod' },
    class: { proposed: 2, authorization: null },
    artifact: { identity: IDENTITY },
    backout: {
      kind: 'rollout-undo',
      exercised_against: CANDIDATE_DIGEST,
      exit_code: 0,
      run_ref: 'ci-run://backout/42',
      by: 'agent:claude',
    },
    blast_radius: {
      declared: ['svc-a', 'svc-b'],
      plan_diff: ['svc-a'],
      plan_diff_source: { cmd: 'kubectl diff -k kube/overlays/prod', sha256: 'b'.repeat(64) },
    },
    health_baseline: {
      verdict: 'pass',
      window: { from: '2026-08-20T09:00:00Z', to: '2026-08-20T09:55:00Z' },
      signals: [
        { id: 'svc-a-error-rate', scope: 'in-radius', outcome: 'pass', source: 'prom', last_sample_ts: '2026-08-20T09:50:00Z' },
        { id: 'svc-a-latency', scope: 'in-radius', outcome: 'pass', source: 'prom', last_sample_ts: '2026-08-20T09:50:00Z' },
        { id: 'svc-c-error-rate', scope: 'not-in-scope', outcome: 'not-in-scope', source: 'prom', last_sample_ts: '2026-08-20T09:50:00Z' },
      ],
    },
    probe_plan: {
      claim: 'new pods serve the bumped image',
      control: 'the same probe run against the previous rollout before this candidate deployed, expected to fail once superseded',
      ref: 'probe-plan-1',
    },
    approval: { who: 'lead-sre', when: '2026-08-20T10:02:00Z', ref: 'slack://approval/1' },
    ...over,
  };
}

function cleanOutcome(over = {}) {
  return {
    kind: 'outcome',
    change_id: 'chg-1',
    ts_executed: '2026-08-20T11:00:00Z',
    ts_recorded: '2026-08-20T11:10:00Z',
    executed_by: 'human:oncall',
    health: {
      verdict: 'pass',
      window: { from: '2026-08-20T11:00:00Z', to: '2026-08-20T11:30:00Z' },
      signals: [
        { id: 'svc-a-error-rate', scope: 'in-radius', outcome: 'pass', source: 'prom', last_sample_ts: '2026-08-20T11:25:00Z' },
        { id: 'svc-a-latency', scope: 'in-radius', outcome: 'pass', source: 'prom', last_sample_ts: '2026-08-20T11:25:00Z' },
      ],
    },
    probe: { claim: 'new pods serve the bumped image', probePassed: true, controlRan: true, controlPassed: false, ref: 'probe-plan-1' },
    outcome: 'clean',
    misfire_closure: null,
    break_glass: null,
    ...over,
  };
}

function authorizationClass1(over = {}) {
  return {
    kind: 'authorization',
    id: 'auth-1-configmap-bump',
    pattern: 'k8s-configmap-bump',
    class: 1,
    granted_by: 'lead-sre',
    granted_on: '2026-08-01',
    identity_rule: 'the rendered manifest content hash is the identity',
    backout_rule: 'rollout undo run against the candidate before deploy',
    criteria: {
      min_clean_instances: 2,
      backout_exercised: true,
      probe_nonvacuous: true,
      sweep_cadence_days: 30,
      sweep_every_n_instances: 10,
    },
    basis: 'first domain rehearsal',
    ...over,
  };
}

function authorizationClass0(over = {}) {
  return {
    kind: 'authorization',
    id: 'auth-0-loglevel-bump',
    pattern: 'k8s-loglevel-bump',
    class: 0,
    granted_by: 'lead-sre',
    granted_on: '2026-08-10',
    identity_rule: 'the rendered manifest content hash is the identity',
    backout_rule: 'rollout undo run against the candidate before deploy',
    criteria: {
      min_clean_instances: 2,
      backout_exercised: true,
      probe_nonvacuous: true,
      sweep_cadence_days: 30,
      sweep_every_n_instances: 10,
    },
    basis: '2 clean class-1 instances of this pattern, promoted by lead-sre',
    ...over,
  };
}

// A baseline/outcome pair anchored on its own timestamps, so overriding
// ts_proposed / ts_executed elsewhere in the fixture set never leaves a stale
// window.to (or window.from) on the wrong side of its anchor.
function baselineAt(tsProposed) {
  const t = Date.parse(tsProposed);
  const to = new Date(t - 5 * 60000).toISOString();
  const from = new Date(t - 65 * 60000).toISOString();
  const sample = new Date(t - 10 * 60000).toISOString();
  return {
    verdict: 'pass',
    window: { from, to },
    signals: [
      { id: 'svc-a-error-rate', scope: 'in-radius', outcome: 'pass', source: 'prom', last_sample_ts: sample },
      { id: 'svc-a-latency', scope: 'in-radius', outcome: 'pass', source: 'prom', last_sample_ts: sample },
      { id: 'svc-c-error-rate', scope: 'not-in-scope', outcome: 'not-in-scope', source: 'prom', last_sample_ts: sample },
    ],
  };
}

function healthAt(tsExecuted) {
  const t = Date.parse(tsExecuted);
  const from = tsExecuted;
  const to = new Date(t + 30 * 60000).toISOString();
  const sample = new Date(t + 25 * 60000).toISOString();
  return {
    verdict: 'pass',
    window: { from, to },
    signals: [
      { id: 'svc-a-error-rate', scope: 'in-radius', outcome: 'pass', source: 'prom', last_sample_ts: sample },
      { id: 'svc-a-latency', scope: 'in-radius', outcome: 'pass', source: 'prom', last_sample_ts: sample },
    ],
  };
}

// A full, clean, mixed ledger: class 2, class 1, and an earned class 0 chain.
// The class-0 pattern's first two instances run at class 1 (a human approves
// each on the record); only once two clean, non-vacuous instances exist does
// the third instance cite the class-0 authorization — earned downward, per
// property 6, never proposed from a standing start.
function cleanMixedLedger() {
  const class1Proposal = classTwoProposal({
    change_id: 'chg-c1',
    pattern: 'k8s-configmap-bump',
    class: { proposed: 1, authorization: 'auth-1-configmap-bump' },
  });
  const class1Outcome = cleanOutcome({ change_id: 'chg-c1' });

  const authClass1Loglevel = authorizationClass1({ id: 'auth-1-loglevel-bump', pattern: 'k8s-loglevel-bump' });

  const priorP1 = classTwoProposal({
    change_id: 'chg-p1',
    pattern: 'k8s-loglevel-bump',
    ts_proposed: '2026-07-20T10:00:00Z',
    ts_recorded: '2026-07-20T10:05:00Z',
    class: { proposed: 1, authorization: 'auth-1-loglevel-bump' },
    health_baseline: baselineAt('2026-07-20T10:00:00Z'),
  });
  const priorO1 = cleanOutcome({
    change_id: 'chg-p1',
    ts_executed: '2026-07-20T11:00:00Z',
    ts_recorded: '2026-07-20T11:10:00Z',
    health: healthAt('2026-07-20T11:00:00Z'),
  });
  const priorP2 = classTwoProposal({
    change_id: 'chg-p2',
    pattern: 'k8s-loglevel-bump',
    ts_proposed: '2026-07-25T10:00:00Z',
    ts_recorded: '2026-07-25T10:05:00Z',
    class: { proposed: 1, authorization: 'auth-1-loglevel-bump' },
    health_baseline: baselineAt('2026-07-25T10:00:00Z'),
  });
  const priorO2 = cleanOutcome({
    change_id: 'chg-p2',
    ts_executed: '2026-07-25T11:00:00Z',
    ts_recorded: '2026-07-25T11:10:00Z',
    health: healthAt('2026-07-25T11:00:00Z'),
  });
  const currentP3 = classTwoProposal({
    change_id: 'chg-p3',
    pattern: 'k8s-loglevel-bump',
    ts_proposed: '2026-08-15T10:00:00Z',
    ts_recorded: '2026-08-15T10:05:00Z',
    class: { proposed: 0, authorization: 'auth-0-loglevel-bump' },
    health_baseline: baselineAt('2026-08-15T10:00:00Z'),
  });
  const currentO3 = cleanOutcome({
    change_id: 'chg-p3',
    ts_executed: '2026-08-15T11:00:00Z',
    ts_recorded: '2026-08-15T11:10:00Z',
    health: healthAt('2026-08-15T11:00:00Z'),
  });

  return [
    classTwoProposal(), cleanOutcome(),
    authorizationClass1(), class1Proposal, class1Outcome,
    authClass1Loglevel, priorP1, priorO1, priorP2, priorO2,
    authorizationClass0(), currentP3, currentO3,
  ];
}

// ---------------------------------------------------------------------------
// identityDigest
// ---------------------------------------------------------------------------

test('identityDigest: empty or invalid identity yields the empty string', () => {
  assert.equal(identityDigest([]), '');
  assert.equal(identityDigest(null), '');
  assert.equal(identityDigest(undefined), '');
  assert.equal(identityDigest('not-an-array'), '');
});

test('identityDigest: deterministic and order-independent (sorted by name), path omitted', () => {
  const a = [{ name: 'z', path: '/x/a.yaml', sha256: '1'.repeat(64) }, { name: 'a', value: 42 }];
  const b = [{ name: 'a', value: 42, path: 'irrelevant, omitted' }, { name: 'z', path: '/different/path.yaml', sha256: '1'.repeat(64) }];
  assert.equal(identityDigest(a), identityDigest(b));
  assert.notEqual(identityDigest(a), '');
});

test('identityDigest: a different sha256 or value produces a different digest', () => {
  const a = [{ name: 'x', sha256: '1'.repeat(64) }];
  const b = [{ name: 'x', sha256: '2'.repeat(64) }];
  assert.notEqual(identityDigest(a), identityDigest(b));
});

test('identityDigest: an entry with neither sha256 nor value nor a usable name is dropped, not thrown on', () => {
  assert.equal(identityDigest([{ name: 'no-content' }]), identityDigest([{ name: 'no-content' }]));
  assert.doesNotThrow(() => identityDigest([{}, null, { name: 'ok', value: 1 }]));
});

// ---------------------------------------------------------------------------
// foldHealth
// ---------------------------------------------------------------------------

test('foldHealth: zero in-radius signals is unevaluable', () => {
  const h = { window: { from: '2026-08-20T09:00:00Z' }, signals: [{ scope: 'not-in-scope', outcome: 'not-in-scope' }] };
  assert.equal(foldHealth(h), 'unevaluable');
});

test('foldHealth: all in-radius pass folds to pass', () => {
  const h = {
    window: { from: '2026-08-20T09:00:00Z', to: '2026-08-20T09:59:00Z' },
    signals: [
      { scope: 'in-radius', outcome: 'pass', source: 'prom', last_sample_ts: '2026-08-20T09:30:00Z' },
      { scope: 'in-radius', outcome: 'pass', source: 'prom', last_sample_ts: '2026-08-20T09:31:00Z' },
    ],
  };
  assert.equal(foldHealth(h), 'pass');
});

test('foldHealth: any in-radius fail (no unevaluable) folds to fail', () => {
  const h = {
    window: { from: '2026-08-20T09:00:00Z', to: '2026-08-20T09:59:00Z' },
    signals: [
      { scope: 'in-radius', outcome: 'pass', source: 'prom', last_sample_ts: '2026-08-20T09:30:00Z' },
      { scope: 'in-radius', outcome: 'fail', source: 'prom', last_sample_ts: '2026-08-20T09:31:00Z' },
    ],
  };
  assert.equal(foldHealth(h), 'fail');
});

test('foldHealth: any in-radius unevaluable dominates a fail', () => {
  const h = {
    window: { from: '2026-08-20T09:00:00Z', to: '2026-08-20T09:59:00Z' },
    signals: [
      { scope: 'in-radius', outcome: 'fail', source: 'prom', last_sample_ts: '2026-08-20T09:31:00Z' },
      { scope: 'in-radius', outcome: 'unevaluable', source: 'prom', last_sample_ts: '2026-08-20T09:31:00Z' },
    ],
  };
  assert.equal(foldHealth(h), 'unevaluable');
});

test('foldHealth: a stale in-radius signal folds to unevaluable regardless of its stated outcome', () => {
  const h = {
    window: { from: '2026-08-20T09:00:00Z', to: '2026-08-20T09:59:00Z' },
    signals: [{ scope: 'in-radius', outcome: 'pass', source: 'prom', last_sample_ts: '2026-08-20T08:00:00Z' }],
  };
  assert.equal(foldHealth(h), 'unevaluable');
});

// ---------------------------------------------------------------------------
// foldHealth: BLOCKING coercion (skeptic finding a) — an in-radius signal must
// never fold to pass except through a fully-formed pass reading.
// ---------------------------------------------------------------------------

test('foldHealth: an in-radius signal with a missing outcome folds to unevaluable, never pass', () => {
  const h = {
    window: { from: '2026-08-20T09:00:00Z', to: '2026-08-20T09:59:00Z' },
    signals: [{ scope: 'in-radius', source: 'prom', last_sample_ts: '2026-08-20T09:30:00Z' }],
  };
  assert.equal(foldHealth(h), 'unevaluable');
});

test("foldHealth: an in-radius signal with outcome 'ok' folds to unevaluable, never pass", () => {
  const h = {
    window: { from: '2026-08-20T09:00:00Z', to: '2026-08-20T09:59:00Z' },
    signals: [{ scope: 'in-radius', outcome: 'ok', source: 'prom', last_sample_ts: '2026-08-20T09:30:00Z' }],
  };
  assert.equal(foldHealth(h), 'unevaluable');
});

test("foldHealth: an in-radius signal with outcome 'PASS' (wrong case) folds to unevaluable, never pass", () => {
  const h = {
    window: { from: '2026-08-20T09:00:00Z', to: '2026-08-20T09:59:00Z' },
    signals: [{ scope: 'in-radius', outcome: 'PASS', source: 'prom', last_sample_ts: '2026-08-20T09:30:00Z' }],
  };
  assert.equal(foldHealth(h), 'unevaluable');
});

test("foldHealth: an in-radius signal with outcome 'not-in-scope' folds to unevaluable, never pass", () => {
  const h = {
    window: { from: '2026-08-20T09:00:00Z', to: '2026-08-20T09:59:00Z' },
    signals: [{ scope: 'in-radius', outcome: 'not-in-scope', source: 'prom', last_sample_ts: '2026-08-20T09:30:00Z' }],
  };
  assert.equal(foldHealth(h), 'unevaluable');
});

test('foldHealth: an in-radius signal with an absent/empty source folds to unevaluable (missing metric)', () => {
  const h = {
    window: { from: '2026-08-20T09:00:00Z', to: '2026-08-20T09:59:00Z' },
    signals: [{ scope: 'in-radius', outcome: 'pass', last_sample_ts: '2026-08-20T09:30:00Z' }],
  };
  assert.equal(foldHealth(h), 'unevaluable');
});

test('foldHealth: an in-radius signal with an unparseable last_sample_ts folds to unevaluable', () => {
  const h = {
    window: { from: '2026-08-20T09:00:00Z', to: '2026-08-20T09:59:00Z' },
    signals: [{ scope: 'in-radius', outcome: 'pass', source: 'prom', last_sample_ts: 'not-a-date' }],
  };
  assert.equal(foldHealth(h), 'unevaluable');
});

test('foldHealth: an in-radius signal with last_sample_ts ABSENT folds to unevaluable (non-vacuity residual d)', () => {
  const h = {
    window: { from: '2026-08-20T09:00:00Z', to: '2026-08-20T09:59:00Z' },
    signals: [{ scope: 'in-radius', outcome: 'pass', source: 'prom' }],
  };
  assert.equal(foldHealth(h), 'unevaluable');
});

test('foldHealth: an absent/unparseable window.from or window.to folds to unevaluable (empty evaluation window)', () => {
  const signals = [{ scope: 'in-radius', outcome: 'pass', source: 'prom', last_sample_ts: '2026-08-20T09:30:00Z' }];
  assert.equal(foldHealth({ window: {}, signals }), 'unevaluable');
  assert.equal(foldHealth({ window: { from: '2026-08-20T09:00:00Z' }, signals }), 'unevaluable');
  assert.equal(foldHealth({ window: { from: '2026-08-20T09:00:00Z', to: 'not-a-date' }, signals }), 'unevaluable');
});

// ---------------------------------------------------------------------------
// RED: Property 3 residual (c) — an inverted window (from after to) folds to
// unevaluable (an empty evaluation window), and it is a form violation, not
// silently ignored.
// ---------------------------------------------------------------------------

test('foldHealth: an inverted window (from after to) folds to unevaluable', () => {
  // Non-vacuity residual (d): the sample (10:30) is NOT stale against
  // window.from (10:00) - if the inverted-window branch were deleted, this
  // signal would read as a fully-formed in-radius pass and the fold would
  // wrongly return 'pass' instead of 'unevaluable'.
  const signals = [{ scope: 'in-radius', outcome: 'pass', source: 'prom', last_sample_ts: '2026-08-20T10:30:00Z' }];
  assert.equal(foldHealth({ window: { from: '2026-08-20T10:00:00Z', to: '2026-08-20T09:00:00Z' }, signals }), 'unevaluable');
});

test("RED (non-vacuity residual d): an in-radius signal with last_sample_ts key ABSENT is a form violation naming 'missing last_sample_ts'", () => {
  const base = classTwoProposal();
  const signals = base.health_baseline.signals.map((s) => {
    if (s.id !== 'svc-a-error-rate') return s;
    const { last_sample_ts, ...rest } = s;
    return rest;
  });
  const p = classTwoProposal({ health_baseline: { ...base.health_baseline, signals } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'form' && /missing last_sample_ts/.test(v.reason));
  assert.ok(v);
});

test('RED: an inverted health_baseline window (from after to) is a form violation', () => {
  const base = classTwoProposal();
  const p = classTwoProposal({
    health_baseline: { ...base.health_baseline, window: { from: '2026-08-20T10:00:00Z', to: '2026-08-20T09:00:00Z' } },
  });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'form' && /window is inverted/.test(v.reason));
  assert.ok(v);
});

// ---------------------------------------------------------------------------
// RED: Property 3 residual (c) — a signal sampled AFTER window.to is a form
// violation just as one sampled before window.from (stale) is: the sample is
// outside the declared evaluation window either way.
// ---------------------------------------------------------------------------

test('RED: an in-radius signal with last_sample_ts after window.to is a form violation (sample outside the window)', () => {
  const base = classTwoProposal();
  const signals = base.health_baseline.signals.map((s) =>
    s.id === 'svc-a-error-rate' ? { ...s, last_sample_ts: '2026-08-20T10:30:00Z' } : s, // window.to is 09:55:00Z
  );
  const p = classTwoProposal({ health_baseline: { ...base.health_baseline, signals } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'form' && /last_sample_ts is after .*window\.to/.test(v.reason) && /outside the window/.test(v.reason));
  assert.ok(v);
});

// ---------------------------------------------------------------------------
// findChangeRecordViolations: green fixture + negative control
// ---------------------------------------------------------------------------

test('a well-formed class-2 proposal + clean outcome is clean', () => {
  const { violations, unevaluable } = findChangeRecordViolations([classTwoProposal(), cleanOutcome()]);
  assert.deepEqual(violations, []);
  assert.deepEqual(unevaluable, []);
});

test('NEGATIVE CONTROL: a fully clean mixed ledger (class 2, class 1, earned class 0) produces zero violations and zero unevaluable', () => {
  const { violations, unevaluable } = findChangeRecordViolations(cleanMixedLedger());
  assert.deepEqual(violations, []);
  assert.deepEqual(unevaluable, []);
});

// ---------------------------------------------------------------------------
// RED: form
// ---------------------------------------------------------------------------

test('RED: an unknown kind is flagged', () => {
  const { violations } = findChangeRecordViolations([{ kind: 'mystery' }]);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].property, 'form');
  assert.match(violations[0].reason, /unknown kind/);
});

test('RED: a proposal missing required fields is flagged by name', () => {
  const p = classTwoProposal();
  delete p.proposed_by;
  delete p.target;
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'form' && /missing or malformed/.test(v.reason));
  assert.ok(v);
  assert.match(v.reason, /proposed_by/);
  assert.match(v.reason, /target/);
});

test('RED: an outcome missing required fields is flagged by name', () => {
  const o = cleanOutcome();
  delete o.executed_by;
  delete o.health;
  const { violations } = findChangeRecordViolations([classTwoProposal(), o]);
  const v = violations.find((v) => v.entry === 'outcome chg-1' && /missing or malformed/.test(v.reason));
  assert.ok(v);
  assert.match(v.reason, /executed_by/);
  assert.match(v.reason, /health/);
});

test('RED: an authorization missing required fields is flagged by name', () => {
  const a = authorizationClass1();
  delete a.granted_by;
  delete a.criteria;
  const { violations } = findChangeRecordViolations([a]);
  const v = violations.find((v) => v.property === 'form' && /missing or malformed/.test(v.reason));
  assert.ok(v);
  assert.match(v.reason, /granted_by/);
  assert.match(v.reason, /criteria/);
});

test('RED: a reproof missing required fields is flagged by name', () => {
  const r = { kind: 'reproof', pattern: 'k8s-loglevel-bump', by: 'lead-sre' };
  const { violations } = findChangeRecordViolations([r]);
  const v = violations.find((v) => v.property === 'form');
  assert.ok(v);
  assert.match(v.reason, /closure_id/);
  assert.match(v.reason, /on\b/);
});

test('RED: a duplicate change_id among non-superseding proposals is flagged', () => {
  const p1 = classTwoProposal();
  const p2 = classTwoProposal({ ts_proposed: '2026-08-21T10:00:00Z', ts_recorded: '2026-08-21T10:05:00Z' });
  const { violations } = findChangeRecordViolations([p1, p2]);
  const v = violations.find((v) => /duplicate change_id/.test(v.reason));
  assert.ok(v);
});

test('a supersession correction re-using the same change_id is NOT a duplicate', () => {
  const p1 = classTwoProposal();
  const correction = classTwoProposal({ supersedes: 'chg-1', ts_proposed: '2026-08-21T10:00:00Z', ts_recorded: '2026-08-21T10:05:00Z' });
  const { violations } = findChangeRecordViolations([p1, correction, cleanOutcome()]);
  assert.ok(!violations.some((v) => /duplicate change_id/.test(v.reason)));
});

test('RED: an outcome with no matching proposal is an orphan', () => {
  const { violations } = findChangeRecordViolations([cleanOutcome({ change_id: 'chg-ghost' })]);
  const v = violations.find((v) => /orphan/.test(v.reason));
  assert.ok(v);
  assert.equal(v.property, 'form');
});

test('RED: proposal ts_recorded before ts_proposed is flagged (batch-stamping shape)', () => {
  const p = classTwoProposal({ ts_proposed: '2026-08-20T10:05:00Z', ts_recorded: '2026-08-20T10:00:00Z' });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => /ts_recorded is before ts_proposed/.test(v.reason));
  assert.ok(v);
});

test('RED: outcome ts_recorded before ts_executed is flagged', () => {
  const o = cleanOutcome({ ts_executed: '2026-08-20T11:10:00Z', ts_recorded: '2026-08-20T11:00:00Z' });
  const { violations } = findChangeRecordViolations([classTwoProposal(), o]);
  const v = violations.find((v) => /ts_recorded is before ts_executed/.test(v.reason));
  assert.ok(v);
});

test('RED: a supersession violation (correction carries a different change_id than it supersedes) is flagged', () => {
  const p1 = classTwoProposal();
  const badCorrection = classTwoProposal({ change_id: 'chg-1-typo', supersedes: 'chg-1' });
  const { violations } = findChangeRecordViolations([p1, badCorrection]);
  const v = violations.find((v) => v.property === 'form' && /supersedes/.test(v.reason));
  assert.ok(v);
});

// ---------------------------------------------------------------------------
// RED: Property 1 — change-backout-exercised
// ---------------------------------------------------------------------------

test('RED P1: backout.kind "described" is a claim, not evidence', () => {
  const p = classTwoProposal({ backout: { ...classTwoProposal().backout, kind: 'described' } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P1' && /described/.test(v.reason));
  assert.ok(v);
});

test('RED P1: exit_code !== 0 is flagged even though the backout ran', () => {
  const p = classTwoProposal({ backout: { ...classTwoProposal().backout, exit_code: 1 } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P1' && /exit_code/.test(v.reason));
  assert.ok(v);
});

test('RED P1: an empty run_ref is flagged', () => {
  const p = classTwoProposal({ backout: { ...classTwoProposal().backout, run_ref: '' } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P1' && /run_ref/.test(v.reason));
  assert.ok(v);
});

test('RED P1: exercised_against naming a different identity digest is flagged', () => {
  const p = classTwoProposal({ backout: { ...classTwoProposal().backout, exercised_against: 'deadbeef'.repeat(8) } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P1' && /different candidate/.test(v.reason));
  assert.ok(v);
});

test("RED: backout.kind 'apply-previous-module' (outside the vocabulary) is a form violation and is never credited as a backout", () => {
  const auth = authorizationClass0({ id: 'auth-strict2', pattern: 'k8s-strict2', criteria: { ...authorizationClass0().criteria, min_clean_instances: 0, backout_exercised: true } });
  const p = classTwoProposal({
    change_id: 'chg-strict2',
    pattern: 'k8s-strict2',
    class: { proposed: 0, authorization: 'auth-strict2' },
    backout: { ...classTwoProposal().backout, kind: 'apply-previous-module' },
  });
  const { violations } = findChangeRecordViolations([auth, p]);
  const formViolation = violations.find((v) => v.property === 'form' && /backout\.kind/.test(v.reason));
  assert.ok(formViolation);
  const p6Violation = violations.find((v) => v.property === 'P6' && /not credited/.test(v.reason));
  assert.ok(p6Violation);
});

// ---------------------------------------------------------------------------
// RED: Property 2 — release-artifact-integrity
// ---------------------------------------------------------------------------

test('RED P2: an empty artifact.identity is flagged', () => {
  const p = classTwoProposal({ artifact: { identity: [] } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P2' && /empty/.test(v.reason));
  assert.ok(v);
});

test('RED P2: an identity entry with neither sha256 nor value is flagged', () => {
  const p = classTwoProposal({ artifact: { identity: [{ name: 'rendered-manifest' }] } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P2' && /neither sha256 nor value/.test(v.reason));
  assert.ok(v);
});

test('RED P2: an identity entry whose sha256 does not match the recomputed digest is flagged (digests option)', () => {
  const p = classTwoProposal();
  const digests = { 'kube/rendered/prod.yaml': 'f'.repeat(64) }; // does not match IDENTITY's sha256 of 'a'.repeat(64)
  const { violations } = findChangeRecordViolations([p], { digests });
  const v = violations.find((v) => v.property === 'P2' && /does not match the recomputed digest/.test(v.reason));
  assert.ok(v);
});

test('a matching digest passes (digests option)', () => {
  const p = classTwoProposal();
  const digests = { 'kube/rendered/prod.yaml': 'a'.repeat(64) };
  const { violations } = findChangeRecordViolations([p, cleanOutcome()], { digests });
  assert.ok(!violations.some((v) => v.property === 'P2'));
});

// ---------------------------------------------------------------------------
// RED: Property 2 residual (e) — a value-only identity entry (Terraform's
// state_serial being the example, ADR-0013 section 2) must carry a real
// value: a non-empty string or a finite number. '' / null / undefined are
// each a form violation, not a silently-accepted placeholder.
// ---------------------------------------------------------------------------

test("RED P2: a value-only identity entry with value '' (empty string) is flagged", () => {
  const p = classTwoProposal({ artifact: { identity: [{ name: 'state_serial', value: '' }] } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P2' && /non-empty string or a finite number/.test(v.reason));
  assert.ok(v);
});

test('RED P2: a value-only identity entry with value null is flagged', () => {
  const p = classTwoProposal({ artifact: { identity: [{ name: 'state_serial', value: null }] } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P2' && /non-empty string or a finite number/.test(v.reason));
  assert.ok(v);
});

test('RED P2: a value-only identity entry with value undefined is flagged (falls to the neither-sha256-nor-value check)', () => {
  const p = classTwoProposal({ artifact: { identity: [{ name: 'state_serial', value: undefined }] } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P2');
  assert.ok(v);
});

test('a value-only identity entry with a finite number is not flagged', () => {
  const p = classTwoProposal({ artifact: { identity: [{ name: 'state_serial', value: 42 }] } });
  const { violations } = findChangeRecordViolations([p, cleanOutcome()]);
  assert.ok(!violations.some((v) => v.property === 'P2'));
});

test('a value-only identity entry with a non-empty string is not flagged', () => {
  const p = classTwoProposal({ artifact: { identity: [{ name: 'state_serial', value: 'v42' }] } });
  const { violations } = findChangeRecordViolations([p, cleanOutcome()]);
  assert.ok(!violations.some((v) => v.property === 'P2'));
});

// ---------------------------------------------------------------------------
// RED: Property 2 residual (c) — a present sha256 must match /^[0-9a-f]{64}$/;
// an invalid form (wrong length, wrong case, non-hex chars) is a P2 violation.
// ---------------------------------------------------------------------------

test('RED P2: a sha256 with invalid (non-hex) characters is flagged', () => {
  const p = classTwoProposal({ artifact: { identity: [{ name: 'rendered-manifest', sha256: 'not-a-valid-hex-string-at-all!!' }] } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P2' && /valid 64-char lowercase hex digest/.test(v.reason));
  assert.ok(v);
});

test('RED P2: a sha256 in the wrong case (uppercase) is flagged', () => {
  const p = classTwoProposal({ artifact: { identity: [{ name: 'rendered-manifest', sha256: 'A'.repeat(64) }] } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P2' && /valid 64-char lowercase hex digest/.test(v.reason));
  assert.ok(v);
});

test('RED P2: a sha256 of the wrong length is flagged', () => {
  const p = classTwoProposal({ artifact: { identity: [{ name: 'rendered-manifest', sha256: 'a'.repeat(63) }] } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P2' && /valid 64-char lowercase hex digest/.test(v.reason));
  assert.ok(v);
});

test('a well-formed 64-char lowercase hex sha256 is not flagged for form', () => {
  const p = classTwoProposal();
  const { violations } = findChangeRecordViolations([p, cleanOutcome()]);
  assert.ok(!violations.some((v) => v.property === 'P2' && /hex digest/.test(v.reason)));
});

// ---------------------------------------------------------------------------
// RED: Property 2 residual (b) — a path-bearing identity entry with sha256
// present must never silently skip an unusable path ('' or non-string); and
// an absolute path or one carrying a '..' segment is refused, matching the
// hook (ADR-0013) which already refuses both.
// ---------------------------------------------------------------------------

test("RED P2: an identity entry with sha256 present but path '' is flagged (never silently skipped)", () => {
  const p = classTwoProposal({ artifact: { identity: [{ name: 'rendered-manifest', path: '', sha256: 'a'.repeat(64) }] } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P2' && /empty or non-string path/.test(v.reason));
  assert.ok(v);
});

test('RED P2: an identity entry with sha256 present but a non-string path is flagged', () => {
  const p = classTwoProposal({ artifact: { identity: [{ name: 'rendered-manifest', path: 12345, sha256: 'a'.repeat(64) }] } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P2' && /empty or non-string path/.test(v.reason));
  assert.ok(v);
});

test("RED P2: an identity path with a '..' segment is flagged (the hook already refuses it)", () => {
  const p = classTwoProposal({ artifact: { identity: [{ name: 'rendered-manifest', path: '../x', sha256: 'a'.repeat(64) }] } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P2' && /absolute or escapes with/.test(v.reason));
  assert.ok(v);
});

test('RED P2: an absolute identity path is flagged (the hook already refuses it)', () => {
  const p = classTwoProposal({ artifact: { identity: [{ name: 'rendered-manifest', path: '/etc/passwd', sha256: 'a'.repeat(64) }] } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P2' && /absolute or escapes with/.test(v.reason));
  assert.ok(v);
});

test('RED P2: a Windows drive-letter absolute identity path is flagged', () => {
  const p = classTwoProposal({ artifact: { identity: [{ name: 'rendered-manifest', path: 'C:\\secrets\\prod.yaml', sha256: 'a'.repeat(64) }] } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P2' && /absolute or escapes with/.test(v.reason));
  assert.ok(v);
});

// ---------------------------------------------------------------------------
// RED: Property 3 — health-signal-fail-closed
// ---------------------------------------------------------------------------

test('RED P3: blast_radius.plan_diff not a subset of declared is flagged before any verdict is read', () => {
  const p = classTwoProposal({ blast_radius: { ...classTwoProposal().blast_radius, plan_diff: ['svc-a', 'svc-undeclared'] } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P3' && /under-declared radius/.test(v.reason));
  assert.ok(v);
});

test('RED P3: health_baseline.verdict does not equal the fold of its own signals (coercion)', () => {
  const base = classTwoProposal();
  const p = classTwoProposal({ health_baseline: { ...base.health_baseline, verdict: 'fail' } }); // signals fold to pass
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P3' && /health_baseline\.verdict/.test(v.reason));
  assert.ok(v);
});

test('RED P3: a not-in-scope signal whose outcome is not "not-in-scope" is flagged', () => {
  const base = classTwoProposal();
  const signals = base.health_baseline.signals.map((s) => (s.scope === 'not-in-scope' ? { ...s, outcome: 'pass' } : s));
  const p = classTwoProposal({ health_baseline: { ...base.health_baseline, signals } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P3' && /not-in-scope/.test(v.reason));
  assert.ok(v);
});

test('RED P3: a stale in-radius signal claiming a real outcome (not unevaluable) is flagged', () => {
  const base = classTwoProposal();
  const signals = base.health_baseline.signals.map((s) =>
    s.id === 'svc-a-error-rate' ? { ...s, last_sample_ts: '2026-08-20T08:00:00Z' } : s,
  );
  // verdict still 'pass' on the record, even though the fold now goes unevaluable — two distinct findings expected.
  const p = classTwoProposal({ health_baseline: { ...base.health_baseline, signals } });
  const { violations } = findChangeRecordViolations([p]);
  const stale = violations.find((v) => v.property === 'P3' && /stale/.test(v.reason));
  assert.ok(stale);
});

test('RED P3: health_baseline.window.to after ts_proposed is flagged', () => {
  const base = classTwoProposal();
  const p = classTwoProposal({ health_baseline: { ...base.health_baseline, window: { ...base.health_baseline.window, to: '2026-08-20T10:30:00Z' } } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P3' && /window\.to is after ts_proposed/.test(v.reason));
  assert.ok(v);
});

test('RED P3: outcome.health.verdict does not equal the fold of its own signals', () => {
  const base = cleanOutcome();
  const o = cleanOutcome({ health: { ...base.health, verdict: 'fail' } }); // signals fold to pass
  const { violations } = findChangeRecordViolations([classTwoProposal(), o]);
  const v = violations.find((v) => v.property === 'P3' && /outcome\.health\.verdict/.test(v.reason));
  assert.ok(v);
});

test('RED P3: outcome.health.window.from before ts_executed is flagged', () => {
  const base = cleanOutcome();
  const o = cleanOutcome({ health: { ...base.health, window: { ...base.health.window, from: '2026-08-20T10:30:00Z' } } });
  const { violations } = findChangeRecordViolations([classTwoProposal(), o]);
  const v = violations.find((v) => v.property === 'P3' && /window\.from is before ts_executed/.test(v.reason));
  assert.ok(v);
});

// ---------------------------------------------------------------------------
// RED: Property 3 coercion twins (skeptic finding a) — a health_baseline.verdict
// of "pass" must not survive when the fold of its own signals is unevaluable.
// ---------------------------------------------------------------------------

test('RED P3: a signal with a missing outcome + verdict pass is flagged (coercion)', () => {
  const base = classTwoProposal();
  const signals = base.health_baseline.signals.map((s) => {
    if (s.id !== 'svc-a-error-rate') return s;
    const { outcome, ...rest } = s;
    return rest;
  });
  const p = classTwoProposal({ health_baseline: { ...base.health_baseline, signals } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P3' && /health_baseline\.verdict/.test(v.reason));
  assert.ok(v);
});

test("RED P3: a signal with outcome 'ok' + verdict pass is flagged (coercion)", () => {
  const base = classTwoProposal();
  const signals = base.health_baseline.signals.map((s) => (s.id === 'svc-a-error-rate' ? { ...s, outcome: 'ok' } : s));
  const p = classTwoProposal({ health_baseline: { ...base.health_baseline, signals } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P3' && /health_baseline\.verdict/.test(v.reason));
  assert.ok(v);
});

test('RED P3: an empty evaluation window (window {}) + verdict pass is flagged (coercion)', () => {
  const base = classTwoProposal();
  const p = classTwoProposal({ health_baseline: { ...base.health_baseline, window: {} } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P3' && /health_baseline\.verdict/.test(v.reason));
  assert.ok(v);
});

test('RED P3: an unparseable last_sample_ts + verdict pass is flagged (coercion)', () => {
  const base = classTwoProposal();
  const signals = base.health_baseline.signals.map((s) => (s.id === 'svc-a-error-rate' ? { ...s, last_sample_ts: 'not-a-date' } : s));
  const p = classTwoProposal({ health_baseline: { ...base.health_baseline, signals } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P3' && /health_baseline\.verdict/.test(v.reason));
  assert.ok(v);
});

test('RED P3 (source absent): a signal with an absent source + verdict pass is flagged (coercion)', () => {
  const base = classTwoProposal();
  const signals = base.health_baseline.signals.map((s) => {
    if (s.id !== 'svc-a-error-rate') return s;
    const { source, ...rest } = s;
    return rest;
  });
  const p = classTwoProposal({ health_baseline: { ...base.health_baseline, signals } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P3' && /health_baseline\.verdict/.test(v.reason));
  assert.ok(v);
});

test('RED P3 (last_sample_ts absent, non-vacuity residual d): an in-radius signal with last_sample_ts ABSENT + verdict pass is flagged (coercion)', () => {
  const base = classTwoProposal();
  const signals = base.health_baseline.signals.map((s) => {
    if (s.id !== 'svc-a-error-rate') return s;
    const { last_sample_ts, ...rest } = s;
    return rest;
  });
  const p = classTwoProposal({ health_baseline: { ...base.health_baseline, signals } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P3' && /health_baseline\.verdict/.test(v.reason));
  assert.ok(v);
});

// ---------------------------------------------------------------------------
// RED: Property 3 form checks — window.from/to and per-signal required fields.
// ---------------------------------------------------------------------------

test('RED: a signal missing id is a form violation', () => {
  const base = classTwoProposal();
  const signals = base.health_baseline.signals.map((s) =>
    s.id === 'svc-a-error-rate' ? { scope: s.scope, outcome: s.outcome, source: s.source, last_sample_ts: s.last_sample_ts } : s,
  );
  const p = classTwoProposal({ health_baseline: { ...base.health_baseline, signals } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'form' && /missing id/.test(v.reason));
  assert.ok(v);
});

test('RED: an in-radius signal with outcome not-in-scope is a form violation', () => {
  const base = classTwoProposal();
  const signals = base.health_baseline.signals.map((s) => (s.id === 'svc-a-error-rate' ? { ...s, outcome: 'not-in-scope' } : s));
  const p = classTwoProposal({ health_baseline: { ...base.health_baseline, signals } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'form' && /in-radius but its outcome is not-in-scope/.test(v.reason));
  assert.ok(v);
});

test("RED (non-vacuity residual d): a signal missing source is asserted as property === 'form'", () => {
  const base = classTwoProposal();
  const signals = base.health_baseline.signals.map((s) => {
    if (s.id !== 'svc-a-error-rate') return s;
    const { source, ...rest } = s;
    return rest;
  });
  const p = classTwoProposal({ health_baseline: { ...base.health_baseline, signals } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => /missing a non-empty source/.test(v.reason));
  assert.ok(v);
  assert.equal(v.property, 'form');
});

test("RED (non-vacuity residual d): a signal with an unknown outcome string is asserted as property === 'form'", () => {
  const base = classTwoProposal();
  const signals = base.health_baseline.signals.map((s) => (s.id === 'svc-a-error-rate' ? { ...s, outcome: 'bogus-outcome' } : s));
  const p = classTwoProposal({ health_baseline: { ...base.health_baseline, signals } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => /outside pass\/fail\/unevaluable\/not-in-scope/.test(v.reason));
  assert.ok(v);
  assert.equal(v.property, 'form');
});

test("RED (non-vacuity residual d): a signal with an unknown scope string is asserted as property === 'form'", () => {
  const base = classTwoProposal();
  const signals = base.health_baseline.signals.map((s) => (s.id === 'svc-a-error-rate' ? { ...s, scope: 'bogus-scope' } : s));
  const p = classTwoProposal({ health_baseline: { ...base.health_baseline, signals } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => /invalid scope/.test(v.reason));
  assert.ok(v);
  assert.equal(v.property, 'form');
});

test('RED: health_baseline.window.to missing is a form violation', () => {
  const base = classTwoProposal();
  const p = classTwoProposal({ health_baseline: { ...base.health_baseline, window: { from: base.health_baseline.window.from } } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'form' && /window\.to is missing/.test(v.reason));
  assert.ok(v);
});

// ---------------------------------------------------------------------------
// RED: explicit-UTC-offset timestamps (skeptic finding c)
// ---------------------------------------------------------------------------

test('RED: a naive ts_proposed (no UTC offset) is flagged', () => {
  const p = classTwoProposal({ ts_proposed: '2026-08-20T10:00:00' });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'form' && /ts_proposed/.test(v.reason) && /offset/.test(v.reason));
  assert.ok(v);
});

test('RED: a naive window.from in health_baseline (no UTC offset) is flagged', () => {
  const base = classTwoProposal();
  const p = classTwoProposal({ health_baseline: { ...base.health_baseline, window: { from: '2026-08-20T09:00:00', to: base.health_baseline.window.to } } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'form' && /window\.from/.test(v.reason) && /offset/.test(v.reason));
  assert.ok(v);
});

test('RED: a naive last_sample_ts (no UTC offset) is flagged', () => {
  const base = classTwoProposal();
  const signals = base.health_baseline.signals.map((s) => (s.id === 'svc-a-error-rate' ? { ...s, last_sample_ts: '2026-08-20T09:50:00' } : s));
  const p = classTwoProposal({ health_baseline: { ...base.health_baseline, signals } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'form' && /last_sample_ts/.test(v.reason) && /offset/.test(v.reason));
  assert.ok(v);
});

// ---------------------------------------------------------------------------
// RED: non-vacuity residual (d) — the mutation run found these outcome-side
// naive-timestamp checks unpinned by any test (the code path already exists
// in checkOutcomeForm; these tests hold it there).
// ---------------------------------------------------------------------------

test('RED: a naive outcome ts_executed (no UTC offset) is flagged', () => {
  const o = cleanOutcome({ ts_executed: '2026-08-20T11:00:00' });
  const { violations } = findChangeRecordViolations([classTwoProposal(), o]);
  const v = violations.find((v) => v.property === 'form' && /ts_executed/.test(v.reason) && /offset/.test(v.reason));
  assert.ok(v);
});

test('RED: a naive outcome ts_recorded (no UTC offset) is flagged', () => {
  const o = cleanOutcome({ ts_recorded: '2026-08-20T11:10:00' });
  const { violations } = findChangeRecordViolations([classTwoProposal(), o]);
  const v = violations.find((v) => v.property === 'form' && /ts_recorded/.test(v.reason) && /offset/.test(v.reason));
  assert.ok(v);
});

// ---------------------------------------------------------------------------
// RED: Property 4 — post-implementation-probe
// ---------------------------------------------------------------------------

test('RED P4: an outcome probe with no negative control is flagged (imported from check-effect-probe)', () => {
  const o = cleanOutcome({ probe: { ...cleanOutcome().probe, controlRan: false } });
  const { violations } = findChangeRecordViolations([classTwoProposal(), o]);
  const v = violations.find((v) => v.property === 'P4' && /non-vacuity unproven/.test(v.reason));
  assert.ok(v);
});

test('RED P4: a vacuous outcome probe (control also passes) is flagged', () => {
  const o = cleanOutcome({ probe: { ...cleanOutcome().probe, controlPassed: true } });
  const { violations } = findChangeRecordViolations([classTwoProposal(), o]);
  const v = violations.find((v) => v.property === 'P4' && /vacuous/.test(v.reason));
  assert.ok(v);
});

test('RED P4: a proposal probe_plan missing a control is flagged as vacuous by design', () => {
  const p = classTwoProposal({ probe_plan: { claim: 'x', control: '' } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P4' && /probe_plan/.test(v.reason));
  assert.ok(v);
});

// ---------------------------------------------------------------------------
// RED: Property 5 — break-glass-on-record
// ---------------------------------------------------------------------------

test('RED P5: a break_glass record with an empty why is flagged', () => {
  const o = cleanOutcome({ break_glass: { who: 'oncall', when: '2026-08-20T11:00:00Z', why: '', command: 'kubectl apply -k .' } });
  const { violations } = findChangeRecordViolations([classTwoProposal(), o]);
  const v = violations.find((v) => v.property === 'P5' && /why/.test(v.reason));
  assert.ok(v);
});

test('RED P5: a break_glass record with an unparseable when is flagged', () => {
  const o = cleanOutcome({ break_glass: { who: 'oncall', when: 'last Tuesday', why: 'prod down', command: 'kubectl apply -k .' } });
  const { violations } = findChangeRecordViolations([classTwoProposal(), o]);
  const v = violations.find((v) => v.property === 'P5' && /when/.test(v.reason));
  assert.ok(v);
});

test('a fully-populated break_glass record is not flagged', () => {
  const o = cleanOutcome({ break_glass: { who: 'oncall', when: '2026-08-20T11:00:00Z', why: 'prod down', command: 'kubectl apply -k .' } });
  const { violations } = findChangeRecordViolations([classTwoProposal(), o]);
  assert.ok(!violations.some((v) => v.property === 'P5'));
});

test('RED P5: a break_glass record with a naive when (no UTC offset) is flagged', () => {
  const o = cleanOutcome({ break_glass: { who: 'oncall', when: '2026-08-20T11:00:00', why: 'prod down', command: 'kubectl apply -k .' } });
  const { violations } = findChangeRecordViolations([classTwoProposal(), o]);
  const v = violations.find((v) => v.property === 'P5' && /when/.test(v.reason));
  assert.ok(v);
});

test('RED P5: an outcome that executed onto an unevaluable baseline with no break-glass record is flagged', () => {
  const base = classTwoProposal();
  const p = classTwoProposal({
    health_baseline: { verdict: 'unevaluable', window: base.health_baseline.window, signals: [] },
  });
  const o = cleanOutcome({ break_glass: null });
  const { violations } = findChangeRecordViolations([p, o]);
  const v = violations.find((v) => v.property === 'P5' && /non-pass baseline \(unevaluable\) with no break-glass/.test(v.reason));
  assert.ok(v);
});

test('an outcome onto an unevaluable baseline WITH a break-glass record is not a P5 violation', () => {
  const base = classTwoProposal();
  const p = classTwoProposal({
    health_baseline: { verdict: 'unevaluable', window: base.health_baseline.window, signals: [] },
  });
  const o = cleanOutcome({ break_glass: { who: 'oncall', when: '2026-08-20T11:00:00Z', why: 'prod down', command: 'kubectl apply -k .' } });
  const { violations } = findChangeRecordViolations([p, o]);
  assert.ok(!violations.some((v) => v.property === 'P5' && /non-pass baseline/.test(v.reason)));
});

// ---------------------------------------------------------------------------
// RED: Property 5 residual (b) — the executed-onto-unevaluable check extends
// to ANY non-pass baseline (fail, not only unevaluable): if the hook would
// have refused a fail baseline too, an outcome that ran anyway with no
// break-glass record needs the same P5 finding.
// ---------------------------------------------------------------------------

test('RED P5: an outcome that executed onto a FAIL baseline with no break-glass record is flagged', () => {
  const base = classTwoProposal();
  const p = classTwoProposal({
    health_baseline: {
      verdict: 'fail',
      window: base.health_baseline.window,
      signals: [{ id: 'svc-a-error-rate', scope: 'in-radius', outcome: 'fail', source: 'prom', last_sample_ts: '2026-08-20T09:50:00Z' }],
    },
  });
  const o = cleanOutcome({ break_glass: null });
  const { violations } = findChangeRecordViolations([p, o]);
  const v = violations.find((v) => v.property === 'P5' && /non-pass baseline \(fail\) with no break-glass/.test(v.reason));
  assert.ok(v);
});

test('an outcome onto a FAIL baseline WITH a break-glass record is not a P5 non-pass-baseline violation', () => {
  const base = classTwoProposal();
  const p = classTwoProposal({
    health_baseline: {
      verdict: 'fail',
      window: base.health_baseline.window,
      signals: [{ id: 'svc-a-error-rate', scope: 'in-radius', outcome: 'fail', source: 'prom', last_sample_ts: '2026-08-20T09:50:00Z' }],
    },
  });
  const o = cleanOutcome({ break_glass: { who: 'oncall', when: '2026-08-20T11:00:00Z', why: 'prod down', command: 'kubectl apply -k .' } });
  const { violations } = findChangeRecordViolations([p, o]);
  assert.ok(!violations.some((v) => v.property === 'P5' && /non-pass baseline/.test(v.reason)));
});

// ---------------------------------------------------------------------------
// RED: Property 6 — change-class-earned
// ---------------------------------------------------------------------------

test('RED P6: a class-0/1 proposal whose citation does not resolve is effective class 2', () => {
  const p = classTwoProposal({ class: { proposed: 0, authorization: 'no-such-authorization' } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P6' && /effective class 2/.test(v.reason));
  assert.ok(v);
  assert.equal(effectiveClass([p], p), 2);
});

test('RED P6: a class-1 proposal with authorization null resolves to effective class 2', () => {
  const p = classTwoProposal({ class: { proposed: 1, authorization: null } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P6' && /effective class 2/.test(v.reason));
  assert.ok(v);
  assert.equal(effectiveClass([p], p), 2);
});

test('RED P6: authorization requires an exercised backout the proposal does not credit', () => {
  const auth = authorizationClass0({ id: 'auth-strict', pattern: 'k8s-strict', criteria: { ...authorizationClass0().criteria, min_clean_instances: 0, backout_exercised: true } });
  const p = classTwoProposal({
    change_id: 'chg-strict',
    pattern: 'k8s-strict',
    class: { proposed: 0, authorization: 'auth-strict' },
    backout: { ...classTwoProposal().backout, kind: 'described' },
  });
  const { violations } = findChangeRecordViolations([auth, p]);
  const v = violations.find((v) => v.property === 'P6' && /not credited/.test(v.reason));
  assert.ok(v);
});

test('RED P6: fewer clean instances than criteria.min_clean_instances is flagged', () => {
  const auth = authorizationClass0({ id: 'auth-needs-2', pattern: 'k8s-needs-2', criteria: { ...authorizationClass0().criteria, min_clean_instances: 2 } });
  const p = classTwoProposal({ change_id: 'chg-needs-2', pattern: 'k8s-needs-2', class: { proposed: 0, authorization: 'auth-needs-2' } });
  // zero prior clean instances recorded for this pattern
  const { violations } = findChangeRecordViolations([auth, p]);
  const v = violations.find((v) => v.property === 'P6' && /clean instances/.test(v.reason));
  assert.ok(v);
});

test('RED P6: class 0 proposed for a pattern whose latest prior outcome is misfire with no later reproof', () => {
  const auth = authorizationClass0({ id: 'auth-drift', pattern: 'k8s-drift', criteria: { ...authorizationClass0().criteria, min_clean_instances: 0, backout_exercised: false } });
  const p1 = classTwoProposal({ change_id: 'chg-d1', pattern: 'k8s-drift', ts_proposed: '2026-08-01T10:00:00Z', ts_recorded: '2026-08-01T10:05:00Z', class: { proposed: 0, authorization: 'auth-drift' } });
  const o1 = cleanOutcome({ change_id: 'chg-d1', ts_executed: '2026-08-01T11:00:00Z', ts_recorded: '2026-08-01T11:10:00Z', outcome: 'misfire' });
  const p2 = classTwoProposal({ change_id: 'chg-d2', pattern: 'k8s-drift', ts_proposed: '2026-08-05T10:00:00Z', ts_recorded: '2026-08-05T10:05:00Z', class: { proposed: 0, authorization: 'auth-drift' } });
  const { violations } = findChangeRecordViolations([auth, p1, o1, p2]);
  const v = violations.find((v) => v.property === 'P6' && /misfire with no later reproof/.test(v.reason));
  assert.ok(v);
  assert.equal(effectiveClass([auth, p1, o1, p2], p2), 1); // demoted, not refused outright
});

test('a reproof recorded after the misfire restores class 0 for the next proposal', () => {
  const auth = authorizationClass0({ id: 'auth-drift2', pattern: 'k8s-drift2', criteria: { ...authorizationClass0().criteria, min_clean_instances: 0, backout_exercised: false } });
  const p1 = classTwoProposal({ change_id: 'chg-e1', pattern: 'k8s-drift2', ts_proposed: '2026-08-01T10:00:00Z', ts_recorded: '2026-08-01T10:05:00Z', class: { proposed: 0, authorization: 'auth-drift2' } });
  const o1 = cleanOutcome({ change_id: 'chg-e1', ts_executed: '2026-08-01T11:00:00Z', ts_recorded: '2026-08-01T11:10:00Z', outcome: 'misfire' });
  const reproof = { kind: 'reproof', pattern: 'k8s-drift2', closure_id: 'closure-9', by: 'lead-sre', on: '2026-08-03' };
  const p2 = classTwoProposal({ change_id: 'chg-e2', pattern: 'k8s-drift2', ts_proposed: '2026-08-05T10:00:00Z', ts_recorded: '2026-08-05T10:05:00Z', class: { proposed: 0, authorization: 'auth-drift2' } });
  const records = [auth, p1, o1, reproof, p2];
  assert.equal(effectiveClass(records, p2), 0);
  const { violations } = findChangeRecordViolations(records);
  assert.ok(!violations.some((v) => v.property === 'P6' && /misfire/.test(v.reason)));
});

test('effectiveClass: a class-2 proposal is always effective class 2', () => {
  assert.equal(effectiveClass([], classTwoProposal()), 2);
});

test('effectiveClass: an unclassifiable proposed class fails closed to 2', () => {
  const p = classTwoProposal({ class: { proposed: 7, authorization: null } });
  assert.equal(effectiveClass([], p), 2);
});

test('effectiveClass: authorization pattern mismatch fails closed to 2', () => {
  const auth = authorizationClass1({ pattern: 'some-other-pattern' });
  const p = classTwoProposal({ class: { proposed: 1, authorization: 'auth-1-configmap-bump' }, pattern: 'k8s-configmap-bump' });
  assert.equal(effectiveClass([auth, p], p), 2);
});

test('effectiveClass: authorization class mismatch (cites a class-1 grant while proposing 0) fails closed to 2', () => {
  const auth = authorizationClass1();
  const p = classTwoProposal({ class: { proposed: 0, authorization: 'auth-1-configmap-bump' }, pattern: 'k8s-configmap-bump' });
  assert.equal(effectiveClass([auth, p], p), 2);
});

// ---------------------------------------------------------------------------
// RED: approval on a class-1 proposal, when present, must be complete
// ---------------------------------------------------------------------------

test('RED: an approval on a class-1 proposal missing who is a form violation', () => {
  const p = classTwoProposal({
    class: { proposed: 1, authorization: 'auth-1-configmap-bump' },
    pattern: 'k8s-configmap-bump',
    approval: { who: '', when: '2026-08-20T10:02:00Z', ref: 'slack://approval/1' },
  });
  const { violations } = findChangeRecordViolations([authorizationClass1(), p]);
  const v = violations.find((v) => v.property === 'form' && /approval/.test(v.reason) && /who/.test(v.reason));
  assert.ok(v);
});

test('RED: an approval on a class-1 proposal with an empty ref is a form violation', () => {
  const p = classTwoProposal({
    class: { proposed: 1, authorization: 'auth-1-configmap-bump' },
    pattern: 'k8s-configmap-bump',
    approval: { who: 'lead-sre', when: '2026-08-20T10:02:00Z', ref: '' },
  });
  const { violations } = findChangeRecordViolations([authorizationClass1(), p]);
  const v = violations.find((v) => v.property === 'form' && /approval/.test(v.reason) && /ref/.test(v.reason));
  assert.ok(v);
});

test('RED: a naive approval.when (no UTC offset) on a class-1 proposal is a form violation', () => {
  const p = classTwoProposal({
    class: { proposed: 1, authorization: 'auth-1-configmap-bump' },
    pattern: 'k8s-configmap-bump',
    approval: { who: 'lead-sre', when: '2026-08-20T10:02:00', ref: 'slack://approval/1' },
  });
  const { violations } = findChangeRecordViolations([authorizationClass1(), p]);
  const v = violations.find((v) => v.property === 'form' && /approval/.test(v.reason) && /offset/.test(v.reason));
  assert.ok(v);
});

test('RED (non-vacuity residual d): a class-1 proposal with approval.when ABSENT (key missing) is a form violation', () => {
  const p = classTwoProposal({
    class: { proposed: 1, authorization: 'auth-1-configmap-bump' },
    pattern: 'k8s-configmap-bump',
    approval: { who: 'lead-sre', ref: 'slack://approval/1' },
  });
  const { violations } = findChangeRecordViolations([authorizationClass1(), p]);
  const v = violations.find((v) => v.property === 'form' && /approval/.test(v.reason) && /when \(missing\)/.test(v.reason));
  assert.ok(v);
});

test('a fully-populated approval on a class-1 proposal is not flagged', () => {
  const p = classTwoProposal({
    class: { proposed: 1, authorization: 'auth-1-configmap-bump' },
    pattern: 'k8s-configmap-bump',
    approval: { who: 'lead-sre', when: '2026-08-20T10:02:00Z', ref: 'slack://approval/1' },
  });
  const { violations } = findChangeRecordViolations([authorizationClass1(), p, cleanOutcome()]);
  assert.ok(!violations.some((v) => /approval/.test(v.reason)));
});

// ---------------------------------------------------------------------------
// RED: Property 6 residual (a) — MATERIAL class-1 approval fail-open. A
// class-1 proposal with approval null/absent is clean while it is still
// pending (no outcome), but once it has EXECUTED, an incomplete approval is
// a P6 violation: the human sign-off never made it onto the record before
// the irreversible step ran.
// ---------------------------------------------------------------------------

test('RED P6: a class-1 proposal executed (has an outcome) with approval null is flagged', () => {
  const p = classTwoProposal({
    change_id: 'chg-noappr-null',
    class: { proposed: 1, authorization: 'auth-1-configmap-bump' },
    pattern: 'k8s-configmap-bump',
    approval: null,
  });
  const o = cleanOutcome({ change_id: 'chg-noappr-null' });
  const { violations } = findChangeRecordViolations([authorizationClass1(), p, o]);
  const v = violations.find((v) => v.property === 'P6' && /executed at class 1 with no complete approval on record/.test(v.reason));
  assert.ok(v);
});

test('RED P6: a class-1 proposal executed (has an outcome) with the approval key absent is flagged', () => {
  const p = classTwoProposal({
    change_id: 'chg-noappr-absent',
    class: { proposed: 1, authorization: 'auth-1-configmap-bump' },
    pattern: 'k8s-configmap-bump',
  });
  delete p.approval;
  const o = cleanOutcome({ change_id: 'chg-noappr-absent' });
  const { violations } = findChangeRecordViolations([authorizationClass1(), p, o]);
  const v = violations.find((v) => v.property === 'P6' && /executed at class 1 with no complete approval on record/.test(v.reason));
  assert.ok(v);
});

test('a class-1 proposal with approval null and NO outcome yet stays clean - it is pending, not executed', () => {
  const p = classTwoProposal({
    change_id: 'chg-pending',
    class: { proposed: 1, authorization: 'auth-1-configmap-bump' },
    pattern: 'k8s-configmap-bump',
    approval: null,
  });
  const { violations } = findChangeRecordViolations([authorizationClass1(), p]);
  assert.ok(!violations.some((v) => v.property === 'P6' && /approval/.test(v.reason)));
});

// ---------------------------------------------------------------------------
// RED: Property 6 residual (a) — MATERIAL effective class computed AS OF
// EXECUTION. A class-0 instance's own outcome being a misfire must not
// retroactively demote its OWN proposal (the outcome-loop's approval check
// would otherwise misread it as class 1 and flag a missing approval it never
// needed). The misfire is still recorded and still demotes a LATER proposal
// for the same pattern.
// ---------------------------------------------------------------------------

test('RED P6: a class-0 proposal (approval null) whose own outcome is misfire produces no approval P6 line', () => {
  const auth = authorizationClass0({
    id: 'auth-selfmisfire',
    pattern: 'k8s-selfmisfire',
    criteria: { ...authorizationClass0().criteria, min_clean_instances: 0, backout_exercised: false },
  });
  const p = classTwoProposal({
    change_id: 'chg-selfmisfire',
    pattern: 'k8s-selfmisfire',
    class: { proposed: 0, authorization: 'auth-selfmisfire' },
    approval: null,
  });
  const o = cleanOutcome({ change_id: 'chg-selfmisfire', outcome: 'misfire' });
  const { violations } = findChangeRecordViolations([auth, p, o]);
  assert.ok(!violations.some((v) => v.property === 'P6' && /no complete approval on record/.test(v.reason)));
  assert.equal(effectiveClass([auth, p, o], p, o.ts_executed), 0); // not demoted by its own outcome

  // The misfire is still recorded: a LATER proposal for the same pattern is
  // demoted as before.
  const p2 = classTwoProposal({
    change_id: 'chg-selfmisfire-2',
    pattern: 'k8s-selfmisfire',
    ts_proposed: '2026-08-21T10:00:00Z',
    ts_recorded: '2026-08-21T10:05:00Z',
    class: { proposed: 0, authorization: 'auth-selfmisfire' },
  });
  assert.equal(effectiveClass([auth, p, o, p2], p2), 1);
});

// ---------------------------------------------------------------------------
// earnedClassEvidence
// ---------------------------------------------------------------------------

test('earnedClassEvidence: counts clean instances, credited backouts, and non-vacuous probes for a pattern', () => {
  const ledger = cleanMixedLedger();
  const ev = earnedClassEvidence(ledger, 'k8s-loglevel-bump', '2026-08-15T10:00:00Z');
  assert.equal(ev.cleanInstances, 2); // chg-p1, chg-p2 recorded before the cutoff; chg-p3 is the instance being evaluated
  assert.equal(ev.backoutsExercised, 3); // all three proposals in the pattern credit a backout
  assert.equal(ev.nonvacuousProbes, 3);
});

test('earnedClassEvidence: a misfire outcome does not count as a clean instance', () => {
  const auth = authorizationClass0({ id: 'auth-x', pattern: 'k8s-x' });
  const p1 = classTwoProposal({ change_id: 'chg-x1', pattern: 'k8s-x', class: { proposed: 0, authorization: 'auth-x' } });
  const o1 = cleanOutcome({ change_id: 'chg-x1', outcome: 'misfire' });
  const ev = earnedClassEvidence([auth, p1, o1], 'k8s-x');
  assert.equal(ev.cleanInstances, 0);
});

test('earnedClassEvidence: a vacuous probe does not count toward clean instances or non-vacuous probes', () => {
  const p1 = classTwoProposal({ change_id: 'chg-y1', pattern: 'k8s-y' });
  const o1 = cleanOutcome({ change_id: 'chg-y1', probe: { ...cleanOutcome().probe, controlRan: false } });
  const ev = earnedClassEvidence([p1, o1], 'k8s-y');
  assert.equal(ev.cleanInstances, 0);
  assert.equal(ev.nonvacuousProbes, 0);
});

// ---------------------------------------------------------------------------
// Three-outcome separation: unevaluable is not a violation
// ---------------------------------------------------------------------------

test('a proposal alone with an honestly unevaluable baseline (zero in-radius signals) is unevaluable, not a violation', () => {
  const base = classTwoProposal();
  const p = classTwoProposal({
    health_baseline: {
      verdict: 'unevaluable',
      window: base.health_baseline.window,
      signals: [{ id: 'svc-c-error-rate', scope: 'not-in-scope', outcome: 'not-in-scope', source: 'prom', last_sample_ts: '2026-08-20T09:50:00Z' }],
    },
  });
  const { violations, unevaluable } = findChangeRecordViolations([p]);
  assert.deepEqual(violations, []);
  assert.deepEqual(unevaluable, ['chg-1']);
});

test('an outcome with health.verdict unevaluable and no break_glass is unevaluable, not a violation', () => {
  const o = cleanOutcome({
    health: {
      verdict: 'unevaluable',
      window: { from: '2026-08-20T11:00:00Z', to: '2026-08-20T11:30:00Z' },
      signals: [],
    },
  });
  const { violations, unevaluable } = findChangeRecordViolations([classTwoProposal(), o]);
  assert.deepEqual(violations, []);
  assert.deepEqual(unevaluable, ['chg-1']);
});

test('a break_glass record on an unevaluable outcome takes it out of the unevaluable channel entirely', () => {
  const o = cleanOutcome({
    health: { verdict: 'unevaluable', window: { from: '2026-08-20T11:00:00Z', to: '2026-08-20T11:30:00Z' }, signals: [] },
    break_glass: { who: 'oncall', when: '2026-08-20T11:00:00Z', why: 'prod down', command: 'kubectl apply -k .' },
  });
  const { unevaluable } = findChangeRecordViolations([classTwoProposal(), o]);
  assert.deepEqual(unevaluable, []);
});

test('open unevaluable in one change does not mask a violation in another', () => {
  const unevalProposal = classTwoProposal({
    change_id: 'chg-uneval',
    health_baseline: {
      verdict: 'unevaluable',
      window: classTwoProposal().health_baseline.window,
      signals: [],
    },
  });
  const badProposal = classTwoProposal({ change_id: 'chg-bad', backout: { ...classTwoProposal().backout, kind: 'described' } });
  const { violations, unevaluable } = findChangeRecordViolations([unevalProposal, badProposal]);
  assert.equal(unevaluable.length, 1);
  assert.ok(violations.some((v) => v.property === 'P1'));
});

// ---------------------------------------------------------------------------
// parseChangeLog re-export
// ---------------------------------------------------------------------------

test('parseChangeLog parses JSONL and skips blank lines', () => {
  const text = `${JSON.stringify(classTwoProposal())}\n\n${JSON.stringify(cleanOutcome())}\n`;
  const records = parseChangeLog(text);
  assert.equal(records.length, 2);
  assert.equal(records[0].kind, 'proposal');
});

test('KINDS exports the four record kinds', () => {
  assert.deepEqual(KINDS, ['proposal', 'outcome', 'authorization', 'reproof']);
});

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function runCli(args, opts = {}) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', ...opts });
}

test('CLI: an empty log passes vacuously with exit 0', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rigor-change-record-'));
  try {
    const file = join(dir, 'change-log.jsonl');
    writeFileSync(file, '');
    const res = runCli([file]);
    assert.equal(res.status, 0);
    assert.match(res.stdout, /VACUOUS/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI: a clean log exits 0 and reports the record count', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rigor-change-record-'));
  try {
    // The fixture's artifact.identity carries a path-bearing entry (residual
    // f: a missing path is now UNEVALUABLE, not silently clean), so the
    // manifest must actually exist under --root for this to reach "clean".
    const manifestPath = join(dir, 'kube', 'rendered');
    mkdirSync(manifestPath, { recursive: true });
    const manifestFile = join(manifestPath, 'prod.yaml');
    writeFileSync(manifestFile, 'kind: Deployment\n');
    const realSha = createHash('sha256').update(readFileSync(manifestFile)).digest('hex');
    const identity = [{ name: 'rendered-manifest', path: 'kube/rendered/prod.yaml', sha256: realSha }];
    const digestForBackout = identityDigest(identity);
    const p = classTwoProposal({ artifact: { identity }, backout: { ...classTwoProposal().backout, exercised_against: digestForBackout } });

    const file = join(dir, 'change-log.jsonl');
    const lines = [p, cleanOutcome()].map((r) => JSON.stringify(r)).join('\n') + '\n';
    writeFileSync(file, lines);
    const res = runCli([file, '--root', dir]);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /change-record: clean \(2 records\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI: a violation exits 1 with a CHANGE-RECORD FAIL line naming the property', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rigor-change-record-'));
  try {
    const file = join(dir, 'change-log.jsonl');
    const bad = classTwoProposal({ backout: { ...classTwoProposal().backout, kind: 'described' } });
    writeFileSync(file, JSON.stringify(bad) + '\n');
    const res = runCli([file]);
    assert.equal(res.status, 1);
    assert.match(res.stderr, /CHANGE-RECORD FAIL proposal chg-1 \[P1\]/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI: an honest unevaluable log with no violations exits 2', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rigor-change-record-'));
  try {
    const file = join(dir, 'change-log.jsonl');
    const p = classTwoProposal({
      health_baseline: { verdict: 'unevaluable', window: classTwoProposal().health_baseline.window, signals: [] },
    });
    writeFileSync(file, JSON.stringify(p) + '\n');
    const res = runCli([file]);
    assert.equal(res.status, 2);
    assert.match(res.stderr, /UNEVALUABLE/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI: --root recomputes identity digests from disk and passes on a matching hash', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rigor-change-record-'));
  try {
    const manifestPath = join(dir, 'kube', 'rendered');
    mkdirSync(manifestPath, { recursive: true });
    const manifestFile = join(manifestPath, 'prod.yaml');
    writeFileSync(manifestFile, 'kind: Deployment\n');
    const realSha = createHash('sha256').update(readFileSync(manifestFile)).digest('hex');

    const identity = [{ name: 'rendered-manifest', path: 'kube/rendered/prod.yaml', sha256: realSha }];
    const digestForBackout = identityDigest(identity);
    const p = classTwoProposal({ artifact: { identity }, backout: { ...classTwoProposal().backout, exercised_against: digestForBackout } });
    const o = cleanOutcome();

    const file = join(dir, 'change-log.jsonl');
    writeFileSync(file, [p, o].map((r) => JSON.stringify(r)).join('\n') + '\n');
    const res = runCli([file, '--root', dir]);
    assert.equal(res.status, 0, res.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI: --root recomputes identity digests and fails on a mismatch', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rigor-change-record-'));
  try {
    const manifestPath = join(dir, 'kube', 'rendered');
    mkdirSync(manifestPath, { recursive: true });
    const manifestFile = join(manifestPath, 'prod.yaml');
    writeFileSync(manifestFile, 'kind: Deployment\n');

    // sha256 in the record is stale/wrong relative to the file on disk.
    const p = classTwoProposal();
    const o = cleanOutcome();
    const file = join(dir, 'change-log.jsonl');
    writeFileSync(file, [p, o].map((r) => JSON.stringify(r)).join('\n') + '\n');
    const res = runCli([file, '--root', dir]);
    assert.equal(res.status, 1);
    assert.match(res.stderr, /\[P2\]/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// RED: CLI residual (f) — a path-bearing identity entry whose file is
// missing under --root is UNEVALUABLE, never 'clean'. Before this fix the
// missing path was merely noted ("not hashed") and the digest-mismatch check
// was silently skipped (no entry in `digests`), so the run exited 0 clean -
// an unrecomputable identity was fail-open verified.
// ---------------------------------------------------------------------------

test('RED CLI: a missing identity path under --root is UNEVALUABLE (exit 2), never clean', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rigor-change-record-'));
  try {
    const file = join(dir, 'change-log.jsonl');
    writeFileSync(file, [classTwoProposal(), cleanOutcome()].map((r) => JSON.stringify(r)).join('\n') + '\n');
    const res = runCli([file, '--root', dir]); // no kube/rendered/prod.yaml under dir
    assert.equal(res.status, 2, `expected exit 2 (unevaluable), got ${res.status}. stdout=${res.stdout} stderr=${res.stderr}`);
    assert.match(res.stdout, /cannot hash kube\/rendered\/prod\.yaml - unevaluable/);
    assert.doesNotMatch(res.stdout, /change-record: clean/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// RED: CLI residual (b) — a path-bearing identity entry that EXISTS but is
// unreadable (a directory sitting where a file is expected) must be
// UNEVALUABLE, never a crash with a stack trace and a bare exit 1.
// ---------------------------------------------------------------------------

test('RED CLI: a directory at the identity path is UNEVALUABLE (exit 2), not a crash', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rigor-change-record-'));
  try {
    // A directory sits where the record's path expects a file.
    mkdirSync(join(dir, 'kube', 'rendered', 'prod.yaml'), { recursive: true });
    const file = join(dir, 'change-log.jsonl');
    writeFileSync(file, [classTwoProposal(), cleanOutcome()].map((r) => JSON.stringify(r)).join('\n') + '\n');
    const res = runCli([file, '--root', dir]);
    assert.equal(res.status, 2, `expected exit 2, got ${res.status}. stdout=${res.stdout} stderr=${res.stderr}`);
    assert.match(res.stdout, /cannot hash kube\/rendered\/prod\.yaml - unevaluable/);
    assert.doesNotMatch(res.stderr, /\bat .*\.mjs:\d+/); // no stack trace leaked to stderr
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// RED: CLI residual (b) — only a NON-superseded proposal's identity paths are
// collected for hashing; a corrected (superseded) proposal's stale path must
// never be hashed or reported, even if it no longer exists on disk.
// ---------------------------------------------------------------------------

test('RED CLI: a superseded proposal contributes no identity paths - only the correcting proposal is hashed', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rigor-change-record-'));
  try {
    const manifestPath = join(dir, 'kube', 'rendered');
    mkdirSync(manifestPath, { recursive: true });
    const manifestFile = join(manifestPath, 'prod.yaml');
    writeFileSync(manifestFile, 'kind: Deployment\n');
    const realSha = createHash('sha256').update(readFileSync(manifestFile)).digest('hex');

    const staleIdentity = [{ name: 'rendered-manifest', path: 'kube/rendered/does-not-exist.yaml', sha256: 'a'.repeat(64) }];
    const original = classTwoProposal({ artifact: { identity: staleIdentity } });

    const goodIdentity = [{ name: 'rendered-manifest', path: 'kube/rendered/prod.yaml', sha256: realSha }];
    const digestForBackout = identityDigest(goodIdentity);
    const correction = classTwoProposal({
      supersedes: 'chg-1',
      // Same ts_proposed as the original: the correction fixes a stale
      // identity path, not when the change was originally proposed (a later
      // ts_proposed here would make this live proposal look post-hoc against
      // the outcome's ts_executed - a different, unrelated check, (a)).
      ts_proposed: '2026-08-20T10:00:00Z',
      ts_recorded: '2026-08-21T10:05:00Z',
      artifact: { identity: goodIdentity },
      backout: { ...classTwoProposal().backout, exercised_against: digestForBackout },
    });

    const file = join(dir, 'change-log.jsonl');
    writeFileSync(file, [original, correction, cleanOutcome()].map((r) => JSON.stringify(r)).join('\n') + '\n');
    const res = runCli([file, '--root', dir]);
    assert.equal(res.status, 0, `expected clean, got status=${res.status} stdout=${res.stdout} stderr=${res.stderr}`);
    assert.doesNotMatch(res.stdout, /does-not-exist\.yaml/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI: no argument prints usage and exits 1', () => {
  const res = runCli([]);
  assert.equal(res.status, 1);
  assert.match(res.stderr, /usage/);
});

// ---------------------------------------------------------------------------
// RED (a): an outcome whose ts_executed is before its (non-superseded)
// proposal's ts_proposed is a form violation - a post-hoc proposal (the
// proposal record was backfilled after the change already ran).
// ---------------------------------------------------------------------------

test('RED (a): an outcome executed before its proposal was proposed is a form violation', () => {
  const p = classTwoProposal({ ts_proposed: '2026-08-20T12:00:00Z', ts_recorded: '2026-08-20T12:05:00Z' });
  const o = cleanOutcome({ ts_executed: '2026-08-20T11:00:00Z', ts_recorded: '2026-08-20T13:00:00Z' });
  const { violations } = findChangeRecordViolations([p, o]);
  const v = violations.find((v) => v.property === 'form' && /post-hoc proposal/.test(v.reason));
  assert.ok(v);
  assert.match(v.reason, /outcome executed before its proposal was proposed/);
});

test('(a) negative control: an outcome executed after ts_proposed is not flagged post-hoc', () => {
  const { violations } = findChangeRecordViolations([classTwoProposal(), cleanOutcome()]);
  assert.ok(!violations.some((v) => /post-hoc proposal/.test(v.reason)));
});

test('(a) a superseded (corrected) proposal never anchors the post-hoc check - only the live proposal does', () => {
  // The original proposal was proposed late (after the outcome executed); a
  // correction fixes ts_proposed to an earlier, honest time. Only the live
  // (correcting) proposal's ts_proposed should be checked.
  const original = classTwoProposal({ ts_proposed: '2026-08-20T12:00:00Z', ts_recorded: '2026-08-20T12:05:00Z' });
  const correction = classTwoProposal({
    supersedes: 'chg-1',
    ts_proposed: '2026-08-20T09:00:00Z',
    ts_recorded: '2026-08-20T12:10:00Z',
  });
  const o = cleanOutcome({ ts_executed: '2026-08-20T11:00:00Z', ts_recorded: '2026-08-20T11:10:00Z' });
  const { violations } = findChangeRecordViolations([original, correction, o]);
  assert.ok(!violations.some((v) => /post-hoc proposal/.test(v.reason)));
});

// ---------------------------------------------------------------------------
// RED (b): a sha256-bearing identity entry with NO path key at all (not just
// an empty/invalid one) is unrecomputable and must be a P2 violation, outside
// the hasOwnProperty(path) guard that only checked entries carrying a path.
// ---------------------------------------------------------------------------

test('RED (b): a sha256-bearing identity entry with no path key is a P2 violation', () => {
  const p = classTwoProposal({ artifact: { identity: [{ name: 'rendered-manifest', sha256: 'a'.repeat(64) }] } });
  const { violations } = findChangeRecordViolations([p]);
  const v = violations.find((v) => v.property === 'P2' && /sha256 without a path is unrecomputable/.test(v.reason));
  assert.ok(v);
});

test('RED (b) CLI: a sha256-bearing identity entry with no path key exits non-zero', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rigor-change-record-'));
  try {
    const file = join(dir, 'change-log.jsonl');
    const p = classTwoProposal({ artifact: { identity: [{ name: 'rendered-manifest', sha256: 'a'.repeat(64) }] } });
    writeFileSync(file, JSON.stringify(p) + '\n');
    const res = runCli([file]);
    assert.notEqual(res.status, 0);
    assert.match(res.stderr, /\[P2\]/);
    assert.match(res.stderr, /sha256 without a path is unrecomputable/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('(b) negative control: a value-only identity entry (no sha256, no path) is not flagged by the no-path P2 check', () => {
  const p = classTwoProposal({ artifact: { identity: [{ name: 'state_serial', value: 42 }] } });
  const { violations } = findChangeRecordViolations([p, cleanOutcome()]);
  assert.ok(!violations.some((v) => /sha256 without a path is unrecomputable/.test(v.reason)));
});

// ---------------------------------------------------------------------------
// RED (c): a second non-superseding outcome for the same change_id is a form
// violation, mirroring the proposal duplicate-change_id check.
// ---------------------------------------------------------------------------

test('RED (c): a second non-superseding outcome for the same change_id is flagged as a duplicate outcome', () => {
  const p = classTwoProposal();
  const o1 = cleanOutcome();
  const o2 = cleanOutcome({ ts_executed: '2026-08-21T11:00:00Z', ts_recorded: '2026-08-21T11:10:00Z' });
  const { violations } = findChangeRecordViolations([p, o1, o2]);
  const v = violations.find((v) => v.property === 'form' && /duplicate outcome/.test(v.reason));
  assert.ok(v);
  assert.match(v.reason, /a second original outcome cannot reuse change_id chg-1/);
  assert.match(v.reason, /use supersedes for a correction/);
});

test('(c) a supersession correction of an outcome re-using the same change_id is NOT a duplicate, and the unevaluable channel reads only the single valid (correcting) outcome', () => {
  const p = classTwoProposal();
  // The original outcome is honestly unevaluable (would otherwise open the
  // unevaluable channel for chg-1); the correction reports a clean, fully
  // pass health record. Only the correcting outcome should be read.
  const original = cleanOutcome({
    health: { verdict: 'unevaluable', window: { from: '2026-08-20T11:00:00Z', to: '2026-08-20T11:30:00Z' }, signals: [] },
  });
  const correction = cleanOutcome({
    supersedes: 'chg-1',
    ts_executed: '2026-08-20T11:00:00Z',
    ts_recorded: '2026-08-21T09:00:00Z',
  });
  const { violations, unevaluable } = findChangeRecordViolations([p, original, correction]);
  assert.ok(!violations.some((v) => /duplicate outcome/.test(v.reason)));
  assert.deepEqual(unevaluable, []);
});

// ---------------------------------------------------------------------------
// RED (d): effectiveClass - a cited authorization that fails the
// authorization form check (granted_by, granted_on, criteria missing or
// malformed) is unresolved -> effective class 2, same as a missing/mismatched
// citation. The proposal's P6 reason still reads 'effective class 2'.
// ---------------------------------------------------------------------------

test('RED (d): a cited authorization missing granted_by resolves to effective class 2', () => {
  const auth = authorizationClass1();
  delete auth.granted_by;
  const p = classTwoProposal({ class: { proposed: 1, authorization: 'auth-1-configmap-bump' }, pattern: 'k8s-configmap-bump' });
  assert.equal(effectiveClass([auth, p], p), 2);
  const { violations } = findChangeRecordViolations([auth, p]);
  const v = violations.find((v) => v.property === 'P6' && /effective class 2/.test(v.reason));
  assert.ok(v);
});

test('RED (d): a cited authorization missing granted_on resolves to effective class 2', () => {
  const auth = authorizationClass1();
  delete auth.granted_on;
  const p = classTwoProposal({ class: { proposed: 1, authorization: 'auth-1-configmap-bump' }, pattern: 'k8s-configmap-bump' });
  assert.equal(effectiveClass([auth, p], p), 2);
});

test('RED (d): a cited authorization with malformed criteria (min_clean_instances not a number) resolves to effective class 2', () => {
  const auth = authorizationClass1({ criteria: { ...authorizationClass1().criteria, min_clean_instances: 'two' } });
  const p = classTwoProposal({ class: { proposed: 1, authorization: 'auth-1-configmap-bump' }, pattern: 'k8s-configmap-bump' });
  assert.equal(effectiveClass([auth, p], p), 2);
});

test('RED (d): a cited authorization with criteria missing entirely resolves to effective class 2', () => {
  const auth = authorizationClass1();
  delete auth.criteria;
  const p = classTwoProposal({ class: { proposed: 1, authorization: 'auth-1-configmap-bump' }, pattern: 'k8s-configmap-bump' });
  assert.equal(effectiveClass([auth, p], p), 2);
});

test('(d) negative control: a well-formed cited authorization still resolves normally', () => {
  const auth = authorizationClass1();
  const p = classTwoProposal({ class: { proposed: 1, authorization: 'auth-1-configmap-bump' }, pattern: 'k8s-configmap-bump' });
  assert.equal(effectiveClass([auth, p], p), 1);
});
