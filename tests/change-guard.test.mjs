import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, isDeployCommand } from '../hooks/change-guard.mjs';
import { identityDigest } from '../scripts/check-change-record.mjs';

// NOTE (owner B2): scripts/check-change-record.mjs (owner B1) is a throwing
// scaffold stub at the time this file was written, and hooks/shell-normalize.mjs
// (owner B3) is still the naive stub too. Every test below is written against
// the shared ADR-0013 contract, not against the stubs. Tests that exercise the
// RIGOR_CHANGE_RECORD / RIGOR_CHANGE_ID path call into check-change-record's
// findChangeRecordViolations/effectiveClass and WILL be red until B1's real
// implementation lands; the four "wrapper" tests (timeout/sh -c//usr/bin/.exe/
// env-prefix) call into shell-normalize's expandCommands and WILL be red until
// B3's real implementation lands. This is expected and stated per the build
// contract, not a bug in this file.

const noIo = {
  loadRecords: () => { throw new Error('loadRecords should not be called for this case'); },
  digest: () => { throw new Error('digest should not be called for this case'); },
  toplevel: () => null,
};

function fixedIo({ records = null, digestFor = () => null } = {}) {
  return {
    loadRecords: () => records,
    digest: (path) => digestFor(path),
    toplevel: () => '/repo',
  };
}

function baseProposal({
  changeId,
  pattern = 'k8s-manifest-bump',
  classProposed,
  authorizationId = null,
  approval = null,
  backoutOverrides = {},
  healthOverrides = {},
  blastOverrides = {},
  probePlanOverrides = {},
  artifactIdentity,
} = {}) {
  const identity = artifactIdentity ?? [{ name: 'manifest', value: 'sha-abc123' }];
  let exercisedAgainst;
  try { exercisedAgainst = identityDigest(identity); } catch { exercisedAgainst = '<identityDigest not yet implemented>'; }
  return {
    kind: 'proposal',
    change_id: changeId,
    pattern,
    ts_proposed: '2026-08-20T00:00:00Z',
    ts_recorded: '2026-08-20T00:00:01Z',
    proposed_by: 'agent-x',
    target: { kind: 'k8s', ref: 'prod' },
    class: { proposed: classProposed, authorization: authorizationId },
    artifact: { identity },
    backout: {
      kind: 'previous-rendered-manifest',
      exercised_against: exercisedAgainst,
      exit_code: 0,
      run_ref: 'run-1',
      by: 'agent-x',
      ...backoutOverrides,
    },
    blast_radius: {
      declared: ['ns/foo'],
      plan_diff: ['ns/foo'],
      plan_diff_source: { cmd: 'kubectl diff -k .', sha256: 'deadbeef' },
      ...blastOverrides,
    },
    health_baseline: {
      verdict: 'pass',
      window: { from: '2026-08-19T00:00:00Z', to: '2026-08-20T00:00:00Z' },
      signals: [{ id: 'sig1', scope: 'in-radius', outcome: 'pass', source: 'prom', last_sample_ts: '2026-08-19T23:00:00Z' }],
      ...healthOverrides,
    },
    probe_plan: {
      claim: 'service responds 200 with the new image digest',
      control: 'same probe against the previous version, which returns a different digest',
      ref: 'probe-1',
      ...probePlanOverrides,
    },
    approval,
  };
}

function baseAuthorization({ id, pattern = 'k8s-manifest-bump', cls, criteriaOverrides = {} }) {
  return {
    kind: 'authorization',
    id,
    pattern,
    class: cls,
    granted_by: 'human-1',
    granted_on: '2026-08-01',
    identity_rule: 'rendered manifest content hash',
    backout_rule: 'previous rendered manifest reapplied against a copy',
    criteria: {
      min_clean_instances: 0,
      backout_exercised: false,
      probe_nonvacuous: true,
      sweep_cadence_days: 30,
      sweep_every_n_instances: 10,
      ...criteriaOverrides,
    },
    basis: 'initial grant for rehearsal',
  };
}

const changeEnv = (id, extra = {}) => ({
  RIGOR_CHANGE_RECORD: 'docs/changes/change-log.jsonl',
  RIGOR_CHANGE_ID: id,
  ...extra,
});

// ---------------------------------------------------------------------------
// isDeployCommand — family + verb classification, dry-run exemption
// ---------------------------------------------------------------------------

test('isDeployCommand: kubectl mutating verbs', () => {
  assert.equal(isDeployCommand('kubectl apply -k kube/overlays/prod').deploy, true);
  assert.equal(isDeployCommand('kubectl delete pod x').deploy, true);
  assert.equal(isDeployCommand('kubectl rollout undo deployment/api').deploy, true);
  assert.equal(isDeployCommand('kubectl rollout restart deployment/api').deploy, true);
});

test('isDeployCommand: kubectl read-only verbs stay green', () => {
  assert.equal(isDeployCommand('kubectl get pods').deploy, false);
  assert.equal(isDeployCommand('kubectl describe pod x').deploy, false);
  assert.equal(isDeployCommand('kubectl diff -k kube/overlays/prod').deploy, false);
  assert.equal(isDeployCommand('kubectl kustomize kube/overlays/prod').deploy, false);
  assert.equal(isDeployCommand('kubectl logs pod/x').deploy, false);
  assert.equal(isDeployCommand('kubectl rollout status deployment/api').deploy, false);
});

test('isDeployCommand: kubectl dry-run exemption is exact', () => {
  assert.equal(isDeployCommand('kubectl apply -k . --dry-run=server').deploy, false);
  assert.equal(isDeployCommand('kubectl apply -k . --dry-run=client').deploy, false);
  assert.equal(isDeployCommand('kubectl apply -k . --dry-run').deploy, false);
  assert.equal(isDeployCommand('kubectl create ns x --dry-run=client -o yaml').deploy, false);
  // --dry-run=none is the mutating default and is never exempt
  assert.equal(isDeployCommand('kubectl apply -k . --dry-run=none').deploy, true);
});

test('isDeployCommand: helm', () => {
  assert.equal(isDeployCommand('helm template mychart').deploy, false);
  assert.equal(isDeployCommand('helm diff upgrade x chart').deploy, false);
  assert.equal(isDeployCommand('helm status x').deploy, false);
  assert.equal(isDeployCommand('helm list').deploy, false);
  assert.equal(isDeployCommand('helm upgrade x chart --dry-run').deploy, false);
  assert.equal(isDeployCommand('helm upgrade x chart --dry-run=none').deploy, true);
  assert.equal(isDeployCommand('helm install x chart').deploy, true);
});

