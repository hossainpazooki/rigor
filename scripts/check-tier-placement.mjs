import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Heuristic structural linter for TIER PLACEMENT in a workflow script (ADR-0006).
// An un-pinned agent() call inherits the SESSION model — a fan-out can look like a
// specialized swarm while every call silently answers on whatever model is
// orchestrating ("silent tier collapse"). This gate checks that a pin EXISTS:
//   - `model:` in the call options is a pin (config-sourced expressions preferred;
//     a hardcoded model literal is flagged separately — tiers belong in config).
//   - `agentType:` is a pin ONLY if the named agent is tier-mapped in
//     config/models.json `tier_agents` (whose frontmatter agreement check-tier-sync
//     enforces). An agentType whose frontmatter says `model: inherit` still
//     collapses onto the session model — verified against real transcripts.
//   - Verify-shaped stages are exempt from the unpinned warning: verifier tiering
//     is judgment-dispatch's job, with its own receipt and gate (check-dispatch).
// HONESTY CAVEAT: structure only. It cannot prove the pinned model is CORRECT or
// see through indirection (a helper that sets model: away from the call site), and
// it cannot observe which model actually ANSWERED — that is the receipt line's job.
export function analyzeTierPlacement(rawSrc, config) {
  const src = stripComments(rawSrc);
  const warnings = [];
  const tierAgents = config?.tier_agents ?? null;
  const phases = [...src.matchAll(/\bphase\s*\(\s*['"`]([^'"`]*)/g)]
    .map((m) => ({ index: m.index, name: m[1] }));

  for (const call of extractAgentCalls(src)) {
    const label = call.text.match(/\blabel\s*:\s*['"`]([^'"`]*)/)?.[1];
    const phaseOpt = call.text.match(/\bphase\s*:\s*['"`]([^'"`]*)/)?.[1];
    const phase = phaseOpt ?? phases.filter((p) => p.index < call.start).at(-1)?.name;
    const verifyShaped = /verif|skeptic|refute/i.test(phase ?? '') ||
      /skeptic-verifier|effect-prober/.test(call.text);
    const agentType = call.text.match(/\bagentType\s*:\s*['"`]([^'"`]+)/)?.[1];

    if (/\bmodel\s*:\s*['"`]claude-/.test(call.text)) {
      warnings.push(
        `hardcoded model literal${label ? ` in '${label}'` : ''}: source the tier from ` +
        'config/models.json (pass tiers via args) so a config change does not require ' +
        're-auditing every workflow script by hand'
      );
    } else if (/\bmodel\s*:/.test(call.text)) {
      // pinned via an expression — structurally sufficient
    } else if (agentType) {
      const bare = agentType.replace(/^[\w-]+:/, '');
      if (!tierAgents || !(bare in tierAgents)) {
        warnings.push(
          `agentType '${agentType}'${label ? ` on '${label}'` : ''} is not a tier pin by itself: ` +
          "it pins a tier only if that agent's frontmatter pins model: (config/models.json " +
          'tier_agents). An agent with model: inherit still collapses onto the session model.'
        );
      }
    } else if (!verifyShaped) {
      warnings.push(
        `agent() call${label ? ` '${label}'` : ''} without a tier pin: an unpinned call ` +
        'inherits the SESSION model, not the build tier — the swarm may silently collapse ' +
        'onto whatever model is orchestrating (config/models.json)'
      );
    }
  }
  return warnings;
}

// Length-preserving, string-aware comment blanking so prose mentioning agent()
// is never a call site and all offsets stay valid.
function stripComments(src) {
  let out = '', quote = null, i = 0;
  while (i < src.length) {
    const c = src[i];
    if (quote) {
      out += c;
      if (c === '\\') { out += src[i + 1] ?? ''; i += 2; continue; }
      if (c === quote) quote = null;
      i++; continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; out += c; i++; continue; }
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') { out += ' '; i++; }
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end === -1 ? src.length : end + 2;
      while (i < stop) { out += src[i] === '\n' ? '\n' : ' '; i++; }
      continue;
    }
    out += c; i++;
  }
  return out;
}

// String-aware balanced-paren extraction of every top-level `agent(...)` call.
function extractAgentCalls(src) {
  const calls = [];
  const re = /\bagent\s*\(/g;
  let m;
  while ((m = re.exec(src))) {
    if (m.index > 0 && /[.\w$]/.test(src[m.index - 1])) continue; // foo.agent( / $agent(
    const end = scanBalanced(src, m.index + m[0].length - 1);
    if (end === -1) continue;
    calls.push({ start: m.index, text: src.slice(m.index, end + 1) });
    re.lastIndex = end;
  }
  return calls;
}

// From an opening '(' index, return the index of its matching ')', skipping
// string contents ('' "" ``, with \ escapes and ${} interpolation). -1 if unbalanced.
function scanBalanced(src, open) {
  let depth = 0, quote = null, tmpl = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (quote === '`' && c === '$' && src[i + 1] === '{') { tmpl++; quote = null; i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '\\') { i++; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (tmpl && c === '}') { tmpl--; quote = '`'; continue; }
    if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return i;
  }
  return -1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const file = process.argv[2];
  if (!file) { console.error('usage: node scripts/check-tier-placement.mjs <workflow-script.(js|mjs)> [models.json]'); process.exit(2); }
  const configPath = process.argv[3] ?? resolve(dirname(fileURLToPath(import.meta.url)), '../config/models.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const warnings = analyzeTierPlacement(readFileSync(file, 'utf8'), config);
  if (warnings.length) {
    console.error(`check-tier-placement: ${warnings.length} warning(s) for ${file}:`);
    for (const w of warnings) console.error('  - ' + w);
    console.error('(Heuristic: a pin\'s existence, not its correctness — and never which model actually answered.)');
    process.exit(1);
  }
  console.log('check-tier-placement: every non-verify agent() call carries a tier pin (structure only).');
}
