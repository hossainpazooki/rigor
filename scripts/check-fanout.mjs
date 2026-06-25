import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Heuristic structural linter for a multi-agent fan-out workflow SCRIPT.
// HONESTY CAVEAT: checks STRUCTURE (is there a verify phase, an integration step,
// output schemas, a shared contract constant), NOT SEMANTICS. It cannot prove file
// ownership is disjoint, that the contract is correct, or that the claim is true.
// A clean result means "the trustworthy-build scaffolding is present," nothing more.
export function analyzeFanout(src) {
  const warnings = [];
  const fansOut = /\b(parallel|pipeline)\s*\(/.test(src);
  if (!fansOut) return warnings; // not a fan-out script — nothing to check

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

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const file = process.argv[2];
  if (!file) { console.error('usage: node scripts/check-fanout.mjs <workflow-script.(js|mjs)>'); process.exit(2); }
  const warnings = analyzeFanout(readFileSync(file, 'utf8'));
  if (warnings.length) {
    console.error(`check-fanout: ${warnings.length} structural warning(s) for ${file}:`);
    for (const w of warnings) console.error('  - ' + w);
    console.error('(Heuristic: structure only. It cannot prove file-disjointness or that the claim is true.)');
    process.exit(1);
  }
  console.log('check-fanout: trustworthy-build scaffolding present (structure only).');
}
