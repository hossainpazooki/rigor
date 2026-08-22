// ADR-0013 — deployment-layer preventive control ("change-guard"). Refuses a
// deploy-shaped command unless it is authorized: a break-glass record written
// before the bypass runs (property 5), or a change record on a configured git
// ref whose effective class is not 2 and whose form is clean (properties
// 1-3, 6). Otherwise the command is refused and the exact command is handed
// back for a human to run, mirroring hooks/git-guard.mjs's shape exactly
// (finding #33: no reason key on the allow path).
//
// Pure `decide(command, env, io)`, io injected: fs and child_process live
// only in the default io built at the bottom of this file and used by run().
//
// Property 4 (post-implementation-probe, ADR-0013 section 3) is deliberately
// NOT one of the properties this hook gates on. Its own shape is "review +
// evidentiary" — it builds no second detective control (check-effect-probe
// already exists and is imported by check-change-record.mjs, not rebuilt),
// and by the same argument this preventive hook is not meant to be one
// either: a proposal's `probe_plan: {}` (no claim/control) passes the hook
// by design. The one probe_plan refusal this hook DOES produce — a null,
// missing, or non-object probe_plan — is a 'form' violation ("probe_plan
// must be an object"), never a P4 finding; see the gating filter in
// decideChangeRecord for where that distinction is enforced.

import { expandCommands } from './shell-normalize.mjs';
import {
  findChangeRecordViolations,
  effectiveClass,
  identityDigest, // imported per contract; the per-entry digest recompute below
                  // (not identityDigest itself) is what change-guard checks —
                  // the whole-identity digest match for a credited backout is
                  // already enforced inside findChangeRecordViolations (P1).
  parseChangeLog,
} from '../scripts/check-change-record.mjs';
// FIX ROUND 3 finding (b): proposal selection must go through the SAME
// supersession resolver check-runlog's own ledger uses (ADR-0013 "extend, do
// not fork"), so a later duplicate proposal that does not carry `supersedes`
// cannot silently replace the earlier authoritative one.
import { resolveSupersession } from '../scripts/check-runlog.mjs';

const KUBECTL_MUTATING = new Set([
  'apply', 'create', 'replace', 'patch', 'delete', 'edit', 'scale', 'set',
  'label', 'annotate', 'taint', 'cordon', 'uncordon', 'drain', 'expose',
  'run', 'exec', 'cp', 'debug',
]);
// FIX ROUND 5 finding (d): 'test' added (helm test is deploy-shaped: it runs
// hooks against a live release).
const HELM_MUTATING = new Set(['install', 'upgrade', 'rollback', 'uninstall', 'delete', 'test']);
const TERRAFORM_MUTATING = new Set(['apply', 'destroy', 'import', 'taint', 'untaint', 'force-unlock']);
// FIX ROUND 5 finding (d): 'cancel' added (pulumi cancel force-clears an
// in-progress update against a live stack).
const PULUMI_MUTATING = new Set(['up', 'destroy', 'refresh', 'import', 'cancel']);
const ARGOCD_APP_MUTATING = new Set(['sync', 'rollback', 'delete', 'set', 'create', 'patch', 'terminate-op']);
const FLUX_MUTATING = new Set(['reconcile', 'suspend', 'resume', 'delete', 'create', 'bootstrap', 'install', 'uninstall']);

// FIX ROUND 5 finding (b): the Atlantis trigger phrase, matched with any
// run of whitespace between the two words (a bare 'atlantis apply' substring
// check missed 'atlantis  apply' with a double space).
const ATLANTIS_APPLY_RE = /atlantis\s+apply/i;

