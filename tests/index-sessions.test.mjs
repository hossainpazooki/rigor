import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { parseTranscript, repoFromCwd, indexTranscript, indexDirectory, RIGOR_GATES } from '../scripts/index-sessions.mjs';

const DEV = 'C:\\Users\\hossa\\dev';

/** Assistant record carrying tool_use blocks. */
function assistant(uses, { cwd = DEV + '\\linear-ceiling', uuid = 'u1', ts = '2026-08-26T19:00:00.000Z' } = {}) {
  return { type: 'assistant', uuid, timestamp: ts, cwd, gitBranch: 'main', isSidechain: false,
    message: { role: 'assistant', content: uses.map((u, i) => ({ type: 'tool_use', id: u.id ?? `t${i}`, name: u.name, input: u.input })) } };
}

/** User record carrying tool_result blocks. */
function results(blocks, { cwd = DEV + '\\linear-ceiling' } = {}) {
  return { type: 'user', uuid: 'r1', timestamp: '2026-08-26T19:00:01.000Z', cwd, isSidechain: false,
    message: { role: 'user', content: blocks.map((b) => ({ type: 'tool_result', tool_use_id: b.id, content: b.text, is_error: b.is_error ?? false })) } };
}

function prompt(text, { cwd = DEV + '\\linear-ceiling' } = {}) {
  return { type: 'user', uuid: 'p1', timestamp: '2026-08-26T19:00:00.000Z', cwd, isSidechain: false, message: { role: 'user', content: text } };
}

function entries(recs) {
  return recs.map((rec, line) => ({ line, rec }));
}

function idx(recs, opts = {}) {
  return indexTranscript(entries(recs), { session: 's1', devRoot: DEV, ...opts });
}

const DENY = 'rigor git-guard: Claude does not write git history. Output the exact git command for the human to run, then continue.';

// ---------------------------------------------------------------- parsing

test('parseTranscript keeps line numbers and survives a torn tail', () => {
  const text = '{"a":1}\n\n{"b":2}\n{"c":';
  const out = parseTranscript(text);
  assert.equal(out.length, 2);
  assert.equal(out[0].line, 0);
  assert.equal(out[1].line, 2, 'line index must be the FILE line, not the record ordinal');
});

test('parseTranscript red twin: a torn line is dropped, not repaired into a record', () => {
  assert.equal(parseTranscript('{"c":').length, 0);
});

// ------------------------------------------------------------ attribution

test('repoFromCwd maps a nested Windows cwd to its repo slug', () => {
  assert.equal(repoFromCwd(DEV + '\\linear-ceiling\\docs\\plans', DEV), 'linear-ceiling');
  assert.equal(repoFromCwd(DEV + '\\rigor', DEV), 'rigor');
});

test('repoFromCwd returns null for the dev root itself and for anything outside it', () => {
  assert.equal(repoFromCwd(DEV, DEV), null, 'the root is owned by no single repo');
  assert.equal(repoFromCwd('C:\\Users\\hossa\\other\\thing', DEV), null);
  assert.equal(repoFromCwd(undefined, DEV), null);
});

test('repoFromCwd is case- and separator-insensitive (transcripts carry both)', () => {
  assert.equal(repoFromCwd('c:/users/hossa/dev/vantage', DEV), 'vantage');
});

test("a firing in rigor's own tree is NOT domain-eligible; one in another repo is", () => {
  const inRigor = idx([assistant([{ name: 'Skill', input: { skill: 'rigor:refute' } }], { cwd: DEV + '\\rigor' })]);
  assert.equal(inRigor[0].domain_eligible, false, 'use of a component on rigor itself is use, not a domain');
  const elsewhere = idx([assistant([{ name: 'Skill', input: { skill: 'rigor:refute' } }], { cwd: DEV + '\\parallax' })]);
  assert.equal(elsewhere[0].domain_eligible, true);
  assert.equal(elsewhere[0].repo, 'parallax');
});

