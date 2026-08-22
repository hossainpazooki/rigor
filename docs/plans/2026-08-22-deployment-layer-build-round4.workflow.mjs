export const meta = {
  name: 'deployment-layer-build-round4',
  description: 'ADR-0013 fix round 4 (final this session): 4 fixers (build tier) on the round-3 residuals, red-first -> integration-runner (mid) -> 4 skeptics (judgment)',
  phases: [
    { title: 'Build', detail: 'four fixers, disjoint files, each finding fixed red-first' },
    { title: 'Integrate', detail: 'integration-runner runs node --test + gates to green; edits nothing' },
    { title: 'Verify', detail: 'skeptics re-refute, default refuted' },
  ],
}

let A = args
if (typeof A === 'string') { try { A = JSON.parse(A) } catch { A = null } }
const T = A?.tiers
if (!T?.build || !T?.mid || !T?.judgment) throw new Error('HALT: tiers not pinned via args.tiers {build, mid, judgment}')

const REPO = 'C:/Users/hossa/dev/rigor'

const CONTRACT = `
=== SHARED CONTRACT (ADR-0013 deployment layer, FIX ROUND 4 - final) — code against THIS, not each other's files ===
Repo: ${REPO}. Node stdlib only. You own ONLY the files under your owner id; touch nothing else. Never write git history. Never weaken or delete an assertion; node --test must stay fail 0 (currently 425 pass). Console-facing strings ASCII only.
THE SPEC is docs/adr/0013-deployment-layer-pre-change-authorization.md (sections 2, 4, 5, 7).
RED-FIRST IS MANDATORY for code fixes: append tests, run against current code, capture the failing output verbatim into red_first, fix, re-run green; say per test if it was already green.
STRUCTURED OUTPUT: fill EVERY required field (files_written, tests{cmd,output_tail}, red_first, notes, model_receipt) with real content. A placeholder receipt is a fabrication and check-dispatch flags it.
=== END CONTRACT ===
`

const RECEIPT = ' End with your model_receipt = the bare model id from your own system prompt.'
const BUILDER_SCHEMA = {
  type: 'object', required: ['files_written', 'tests', 'red_first', 'notes', 'model_receipt'],
  properties: {
    files_written: { type: 'array', items: { type: 'string' } },
    tests: { type: 'object', required: ['cmd', 'output_tail'], properties: { cmd: { type: 'string' }, output_tail: { type: 'string' } } },
    red_first: { type: 'string' }, notes: { type: 'string' }, model_receipt: { type: 'string' },
  },
}
const VERDICT = {
  type: 'object', required: ['verdict', 'findings', 'model_receipt'],
  properties: {
    verdict: { type: 'string', enum: ['REFUTED', 'SURVIVES', 'PARTIAL'] },
    findings: { type: 'array', items: { type: 'object', required: ['claim', 'verdict', 'evidence', 'severity', 'suggested_change'], properties: {
      claim: { type: 'string' }, verdict: { type: 'string', enum: ['REFUTED', 'SURVIVES', 'UNVERIFIABLE'] }, evidence: { type: 'string' },
      severity: { type: 'string', enum: ['blocking', 'material', 'minor'] }, suggested_change: { type: 'string' } } } },
    model_receipt: { type: 'string' },
  },
}