// Read-only / structural verbs, recognized so the bounded flag-alignment
// fallback below (round 4, finding a) can tell "this is the verb position"
// apart from "this token is an unanticipated flag's stray value" WITHOUT
// ever guessing past a real read-only sub-command's own arguments (the
// round-3 misfire: 'kubectl auth can-i create pods' scanned past 'auth' and
// 'can-i' to misread 'create' as the verb). Each family's set below is the
// exact enumerable read-only surface named in the round-4 contract; a token
// present here or in the matching *_MUTATING set is "known" and the fallback
// stops there — never used to decide deploy-shapedness itself, which still
// runs strictly off the *_MUTATING sets (plus each family's mutating-subverb
// checks in isDeployCommand).
const KUBECTL_READONLY = [
  'get', 'describe', 'diff', 'kustomize', 'logs', 'top', 'explain', 'version',
  'config', 'auth', 'api-resources', 'api-versions', 'cluster-info', 'events',
  'wait', 'port-forward', 'proxy', 'completion', 'options', 'plugin',
  'rollout', // status|history are read-only, undo|restart|pause|resume are
             // mutating — the sub-verb split is decided in isDeployCommand.
];
const HELM_READONLY = [
  'template', 'diff', 'status', 'list', 'get', 'history', 'lint', 'show',
  'dependency', 'repo', 'search', 'pull', 'package', 'env', 'verify',
  'version', 'completion',
];
const TERRAFORM_READONLY = [
  'plan', 'show', 'validate', 'fmt', 'init', 'output', 'state', 'workspace',
  'providers', 'graph', 'console', 'test', 'version', 'login', 'logout',
  'metadata', 'get',
];
const PULUMI_READONLY = [
  'preview', 'stack', 'config', 'whoami', 'about', 'version', 'login',
  'logout', 'plugin',
];
const GH_READONLY = ['workflow', 'run', 'release', 'pr', 'api', 'auth', 'repo', 'issue'];
const ARGOCD_READONLY = ['app', 'account', 'version', 'context', 'cluster', 'proj', 'repo'];
const FLUX_READONLY = [
  'get', 'check', 'logs', 'tree', 'diff', 'version', 'export', 'stats',
  'events', 'completion',
];
const KUBECTL_KNOWN = new Set([...KUBECTL_MUTATING, ...KUBECTL_READONLY]);
const HELM_KNOWN = new Set([...HELM_MUTATING, ...HELM_READONLY]);
const TERRAFORM_KNOWN = new Set([...TERRAFORM_MUTATING, ...TERRAFORM_READONLY]);
const PULUMI_KNOWN = new Set([...PULUMI_MUTATING, ...PULUMI_READONLY]);
const GH_KNOWN = new Set([...GH_READONLY]);
const ARGOCD_KNOWN = new Set([...ARGOCD_READONLY]);
const FLUX_KNOWN = new Set([...FLUX_MUTATING, ...FLUX_READONLY]);
const KNOWN_VERBS = {
  kubectl: KUBECTL_KNOWN, helm: HELM_KNOWN, terraform: TERRAFORM_KNOWN,
  tofu: TERRAFORM_KNOWN, pulumi: PULUMI_KNOWN, gh: GH_KNOWN,
  argocd: ARGOCD_KNOWN, flux: FLUX_KNOWN,
};

// FIX ROUND 2 finding (a), WIDENED in FIX ROUND 3 finding (c): tool global
// flags, stripped before the verb is read, the way git-guard strips git's
// own global options. Only leading tokens (between the program name and the
// first non-flag token) are consumed, so a flag typed after the verb (e.g.
// `kubectl apply --dry-run=server`) is untouched.
const VALUE_FLAG_NAMES = {
  kubectl: new Set([
    '-n', '--namespace', '--context', '--kubeconfig', '-s', '--server',
    '--cluster', '--user', '--request-timeout', '-v', '--v',
    '--as', '--as-group', '--as-uid', '--token', '--username', '--password',
    '--cache-dir', '--certificate-authority', '--client-certificate',
    '--client-key', '--tls-server-name', '--profile', '--profile-output',
    '--log-flush-frequency', '--kuberc',
  ]),
  helm: new Set([
    '-n', '--namespace', '--kube-context', '--kubeconfig', '--kube-apiserver',
    '--kube-token', '--kube-as-user', '--kube-as-group', '--kube-ca-file',
    '--registry-config', '--repository-config', '--repository-cache',
    '--burst-limit', '--qps',
    '--kube-tls-server-name', // round 4, finding a
  ]),
  terraform: new Set(['-chdir']),
  tofu: new Set(['-chdir']),
  pulumi: new Set(['-C', '--cwd', '-s', '--stack']),
  gh: new Set(['-R', '--repo', '--hostname']),
  argocd: new Set([
    '--server', '--auth-token', '--header', '--port-forward-namespace',
  ]),
  flux: new Set([
    '-n', '--namespace', '--context', '--kubeconfig', '--timeout',
    // round 4, finding a: complete flux's value-flag set.
    '--as', '--as-group', '--as-uid', '--cluster', '--server', '--token',
    '--tls-server-name', '--user', '--cache-dir', '--certificate-authority',
    '--client-certificate', '--client-key',
  ]),
};
const BOOL_FLAG_NAMES = {
  kubectl: new Set([
    '--insecure-skip-tls-verify', '--match-server-version',
    '--warnings-as-errors', '--disable-compression',
  ]),
  helm: new Set(['--debug', '--kube-insecure-skip-tls-verify']),
  pulumi: new Set(['--non-interactive']),
  argocd: new Set(['--grpc-web', '--insecure', '--plaintext', '--port-forward']),
  flux: new Set(['--verbose', '--insecure-skip-tls-verify']), // round 4, finding a
};
// Single-dash, single-letter value flags that may carry their value attached
// to the flag itself (finding c): `-nprod`, `-v6`, `-Ro/r`, `-sprod`. Space-
// separated use of the same flags is already covered by VALUE_FLAG_NAMES.
const SHORT_VALUE_FLAG_NAMES = {
  kubectl: new Set(['-n', '-s', '-v']),
  helm: new Set(['-n']),
  pulumi: new Set(['-s', '-C']),
  gh: new Set(['-R']),
  flux: new Set(['-n']),
};

