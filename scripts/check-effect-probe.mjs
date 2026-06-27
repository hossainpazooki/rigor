import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Pure non-vacuity check for effect-probes. An effect-claim is credited only when
 * its probe PASSES against the resulting state AND a paired negative control FAILS
 * against the effect-absent state — proving the probe can tell the effect's
 * presence from its absence. A probe with no control, or one whose control also
 * passes, is VACUOUS: it would pass even if the action had no effect, so it
 * verifies the *report*, not the *effect*.
 *
 * This is the behavioral analogue of recompute-from-source — the same
 * evidence-carrying discipline the numeric-provenance check applies to a number
 * (docs/plans/2026-06-26-numeric-provenance-check.md), applied to a behavior:
 * there, a claimed value must equal its source computation; here, a claimed effect
 * must survive a control its absence would fail. No fs in the matcher; the caller
 * loads records at the CLI boundary.
 *
 * record: { claim, probePassed, controlRan, controlPassed }
 *   probePassed   — did the effect-probe pass against the resulting state?
 *   controlRan    — was a negative control run against the effect-absent state?
 *   controlPassed — did that control pass? (it MUST fail for the probe to discriminate)
 */
export function findVacuousProbes(records) {
  const bad = [];
  for (const r of records) {
    if (r.probePassed !== true) {
      bad.push({ claim: r.claim, reason: 'probe did not pass — effect not demonstrated' });
    } else if (r.controlRan !== true) {
      bad.push({ claim: r.claim, reason: 'no negative control — non-vacuity unproven' });
    } else if (r.controlPassed !== false) {
      bad.push({ claim: r.claim, reason: 'vacuous — probe passes with the effect absent' });
    }
  }
  return bad;
}

// Windows-safe main-module check.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: check-effect-probe.mjs <probes.json>  # [{claim, probePassed, controlRan, controlPassed}]');
    process.exit(1);
  }
  const records = JSON.parse(readFileSync(file, 'utf8'));
  const bad = findVacuousProbes(records);
  if (bad.length) {
    for (const b of bad) console.error(`EFFECT-PROBE FAIL ${b.claim}: ${b.reason}`);
    console.error('Fix: every effect-claim needs a probe that passed AND a negative control that failed.');
    process.exit(1);
  }
  console.log('effect-probe: clean');
}
