// execute-plan — one wave of a written plan, under the orchestrate guardrails.
//
// Run via the workflow runtime. Pass args = { tiers, plan, wave, completed,
// base, gate, plan_slug, scratch, final, high_stakes_pattern?, claims? } where
// `plan` is the JSON printed by `node scripts/plan-waves.mjs <plan.md>`. One
// invocation executes ONE wave (command = iteration; the orchestrator is the
// cadence): implementer per task -> reviewer per task (spec + quality) -> a
// bounded fix loop -> the wave's integration gate -> the wave's commit block
// for the human. The whole-branch refutation runs when args.final is true.
// Like fanout-build/example.mjs this uses injected globals and top-level
// return, so it is not a standalone module; check-fanout and
// check-tier-placement validate it.

export const meta = {
  name: 'execute-plan',
  description: 'Execute one wave of a written plan: per-task implementer and reviewer, bounded fix loop, integration gate, commit emission, whole-branch refutation on the last wave.',
  phases: [{ title: 'Build' }, { title: 'Review' }, { title: 'Integrate' }, { title: 'Verify' }],
}

// args can arrive JSON-encoded as a string (live failure, run 4 2026-07-22).
const A = (typeof args === 'string' ? JSON.parse(args) : args) || {};
const TIERS = A.tiers || {};
if (!TIERS.build || !TIERS.mid || !TIERS.judgment) {
  log('halt: args.tiers incomplete - read tiers from config/models.json and pass them via args');
  return { halted: true, reason: 'tiers missing from args; refusing to run unpinned' };
}
const PLAN = A.plan;
if (!PLAN || !Array.isArray(PLAN.waves) || !Array.isArray(PLAN.tasks)) {
  return { halted: true, reason: 'args.plan missing - run scripts/plan-waves.mjs on the plan and pass its output' };
}
if (!A.base || !A.gate || !A.plan_slug || !A.scratch) {
  return { halted: true, reason: 'args.base, args.gate, args.plan_slug and args.scratch are required' };
}

const byN = new Map(PLAN.tasks.map((t) => [t.n, t]));
const allFiles = (t) => [...new Set([...t.files.create, ...t.files.modify, ...t.files.test])];
const completed = new Set(A.completed || []);
const waveIdx = typeof A.wave === 'number' ? A.wave - 1 : PLAN.waves.findIndex((w) => w.some((n) => !completed.has(n)));
if (waveIdx < 0 || waveIdx >= PLAN.waves.length) return { halted: true, reason: 'no wave to run: every task is complete or args.wave is out of range' };
const tasks = PLAN.waves[waveIdx].filter((n) => !completed.has(n)).map((n) => byN.get(n)).filter(Boolean);
if (!tasks.length) return { halted: true, reason: 'wave ' + (waveIdx + 1) + ' has no incomplete tasks' };

// Stakes per task (judgment-dispatch rubric): medium by default; high when a
// task file matches the irreversibility markers, which routes its reviewer to
// the judgment tier because check-dispatch fails a high-stakes vote below it.
const HIGH = new RegExp(A.high_stakes_pattern || 'migrat|deploy|release|helm|terraform|kube|workflows', 'i');
const stakesFor = (t) => (allFiles(t).some((f) => HIGH.test(f)) ? 'high' : 'medium');
const FIX_ROUNDS = 2;

// Worker receipt (ADR-0006 res 3): every worker reports which model answered.
const RECEIPT = ' Report in the "model" field the bare model ID verbatim from your own system prompt.';