const FIXERS = [
  { id: 'H1', label: 'fix4:check-change-record', task: `OWNER H1 — you own ONLY scripts/check-change-record.mjs and tests/change-record.test.mjs. Round-3 residuals, red-first:
(a) MATERIAL outcome-side effective class must be computed AS OF EXECUTION: in the outcome loop, compute the class with the misfire lookup bounded so the outcome under check (and anything recorded after its ts_executed) cannot demote its own proposal. Give effectiveClass an optional third parameter beforeTs (ISO string): when supplied, latestOutcomeIsMisfireUnrepaired only considers outcomes with ts_executed < beforeTs and reproofs before that point. RED test: class-0 instance (valid class-0 authorization, approval null) whose own outcome is 'misfire' -> NO approval P6 line (the misfire itself is still recorded; the later proposal for the pattern is demoted as before).
(b) CLI robustness: a path-bearing identity entry that exists but is unreadable (a DIRECTORY, or readFileSync throwing) -> 'cannot hash <path> - unevaluable', exit 2, no stack trace (wrap in try/catch + statSync().isFile()); path '' or non-string path with a sha256 -> P2 form violation (never silently skipped); only collect paths from NON-superseded proposals; absolute paths and '..' segments in identity paths -> P2 form violation (the hook already refuses them). RED CLI test with a directory at the identity path; RED tests for path '' and for '../x'.
(c) sha256 form: when present it must match /^[0-9a-f]{64}$/; an entry with sha256 present but invalid is a P2 form violation. RED test.
(d) test non-vacuity: rewrite the foldHealth inverted-window test so the sample is NOT stale (from 10:00, to 09:00, sample 10:30) so it fails when the inverted-window branch is deleted; add a RED test asserting property 'form' and /missing last_sample_ts/ for an in-radius signal with the key absent.
Run: node --test tests/change-record.test.mjs then node --test.` },
  { id: 'H2', label: 'fix4:change-guard', task: `OWNER H2 — you own ONLY hooks/change-guard.mjs and tests/change-guard.test.mjs. Round-3 residuals, red-first:
(a) MATERIAL (an ADR-0013 self-refutation-3 misfire: a read-only command refused) the round-3 fallback scans past the first non-flag token and refuses 'kubectl auth can-i create pods', 'helm search repo install', 'kubectl config set current-context x'. Replace with this exact rule: after stripping known global flags, read the first non-flag token T. If T is a known MUTATING verb of the family -> deploy. If T is a known READ-ONLY verb (maintain an explicit read-only list per family: kubectl get|describe|diff|kustomize|logs|top|explain|version|config|auth|api-resources|api-versions|cluster-info|events|wait|port-forward|proxy|completion|options|plugin|rollout(status|history); helm template|diff|status|list|get|history|lint|show|dependency|repo|search|pull|package|env|verify|version|completion; terraform/tofu plan|show|validate|fmt|init|output|state(list|show|pull)|workspace(list|show|select|new)|providers|graph|console|test|version|login|logout|metadata|get; pulumi preview|stack(ls|output|export|history|tag|select)|config|whoami|about|version|login|logout|plugin; gh workflow(list|view)|run(list|view|watch|download)|release(list|view|download)|pr(list|view|diff|checks|status)|api(GET)|auth|repo|issue; argocd app(get|diff|list|history|manifests|logs|wait|resources)|account|version|context|cluster(list|get)|proj(list|get)|repo(list|get); flux get|check|logs|tree|diff|version|export|stats|events|completion) -> NOT deploy, stop. If T is unknown AND the token immediately before it starts with '-' (an unlisted value-taking flag), skip T ONCE and evaluate the next non-flag token by the same rule. Otherwise NOT deploy. Complete the value-flag sets: helm --kube-tls-server-name; flux --as, --as-group, --as-uid, --cluster, --server, --token, --tls-server-name, --user, --cache-dir, --certificate-authority, --client-certificate, --client-key, --insecure-skip-tls-verify(bool). RED tests (green side): 'kubectl auth can-i create pods', 'kubectl auth can-i delete pods -n prod', 'helm search repo install', 'kubectl config set current-context x' -> NOT deploy. RED tests (red side): 'helm --kube-tls-server-name list upgrade api ./chart' -> deploy; 'flux --token get reconcile kustomization x' -> deploy; 'kubectl --as admin apply -k x' still deploy.
(b) MATERIAL a cited authorization that fails form is credited: extend the gating filter to include matcher violations whose entry is the cited authorization ('authorization <id>'), AND make effectiveClass-equivalent logic in the hook treat a cited authorization with missing granted_by/granted_on/criteria as unresolved (effective class 2). RED test: class-0 proposal citing {kind:'authorization', id, pattern, class:0} with no granted_by/granted_on/criteria -> refused.
(c) probe_plan: add to the file header comment and to the refusal-path comments that P4 is deliberately NOT a preventive control (ADR section 3 property 4: review + evidentiary), so probe_plan {} passes the hook by design; keep the existing probe_plan-null refusal only if it comes from a 'form' violation (probe_plan must be an object) — state which.
(d) drop the word 'independently' from the two approval tests' names/assertions and the redundant hook-level ref/when re-checks, leaving approval:null/absent as the hook's own check (the matcher's form violation covers the rest); or keep them but pin them with a stubbed-matcher test. Choose one and say which.
Run: node --test tests/change-guard.test.mjs then node --test.` },
  { id: 'H3', label: 'fix4:shell-normalize+git-guard', task: `OWNER H3 — you own ONLY hooks/shell-normalize.mjs, hooks/git-guard.mjs, tests/git-guard.test.mjs, tests/shell-normalize.test.mjs. Round-3 residuals, red-first:
(a) env -S: treat the -S (and --split-string=) argument like an sh -c body — split it into tokens and expand it as an inner command (and continue the remaining argv as well). RED tests: "env -S 'git commit -m x'" -> block; 'env -S git commit -m x' -> block; "env -S 'kubectl apply -k x'" expands to include 'kubectl apply -k x'.
(b) xargs attached delimiter: strip a leading token matching /^-d./ (and -I<x> already handled). RED test: 'xargs -d, git commit -m x' -> block.
(c) gh api path normalization: strip a leading '/' from the resolved endpoint path before every check (graphql AND the REST mutating paths). RED test: "gh api /graphql -f query='mutation { mergePullRequest(input:{pullRequestId:\\"x\\"}) { clientMutationId } }'" -> block; keep "gh api /repos/o/r/pulls/1" green.
(d) gh global flags before the pr/merge verb: strip -R/--repo <v>, --repo=<v>, -R<v>, --hostname <v>/=<v> before reading positions. RED tests: 'gh pr --repo o/r merge 1', 'gh -R o/r pr merge 1', 'gh --repo=o/r pr merge 1' -> block; 'gh -R o/r pr view 1' green.
(e) graphql body out-of-band: 'gh api graphql' (or /graphql) with --input <file> or -F query=@<file> (an @file field) is BLOCKED (mutating-by-default when the body cannot be read); add the blind spot note in the file header: a body supplied via $(cat file) is visible to the normalizer only if the subshell expansion surfaces its text, which it does not — named, not closed. RED tests for --input and -F query=@file; keep '-f query="query { viewer { login } }"' green.
Keep all prior tests green. Run: node --test tests/git-guard.test.mjs tests/shell-normalize.test.mjs then node --test.` },
  { id: 'H4', label: 'fix4:skills', task: `OWNER H4 — you own ONLY the six SKILL.md files under skills/change-backout-exercised, skills/release-artifact-integrity, skills/health-signal-fail-closed, skills/post-implementation-probe, skills/break-glass-on-record, skills/change-class-earned. Prose; verify with node scripts/check-surface-scrub.mjs and grep -rn -i settled over ONLY those six directories (must be empty). Fixes, each checked against the code by reading scripts/check-change-record.mjs and hooks/change-guard.mjs as they stand (H1/H2 are editing them concurrently - describe the rule the ADR states, not a line number):
break-glass-on-record move 5 - replace the first sentence with EXACTLY: 'The gate halts (exit 2) when a change's newest record carries an honest unevaluable verdict with no break-glass - outcome.health on an executed change, or health_baseline on a proposal that has not executed yet - and when a path-bearing identity entry cannot be hashed. A well-formed outcome.break_glass takes an executed change out of that channel. An outcome that executed onto a non-pass baseline (unevaluable or fail) with break_glass: null is not a halt; it is a P5 violation (exit 1).' Remove 'the one place'.
change-class-earned - the outcome-side rule: 'an outcome executed at effective class 1 - the class computed as of execution, so an instance's own later outcome cannot demote it - with no complete approval (who, when, ref) on its proposal is a P6 violation; a pending class-1 proposal with approval null is legitimate until it executes'. Also add: a cited authorization that fails form (no granted_by, granted_on, criteria) does not resolve - effective class 2 at both controls.
release-artifact-integrity detective row - 'recomputed when the file is present and readable under --root; a path-bearing entry whose file is missing or unreadable makes the CLI exit 2 (unevaluable), never clean; a sha256 that is present but not 64 lowercase hex characters is a P2 form violation; an identity path that is absolute or contains .. is a P2 form violation'.
health-signal-fail-closed - no change unless you find a statement contradicted by the ADR; report what you checked.
change-backout-exercised, post-implementation-probe - add one sentence to post-implementation-probe's Control shape table: 'Preventive: not assigned - by design, a probe plan is reviewed, not gated at the edge; an empty plan is a P4 detective finding, and the hook does not refuse on it.'` },
]

