import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findFingerprints } from '../scripts/check-surface-scrub.mjs';

test('flags project fingerprints', () => {
  assert.deepEqual(findFingerprints('see the ATLAS gate and COMPASS consumer').sort(),
    ['ATLAS', 'COMPASS']);
});
test('flags case-insensitively', () => {
  assert.ok(findFingerprints('compiled with ke-cli').includes('ke-cli'));
});
test('clean domain-neutral text passes', () => {
  assert.deepEqual(findFingerprints('a verdict claims the suite passes; re-run it.'), []);
});