test('a turn at the dev root is not domain-eligible (no repo owns it)', () => {
  const rows = idx([assistant([{ name: 'Skill', input: { skill: 'rigor:refute' } }], { cwd: DEV })]);
  assert.equal(rows[0].repo, null);
  assert.equal(rows[0].domain_eligible, false);
});

// ------------------------------------------------------- skill invocation

test('a rigor Skill tool_use is a firing', () => {
  const rows = idx([assistant([{ name: 'Skill', input: { skill: 'rigor:pick-up' } }])]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, 'skill-invocation');
  assert.equal(rows[0].control, 'rigor:pick-up');
});

test('red twin: a non-rigor skill is not a rigor firing', () => {
  const rows = idx([assistant([{ name: 'Skill', input: { skill: 'superpowers:writing-plans' } }])]);
  assert.equal(rows.length, 0);
});

test('red twin: the skill NAME appearing in prose is not a firing', () => {
  // Every session's system prompt lists every skill; keyword search matched 27 files.
  const rows = idx([prompt('should I use rigor:no-lookahead here? it mentions no-lookahead twice')]);
  assert.equal(rows.filter((r) => r.kind === 'skill-invocation').length, 0);
});

// -------------------------------------------------------------- gate runs

test('a check gate executed in a Bash command is a firing, with its outcome', () => {
  const recs = [
    assistant([{ id: 'g1', name: 'Bash', input: { command: 'node scripts/check-learnings.mjs docs/learnings' } }]),
    results([{ id: 'g1', text: 'learnings: clean (32 entries)' }]),
  ];
  const rows = idx(recs).filter((r) => r.kind === 'gate-run');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].control, 'check-learnings');
  assert.equal(rows[0].exit_signal, 'ok');
  assert.match(rows[0].excerpt, /clean \(32 entries\)/);
});

test('a failing gate run is recorded as error, not dropped', () => {
  const recs = [
    assistant([{ id: 'g1', name: 'Bash', input: { command: 'node scripts/check-dispatch.mjs log.jsonl' } }]),
    results([{ id: 'g1', text: 'DISPATCH FAIL', is_error: true }]),
  ];
  assert.equal(idx(recs)[0].exit_signal, 'error');
});

test('two distinct gates in one command are two firings; the same gate twice is one', () => {
  const one = idx([assistant([{ name: 'Bash', input: { command: 'node scripts/check-runlog.mjs a && node scripts/check-learnings.mjs b' } }])]);
  assert.deepEqual(one.map((r) => r.control).sort(), ['check-learnings', 'check-runlog']);
  const dup = idx([assistant([{ name: 'Bash', input: { command: 'node scripts/check-runlog.mjs a; node scripts/check-runlog.mjs b' } }])]);
  assert.equal(dup.length, 1);
});

test("RED TWIN: a sibling repo's own check-*.mjs is a foreign gate, never rigor credit", () => {
  // Measured 2026-09-01: baseline and parallax run their own check-ledger.mjs 15 times.
  // A bare `check-*.mjs` match scored all 15 as rigor firings.
  const recs = [assistant([{ id: 'f1', name: 'Bash', input: { command: 'node scripts/check-ledger.mjs' } }], { cwd: DEV + '\\baseline' })];
  const rows = idx(recs);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, 'foreign-gate');
  assert.equal(rows[0].control, 'check-ledger');
  assert.equal(rows[0].domain_eligible, false, 'a foreign gate can never credit a rigor component');
});

test('RIGOR_GATES matches the gates actually shipped in scripts/ (drift guard)', () => {
  const onDisk = readdirSync(new URL('../scripts/', import.meta.url))
    .filter((f) => f.startsWith('check-') && f.endsWith('.mjs'))
    .map((f) => f.replace(/\.mjs$/, ''))
    .sort();
  assert.deepEqual([...RIGOR_GATES].sort(), onDisk,
    'add or remove a gate in scripts/ and this list must move with it, or the indexer silently misclassifies it');
});

