# 2026-09-22 - execute-plan passed a final wave with zero claims

ts: 2026-09-22T23:36:00Z
commit: e63f0e4
session: 2afcbd5b-e7b9-4d82-bfb2-476e4799e1af
status: verified
fact: on the final wave the example derived its claims from tasks whose `Produces` was not `nothing`. A plan whose tasks all produce `nothing` (intake-valid) yielded zero claims, zero skeptic dispatches, and `claimTrue: true` from `[].every(...)`. The never-fires class the repo names elsewhere: a verification step that cannot fail because it never runs. Fixed: zero claims logs a warning and `claimTrue` is false; pass `args.claims` explicitly.
basis: reviewer packet workflowCase `no-claims` claimTrue=true with zero `verify` calls pre-fix; `missing-vote-control` claimTrue=false as control. Twin `a final wave that derives zero claims is unevaluable, never claimTrue` RED pre-fix (`not ok 12`), green post-fix; packet post-fix `no-claims claimTrue=false`.
re-verify: node --test tests/execute-plan-example.test.mjs
