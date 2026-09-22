# 2026-09-22 - execute-plan trusted the integrator's green flag over its own recorded exit codes

ts: 2026-09-22T23:37:00Z
commit: e63f0e4
session: 2afcbd5b-e7b9-4d82-bfb2-476e4799e1af
status: verified
fact: the wave's integration gate was `if (!integ.green) halt`. INTEG_SCHEMA required per-command `exitCode`, and nothing read it: `{green: true, commands: [{cmd: "node --test", exitCode: 1}]}` emitted the commit block and `claimTrue: true`. The evidence the schema demanded was decorative. The held verify3 script (docs/plans/2026-09-14-closure-ledger-pair.verify3.workflow.mjs, line 69) has the same shape and is not edited, being a point-in-time record; the refreshed round derives. Fixed: green requires the integrator's flag AND at least one recorded run of the named gate whose LAST run exits 0, so an honest red-then-green iteration log stays green and a flag with no gate run does not.
basis: reviewer packet workflowCase `red-command-green-flag` claimTrue=true pre-fix, `red-integration-flag-control` halted=true as control. Twin `green is derived from the recorded gate run, not the integrator's flag` RED pre-fix (`not ok 10`), green post-fix with its two-sided guards (no gate run -> halt; red-then-green -> commit block); packet post-fix `red-command-green-flag halted=true`. The suite's own stub returned `commands: []` with `green: true` and had to change, which is the test modelling the trusting shape.
re-verify: node --test tests/execute-plan-example.test.mjs
