import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveSupersession } from './check-runlog.mjs';

/**
 * Three-outcome gate over a harvest record (ADR-0014): exit 0 clean / 1 violations /
 * 2 unevaluable. A harvest record says what a past session's transcript SHOWED and
 * what re-running the control TODAY produced.
 *
 * The rule this gate exists to enforce, mechanically rather than in prose:
 *
 *   A transcript is a LEAD. Credit comes only from a re-run.
 *
 * so `credited: true` without `reverified_at` + the re-run command + its observed exit
 * is a violation, not a style problem. That is what keeps harvesting old sessions from
 * being a backfill of the ledger AGENTS.md forbids: every credited row is a claim about
 * something that was executed now, with the transcript as a pointer to where to look.
 *
 * A `domain` credit additionally requires `domain_eligible: true` - exercising a
 * component against rigor's own files is USE, not an independent domain (FEEDBACK.md).
 *
 * HONEST LIMIT: form only. This gate cannot tell whether a re-run actually exercised
 * what it claims to, or whether a verdict is the right reading of the evidence. It
 * checks that the evidence is present and of the right shape - a floor, never a verdict.
 */

const VERDICTS = new Set(['helped', 'misfired', 'silently-skipped', 'not-applicable', 'unevaluable']);
const CREDIT_KINDS = new Set(['domain', 'use']);

/**
 * A re-verification must be READ-ONLY. Contract gap logged 2026-07-22: a mutating
 * `--yes` re-verify line was executed by a verification agent. A gate that hands an
 * agent a destructive command to run is a defect generator.
 */
const MUTATING_RE = /\b(git\s+(commit|push|reset|rebase|checkout|merge|tag|branch\s+-[dDmM])|rm\s+-rf|kubectl\s+(apply|delete)|helm\s+(install|upgrade|uninstall)|terraform\s+(apply|destroy)|pulumi\s+up|npm\s+publish|gh\s+(pr\s+merge|release\s+create|workflow\s+run))\b/;

export function findHarvestViolations(records) {
  const bad = [];
  const label = (r) => `record ${r?.n ?? '<unnumbered>'}`;

  const { superseded, violations } = resolveSupersession(records, { key: 'n', label, numeric: true });
  bad.push(...violations);

  let prevN = null;
  records.forEach((r, i) => {
    const id = label(r);
    if (superseded.has(i)) return;

    for (const f of ['harvest', 'control', 'verdict']) {
      if (typeof r?.[f] !== 'string' || r[f].trim() === '') bad.push({ entry: id, reason: `missing ${f}` });
    }
    if (!Number.isInteger(r?.n) || r.n < 1) bad.push({ entry: id, reason: 'n must be a positive integer' });

    if (typeof r?.verdict === 'string' && !VERDICTS.has(r.verdict)) {
      bad.push({ entry: id, reason: `verdict "${r.verdict}" is not one of: ${[...VERDICTS].join(', ')}` });
    }

    // The lead: where in which transcript this came from. A record with no locatable
    // lead is an assertion, and assertions are what this whole mechanism refuses.
    const lead = r?.lead;
    if (!lead || typeof lead !== 'object') {
      bad.push({ entry: id, reason: 'missing lead - a harvest record must point at the transcript it came from' });
    } else {
      if (typeof lead.session !== 'string' || lead.session.trim() === '') bad.push({ entry: id, reason: 'lead.session missing' });
      if (!Number.isInteger(lead.line) || lead.line < 0) bad.push({ entry: id, reason: 'lead.line must be a non-negative integer' });
    }

    if (typeof r?.domain_eligible !== 'boolean') bad.push({ entry: id, reason: 'domain_eligible must be a boolean' });

    // ---- the leads-only rule ----
    if (r?.credited === true) {
      if (r.verdict === 'unevaluable') {
        bad.push({ entry: id, reason: 'an unevaluable record cannot be credited - that is the point of the third outcome' });
      }
      if (!CREDIT_KINDS.has(r?.credit_kind)) {
        bad.push({ entry: id, reason: `credited records need credit_kind: ${[...CREDIT_KINDS].join(' | ')}` });
      }
      if (r?.credit_kind === 'domain' && r?.domain_eligible !== true) {
        bad.push({ entry: id, reason: 'credit_kind "domain" on a record that is not domain-eligible - use on rigor itself is use, not a domain' });
      }
      const at = r?.reverified_at;
      if (typeof at !== 'string' || Number.isNaN(Date.parse(at))) {
        bad.push({ entry: id, reason: 'credited without a parseable reverified_at - a transcript is a lead, credit comes from a re-run' });
      } else if (r?.lead?.ts && Date.parse(at) < Date.parse(r.lead.ts)) {
        bad.push({ entry: id, reason: 'reverified_at precedes the lead it re-verifies - the re-run must happen after the session it is checking' });
      }
      const rv = r?.reverify;
      if (!rv || typeof rv !== 'object') {
        bad.push({ entry: id, reason: 'credited without reverify{command,exit} - the re-run IS the evidence' });
      } else {
        if (typeof rv.command !== 'string' || rv.command.trim() === '') bad.push({ entry: id, reason: 'reverify.command missing' });
        else if (MUTATING_RE.test(rv.command)) bad.push({ entry: id, reason: `reverify.command is not read-only: ${rv.command}` });
        if (!Number.isInteger(rv.exit)) bad.push({ entry: id, reason: 'reverify.exit must be the integer exit code actually observed' });
      }
    } else if (r?.credited !== false) {
      bad.push({ entry: id, reason: 'credited must be an explicit boolean - an omitted credit is an ambiguous one' });
    }

    if (Number.isInteger(r?.n) && r?.supersedes === undefined) {
      if (prevN !== null && r.n !== prevN + 1) {
        bad.push({ entry: id, reason: `n ${r.n} follows ${prevN} - numbering must be +1 monotonic, append-only` });
      }
      prevN = r.n;
    }
  });

  return bad;
}

/** Parse a harvest record file: JSONL, one record per non-empty line. */
export function parseHarvest(text) {
  return text.split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l));
}

/** True when nothing in the file could be judged - the halt case, not a pass. */
export function allUnevaluable(records) {
  return records.length > 0 && records.every((r) => r?.verdict === 'unevaluable');
}

// Windows-safe main-module check.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: check-harvest.mjs <harvest.jsonl>');
    process.exit(1);
  }
  let records;
  try {
    records = parseHarvest(readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`HARVEST UNEVALUABLE: cannot read ${file}: ${e.message}`);
    process.exit(2);
  }
  if (records.length === 0) {
    console.error(`HARVEST VACUOUS: ${file} holds no records - an empty file and a clean file are not the same thing.`);
    process.exit(2);
  }
  const bad = findHarvestViolations(records);
  if (bad.length) {
    for (const b of bad) console.error(`HARVEST FAIL ${b.entry}: ${b.reason}`);
    console.error('Fix: a transcript is a lead; credit needs reverified_at + the read-only re-run command + its observed exit. A domain credit needs domain_eligible.');
    process.exit(1);
  }
  if (allUnevaluable(records)) {
    console.error(`HARVEST UNEVALUABLE: all ${records.length} records are unevaluable - nothing here can move a status.`);
    process.exit(2);
  }
  const credited = records.filter((r) => r.credited === true).length;
  console.log(`harvest: clean (${records.length} record${records.length === 1 ? '' : 's'}, ${credited} credited)`);
}
