ts: 2026-07-18T22:01:04Z
commit: f22a6a8
session: 0e090857-9de3-4fc5-9b6c-b44b7a2b8ba3 (rigor ADR-0006 build)
status: verified

fact: Setting `agentType:` on a Workflow `agent()` call does **not** by itself pin a tier — the pin
is real only if an explicit `model:` is passed in the call or the named agent's *frontmatter* pins
`model:`. With `model: inherit` (or no model line), an agentType-typed call still collapses onto the
session model. Live specimen: the tic durability build (`wf_5e8bf6e5-9df`, 2026-07-02..06) typed 7
of its 13 agents (`rigor:integration-runner`, `rigor:skeptic-verifier`) and **all 505 assistant
turns across all 13 agent transcripts answered `claude-fable-5`** — because rigor's agent
frontmatter said `model: inherit` until commit `8ba7d8f` (2026-07-07) pinned the tiers. This
refutes the mechanism clause carried into ADR-0006's Context ("a tier pin engages only when the
call explicitly sets `agentType` or `model`") and is why `check-tier-placement.mjs` credits
`agentType:` as a pin only when the agent is tier-mapped in `config/models.json` `tier_agents`
(whose frontmatter agreement `check-tier-sync` enforces). Also: ADR-0006's "Fable-5 throughout"
wording is literally false across *all* tic work — the Jun-30 session's workflows answered
`claude-opus-4-8`, matching *that* session's model, which independently confirms inheritance.

basis:
```
$ cat C:/Users/hossa/.claude/projects/C--Users-hossa-dev/943d1e81-1cb5-4154-8d99-0bae05328514/subagents/workflows/wf_5e8bf6e5-9df/agent-*.jsonl | grep -o '"model":"[^"]*"' | sort | uniq -c
    505 "model":"claude-fable-5"
$ grep -n "agentType" .../workflows/scripts/tic-durability-refactor-wf_5e8bf6e5-9df.js
128: ... agentType: 'rigor:integration-runner' ...
147: ... agentType: 'rigor:skeptic-verifier' ...
$ git show 8ba7d8f~1:agents/skeptic-verifier.md | grep -m2 "model"
model: inherit
```
(Opus finding for the Jun-30 session: skeptic-verifier dispatch this session, session
`ed2842ea` workflows — transcript-local, machine-local pointer.)

re-verify: the transcripts are machine-local; on this box, rerun the `uniq -c` above (expect 505
`claude-fable-5`, zero `claude-sonnet-5`) and `git show 8ba7d8f~1:agents/skeptic-verifier.md |
grep model` (expect `model: inherit`). Portable core: `node --test tests/tier-placement.test.mjs`
covers the rule as the named regression test "agentType alone is NOT a pin".