phase('Build')
const fixed = await parallel(FIXERS.map((b) => () =>
  agent(`${CONTRACT}\n\n${b.task}\n\nReturn the structured receipt with EVERY field filled.${RECEIPT}`, { label: b.label, phase: 'Build', model: T.build, schema: BUILDER_SCHEMA })
    .then((r) => ({ id: b.id, label: b.label, requested: T.build, ...(r ?? { files_written: [], tests: { cmd: '', output_tail: '' }, red_first: 'NULL RESULT', notes: 'NULL RESULT', model_receipt: 'null-result' }) }))
))
log(`fix round 4: ${fixed.filter((b) => b.model_receipt !== 'null-result').length}/4 fixers returned`)

phase('Integrate')
const integration = await agent(`${CONTRACT}

You are the integration closer (rigor integration-runner). Four fixers edited disjoint files (H1: scripts/check-change-record.mjs + tests/change-record.test.mjs; H2: hooks/change-guard.mjs + tests/change-guard.test.mjs; H3: hooks/shell-normalize.mjs, hooks/git-guard.mjs, tests/git-guard.test.mjs, tests/shell-normalize.test.mjs; H4: six skill files). Edit ONLY those files and only for cross-file drift. From ${REPO}:
  1. node --test  (fail must be 0; report pass count)
  2. node scripts/check-surface-scrub.mjs
  3. node scripts/check-tier-sync.mjs
  4. grep -rn -i settled skills/change-backout-exercised skills/release-artifact-integrity skills/health-signal-fail-closed skills/post-implementation-probe skills/break-glass-on-record skills/change-class-earned  (must be empty; ONLY these six)
  5. git status --short (verbatim; flag any modified path outside the fixers' files — do NOT touch them)
  6. Smokes via stdin: 'kubectl auth can-i create pods' (allow, no reason key); 'kubectl -nprod apply -k x' (deny); "env -S 'git commit -m x'" through git-guard (deny); 'gh pr --repo o/r merge 1' through git-guard (deny); 'gh -R o/r pr view 1' through git-guard (allow).
Fixer receipts: ${JSON.stringify(fixed.map((b) => ({ id: b.id, files: b.files_written, notes: String(b.notes).slice(0, 400) })))}
Return { gates: [{cmd, exit_code, output_tail}], fixes_made: [{file, why}], green: boolean, model_receipt }.${RECEIPT}`,
  { label: 'integration-runner', phase: 'Integrate', agentType: 'rigor:integration-runner', schema: {
    type: 'object', required: ['gates', 'fixes_made', 'green', 'model_receipt'],
    properties: {
      gates: { type: 'array', items: { type: 'object', required: ['cmd', 'exit_code', 'output_tail'], properties: { cmd: { type: 'string' }, exit_code: { type: 'integer' }, output_tail: { type: 'string' } } } },
      fixes_made: { type: 'array', items: { type: 'object', required: ['file', 'why'], properties: { file: { type: 'string' }, why: { type: 'string' } } } },
      green: { type: 'boolean' }, model_receipt: { type: 'string' } } } })