test('isDeployCommand: terraform / tofu', () => {
  assert.equal(isDeployCommand('terraform plan').deploy, false);
  assert.equal(isDeployCommand('terraform show plan.tfplan').deploy, false);
  assert.equal(isDeployCommand('terraform validate').deploy, false);
  assert.equal(isDeployCommand('terraform init').deploy, false);
  assert.equal(isDeployCommand('terraform apply plan.tfplan').deploy, true);
  assert.equal(isDeployCommand('terraform apply -auto-approve').deploy, true);
  assert.equal(isDeployCommand('tofu apply -auto-approve').deploy, true);
});

test('isDeployCommand: pulumi', () => {
  assert.equal(isDeployCommand('pulumi preview').deploy, false);
  assert.equal(isDeployCommand('pulumi up').deploy, true);
});

test('isDeployCommand: gh workflow / run / release / atlantis-comment', () => {
  assert.equal(isDeployCommand('gh workflow view cd-production.yml').deploy, false);
  assert.equal(isDeployCommand('gh workflow list').deploy, false);
  assert.equal(isDeployCommand('gh run list --workflow cd.yml').deploy, false);
  assert.equal(isDeployCommand('gh workflow run cd.yml').deploy, true);
  assert.equal(isDeployCommand('gh pr comment 1 -b "atlantis apply"').deploy, true);
});

test('isDeployCommand: argocd / flux', () => {
  assert.equal(isDeployCommand('argocd app get my-app').deploy, false);
  assert.equal(isDeployCommand('argocd app diff my-app').deploy, false);
  assert.equal(isDeployCommand('flux get kustomizations').deploy, false);
  assert.equal(isDeployCommand('argocd app sync my-app').deploy, true);
  assert.equal(isDeployCommand('flux reconcile kustomization my-app').deploy, true);
});

// ---------------------------------------------------------------------------
// decide() — read-only family stays green (no env set)
// ---------------------------------------------------------------------------

test('read-only family stays green with no env', () => {
  const readOnly = [
    'kubectl get pods',
    'kubectl describe pod x',
    'kubectl diff -k kube/overlays/prod',
    'kubectl kustomize kube/overlays/prod',
    'kubectl logs pod/x',
    'kubectl rollout status deployment/api',
    'kubectl apply -k . --dry-run=server',
    'kubectl create ns x --dry-run=client -o yaml',
    'helm template mychart',
    'helm diff upgrade x chart',
    'helm status x',
    'helm list',
    'terraform plan',
    'terraform show plan.tfplan',
    'terraform validate',
    'terraform init',
    'pulumi preview',
    'gh workflow view cd-production.yml',
    'gh run list --workflow cd.yml',
    'argocd app get my-app',
    'argocd app diff my-app',
    'flux get kustomizations',
    'echo "kubectl apply later"',
  ];
  for (const cmd of readOnly) {
    assert.equal(decide(cmd, {}, noIo).block, false, `expected green: ${cmd}`);
  }
});

// ---------------------------------------------------------------------------
// decide() — RED twins, no env set: refused with git-guard-shaped message
// ---------------------------------------------------------------------------

test('deploy command with no env is refused, git-guard-shaped message', () => {
  const r = decide('kubectl apply -k kube/overlays/prod', {}, noIo);
  assert.equal(r.block, true);
  assert.match(r.reason, /rigor change-guard: Claude does not trigger a deployment/);
  assert.match(r.reason, /RIGOR_CHANGE_RECORD=<path> RIGOR_CHANGE_ID=<id>/);
  assert.match(r.reason, /RIGOR_BREAK_GLASS=<path>/);
});

test('--dry-run=none is mutating and refused', () => {
  assert.equal(decide('kubectl apply -k . --dry-run=none', {}, noIo).block, true);
  assert.equal(decide('helm upgrade x chart --dry-run=none', {}, noIo).block, true);
});

test('terraform apply variants refused', () => {
  assert.equal(decide('terraform apply plan.tfplan', {}, noIo).block, true);
  assert.equal(decide('terraform apply -auto-approve', {}, noIo).block, true);
});

test('gh workflow run and atlantis-apply PR comment refused', () => {
  assert.equal(decide('gh workflow run cd.yml', {}, noIo).block, true);
  assert.equal(decide('gh pr comment 1 -b "atlantis apply"', {}, noIo).block, true);
});

// --- wrapper-normalization red twins: depend on hooks/shell-normalize.mjs's
// real implementation (owner B3). The stub splits naively and does not strip
// these wrapper prefixes, so these are written to the contract and are
// expected to be RED until B3's real normalizer lands. ---

test('wrapped deploy commands are refused once normalized (depends on shell-normalize)', () => {
  assert.equal(decide('timeout 300 terraform apply -auto-approve', {}, noIo).block, true);
  assert.equal(decide("sh -c 'kubectl apply -k .'", {}, noIo).block, true);
  assert.equal(decide('/usr/bin/kubectl apply -k .', {}, noIo).block, true);
  assert.equal(decide('kubectl.exe apply -k .', {}, noIo).block, true);
  assert.equal(decide('env KUBECONFIG=x kubectl apply -k .', {}, noIo).block, true);
});

// ---------------------------------------------------------------------------
// decide() — RIGOR_CHANGE_RECORD / RIGOR_CHANGE_ID ladder
// (depends on scripts/check-change-record.mjs's real implementation, owner B1)
// ---------------------------------------------------------------------------

test('class 2 proposal is refused mentioning class 2', () => {
  const proposal = baseProposal({ changeId: 'chg-2', classProposed: 2 });
  const io = fixedIo({ records: [proposal] });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-2'), io);
  assert.equal(r.block, true);
  assert.match(r.reason, /class 2/);
});

test('unresolved class 0/1 citation is effective class 2', () => {
  const proposal = baseProposal({ changeId: 'chg-2b', classProposed: 0, authorizationId: 'missing-auth' });
  const io = fixedIo({ records: [proposal] }); // no authorization record present
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-2b'), io);
  assert.equal(r.block, true);
  assert.match(r.reason, /class 2/);
});

test('unevaluable baseline is refused as HALT', () => {
  const proposal = baseProposal({
    changeId: 'chg-halt',
    classProposed: 0,
    authorizationId: 'auth-1',
    healthOverrides: { verdict: 'unevaluable', signals: [] },
  });
  const authorization = baseAuthorization({ id: 'auth-1', cls: 0 });
  const io = fixedIo({ records: [proposal, authorization] });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-halt'), io);
  assert.equal(r.block, true);
  assert.match(r.reason, /HALT/);
});

