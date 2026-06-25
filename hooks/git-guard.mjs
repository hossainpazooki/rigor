// Blocks agent-initiated git-history writes. Claude outputs the command for the
// human instead. Override per web-driven repo with RIGOR_GIT_ALLOW=1.

// BLOCKED patterns are tested against the NORMALIZED subcommand segment
// (after stripping env-prefix tokens, global flags, and shell wrappers).
// The bare /--force\b/ catch-all has been removed (finding #17): it
// false-positives on `git fetch --force` and `git log --grep=--force`.
// push --force is already caught by the push rule; branch --force is
// caught by the expanded branch rule below.
const BLOCKED = [
  /^git\s+commit\b/,
  /^git\s+push\b/,
  // finding #17: expanded to catch -f / --force anywhere in the branch command
  /^git\s+branch\b.*(\s+-f\b|\s+--force\b|\s+-D\b)/,
  // finding #13: block all three history-moving reset modes; plain unstage
  // (`git reset HEAD <file>`, `git reset <file>`) has no mode flag so is allowed.
  /^git\s+reset\s+--(soft|mixed|hard)\b/,
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
  // finding #15: tag force-overwrite / delete
  /^git\s+tag\s+(-f|--force|-d|--delete)\b/,
  // finding #16: reflog erasure (allow read-only `git reflog show`)
  /^git\s+reflog\s+(delete|expire)\b/,
];

// Global option tokens that appear between `git` and the subcommand.
// VALUE_FLAGS take the next token as their argument.
const VALUE_FLAGS = new Set(['-C', '--git-dir', '--work-tree', '--namespace', '--exec-path']);
// BOOL_FLAGS_RE matches single-token boolean global options (no argument).
const BOOL_FLAGS_RE = /^(-p|--paginate|--no-pager|--bare|--no-replace-objects|--literal-pathspecs|--glob-pathspecs|--noglob-pathspecs|--icase-pathspecs)$/;
// VALUE_FLAG_PREFIX_RE matches `--key=value` forms.
const VALUE_FLAG_PREFIX_RE = /^(--git-dir=|--work-tree=|--namespace=|--exec-path=)/;

/**
 * Strip global option tokens from a tokenized git command and return a
 * normalized string starting with `git <subcommand> ...`.
 */
function normalizeGitSegment(seg) {
  // 1. Strip shell env-prefix tokens: `VAR=val ` repeated at the start.
  const stripped = seg.replace(/^(\w+=\S*\s+)+/, '');

  // 2. Strip subshell / command-substitution wrappers.
  const unwrapped = stripped
    .replace(/^\$\(/, '')
    .replace(/^\(/, '')
    .replace(/^`/, '')
    .replace(/[`\)]+$/, '')
    .trim();

  // 3. Must start with `git` after stripping.
  if (!unwrapped.startsWith('git ') && unwrapped !== 'git') return null;

  // 4. Strip leading global flag tokens between `git` and the subcommand.
  const tokens = unwrapped.split(/\s+/);
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

export function decide(command, env = process.env) {
  if (env.RIGOR_GIT_ALLOW === '1') return { block: false };
  // Split on shell separators; a segment "blocks" only if its first git token
  // matches a BLOCKED pattern after normalization.
  const segments = String(command).split(/&&|\|\||;|\||\n/);
  for (const raw of segments) {
    const seg = raw.trim();
    const normalized = normalizeGitSegment(seg);
    if (!normalized) continue;
    if (BLOCKED.some((re) => re.test(normalized))) {
      return {
        block: true,
        reason:
          'rigor git-guard: Claude does not write git history. Output the exact ' +
          'git command for the human to run, then continue. ' +
          '(Override for a web-driven repo: set RIGOR_GIT_ALLOW=1.)',
      };
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
