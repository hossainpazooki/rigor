import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sessionRow } from '../scripts/extract-tails.mjs';

const line = (o) => JSON.stringify(o);

test('derives start/end stamps, cwd, and the last assistant text', () => {
  const lines = [
    line({ type: 'user', timestamp: '2026-07-12T10:00:00Z', cwd: '/repo' }),
    line({ type: 'assistant', timestamp: '2026-07-12T10:01:00Z', message: { content: [{ type: 'text', text: 'working on it' }] } }),
    line({ type: 'assistant', timestamp: '2026-07-12T10:05:00Z', message: { content: [{ type: 'text', text: 'all done, gate green' }] } }),
  ];
  assert.deepEqual(sessionRow(lines, 'abc'), {
    ts_start: '2026-07-12T10:00:00Z',
    ts_end: '2026-07-12T10:05:00Z',
    session_id: 'abc',
    cwd: '/repo',
    tail: 'all done, gate green',
  });
});

test('a trailing tool-call-only assistant turn is skipped for the tail', () => {
  const lines = [
    line({ type: 'assistant', timestamp: 't1', message: { content: [{ type: 'text', text: 'final words' }] } }),
    line({ type: 'assistant', timestamp: 't2', message: { content: [{ type: 'tool_use', name: 'Bash' }] } }),
  ];
  assert.equal(sessionRow(lines, 's').tail, 'final words');
});

test('malformed lines are skipped, not fatal', () => {
  const lines = ['{not json', '', line({ type: 'user', timestamp: 't1', cwd: '/x' })];
  const row = sessionRow(lines, 's');
  assert.equal(row.cwd, '/x');
  assert.equal(row.tail, null);
});

test('an empty or unparseable transcript yields no row', () => {
  assert.equal(sessionRow([], 's'), null);
  assert.equal(sessionRow(['garbage'], 's'), null);
});

test('the tail is bounded at 10000 chars', () => {
  const lines = [line({ type: 'assistant', timestamp: 't', message: { content: [{ type: 'text', text: 'x'.repeat(20000) }] } })];
  assert.equal(sessionRow(lines, 's').tail.length, 10000);
});