test('described (non-exercised) backout is refused', () => {
  const proposal = baseProposal({
    changeId: 'chg-backout',
    classProposed: 0,
    authorizationId: 'auth-1',
    backoutOverrides: { kind: 'described' },
  });
  const authorization = baseAuthorization({ id: 'auth-1', cls: 0 });
  const io = fixedIo({ records: [proposal, authorization] });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-backout'), io);
  assert.equal(r.block, true);
});

test('digest mismatch between review and dispatch is refused', () => {
  const proposal = baseProposal({
    changeId: 'chg-digest',
    classProposed: 0,
    authorizationId: 'auth-1',
    artifactIdentity: [{ name: 'rendered-manifest', path: 'kube/rendered.yaml', sha256: 'aaaa' }],
  });
  const authorization = baseAuthorization({ id: 'auth-1', cls: 0 });
  const io = fixedIo({ records: [proposal, authorization], digestFor: () => 'bbbb' });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-digest'), io);
  assert.equal(r.block, true);
});

test('class 1 without approval is refused', () => {
  const proposal = baseProposal({ changeId: 'chg-1-noappr', classProposed: 1, authorizationId: 'auth-2', approval: null });
  const authorization = baseAuthorization({ id: 'auth-2', cls: 1 });
  const io = fixedIo({ records: [proposal, authorization] });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-1-noappr'), io);
  assert.equal(r.block, true);
  assert.match(r.reason, /approval/);
});

test('class 1 with approval and complete evidence is allowed', () => {
  const proposal = baseProposal({
    changeId: 'chg-1-ok',
    classProposed: 1,
    authorizationId: 'auth-3',
    approval: { who: 'reviewer-1', when: '2026-08-20T00:00:00Z', ref: 'PR-1' },
  });
  const authorization = baseAuthorization({ id: 'auth-3', cls: 1 });
  const io = fixedIo({ records: [proposal, authorization] });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-1-ok'), io);
  assert.equal(r.block, false);
});

test('class 0 with a resolving authorization is allowed', () => {
  const proposal = baseProposal({ changeId: 'chg-0-ok', classProposed: 0, authorizationId: 'auth-4' });
  const authorization = baseAuthorization({ id: 'auth-4', cls: 0 });
  const io = fixedIo({ records: [proposal, authorization] });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-0-ok'), io);
  assert.equal(r.block, false);
});

test('loadRecords returning null is refused', () => {
  const io = fixedIo({ records: null });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-missing'), io);
  assert.equal(r.block, true);
  assert.match(r.reason, /no change record/);
});

// ---------------------------------------------------------------------------
// decide() — path validation (RIGOR_CHANGE_RECORD)
// ---------------------------------------------------------------------------

test('backslash / absolute / .. paths are refused before any load', () => {
  const spyIo = {
    loadRecords: () => { throw new Error('loadRecords must not be called for an invalid path'); },
    digest: () => { throw new Error('digest must not be called'); },
    toplevel: () => null,
  };
  const badPaths = [
    'docs\\changes\\change-log.jsonl',
    '/abs/docs/changes/change-log.jsonl',
    '../secret/change-log.jsonl',
    'docs/../../../change-log.jsonl',
  ];
  for (const p of badPaths) {
    const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-path', { RIGOR_CHANGE_RECORD: p }), spyIo);
    assert.equal(r.block, true, `expected refusal for path: ${p}`);
  }
});

// ---------------------------------------------------------------------------
// decide() — RIGOR_BREAK_GLASS
// ---------------------------------------------------------------------------

test('break-glass with complete matching record is allowed', () => {
  const io = fixedIo({
    records: [{ who: 'ops-1', when: '2026-08-20T00:00:00Z', why: 'prod is down, restoring previous image', command: 'kubectl apply -k kube/overlays/prod' }],
  });
  const r = decide('kubectl apply -k kube/overlays/prod', { RIGOR_BREAK_GLASS: 'docs/changes/break-glass-1.json' }, io);
  assert.equal(r.block, false);
});

test('break-glass with empty why is refused', () => {
  const io = fixedIo({
    records: [{ who: 'ops-1', when: '2026-08-20T00:00:00Z', why: '', command: 'kubectl apply -k kube/overlays/prod' }],
  });
  const r = decide('kubectl apply -k kube/overlays/prod', { RIGOR_BREAK_GLASS: 'docs/changes/break-glass-1.json' }, io);
  assert.equal(r.block, true);
  assert.match(r.reason, /break-glass record incomplete\/mismatched/);
});

test('break-glass with a mismatched command is refused', () => {
  const io = fixedIo({
    records: [{ who: 'ops-1', when: '2026-08-20T00:00:00Z', why: 'restoring previous image', command: 'kubectl apply -k kube/overlays/staging' }],
  });
  const r = decide('kubectl apply -k kube/overlays/prod', { RIGOR_BREAK_GLASS: 'docs/changes/break-glass-1.json' }, io);
  assert.equal(r.block, true);
});

test('break-glass with loadRecords null is refused', () => {
  const io = fixedIo({ records: null });
  const r = decide('kubectl apply -k kube/overlays/prod', { RIGOR_BREAK_GLASS: 'docs/changes/break-glass-1.json' }, io);
  assert.equal(r.block, true);
});

// ---------------------------------------------------------------------------
// decide() — allow path omits reason, mirroring git-guard finding #33
// ---------------------------------------------------------------------------

test('allow result has no reason key', () => {
  const r = decide('kubectl get pods', {}, noIo);
  assert.equal(r.block, false);
  assert.equal('reason' in r, false);
});

// ---------------------------------------------------------------------------
// FIX ROUND 2 (owner F2) — skeptic findings (a)-(h)
// ---------------------------------------------------------------------------

// (a) global flag stripping before the verb, per tool.
test('isDeployCommand: global flags stripped before verb (finding a)', () => {
  assert.equal(isDeployCommand('kubectl -n prod apply -k kube/overlays/prod').deploy, true);
  assert.equal(isDeployCommand('kubectl --context=prod apply -k x').deploy, true);
  assert.equal(isDeployCommand('kubectl --kubeconfig=/x apply -k x').deploy, true);
  assert.equal(isDeployCommand('helm -n prod upgrade api ./chart').deploy, true);
  assert.equal(isDeployCommand('terraform -chdir=infra apply -auto-approve').deploy, true);
  assert.equal(isDeployCommand('gh --repo o/r workflow run cd.yml').deploy, true);
  assert.equal(isDeployCommand('gh -R o/r workflow run cd.yml').deploy, true);
});

