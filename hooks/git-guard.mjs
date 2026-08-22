// Blocks agent-initiated git-history writes. Claude outputs the command for the
// human instead. Override per web-driven repo with RIGOR_GIT_ALLOW=1.
//
// Known blind spot (fix round 4, finding e): a `gh api graphql` mutation body
// supplied out-of-band -- `--input body.json` or a `-F query=@file` field --
// is blocked outright rather than classified, because the mutation text is
// not visible to this normalizer to test against GRAPHQL_MUTATION_IDS_RE. A
// body supplied via `$(cat file)` command substitution would only be visible
// if the subshell expansion surfaced its text, which it does not: named
// here, not closed.

import { expandArgv } from './shell-normalize.mjs';

// BLOCKED patterns are tested against the NORMALIZED subcommand segment
// (after stripping env-prefix tokens, global flags, and shell wrappers).
// The bare /--force\b/ catch-all has been removed (finding #17): it
// false-positives on `git fetch --force` and `git log --grep=--force`.
// push --force is already caught by the push rule; branch --force is
// caught by the expanded branch rule below.
const BLOCKED = [
  /^git\s+commit\b/,
  /^git\s+push\b/,
  /--no-verify\b/,
  // finding #1: rebase (allow --abort / --skip recovery)
  /^git\s+rebase(?!\s+(--abort|--skip)\b)/,
  // finding #2: cherry-pick (allow --abort recovery)
  /^git\s+cherry-pick(?!\s+--abort\b)/,
  // finding #6: mass history rewrite
  /^git\s+filter-branch\b/,
  // finding #7: apply patch series (allow --abort recovery)
  /^git\s+am(?!\s+--abort\b)/,
  // finding #10: revert (allow --no-commit / -n staging-only forms)
  /^git\s+revert(?!\s+(--no-commit|-n)\b)/,
  // finding #11: bulk history import
  /^git\s+fast-import\b/,
  // finding #12: direct ref rewrite
  /^git\s+update-ref\b/,
  // finding #14: merge (allow --abort and --squash safe ops)
  /^git\s+merge\b(?!\s+(--abort|--squash)\b)/,
  // finding #16: reflog erasure (allow read-only `git reflog show`)
  /^git\s+reflog\s+(delete|expire)\b/,
  // ADR-0013: force branch reset to a ref (checkout -B always resets the
  // branch to <start-point> even if it exists; -b only creates and is safe).
  /^git\s+checkout\b.*\s-B(\s|$)/,
  // ADR-0013: switch's equivalent of checkout -B
  /^git\s+switch\b.*(\s-C(\s|$)|\s--force-create\b)/,
  // ADR-0013: writes a dangling commit into refs/stash
  /^git\s+stash\s+store\b/,
  // ADR-0013: pull is fetch+merge (or fetch+rebase); any form rewrites HEAD
  /^git\s+pull\b/,
];

// Global option tokens that appear between `git` and the subcommand.
// VALUE_FLAGS take the next token as their argument.
const VALUE_FLAGS = new Set(['-C', '--git-dir', '--work-tree', '--namespace', '--exec-path', '-c']);
// BOOL_FLAGS_RE matches single-token boolean global options (no argument).
const BOOL_FLAGS_RE = /^(-p|--paginate|--no-pager|--bare|--no-replace-objects|--literal-pathspecs|--glob-pathspecs|--noglob-pathspecs|--icase-pathspecs|--no-optional-locks)$/;
// VALUE_FLAG_PREFIX_RE matches `--key=value` forms.
const VALUE_FLAG_PREFIX_RE = /^(--git-dir=|--work-tree=|--namespace=|--exec-path=)/;

/**
 * Strip git's own global option tokens from an already shell-normalized
 * `git ...` command string (wrappers, absolute paths, .exe, and shell -c /
 * eval bodies are handled upstream by expandCommands()). Returns null if the
 * string is not a `git` invocation at all.
 */
