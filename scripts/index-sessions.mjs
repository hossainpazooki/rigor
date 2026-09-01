import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Deterministic session indexer: turns Claude Code transcripts (JSONL, one record
 * per line) into a list of rigor CONTROL FIRINGS, so past sessions can be mined for
 * evidence without a model reading 100+ MB of prose.
 *
 * A firing is a LEAD, never evidence (ADR-0014). Credit for a component comes from
 * re-running its control today; this file only says where to look. Nothing here
 * writes a ledger.
 *
 * Structural detection, never keyword search: every session's system prompt lists
 * every skill by name, so `grep -l no-lookahead` matches 27 transcripts with zero
 * real firings. Detectors key on tool_use blocks, tool_result payloads and hook
 * attachments instead.
 *
 * HONEST LIMITS:
 *  - `opportunity` (the silent-skip detector) OVER-PRODUCES by construction. It is
 *    a candidate generator; the observed false-positive rate belongs in the harvest
 *    record, not in a claim that these are defects.
 *  - A firing's outcome here is the transcript's word for it. That is exactly what
 *    must not be trusted, which is why `exit_signal` is coarse and why nothing in
 *    this file is allowed to set `credited`.
 */

/** Hook denials carry these prefixes in their permissionDecisionReason. */
const HOOK_FINGERPRINT = /rigor (git-guard|change-guard):/;

/** `node .../scripts/check-foo.mjs` anywhere in a shell command. */
const GATE_RE = /check-([a-z0-9]+(?:-[a-z0-9]+)*)\.mjs/g;

/**
 * rigor's own gates. A `check-*.mjs` NOT on this list is a sibling repo's own gate,
 * not a rigor control - measured 2026-09-01: baseline and parallax run their own
 * `check-ledger.mjs` 15 times between them, which a bare `check-*.mjs` match scored
 * as rigor firings. Those are recorded as `foreign-gate` and can never be credited
 * to rigor. `tests/index-sessions.test.mjs` asserts this list against scripts/.
 */
export const RIGOR_GATES = new Set([
  'check-change-record', 'check-citation-fidelity', 'check-dispatch', 'check-effect-probe',
  'check-fanout', 'check-harvest', 'check-learnings', 'check-misfire-closure', 'check-runlog',
  'check-surface-scrub', 'check-tier-placement', 'check-tier-sync',
]);

/** A `/rigor:<name>` slash command in a user turn. */
const COMMAND_RE = /(?:^|<command-name>)\/(rigor:[a-z][a-z0-9-]*)/m;

/**
 * Irreversible, outward-facing actions. Deliberately narrow: a verb here with no
 * later effect-verification is the strongest silent-skip signal rigor has, so a
 * loose list would drown it. Read-only forms (get/describe/plan/diff/status) are
 * excluded by requiring the mutating verb itself.
 */
const IRREVERSIBLE_RE = new RegExp([
  'kubectl\\s+(apply|delete|rollout\\s+restart|scale)',
  'helm\\s+(install|upgrade|uninstall|rollback)',
  'terraform\\s+(apply|destroy)',
  'pulumi\\s+(up|destroy)',
  'argocd\\s+app\\s+(sync|delete)',
  'flux\\s+reconcile',
  'gh\\s+(workflow\\s+run|release\\s+create|pr\\s+merge)',
  'npm\\s+publish',
  'docker\\s+push',
  'aws\\s+s3\\s+(cp|sync|rm)\\b',
  'gcloud\\s+\\S+\\s+deploy',
  'alembic\\s+upgrade',
  'dbt\\s+run',
].join('|'));

/** Controls that discharge an irreversible action's obligation. */
const EFFECT_CONTROLS = /verify-the-effect|effect-prober|check-effect-probe|verify-effect/;
/** Controls that discharge a fan-out's obligation. */
const FANOUT_CONTROLS = /check-dispatch|check-fanout|check-tier-placement/;
/** Controls that discharge a status-write's obligation. */
const HONESTY_CONTROLS = /implemented-vs-planned|honesty-check/;

/**
 * Paths whose edit is a published status claim. Ledger paths are deliberately EXCLUDED:
 * measured 2026-09-01, ~50 of 91 hits from the first version of this trigger were
 * `/rigor:handoff` writing its own dated entries and indexes - the command doing exactly
 * its job, scored as an unchecked claim. A ledger write is not a status claim.
 */
const STATUS_PATH_RE = /(README|STATUS|CHANGELOG)[^/\\]*\.md$/i;
const LEDGER_PATH_RE = /[/\\](handoff|learnings|learn|feedback|efforts|adr)[/\\]/i;

/** JSONL -> records, skipping lines that do not parse. A torn tail must not crash a sweep. */
export function parseTranscript(text) {
  const out = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim() === '') continue;
    try { out.push({ line: i, rec: JSON.parse(l) }); } catch { /* torn or truncated */ }
  }
  return out;
}