test('deploy commands with global flags are refused with no env (finding a)', () => {
  const cmds = [
    'kubectl -n prod apply -k kube/overlays/prod',
    'kubectl --context=prod apply -k x',
    'kubectl --kubeconfig=/x apply -k x',
    'helm -n prod upgrade api ./chart',
    'terraform -chdir=infra apply -auto-approve',
    'gh --repo o/r workflow run cd.yml',
    'gh -R o/r workflow run cd.yml',
  ];
  for (const cmd of cmds) {
    assert.equal(decide(cmd, {}, noIo).block, true, `expected refusal: ${cmd}`);
  }
});

// (b) baseline verdict read directly, not maskable by a later outcome.
test('baseline fail is refused directly (finding b)', () => {
  const proposal = baseProposal({
    changeId: 'chg-basefail',
    classProposed: 0,
    authorizationId: 'auth-1',
    healthOverrides: {
      verdict: 'fail',
      signals: [{ id: 'sig1', scope: 'in-radius', outcome: 'fail', source: 'prom', last_sample_ts: '2026-08-19T23:00:00Z' }],
    },
  });
  const authorization = baseAuthorization({ id: 'auth-1', cls: 0 });
  const io = fixedIo({ records: [proposal, authorization] });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-basefail'), io);
  assert.equal(r.block, true);
  assert.match(r.reason, /baseline fail/);
});

test('baseline unevaluable is still HALT even with a later clean outcome (finding b)', () => {
  const proposal = baseProposal({
    changeId: 'chg-masked',
    classProposed: 0,
    authorizationId: 'auth-1',
    healthOverrides: { verdict: 'unevaluable', signals: [] },
  });
  const authorization = baseAuthorization({ id: 'auth-1', cls: 0 });
  const outcome = {
    kind: 'outcome',
    change_id: 'chg-masked',
    ts_executed: '2026-08-20T01:00:00Z',
    ts_recorded: '2026-08-20T01:00:01Z',
    executed_by: 'agent-x',
    health: {
      verdict: 'pass',
      window: { from: '2026-08-20T01:00:00Z', to: '2026-08-20T01:10:00Z' },
      signals: [{ id: 'sig1', scope: 'in-radius', outcome: 'pass', source: 'prom', last_sample_ts: '2026-08-20T01:05:00Z' }],
    },
    probe: { claim: 'x', probePassed: true, controlRan: true, controlPassed: false, ref: 'probe-1' },
    outcome: 'clean',
    misfire_closure: null,
    break_glass: null,
  };
  const io = fixedIo({ records: [proposal, authorization, outcome] });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-masked'), io);
  assert.equal(r.block, true);
  assert.match(r.reason, /HALT/);
});

// (c) break-glass matching must be exact over EVERY deploy hit — no prefix.
test('break-glass prefix/partial match is refused, not allowed (finding c)', () => {
  const cases = [
    ['kubectl apply -k kube/overlays/prod', 'kubectl apply -k kube/overlays/production'],
    ['kubectl apply -k kube/overlays/prod', 'kubectl apply -k kube/overlays/prod-canary'],
    ['kubectl apply -k kube/overlays/prod', 'kubectl apply -k kube/overlays/prod --prune --all'],
    ['kubectl apply -k kube/overlays/prod', 'kubectl apply -k kube/overlays/prod && terraform destroy -auto-approve'],
    ['k', 'kubectl delete ns prod'],
  ];
  for (const [recordedCommand, running] of cases) {
    const io = fixedIo({ records: [{ who: 'ops-1', when: '2026-08-20T00:00:00Z', why: 'incident', command: recordedCommand }] });
    const r = decide(running, { RIGOR_BREAK_GLASS: 'docs/changes/break-glass-1.json' }, io);
    assert.equal(r.block, true, `expected refusal for record="${recordedCommand}" running="${running}"`);
  }
});

test('break-glass exact match on every deploy hit is allowed (finding c, kept)', () => {
  const io = fixedIo({ records: [{ who: 'ops-1', when: '2026-08-20T00:00:00Z', why: 'incident', command: 'kubectl apply -k kube/overlays/prod' }] });
  const r = decide('kubectl apply -k kube/overlays/prod', { RIGOR_BREAK_GLASS: 'docs/changes/break-glass-1.json' }, io);
  assert.equal(r.block, false);
});

// (d) break-glass field-level refusals at the hook.
test('break-glass empty who is refused (finding d)', () => {
  const io = fixedIo({ records: [{ who: '', when: '2026-08-20T00:00:00Z', why: 'incident', command: 'kubectl apply -k kube/overlays/prod' }] });
  const r = decide('kubectl apply -k kube/overlays/prod', { RIGOR_BREAK_GLASS: 'docs/changes/break-glass-1.json' }, io);
  assert.equal(r.block, true);
});

test('break-glass empty command is refused (finding d)', () => {
  const io = fixedIo({ records: [{ who: 'ops-1', when: '2026-08-20T00:00:00Z', why: 'incident', command: '' }] });
  const r = decide('kubectl apply -k kube/overlays/prod', { RIGOR_BREAK_GLASS: 'docs/changes/break-glass-1.json' }, io);
  assert.equal(r.block, true);
});

test('break-glass unparseable when is refused (finding d)', () => {
  const io = fixedIo({ records: [{ who: 'ops-1', when: 'not-a-date', why: 'incident', command: 'kubectl apply -k kube/overlays/prod' }] });
  const r = decide('kubectl apply -k kube/overlays/prod', { RIGOR_BREAK_GLASS: 'docs/changes/break-glass-1.json' }, io);
  assert.equal(r.block, true);
});

// (e) a path-bearing identity entry whose digest cannot be recomputed -> HALT.
test('null digest (unrecomputable) is refused as HALT (finding e)', () => {
  const proposal = baseProposal({
    changeId: 'chg-nulldigest',
    classProposed: 0,
    authorizationId: 'auth-1',
    artifactIdentity: [{ name: 'rendered-manifest', path: 'kube/rendered.yaml', sha256: 'aaaa' }],
  });
  const authorization = baseAuthorization({ id: 'auth-1', cls: 0 });
  const io = fixedIo({ records: [proposal, authorization], digestFor: () => null });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-nulldigest'), io);
  assert.equal(r.block, true);
  assert.match(r.reason, /HALT/);
  assert.match(r.reason, /kube\/rendered\.yaml/);
});

// (f) approval for class 1 requires who, when (parseable), and non-empty ref.
test('class 1 approval missing when/ref is refused (finding f)', () => {
  const proposal = baseProposal({ changeId: 'chg-1-partial', classProposed: 1, authorizationId: 'auth-2', approval: { who: 'x' } });
  const authorization = baseAuthorization({ id: 'auth-2', cls: 1 });
  const io = fixedIo({ records: [proposal, authorization] });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-1-partial'), io);
  assert.equal(r.block, true);
  assert.match(r.reason, /approval/);
});