function stripToolGlobalFlags(tokens, prog) {
  const valueFlags = VALUE_FLAG_NAMES[prog] || new Set();
  const boolFlags = BOOL_FLAG_NAMES[prog] || new Set();
  const shortValueFlags = SHORT_VALUE_FLAG_NAMES[prog] || new Set();
  const known = KNOWN_VERBS[prog];
  let i = 1;
  for (;;) {
    while (i < tokens.length && tokens[i].startsWith('-')) {
      const t = tokens[i];
      const eq = /^(--?[A-Za-z][A-Za-z0-9-]*)=/.exec(t);
      if (eq && (valueFlags.has(eq[1]) || boolFlags.has(eq[1]))) { i += 1; continue; }
      if (valueFlags.has(t)) { i += 2; continue; }
      if (boolFlags.has(t)) { i += 1; continue; }
      const shortMatch = /^(-[A-Za-z])(.+)$/.exec(t);
      if (shortMatch && shortValueFlags.has(shortMatch[1]) && t.length > 2) { i += 1; continue; }
      // Unknown flag: skip it alone. Do not consume a following token as its
      // value — the bounded fallback below recovers if that guess is wrong.
      i += 1;
    }
    if (i >= tokens.length) break;
    // Bounded safe fallback (round 4, finding a — MATERIAL fix): T =
    // tokens[i] is the candidate verb. Known (mutating OR read-only, per
    // KNOWN_VERBS above) -> stop here; isDeployCommand's own per-family
    // switch below decides deploy-shapedness strictly from the *_MUTATING
    // sets. T unknown -> skip it, ONCE, ONLY when the token immediately
    // before it is itself a flag (tokens[i-1].startsWith('-')) — i.e. the
    // while-loop just above just gave up on an unrecognized flag, so T is
    // very likely that flag's stray value, not a verb. A bare unknown word
    // with NO such flag immediately before it (e.g. 'auth', 'can-i' in
    // 'kubectl auth can-i create pods') is NEVER skipped this way — the
    // round-3 bug was an unbounded version of this skip that scanned straight
    // past a read-only sub-command's own arguments to reach 'create'. Once a
    // skip's justifying condition fails, this loop stops for good: no further
    // skip is attempted, and isDeployCommand reads T itself as the verb,
    // matching no *_MUTATING set (NOT deploy) unless T happens to sit in one.
    if (known && !known.has(tokens[i]) && tokens[i - 1] && tokens[i - 1].startsWith('-')) {
      i += 1;
      continue; // re-enter: more real flags may precede the next candidate
    }
    break;
  }
  return [tokens[0], ...tokens.slice(i)];
}

// Exact dry-run exemption (ADR-0013 section 4): only these three token forms
// keep a kubectl/helm mutating verb green. `--dry-run=none` is the mutating
// default and is never exempt, even though it matches no other rule here.
function stayGreenOnDryRun(tokens) {
  if (tokens.includes('--dry-run=none')) return false;
  return tokens.some((t) => t === '--dry-run=client' || t === '--dry-run=server' || t === '--dry-run');
}

// FIX ROUND 5 finding (c): --help/-h (any family), or terraform/tofu's own
// -help, anywhere in argv keeps a command green. Checked against the RAW
// (pre-global-flag-strip) tokens, because stripToolGlobalFlags silently
// discards an unrecognized leading flag (its own "skip it alone" fallback)
// before this could ever see it if it were checked only on the stripped
// result.
function hasHelpFlag(rawTokens, prog) {
  if (rawTokens.includes('--help') || rawTokens.includes('-h')) return true;
  if ((prog === 'terraform' || prog === 'tofu') && rawTokens.includes('-help')) return true;
  return false;
}

// FIX ROUND 5 finding (a): flag-aware argv walk for `gh api`. Determines the
// effective HTTP method (explicit -X/--method/-XPOST/--method=POST, else
// implied POST when a data-carrying flag is present, else GET) and the
// request path (first non-flag token, leading '/' stripped), skipping every
// other known value-taking flag and its value so a following positional
// token is never misread as the path. -F/--raw-field/--input additionally
// mark the body as opaque (its value may be a file reference, never visible
// to this hook) for the atlantis-comment check in isDeployCommand below.
const GH_API_SKIP_VALUE_FLAGS = new Set([
  '-H', '--header', '-q', '--jq', '-t', '--template', '--hostname',
  '-p', '--preview', '--cache',
]);

