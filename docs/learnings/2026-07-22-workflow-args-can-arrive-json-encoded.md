ts: 2026-07-22T18:51:25Z
commit: e78e902
session: 10d1e5e1-afa3-40ab-97bd-6ddbf851cfce (fanout-loop run 4)
status: verified

fact: A Workflow script's `args` global can arrive as a JSON-ENCODED STRING
rather than the object passed in the tool call — `args.tiers` is then
undefined and every tier pin silently vanishes. Scripts in this repo's
orchestrate pattern must parse defensively AND halt-if-unpinned
(`typeof args === 'string' ? JSON.parse(args) : args`, then refuse to run
without a complete tier map) — the halt turns a would-be silent tier collapse
into a recorded refusal. The shipped `skills/fanout-build/example.mjs` halts
on a missing tier map but does NOT yet parse-if-string.

basis:
```
# run-4 workflow, first launch (wf_6b0df83b-dca), failed in 22ms, 0 agents:
Error: undefined is not an object (evaluating 'tiers.build')
# harness recovery hint showed the args value as a string:
#   args: "{\"tiers\": {\"judgment\": \"claude-fable-5\", ...}"
# after adding parse-if-string + halt guard: same runId resumed, 3 agents,
# all receipts on pinned tiers.
(ts above is the nearest captured clock — the failure landed minutes earlier;
error text quoted verbatim from the harness notification)
```

re-verify: grep -n "typeof args === 'string'" C:/Users/hossa/AppData/Local/Temp/claude/C--Users-hossa-dev/10d1e5e1-afa3-40ab-97bd-6ddbf851cfce/scratchpad/run4-adjudication.mjs (scratchpad is session-local; durable copy of the pattern is quoted in docs/feedback/2026-07-22-gate-discipline-rre-adr-0023-lifecycle-closed.md's run record and this entry)
