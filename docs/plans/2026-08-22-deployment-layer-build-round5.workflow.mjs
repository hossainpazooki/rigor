export const meta = {
  name: 'deployment-layer-build-round5',
  description: 'ADR-0013 fix round 5 (bounded, final): 3 code fixers + 1 skills fixer (build tier) on the blocking/cheap round-4 residuals, red-first -> integration-runner (mid) -> 3 skeptics (judgment)',
  phases: [
    { title: 'Build', detail: 'four fixers, disjoint files, red-first' },
    { title: 'Integrate', detail: 'integration-runner runs node --test + gates; edits nothing' },
    { title: 'Verify', detail: 'skeptics re-refute the fixed forms only (no new-form hunting this round)' },
  ],
}

let A = args
if (typeof A === 'string') { try { A = JSON.parse(A) } catch { A = null } }
const T = A?.tiers
if (!T?.build || !T?.mid || !T?.judgment) throw new Error('HALT: tiers not pinned via args.tiers {build, mid, judgment}')

const REPO = 'C:/Users/hossa/dev/rigor'

const CONTRACT = `
=== SHARED CONTRACT (ADR-0013 deployment layer, FIX ROUND 5 - bounded, final) — code against THIS, not each other's files ===
Repo: ${REPO}. Node stdlib only. You own ONLY the files under your owner id; touch nothing else. Never write git history. Never weaken or delete an assertion; node --test must stay fail 0 (currently 455 pass). Console-facing strings ASCII only.
THE SPEC is docs/adr/0013-deployment-layer-pre-change-authorization.md. The shared normalizer hooks/shell-normalize.mjs is owned by J3 this round; J2 (change-guard) must NOT edit it - if change-guard needs a normalizer behaviour, code against the contract below and say so.
NORMALIZER CONTRACT ADDITIONS (J3 implements; J2/git-guard consume): (1) splitSegments also splits on a lone '&' that is not part of '&&', '>&', '&>', or a digit-prefixed '2>&1' form; (2) normalizeSegment strips leading shell keywords if|while|until|elif|then|do|else|'{'|'!' and leading redirection tokens (e.g. 2>/dev/null, >out, <in), and the wrappers sudo|doas (with -E, -n, -H, -i, -s, -u <user>, --), setsid, stdbuf <opt>, flock [opts] <file>, ionice [opts], chrt [opts], taskset <mask>, unbuffer, time [-p], exec [-a NAME], nice with attached -nN / --adjustment=N; (3) argv[0] binary name is lowercased after directory/.exe stripping; (4) pwsh|powershell -c|-Command|-NoProfile... <body> and cmd /c|/k <body> bodies are inner commands like sh -c; ksh|ash|fish|mksh join the shell list; busybox <shell> -c too; (5) env -S<attached> and combined clusters containing S split the string; xargs --delimiter[=] and the booleans -r -t -p -x -E are stripped; (6) unquoted backslash before an ordinary character is dropped by the tokenizer (bash semantics: a\\pply -> apply).
RED-FIRST IS MANDATORY for code fixes: append tests, run against current code, capture failing output verbatim into red_first, fix, re-run green; say per test if it was already green.
STRUCTURED OUTPUT: fill every required field with real content.
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
  { id: 'J1', label: 'fix5:check-change-record', task: `OWNER J1 — you own ONLY scripts/check-change-record.mjs and tests/change-record.test.mjs. Red-first:
(a) an outcome whose ts_executed is before its (non-superseded) proposal's ts_proposed is a form violation ('outcome executed before its proposal was proposed - post-hoc proposal'). RED test.
(b) a sha256-bearing identity entry with NO path key is a P2 violation ('sha256 without a path is unrecomputable'), outside the hasOwnProperty(path) guard; CLI exits non-zero on it. RED tests (matcher + CLI).
(c) a second non-superseding outcome for the same change_id is a form violation ('duplicate outcome - a second original outcome cannot reuse change_id X; use supersedes for a correction'), mirroring the proposal duplicate check. RED test; confirm the unevaluable channel then reads the single valid outcome.
(d) effectiveClass: a cited authorization that fails the authorization form check (granted_by, granted_on, criteria missing/malformed) is unresolved -> return 2, and the proposal's P6 reason reads 'effective class 2'. RED test.
Run: node --test tests/change-record.test.mjs then node --test.` },
  { id: 'J2', label: 'fix5:change-guard', task: `OWNER J2 — you own ONLY hooks/change-guard.mjs and tests/change-guard.test.mjs. Do NOT edit hooks/shell-normalize.mjs (J3 owns it; its contract additions above will make keyword/sudo/case/pwsh forms reach you as normalized commands - write your tests to the contract and say per test if it is red only because J3 has not landed). Red-first:
(a) gh api mutating calls against workflow/release endpoints are deploy commands: parse 'gh api' with a flag-aware argv walk (skip -X/--method/-f/-F/--field/--raw-field/-H/--header/--input/-q/--jq/-t/--template/--hostname/-p/--preview/--cache and their values; method from -X/--method/-XPUT/--method=PUT, implied POST on -f/-F/--field/--raw-field/--input) and refuse when the method is mutating AND the path (leading '/' stripped) matches /actions\\/workflows\\/.+\\/(dispatches|enable|disable)$/, /actions\\/runs\\/\\d+\\/(rerun|cancel|rerun-failed-jobs)$/, or /^repos\\/[^/]+\\/[^/]+\\/releases(\\/|$)/. RED tests: 'gh api -X POST repos/o/r/actions/workflows/cd.yml/dispatches -f ref=main', 'gh api repos/o/r/actions/runs/123/rerun -X POST', 'gh api --method POST /repos/o/r/releases -f tag_name=v1' -> deploy; 'gh api repos/o/r/actions/workflows' (GET) -> not deploy.
(b) atlantis comment bodies: match /atlantis\\s+apply/i (any whitespace); a comment-shaped gh command (gh pr comment, gh issue comment, gh api ...comments with a mutating method) whose body comes from --body-file/-F/--input (not visible) is refused as unevaluable (reason contains 'unevaluable'). Use the same flag-aware walk so 'gh api -X POST repos/o/r/issues/5/comments -f body=\"atlantis apply\"' is caught (flag-first). RED tests for the double-space form, the flag-first api form, and --body-file.
(c) read-only exemptions: 'kubectl apply view-last-applied ...' -> not deploy (set-last-applied / edit-last-applied stay deploy); terraform/tofu 'state rm|mv' with -dry-run -> not deploy; pulumi refresh/destroy/import with --preview-only -> not deploy; any family with --help, -h, or terraform's -help anywhere in argv -> not deploy. RED (green-side) tests for each, with the red twin without the flag.
(d) verb-list additions: gh release delete-asset|upload-asset; helm test; pulumi cancel; terraform workspace new -> deploy. RED tests.
Run: node --test tests/change-guard.test.mjs then node --test.` },
  { id: 'J3', label: 'fix5:shell-normalize+git-guard', task: `OWNER J3 — you own ONLY hooks/shell-normalize.mjs, hooks/git-guard.mjs, tests/git-guard.test.mjs, tests/shell-normalize.test.mjs. Implement the NORMALIZER CONTRACT ADDITIONS (1)-(6) above, each with RED tests in tests/shell-normalize.test.mjs and a git-form RED test in tests/git-guard.test.mjs: 'true & git push origin main', 'if git push origin main; then echo ok; fi', 'while ! git push; do sleep 1; done', '! git commit -m x', '2>/dev/null git commit -m x', 'sudo git push origin main', 'sudo -E -u root git push', 'setsid git commit -m x', 'GIT push origin main', 'Git.exe commit -m x', 'pwsh -c \"git commit -m x\"', 'powershell -Command \"git push\"', 'cmd /c git commit -m x', 'ksh -c \"git commit\"', \"env -S'git commit -m x'\", 'xargs --delimiter=, git commit -m x', 'time -p git commit -m x', 'exec -a x git commit -m x', 'nice -n5 git commit -m x', 'git co\\\\mmit -m x' (backslash) -> all block; keep 'git status', 'echo \"remember to git commit later\"', 'if true; then echo ok; fi' green.