// (g) hook-level independent tests: each gating property fails on its own.
test('P3 under-declared radius denies, reason names P3 (finding g)', () => {
  const proposal = baseProposal({
    changeId: 'chg-p3-radius',
    classProposed: 0,
    authorizationId: 'auth-1',
    blastOverrides: { declared: ['ns/foo'], plan_diff: ['ns/foo', 'ns/bar'] },
  });
  const authorization = baseAuthorization({ id: 'auth-1', cls: 0 });
  const io = fixedIo({ records: [proposal, authorization] });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-p3-radius'), io);
  assert.equal(r.block, true);
  assert.match(r.reason, /P3/);
});

test('P3 fold mismatch denies (finding g)', () => {
  const proposal = baseProposal({
    changeId: 'chg-p3-fold',
    classProposed: 0,
    authorizationId: 'auth-1',
    healthOverrides: {
      verdict: 'pass',
      signals: [{ id: 'sig1', scope: 'in-radius', outcome: 'fail', source: 'prom', last_sample_ts: '2026-08-19T23:00:00Z' }],
    },
  });
  const authorization = baseAuthorization({ id: 'auth-1', cls: 0 });
  const io = fixedIo({ records: [proposal, authorization] });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-p3-fold'), io);
  assert.equal(r.block, true);
  assert.match(r.reason, /P3/);
});

test('P6 class-0 min_clean_instances unmet denies (finding g)', () => {
  const proposal = baseProposal({ changeId: 'chg-p6-clean', classProposed: 0, authorizationId: 'auth-5' });
  const authorization = baseAuthorization({ id: 'auth-5', cls: 0, criteriaOverrides: { min_clean_instances: 3 } });
  const io = fixedIo({ records: [proposal, authorization] });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-p6-clean'), io);
  assert.equal(r.block, true);
  assert.match(r.reason, /P6/);
});

test('P6 unrepaired misfire denies (finding g)', () => {
  const priorProposal = baseProposal({ changeId: 'chg-p6-prior', pattern: 'k8s-manifest-bump', classProposed: 0, authorizationId: 'auth-6' });
  const priorOutcome = {
    kind: 'outcome',
    change_id: 'chg-p6-prior',
    ts_executed: '2026-08-19T00:00:00Z',
    ts_recorded: '2026-08-19T00:00:01Z',
    executed_by: 'agent-x',
    health: {
      verdict: 'pass',
      window: { from: '2026-08-19T00:00:00Z', to: '2026-08-19T00:10:00Z' },
      signals: [{ id: 'sig1', scope: 'in-radius', outcome: 'pass', source: 'prom', last_sample_ts: '2026-08-19T00:05:00Z' }],
    },
    probe: { claim: 'x', probePassed: false, controlRan: true, controlPassed: false, ref: 'probe-1' },
    outcome: 'misfire',
    misfire_closure: null,
    break_glass: null,
  };
  const proposal = baseProposal({ changeId: 'chg-p6-new', pattern: 'k8s-manifest-bump', classProposed: 0, authorizationId: 'auth-6' });
  const authorization = baseAuthorization({ id: 'auth-6', pattern: 'k8s-manifest-bump', cls: 0 });
  const io = fixedIo({ records: [priorProposal, priorOutcome, authorization, proposal] });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-p6-new'), io);
  assert.equal(r.block, true);
  assert.match(r.reason, /P6/);
});

test('P2 mismatch via the matcher alone denies, reason names P2 (finding g)', () => {
  const proposal = baseProposal({
    changeId: 'chg-p2-only',
    classProposed: 0,
    authorizationId: 'auth-1',
    artifactIdentity: [{ name: 'rendered-manifest', path: 'kube/rendered.yaml', sha256: 'aaaa' }],
  });
  const authorization = baseAuthorization({ id: 'auth-1', cls: 0 });
  const io = fixedIo({ records: [proposal, authorization], digestFor: () => 'bbbb' });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-p2-only'), io);
  assert.equal(r.block, true);
  assert.match(r.reason, /P2/);
});

// (h) P3 radius violations are listed even when HALT is the headline.
test('HALT reason still lists a P3 radius violation (finding h)', () => {
  const proposal = baseProposal({
    changeId: 'chg-halt-p3',
    classProposed: 0,
    authorizationId: 'auth-1',
    healthOverrides: { verdict: 'unevaluable', signals: [] },
    blastOverrides: { declared: ['ns/foo'], plan_diff: ['ns/foo', 'ns/bar'] },
  });
  const authorization = baseAuthorization({ id: 'auth-1', cls: 0 });
  const io = fixedIo({ records: [proposal, authorization] });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-halt-p3'), io);
  assert.equal(r.block, true);
  assert.match(r.reason, /HALT/);
  assert.match(r.reason, /P3/);
});

// ---------------------------------------------------------------------------
// FIX ROUND 3 (owner G2) — round-2 skeptic residuals (a)-(e)
// ---------------------------------------------------------------------------

// (a) the hook currently discards every 'form' violation from the matcher.
// Each of these six is a 'form' violation the matcher already emits but the
// hook's gating filter (['P1','P2','P3','P6']) drops on the floor.

test('form violation: backout.kind not in vocabulary denies (finding a1, G2)', () => {
  const proposal = baseProposal({
    changeId: 'chg-g2-backoutkind',
    classProposed: 0,
    authorizationId: 'auth-g2a',
    backoutOverrides: { kind: 'apply-previous-module' },
  });
  const authorization = baseAuthorization({ id: 'auth-g2a', cls: 0 });
  const io = fixedIo({ records: [proposal, authorization] });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-g2-backoutkind'), io);
  assert.equal(r.block, true);
});

test('form violation: naive ts_proposed denies (finding a2, G2)', () => {
  const proposal = baseProposal({ changeId: 'chg-g2-naivets', classProposed: 0, authorizationId: 'auth-g2b' });
  // One day after the health_baseline window.to regardless of the runner's
  // local timezone (offsets only range +-14h), so this cannot spuriously
  // trip the P3 "window.to is after ts_proposed" check either way.
  proposal.ts_proposed = '2026-08-21T00:00:00';
  proposal.ts_recorded = '2026-08-21T00:00:01';
  const authorization = baseAuthorization({ id: 'auth-g2b', cls: 0 });
  const io = fixedIo({ records: [proposal, authorization] });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-g2-naivets'), io);
  assert.equal(r.block, true);
});