const OWNERS = tasks.map((t) => 'Task ' + t.n + ' owns ONLY: ' + allFiles(t).join(', ')).join('\n');
// The shared contract, prepended verbatim to every agent in this wave.
const CONTRACT = [
  'SHARED CONTRACT - execute-plan, wave ' + (waveIdx + 1) + ' of ' + PLAN.waves.length + ' (plan ' + A.plan_slug + ')',
  'Base commit for this wave: ' + A.base + '. Named gate: ' + A.gate + '.',
  'GLOBAL CONSTRAINTS (verbatim from the plan; every task implicitly includes them):',
  PLAN.constraints || '(none stated)',
  'FILE OWNERSHIP (disjoint; touch nothing else):',
  OWNERS,
  'INTERFACES this wave consumes and produces:',
  tasks.map((t) => 'Task ' + t.n + ' consumes: ' + (t.interfaces.consumes || '-') + ' | produces: ' + (t.interfaces.produces || '-')).join('\n'),
  'HARD RULES: never run a Commit step or any git write - the human runs the emitted commit block; never weaken or delete a test; write scratch only under ' + A.scratch + '/<label>/; keep stdout ASCII.',
].join('\n');

const IMPL_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['status', 'files_changed', 'tests', 'concerns', 'report_file', 'model'],
  properties: {
    status: { type: 'string', enum: ['DONE', 'DONE_WITH_CONCERNS', 'BLOCKED', 'NEEDS_CONTEXT'] },
    files_changed: { type: 'array', items: { type: 'string' } },
    tests: { type: 'object', additionalProperties: false, required: ['cmd', 'exit', 'tail'],
      properties: { cmd: { type: 'string' }, exit: { type: 'integer' }, tail: { type: 'string' } } },
    concerns: { type: 'string' },
    report_file: { type: 'string' },
    model: { type: 'string' },
  },
};
const REVIEW_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['spec', 'quality', 'cannot_verify', 'model'],
  properties: {
    spec: { type: 'object', additionalProperties: false, required: ['verdict', 'missing', 'extra'],
      properties: { verdict: { type: 'string', enum: ['PASS', 'FAIL'] }, missing: { type: 'array', items: { type: 'string' } }, extra: { type: 'array', items: { type: 'string' } } } },
    quality: { type: 'object', additionalProperties: false, required: ['verdict', 'issues'],
      properties: { verdict: { type: 'string', enum: ['APPROVED', 'ISSUES'] }, issues: { type: 'array', items: {
        type: 'object', additionalProperties: false, required: ['severity', 'location', 'finding'],
        properties: { severity: { type: 'string', enum: ['critical', 'important', 'minor'] }, location: { type: 'string' }, finding: { type: 'string' } } } } } },
    cannot_verify: { type: 'array', items: { type: 'string' } },
    model: { type: 'string' },
  },
};
const INTEG_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['green', 'commands', 'drift_fixed', 'model'],
  properties: {
    green: { type: 'boolean' }, drift_fixed: { type: 'string' }, model: { type: 'string' },
    commands: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['cmd', 'exitCode', 'tail'],
      properties: { cmd: { type: 'string' }, exitCode: { type: 'integer' }, tail: { type: 'string' } } } },
  },
};
const VERDICT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['claim', 'verdict', 'evidence', 'model'],
  properties: { claim: { type: 'string' }, verdict: { type: 'string', enum: ['true', 'refuted', 'unverifiable'] }, evidence: { type: 'string' }, model: { type: 'string' } },
};

const receipts = [];
const verdictRecords = [];
const receipt = (node, label, out, requested) => {
  if (out && out.model) receipts.push({ role: 'worker', node, label, verifier_model: { requested, answered: out.model } });
};

const implPrompt = (t, findings) =>
  'SHARED CONTRACT (code against this, NOT other tasks\' files):\n' + CONTRACT + '\n\n' +
  (findings
    ? 'You are the FIX agent for Task ' + t.n + ' (' + t.name + '). A reviewer returned these findings; fix every critical and important one, re-run the covering tests, and append a fix report to the report file:\n' + JSON.stringify(findings) + '\n\n'
    : 'You are the IMPLEMENTER for Task ' + t.n + ' (' + t.name + '). Read the task brief below first - it is your requirements, with exact values to use verbatim. Implement exactly what it specifies, test-first where it says so, run the focused tests while iterating and the full named gate once at the end. Skip every Commit step. Write your full report (what you built, tests run with output, TDD evidence, files changed, self-review, concerns) to ' + A.scratch + '/task-' + t.n + '/report.md and put that path in report_file. Use BLOCKED or NEEDS_CONTEXT rather than guessing; DONE_WITH_CONCERNS when finished but unsure.\n\n') +
  'TASK BRIEF:\n' + t.body + RECEIPT;

