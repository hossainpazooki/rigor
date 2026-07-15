ts: 2026-07-15T15:19:11Z
commit: ae2c042
session: 495274ae-4189-4c09-b42d-8027685f9f5b (rigor-loop-engineering)
status: verified

fact: `scripts/check-fanout.mjs` — the executable gate over a multi-agent fan-out workflow script —
checks for a shared contract constant, a `schema:` on every `agent()` call, an integration step,
and a verify phase. It contains **no check at all** for whether a build-stage `agent()` call
carries a `model:` or `agentType:` tier pin. `orchestrate` guardrail #11 and `fanout-build` step 4
both state builders must run on the build tier, but nothing in the shipped surface verifies a given
script actually does — a fan-out with zero tier pins on any of its `agent()` calls passes this gate
identically to one that pins every builder correctly. This is the concrete gap ADR-0006 ("Silent
tier collapse") proposes to close.

basis:
```
$ git rev-parse HEAD
ae2c042e2c89edecaa761920e1128d48a3658264
$ grep -n "agentType\|model:" scripts/check-fanout.mjs
(no output — no match)
```

re-verify: `grep -n "agentType\|model:" scripts/check-fanout.mjs` should keep returning no match
until ADR-0006 resolution 1 ships; once it does, this entry is superseded (not edited) by one
recording the new warning class exists and was verified non-vacuous (red on a deliberately
unpinned script).
