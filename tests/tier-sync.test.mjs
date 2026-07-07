import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findTierSyncViolations, parseFrontmatter } from '../scripts/check-tier-sync.mjs';

const CONFIG = {
  judgment: 'model-j',
  cheap: 'model-c',
  tier_agents: { canon: 'judgment', 'canon-fast': 'cheap' },
  synced_bodies: [['canon', 'canon-fast']],
};

const agentFile = (name, model, body, extra = '') =>
  ({ name, text: `---\nname: ${name}\nmodel: ${model}\n${extra}status: provisional\n---\n${body}` });

const BODY = '\nYou are a skeptic. Break the claim.\n';

test('synced frontmatter and identical bodies are clean', () => {
  const agents = [
    agentFile('canon', 'model-j', BODY),
    agentFile('canon-fast', 'model-c', BODY, 'provenance: copy of canon\n'),
  ];
  assert.deepEqual(findTierSyncViolations(agents, CONFIG), []);
});

test('seed: frontmatter model drifted from config is flagged', () => {
  const agents = [
    agentFile('canon', 'model-old', BODY),
    agentFile('canon-fast', 'model-c', BODY),
  ];
  const bad = findTierSyncViolations(agents, CONFIG);
  assert.equal(bad.length, 1);
  assert.equal(bad[0].agent, 'canon');
  assert.match(bad[0].reason, /"model-old" != config judgment tier "model-j"/);
});

test('seed: variant body diverged from canonical is flagged', () => {
  const agents = [
    agentFile('canon', 'model-j', BODY),
    agentFile('canon-fast', 'model-c', BODY + 'An extra line snuck in.\n'),
  ];
  const bad = findTierSyncViolations(agents, CONFIG);
  assert.equal(bad.length, 1);
  assert.equal(bad[0].agent, 'canon-fast');
  assert.match(bad[0].reason, /body diverged from canonical canon/);
});

test('seed: an agent listed in tier_agents but missing is flagged', () => {
  const agents = [agentFile('canon', 'model-j', BODY)];
  const bad = findTierSyncViolations(agents, CONFIG);
  assert.equal(bad.length, 2); // missing from tier_agents AND incomplete synced pair
  assert.match(bad[0].reason, /agent file missing/);
  assert.match(bad[1].reason, /pair incomplete/);
});

test('seed: a file with no frontmatter block is flagged, not crashed on', () => {
  const agents = [
    { name: 'canon', text: 'no frontmatter here' },
    agentFile('canon-fast', 'model-c', BODY),
  ];
  const bad = findTierSyncViolations(agents, CONFIG);
  assert.ok(bad.some((b) => b.agent === 'canon' && /no frontmatter block/.test(b.reason)));
});

test('a tier with no model string in config fails closed', () => {
  const agents = [
    agentFile('canon', 'model-j', BODY),
    agentFile('canon-fast', 'model-c', BODY),
  ];
  const bad = findTierSyncViolations(agents, { ...CONFIG, cheap: undefined });
  assert.ok(bad.some((b) => /tier "cheap" has no model string/.test(b.reason)));
});

test('CRLF line endings do not defeat the body comparison', () => {
  const agents = [
    agentFile('canon', 'model-j', BODY),
    { name: 'canon-fast', text: `---\nname: canon-fast\nmodel: model-c\nstatus: provisional\n---\n${BODY}`.replace(/\n/g, '\r\n') },
  ];
  assert.deepEqual(findTierSyncViolations(agents, CONFIG), []);
});

test('parseFrontmatter splits keys on the first colon only', () => {
  const { frontmatter, body } = parseFrontmatter('---\ndescription: a: b: c\n---\nbody');
  assert.equal(frontmatter.description, 'a: b: c');
  assert.equal(body, 'body');
});
