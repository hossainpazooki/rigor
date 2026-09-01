import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Heuristic structural linter for a multi-agent fan-out workflow SCRIPT.
// HONESTY CAVEAT: checks STRUCTURE (is there a verify phase, an integration step,
// output schemas, a shared contract constant), NOT SEMANTICS. It cannot prove file
// ownership is disjoint, that the contract is correct, or that the claim is true.
// A clean result means "the trustworthy-build scaffolding is present," nothing more.
/**
 * Applicability, separated from cleanliness (2026-09-01). The old CLI folded the
 * two together: any file without parallel(/pipeline( - an empty file, a prose
 * doc, a mistyped path naming a real non-script - printed "scaffolding present"
 * and exited 0, indistinguishable from a genuinely clean fan-out (learnings
 * 2026-08-22-check-fanout-reports-not-applicable-as-passed).
 */
export function isFanoutScript(src) {
  return /\b(parallel|pipeline)\s*\(/.test(src);
}

export function analyzeFanout(src) {
  const warnings = [];
  if (!isFanoutScript(src)) return warnings; // not a fan-out script — nothing to check

  if (!/skeptic-verifier/.test(src) && !/\bphase\(\s*['"`]?verify/i.test(src) && !/\brefute/i.test(src)) {
    warnings.push(
      'no adversarial verify: a fan-out with no skeptic/refute phase trusts a green ' +
      'gate as a true claim (gate-green is not claim-true)'
    );
  }
  if (!/integration-runner/.test(src) && !/\bphase\(\s*['"`]?integrat/i.test(src)) {
    warnings.push('no integration step: nothing runs the real, named gate to green before verification');
  }
  if (/\bagent\s*\(/.test(src) && !/\bschema\s*:/.test(src)) {
    warnings.push('agents without schemas: results are unstructured prose, not mechanically mergeable');
  }
  if (!/\b(CONTRACT|SHARED|CONTRACT_SCHEMA)\b/.test(src)) {
    warnings.push(
      'no shared contract constant: parallel agents have no single source of truth and ' +
      'may drift — declare one and prepend it verbatim to every build prompt'
    );
  }
  return warnings;
}

// Three outcomes (2026-09-01): 0 = a fan-out script analyzed clean, 1 = a fan-out
// script with structural warnings, 2 = nothing here could be evaluated as a
// fan-out (missing/unreadable file, or a file with no fan-out constructs). A
// mistyped path and a clean lint must never look the same.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const file = process.argv[2];
  if (!file) { console.error('usage: node scripts/check-fanout.mjs <workflow-script.(js|mjs)>'); process.exit(2); }
  let src;
  try {
    src = readFileSync(file, 'utf8');
  } catch (e) {
    console.error(`check-fanout: UNEVALUABLE - cannot read ${file}: ${e.message}`);
    process.exit(2);
  }
  if (!isFanoutScript(src)) {
    console.error(
      `check-fanout: NOT APPLICABLE - ${file} contains no parallel()/pipeline() fan-out. ` +
      'Refusing to call this a clean lint: an empty file, a prose doc, and a wrong path all look like this.'
    );
    process.exit(2);
  }
  const warnings = analyzeFanout(src);
  if (warnings.length) {
    console.error(`check-fanout: ${warnings.length} structural warning(s) for ${file}:`);
    for (const w of warnings) console.error('  - ' + w);
    console.error('(Heuristic: structure only. It cannot prove file-disjointness or that the claim is true.)');
    process.exit(1);
  }
  console.log('check-fanout: trustworthy-build scaffolding present (structure only).');
}
