# 2026-09-29 - execute-plan reads any command containing the gate text as a run of the gate

ts: 2026-09-29T22:40:45Z
commit: f710402
session: aae428e0-da70-4149-a7b2-c538ab5bbe38
status: verified
fact: execute-plan derives a wave's green from the last recorded command whose text contains the named gate. With the gate `node --test`, a focused run (`node --test tests/x.test.mjs`) and a run in a scratch directory both count. On the first plan this shape ever executed, the integrator ran the full gate (exit 0, 647 passing) and then, as its own falsification, ran one test file against a deliberately wrong parser in a scratch directory (exit 1). The wave halted as "integration not green" and emitted no commit block. The rule was added on 2026-09-22 so that the integrator's flag is not trusted; it refused a good wave. Worked around for later waves by telling the integrator, in the wave's constraints, to record the full gate last and to describe an expected failure in prose. Not fixed, and no closure record has been written.
basis: at 2026-09-29T22:40:45Z at f710402, `grep -n "c.cmd.includes(A.gate)" skills/execute-plan/example.mjs` -> line 189. The persisted record of run wf_70254de9-b44 carries the log `halt: wave 2 integration not green (integrator reported green but the recorded gate runs do not show it) - no commit block emitted` and three commands containing the gate text, in this order: `[0] "node --test"`, `[0] "node --test tests/model-id.test.mjs"`, `[1] "cd <scratchpad>/exec/closer && node --test tests/model-id.test.mjs   # falsification ..."`. The orchestrator re-ran `node --test` after the halt: 647 pass, 0 fail.
re-verify: grep -n "c.cmd.includes(A.gate)" skills/execute-plan/example.mjs
