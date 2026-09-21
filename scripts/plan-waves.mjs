import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Plan intake for the execute-plan shape: turns a writing-plans-format plan
 * (`### Task N: <name>`, a Files block of Create/Modify/Test paths, an
 * Interfaces block, numbered steps) into the args the execute-plan workflow
 * consumes, and derives execution waves from the Files lists alone.
 *
 * Pure parser + wave derivation; fs only at the CLI boundary. A utility, not
 * a gate — but its CLI is three-outcome, because a plan that fails
 * writing-plans' own no-placeholder rule must not be executed on a guess:
 *   exit 0  args JSON on stdout
 *   exit 2  UNEVALUABLE: no tasks, a task with no files, or a placeholder path
 *
 * HONEST LIMIT: waves come from the Files lists only, never from imports.
 * A file named by two tasks is the drift hazard whether or not one imports
 * the other, so this is stricter than a hand derivation, never looser.
 */

const TASK_RE = /^### Task (\d+): (.+?)\s*$/;
const FILE_RE = /^- (Create|Modify|Test): `([^`]+)`/;
const IFACE_RE = /^- (Consumes|Produces): (.*)$/;
const COMMIT_RE = /^git commit\b.*$/;
const STEP_RE = /^- \[[ x]\] \*\*Step \d+: (.+?)\*\*/;
const PLACEHOLDER_RE = /\b(TBD|TODO)\b|(^|\/)(exact|path)\/|\/to\//i;

const stripRange = (p) => p.replace(/:\d+(-\d+)?$/, '');

// A fence opens with 3+ backticks and closes only on a fence at least as long,
// so a ```` block may quote ``` lines. Headings inside a fence are text, not
// structure - a plan that quotes another plan must not grow its tasks.
const FENCE_RE = /^(`{3,})/;
function fenceStep(inFence, line) {
  const m = FENCE_RE.exec(line);
  if (!m) return inFence;
  if (!inFence) return m[1].length;
  return m[1].length >= inFence ? 0 : inFence;
}

export function parsePlan(markdown) {
  const lines = String(markdown).split(/\r?\n/);
  const constraints = [];
  const tasks = [];
  let inConstraints = false;
  let inFence = 0;
  let cur = null;
  for (const line of lines) {
    const wasInFence = inFence;
    inFence = fenceStep(inFence, line);
    if (wasInFence || inFence) {
      if (inConstraints) constraints.push(line);
      else if (cur) cur.lines.push(line);
      continue;
    }
    if (/^## Global Constraints\s*$/.test(line)) { inConstraints = true; continue; }
    if (inConstraints) {
      if (/^(---\s*|## .*|### .*)$/.test(line)) inConstraints = false;
      else { constraints.push(line); continue; }
    }
    const m = TASK_RE.exec(line);
    if (m) { cur = { n: Number(m[1]), name: m[2], lines: [] }; tasks.push(cur); continue; }
    if (cur) {
      if (/^## /.test(line)) { cur = null; continue; } // a top-level section ends the task list
      cur.lines.push(line);
    }
  }
  return { constraints: constraints.join('\n').trim(), tasks: tasks.map(parseTask) };
}

function parseTask({ n, name, lines }) {
  const files = { create: [], modify: [], test: [] };
  const interfaces = { consumes: '', produces: '' };
  const commits = [];
  let inFence = 0;
  let inCommitStep = false; // set by a `**Step N: Commit**` heading seen outside a fence
  for (const line of lines) {
    const wasInFence = inFence;
    inFence = fenceStep(inFence, line);
    if (wasInFence || inFence) {
      // Only a Commit step's own fence carries the task's commits; a commit
      // line quoted in any other step (a fixture, an example) is text.
      if (inCommitStep && COMMIT_RE.test(line.trim())) commits.push(line.trim());
      continue;
    }
    const s = STEP_RE.exec(line);
    if (s) { inCommitStep = /\bcommit\b/i.test(s[1]); continue; }
    const f = FILE_RE.exec(line);
    if (f) { files[f[1].toLowerCase()].push(stripRange(f[2])); continue; }
    const i = IFACE_RE.exec(line);
    if (i) interfaces[i[1].toLowerCase()] = i[2].trim();
  }
  return { n, name, files, interfaces, commits, body: lines.join('\n').trim() };
}

export function allFiles(task) {
  return [...new Set([...task.files.create, ...task.files.modify, ...task.files.test])];
}

export function validatePlan(parsed) {
  const problems = [];
  if (!parsed.tasks.length) problems.push('no `### Task N:` headings found - not a writing-plans plan');
  for (const t of parsed.tasks) {
    const files = allFiles(t);
    if (!files.length) problems.push(`Task ${t.n} names no files (no Files block) - waves cannot be derived`);
    for (const f of files) {
      if (PLACEHOLDER_RE.test(f)) problems.push(`Task ${t.n} has a placeholder path: ${f}`);
    }
  }
  return problems;
}

/**
 * In plan order, a task joins the wave after the latest wave that holds an
 * earlier task naming any file it names; with no such task it joins wave 1.
 * Two tasks sharing a file never share a wave, and plan order holds inside
 * a wave because a task's wave depends only on the tasks before it.
 */
export function deriveWaves(tasks) {
  const waveOf = new Map(); // task n -> wave index
  const waves = [];
  for (const t of tasks) {
    const mine = new Set(allFiles(t));
    let idx = 0;
    for (const prev of tasks) {
      if (prev === t) break;
      if (allFiles(prev).some((f) => mine.has(f))) idx = Math.max(idx, waveOf.get(prev.n) + 1);
    }
    waveOf.set(t.n, idx);
    (waves[idx] ||= []).push(t.n);
  }
  return waves;
}

export function toArgs(parsed) {
  return { constraints: parsed.constraints, tasks: parsed.tasks, waves: deriveWaves(parsed.tasks) };
}

// Windows-safe main-module check.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: node scripts/plan-waves.mjs <plan.md>   (prints execute-plan args JSON)');
    process.exit(2);
  }
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (e) {
    console.error(`plan-waves: UNEVALUABLE - cannot read ${file}: ${e.message}`);
    process.exit(2);
  }
  const parsed = parsePlan(text);
  const problems = validatePlan(parsed);
  if (problems.length) {
    for (const p of problems) console.error(`plan-waves: UNEVALUABLE - ${p}`);
    console.error('A plan that fails writing-plans\' no-placeholder rule is not executed on a guess. Exit 2.');
    process.exit(2);
  }
  process.stdout.write(JSON.stringify(toArgs(parsed), null, 1) + '\n');
}