test('red twin: a gate NAMED but not executed is not a firing', () => {
  const rows = idx([assistant([{ name: 'Bash', input: { command: 'echo "next: fix check-fanout so it stops passing"' } }])]);
  assert.equal(rows.filter((r) => r.kind === 'gate-run').length, 0, 'the .mjs execution is the signal, not the name');
});

test('a gate run with no paired result is unknown, never assumed green', () => {
  const rows = idx([assistant([{ id: 'g9', name: 'Bash', input: { command: 'node scripts/check-fanout.mjs x.mjs' } }])]);
  assert.equal(rows[0].exit_signal, 'unknown');
});

// ----------------------------------------------------------- hook denials

test('a hook denial in a hook attachment is a firing', () => {
  const rec = { type: 'user', uuid: 'h1', timestamp: '2026-08-22T20:00:00.000Z', cwd: DEV + '\\vantage',
    attachment: { type: 'hook_success', hookName: 'PreToolUse:Bash', stdout: JSON.stringify({ hookSpecificOutput: { permissionDecision: 'deny', permissionDecisionReason: DENY } }) } };
  const rows = idx([rec]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, 'hook-denial');
  assert.equal(rows[0].control, 'git-guard');
});

test('RED TWIN: the denial text quoted inside a Bash command is NOT a denial', () => {
  // Measured 2026-09-01: this session quoted the reason string 13 times while probing.
  // A text search over the transcript would have scored every one as a firing.
  const rows = idx([assistant([{ name: 'Bash', input: { command: `grep -c '${DENY}' *.jsonl` } }])]);
  assert.equal(rows.filter((r) => r.kind === 'hook-denial').length, 0);
});

test('change-guard denials are attributed to change-guard, not git-guard', () => {
  const rec = { type: 'user', uuid: 'h2', cwd: DEV + '\\vantage', timestamp: '2026-08-22T20:00:00.000Z',
    attachment: { type: 'hook_success', stdout: 'rigor change-guard: Claude does not trigger a deployment.' } };
  assert.equal(idx([rec])[0].control, 'change-guard');
});

// ---------------------------------------------------- command invocations

test('a /rigor: slash command in a user turn is a firing', () => {
  const rows = idx([prompt('<command-name>/rigor:handoff</command-name>')]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].control, '/rigor:handoff');
});

test('red twin: a non-rigor slash command is not a firing', () => {
  assert.equal(idx([prompt('<command-name>/model</command-name>')]).length, 0);
});

// ------------------------------------------------- opportunities (skips)

test('an irreversible action with no later effect check is an opportunity', () => {
  const rows = idx([assistant([{ name: 'Bash', input: { command: 'kubectl apply -k kube/overlays/prod' } }])]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, 'opportunity');
  assert.equal(rows[0].control, 'verify-the-effect');
  assert.equal(rows[0].exit_signal, 'none');
});

test('RED TWIN: the same action IS discharged by a later effect check', () => {
  const rows = idx([
    assistant([{ name: 'Bash', input: { command: 'kubectl apply -k kube/overlays/prod' } }]),
    assistant([{ name: 'Skill', input: { skill: 'rigor:verify-the-effect' } }]),
  ]);
  assert.equal(rows.filter((r) => r.kind === 'opportunity').length, 0);
});

test('order matters: a check BEFORE the action does not discharge it', () => {
  const rows = idx([
    assistant([{ name: 'Skill', input: { skill: 'rigor:verify-the-effect' } }]),
    assistant([{ name: 'Bash', input: { command: 'helm upgrade api ./chart' } }]),
  ]);
  assert.equal(rows.filter((r) => r.kind === 'opportunity').length, 1);
});

test('red twin: a read-only form of the same tool is not a trigger', () => {
  const rows = idx([assistant([{ name: 'Bash', input: { command: 'kubectl get pods && terraform plan && helm list' } }])]);
  assert.equal(rows.filter((r) => r.kind === 'opportunity').length, 0);
});

