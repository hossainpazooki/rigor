export const meta = {
  name: 'closure-ledger-verify3',
  description: 'rigor: judgment-tier refutation of the final git-guard change (two-view parse, global flags, merge rule) and its ledger records',
  phases: [
    { title: 'Integrate', detail: 'integration-runner re-runs the named gates, report-only' },
    { title: 'Verify', detail: 'fresh skeptics refute the final state with their own corpora' },
  ],
}

// Held for judgment-tier credits (operator ruling 2026-09-14). Run with
// args.tiers from config/models.json; verify_tier defaults to 'judgment'.
const A = (typeof args === 'string' ? JSON.parse(args) : args) || {};
const TIERS = A.tiers || {};
if (!TIERS.mid || !TIERS.judgment) return { halted: true, reason: 'tiers missing from args; refusing to run unpinned' };
const SCRATCH = A.scratch;
if (!SCRATCH) return { halted: true, reason: 'args.scratch required' };
const VT = A.verify_tier || 'judgment';
const VAGENT = VT === 'judgment' ? 'rigor:skeptic-verifier' : 'rigor:skeptic-verifier-fast';

const RECEIPT = ' Report in the "model" field the bare model ID verbatim from your own system prompt (the string after "The exact model ID is").' +
  ' Keep every string field under 1500 characters.';

const CONTRACT = [
  'SHARED CONTRACT - rigor git-guard change, round-3 verification',
  'Repo: C:/Users/hossa/dev/rigor (Git Bash: /c/Users/hossa/dev/rigor). Compare the working tree (or the commit that landed it) against the shipped hook at 8f91906. Node stdlib only.',
  '',
  'WHAT CHANGED in hooks/git-guard.mjs',
  '- merge rule /^git\\s+merge\\b(?!\\s+(--abort|--squash)\\b)/ became /^git\\s+merge(?![\\w-])(?!\\s+(--abort|--squash)\\b)/ - merge-* plumbing is no longer read as `git merge` (operator ruling: merge-file / merge-index / merge-one-file / merge-<strategy> stay allowed; they write no ref).',
  '- normalizeGitSegment takes an argv ARRAY. VALUE_FLAGS gained --config-env and --attr-source (plus --config-env= / --attr-source= / --list-cmds= prefix forms); any OTHER dash token before the subcommand is skipped as a boolean global.',
  '- decide() blocks when EITHER view names a write: the argv array from expandArgv, or the old whitespace re-split normalizeGitSegment(argv.join(" ").split(/\\s+/)) (operator ruling "union of both views").',
  '',
  'NAMED AND ACCEPTED (do not report these as new): alias bypass by name (`git -c alias.ci=commit ci`, config aliases, now incl. merge-* alias names) - an OPEN closure record; over-blocks that are friction: helper rules now reachable behind a quoted global value (`git -C "My Repo" replace`, scp-style `fetch host:path`, `tag -l "v1 -f"`, `branch --list "x -D"`), an empty-string or single-token-option subcommand (`git "" commit`, `git "-C a" merge-base`), the re-split view reading a quoted value word as a verb (`git -C "x commit" status`), `git -C $(echo . status) commit`, and print-and-exit globals before a verb (`git --html-path commit`).',
  '',
  'HISTORY YOU MUST NOT REPEAT: rounds 1-2 refuted (?=\\s|$) (glued `merge>out`), (?![\\w-]) with the string re-split (quoted merge-x value), and the argv-only walk ($(...) word-splitting, \\" quote drift, unlisted -P). Their corpora (merge-* family, glued operators, wrappers, quoted values, $(...), escaped quotes, VALUE_FLAGS permutations) already pass. Find what they did not.',
  '',
  'OWNERSHIP: READ-ONLY on the repo. Scratch only under <SCRATCH>/<your label>/. Never run a git write. To learn how bash splits a string, shadow git with a shell function (e.g. `git(){ printf "<%s>" "$@"; echo; }`) and skip strings that reach git by absolute path or through env/sudo/nohup/xargs/sh -c/bash -c/eval/pwsh/cmd. Write probe files with the Write tool. Keep stdout ASCII.',
  '',
  'GATES (real, named): node --test (598 pass at the 2026-09-15 build) ; node scripts/check-misfire-closure.mjs docs/learn/closure-log.jsonl (expected exit 2: exactly five CLOSURE OPEN lines - skeptic-provenance-from-commit-date-2026-08-22, fabricated-worker-receipt-2026-08-22, git-guard-alias-bypass-by-name-2026-09-15, status-skeptic-verifier-fast-never-dispatched-2026-08-18, harvest-queue-ignores-transcript-retention-2026-09-01 - and zero FAIL) ; node scripts/check-learnings.mjs docs/learnings (exit 0) ; node scripts/check-surface-scrub.mjs (exit 0) ; node scripts/check-harvest.mjs docs/harvest/951cdf1d.jsonl (exit 0) ; node scripts/check-dispatch.mjs docs/plans/2026-09-14-closure-ledger-pair.verdicts.jsonl config/models.json (exit 1 is EXPECTED before this round: four high-stakes votes ran on the mid tier)',
].join('\n').split('<SCRATCH>').join(SCRATCH);

const INTEG_SCHEMA = {
  type: 'object',
  required: ['green', 'commands', 'model'],
  properties: {
    green: { type: 'boolean' },
    model: { type: 'string' },
    commands: { type: 'array', items: { type: 'object', required: ['cmd', 'exitCode', 'tail'], properties: { cmd: { type: 'string' }, exitCode: { type: 'integer' }, tail: { type: 'string' } } } },
  },
};
const VERDICT_SCHEMA = {
  type: 'object',
  required: ['claim', 'verdict', 'evidence', 'model'],
  properties: {
    claim: { type: 'string' },
    verdict: { type: 'string', enum: ['true', 'refuted', 'unverifiable'] },
    evidence: { type: 'string' },
    model: { type: 'string' },
  },
};

