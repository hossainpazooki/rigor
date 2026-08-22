export const meta = {
  name: 'deployment-layer-build-round3',
  description: 'ADR-0013 fix round 3: 4 fixers (build tier) on the round-2 skeptic residuals, red-first -> integration-runner (mid) -> 4 skeptics (judgment)',
  phases: [
    { title: 'Build', detail: 'four fixers, disjoint files, each finding fixed red-first' },
    { title: 'Integrate', detail: 'integration-runner runs node --test + gates to green; touches nothing outside the fixers files' },
    { title: 'Verify', detail: 'skeptics re-refute, default refuted' },
  ],
}

let A = args
if (typeof A === 'string') { try { A = JSON.parse(A) } catch { A = null } }
const T = A?.tiers
if (!T?.build || !T?.mid || !T?.judgment) throw new Error('HALT: tiers not pinned via args.tiers {build, mid, judgment}')

const REPO = 'C:/Users/hossa/dev/rigor'

const CONTRACT = `
=== SHARED CONTRACT (ADR-0013 deployment layer, FIX ROUND 3) — code against THIS, not each other's files ===
Repo: ${REPO} (Git Bash: ~/dev/rigor). Node stdlib only. No new dependencies.
HARD RULES: you own ONLY the files listed under your owner id. Touch NOTHING else (last round an agent edited skills/implemented-vs-planned/SKILL.md out of scope; that was reverted). Never run git commands that write history. Never weaken or delete an existing assertion; node --test must stay fail 0 (currently 375 pass). Windows-safe; console-facing strings ASCII only.
THE SPEC is docs/adr/0013-deployment-layer-pre-change-authorization.md (sections 2, 3, 4, 5, 7). Re-read section 2's 'Schema rules that the gate enforces' and section 4's decision ladder.
RED-FIRST IS MANDATORY for every code fix: append the test(s); run them against the current code and capture the failing output verbatim into red_first; fix; re-run green. If a listed test is already green before your fix, say so per test.
STRUCTURED OUTPUT: your final StructuredOutput MUST include every required field (files_written, tests{cmd,output_tail}, red_first, notes, model_receipt). Last round one fixer's receipt failed validation for a missing field and the retry submitted placeholder "a" values — a fabricated receipt. Never do that: fill every field with the real content.
Existing API signatures are unchanged, with ONE addition owned by F3: hooks/shell-normalize.mjs gains export function expandArgv(command): string[][] — the same expansion as expandCommands but returning each normalized command as its argv ARRAY with quoted values kept intact as single tokens (expandCommands(cmd) must equal expandArgv(cmd).map(a => a.join(' '))).
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
  { id: 'G1', label: 'fix3:check-change-record', task: `OWNER G1 — you own ONLY scripts/check-change-record.mjs and tests/change-record.test.mjs. Round-2 skeptic residuals, each red-first:
(a) MATERIAL class-1 approval fail-open: a class-1 proposal with approval null/absent is currently clean. Add: in the outcome loop, if the linked (non-superseded) proposal's effective class is 1 and its approval is null/absent/incomplete -> P6 violation 'executed at class 1 with no complete approval on record'. RED tests: approval null + outcome; approval key absent + outcome. (A class-1 proposal with no outcome yet and approval null stays clean — it is pending.)
(b) extend the P5 executed-onto-unevaluable check: an outcome whose proposal's health_baseline.verdict is anything but 'pass' (fail OR unevaluable) with break_glass null -> P5 violation 'executed onto a non-pass baseline (<verdict>) with no break-glass record'. RED test for fail.
(c) inverted window (from > to) folds to unevaluable (empty evaluation window) and is a form violation; a signal whose last_sample_ts is after window.to is a form violation (sample outside the window). RED tests.
(d) non-vacuity pins the mutation run found missing: RED tests for naive ts_executed and naive outcome ts_recorded; an in-radius signal with last_sample_ts ABSENT (both foldHealth -> 'unevaluable' and findChangeRecordViolations -> P3 when verdict pass); class-1 approval with when absent; per-signal form lines asserting property === 'form' for: missing source, unknown outcome string, unknown scope string.
(e) value-only identity entries: value must be a non-empty string or a finite number; '' / null / undefined -> P2 form violation. RED test.
(f) CLI: a path-bearing identity entry whose file is missing under --root is UNEVALUABLE (exit 2, message 'cannot hash <path> - unevaluable'), never 'clean'. RED CLI test.
Run: node --test tests/change-record.test.mjs then node --test.` },
  { id: 'G2', label: 'fix3:change-guard', task: `OWNER G2 — you own ONLY hooks/change-guard.mjs and tests/change-guard.test.mjs. Round-2 skeptic residuals, each red-first:
(a) MATERIAL the hook discards every 'form' violation. Gate on form violations too, scoped to the selected proposal (and to records sharing its change_id): any matcher violation whose entry names the selected proposal's label/change_id, property in {form, P1, P2, P3, P6} -> refuse, listing them. RED tests at the hook: backout.kind 'apply-previous-module' -> deny; naive ts_proposed -> deny; naive signal last_sample_ts -> deny; probe_plan null -> deny; approval.when naive -> deny (class 1); backout.by '' -> deny.
(b) MATERIAL proposal selection ignores supersession: a later duplicate proposal for the same change_id WITHOUT supersedes must not replace the earlier one. Select the proposal via resolveSupersession semantics (import resolveSupersession from ../scripts/check-runlog.mjs, key 'change_id', over proposal-kind records): the selected proposal is the latest NON-SUPERSEDED proposal for the id; a duplicate without supersedes is a form violation (already emitted by the matcher) and now gating per (a). RED test: unevaluable baseline + later duplicate proposal (no supersedes) with pass baseline -> HALT (deny).
(c) MATERIAL global-flag stripping: handle pflag attached shorthand values (-nprod, -v6, -Ro/r, -sprod, -Cdir: a token starting with a known single-dash value flag and longer than 2 chars is flag+value); widen kubectl globals (--as, --as-group, --as-uid, --token, --username, --password, --cache-dir, --certificate-authority, --client-certificate, --client-key, --tls-server-name, --profile, --profile-output, --log-flush-frequency, --kuberc, --request-timeout, --cluster, --user, -v/--v; bool: --insecure-skip-tls-verify, --match-server-version, --warnings-as-errors, --disable-compression, optionally =true/=false), helm --kube-* family (--kube-token, --kube-as-user, --kube-as-group, --kube-apiserver, --kube-ca-file, --kube-insecure-skip-tls-verify, --registry-config, --repository-config, --repository-cache, --burst-limit, --qps), argocd (--plaintext, --insecure, --grpc-web, --server <v>, --auth-token <v>, --header <v>, --port-forward, --port-forward-namespace <v>), flux (--timeout <v>, --verbose, --kubeconfig <v>, --context <v>, -n/--namespace <v>); AND a safe fallback: after stripping known flags, skip any remaining leading '-'-prefixed token (do not consume a following value), then take the first non-flag token as the verb candidate; if it is not a recognised verb of the family (neither mutating nor read-only) skip it (it was an unknown flag's value) and continue to the next non-flag token. RED tests: 'kubectl -nprod apply -k x', 'kubectl --as=admin apply -k x', 'kubectl --as admin apply -k x', 'kubectl --token=abc apply -k x', 'kubectl --insecure-skip-tls-verify apply -k x', 'helm -nprod upgrade api ./chart', 'helm --kube-token=abc upgrade api ./chart', 'gh -Ro/r workflow run cd.yml', 'flux --timeout=5m reconcile source git x', 'argocd --plaintext app sync a' -> all deploy + refused; keep 'kubectl get pods -l app=apply' and 'kubectl -n prod get pods' green.
(d) break-glass 'when' must carry an explicit UTC offset at the hook (ADR section 2). RED test with when '2026-08-20T00:00:00'.
(e) pins the mutation run found missing: a compound break-glass record ('A && A') is refused; approval {who, when} (missing ref) and {who, when:'nope', ref} each independently refused; 'allow result has no reason key' asserted on the change-record allow and the break-glass allow paths too.
Run: node --test tests/change-guard.test.mjs then node --test. NOTE: scripts/check-change-record.mjs is being edited concurrently by G1 (approval-null P6 at outcome level; P5 on non-pass baseline) — code against the contract; if a gate-dependent test is red only because G1 has not landed, say so per test in notes.` },
  { id: 'G3', label: 'fix3:shell-normalize+git-guard', task: `OWNER G3 — you own ONLY hooks/shell-normalize.mjs, hooks/git-guard.mjs, tests/git-guard.test.mjs, tests/shell-normalize.test.mjs. Round-2 skeptic residuals, each red-first:
(a) BLOCKING git-guard re-splits the joined string, so a quoted flag value with whitespace displaces the gh api path. Add export function expandArgv(command): string[][] to shell-normalize (argv arrays with quoted values intact as single tokens; expandCommands === expandArgv mapped through join(' ')). In git-guard, run isGhBlocked over the argv ARRAY from expandArgv (never re-split a joined string); parse gh api flags over that array. Also accept '-X=PUT' (strip a leading '=' after an attached short flag) and '--method=PUT'. RED tests: 'gh api -H "Accept: application/vnd.github+json" -X PUT repos/o/r/pulls/1/merge'; 'gh api -X PUT -f message="update file" repos/o/r/contents/p'; 'gh api --method PUT -f commit_title="Merge it" repos/o/r/pulls/1/merge'; 'gh api -X POST -f base=main -f head=feature -f commit_message="merge branch" repos/o/r/merges'; 'gh api --method PUT -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" /repos/O/R/pulls/N/merge -f "commit_title=Expand enum"'; 'gh api -X=PUT repos/o/r/pulls/1/merge' -> all block. Keep green: 'gh api -H "Accept: application/vnd.github+json" repos/o/r/pulls/1/merge', 'gh api --paginate repos/o/r/pulls/1/merge', 'gh api -X GET -f per_page=100 repos/o/r/git/refs', 'gh api --jq .sha repos/o/r/git/commits/abc'.
(b) MATERIAL GraphQL history writes: 'gh api graphql' whose any argument text contains 'mutation' AND any of mergePullRequest | createCommitOnBranch | updateRef | createRef | deleteRef | enablePullRequestAutoMerge -> block. RED test; keep a query-only graphql call green.
(c) shell-normalize prefixes: strip 'time', a leading '{' token, and leading shell keywords then|do|else|elif (a segment like 'if true; then git commit -m x; fi' splits on ';' so the 'then git commit -m x' segment must normalize to 'git commit -m x'); env long/attached forms (--unset=NAME, -uNAME, -CDIR, --chdir=DIR, -S <string>, and a terminating '--'); xargs -L N / -LN / -P N / -PN / -d <delim> / -a <file>. RED tests for each in tests/shell-normalize.test.mjs and the git forms ('time git commit -m x', '{ git commit -m x; }', 'then git commit -m x', 'env --unset=FOO git commit -m x', 'env -i -- git commit -m x', 'xargs -L1 git commit -m x') in tests/git-guard.test.mjs.
Keep all 24 pre-existing git-guard tests and every round-1/round-2 test green. Run: node --test tests/git-guard.test.mjs tests/shell-normalize.test.mjs then node --test.` },
  { id: 'G4', label: 'fix3:skills', task: `OWNER G4 — you own ONLY the six files under skills/change-backout-exercised, skills/release-artifact-integrity, skills/health-signal-fail-closed, skills/post-implementation-probe, skills/break-glass-on-record, skills/change-class-earned (SKILL.md each). Prose: red-first = n/a; verify with node scripts/check-surface-scrub.mjs and grep -rn -i settled skills/change-backout-exercised skills/release-artifact-integrity skills/health-signal-fail-closed skills/post-implementation-probe skills/break-glass-on-record skills/change-class-earned (must be empty; do NOT grep or touch any other skill). Fixes:
break-glass-on-record: (1) rewrite move 5's first sentence exactly: 'An outcome whose health.verdict is unevaluable with break_glass: null is the one place the gate halts (exit 2: the newest record carries an honest unevaluable verdict, ADR-0013 section 5); a well-formed outcome.break_glass on that outcome takes it out of the halt channel. An outcome that executed onto a non-pass baseline (unevaluable or fail) with break_glass: null is not a halt - it is a P5 violation (exit 1).' and remove the self-contradiction; (2) Honest limit / detective row: the transcription's when must carry an explicit UTC offset (a naive timestamp is a P5 form violation) and the hook now requires the same offset on the standalone record's when.
post-implementation-probe: reword the 'first domain' sentence near line 15 to a generic anti-pattern ('a post-deploy check that curls the root and passes whether or not the new artifact is live').
health-signal-fail-closed: Preventive row — state precisely: the hook selects the latest non-superseded proposal (a duplicate without supersedes is a form violation and is refused), reads health_baseline.verdict directly (unevaluable -> HALT, fail -> refused), and refuses any form violation scoped to that proposal (naive timestamps included); add to move 5: an inverted window (from > to) is unevaluable and a sample after window.to is a form violation.
change-backout-exercised: Preventive row — an out-of-vocabulary kind is refused at the edge (form violations scoped to the proposal now gate); keep the Record fields vocabulary sentence.
release-artifact-integrity: Detective row — 'recomputed when the file is present under --root; a path-bearing entry whose file cannot be hashed makes the CLI exit 2 (unevaluable), never clean'; value-only entries must carry a non-empty string or finite number (empty/null is a P2 form violation) — say so where 'value-only entries are form-checked' appears.
change-class-earned: add one sentence to the detective/record section: an outcome executed at effective class 1 with no complete approval (who, when, ref) on its proposal is a P6 violation; a pending class-1 proposal with approval null is legitimate until it executes.` },
]

phase('Build')
const fixed = await parallel(FIXERS.map((b) => () =>
  agent(`${CONTRACT}\n\n${b.task}\n\nReturn the structured receipt with EVERY field filled.${RECEIPT}`, { label: b.label, phase: 'Build', model: T.build, schema: BUILDER_SCHEMA })
    .then((r) => ({ id: b.id, label: b.label, requested: T.build, ...(r ?? { files_written: [], tests: { cmd: '', output_tail: '' }, red_first: 'NULL RESULT', notes: 'NULL RESULT', model_receipt: 'null-result' }) }))
))
log(`fix round 3: ${fixed.filter((b) => b.model_receipt !== 'null-result').length}/4 fixers returned`)

phase('Integrate')
const integration = await agent(`${CONTRACT}

You are the integration closer (rigor integration-runner). Four fixers edited disjoint files (G1: scripts/check-change-record.mjs + tests/change-record.test.mjs; G2: hooks/change-guard.mjs + tests/change-guard.test.mjs; G3: hooks/shell-normalize.mjs, hooks/git-guard.mjs, tests/git-guard.test.mjs, tests/shell-normalize.test.mjs; G4: the six ADR-0013 skill files). You may edit ONLY those files, and only to resolve cross-file drift. Run from ${REPO}:
  1. node --test  (fail must be 0; report pass count)
  2. node scripts/check-surface-scrub.mjs
  3. node scripts/check-tier-sync.mjs
  4. grep -rn -i settled skills/change-backout-exercised skills/release-artifact-integrity skills/health-signal-fail-closed skills/post-implementation-probe skills/break-glass-on-record skills/change-class-earned  (must be empty — ONLY these six; other skills are out of scope)
  5. git status --short  (report it verbatim; flag any modified path outside the fixers' files)
  6. Hook smokes via stdin: 'kubectl -nprod apply -k kube/overlays/prod' (deny); 'gh api -H "Accept: application/vnd.github+json" -X PUT repos/o/r/pulls/1/merge' through hooks/git-guard.mjs (deny); 'time git commit -m x' through git-guard (deny); 'kubectl -n prod get pods' (allow, no reason key).
Fixer receipts: ${JSON.stringify(fixed.map((b) => ({ id: b.id, files: b.files_written, notes: String(b.notes).slice(0, 500) })))}
Return { gates: [{cmd, exit_code, output_tail}], fixes_made: [{file, why}], green: boolean, model_receipt }.${RECEIPT}`,
  { label: 'integration-runner', phase: 'Integrate', agentType: 'rigor:integration-runner', schema: {
    type: 'object', required: ['gates', 'fixes_made', 'green', 'model_receipt'],
    properties: {
      gates: { type: 'array', items: { type: 'object', required: ['cmd', 'exit_code', 'output_tail'], properties: { cmd: { type: 'string' }, exit_code: { type: 'integer' }, output_tail: { type: 'string' } } } },
      fixes_made: { type: 'array', items: { type: 'object', required: ['file', 'why'], properties: { file: { type: 'string' }, why: { type: 'string' } } } },
      green: { type: 'boolean' }, model_receipt: { type: 'string' } } } })
log(`integrate: green=${integration?.green}`)

phase('Verify')
const SK = `You are refuting one load-bearing claim about the rigor repo at ${REPO} after FIX ROUND 3 of ADR-0013's deployment layer. Read docs/adr/0013-deployment-layer-pre-change-authorization.md first (sections 2, 4, 5, 7). Default to REFUTED unless you find evidence the claim survives; probe decide()/matcher functions with your own inputs from scratch files under os.tmpdir(); mutate scratch COPIES to test non-vacuity; never trust a fixer's receipt or the integration report. Read-only on the repo. Return the structured verdict.${RECEIPT}\n\nCLAIM TO REFUTE: `
const CLAIMS = [
  { key: 'gate-r3', claim: 'scripts/check-change-record.mjs: an outcome executed at effective class 1 with approval null/absent/incomplete is a P6 violation (a pending class-1 proposal with no outcome stays clean); an outcome after a non-pass baseline (fail or unevaluable) with break_glass null is P5; inverted window is unevaluable + form; sample after window.to is form; value-only identity entries must be non-empty string or finite number; CLI exits 2 when a path-bearing entry cannot be hashed under --root; and the previously-unpinned checks (naive outcome timestamps, absent last_sample_ts, approval.when absent, per-signal form lines) now each have a test that fails under a targeted mutation of a scratch copy. node --test fail 0.' },
  { key: 'hook-r3', claim: 'hooks/change-guard.mjs: form violations scoped to the selected proposal now gate (apply-previous-module, naive ts_proposed, naive last_sample_ts, probe_plan null, naive approval.when, empty backout.by are all refused); proposal selection honours supersession (a later duplicate without supersedes does not mask an unevaluable baseline); pflag attached values and the widened global-flag sets are stripped (kubectl -nprod, --as=admin, --as admin, --token=abc, --insecure-skip-tls-verify; helm -nprod, --kube-token=abc; gh -Ro/r; flux --timeout=5m; argocd --plaintext) while kubectl get pods -l app=apply and kubectl -n prod get pods stay green; break-glass when needs an explicit offset; compound break-glass record refused; approval ref / when-parse independently pinned; no reason key on all three allow paths. Mutate a scratch copy to confirm each pin is non-vacuous.' },
  { key: 'git-guard-r3', claim: 'hooks/git-guard.mjs + hooks/shell-normalize.mjs: gh api flag-first forms with whitespace-bearing quoted values and -X=PUT are blocked (the five listed forms incl. the GitHub REST-docs form) while the quoted-header GET reads stay green; gh api graphql mutations naming mergePullRequest/createCommitOnBranch/updateRef/createRef/deleteRef are blocked and a query-only call is green; time / { / then|do|else prefixes, env --unset=/-uNAME/-CDIR/--chdir=/-S/--, and xargs -L/-P/-d/-a are normalized so the wrapped git command is caught; expandArgv exists and expandCommands equals expandArgv joined; all 24 pre-existing tests green. Try at least ten NEW bypass forms of your own devising (quoting, nesting, aliases, heredocs, command substitution inside flags) and report which still pass — each is a finding.' },
  { key: 'skills-r3', claim: 'The six ADR-0013 skills now match the code after round 3: break-glass move 5 attributes the exit-2 halt to outcome.health (not the baseline) and states the P5 non-pass-baseline rule and the offset rule on when; post-implementation-probe has no first-domain narrative; health preventive row describes supersession-aware selection, direct verdict read, and form-violation gating, plus inverted-window/sample-after-to rules; backout preventive row says an out-of-vocabulary kind is refused at the edge; integrity detective row says a missing file makes the CLI exit 2 and value-only entries must be non-empty; change-class-earned states the class-1 outcome-without-approval P6 rule. Each statement must be checked AGAINST THE CODE by probing it, not by reading the skill. Also confirm: no file outside the six skills and the four code/test pairs is modified (git status), the literal word settled is absent from the six skills, and surface-scrub is clean.' },
]
const verdicts = await parallel(CLAIMS.map((c) => () =>
  agent(`${SK}${c.claim}`, { label: `skeptic:${c.key}`, phase: 'Verify', agentType: 'rigor:skeptic-verifier', schema: VERDICT })
    .then((v) => ({ key: c.key, claim: c.claim, ...(v ?? { verdict: 'UNVERIFIABLE', findings: [], model_receipt: 'null-result' }) }))
))
log(`verify: ${verdicts.filter((v) => v.verdict === 'SURVIVES').length} survive / ${verdicts.filter((v) => v.verdict === 'REFUTED').length} refuted / ${verdicts.filter((v) => v.verdict === 'PARTIAL').length} partial`)

return { fixed, integration, verdicts }