const reviewPrompt = (t, impl, stakes) =>
  'You are the TASK REVIEWER for Task ' + t.n + ' (' + t.name + '), stakes ' + stakes + '. Two verdicts: spec compliance (nothing missing, nothing extra) and code quality. ' +
  'Treat the implementer\'s report as UNVERIFIED claims - verify them against the diff: run `git diff --stat ' + A.base + '` and `git diff ' + A.base + ' -- <files_changed>` yourself (read-only; never run a git write). Do not re-run tests the implementer already ran - its report carries the test evidence; do inspect code outside the diff only for a concrete named risk. Put requirements you cannot judge from the diff in cannot_verify rather than guessing.\n\n' +
  'SHARED CONTRACT:\n' + CONTRACT + '\n\nTASK BRIEF:\n' + t.body + '\n\nIMPLEMENTER RESULT:\n' + JSON.stringify(impl) + RECEIPT;

phase('Build');
// pipeline, not a barrier: a task's review starts the moment its implementer returns.
const results = await pipeline(
  tasks,
  (t) => agent(implPrompt(t), { label: 'implement:task-' + t.n, phase: 'Build', schema: IMPL_SCHEMA, model: TIERS.build })
    .then((impl) => ({ task: t, impl })),
  async (r, t) => {
    if (!r || !r.impl) return { task: t, halted: 'implementer returned null' };
    receipt('execute-plan.implement', 'task-' + t.n, r.impl, TIERS.build);
    if (r.impl.status === 'BLOCKED' || r.impl.status === 'NEEDS_CONTEXT') {
      return { task: t, impl: r.impl, halted: r.impl.status + ': ' + r.impl.concerns };
    }
    const stakes = stakesFor(t);
    // High stakes earns the judgment tier (skeptic-verifier); medium runs skeptic-verifier-fast on the mid tier.
    const reviewerType = stakes === 'high' ? 'rigor:skeptic-verifier' : 'rigor:skeptic-verifier-fast';
    const tier = stakes === 'high' ? 'judgment' : 'mid';
    let impl = r.impl;
    let review = null;
    for (let round = 0; ; round++) {
      review = await agent(reviewPrompt(t, impl, stakes), {
        label: 'review:task-' + t.n + ':' + round, phase: 'Review', agentType: reviewerType, schema: REVIEW_SCHEMA, model: TIERS[tier],
      });
      if (!review) return { task: t, impl, halted: 'reviewer returned null' };
      verdictRecords.push({
        node: 'execute-plan.task-review', claim: 'task ' + t.n + ' round ' + round, dispatch_tier: tier,
        verifier_model: { requested: TIERS[tier], answered: review.model },
        inferred_stakes: stakes, rubric_criteria_hit: stakes === 'high' ? ['irreversibility', 'downstream-decisions'] : ['downstream-decisions'],
        downgraded: false, verdict: review.spec.verdict + '/' + review.quality.verdict,
      });
      const blocking = review.spec.verdict === 'FAIL' || review.quality.issues.some((i) => i.severity !== 'minor');
      if (!blocking) return { task: t, impl, review, rounds: round, minor: review.quality.issues, cannot_verify: review.cannot_verify };
      if (round >= FIX_ROUNDS) {
        // A task failing review three times is read as a plan defect, not an implementer defect.
        return { task: t, impl, review, rounds: round, halted: 'review still failing after ' + FIX_ROUNDS + ' fix rounds - plan defect?' };
      }
      const findings = { spec: review.spec, issues: review.quality.issues.filter((i) => i.severity !== 'minor') };
      impl = await agent(implPrompt(t, findings), { label: 'fix:task-' + t.n + ':' + (round + 1), phase: 'Build', schema: IMPL_SCHEMA, model: TIERS.build });
      if (!impl) return { task: t, halted: 'fix agent returned null' };
      receipt('execute-plan.fix', 'task-' + t.n + ':' + (round + 1), impl, TIERS.build);
    }
  }
);

