import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DENY = ['ATLAS','COMPASS','ke-workbench','ke-cli','regulatory-rule-engine',
  'MiCA','FCA','Temporal','GENIUS','RWA','postcard','ke-canon'];

export function findFingerprints(text) {
  const hits = new Set();
  for (const tok of DENY) {
    if (new RegExp(`\\b${tok.replace(/[-]/g, '\\-')}\\b`, 'i').test(text)) hits.add(tok);
  }
  return [...hits];
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
}

if (!process.env.NODE_TEST_CONTEXT) {
  const root = process.argv[2] ?? process.cwd();
  let bad = false;
  for (const f of mdFiles(root)) {
    const hits = findFingerprints(readFileSync(f, 'utf8'));
    if (hits.length) { bad = true; console.error(`SURFACE-SCRUB FAIL ${f}: ${hits.join(', ')}`); }
  }
  if (bad) { console.error('Fix: replace project fingerprints with domain-neutral examples.'); process.exit(1); }
  console.log('surface-scrub: clean');
}
