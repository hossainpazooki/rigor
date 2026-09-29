# 2026-09-29 - A model alias is resolved by the harness, and can lag the newest model

ts: 2026-09-29T22:40:51Z
commit: f710402
session: aae428e0-da70-4149-a7b2-c538ab5bbe38
status: verified
fact: Three properties of a family alias are the harness's, not this repository's. An alias can resolve to an older model than the newest available. An alias of the family the session itself runs on resolves to the session's exact model. A model passed on a dispatch takes precedence over the agent's frontmatter. Nothing in this repository checks that an alias points at the newest model; the lock records what answered. On the day of this entry the three aliases in use answered as the newest models of their families, by the agents' own report.
basis: at 2026-09-29T22:40:51Z, `curl` of the harness documentation: model-config.md line 57, "Where an alias resolves to an older model, newer models are available by selecting the full model name explicitly or setting `ANTHROPIC_DEFAULT_OPUS_MODEL` or `ANTHROPIC_DEFAULT_SONNET_MODEL`"; sub-agents.md lines 360-361, "1. The per-invocation `model` parameter / 2. The subagent definition's `model` frontmatter"; line 367, "The main conversation's model belongs to that family: the subagent runs on the main conversation's exact model". Earlier the same day, in the same session, an agent whose frontmatter pinned `claude-fable-5` answered `claude-fable-5-1` when the dispatch passed the `fable` alias and `claude-fable-5` when it passed nothing; and docs/plans/2026-09-29-tier-aliases-spike.verdicts.jsonl (committed in cdd60b4) holds the three alias receipts.
re-verify: curl -sL https://code.claude.com/docs/en/model-config.md | grep -n "Where an alias resolves to an older model"
