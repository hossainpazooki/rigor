import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Pure citation matcher. Each citation pairs an `identifier` (the named rule,
 * section, or quote a claim attributes to a source) with `source` (the TEXT of
 * that cited source). A citation is BROKEN when its identifier is not a literal,
 * case-sensitive substring of the source — the source does not actually say what
 * the claim says it says (a fabricated or drifted citation). No fs in the matcher;
 * the caller loads source text at the CLI boundary via loadSource().
 */
export function findBrokenCitations(citations) {
  return citations.filter(({ identifier, source }) => !source.includes(identifier));
}

/**
 * Read a cited source file as utf8 text, for pairing with an identifier at the
 * CLI boundary. Kept out of the matcher so findBrokenCitations stays pure.
 */
export function loadSource(path) {
  return readFileSync(path, 'utf8');
}

// Windows-safe main-module check.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const claimsFile = process.argv[2];
  if (!claimsFile) {
    console.error('usage: check-citation-fidelity.mjs <claims.json>  # [{identifier, sourcePath}]');
    process.exit(1);
  }
  const claims = JSON.parse(readFileSync(claimsFile, 'utf8'));
  const citations = claims.map(({ identifier, sourcePath }) => ({
    identifier,
    source: loadSource(sourcePath),
    sourcePath,
  }));
  const broken = findBrokenCitations(citations);
  if (broken.length) {
    for (const c of broken) {
      console.error(`CITATION-FIDELITY FAIL ${c.identifier} not found in ${c.sourcePath}`);
    }
    process.exit(1);
  }
  console.log('citation-fidelity: clean');
}