function parseGhApiArgv(tokens) {
  let method = null;
  let sawMutatingField = false;
  let opaqueBody = false;
  let path = null;
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (!t.startsWith('-')) {
      if (path === null) path = t;
      i += 1;
      continue;
    }
    const xAttached = /^-X(.+)$/.exec(t);
    if (xAttached) { method = xAttached[1]; i += 1; continue; }
    let flagName = t;
    let attachedValue = null;
    const eqIdx = t.startsWith('--') ? t.indexOf('=') : -1;
    if (eqIdx !== -1) { flagName = t.slice(0, eqIdx); attachedValue = t.slice(eqIdx + 1); }
    const consume = () => { i += attachedValue !== null ? 1 : 2; };
    if (flagName === '-X' || flagName === '--method') {
      method = attachedValue !== null ? attachedValue : tokens[i + 1];
      consume();
      continue;
    }
    if (flagName === '-f' || flagName === '--field') {
      sawMutatingField = true;
      consume();
      continue;
    }
    if (flagName === '-F' || flagName === '--raw-field' || flagName === '--input') {
      sawMutatingField = true;
      opaqueBody = true;
      consume();
      continue;
    }
    if (GH_API_SKIP_VALUE_FLAGS.has(flagName)) {
      consume();
      continue;
    }
    // Unknown/boolean flag: skip it alone.
    i += 1;
  }
  const explicitMethod = method ? method.toUpperCase() : null;
  const effectiveMethod = explicitMethod || (sawMutatingField ? 'POST' : 'GET');
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(effectiveMethod);
  const strippedPath = path ? path.replace(/^\/+/, '') : '';
  return { method: effectiveMethod, path: strippedPath, isMutating, opaqueBody };
}

// The enumerable gh-api deploy-shaped surface (ADR-0013, FIX ROUND 5 finding
// a): workflow dispatch/enable/disable, run rerun/cancel/rerun-failed-jobs,
// and any releases endpoint.
const GH_API_DEPLOY_PATH_RES = [
  /actions\/workflows\/.+\/(dispatches|enable|disable)$/,
  /actions\/runs\/\d+\/(rerun|cancel|rerun-failed-jobs)$/,
  /^repos\/[^/]+\/[^/]+\/releases(\/|$)/,
];

// A comment-shaped `gh pr comment` / `gh issue comment` invocation whose body
// arrives via --body-file/-F is opaque: the file's content is never visible
// to this hook, so whether it carries the Atlantis trigger cannot be
// evaluated. Fail closed rather than silently allow (finding b).
function ghCommentBodyOpaque(restTokens) {
  return restTokens.includes('-F')
    || restTokens.includes('--body-file')
    || restTokens.some((t) => t.startsWith('--body-file='));
}

/**
 * Is this normalized command string (argv.join(' ')) a deploy-shaped
 * command, per the enumerable CLI surface ADR-0013 section 4 names?
 * Read-only verbs in the same family (get/describe/diff/kustomize/logs/
 * rollout status for kubectl; template/diff/status/list for helm;
 * plan/show/validate/init for terraform; preview for pulumi; view/list for
 * `gh workflow`, list for `gh run`; get/diff for `argocd app`; get for
 * flux) simply never match a mutating-verb set below, so they fall through
 * to `{ deploy: false }`.
 */
