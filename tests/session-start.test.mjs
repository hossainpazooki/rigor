import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildContext, computeHomeRulesPresent } from '../hooks/session-start.mjs';

const POINTER = 'using-rigor';

test('always includes the toolkit pointer', () => {
  const out = buildContext({ homeRulesPresent: true, vendoredRules: 'RULES' });
  assert.match(out, new RegExp(POINTER));
});
test('injects vendored rules when ~/.claude/rules is absent', () => {
  const out = buildContext({ homeRulesPresent: false, vendoredRules: 'VENDORED_BODY' });
  assert.match(out, /VENDORED_BODY/);
});
test('does NOT inject vendored rules when present (no double-load)', () => {
  const out = buildContext({ homeRulesPresent: true, vendoredRules: 'VENDORED_BODY' });
  assert.doesNotMatch(out, /VENDORED_BODY/);
});

// Tests for the new computeHomeRulesPresent helper (findings #9, #21)

test('computeHomeRulesPresent returns false when dir does not exist', () => {
  assert.equal(computeHomeRulesPresent('/no/such/directory/xyz-nonexistent'), false);
});

test('computeHomeRulesPresent returns false when dir exists but is empty', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rigor-test-'));
  try {
    assert.equal(computeHomeRulesPresent(dir), false);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('computeHomeRulesPresent returns false when dir has only PROVENANCE.md', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rigor-test-'));
  try {
    writeFileSync(join(dir, 'PROVENANCE.md'), 'provenance');
    assert.equal(computeHomeRulesPresent(dir), false);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('computeHomeRulesPresent returns false when dir has personal rules but NOT the rigor sentinel', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rigor-test-'));
  try {
    writeFileSync(join(dir, 'my-rules.md'), '# my rules');
    writeFileSync(join(dir, 'git.md'), '# git rules');
    assert.equal(computeHomeRulesPresent(dir), false);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('computeHomeRulesPresent returns true when the rigor sentinel is present', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rigor-test-'));
  try {
    writeFileSync(join(dir, 'verification-and-honesty.md'), '# sentinel');
    assert.equal(computeHomeRulesPresent(dir), true);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('computeHomeRulesPresent returns true when sentinel is present alongside personal rules', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rigor-test-'));
  try {
    writeFileSync(join(dir, 'my-rules.md'), '# my rules');
    writeFileSync(join(dir, 'verification-and-honesty.md'), '# sentinel');
    assert.equal(computeHomeRulesPresent(dir), true);
  } finally {
    rmSync(dir, { recursive: true });
  }
});
