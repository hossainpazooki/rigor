import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Pure fingerprint matcher. The denylist is passed in explicitly — the shipped
 * code carries NO project names. The real list lives in a gitignored local file
 * (`surface-scrub.denylist`), loaded by loadDenylist() only at the CLI boundary.
 */
export function findFingerprints(text, denylist) {
  const hits = new Set();
  for (const tok of denylist) {
    // Boundary: a hyphen-extended form (foo-cli-v2) must NOT match foo-cli, but an
    // alphanumeric suffix (foo-cliv2) still flags the base token.
    const escaped = tok.replace(/[-]/g, '\\-');
    if (new RegExp(`(?<![\\w-])${escaped}(?!-)`, 'i').test(text)) hits.add(tok);
  }
  return [...hits];
}

/**
 * Load the denylist from <root>/surface-scrub.denylist (gitignored, never shipped).
 * One token per line; blank lines and `#` comments are ignored. Returns [] if the
 * file is absent — a fresh clone has no project fingerprints baked in.
 */
export function loadDenylist(root) {
  const f = join(root, 'surface-scrub.denylist');
  if (!existsSync(f)) return [];
  return readFileSync(f, 'utf8')
    .split('\n')
    .map((l) => l.replace(/#.*$/, '').trim())
    .filter(Boolean);
}

function* mdFiles(root) {
  const skills = join(root, 'skills');
  if (existsSync(skills)) {
    for (const d of readdirSync(skills)) {
      const f = join(skills, d, 'SKILL.md');
      if (existsSync(f)) yield f;
    }
  }
  const cmds = join(root, 'commands');
  if (existsSync(cmds)) {
    for (const f of readdirSync(cmds)) if (f.endsWith('.md')) yield join(cmds, f);
  }
  const agentsDir = join(root, 'agents');
  if (existsSync(agentsDir)) {
    for (const f of readdirSync(agentsDir)) if (f.endsWith('.md')) yield join(agentsDir, f);
  }
}

// Windows-safe main-module check.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = process.argv[2] ?? process.cwd();
  const denylist = loadDenylist(root);
  if (denylist.length === 0) {
    console.error(
      'surface-scrub: no denylist found (surface-scrub.denylist) — gate is a no-op. ' +
      'Copy surface-scrub.denylist.example to surface-scrub.denylist to enable.'
    );
    console.log('surface-scrub: clean');
  } else {
    let bad = false;
    for (const f of mdFiles(root)) {
      const hits = findFingerprints(readFileSync(f, 'utf8'), denylist);
      if (hits.length) { bad = true; console.error(`SURFACE-SCRUB FAIL ${f}: ${hits.join(', ')}`); }
    }
    if (bad) { console.error('Fix: replace project fingerprints with domain-neutral examples.'); process.exit(1); }
    console.log('surface-scrub: clean');
  }
}