Then git-guard's own PRE-EXISTING holes (found by the round-4 skeptic; these predate this session), red-first: (g1) reset: block when any token after 'reset' is --hard|--soft|--mixed|--merge|--keep regardless of position (so 'git reset -q --hard HEAD~1' blocks), and block bare 'git reset <commit-ish>' with no pathspec separator when the first positional looks like a ref (HEAD~1, HEAD^, a sha, a branch name) - but keep 'git reset HEAD file.txt' and 'git reset file.txt' allowed (existing tests). (g2) tag: block when -f|--force|-d|--delete appears anywhere after 'tag', including inside a combined cluster like -af. (g3) branch: block -f|--force|-D|-M|-m|-d|--delete|--move anywhere after 'branch', including clusters like -df, -dD, -fm; keep 'git branch feature' and 'git branch' (list) allowed. (g4) gh: add --field/--field=/attached --field.. to the out-of-band graphql body check; reconsider --raw-field (no @file magic) - drop it from that check and say so; add merge-upstream, pulls/N/update-branch, repo sync to the mutating surface; add mergeBranch to the graphql mutation ids. RED tests: 'git reset -q --hard HEAD~1', 'git reset HEAD~1', 'git tag -a -f v1 -m x', 'git branch -df feature', 'git branch -M main', 'gh api graphql --field query=@m.graphql', 'gh api -X POST repos/o/r/merge-upstream -f branch=main', 'gh api -X PUT repos/o/r/pulls/1/update-branch', 'gh repo sync o/r --branch main'.
Keep every prior test green. Run: node --test tests/git-guard.test.mjs tests/shell-normalize.test.mjs then node --test.` },
  { id: 'J4', label: 'fix5:skills', task: `OWNER J4 — you own ONLY skills/change-class-earned/SKILL.md and skills/health-signal-fail-closed/SKILL.md. Prose; verify with node scripts/check-surface-scrub.mjs and grep -rn -i settled over ONLY those two directories (must be empty). Fixes: change-class-earned - the sentence about a form-failing cited authorization must read 'effective class 2 at both controls: the hook refuses it as unresolved, and the detective control (after round 5) returns effective class 2 for it and additionally emits a form violation on the authorization record itself'. health-signal-fail-closed line ~21 - replace 'for the pattern' with 'for the configured change_id (RIGOR_CHANGE_ID)'. Change nothing else.` },
]

phase('Build')
const fixed = await parallel(FIXERS.map((b) => () =>
  agent(`${CONTRACT}\n\n${b.task}\n\nReturn the structured receipt with EVERY field filled.${RECEIPT}`, { label: b.label, phase: 'Build', model: T.build, schema: BUILDER_SCHEMA })
    .then((r) => ({ id: b.id, label: b.label, requested: T.build, ...(r ?? { files_written: [], tests: { cmd: '', output_tail: '' }, red_first: 'NULL RESULT', notes: 'NULL RESULT', model_receipt: 'null-result' }) }))
))
log(`fix round 5: ${fixed.filter((b) => b.model_receipt !== 'null-result').length}/4 fixers returned`)

phase('Integrate')
const integration = await agent(`${CONTRACT}