test('form violation: naive last_sample_ts in health_baseline denies (finding a3, G2)', () => {
  const proposal = baseProposal({
    changeId: 'chg-g2-naivesignal',
    classProposed: 0,
    authorizationId: 'auth-g2c',
    healthOverrides: {
      verdict: 'pass',
      signals: [{ id: 'sig1', scope: 'in-radius', outcome: 'pass', source: 'prom', last_sample_ts: '2026-08-19T23:00:00' }],
    },
  });
  const authorization = baseAuthorization({ id: 'auth-g2c', cls: 0 });
  const io = fixedIo({ records: [proposal, authorization] });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-g2-naivesignal'), io);
  assert.equal(r.block, true);
});

test('form violation: null probe_plan denies (finding a4, G2)', () => {
  const proposal = baseProposal({ changeId: 'chg-g2-noprobe', classProposed: 0, authorizationId: 'auth-g2d' });
  proposal.probe_plan = null;
  const authorization = baseAuthorization({ id: 'auth-g2d', cls: 0 });
  const io = fixedIo({ records: [proposal, authorization] });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-g2-noprobe'), io);
  assert.equal(r.block, true);
});

test('form violation: class 1 approval.when naive denies (finding a5, G2)', () => {
  const proposal = baseProposal({
    changeId: 'chg-g2-naiveappr',
    classProposed: 1,
    authorizationId: 'auth-g2e',
    approval: { who: 'reviewer-1', when: '2026-08-20T00:00:00', ref: 'PR-1' },
  });
  const authorization = baseAuthorization({ id: 'auth-g2e', cls: 1 });
  const io = fixedIo({ records: [proposal, authorization] });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-g2-naiveappr'), io);
  assert.equal(r.block, true);
});

test('form violation: empty backout.by denies (finding a6, G2)', () => {
  const proposal = baseProposal({
    changeId: 'chg-g2-emptyby',
    classProposed: 0,
    authorizationId: 'auth-g2f',
    backoutOverrides: { by: '' },
  });
  const authorization = baseAuthorization({ id: 'auth-g2f', cls: 0 });
  const io = fixedIo({ records: [proposal, authorization] });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-g2-emptyby'), io);
  assert.equal(r.block, true);
});

// (b) proposal selection must ignore a duplicate that does not `supersedes`
// the earlier record — the earlier (unevaluable) proposal stays authoritative.
test('duplicate proposal without supersedes does not replace the earlier unevaluable baseline (finding b, G2)', () => {
  const original = baseProposal({
    changeId: 'chg-g2-dup',
    classProposed: 0,
    authorizationId: 'auth-g2-dup',
    healthOverrides: { verdict: 'unevaluable', signals: [] },
  });
  const duplicate = baseProposal({
    changeId: 'chg-g2-dup',
    classProposed: 0,
    authorizationId: 'auth-g2-dup',
    // pass baseline (default), NO `supersedes` field -> a duplicate, not a
    // valid correction; must not become the selected proposal.
  });
  const authorization = baseAuthorization({ id: 'auth-g2-dup', cls: 0 });
  const io = fixedIo({ records: [original, duplicate, authorization] });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-g2-dup'), io);
  assert.equal(r.block, true);
  assert.match(r.reason, /HALT/);
});

// (c) widened global-flag stripping: attached short-flag values and the
// widened kubectl/helm/argocd/flux global-flag families.
test('isDeployCommand: widened global flags recognized (finding c, G2)', () => {
  assert.equal(isDeployCommand('kubectl -nprod apply -k kube/overlays/prod').deploy, true);
  assert.equal(isDeployCommand('kubectl --as=admin apply -k x').deploy, true);
  assert.equal(isDeployCommand('kubectl --as admin apply -k x').deploy, true);
  assert.equal(isDeployCommand('kubectl --token=abc apply -k x').deploy, true);
  assert.equal(isDeployCommand('kubectl --insecure-skip-tls-verify apply -k x').deploy, true);
  assert.equal(isDeployCommand('helm -nprod upgrade api ./chart').deploy, true);
  assert.equal(isDeployCommand('helm --kube-token=abc upgrade api ./chart').deploy, true);
  assert.equal(isDeployCommand('gh -Ro/r workflow run cd.yml').deploy, true);
  assert.equal(isDeployCommand('flux --timeout=5m reconcile source git x').deploy, true);
  assert.equal(isDeployCommand('argocd --plaintext app sync a').deploy, true);
});

test('deploy commands with widened global flags are refused with no env (finding c, G2)', () => {
  const cmds = [
    'kubectl -nprod apply -k kube/overlays/prod',
    'kubectl --as=admin apply -k x',
    'kubectl --as admin apply -k x',
    'kubectl --token=abc apply -k x',
    'kubectl --insecure-skip-tls-verify apply -k x',
    'helm -nprod upgrade api ./chart',
    'helm --kube-token=abc upgrade api ./chart',
    'gh -Ro/r workflow run cd.yml',
    'flux --timeout=5m reconcile source git x',
    'argocd --plaintext app sync a',
  ];
  for (const cmd of cmds) {
    assert.equal(decide(cmd, {}, noIo).block, true, `expected refusal: ${cmd}`);
  }
});

test('read-only commands with global flags stay green (finding c, G2)', () => {
  assert.equal(isDeployCommand('kubectl get pods -l app=apply').deploy, false);
  assert.equal(isDeployCommand('kubectl -n prod get pods').deploy, false);
  assert.equal(decide('kubectl get pods -l app=apply', {}, noIo).block, false);
  assert.equal(decide('kubectl -n prod get pods', {}, noIo).block, false);
});

// (d) break-glass 'when' must carry an explicit UTC offset at the hook.
test('break-glass naive when (no UTC offset) is refused (finding d, G2)', () => {
  const io = fixedIo({
    records: [{ who: 'ops-1', when: '2026-08-20T00:00:00', why: 'incident', command: 'kubectl apply -k kube/overlays/prod' }],
  });
  const r = decide('kubectl apply -k kube/overlays/prod', { RIGOR_BREAK_GLASS: 'docs/changes/break-glass-1.json' }, io);
  assert.equal(r.block, true);
});

// (e) mutation-round pins: compound break-glass, approval field gaps, and
// "allow has no reason key" on both the change-record and break-glass paths.
test('compound break-glass record (A && A) is refused (finding e, G2)', () => {
  const io = fixedIo({
    records: [{
      who: 'ops-1',
      when: '2026-08-20T00:00:00Z',
      why: 'incident',
      command: 'kubectl apply -k kube/overlays/prod && kubectl apply -k kube/overlays/prod',
    }],
  });
  const r = decide('kubectl apply -k kube/overlays/prod', { RIGOR_BREAK_GLASS: 'docs/changes/break-glass-1.json' }, io);
  assert.equal(r.block, true);
});

