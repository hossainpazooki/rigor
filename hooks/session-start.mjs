import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const POINTER =
  'using-rigor: this session has the rigor toolkit. Reach for `refute` before ' +
  'trusting any load-bearing claim (recompute numbers, re-run the real gate, ' +
  'dispatch skeptics); keep built-vs-planned honest; never write git history ' +
  '(output the command for the human). Commands: /verify-claim, /honesty-check.';

export function buildContext({ homeRulesPresent, vendoredRules }) {
  let out = POINTER;
  if (!homeRulesPresent && vendoredRules) {
    out += '\n\n--- vendored operating rules (no ~/.claude/rules found) ---\n' + vendoredRules;
  }
  return out;
}

function readVendoredRules(root) {
  const dir = join(root, 'rules');
  if (!existsSync(dir)) return '';
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== 'PROVENANCE.md')
    .map((f) => `# ${f}\n` + readFileSync(join(dir, f), 'utf8'))
    .join('\n\n');
}

if (!process.env.NODE_TEST_CONTEXT) {
  const root = process.env.CLAUDE_PLUGIN_ROOT ?? process.cwd();
  const homeRulesPresent = existsSync(join(homedir(), '.claude', 'rules'));
  const context = buildContext({ homeRulesPresent, vendoredRules: readVendoredRules(root) });
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context },
  }));
}
