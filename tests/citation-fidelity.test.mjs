import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findBrokenCitations, loadSource } from '../scripts/check-citation-fidelity.mjs';

test('a present identifier passes (not flagged)', () => {
  const cites = [{ identifier: 'R29', source: 'Rule R29 governs ACH settlement windows.' }];
  assert.deepEqual(findBrokenCitations(cites), []);
});

test('an absent identifier is flagged as broken', () => {
  const cites = [{ identifier: 'R31', source: 'Rule R29 governs ACH settlement windows.' }];
  assert.deepEqual(findBrokenCitations(cites), cites);
});

test('matching is case-sensitive', () => {
  const cites = [{ identifier: 'OFAC', source: 'the ofac screening step is required' }];
  assert.deepEqual(findBrokenCitations(cites), cites);
});

test('mixes present and absent, returning only the broken subset', () => {
  const present = { identifier: 'R10', source: 'R10 and R11 set the date window.' };
  const broken = { identifier: 'R99', source: 'R10 and R11 set the date window.' };
  assert.deepEqual(findBrokenCitations([present, broken]), [broken]);
});

test('empty list is clean', () => {
  assert.deepEqual(findBrokenCitations([]), []);
});

test('loadSource reads a temp file as utf8', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rigor-cite-'));
  try {
    const f = join(dir, 'src.txt');
    writeFileSync(f, 'velocity limit clause R7', 'utf8');
    assert.equal(loadSource(f), 'velocity limit clause R7');
  } finally { rmSync(dir, { recursive: true }); }
});