export function isDeployCommand(normalized) {
  const rawTokens = String(normalized).trim().split(/\s+/).filter(Boolean);
  if (rawTokens.length === 0) return { deploy: false };
  const prog = rawTokens[0];
  // FIX ROUND 5 finding (c): --help/-h/-help checked on the raw, pre-strip
  // tokens (see hasHelpFlag's comment) — anywhere in argv keeps every family
  // green.
  if (hasHelpFlag(rawTokens, prog)) return { deploy: false };
  let tokens = stripToolGlobalFlags(rawTokens, prog);
  const verb = tokens[1];
  const sub = tokens[2];

  if (prog === 'kubectl') {
    const rolloutMutating = verb === 'rollout' && ['undo', 'restart', 'pause', 'resume'].includes(sub);
    // FIX ROUND 5 finding (c1): `apply view-last-applied` only reads the
    // stored annotation back; `set-last-applied`/`edit-last-applied` still
    // mutate it and stay deploy-shaped.
    if (verb === 'apply' && sub === 'view-last-applied') return { deploy: false };
    if (!(KUBECTL_MUTATING.has(verb) || rolloutMutating)) return { deploy: false };
    if (stayGreenOnDryRun(tokens)) return { deploy: false };
    return { deploy: true, family: 'kubectl' };
  }

  if (prog === 'helm') {
    if (!HELM_MUTATING.has(verb)) return { deploy: false };
    if (stayGreenOnDryRun(tokens)) return { deploy: false };
    return { deploy: true, family: 'helm' };
  }

  if (prog === 'terraform' || prog === 'tofu') {
    const stateMutating = verb === 'state' && ['rm', 'mv', 'push', 'replace-provider'].includes(sub);
    // FIX ROUND 5 finding (d): 'new' added — a fresh workspace is a
    // change to remote state the same way 'delete' is.
    const workspaceMutating = verb === 'workspace' && ['delete', 'new'].includes(sub);
    // FIX ROUND 5 finding (c2): `state rm|mv -dry-run` only prints what
    // would change; `push`/`replace-provider` have no such flag and stay
    // deploy-shaped unconditionally.
    const stateDryRunExempt = stateMutating && ['rm', 'mv'].includes(sub) && tokens.includes('-dry-run');
    if (TERRAFORM_MUTATING.has(verb) || stateMutating || workspaceMutating) {
      if (stateDryRunExempt) return { deploy: false };
      return { deploy: true, family: 'terraform' };
    }
    return { deploy: false };
  }

  if (prog === 'pulumi') {
    const stateMutating = verb === 'state' && ['delete', 'rename', 'unprotect'].includes(sub);
    const stackMutating = verb === 'stack' && sub === 'rm';
    // FIX ROUND 5 finding (c3): refresh/destroy/import with --preview-only
    // only compute and display the plan, never touch the target.
    const previewOnlyExempt = ['refresh', 'destroy', 'import'].includes(verb) && tokens.includes('--preview-only');
    if (PULUMI_MUTATING.has(verb) || stateMutating || stackMutating) {
      if (previewOnlyExempt) return { deploy: false };
      return { deploy: true, family: 'pulumi' };
    }
    return { deploy: false };
  }

  if (prog === 'gh') {
    if (verb === 'workflow' && ['run', 'enable', 'disable'].includes(sub)) return { deploy: true, family: 'gh' };
    // FIX ROUND 5 finding (d): delete-asset/upload-asset added.
    if (verb === 'release' && ['create', 'delete', 'edit', 'upload', 'delete-asset', 'upload-asset'].includes(sub)) {
      return { deploy: true, family: 'gh' };
    }
    if (verb === 'run' && ['rerun', 'cancel'].includes(sub)) return { deploy: true, family: 'gh' };

    // A PR/issue comment is only deploy-shaped when it carries the Atlantis
    // apply trigger phrase — everything else about `gh pr/issue comment` is
    // inert. FIX ROUND 5 finding (b): matched with any run of whitespace
    // (ATLANTIS_APPLY_RE), over the whole normalized string rather than
    // per-token — a quoted body's internal spacing is not reliably
    // reconstructable from this function's own naive whitespace split (see
    // stripToolGlobalFlags's caller), but the substring survives either way.
    // A body arriving via --body-file/-F is opaque (its content is a file
    // this hook cannot read) and is refused as unevaluable rather than
    // silently allowed.
    if ((verb === 'pr' || verb === 'issue') && sub === 'comment') {
      const rest = tokens.slice(3);
      if (ghCommentBodyOpaque(rest)) return { deploy: true, family: 'gh', unevaluable: true };
      if (ATLANTIS_APPLY_RE.test(normalized)) return { deploy: true, family: 'gh' };
      return { deploy: false };
    }

    if (verb === 'api') {
      const parsed = parseGhApiArgv(tokens.slice(2));
      if (parsed.isMutating) {
        if (GH_API_DEPLOY_PATH_RES.some((re) => re.test(parsed.path))) return { deploy: true, family: 'gh' };
        if (parsed.path.includes('comment')) {
          if (parsed.opaqueBody) return { deploy: true, family: 'gh', unevaluable: true };
          if (ATLANTIS_APPLY_RE.test(normalized)) return { deploy: true, family: 'gh' };
        }
      }
      return { deploy: false };
    }

    return { deploy: false };
  }

  if (prog === 'argocd') {
    if (verb === 'app' && ARGOCD_APP_MUTATING.has(sub)) return { deploy: true, family: 'argocd' };
    return { deploy: false };
  }

  if (prog === 'flux') {
    if (FLUX_MUTATING.has(verb)) return { deploy: true, family: 'flux' };
    return { deploy: false };
  }

  return { deploy: false };
}

const isNonEmptyString = (v) => typeof v === 'string' && v.trim() !== '';

// FIX ROUND 3 finding (d): every timestamp the hook itself reads must carry
// an explicit UTC offset (ADR-0013 section 2's schema rule, applied here to
// break-glass `when` specifically) — a naive timestamp's ordering depends on
// the runner's timezone.
const OFFSET_RE = /(?:Z|[+-]\d{2}:\d{2})$/;
const hasOffset = (v) => isNonEmptyString(v) && OFFSET_RE.test(v.trim());

// Path validation for RIGOR_CHANGE_RECORD / RIGOR_BREAK_GLASS: forward-slash,
// relative, no '..' segments, no drive letter. A PowerShell path fails
// closed (ADR-0013 section 4, step 2).
function isValidRecordPath(p) {
  if (!isNonEmptyString(p)) return false;
  if (p.includes('\\')) return false;
  if (/^[A-Za-z]:/.test(p)) return false; // drive letter
  if (p.startsWith('/')) return false; // absolute posix path also refused
  return !p.split('/').some((seg) => seg === '..');
}

const HELP_MESSAGE =
  'rigor change-guard: Claude does not trigger a deployment. Output the exact ' +
  'command for the human to run, then continue. (Authorized path: ' +
  'RIGOR_CHANGE_RECORD=<path> RIGOR_CHANGE_ID=<id> [RIGOR_CHANGE_REF=<ref>] ' +
  'against a record on that ref; emergency: RIGOR_BREAK_GLASS=<path> with ' +
  'who/when/why/command.)';

