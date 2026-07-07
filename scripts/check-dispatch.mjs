import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Fail-closed lint over a run's verdict log (judgment-dispatch). Stakes are
 * inferred by the orchestrating agent — the same agent whose claims are being
 * checked — so the inference itself must be logged and mechanically checkable,
 * and certain nodes are floored to the judgment tier beyond inference's reach.
 * Four violation classes, per the design (docs/specs/2026-07-05-judgment-dispatch-design.md):
 *
 *   1. fox-and-henhouse — a high-stakes dispatch (inferred_stakes: "high", or any
 *      rubric marker from config.high_stakes_criteria) ran on the cheap tier.
 *   2. floor violation — a node in config.floored_nodes dispatched below judgment tier.
 *   3. unlogged inference — missing dispatch fields; treated as high-stakes, fail-closed.
 *   4. silent downgrade — verifier_model.answered != requested without downgraded: true.
 *
 * record: { node, claim, dispatch_tier, verifier_model: { requested, answered },
 *           inferred_stakes, rubric_criteria_hit, downgraded }
 * config: needs floored_nodes and high_stakes_criteria (config/models.json shape).
 * No fs in the matcher; the caller loads records and config at the CLI boundary.
 */
export function findDispatchViolations(records, config) {
  const floored = config.floored_nodes ?? [];
  const highMarkers = config.high_stakes_criteria ?? [];
  const bad = [];
  for (const r of records) {
    const id = r.claim ?? r.node ?? '<unidentified record>';

    // 3. unlogged inference — fail-closed before anything else is judged.
    const missing = [];
    if (typeof r.node !== 'string') missing.push('node');
    if (r.dispatch_tier !== 'judgment' && r.dispatch_tier !== 'cheap') missing.push('dispatch_tier');
    if (!['low', 'medium', 'high'].includes(r.inferred_stakes)) missing.push('inferred_stakes');
    if (!Array.isArray(r.rubric_criteria_hit)) missing.push('rubric_criteria_hit');
    if (typeof r.verifier_model?.requested !== 'string') missing.push('verifier_model.requested');
    if (typeof r.verifier_model?.answered !== 'string') missing.push('verifier_model.answered');
    if (missing.length) {
      bad.push({ claim: id, reason: `unlogged inference — missing ${missing.join(', ')}; treated as high-stakes, fail-closed` });
      continue;
    }

    // 1. fox-and-henhouse — high stakes (declared or evidenced by markers) on the cheap tier.
    const markersHit = r.rubric_criteria_hit.filter((c) => highMarkers.includes(c));
    if (r.dispatch_tier !== 'judgment' && (r.inferred_stakes === 'high' || markersHit.length)) {
      const why = r.inferred_stakes === 'high' ? 'inferred_stakes: high' : `high-stakes markers hit: ${markersHit.join(', ')}`;
      bad.push({ claim: id, reason: `high-stakes dispatch on the cheap tier (${why})` });
    }

    // 2. floor violation — floors ignore inference entirely.
    if (floored.includes(r.node) && r.dispatch_tier !== 'judgment') {
      bad.push({ claim: id, reason: `floored node ${r.node} dispatched below judgment tier` });
    }

    // 4. silent downgrade — a substitution is a logged downgrade, never a silent one.
    if (r.verifier_model.answered !== r.verifier_model.requested && r.downgraded !== true) {
      bad.push({ claim: id, reason: `silent downgrade — answered ${r.verifier_model.answered} != requested ${r.verifier_model.requested} without downgraded: true` });
    }
  }
  return bad;
}

/** Parse a verdict log: a JSON array, or JSONL (one record per non-empty line). */
export function parseVerdictLog(text) {
  const trimmed = text.trim();
  if (trimmed === '') return [];
  if (trimmed.startsWith('[')) return JSON.parse(trimmed);
  return trimmed.split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l));
}

// Windows-safe main-module check.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: check-dispatch.mjs <verdicts.jsonl|json> [models.json]  # records per judgment-dispatch verdict schema');
    process.exit(1);
  }
  const configPath = process.argv[3] ?? resolve(dirname(fileURLToPath(import.meta.url)), '../config/models.json');
  const records = parseVerdictLog(readFileSync(file, 'utf8'));
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const bad = findDispatchViolations(records, config);
  if (bad.length) {
    for (const b of bad) console.error(`DISPATCH FAIL ${b.claim}: ${b.reason}`);
    console.error('Fix: log the rubric inference on every dispatch, keep floored nodes on the judgment tier, and flag every downgrade.');
    process.exit(1);
  }
  console.log(`dispatch: clean (${records.length} record${records.length === 1 ? '' : 's'})`);
}
