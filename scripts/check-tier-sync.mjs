import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Tier-sync gate (judgment-dispatch). Model strings live in exactly two places —
 * agent frontmatter and config/models.json — and this gate verifies the two agree,
 * so model churn is a config edit plus a frontmatter sync, never a prose hunt.
 * It also verifies that tier variants sharing one canonical prompt body (the
 * config.synced_bodies pairs, e.g. skeptic-verifier / skeptic-verifier-fast) are
 * byte-identical below the frontmatter — divergence between the bodies is a defect.
 *
 * agents: [{ name, text }] — raw .md file contents; no fs in the matchers, the
 * caller loads files and config at the CLI boundary.
 * config: config/models.json shape (tier_agents, synced_bodies, plus the tier→model keys).
 */
export function parseFrontmatter(text) {
  const normalized = text.replace(/\r\n/g, '\n');
  const m = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { frontmatter: null, body: normalized };
  const frontmatter = {};
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) frontmatter[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { frontmatter, body: m[2] };
}

export function findTierSyncViolations(agents, config) {
  const bad = [];
  const byName = new Map(agents.map((a) => [a.name, parseFrontmatter(a.text)]));

  for (const [name, tier] of Object.entries(config.tier_agents ?? {})) {
    const parsed = byName.get(name);
    if (!parsed) {
      bad.push({ agent: name, reason: 'agent file missing — listed in tier_agents but not found' });
      continue;
    }
    if (!parsed.frontmatter) {
      bad.push({ agent: name, reason: 'no frontmatter block — model pin unreadable' });
      continue;
    }
    const expected = config[tier];
    if (typeof expected !== 'string') {
      bad.push({ agent: name, reason: `tier "${tier}" has no model string in config` });
    } else if (parsed.frontmatter.model !== expected) {
      bad.push({ agent: name, reason: `frontmatter model "${parsed.frontmatter.model}" != config ${tier} tier "${expected}"` });
    }
  }

  for (const [canonical, variant] of config.synced_bodies ?? []) {
    const a = byName.get(canonical);
    const b = byName.get(variant);
    if (!a || !b) {
      bad.push({ agent: `${canonical}/${variant}`, reason: 'synced_bodies pair incomplete — an agent file is missing' });
      continue;
    }
    if (a.body !== b.body) {
      bad.push({ agent: variant, reason: `body diverged from canonical ${canonical} — edit the canonical body and re-copy` });
    }
  }
  return bad;
}

// Windows-safe main-module check.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const here = dirname(fileURLToPath(import.meta.url));
  const agentsDir = process.argv[2] ?? join(here, '../agents');
  const configPath = process.argv[3] ?? join(here, '../config/models.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const names = new Set([...Object.keys(config.tier_agents ?? {}), ...(config.synced_bodies ?? []).flat()]);
  const agents = [];
  for (const name of names) {
    try {
      agents.push({ name, text: readFileSync(join(agentsDir, `${name}.md`), 'utf8') });
    } catch {
      // leave it out; findTierSyncViolations reports it as missing
    }
  }
  const bad = findTierSyncViolations(agents, config);
  if (bad.length) {
    for (const b of bad) console.error(`TIER-SYNC FAIL ${b.agent}: ${b.reason}`);
    console.error('Fix: agent frontmatter and config/models.json must agree, and variant bodies must match their canonical byte-for-byte.');
    process.exit(1);
  }
  console.log(`tier-sync: clean (${names.size} agent${names.size === 1 ? '' : 's'})`);
}