/**
 * Repo slug from a record's cwd, relative to the dev root. `C:\Users\hossa\dev\rigor\docs`
 * -> `rigor`; the dev root itself -> null (no single repo owns the turn).
 * Case-insensitive and separator-agnostic: transcripts carry Windows paths.
 */
export function repoFromCwd(cwd, devRoot) {
  if (typeof cwd !== 'string' || typeof devRoot !== 'string') return null;
  const norm = (s) => s.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  const c = norm(cwd);
  const d = norm(devRoot);
  if (c === d) return null;
  if (!c.startsWith(d + '/')) return null;
  const rest = c.slice(d.length + 1);
  const first = rest.split('/')[0];
  return first === '' ? null : first;
}

/** Tool_use blocks in an assistant record. */
function toolUses(rec) {
  const c = rec?.message?.content;
  if (!Array.isArray(c)) return [];
  return c.filter((b) => b && b.type === 'tool_use');
}

/** Tool_result blocks in a user record. */
function toolResults(rec) {
  const c = rec?.message?.content;
  if (!Array.isArray(c)) return [];
  return c.filter((b) => b && b.type === 'tool_result');
}

function textOf(block) {
  const c = block?.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.map((x) => (typeof x?.text === 'string' ? x.text : '')).join('\n');
  return '';
}

/** Coarse outcome for a gate run, read off the paired tool_result. */
function exitSignalFor(id, resultsById) {
  const r = resultsById.get(id);
  if (!r) return 'unknown';
  if (r.is_error === true) return 'error';
  return 'ok';
}

function excerptOf(s, n = 200) {
  if (typeof s !== 'string') return '';
  const one = s.replace(/\s+/g, ' ').trim();
  return one.length <= n ? one : one.slice(0, n) + '...';
}

/**
 * Index one transcript. `devRoot` attributes each firing to a repo; `rigorRepo` is the
 * slug whose own files are USE, not an independent domain (FEEDBACK.md's rule).
 */
export function indexTranscript(entries, { session, devRoot, rigorRepo = 'rigor' } = {}) {
  const firings = [];

  // Pair tool_result blocks to their tool_use ids first: outcomes live in a later record.
  const resultsById = new Map();
  for (const { rec } of entries) {
    for (const b of toolResults(rec)) if (b.tool_use_id) resultsById.set(b.tool_use_id, b);
  }

  const base = (rec, line) => {
    const repo = repoFromCwd(rec?.cwd, devRoot);
    return {
      session: session ?? rec?.sessionId ?? null,
      uuid: rec?.uuid ?? null,
      ts: rec?.timestamp ?? null,
      line,
      cwd: rec?.cwd ?? null,
      repo,
      gitBranch: rec?.gitBranch ?? null,
      sidechain: rec?.isSidechain === true,
      domain_eligible: repo !== null && repo !== rigorRepo,
    };
  };

  for (const { line, rec } of entries) {
    // 1. skill invocations
    for (const u of toolUses(rec)) {
      if (u.name === 'Skill' && typeof u.input?.skill === 'string' && u.input.skill.startsWith('rigor:')) {
        firings.push({ ...base(rec, line), kind: 'skill-invocation', control: u.input.skill, exit_signal: exitSignalFor(u.id, resultsById) });
      }
      // 2. gate runs - one firing per distinct gate named in the command
      if (u.name === 'Bash' && typeof u.input?.command === 'string') {
        const seen = new Set();
        let m;
        GATE_RE.lastIndex = 0;
        while ((m = GATE_RE.exec(u.input.command)) !== null) {
          const gate = 'check-' + m[1];
          if (seen.has(gate)) continue;
          seen.add(gate);
          const res = resultsById.get(u.id);
          firings.push({
            ...base(rec, line),
            kind: RIGOR_GATES.has(gate) ? 'gate-run' : 'foreign-gate',
            control: gate,
            exit_signal: exitSignalFor(u.id, resultsById),
            excerpt: excerptOf(res ? textOf(res) : ''),
            // A sibling repo's own gate is never evidence about a rigor component.
            ...(RIGOR_GATES.has(gate) ? {} : { domain_eligible: false }),
          });
        }
      }
    }

    // 3. hook denials - the reason text inside a hook attachment or a tool_result,
    //    NOT inside a Bash command that merely quotes it (this session quoted it 13x).
    const attach = rec?.attachment;
    const attachText = typeof attach?.stdout === 'string' ? attach.stdout : '';
    if (HOOK_FINGERPRINT.test(attachText)) {
      const which = /change-guard/.test(attachText) ? 'change-guard' : 'git-guard';
      firings.push({ ...base(rec, line), kind: 'hook-denial', control: which, exit_signal: 'error', excerpt: excerptOf(attachText) });
    }
    for (const b of toolResults(rec)) {
      const t = textOf(b);
      if (!HOOK_FINGERPRINT.test(t)) continue;
      const which = /change-guard/.test(t) ? 'change-guard' : 'git-guard';
      firings.push({ ...base(rec, line), kind: 'hook-denial', control: which, exit_signal: 'error', excerpt: excerptOf(t) });
    }

    // 4. slash-command invocations
    const um = rec?.message?.content;
    if (rec?.type === 'user' && typeof um === 'string') {
      const m = COMMAND_RE.exec(um);
      if (m) firings.push({ ...base(rec, line), kind: 'command-invocation', control: '/' + m[1], exit_signal: 'unknown' });
    }
  }

  firings.push(...detectOpportunities(entries, base));
  firings.sort((a, b) => a.line - b.line || String(a.control).localeCompare(String(b.control)));
  return firings;
}