phase('Integrate');
const integ = await agent(
  'SHARED CONTRACT:\n' + CONTRACT + '\n\n' +
  'Run every command under GATES exactly and report each verbatim tail and exit code, plus `git status --short` and `git diff --stat`. REPORT-ONLY: do not edit any file. green = every gate met its stated expectation.' + RECEIPT,
  { label: 'integrate', phase: 'Integrate', agentType: 'rigor:integration-runner', schema: INTEG_SCHEMA, model: TIERS.mid }
);
const receipts = [];
if (integ && integ.model) receipts.push({ role: 'worker', node: 'fanout-build.integrate', label: 'integrate-r3', verifier_model: { requested: TIERS.mid, answered: integ.model } });
if (!integ || !integ.green) {
  log('halt: gates not green - no verification on a red tree');
  return { halted: true, integ, receipts };
}

phase('Verify');
const CLAIMS = [
  {
    key: 'no-weakening-v3', votes: 2, stakes: 'high', hit: ['blast-radius', 'downstream-decisions'],
    text: 'Against the shipped hook at 8f91906 (git show both hooks into your scratch dir), every string the final hook ALLOWS but 8f91906 BLOCKED reaches git (per the bash shell-function oracle) as one of: merge-* plumbing (merge-base, merge-tree, merge-file, merge-index, merge-one-file, merge-recursive, merge-resolve, merge-octopus, merge-ours, merge-subtree), `merge --abort` / `merge --squash`, a non-command (git would error), or an alias name covered by the open alias record. Any other blocked->allowed string whose real subcommand writes history refutes the claim. Build YOUR OWN corpus; the earlier corpora already pass.',
  },
  {
    key: 'no-new-read-misfire-v3', votes: 1, stakes: 'medium', hit: ['downstream-decisions'],
    text: 'The final hook introduces no read-refusal outside the NAMED AND ACCEPTED over-block classes: find a command an agent would plausibly run during ordinary work (status, log, diff, show, rev-parse, merge-base, ls-files, config --get, remote -v, worktree list, stash list, branch --show-current, fetch with no refspec, and the same behind realistic -C paths such as Windows paths with spaces, -c options, and redirects) that 8f91906 allowed and the final hook blocks, outside those classes. One such realistic read refutes the claim.',
  },
  {
    key: 'records-honest-v3', votes: 1, stakes: 'medium', hit: ['downstream-decisions'],
    text: 'Every statement changed in docs/STATUS.md, docs/learnings/ (the 2026-09-14 and 2026-09-15 entries and their LEARNINGS.md rows), docs/learn/closure-log.jsonl (the records dated 2026-09-01 onward), docs/harvest/HARVEST.md (queue re-rank, mtimes, purge-by dates = mtime + 30 days, purged list) and docs/plans/2026-09-14-closure-ledger-pair.verdicts.jsonl is true of the tree and of the raw sources it cites (tests, decide() runs, git log, transcript files under ~/.claude/projects, file mtimes), every pin names a test that exists exactly once, every learnings ts is distinct and matches its filename date, and nothing claims a verification at a tier it did not run at. One false or overstated statement refutes the claim.',
  },
];

const verdictRuns = await pipeline(CLAIMS, (c) => parallel(Array.from({ length: c.votes }, (_, i) => () => agent(
  'Gate-green is not claim-true. You are an adversarial skeptic: REFUTE this claim by recomputing from raw output. Default to "refuted" unless your own commands prove it. ' +
  (VT === 'judgment' ? '' : 'The judgment tier is unavailable; you run as the mid-tier fallback and are logged downgraded: true, so be at least as adversarial as a judgment-tier skeptic. ') +
  'Scratch under ' + SCRATCH + '/skeptic-' + c.key + '-' + i + '/ only.\n\n' +
  'Context contract:\n' + CONTRACT + '\n\nCLAIM (' + c.key + '): ' + c.text + RECEIPT,
  { label: 'verify:' + c.key + ':' + i, phase: 'Verify', agentType: VAGENT, schema: VERDICT_SCHEMA, model: TIERS[VT], effort: 'high' }
))).then((votes) => ({ claim: c, votes })));

const verdictRecords = [];
const claimResults = [];
for (const r of verdictRuns.filter(Boolean)) {
  const votes = (r.votes || []).filter(Boolean);
  for (const v of votes) {
    verdictRecords.push({
      node: 'fanout-build.verify', claim: r.claim.key, dispatch_tier: VT,
      verifier_model: { requested: TIERS[VT], answered: v.model },
      inferred_stakes: r.claim.stakes, rubric_criteria_hit: r.claim.hit, downgraded: VT !== 'judgment',
      verdict: v.verdict,
    });
  }
  claimResults.push({ key: r.claim.key, votes_returned: votes.length, votes_requested: r.claim.votes, not_true: votes.filter((v) => v.verdict !== 'true').length, verdicts: votes });
}
const missing = claimResults.reduce((n, c) => n + (c.votes_requested - c.votes_returned), 0) + (CLAIMS.length - claimResults.length);
if (missing) log('WARNING: ' + missing + ' skeptic vote(s) returned null - those claims are NOT verified');
return { integ, receipts, verdictRecords, claimResults, claimTrue: integ.green && missing === 0 && claimResults.every((c) => c.not_true === 0) };
