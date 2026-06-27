import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findVacuousProbes } from '../scripts/check-effect-probe.mjs';

test('a probe that passes with a control that fails is credited (not flagged)', () => {
  const recs = [{ claim: 'service serves real output', probePassed: true, controlRan: true, controlPassed: false }];
  assert.deepEqual(findVacuousProbes(recs), []);
});

test('a missing negative control is flagged as non-vacuity unproven', () => {
  const recs = [{ claim: 'migration applied', probePassed: true, controlRan: false, controlPassed: false }];
  assert.deepEqual(findVacuousProbes(recs), [
    { claim: 'migration applied', reason: 'no negative control — non-vacuity unproven' },
  ]);
});

test('a control that also passes is flagged as vacuous', () => {
  const recs = [{ claim: 'deploy is live', probePassed: true, controlRan: true, controlPassed: true }];
  assert.deepEqual(findVacuousProbes(recs), [
    { claim: 'deploy is live', reason: 'vacuous — probe passes with the effect absent' },
  ]);
});

test('a probe that did not pass is flagged as effect not demonstrated', () => {
  const recs = [{ claim: 'rollout healthy', probePassed: false, controlRan: true, controlPassed: false }];
  assert.deepEqual(findVacuousProbes(recs), [
    { claim: 'rollout healthy', reason: 'probe did not pass — effect not demonstrated' },
  ]);
});

test('mixes credited and vacuous, returning only the bad subset', () => {
  const good = { claim: 'good', probePassed: true, controlRan: true, controlPassed: false };
  const vacuous = { claim: 'vacuous', probePassed: true, controlRan: true, controlPassed: true };
  assert.deepEqual(findVacuousProbes([good, vacuous]), [
    { claim: 'vacuous', reason: 'vacuous — probe passes with the effect absent' },
  ]);
});

test('empty list is clean', () => {
  assert.deepEqual(findVacuousProbes([]), []);
});