function decideBreakGlass(path, deployHits, env, io) {
  if (!isValidRecordPath(path)) {
    return { block: true, reason: `rigor change-guard: break-glass record incomplete/mismatched: invalid path ${path}` };
  }
  const ref = env.RIGOR_BREAK_GLASS_REF || 'HEAD';
  const records = io.loadRecords({ path, ref });
  if (!records || records.length === 0) {
    return { block: true, reason: `rigor change-guard: break-glass record incomplete/mismatched: no record at ${ref}:${path}` };
  }
  const record = records[records.length - 1]; // the single record, or the last line
  const who = record?.who;
  const when = record?.when;
  const why = record?.why;
  const recordedCommand = record?.command;
  const whenOk = isNonEmptyString(when) && !Number.isNaN(Date.parse(when)) && hasOffset(when);
  const fieldsOk = isNonEmptyString(who) && whenOk && isNonEmptyString(why) && isNonEmptyString(recordedCommand);
  if (!fieldsOk) {
    return { block: true, reason: `rigor change-guard: break-glass record incomplete/mismatched: ${path}` };
  }
  // FIX ROUND 2 finding (c): exact match only, over EVERY deploy-shaped hit
  // in the invocation (every(), not some()) — no prefix. The record's own
  // command is normalized the same way the running command is, and compared
  // as a single normalized string (ADR-0013 section 4 step 1).
  const recordNormalizedList = expandCommands(recordedCommand.trim());
  const recordNormalized = recordNormalizedList.length === 1 ? recordNormalizedList[0] : null;
  const matches = recordNormalized !== null && deployHits.every((n) => n === recordNormalized);
  if (!matches) {
    return { block: true, reason: `rigor change-guard: break-glass record incomplete/mismatched: command does not match ${path}` };
  }
  return { block: false };
}

const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

// FIX ROUND 2 finding (h): a HALT reason still names any P3 radius violation
// that belongs to this same proposal, instead of a bare headline masking it.
function withP3(reason, violations, proposalLabel) {
  const p3 = violations.filter((v) => v.property === 'P3' && v.entry === proposalLabel);
  if (!p3.length) return reason;
  return `${reason}; ${p3.map((v) => `P3: ${v.reason}`).join('; ')}`;
}

// FIX ROUND 3 finding (b): select the proposal via the SAME supersession
// semantics check-runlog's own ledger uses (imported above), keyed on
// `change_id`, over proposal-kind records only. A later record for the same
// change_id that does NOT carry `supersedes` is a duplicate — the matcher
// already flags it as a form violation — and must never replace the earlier
// (authoritative, non-superseded) proposal. Only a record that validly
// supersedes an earlier one (per resolveSupersession) advances the selection.
function selectProposal(records, changeId) {
  const proposalRecords = records.filter((r) => r?.kind === 'proposal');
  const { superseded } = resolveSupersession(proposalRecords, {
    key: 'change_id',
    label: (r) => `proposal ${r?.change_id ?? '<unnumbered>'}`,
  });
  let selected = null;
  proposalRecords.forEach((r, i) => {
    if (r?.change_id !== changeId) return;
    if (superseded.has(i)) return; // corrected away by a later valid `supersedes`
    if (selected === null) {
      selected = r; // the original (first-seen) record for this change_id
    } else if (isNonEmptyString(r.supersedes) && r.supersedes === changeId) {
      selected = r; // a valid correction advances the selection
    }
    // else: a duplicate without `supersedes` — ignored for selection; the
    // matcher's own duplicate-change_id violation still fires for it.
  });
  return selected;
}

// FIX ROUND 4 finding (b), MATERIAL: `effectiveClass` (imported, owned by
// check-change-record.mjs) only checks that the cited authorization RECORD
// EXISTS with a matching pattern and class — it never checks that the
// authorization record is itself complete. A cited authorization missing
// granted_by/granted_on/criteria was therefore CREDITED: the proposal read as
// class 0/1 even though the citation resolves to nothing a human actually
// granted. This is the hook's own effectiveClass-EQUIVALENT check for that
// specific gap (the matcher's own 'form' violation on the authorization
// entry, entry === `authorization <id>`, covers every OTHER malformed field —
// see the gating filter below, which now includes that entry).
function citedAuthorizationIncomplete(records, proposal) {
  const authId = proposal?.class?.authorization;
  if (!isNonEmptyString(authId)) return false; // effectiveClass already -> 2 for no citation
  const auth = records.find((r) => r?.kind === 'authorization' && r?.id === authId);
  if (!auth) return false; // effectiveClass already -> 2 for a citation that doesn't resolve
  return !isNonEmptyString(auth.granted_by) || !isNonEmptyString(auth.granted_on) || !isObj(auth.criteria);
}

