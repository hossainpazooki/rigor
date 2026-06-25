import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

// #20: derive plugin root from import.meta.url, not CLAUDE_PLUGIN_ROOT env fallback.
// Windows-safe: fileURLToPath handles the leading-slash bug that pathname has on Windows.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

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

/**
 * Determines whether the home rules directory already contains rigor's vendored
 * rules, making injection unnecessary.
 *
 * Implements findings #9 and #21:
 * - #21: content-aware — the dir must contain at least one .md file other than
 *   PROVENANCE.md (mirrors the filter in readVendoredRules).
 * - #9: sentinel-driven — specifically checks for verification-and-honesty.md,
 *   rigor's canonical sentinel, so a host's personal ~/.claude/rules directory
 *   alone does NOT suppress the vendored copy.
 *
 * Returns true only when the rigor sentinel file is present (rigor already
 * synced); false in all other cases (inject the vendored rules).
 *
 * @param {string} rulesDir  absolute path to the rules directory to inspect
 * @returns {boolean}
 */
export function computeHomeRulesPresent(rulesDir) {
  if (!existsSync(rulesDir)) return false;
  // #21: content-aware check — must have at least one real .md file (mirrors readVendoredRules filter)
  const files = readdirSync(rulesDir);
  const hasRealMd = files.some((f) => f.endsWith('.md') && f !== 'PROVENANCE.md');
  if (!hasRealMd) return false;
  // #9: sentinel check — rigor's own file must be present to suppress injection;
  // a host's personal rules alone do NOT count as "already synced"
  return files.includes('verification-and-honesty.md');
}

function readVendoredRules(root) {
  const dir = join(root, 'rules');
  if (!existsSync(dir)) return '';
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== 'PROVENANCE.md')
    .map((f) => `# ${f}\n` + readFileSync(join(dir, f), 'utf8'))
    .join('\n\n');
}

// #18: gate the stdout-writing block behind an import.meta.url main-module check
// so importing this module has no side effects.
// Windows-safe: use pathToFileURL(resolve(...)) rather than new URL(process.argv[1], 'file://').href
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const rulesDir = join(homedir(), '.claude', 'rules');
  const homeRulesPresent = computeHomeRulesPresent(rulesDir);
  const context = buildContext({ homeRulesPresent, vendoredRules: readVendoredRules(ROOT) });
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context },
  }));
}