function normalizeGitSegment(s) {
  if (!(s === 'git' || s.startsWith('git '))) return null;
  const tokens = s.split(/\s+/);
  let i = 1; // skip 'git'
  while (i < tokens.length) {
    const t = tokens[i];
    if (VALUE_FLAGS.has(t)) { i += 2; continue; }
    if (VALUE_FLAG_PREFIX_RE.test(t)) { i++; continue; }
    if (BOOL_FLAGS_RE.test(t)) { i++; continue; }
    break;
  }
  return ['git', ...tokens.slice(i)].join(' ');
}

// ADR-0013: git symbolic-ref <ref> <target> writes; --short/-d/--delete or a
// single positional argument is a read.
function isSymbolicRefWrite(n) {
  const m = /^git\s+symbolic-ref\b(.*)$/.exec(n);
  if (!m) return false;
  const rest = m[1].trim();
  if (!rest) return false;
  const tokens = rest.split(/\s+/).filter(Boolean);
  const positional = tokens.filter((t) => !/^--?/.test(t));
  return positional.length >= 2;
}

// ADR-0013: git replace writes a replacement object unless it's a list/delete.
function isReplaceWrite(n) {
  if (!/^git\s+replace\b/.test(n)) return false;
  if (/(?:^|\s)(-l|--list|-d|--delete)(?:\s|$)/.test(n)) return false;
  return true;
}

// ADR-0013: git hash-object -w -t commit (either flag order) writes a commit
// object into the object database.
function isHashObjectWrite(n) {
  if (!/^git\s+hash-object\b/.test(n)) return false;
  const hasW = /(?:^|\s)-w(?:\s|$)/.test(n);
  const hasTCommit = /(?:^|\s)-t\s+commit(?:\s|$)/.test(n);
  return hasW && hasTCommit;
}

// ADR-0013: git fetch with any <src>:<dst> refspec token updates local refs;
// plain `git fetch` / `git fetch origin` / `git fetch origin main` (no
// colon) only read from the remote into FETCH_HEAD.
function isFetchWithRefspec(n) {
  if (!/^git\s+fetch\b/.test(n)) return false;
  const rest = n.replace(/^git\s+fetch\b/, '').trim();
  if (!rest) return false;
  const tokens = rest.split(/\s+/).filter(Boolean);
  return tokens.some((t) => {
    if (t.startsWith('-')) return false;
    if (t.includes('://')) return false; // a remote URL, not a refspec
    return t.includes(':');
  });
}

// fix round 5, finding (g1): the round-4 skeptic found the reset rule only
// looked at the token immediately after `reset` -- `git reset -q --hard
// HEAD~1` slipped through because --hard sat one position later. Block when
// any token after `reset` is one of the history-moving modes, regardless of
// position, and separately block a bare `git reset <ref>` (no pathspec
// following) when the sole positional looks like a commit-ish rather than a
// path -- `git reset HEAD <file>` / `git reset <file>` (two positionals, or
// a file-shaped single positional) stay allowed.
function looksLikeRef(tok) {
  if (tok === 'HEAD' || /^HEAD[~^]/.test(tok)) return true;
  if (/^[0-9a-f]{7,40}$/i.test(tok)) return true;
  if (/[~^]/.test(tok)) return true;
  // heuristic: a bare identifier with no path separator and no dot reads as
  // a branch/ref name rather than a pathspec (a dot or slash is left alone
  // as filename-shaped); known false-negative: a dotless, slash-free
  // tracked file passed bare to `git reset` still reads as a ref here.
  if (/^[A-Za-z][A-Za-z0-9_-]*$/.test(tok)) return true;
  return false;
}

function isResetBlocked(n) {
  const m = /^git\s+reset\b(.*)$/.exec(n);
  if (!m) return false;
  const rest = m[1].trim();
  if (!rest) return false;
  const tokens = rest.split(/\s+/).filter(Boolean);
  if (tokens.some((t) => /^(--hard|--soft|--mixed|--merge|--keep)$/.test(t))) return true;
  if (tokens.length === 1 && !tokens[0].startsWith('-') && looksLikeRef(tokens[0])) return true;
  return false;
}

