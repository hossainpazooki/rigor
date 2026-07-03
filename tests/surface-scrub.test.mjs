import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findFingerprints, loadDenylist } from '../scripts/check-surface-scrub.mjs';

// Invented placeholder tokens only — no real project names live in this repo.
const DENY = ['ZephyrCore', 'quux-cli', 'widget-engine'];

test('flags a fingerprint token', () => {
  assert.deepEqual(findFingerprints('see the ZephyrCore gate', DENY), ['ZephyrCore']);
});
test('flags case-insensitively', () => {
  assert.ok(findFingerprints('built with QUUX-CLI', DENY).includes('quux-cli'));
});
test('clean domain-neutral text passes', () => {
  assert.deepEqual(findFingerprints('a verdict claims the suite passes; re-run it.', DENY), []);
});
test('empty denylist is always clean (the shipped default)', () => {
  assert.deepEqual(findFingerprints('ZephyrCore quux-cli widget-engine', []), []);
});

// Boundary (#22/#23): hyphen-extension must NOT match; alphanumeric suffix still flags.
test('does not false-positive on a hyphen-extended token', () => {
  assert.deepEqual(findFingerprints('quux-cli-v2 and quux-cli-extra', DENY), []);
});
test('still flags an alphanumeric-suffixed token', () => {
  assert.ok(findFingerprints('quux-cliv2', DENY).includes('quux-cli'));
});

// loadDenylist: external file; blanks and #-comments ignored; absent => [].
test('loadDenylist parses tokens, ignoring blanks and # comments', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rigor-deny-'));
  try {
    writeFileSync(join(dir, 'surface-scrub.denylist'), '# header\nFooProj\n\nbar-cli  # inline note\n');
    assert.deepEqual(loadDenylist(dir).sort(), ['FooProj', 'bar-cli']);
  } finally { rmSync(dir, { recursive: true }); }
});
test('loadDenylist returns [] when the file is absent', () => {
  assert.deepEqual(loadDenylist(join(tmpdir(), 'rigor-no-such-dir-xyz')), []);
});

// Engagement-fingerprint categories (data-eng layer). SYNTHETIC tokens only —
// an invented employer, vendor-warehouse product, and schema.table identifier.
const ENGAGEMENT_DENY = ['acme-capital', 'fakevendor-dwh', 'fake_schema.fake_table'];

test('flags an engagement-shaped fingerprint (employer, vendor-dwh, schema.table)', () => {
  const text = 'built at acme-capital on fakevendor-dwh, loading fake_schema.fake_table';
  assert.deepEqual(findFingerprints(text, ENGAGEMENT_DENY).sort(), [...ENGAGEMENT_DENY].sort());
});

// The four data-eng skills must scan clean against an engagement-shaped denylist —
// they are domain-neutral by construction.
const DATAENG_SKILLS = [
  'data-quality-fail-closed', 'no-lookahead', 'idempotent-restatement', 'lineage-replay',
];
for (const s of DATAENG_SKILLS) {
  test(`data-eng skill ${s} carries no engagement fingerprints`, () => {
    const md = readFileSync(new URL(`../skills/${s}/SKILL.md`, import.meta.url), 'utf8');
    assert.deepEqual(findFingerprints(md, ENGAGEMENT_DENY), []);
  });
}