You are the integration closer (rigor integration-runner). Fixers: J1 scripts/check-change-record.mjs + tests/change-record.test.mjs; J2 hooks/change-guard.mjs + tests/change-guard.test.mjs; J3 hooks/shell-normalize.mjs, hooks/git-guard.mjs, tests/git-guard.test.mjs, tests/shell-normalize.test.mjs; J4 two skill files. Edit ONLY those files, only for cross-file drift (J2's tests may depend on J3's normalizer additions - if a change-guard test fails because a contract addition is missing from shell-normalize, fix the normalizer to the contract, never weaken the test). From ${REPO}:
  1. node --test (fail must be 0; report pass count)
  2. node scripts/check-surface-scrub.mjs
  3. node scripts/check-tier-sync.mjs
  4. grep -rn -i settled skills/change-class-earned skills/health-signal-fail-closed (must be empty; ONLY these two)
  5. git status --short (verbatim; flag any modified path outside the fixers' files - do NOT touch them)
  6. Smokes via stdin: 'sudo kubectl apply -k prod' (deny); 'KUBECTL apply -k prod' (deny); 'if kubectl apply -k prod; then echo ok; fi' (deny); 'kubectl apply view-last-applied -f d.yaml' (allow, no reason key); 'gh api -X POST repos/o/r/actions/workflows/cd.yml/dispatches -f ref=main' (deny); through git-guard: 'true & git push origin main' (deny), 'git reset -q --hard HEAD~1' (deny), 'git branch -df feature' (deny), 'git status' (allow).
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
const SK = `You are refuting one load-bearing claim about the rigor repo at ${REPO} after FIX ROUND 5 (bounded, final) of ADR-0013's deployment layer. This round verifies ONLY the listed forms - do not hunt for new forms; the residual tail is being recorded separately. Default to REFUTED unless evidence shows the listed forms behave as claimed; probe with scratch files under os.tmpdir(); mutate scratch copies for non-vacuity of the new tests. Read-only on the repo. Return the structured verdict.${RECEIPT}\n\nCLAIM TO REFUTE: `
const CLAIMS = [
  { key: 'gate-r5', claim: 'scripts/check-change-record.mjs: an outcome executed before its proposal is a form violation; a sha256 entry with no path key is a P2 violation and the CLI exits non-zero on it; a second non-superseding outcome for one change_id is a form violation and the unevaluable channel reads the single valid outcome; a form-failing cited authorization yields effective class 2 with a P6 reason saying so; each new test fails under a targeted mutation; node --test fail 0.' },
  { key: 'hooks-r5', claim: 'After round 5 these are all refused by the respective hook (change-guard unless noted): sudo kubectl apply -k prod; KUBECTL apply -k prod; Kubectl.exe apply -k prod; if kubectl apply -k prod; then echo ok; fi; while ! kubectl apply -k prod; do sleep 1; done; sleep 1 & kubectl apply -k prod; pwsh -c "kubectl apply -k prod"; cmd /c kubectl apply -k prod; kubectl a\\\\pply -k prod; gh api -X POST repos/o/r/actions/workflows/cd.yml/dispatches -f ref=main; gh api repos/o/r/actions/runs/123/rerun -X POST; gh pr comment 5 --body "atlantis  apply"; gh pr comment 5 --body-file c.md (unevaluable); gh api -X POST repos/o/r/issues/5/comments -f body="atlantis apply"; gh release delete-asset v1 a.tgz; helm test api; and by git-guard: true & git push origin main; if git push origin main; then echo ok; fi; sudo git push origin main; GIT push origin main; pwsh -c "git commit -m x"; env -S with an attached single-quoted commit body (env -S<quote>git commit -m x<quote>); time -p git commit -m x; git reset -q --hard HEAD~1; git reset HEAD~1; git tag -a -f v1 -m x; git branch -df feature; git branch -M main; gh api graphql --field query=@m.graphql; gh api -X POST repos/o/r/merge-upstream -f branch=main; gh api -X PUT repos/o/r/pulls/1/update-branch; gh repo sync o/r --branch main. AND these stay green: kubectl apply view-last-applied -f d.yaml; kubectl apply --help; terraform state rm -dry-run module.x; pulumi refresh --preview-only; kubectl auth can-i create pods; git reset HEAD file.txt; git reset file.txt; git branch feature; git tag v1; git status; if true; then echo ok; fi; echo "remember to git commit later"; gh api repos/o/r/actions/workflows. Report every deviation with the exact decide() output.' },
  { key: 'skills-r5', claim: 'skills/change-class-earned/SKILL.md now says a form-failing cited authorization is effective class 2 at both controls (hook: unresolved; detective: effective class 2 plus a form violation on the authorization record) and that matches scripts/check-change-record.mjs effectiveClass after round 5; skills/health-signal-fail-closed/SKILL.md says the hook selects the proposal for the configured change_id; nothing else in the two files changed (diff against the round-4 content if you can reconstruct it, else judge by the two stated edits); settled absent; surface-scrub clean; no path outside the fixers\' files plus the orchestrator-owned docs is modified.' },
]
const verdicts = await parallel(CLAIMS.map((c) => () =>
  agent(`${SK}${c.claim}`, { label: `skeptic:${c.key}`, phase: 'Verify', agentType: 'rigor:skeptic-verifier', schema: VERDICT })
    .then((v) => ({ key: c.key, claim: c.claim, ...(v ?? { verdict: 'UNVERIFIABLE', findings: [], model_receipt: 'null-result' }) }))
))
log(`verify: ${verdicts.filter((v) => v.verdict === 'SURVIVES').length} survive / ${verdicts.filter((v) => v.verdict === 'REFUTED').length} refuted / ${verdicts.filter((v) => v.verdict === 'PARTIAL').length} partial`)

return { fixed, integration, verdicts }
