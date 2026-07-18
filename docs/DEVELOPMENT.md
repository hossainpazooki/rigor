# Development

Build, test, and install reference. (Moved from the README 2026-07-18;
commands unchanged except the gate list, which now includes
`check-tier-placement`.) Repo structure, house style, and invariants live in
[`AGENTS.md`](../AGENTS.md) — the canonical repo brief.

## Tests and gates

No runtime dependencies beyond Node; the suite and all gates are stdlib-only
(`node:test`). Green is the merge floor.

```
node --test                                  # hooks + all 8 check scripts, auto-discovered from tests/
node scripts/check-surface-scrub.mjs         # shipped examples carry no project fingerprints
node scripts/check-citation-fidelity.mjs <claims.json>
node scripts/check-effect-probe.mjs <probes.json>
node scripts/check-fanout.mjs <workflow.mjs>
node scripts/check-tier-placement.mjs <workflow.mjs>   # every non-verify agent() call carries a real tier pin
node scripts/check-dispatch.mjs <verdicts.jsonl>   # verifier dispatches logged, floored, no silent downgrades; worker receipts linted from the same log
node scripts/check-tier-sync.mjs                   # agent frontmatter agrees with config/models.json
node scripts/check-learnings.mjs docs/learnings    # ledger entries anchored, append-only, index↔folder consistent
```

Also in `scripts/` (a utility, not a gate): `extract-tails.mjs` emits a
per-session routing index from local harness transcripts — its output is a
regenerable cache that belongs *outside* any repo.

## Install

This repo is its own local plugin marketplace. In a Claude Code session:

```
/plugin marketplace add <absolute-path-to-this-repo>
/plugin install rigor@rigor
```

Commands are namespaced: `/rigor:verify-claim`, `/rigor:honesty-check`,
`/rigor:recon`, `/rigor:handoff`, `/rigor:pickup`, `/rigor:fanout`,
`/rigor:verify-effect`. Skills and agents auto-activate with the plugin.

For cross-repo availability, register it in `~/.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "rigor": { "source": { "source": "directory", "path": "<absolute-path-to-this-repo>" } }
  },
  "enabledPlugins": { "rigor@rigor": true }
}
```

The `SessionStart` hook delivers the toolkit pointer automatically on current
Claude Code. If your version doesn't surface it, use the manual registration
in [`session-start-setup.md`](session-start-setup.md); the slash commands
work either way.

Operational note: the agent registry is session-start-static — after editing
`agents/`, restart the session before dispatching them.