// fix round 5, finding (g2): tag -f/-d/--force/--delete anywhere after
// `tag`, including inside a combined short cluster like -af.
function isTagBlocked(n) {
  const m = /^git\s+tag\b(.*)$/.exec(n);
  if (!m) return false;
  const rest = m[1].trim();
  if (!rest) return false; // bare `git tag` (list) stays allowed
  const tokens = rest.split(/\s+/).filter(Boolean);
  return tokens.some((t) => {
    if (/^(-f|--force|-d|--delete)$/.test(t)) return true;
    if (/^-[a-zA-Z]{2,}$/.test(t) && /[fd]/.test(t.slice(1))) return true;
    return false;
  });
}

// fix round 5, finding (g3): branch -f/-D/-M/-m/-d/--force/--delete/--move
// anywhere after `branch`, including combined clusters like -df, -dD, -fm.
function isBranchBlocked(n) {
  const m = /^git\s+branch\b(.*)$/.exec(n);
  if (!m) return false;
  const rest = m[1].trim();
  if (!rest) return false; // bare `git branch` (list) stays allowed
  const tokens = rest.split(/\s+/).filter(Boolean);
  return tokens.some((t) => {
    if (/^(-f|--force|-D|-M|-m|-d|--delete|--move)$/.test(t)) return true;
    if (/^-[a-zA-Z]{2,}$/.test(t) && /[fFdDmM]/.test(t.slice(1))) return true;
    return false;
  });
}

function isBlockedGit(n) {
  if (BLOCKED.some((re) => re.test(n))) return true;
  if (isSymbolicRefWrite(n)) return true;
  if (isReplaceWrite(n)) return true;
  if (isHashObjectWrite(n)) return true;
  if (isFetchWithRefspec(n)) return true;
  if (isResetBlocked(n)) return true;
  if (isTagBlocked(n)) return true;
  if (isBranchBlocked(n)) return true;
  return false;
}

// ADR-0013: GitOps targets write git history through the host API, not the
// local `git` binary — `gh pr merge`, and `gh api` calls whose method is
// mutating against a merge/contents/refs/commits endpoint, plus any PR/issue
// comment whose body triggers a run-trigger's `atlantis apply` convention.
// fix round 5, finding (g4): added pulls/N/update-branch (equalizing a PR's
// branch with its base, a history-write) and merge-upstream (fast-forwards
// a fork from its parent) to the mutating REST surface.
const GH_MUTATING_PATH_RE = /pulls\/[^/\s]+\/(merge|update-branch)|(?:^|\/)merges(?:\/|$)|(?:^|\/)merge-upstream(?:\/|$)|\/contents\/|\/git\/refs\b|\/git\/commits\b/;
const ATLANTIS_APPLY_RE = /atlantis apply/i;

// fix round 3, finding (b): `gh api graphql` can write git history through a
// mutation the endpoint/method-based checks above never see (the endpoint is
// always POST /graphql regardless of what the mutation does). Block a
// graphql call whose argument text carries the `mutation` keyword together
// with any GraphQL mutation field name that writes to a ref or PR merge
// state; a query-only call (no `mutation` keyword) stays green.
// fix round 5, finding (g4): added mergeBranch (the GraphQL mutation behind
// `gh api graphql`-driven fast-forward merges).
const GRAPHQL_MUTATION_IDS_RE = /\b(mergePullRequest|createCommitOnBranch|updateRef|createRef|deleteRef|enablePullRequestAutoMerge|mergeBranch)\b/;

// finding (a): `gh api` accepts its flags in ANY position relative to the
// endpoint path, including forms the naive "first token after 'api'" parse
// misreads as the path itself (`-X PUT repos/...`) or misses the method on
// (`repos/... --method=PUT`). Long flags that take a value: --method,
// --field, --raw-field, --header, --input, --jq, --template, --hostname,
// --preview, --cache (each also accepts the `--flag=value` attached form).
// Short flags that take a value: -X (also accepts attached `-XPUT`), -f,
// -F, -H, -q, -t, -p. -f/-F/--field/--raw-field/--input imply a mutating
// (POST) request when no explicit method is given. Everything else
// (booleans, unrecognized flags) is skipped as a single token. The first
// remaining token is the endpoint path.
const GH_LONG_VALUE_FLAGS = new Set([
  '--method', '--field', '--raw-field', '--header', '--input',
  '--jq', '--template', '--hostname', '--preview', '--cache',
]);
const GH_SHORT_VALUE_FLAGS = new Set(['-f', '-F', '-H', '-q', '-t', '-p']);
const GH_IMPLIES_MUTATE = new Set(['-f', '-F', '--field', '--raw-field', '--input']);

