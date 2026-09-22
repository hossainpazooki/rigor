# 2026-09-22 - execute-plan let a BLOCKED fix reach the reviewer

ts: 2026-09-22T23:35:00Z
commit: e63f0e4
session: 2afcbd5b-e7b9-4d82-bfb2-476e4799e1af
status: verified
fact: skills/execute-plan/example.mjs checked `status === BLOCKED || NEEDS_CONTEXT` on the first implementer result only (line 133). A fix agent returning BLOCKED (its schema allows it) went straight to the next reviewer; a reviewer that approved the untouched diff let the task complete, the wave integrate, and the commit block emit. Found by the same cross-model review as the check-dispatch entry, simulated. Fixed: the fix result gets the same halt as the implementer, before any reviewer sees it.
basis: reviewer packet workflowCase `blocked-fix` claimTrue=true pre-fix, `initial-blocked-control` halted=true as control. Twin `a fix agent returning BLOCKED halts the task; the reviewer never sees it` RED pre-fix (`not ok 11`, 10 pass / 3 fail in tests/execute-plan-example.test.mjs), green post-fix; packet post-fix `blocked-fix halted=true`.
re-verify: node --test tests/execute-plan-example.test.mjs