/**
 * The silent-skip detector: a trigger fired and the control that should answer it never
 * ran afterwards in the same transcript. Over-produces by design - a session may have
 * discharged the obligation somewhere this cannot see (another session, the operator's
 * own run). Every hit is a question, not a finding.
 */
export function detectOpportunities(entries, base) {
  const out = [];
  const triggers = [];
  // A control "answers" a trigger if it appears at a LATER line than the trigger.
  const controlLines = { effect: [], fanout: [], honesty: [] };
  let agentDispatches = 0;

  for (const { line, rec } of entries) {
    const blob = JSON.stringify(rec?.message?.content ?? '');
    if (EFFECT_CONTROLS.test(blob)) controlLines.effect.push(line);
    if (FANOUT_CONTROLS.test(blob)) controlLines.fanout.push(line);
    if (HONESTY_CONTROLS.test(blob)) controlLines.honesty.push(line);

    for (const u of toolUses(rec)) {
      if (u.name === 'Bash' && typeof u.input?.command === 'string' && IRREVERSIBLE_RE.test(u.input.command)) {
        triggers.push({ line, rec, want: 'effect', control: 'verify-the-effect', why: excerptOf(u.input.command, 120) });
      }
      if (u.name === 'Workflow') {
        triggers.push({ line, rec, want: 'fanout', control: 'check-dispatch', why: 'Workflow dispatch' });
      }
      if (u.name === 'Agent') {
        agentDispatches += 1;
        if (agentDispatches === 3) triggers.push({ line, rec, want: 'fanout', control: 'check-dispatch', why: '3rd Agent dispatch' });
      }
      if ((u.name === 'Write' || u.name === 'Edit') && typeof u.input?.file_path === 'string'
          && STATUS_PATH_RE.test(u.input.file_path) && !LEDGER_PATH_RE.test(u.input.file_path)) {
        triggers.push({ line, rec, want: 'honesty', control: 'implemented-vs-planned', why: excerptOf(u.input.file_path, 120) });
      }
    }
  }

  for (const t of triggers) {
    const answered = controlLines[t.want].some((l) => l > t.line);
    if (answered) continue;
    out.push({ ...base(t.rec, t.line), kind: 'opportunity', control: t.control, exit_signal: 'none', excerpt: t.why });
  }
  return out;
}

/** Index every *.jsonl in a directory. Deterministic: files sorted, firings by line. */
export function indexDirectory(dir, { devRoot, rigorRepo = 'rigor', read = readFileSync, list = readdirSync } = {}) {
  const files = list(dir).filter((f) => f.endsWith('.jsonl')).sort();
  const rows = [];
  for (const f of files) {
    const text = read(join(dir, f), 'utf8');
    const entries = parseTranscript(text);
    rows.push(...indexTranscript(entries, { session: basename(f, '.jsonl'), devRoot, rigorRepo }));
  }
  return rows;
}

// Windows-safe main-module check.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith('--'));
  const outIdx = args.indexOf('--out');
  const rootIdx = args.indexOf('--dev-root');
  if (!dir) {
    console.error('usage: index-sessions.mjs <transcripts-dir> [--dev-root <path>] [--out <file.jsonl>]');
    process.exit(1);
  }
  const devRoot = rootIdx >= 0 ? args[rootIdx + 1] : join(process.env.USERPROFILE || process.env.HOME || '', 'dev');
  let rows;
  try {
    rows = indexDirectory(dir, { devRoot });
  } catch (e) {
    console.error(`INDEX UNEVALUABLE: cannot read ${dir}: ${e.message}`);
    process.exit(2);
  }
  if (rows.length === 0) {
    console.error(`INDEX UNEVALUABLE: no firings found under ${dir} - a mistyped path and a clean corpus look identical, so this is not a pass.`);
    process.exit(2);
  }
  const jsonl = rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
  if (outIdx >= 0 && args[outIdx + 1]) {
    writeFileSync(args[outIdx + 1], jsonl);
    console.log(`index: ${rows.length} firings from ${dir} -> ${args[outIdx + 1]}`);
  } else {
    process.stdout.write(jsonl);
  }
}
