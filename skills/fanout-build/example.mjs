// fanout-build — the trustworthy multi-agent build, domain-neutral.
//
// Run via the workflow runtime. The shape (Spike -> Contract -> Scaffold ->
// Build -> Integrate -> Verify) is the one two independent real builds converged
// on. Only Build and Verify fan out; everything else is one agent. This file uses
// top-level await/return and injected globals, so it is NOT a standalone module
// (it intentionally fails `node --check`); check-fanout + surface-scrub validate it.

export const meta = {
  name: 'fanout-build',
  description: 'Trustworthy multi-agent build: shared contract, disjoint files, scaffold-first, integration gate, skeptic claim-refutation.',
  phases: [
    { title: 'Spike' }, { title: 'Contract' }, { title: 'Scaffold' },
    { title: 'Build' }, { title: 'Integrate' }, { title: 'Verify' },
  ],
}

// args: { spikePrompt, contractPrompt, scaffoldPrompt, files:[{path,prompt}], gate, claims:[...] }
const A = args || {};

const FILE_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['done', 'notes'],
  properties: { done: { type: 'boolean' }, notes: { type: 'string' } },
};
const INTEG_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['green', 'commands'],
  properties: {
    green: { type: 'boolean' },
    commands: { type: 'array', items: {
      type: 'object', additionalProperties: false, required: ['cmd', 'exitCode', 'tail'],
      properties: { cmd: { type: 'string' }, exitCode: { type: 'integer' }, tail: { type: 'string' } },
    } },
  },
};
const VERDICT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['claim', 'verdict', 'evidence'],
  properties: {
    claim: { type: 'string' },
    verdict: { type: 'string', enum: ['true', 'refuted', 'unverifiable'] },
    evidence: { type: 'string' },
  },
};

phase('Spike');
const spike = await agent(
  A.spikePrompt || 'Prove the riskiest unknown builds before any fan-out. If it cannot build, say HALT.',
  { label: 'spike', phase: 'Spike' }
);
if (/\bHALT\b|cannot build/i.test(String(spike))) { log('spike halted the build'); return { halted: true, spike }; }

phase('Contract');
// The single source of truth, prepended verbatim to every build agent.
const CONTRACT = await agent(
  (A.contractPrompt || 'Produce the exact types, signatures, and file->owner map every build agent will code against.') +
  ' Output the contract as text that can be pasted verbatim into each downstream prompt.',
  { label: 'contract', phase: 'Contract' }
);

phase('Scaffold');
// One agent owns the shared files and must make the project COMPILE with stubs.
await agent(
  'SHARED CONTRACT (code against this exactly):\n' + CONTRACT + '\n\n' +
  (A.scaffoldPrompt || 'You OWN the shared files (manifests, shared types, module wiring). Make the project COMPILE with stubbed bodies; leave each owned-elsewhere body a TODO. Do not run git.'),
  { label: 'scaffold', phase: 'Scaffold' }
);

phase('Build');
// One agent per file, disjoint ownership, contract prepended verbatim.
const files = A.files || [];
const built = await parallel(files.map((f) => () => agent(
  "SHARED CONTRACT (code against this, NOT each other's files):\n" + CONTRACT + '\n\n' +
  'You own ONLY: ' + f.path + '\n' + f.prompt + '\nNever run git.',
  { label: 'build:' + f.path, phase: 'Build', schema: FILE_SCHEMA }
)));
log(built.filter(Boolean).filter((b) => b.done).length + '/' + files.length + ' files built');

phase('Integrate');
const integ = await agent(
  'Run the REAL gate and iterate until genuinely green, then fix only the cross-file drift the per-file agents could not (they owned only their files). ' +
  'Gate: ' + (A.gate || 'build + test + lint + a live probe') + '. ' +
  'Do NOT weaken assertions, skip tests, or run git. Return the verbatim final output of each command as evidence.',
  { label: 'integrate', phase: 'Integrate', agentType: 'integration-runner', schema: INTEG_SCHEMA }
);

phase('Verify');
// Refute the CLAIM, not just the gate. gate-green != claim-true.
const claims = A.claims || [];
const verdicts = await parallel(claims.map((c) => () => agent(
  'Gate-green is not claim-true. REFUTE this claim: check it is actually wired/mounted/reachable and that its path RAN ' +
  '(not just compiled or passed behind a flag). Recompute from raw output; default to refuted unless proven. Claim: ' + c,
  { label: 'verify', phase: 'Verify', agentType: 'skeptic-verifier', schema: VERDICT_SCHEMA }
)));

const refuted = verdicts.filter(Boolean).filter((v) => v.verdict === 'refuted');
return { gate: integ, claims: verdicts, claimTrue: Boolean(integ && integ.green) && refuted.length === 0 };
