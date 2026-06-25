import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildContext } from '../hooks/session-start.mjs';

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