function decideChangeRecord(env, io) {
  const path = env.RIGOR_CHANGE_RECORD;
  const changeId = env.RIGOR_CHANGE_ID;
  if (!isValidRecordPath(path)) {
    return { block: true, reason: `rigor change-guard: RIGOR_CHANGE_RECORD path is invalid: ${path}` };
  }
  const ref = env.RIGOR_CHANGE_REF || 'HEAD';
  const records = io.loadRecords({ path, ref });
  if (!records) {
    return { block: true, reason: `rigor change-guard: no change record at ${ref}:${path}` };
  }

  // FIX ROUND 3 finding (b): selection now goes through resolveSupersession
  // semantics — a correction is a later append-only entry carrying the same
  // change_id AND `supersedes: <change_id>` (ADR-0013 section 2); a plain
  // duplicate with no `supersedes` never replaces the earlier record.
  const proposal = selectProposal(records, changeId);
  if (!proposal) {
    return { block: true, reason: `rigor change-guard: no proposal ${changeId} in change record at ${ref}:${path}` };
  }
  const proposalLabel = `proposal ${changeId}`;

  // FIX ROUND 2 finding (e): a path-bearing identity entry whose digest
  // cannot be recomputed at all (file missing/unreadable) is tracked
  // separately from a computed-but-mismatched digest — silently dropping it
  // from the digests map (as before) let P2's own check skip it entirely,
  // which is fail-open. An unrecomputable identity is unevaluable, never
  // verified, and HALTs below.
  const digests = {};
  const unrecomputable = [];
  for (const entry of proposal.artifact?.identity ?? []) {
    if (entry && isNonEmptyString(entry.path)) {
      const d = io.digest(entry.path);
      if (d === null || d === undefined) unrecomputable.push(entry.path);
      else digests[entry.path] = d;
    }
  }

  const { violations } = findChangeRecordViolations(records, { digests });

  // An unrecomputable identity (file missing/unreadable — never merely
  // mismatched) is unevaluable, never verified, and HALTs before anything
  // else is read: same fail-closed precedence the baseline-unevaluable HALT
  // below gets, and ahead of the gating filter so an unrelated 'form'/P2
  // violation on the SAME artifact.identity entry (e.g. a malformed sha256)
  // can never preempt the HALT with an ordinary "violation(s)" refusal.
  if (unrecomputable.length) {
    return { block: true, reason: `rigor change-guard: HALT - cannot recompute digest for ${unrecomputable[0]} (${changeId})` };
  }

  // FIX ROUND 4 finding (b), MATERIAL: a cited authorization missing
  // granted_by/granted_on/criteria is unresolved — treated the same as
  // effectiveClass's own "no citation" / "citation doesn't match" cases,
  // i.e. effective class 2. See citedAuthorizationIncomplete's comment above.
  let effective = effectiveClass(records, proposal);
  if (effective !== 2 && citedAuthorizationIncomplete(records, proposal)) {
    effective = 2;
  }
  if (effective === 2) {
    return { block: true, reason: `rigor change-guard: class 2: a human executes (${changeId})` };
  }

  // FIX ROUND 2 finding (b): the selected proposal's health_baseline.verdict
  // is read DIRECTLY here — never through a later outcome record for the
  // same change_id, which must not be able to mask it.
  const baselineVerdict = proposal.health_baseline?.verdict;
  if (baselineVerdict === 'unevaluable') {
    const reason = withP3(
      `rigor change-guard: HALT - ${changeId}'s baseline is unevaluable, never coerced to pass or fail`,
      violations, proposalLabel,
    );
    return { block: true, reason };
  }
  if (baselineVerdict !== 'pass') {
    const reason = withP3(
      `rigor change-guard: baseline fail (${changeId}): health_baseline.verdict is ${JSON.stringify(baselineVerdict)}, not pass`,
      violations, proposalLabel,
    );
    return { block: true, reason };
  }

  // FIX ROUND 3 finding (a): 'form' violations gate too, not just P1/P2/P3/P6
  // — a matcher violation with no property home (backout.kind outside its
  // vocabulary, a naive timestamp, a null probe_plan, an empty backout.by,
  // ...) was previously discarded on the floor. Scoped to the selected
  // proposal, to any record sharing its change_id, and (FIX ROUND 4 finding
  // b) to the cited authorization record itself — a form violation there
  // (missing identity_rule/backout_rule/basis, malformed criteria, ...) was
  // previously invisible to this gate even though the proposal was resolving
  // its class against exactly that record. So an unrelated proposal's or
  // authorization's violation elsewhere in the log never leaks into this
  // decision, but THIS proposal's authorization does.
  //
  // Property 4 (post-implementation-probe, ADR-0013 section 3) is
  // deliberately EXCLUDED from this list — its own shape is "review +
  // evidentiary", not preventive (it builds no second detective control and
  // the hook is not meant to be one either). A proposal whose probe_plan is
  // `{}` (no claim/control) therefore passes the hook by design; only the
  // 'form' violation for probe_plan not being an object at all (null,
  // missing, a non-object) gates here, via the 'form' property above — never
  // a P4 finding.
  const outcomeLabel = `outcome ${changeId}`;
  const authId = proposal?.class?.authorization;
  const authLabel = isNonEmptyString(authId) ? `authorization ${authId}` : null;
  const gating = violations.filter((v) =>
    ['form', 'P1', 'P2', 'P3', 'P6'].includes(v.property) &&
    (v.entry === proposalLabel || v.entry === outcomeLabel || (authLabel && v.entry === authLabel)));
  if (gating.length) {
    const listed = gating.map((v) => `${v.property}: ${v.reason}`).join('; ');
    return { block: true, reason: `rigor change-guard: change record violation(s) for ${changeId}: ${listed}` };
  }

  // FIX ROUND 4 finding (d): simplified to the hook's OWN check — is there an
  // approval on record at all? A malformed-but-present approval (missing
  // ref, unparseable when, ...) is the matcher's own approvalGaps 'form'
  // violation (entry === proposalLabel, gated above) when class.proposed is
  // 1 directly; when effective class 1 comes from a class-0 proposal DEMOTED
  // by an unrepaired misfire, that exact demotion condition is ALSO the
  // matcher's own P6 violation on this proposal (same
  // latestOutcomeIsMisfireUnrepaired check, already gated above) — so every
  // effective-1 path that reaches here either had proposed class 1 (matcher
  // covers malformed approval) or is already refused before this point
  // (matcher covers the demotion itself). The one case the matcher does NOT
  // flag — approval null/absent on a proposed-1 record with no outcome yet —
  // is "pending", not a violation, by the matcher's own design (see its
  // approvalGaps comment); the hook still must not dispatch on it, so that
  // is the one thing checked here, independently of the matcher.
  if (effective === 1 && (proposal.approval === null || proposal.approval === undefined)) {
    return { block: true, reason: `rigor change-guard: class 1 needs approval on record (who, when, ref) (${changeId})` };
  }

  // Explicit re-check named in ADR-0013 section 4 step 2 (already implied by
  // P2 above, kept as a named, independent belt for the specific case of a
  // digest that moved between review and this dispatch).
  for (const entry of proposal.artifact?.identity ?? []) {
    if (entry && isNonEmptyString(entry.path) && digests[entry.path] !== undefined) {
      if (digests[entry.path] !== entry.sha256) {
        return { block: true, reason: `rigor change-guard: digest mismatch for ${entry.path} (${changeId})` };
      }
    }
  }

  return { block: false };
}