log(`integrate: green=${integration?.green}`)

phase('Verify')
const SK = `You are refuting one load-bearing claim about the rigor repo at ${REPO} after FIX ROUND 4 (the final round this session) of ADR-0013's deployment layer. Read docs/adr/0013-deployment-layer-pre-change-authorization.md sections 2, 4, 5, 7 first. Default to REFUTED unless you find evidence the claim survives; probe with your own inputs from scratch files under os.tmpdir(); mutate scratch COPIES for non-vacuity; never trust receipts. Read-only on the repo. Severity discipline: 'blocking' only for a mutating command allowed or a read-only command refused; 'material' for a control that can be made to pass on bad input; 'minor' otherwise. Return the structured verdict.${RECEIPT}\n\nCLAIM TO REFUTE: `
const CLAIMS = [
  { key: 'gate-r4', claim: 'scripts/check-change-record.mjs: an instance\'s own misfire outcome no longer demotes its proposal (no spurious approval P6 on a class-0 misfire); the CLI exits 2 with a reason line (no stack trace) on a directory or unreadable file at an identity path; empty/absolute/..-containing identity paths and malformed sha256 are P2 form violations; superseded proposals\' paths are not collected; the inverted-window fold branch and the missing-last_sample_ts form line are each pinned by a test that fails under mutation. node --test fail 0.' },
  { key: 'hook-r4', claim: 'hooks/change-guard.mjs: read-only commands in every family stay green (kubectl auth can-i create pods, kubectl config set current-context x, helm search repo install, kubectl get pods -l app=apply) while mutating forms behind unknown value flags are still refused (helm --kube-tls-server-name list upgrade api ./chart, flux --token get reconcile kustomization x, kubectl --as admin apply -k x, kubectl -nprod apply); a cited authorization missing granted_by/granted_on/criteria is refused as unresolved; P4 is documented as deliberately non-preventive. Devise at least ten new command forms of your own (real CLI spellings) and report any read-only form refused or mutating form allowed as blocking.' },
  { key: 'git-guard-r4', claim: 'hooks/git-guard.mjs + hooks/shell-normalize.mjs: env -S bodies, xargs -d<delim>, gh api /graphql (leading slash), gh pr --repo o/r merge / gh -R o/r pr merge, and gh api graphql with --input or -F query=@file are all blocked while gh -R o/r pr view, gh api /repos/o/r/pulls/1 and a query-only graphql call stay green; the out-of-band body blind spot is named in the file header; all 24 pre-existing tests green. Devise at least ten new bypass forms and report which pass.' },
  { key: 'skills-r4', claim: 'The six ADR-0013 skills match the code after round 4: break-glass move 5 attributes exit 2 to the NEWEST record (outcome.health or a not-yet-executed baseline) and to unhashable identity paths; change-class-earned states the as-of-execution class rule and the unresolved-authorization rule; release-artifact-integrity states missing-or-unreadable -> exit 2, sha256 hex form, and path restrictions; post-implementation-probe says P4 is deliberately not preventive. Check each AGAINST THE CODE by probing; confirm settled absent from the six, surface-scrub clean, and no modified path outside the fixers\' files plus the docs the orchestrator owns (AGENTS.md, docs/*, hooks/hooks.json, scripts/check-runlog.mjs).' },
]
const verdicts = await parallel(CLAIMS.map((c) => () =>
  agent(`${SK}${c.claim}`, { label: `skeptic:${c.key}`, phase: 'Verify', agentType: 'rigor:skeptic-verifier', schema: VERDICT })
    .then((v) => ({ key: c.key, claim: c.claim, ...(v ?? { verdict: 'UNVERIFIABLE', findings: [], model_receipt: 'null-result' }) }))
))
log(`verify: ${verdicts.filter((v) => v.verdict === 'SURVIVES').length} survive / ${verdicts.filter((v) => v.verdict === 'REFUTED').length} refuted / ${verdicts.filter((v) => v.verdict === 'PARTIAL').length} partial`)

return { fixed, integration, verdicts }
