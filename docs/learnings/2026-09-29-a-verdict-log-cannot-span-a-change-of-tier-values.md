# 2026-09-29 - A verdict log cannot span a change of tier values

ts: 2026-09-29T22:40:50Z
commit: f710402
session: aae428e0-da70-4149-a7b2-c538ab5bbe38
status: verified
fact: check-dispatch checks a whole log against one config. When the tier values change during a run of work, the records written before the change read as "unbound tier label" under the new config, and the records written after it read the same way under the old one. A log that holds both cannot be clean under either. The tier-aliases work therefore kept two logs: one for the waves dispatched on exact ids, checked against the config of that time, and one for the waves dispatched on aliases, checked against the alias config and the lock.
basis: at 2026-09-29T22:40:50Z, working tree on f710402 with config/models.json modified and uncommitted (tiers hold aliases): `node scripts/check-dispatch.mjs docs/harvest/2026-09-29-5891a78d-ed0788c7.verdicts.jsonl` -> `DISPATCH FAIL ...: unbound tier label — dispatch_tier judgment names fable in this config but requested claude-fable-5`, exit 1. The same log against `git show HEAD:config/models.json` (judgment `claude-fable-5`) -> `dispatch: clean (6 records)`, exit 0.
re-verify: node scripts/check-dispatch.mjs docs/harvest/2026-09-29-5891a78d-ed0788c7.verdicts.jsonl