export function decide(command, env = process.env, io = defaultIo) {
  const normalizedCommands = expandCommands(command);
  const classifications = normalizedCommands.map((n) => isDeployCommand(n));
  const deployHits = normalizedCommands.filter((_, i) => classifications[i].deploy);
  if (deployHits.length === 0) return { block: false };

  // FIX ROUND 5 finding (b): a comment-shaped command whose body is opaque
  // (--body-file/-F/--input) cannot be checked for the Atlantis trigger
  // phrase at all — unevaluable, refused fail-closed, unconditionally (no
  // break-glass/change-record path evaluates a body it was never shown).
  if (classifications.some((c) => c.deploy && c.unevaluable)) {
    return {
      block: true,
      reason: 'rigor change-guard: comment body is unevaluable (opaque via --body-file/-F/--input) - refusing fail-closed',
    };
  }

  if (env.RIGOR_BREAK_GLASS) {
    return decideBreakGlass(env.RIGOR_BREAK_GLASS, deployHits, env, io);
  }

  if (env.RIGOR_CHANGE_RECORD && env.RIGOR_CHANGE_ID) {
    return decideChangeRecord(env, io);
  }

  return { block: true, reason: HELP_MESSAGE };
}

// --- default io (fs / child_process live only here) ---

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve as resolvePath } from 'node:path';

function gitToplevel() {
  const r = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  if (r.status !== 0 || !r.stdout) return null;
  return r.stdout.trim();
}

function gitLoadRecords({ path, ref }) {
  const r = spawnSync('git', ['--no-replace-objects', 'show', `${ref}:${path}`], { encoding: 'utf8' });
  if (r.status !== 0) return null;
  try {
    return parseChangeLog(r.stdout);
  } catch {
    return null;
  }
}

function fsDigest(path) {
  try {
    const top = gitToplevel();
    const full = top ? resolvePath(top, path) : resolvePath(path);
    return createHash('sha256').update(readFileSync(full)).digest('hex');
  } catch {
    return null;
  }
}

const defaultIo = {
  loadRecords: gitLoadRecords,
  digest: fsDigest,
  toplevel: gitToplevel,
};

// finding #19-shaped: stdin listener registered only under the main-module
// guard, same as git-guard.mjs.
export function run() {
  let buf = '';
  process.stdin.on('data', (d) => (buf += d));
  process.stdin.on('end', () => {
    let cmd = '';
    try { cmd = JSON.parse(buf)?.tool_input?.command ?? ''; } catch {}
    const { block, reason } = decide(cmd, process.env, defaultIo);
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: block ? 'deny' : 'allow',
        ...(block && { permissionDecisionReason: reason }),
      },
    }));
  });
}

// Main-module guard (Windows-safe via node:url fileURLToPath), same shape as
// hooks/git-guard.mjs.
import { fileURLToPath } from 'node:url';
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) run();
