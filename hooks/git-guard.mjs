// Blocks agent-initiated git-history writes. Claude outputs the command for the
// human instead. Override per web-driven repo with RIGOR_GIT_ALLOW=1.
const BLOCKED = [
  /^git\s+commit\b/,
  /^git\s+push\b/,
  /^git\s+branch\s+(-f|--force|-D)\b/,
  /^git\s+reset\s+--hard\b/,
  /--no-verify\b/,
  /--force\b/,
];

export function decide(command, env = process.env) {
  if (env.RIGOR_GIT_ALLOW === '1') return { block: false };
  // Split on shell separators; a segment "blocks" only if its first word is git.
  const segments = String(command).split(/&&|\|\||;|\||\n/);
  for (const raw of segments) {
    const seg = raw.trim();
    if (!seg.startsWith('git ') && seg !== 'git') continue;
    if (BLOCKED.some((re) => re.test(seg))) {
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

// stdin/stdout wrapper (skipped under the test runner).
if (!process.env.NODE_TEST_CONTEXT) {
  let buf = '';
  process.stdin.on('data', (d) => (buf += d));
  process.stdin.on('end', () => {
    let cmd = '';
    try { cmd = JSON.parse(buf)?.tool_input?.command ?? ''; } catch {}
    const { block, reason } = decide(cmd);
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: block ? 'deny' : 'allow',
        permissionDecisionReason: block ? reason : 'ok',
      },
    }));
  });
}
