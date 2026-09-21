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
//   - ONE HOP of indirection is resolved: when the options argument is a forwarded
//     identifier (`agent(prompt, opts)`, or `Object.assign({}, opts, {…})` adding no
//     pin of its own), the pin is looked for at the call sites of the enclosing
//     helper instead. orchestrate guardrail 10 mandates a stall-retry wrapper of
//     exactly this shape, so reading only the agent() site made the gate red by
//     construction on the pattern the skill requires — 8 warnings across three
//     domain repos in session cc40b6d1 against run receipts showing zero collapse.
//     Resolution FAILS CLOSED: an unresolvable forward, or one caller out of many
//     that does not pin, still warns.
// HONESTY CAVEAT: structure only. It cannot prove the pinned model is CORRECT, it
// resolves one hop and no further (a wrapper calling a wrapper still warns), and it
// cannot observe which model actually ANSWERED — that is the receipt line's job.
export function analyzeTierPlacement(rawSrc, config) {
  const src = stripComments(rawSrc);
  const warnings = [];
  const tierAgents = config?.tier_agents ?? null;
  const phases = [...src.matchAll(/\bphase\s*\(\s*['"`]([^'"`]*)/g)]
    .map((m) => ({ index: m.index, name: m[1] }));

  for (const call of extractAgentCalls(src)) {
    // The texts that decide this call's pin: the call itself, or — when the options
    // are forwarded through a helper — every call site of that helper.
    let texts = [call.text];
    const ident = forwardedIdent(secondArgText(call.text));
    if (ident && !hasOwnPin(call.text)) {
      const callers = resolveCallerOptions(src, call.start, ident);
      if (callers.length) texts = callers;
    }

    const label = texts.map((t) => t.match(/\blabel\s*:\s*['"`]([^'"`]*)/)?.[1]).find(Boolean);
    const phaseOpt = texts.map((t) => t.match(/\bphase\s*:\s*['"`]([^'"`]*)/)?.[1]).find(Boolean);
    const phase = phaseOpt ?? phases.filter((p) => p.index < call.start).at(-1)?.name;
    const verifyShaped = /verif|skeptic|refute/i.test(phase ?? '') ||
      texts.some((t) => /skeptic-verifier|effect-prober/.test(t));

    const literal = texts.find((t) => /\bmodel\s*:\s*['"`]claude-/.test(t));
    const badAgentType = texts
      .map((t) => t.match(/\bagentType\s*:\s*['"`]([^'"`]+)/)?.[1])
      .find((a) => a && !(tierAgents && a.replace(/^[\w-]+:/, '') in tierAgents));

    if (literal) {
      warnings.push(
        `hardcoded model literal${label ? ` in '${label}'` : ''}: source the tier from ` +
        'config/models.json (pass tiers via args) so a config change does not require ' +
        're-auditing every workflow script by hand'
      );
    } else if (badAgentType) {
      warnings.push(
        `agentType '${badAgentType}'${label ? ` on '${label}'` : ''} is not a tier pin by itself: ` +
        "it pins a tier only if that agent's frontmatter pins model: (config/models.json " +
        'tier_agents). An agent with model: inherit still collapses onto the session model.'
      );
    } else if (!texts.every(hasOwnPin) && !verifyShaped) {
      warnings.push(
        `agent() call${label ? ` '${label}'` : ''} without a tier pin: an unpinned call ` +
        'inherits the SESSION model, not the build tier — the swarm may silently collapse ' +
        'onto whatever model is orchestrating (config/models.json)'
      );
    }
  }
  return warnings;
}

/** A pin the gate can see in one options text: an explicit model:, or any agentType:. */
function hasOwnPin(text) {
  return /\bmodel\s*:/.test(text) || /\bagentType\s*:/.test(text);
}

/** The second top-level argument of a `fn(a, b, …)` call text, '' when there is none. */
function secondArgText(callText) {
  const open = callText.indexOf('(');
  if (open === -1) return '';
  const args = splitTopLevelArgs(callText.slice(open + 1, callText.length - 1));
  return args[1]?.trim() ?? '';
}

/**
 * The identifier an options argument forwards, or null when the options are a literal
 * the gate can read directly. Handles the two real wrapper forms: a bare `opts`, and
 * `Object.assign({}, opts, { … })` whose own literal adds no pin.
 */
function forwardedIdent(optsText) {
  if (/^[A-Za-z_$][\w$]*$/.test(optsText)) return optsText;
  const assign = /^Object\.assign\s*\(\s*\{\s*\}\s*,\s*([A-Za-z_$][\w$]*)\s*,([\s\S]*)\)$/.exec(optsText);
  if (assign && !hasOwnPin(assign[2])) return assign[1];
  return null;
}

/**
 * Resolve one hop: find the helper enclosing `callStart` that takes `ident` as a
 * parameter, then return the options text of every call site of that helper outside
 * its own body. Empty when nothing resolves — the caller then keeps warning.
 */
function resolveCallerOptions(src, callStart, ident) {
  const fn = enclosingHelper(src, callStart, ident);
  if (!fn) return [];
  const out = [];
  const re = new RegExp(`\\b${fn.name}\\s*\\(`, 'g');
  let m;
  while ((m = re.exec(src))) {
    // Skip the declaration itself (its header holds `name(params)`) and the body
    // (a recursive call is not a caller that supplies options).
    if (m.index >= fn.nameIndex && m.index <= fn.bodyEnd) continue;
    const end = scanBalanced(src, m.index + m[0].length - 1);
    if (end === -1) continue;
    out.push(secondArgText(src.slice(m.index, end + 1)));
    re.lastIndex = end;
  }
  return out;
}

/** The nearest `function NAME(… ident …)` or `const NAME = (… ident …) =>` containing callStart. */
function enclosingHelper(src, callStart, ident) {
  const decl = /(?:(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>)/g;
  let m, best = null;
  while ((m = decl.exec(src))) {
    if (m.index > callStart) break;
    const name = m[1] ?? m[3];
    const params = m[2] ?? m[4];
    if (!new RegExp(`\\b${ident}\\b`).test(params)) continue;
    const bodyStart = src.indexOf('{', m.index + m[0].length - 1);
    if (bodyStart === -1) continue;
    const bodyEnd = scanBalancedBraces(src, bodyStart);
    if (bodyEnd === -1 || callStart < bodyStart || callStart > bodyEnd) continue;
    best = { name, bodyStart, bodyEnd, nameIndex: m.index };
  }
  return best;
}

/** From an opening '{', the index of its matching '}', string-aware. -1 if unbalanced. */
function scanBalancedBraces(src, open) {
  let depth = 0, quote = null;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  return -1;
}

/** Split an argument list on top-level commas, ignoring commas in strings/brackets. */
function splitTopLevelArgs(inner) {
  const args = [];
  let depth = 0, quote = null, start = 0;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) { args.push(inner.slice(start, i)); start = i + 1; }
  }
  args.push(inner.slice(start));
  return args;
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