test('a status-doc write with no honesty check is an opportunity', () => {
  const rows = idx([assistant([{ name: 'Write', input: { file_path: 'C:\\Users\\hossa\\dev\\vantage\\README.md' } }])]);
  assert.equal(rows.filter((r) => r.kind === 'opportunity' && r.control === 'implemented-vs-planned').length, 1);
});

test('RED TWIN: writing a ledger entry is not an unchecked status claim', () => {
  // Measured 2026-09-01: ~50 of 91 hits from the first version of this trigger were
  // /rigor:handoff writing its own dated entries and indexes - the command doing its job.
  const ledgerWrites = [
    'C:\\Users\\hossa\\dev\\vantage\\docs\\handoff\\HANDOFF.md',
    'C:\\Users\\hossa\\dev\\vantage\\docs\\handoff\\2026-08-20-vantage-handoff.md',
    'C:\\Users\\hossa\\dev\\rigor\\docs\\feedback\\FEEDBACK.md',
    'C:\\Users\\hossa\\dev\\rigor\\docs\\learnings\\LEARNINGS.md',
  ];
  for (const p of ledgerWrites) {
    const rows = idx([assistant([{ name: 'Write', input: { file_path: p } }])]);
    assert.equal(rows.filter((r) => r.kind === 'opportunity').length, 0, `${p} should not trigger`);
  }
  // ...while a real status page still does.
  const readme = idx([assistant([{ name: 'Write', input: { file_path: 'C:\\Users\\hossa\\dev\\vantage\\README.md' } }])]);
  assert.equal(readme.filter((r) => r.kind === 'opportunity').length, 1);
});

test('red twin: an ordinary source edit is not a status claim', () => {
  const rows = idx([assistant([{ name: 'Edit', input: { file_path: 'C:\\Users\\hossa\\dev\\vantage\\src\\main.scala' } }])]);
  assert.equal(rows.filter((r) => r.kind === 'opportunity').length, 0);
});

test('a Workflow dispatch with no dispatch gate is an opportunity', () => {
  const rows = idx([assistant([{ name: 'Workflow', input: { script: 'export const meta = {}' } }])]);
  assert.equal(rows.filter((r) => r.control === 'check-dispatch').length, 1);
});

test('red twin: one or two Agent dispatches do not trip the fan-out trigger', () => {
  const two = idx([assistant([{ name: 'Agent', input: {} }, { name: 'Agent', input: {} }])]);
  assert.equal(two.filter((r) => r.kind === 'opportunity').length, 0);
  const three = idx([assistant([{ name: 'Agent', input: {} }, { name: 'Agent', input: {} }, { name: 'Agent', input: {} }])]);
  assert.equal(three.filter((r) => r.kind === 'opportunity').length, 1);
});

// ------------------------------------------------------------ determinism

test('firings are ordered by line, then control - the same input yields the same bytes', () => {
  const recs = [
    assistant([{ name: 'Bash', input: { command: 'node scripts/check-runlog.mjs a && node scripts/check-learnings.mjs b' } }]),
    assistant([{ name: 'Skill', input: { skill: 'rigor:refute' } }]),
  ];
  const a = JSON.stringify(idx(recs));
  const b = JSON.stringify(idx(recs));
  assert.equal(a, b);
  assert.deepEqual(idx(recs).map((r) => r.control), ['check-learnings', 'check-runlog', 'rigor:refute']);
});

test('indexDirectory reads files in sorted order with injected fs', () => {
  const files = {
    'b.jsonl': JSON.stringify(assistant([{ name: 'Skill', input: { skill: 'rigor:refute' } }])),
    'a.jsonl': JSON.stringify(assistant([{ name: 'Skill', input: { skill: 'rigor:pick-up' } }])),
    'notes.txt': 'ignored',
  };
  const rows = indexDirectory('/fake', {
    devRoot: DEV,
    list: () => Object.keys(files),
    read: (p) => files[p.replace(/^.*[/\\]/, '')],
  });
  assert.deepEqual(rows.map((r) => [r.session, r.control]), [['a', 'rigor:pick-up'], ['b', 'rigor:refute']]);
});