// FIX ROUND 4 (H2, finding d): renamed from "...refused independently..." —
// this is now the matcher's own approvalGaps 'form' violation (entry =
// proposalLabel) surfacing through the gating filter, not a hook-level
// re-check; the hook's own approval check covers only null/absent (see
// decideChangeRecord's effective===1 branch).
test('approval missing ref is refused (finding e, G2 / H2)', () => {
  const proposal = baseProposal({
    changeId: 'chg-g2-noref',
    classProposed: 1,
    authorizationId: 'auth-g2g',
    approval: { who: 'reviewer-1', when: '2026-08-20T00:00:00Z' },
  });
  const authorization = baseAuthorization({ id: 'auth-g2g', cls: 1 });
  const io = fixedIo({ records: [proposal, authorization] });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-g2-noref'), io);
  assert.equal(r.block, true);
});

// FIX ROUND 4 (H2, finding d): renamed, same reason as above.
test('approval unparseable when is refused (finding e, G2 / H2)', () => {
  const proposal = baseProposal({
    changeId: 'chg-g2-badwhen',
    classProposed: 1,
    authorizationId: 'auth-g2h',
    approval: { who: 'reviewer-1', when: 'nope', ref: 'PR-1' },
  });
  const authorization = baseAuthorization({ id: 'auth-g2h', cls: 1 });
  const io = fixedIo({ records: [proposal, authorization] });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-g2-badwhen'), io);
  assert.equal(r.block, true);
});

test('change-record allow result has no reason key (finding e, G2)', () => {
  const proposal = baseProposal({
    changeId: 'chg-g2-allowok',
    classProposed: 1,
    authorizationId: 'auth-g2i',
    approval: { who: 'reviewer-1', when: '2026-08-20T00:00:00Z', ref: 'PR-1' },
  });
  const authorization = baseAuthorization({ id: 'auth-g2i', cls: 1 });
  const io = fixedIo({ records: [proposal, authorization] });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-g2-allowok'), io);
  assert.equal(r.block, false);
  assert.equal('reason' in r, false);
});

test('break-glass allow result has no reason key (finding e, G2)', () => {
  const io = fixedIo({
    records: [{ who: 'ops-1', when: '2026-08-20T00:00:00Z', why: 'incident', command: 'kubectl apply -k kube/overlays/prod' }],
  });
  const r = decide('kubectl apply -k kube/overlays/prod', { RIGOR_BREAK_GLASS: 'docs/changes/break-glass-1.json' }, io);
  assert.equal(r.block, false);
  assert.equal('reason' in r, false);
});

// ---------------------------------------------------------------------------
// FIX ROUND 4 (owner H2) — round-3 residuals (a)-(d)
// ---------------------------------------------------------------------------

// (a) MATERIAL: the round-3 fallback scanned past the first non-flag token,
// misreading a read-only sub-command's own arguments as the verb.
test('isDeployCommand: read-only sub-commands stay green (finding a, H2)', () => {
  assert.equal(isDeployCommand('kubectl auth can-i create pods').deploy, false);
  assert.equal(isDeployCommand('kubectl auth can-i delete pods -n prod').deploy, false);
  assert.equal(isDeployCommand('helm search repo install').deploy, false);
  assert.equal(isDeployCommand('kubectl config set current-context x').deploy, false);
});

test('deploy commands with read-only sub-commands stay green with no env (finding a, H2)', () => {
  const cmds = [
    'kubectl auth can-i create pods',
    'kubectl auth can-i delete pods -n prod',
    'helm search repo install',
    'kubectl config set current-context x',
  ];
  for (const cmd of cmds) {
    assert.equal(decide(cmd, {}, noIo).block, false, `expected green: ${cmd}`);
  }
});

// (a, completed value-flag sets) — still deploy-shaped once the flag and its
// value are correctly skipped.
test('isDeployCommand: completed value-flag sets still recognize the verb (finding a, H2)', () => {
  assert.equal(isDeployCommand('helm --kube-tls-server-name x upgrade api ./chart').deploy, true);
  assert.equal(isDeployCommand('flux --token abc reconcile kustomization x').deploy, true);
  assert.equal(isDeployCommand('kubectl --as admin apply -k x').deploy, true);
});

test('deploy commands with completed value flags are refused with no env (finding a, H2)', () => {
  const cmds = [
    'helm --kube-tls-server-name x upgrade api ./chart',
    'flux --token abc reconcile kustomization x',
    'kubectl --as admin apply -k x',
  ];
  for (const cmd of cmds) {
    assert.equal(decide(cmd, {}, noIo).block, true, `expected refusal: ${cmd}`);
  }
});

// (b) MATERIAL: a cited authorization missing granted_by/granted_on/criteria
// was credited — effectiveClass only checked id/pattern/class match, and the
// authorization's own form violation (entry = "authorization <id>") was never
// in the hook's gating filter.
test('cited authorization missing granted_by/granted_on/criteria is unresolved - effective class 2 (finding b, H2)', () => {
  const proposal = baseProposal({ changeId: 'chg-h2-authform', classProposed: 0, authorizationId: 'auth-h2-incomplete' });
  const authorization = { kind: 'authorization', id: 'auth-h2-incomplete', pattern: 'k8s-manifest-bump', class: 0 };
  const io = fixedIo({ records: [proposal, authorization] });
  const r = decide('kubectl apply -k kube/overlays/prod', changeEnv('chg-h2-authform'), io);
  assert.equal(r.block, true);
  assert.match(r.reason, /class 2/);
});

// ---------------------------------------------------------------------------
// FIX ROUND 5 (owner J2) — gh api flag-aware walk, atlantis-comment
// unevaluability, read-only exemptions, verb-list additions.
// ---------------------------------------------------------------------------

// (a) gh api: flag-aware argv walk determines method + path; refuse when the
// method is mutating AND the path matches the ADR-0013 deploy-shaped surface.
test('gh api mutating workflow dispatch is deploy (finding a, J2)', () => {
  assert.equal(isDeployCommand('gh api -X POST repos/o/r/actions/workflows/cd.yml/dispatches -f ref=main').deploy, true);
});

test('gh api mutating run rerun (flag after path) is deploy (finding a, J2)', () => {
  assert.equal(isDeployCommand('gh api repos/o/r/actions/runs/123/rerun -X POST').deploy, true);
});

test('gh api --method POST release create is deploy (finding a, J2)', () => {
  assert.equal(isDeployCommand('gh api --method POST /repos/o/r/releases -f tag_name=v1').deploy, true);
});

test('gh api GET on a workflow-list path is not deploy (finding a, J2)', () => {
  assert.equal(isDeployCommand('gh api repos/o/r/actions/workflows').deploy, false);
});