function parseGhApiArgs(tokens) {
  let method = null;
  let impliedMutate = false;
  let path = null;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    // -X / attached -XPUT / attached -X=PUT (fix round 3, finding a)
    if (tok === '-X' || (tok.length > 2 && tok.startsWith('-X') && !tok.startsWith('--'))) {
      let val = tok.length > 2 ? tok.slice(2) : (tokens[++i] || '');
      if (val.startsWith('=')) val = val.slice(1);
      method = val.toUpperCase();
      continue;
    }

    // --method / --method=PUT
    if (tok === '--method' || tok.startsWith('--method=')) {
      method = (tok.startsWith('--method=') ? tok.slice('--method='.length) : tokens[++i] || '').toUpperCase();
      continue;
    }

    if (tok.startsWith('--')) {
      const eq = tok.indexOf('=');
      const name = eq !== -1 ? tok.slice(0, eq) : tok;
      if (GH_LONG_VALUE_FLAGS.has(name)) {
        if (GH_IMPLIES_MUTATE.has(name)) impliedMutate = true;
        if (eq === -1) i++; // consume the separate value token
      }
      continue; // unrecognized long flag: boolean, skip as-is
    }

    if (tok.startsWith('-') && tok.length >= 2) {
      const flag = tok.slice(0, 2);
      if (GH_SHORT_VALUE_FLAGS.has(flag)) {
        if (GH_IMPLIES_MUTATE.has(flag)) impliedMutate = true;
        if (tok.length === 2) i++; // separate value token; attached form needs no skip
      }
      continue; // unrecognized short flag: boolean, skip as-is
    }

    if (path === null) path = tok; // first positional = the endpoint path
  }

  return { method, impliedMutate, path };
}

// fix round 4, finding (d): gh accepts -R/--repo <val> (or attached -R<val>,
// --repo=<val>) and --hostname <val>/--hostname=<val> as global flags
// anywhere before the subcommand verb, not only at a fixed argv position
// (`gh pr --repo o/r merge 1` is as valid as `gh -R o/r pr merge 1`). Strip
// them wherever they occur so a global flag interposed between the
// subcommand and its verb cannot hide the verb from the position-based
// checks below.
function stripGhGlobalFlags(tokens) {
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok === '-R' || tok === '--repo' || tok === '--hostname') { i++; continue; }
    if (/^-R.+/.test(tok)) continue;
    if (/^--repo=/.test(tok)) continue;
    if (/^--hostname=/.test(tok)) continue;
    out.push(tok);
  }
  return out;
}

// fix round 4, finding (e): a GraphQL mutation whose body is supplied
// out-of-band -- `--input <file>` or a `-F`/`--field name=@file` field -- is
// not text this normalizer can read, so it is treated as mutating by default
// instead of being let through unclassified. See the file header.
//
// fix round 5, finding (g4): `-f`/`--raw-field` dropped from this check --
// unlike `-F`/`--field`, gh's raw-field flag has no `@file` dereferencing
// magic (the string `query=@file.graphql` is sent to the API literally, not
// expanded), so a `--raw-field` value can never smuggle an unreadable body
// past this check the way `-F`/`--field` can. `--field`/`--field=`/attached
// `-F...` added alongside the existing short `-F` form.
function hasOutOfBandGraphqlBody(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok === '--input' || tok.startsWith('--input=')) return true;
    if (tok === '-F' || tok === '--field') {
      if (/=@/.test(tokens[i + 1] || '')) return true;
      continue;
    }
    if (tok.startsWith('--field=')) {
      if (/=@/.test(tok.slice('--field='.length))) return true;
      continue;
    }
    if (tok.startsWith('-F') && tok.length > 2 && /=@/.test(tok.slice(2))) return true;
  }
  return false;
}