const rows = results.filter(Boolean);
const halted = rows.filter((r) => r.halted);
if (halted.length || rows.length < tasks.length) {
  log('halt: ' + (halted.length || tasks.length - rows.length) + ' task(s) need the human - no integration on an incomplete wave');
  return { wave: waveIdx + 1, results: rows, halted: true, receipts, verdictRecords };
}

phase('Integrate');
const integ = await agent(
  'SHARED CONTRACT:\n' + CONTRACT + '\n\n' +
  'Run the named gate `' + A.gate + '` and iterate until it is genuinely green. Fix ONLY cross-file drift between this wave\'s tasks (they each owned only their files); never weaken, skip or delete a test; never run a git write. ' +
  'Also run `git status --short` and `git diff --stat ' + A.base + '` and include them so the touched-file set is evidence. Return the verbatim tail of every command.' + RECEIPT,
  { label: 'integrate:wave-' + (waveIdx + 1), phase: 'Integrate', agentType: 'rigor:integration-runner', schema: INTEG_SCHEMA, model: TIERS.mid }
);
receipt('execute-plan.integrate', 'wave-' + (waveIdx + 1), integ, TIERS.mid);
if (!integ || !integ.green) {
  log('halt: wave ' + (waveIdx + 1) + ' integration not green - no commit block emitted');
  return { wave: waveIdx + 1, results: rows, integ, halted: true, receipts, verdictRecords };
}

// The wave's commit block for the human: the plan's own Commit steps, lifted.
const commit_block = tasks.flatMap((t) => {
  const r = rows.find((x) => x.task.n === t.n);
  const paths = (r && r.impl && r.impl.files_changed && r.impl.files_changed.length) ? r.impl.files_changed : allFiles(t);
  return t.commits.length
    ? ['git add ' + paths.join(' '), ...t.commits]
    : ['git add ' + paths.join(' '), 'git commit -m "feat: task ' + t.n + ' - ' + t.name + '"'];
});

let verdicts = [];
let claimTrue = true;
if (A.final) {
  phase('Verify');
  // Refute the CLAIM, not just the gate: the plan's Goal and every Produces interface.
  const claims = A.claims || PLAN.tasks.filter((t) => t.interfaces.produces && t.interfaces.produces !== 'nothing').map((t) => 'Task ' + t.n + ' produces ' + t.interfaces.produces);
  verdicts = (await parallel(claims.map((c) => () => agent(
    'Gate-green is not claim-true. REFUTE this claim by re-executing it: is it actually wired, reachable and exercised by a test that fails without it? Recompute from raw output; default to refuted unless proven. Read-only; never run a git write. Claim: ' + c + RECEIPT,
    { label: 'verify', phase: 'Verify', agentType: 'rigor:skeptic-verifier', schema: VERDICT_SCHEMA, model: TIERS.judgment }
  )))).filter(Boolean);
  for (const v of verdicts) {
    verdictRecords.push({ node: 'execute-plan.verify', claim: v.claim, dispatch_tier: 'judgment', verifier_model: { requested: TIERS.judgment, answered: v.model },
      inferred_stakes: 'high', rubric_criteria_hit: ['downstream-decisions', 'blast-radius'], downgraded: false, verdict: v.verdict });
  }
  const missing = claims.length - verdicts.length;
  if (missing) log('WARNING: ' + missing + ' skeptic vote(s) returned null - those claims are NOT verified');
  claimTrue = missing === 0 && verdicts.every((v) => v.verdict === 'true');
}

return { wave: waveIdx + 1, results: rows, integ, commit_block, receipts, verdictRecords, verdicts, claimTrue: Boolean(integ.green) && claimTrue };