test('deploy commands via gh api are refused with no env (finding a, J2)', () => {
  const cmds = [
    'gh api -X POST repos/o/r/actions/workflows/cd.yml/dispatches -f ref=main',
    'gh api repos/o/r/actions/runs/123/rerun -X POST',
    'gh api --method POST /repos/o/r/releases -f tag_name=v1',
  ];
  for (const cmd of cmds) {
    assert.equal(decide(cmd, {}, noIo).block, true, `expected refusal: ${cmd}`);
  }
});

test('gh api GET stays green with no env (finding a, J2)', () => {
  assert.equal(decide('gh api repos/o/r/actions/workflows', {}, noIo).block, false);
});

// (b) atlantis comment bodies: any whitespace between the two words; a
// flag-first `gh api` form must still be caught; a comment whose body is
// opaque (--body-file/-F/--input) is refused as unevaluable, never silently
// allowed.
test('atlantis apply trigger matches across any whitespace, double space (finding b, J2)', () => {
  assert.equal(isDeployCommand('gh pr comment 1 -b "atlantis  apply"').deploy, true);
  assert.equal(decide('gh pr comment 1 -b "atlantis  apply"', {}, noIo).block, true);
});

test('gh api flag-first atlantis-apply comment body is caught (finding b, J2)', () => {
  assert.equal(isDeployCommand('gh api -X POST repos/o/r/issues/5/comments -f body="atlantis apply"').deploy, true);
  assert.equal(decide('gh api -X POST repos/o/r/issues/5/comments -f body="atlantis apply"', {}, noIo).block, true);
});

test('gh pr comment via --body-file is refused as unevaluable, not silently allowed (finding b, J2)', () => {
  const r = decide('gh pr comment 1 --body-file ./comment.txt', {}, noIo);
  assert.equal(r.block, true);
  assert.match(r.reason, /unevaluable/);
});

test('gh issue comment via -F is refused as unevaluable (finding b, J2)', () => {
  const r = decide('gh issue comment 5 -F ./comment.txt', {}, noIo);
  assert.equal(r.block, true);
  assert.match(r.reason, /unevaluable/);
});

// (c) read-only exemptions.
test('kubectl apply view-last-applied stays read-only (finding c1, J2)', () => {
  assert.equal(isDeployCommand('kubectl apply view-last-applied -f deploy.yaml').deploy, false);
});

test('kubectl apply set-last-applied / edit-last-applied stay deploy (finding c1 red twin, J2)', () => {
  assert.equal(isDeployCommand('kubectl apply set-last-applied -f deploy.yaml --create-annotation=true').deploy, true);
  assert.equal(isDeployCommand('kubectl apply edit-last-applied deployment/api').deploy, true);
});

test('terraform/tofu state rm|mv with -dry-run stays green (finding c2, J2)', () => {
  assert.equal(isDeployCommand('terraform state rm -dry-run aws_instance.foo').deploy, false);
  assert.equal(isDeployCommand('terraform state mv -dry-run aws_instance.foo aws_instance.bar').deploy, false);
  assert.equal(isDeployCommand('tofu state rm -dry-run aws_instance.foo').deploy, false);
});

test('terraform/tofu state rm|mv without -dry-run is deploy (finding c2 red twin, J2)', () => {
  assert.equal(isDeployCommand('terraform state rm aws_instance.foo').deploy, true);
  assert.equal(isDeployCommand('terraform state mv aws_instance.foo aws_instance.bar').deploy, true);
});

test('pulumi refresh|destroy|import with --preview-only stays green (finding c3, J2)', () => {
  assert.equal(isDeployCommand('pulumi refresh --preview-only').deploy, false);
  assert.equal(isDeployCommand('pulumi destroy --preview-only').deploy, false);
  assert.equal(isDeployCommand('pulumi import aws:ec2/instance:Instance x i-1 --preview-only').deploy, false);
});

test('pulumi refresh|destroy|import without --preview-only is deploy (finding c3 red twin, J2)', () => {
  assert.equal(isDeployCommand('pulumi refresh').deploy, true);
  assert.equal(isDeployCommand('pulumi destroy').deploy, true);
  assert.equal(isDeployCommand('pulumi import aws:ec2/instance:Instance x i-1').deploy, true);
});

test('any family with --help/-h/terraform -help anywhere stays green (finding c4, J2)', () => {
  assert.equal(isDeployCommand('kubectl apply -k . --help').deploy, false);
  assert.equal(isDeployCommand('kubectl delete pod x -h').deploy, false);
  assert.equal(isDeployCommand('helm install x chart --help').deploy, false);
  assert.equal(isDeployCommand('terraform apply -auto-approve --help').deploy, false);
  assert.equal(isDeployCommand('terraform apply -auto-approve -help').deploy, false);
  assert.equal(isDeployCommand('pulumi up --help').deploy, false);
  assert.equal(isDeployCommand('gh workflow run cd.yml --help').deploy, false);
  assert.equal(isDeployCommand('argocd app sync my-app --help').deploy, false);
  assert.equal(isDeployCommand('flux reconcile kustomization my-app --help').deploy, false);
});

test('same commands without --help are deploy (finding c4 red twin, J2)', () => {
  assert.equal(isDeployCommand('kubectl apply -k .').deploy, true);
  assert.equal(isDeployCommand('kubectl delete pod x').deploy, true);
  assert.equal(isDeployCommand('helm install x chart').deploy, true);
  assert.equal(isDeployCommand('terraform apply -auto-approve').deploy, true);
  assert.equal(isDeployCommand('pulumi up').deploy, true);
  assert.equal(isDeployCommand('gh workflow run cd.yml').deploy, true);
  assert.equal(isDeployCommand('argocd app sync my-app').deploy, true);
  assert.equal(isDeployCommand('flux reconcile kustomization my-app').deploy, true);
});

// (d) verb-list additions.
test('gh release delete-asset / upload-asset are deploy (finding d, J2)', () => {
  assert.equal(isDeployCommand('gh release delete-asset v1 asset.zip').deploy, true);
  assert.equal(isDeployCommand('gh release upload-asset v1 asset.zip').deploy, true);
});

test('helm test is deploy (finding d, J2)', () => {
  assert.equal(isDeployCommand('helm test myrelease').deploy, true);
});

test('pulumi cancel is deploy (finding d, J2)', () => {
  assert.equal(isDeployCommand('pulumi cancel mystack').deploy, true);
});

test('terraform workspace new is deploy (finding d, J2)', () => {
  assert.equal(isDeployCommand('terraform workspace new staging').deploy, true);
});