// fix round 3, finding (a): takes the argv ARRAY for one already-normalized
// command (from expandArgv) rather than a joined string — re-splitting a
// joined string on whitespace would break a quoted flag value that itself
// contains whitespace (e.g. -H "Accept: application/vnd.github+json") into
// two tokens and shift every later flag/path position. `joined` is used only
// for substring text-scans (atlantis apply, GraphQL mutation keyword/ids)
// where token boundaries don't matter, never for positional parsing.
function isGhBlocked(argv) {
  if (argv[0] !== 'gh') return false;
  const joined = argv.join(' ');
  // fix round 4, finding (d): strip global -R/--repo/--hostname flags before
  // reading the subcommand/verb positions.
  const rest = stripGhGlobalFlags(argv.slice(1));
  if (rest[0] === 'pr' && rest[1] === 'merge') return true;
  if (rest[0] === 'pr' && rest[1] === 'comment' && ATLANTIS_APPLY_RE.test(joined)) return true;
  // fix round 5, finding (g4): `gh repo sync` fast-forwards (or hard-resets)
  // a repo/branch from its upstream -- a history write outside `gh api`.
  if (rest[0] === 'repo' && rest[1] === 'sync') return true;

  if (rest[0] === 'api') {
    const tokens = rest.slice(1);
    const { method: explicitMethod, impliedMutate, path } = parseGhApiArgs(tokens);
    if (path === null) return false;
    // fix round 4, finding (c): strip a leading '/' from the resolved path
    // before every check below (gh accepts both `repos/...` and the
    // equivalent `/repos/...`, and so does `graphql` vs `/graphql`).
    const p = path.startsWith('/') ? path.slice(1) : path;
    if (/comments\b/.test(p) && ATLANTIS_APPLY_RE.test(joined)) return true;

    if (p === 'graphql') {
      if (hasOutOfBandGraphqlBody(tokens)) return true;
      if (/mutation/.test(joined) && GRAPHQL_MUTATION_IDS_RE.test(joined)) return true;
    }

    const method = explicitMethod || (impliedMutate ? 'POST' : 'GET');
    const mutating = method === 'PUT' || method === 'POST' || method === 'PATCH' || method === 'DELETE';
    return mutating && GH_MUTATING_PATH_RE.test(p);
  }
  return false;
}

const REASON =
  'rigor git-guard: Claude does not write git history. Output the exact ' +
  'git command for the human to run, then continue. ' +
  '(Override for a web-driven repo: set RIGOR_GIT_ALLOW=1.)';

export function decide(command, env = process.env) {
  if (env.RIGOR_GIT_ALLOW === '1') return { block: false };
  const expandedArgv = expandArgv(String(command));
  for (const argv of expandedArgv) {
    // git's own BLOCKED patterns are plain regexes over the whole
    // normalized segment; joining argv back into a string is safe here
    // (unlike gh-api parsing) because nothing re-splits it positionally.
    const cmdStr = argv.join(' ');
    const gitNormalized = normalizeGitSegment(cmdStr);
    if (gitNormalized && isBlockedGit(gitNormalized)) {
      return { block: true, reason: REASON };
    }
    if (isGhBlocked(argv)) {
      return { block: true, reason: REASON };
    }
  }
  return { block: false };
}

// finding #19: exported run() — stdin listener is registered only when
// this module is the main entry point (import.meta.url main-module guard).
// Windows-safe: use fileURLToPath rather than pathname which has a
// leading-slash bug on Windows drive letters.
export function run() {
  let buf = '';
  process.stdin.on('data', (d) => (buf += d));
  process.stdin.on('end', () => {
    let cmd = '';
    try { cmd = JSON.parse(buf)?.tool_input?.command ?? ''; } catch {}
    const { block, reason } = decide(cmd);
    // finding #33: omit permissionDecisionReason on the allow path.
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: block ? 'deny' : 'allow',
        ...(block && { permissionDecisionReason: reason }),
      },
    }));
  });
}

// Main-module guard (Windows-safe via node:url fileURLToPath).
import { fileURLToPath } from 'node:url';
const isMain = process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) run();
