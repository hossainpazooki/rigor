import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findHarvestViolations, parseHarvest, allUnevaluable } from '../scripts/check-harvest.mjs';

const GATE = fileURLToPath(new URL('../scripts/check-harvest.mjs', import.meta.url));

/** A well-formed, credited record - the green fixture every red twin mutates. */
function credited(over = {}) {
  return {
    harvest: '951cdf1d',
    n: 1,
    control: 'check-fanout',
    repo: 'network-as-code',
    domain_eligible: true,
    lead: { session: '951cdf1d', uuid: 'abc', line: 4120, ts: '2026-08-27T16:00:00.000Z' },
    verdict: 'misfired',
    credited: true,
    credit_kind: 'domain',
    reverified_at: '2026-09-01T18:00:00.000Z',
    reverify: { command: 'node scripts/check-fanout.mjs README.md', exit: 0, excerpt: 'scaffolding present' },
    note: 'reports not-applicable as passed',
    ...over,
  };
}

function violations(recs) {
  return findHarvestViolations(recs).map((v) => v.reason).join(' | ');
}

test('the green fixture is clean', () => {
  assert.deepEqual(findHarvestViolations([credited()]), []);
});

// ------------------------------------------------- the leads-only rule

test('RED TWIN: credited without reverified_at is a violation, not a warning', () => {
  const r = credited();
  delete r.reverified_at;
  assert.match(violations([r]), /transcript is a lead, credit comes from a re-run/);
});

test('RED TWIN: credited without the re-run command and its exit is a violation', () => {
  const r = credited();
  delete r.reverify;
  assert.match(violations([r]), /the re-run IS the evidence/);
});

test('RED TWIN: a re-run exit that was never observed is a violation', () => {
  assert.match(violations([credited({ reverify: { command: 'node scripts/check-fanout.mjs x', exit: 'clean' } })]),
    /exit must be the integer exit code actually observed/);
});

test('RED TWIN: a re-verification dated BEFORE the session it re-verifies is a violation', () => {
  assert.match(violations([credited({ reverified_at: '2026-08-01T00:00:00.000Z' })]),
    /precedes the lead it re-verifies/);
});

test('RED TWIN: a mutating re-verify command is refused', () => {
  // Contract gap logged 2026-07-22: an agent executed a mutating --yes re-verify line.
  for (const cmd of ['git commit -am wip', 'kubectl apply -k overlays/prod', 'rm -rf build', 'gh pr merge 4']) {
    assert.match(violations([credited({ reverify: { command: cmd, exit: 0 } })]), /not read-only/, cmd);
  }
});

test('an uncredited record needs no re-run - a lead is allowed to stay a lead', () => {
  const r = credited({ credited: false });
  delete r.reverified_at; delete r.reverify; delete r.credit_kind;
  assert.deepEqual(findHarvestViolations([r]), []);
});

test('RED TWIN: an omitted credited flag is ambiguous and refused', () => {
  const r = credited();
  delete r.credited;
  assert.match(violations([r]), /explicit boolean/);
});

// ------------------------------------------------ domain vs use

test('RED TWIN: a domain credit on rigor\'s own tree is refused as use, not a domain', () => {
  assert.match(violations([credited({ domain_eligible: false, repo: 'rigor' })]),
    /use on rigor itself is use, not a domain/);
});

test('the same record credited as use rather than domain is clean', () => {
  assert.deepEqual(findHarvestViolations([credited({ domain_eligible: false, repo: 'rigor', credit_kind: 'use' })]), []);
});

test('RED TWIN: credited with no credit_kind is refused', () => {
  const r = credited();
  delete r.credit_kind;
  assert.match(violations([r]), /credit_kind/);
});

// ------------------------------------------------ verdicts and leads

test('RED TWIN: an unevaluable record can never be credited', () => {
  assert.match(violations([credited({ verdict: 'unevaluable' })]), /that is the point of the third outcome/);
});

test('RED TWIN: a verdict outside the closed vocabulary is refused', () => {
  assert.match(violations([credited({ verdict: 'probably fine' })]), /is not one of/);
});

test('RED TWIN: a record with no locatable lead is an assertion and is refused', () => {
  const r = credited();
  delete r.lead;
  assert.match(violations([r]), /must point at the transcript it came from/);
});

test('RED TWIN: a lead with no line number cannot be located', () => {
  assert.match(violations([credited({ lead: { session: 'x', ts: '2026-08-01T00:00:00Z' } })]),
    /lead.line must be a non-negative integer/);
});

// ------------------------------------------------ append-only numbering

test('n must be +1 monotonic', () => {
  assert.match(violations([credited({ n: 1 }), credited({ n: 3 })]), /numbering must be \+1 monotonic/);
});

test('a correction is a new record with supersedes, never an edit', () => {
  const first = credited({ n: 1, verdict: 'helped' });
  const fix = credited({ n: 1, supersedes: 1, verdict: 'misfired' });
  assert.deepEqual(findHarvestViolations([first, fix]), []);
});

test('RED TWIN: superseding a record that does not exist is refused', () => {
  assert.match(violations([credited({ n: 1, supersedes: 7 })]), /no earlier record carries that/);
});

// ------------------------------------------------ three outcomes at the CLI

test('allUnevaluable is true only when nothing could be judged', () => {
  assert.equal(allUnevaluable([{ verdict: 'unevaluable' }]), true);
  assert.equal(allUnevaluable([{ verdict: 'unevaluable' }, { verdict: 'helped' }]), false);
  assert.equal(allUnevaluable([]), false);
});

test('parseHarvest ignores blank lines', () => {
  assert.equal(parseHarvest('{"n":1}\n\n{"n":2}\n').length, 2);
});

function runGate(text) {
  const dir = mkdtempSync(join(tmpdir(), 'harvest-'));
  const f = join(dir, 'h.jsonl');
  writeFileSync(f, text);
  try {
    const stdout = execFileSync(process.execPath, [GATE, f], { encoding: 'utf8' });
    return { code: 0, out: stdout };
  } catch (e) {
    return { code: e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}

test('CLI exit 0 on a clean file, and it says how many were credited', () => {
  const r = runGate(JSON.stringify(credited()) + '\n');
  assert.equal(r.code, 0);
  assert.match(r.out, /harvest: clean \(1 record, 1 credited\)/);
});

test('CLI exit 1 on a violation', () => {
  const bad = credited();
  delete bad.reverified_at;
  assert.equal(runGate(JSON.stringify(bad) + '\n').code, 1);
});

test('CLI exit 2 on an empty file - vacuous is not clean', () => {
  const r = runGate('');
  assert.equal(r.code, 2);
  assert.match(r.out, /VACUOUS/);
});

test('CLI exit 2 when every record is unevaluable - nothing can move a status', () => {
  const u = credited({ verdict: 'unevaluable', credited: false });
  delete u.reverified_at; delete u.reverify; delete u.credit_kind;
  const r = runGate(JSON.stringify(u) + '\n');
  assert.equal(r.code, 2);
  assert.match(r.out, /nothing here can move a status/);
});

test('CLI exit 2 on a missing file, never a silent pass', () => {
  const dir = mkdtempSync(join(tmpdir(), 'harvest-'));
  try {
    execFileSync(process.execPath, [GATE, join(dir, 'nope.jsonl')], { encoding: 'utf8' });
    assert.fail('should have exited non-zero');
  } catch (e) {
    assert.equal(e.status, 2);
  }
});
