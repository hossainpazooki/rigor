# 2026-09-29 - plan-waves puts a task beside the task whose file it imports

ts: 2026-09-29T22:40:48Z
commit: f710402
session: aae428e0-da70-4149-a7b2-c538ab5bbe38
status: verified
fact: plan-waves derives waves from the Files lists alone. A task that imports a file another task creates, and shares no file with it, lands in the same wave, where its tests fail on a missing module. The execute-plan skill says so under its honest limits. The header of plan-waves and step 1 of the same skill both still say the derivation is never looser than one that reads imports. For the tier-aliases plan the derived first wave held the task that creates `scripts/model-id.mjs` and the task whose script imports it. The plan was run with one task per wave, passed explicitly.
basis: at 2026-09-29T22:40:48Z at f710402, `grep -n "never looser" scripts/plan-waves.mjs skills/execute-plan/SKILL.md` -> plan-waves.mjs:19 and SKILL.md:24. `node scripts/plan-waves.mjs docs/plans/2026-09-29-tier-aliases-plan.md` -> waves `[[1,2,3,5,6,7,8],[4,10],[9,12],[11]]` (the plan file is untracked at this commit). Task 2 creates scripts/model-id.mjs; Task 5 creates scripts/tier-lock.mjs, whose lines 4 and 5 import from ./model-id.mjs and ./check-dispatch.mjs.
re-verify: grep -n "never looser" scripts/plan-waves.mjs skills/execute-plan/SKILL.md
