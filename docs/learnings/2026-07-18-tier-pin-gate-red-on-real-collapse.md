ts: 2026-07-18T22:01:28Z
commit: f22a6a8
session: 0e090857-9de3-4fc5-9b6c-b44b7a2b8ba3 (rigor ADR-0006 build)
status: verified

fact: ADR-0006 resolution 1 is built as a **separate gate** `scripts/check-tier-placement.mjs`
(operator's placement call, 2026-07-18) and verified **non-vacuous against a real collapse, not a
synthetic one**: run on the actual tic durability workflow script — the specimen whose 505/505
Fable-answered turns motivated the ADR — it goes red with exactly the 3 unpinned build-stage
calls (`scaffold`, the wave-1 call, `build-server`) and does not false-positive on the two
agentType-typed calls that are tier-mapped in config. The shipped `fanout-build/example.mjs` was
itself a specimen of the gap (no pins on spike/contract/scaffold/build) and now passes only
because it was fixed: tiers come from `config/models.json` via `args.tiers` (fail-closed halt when
absent), workers return a `model` receipt field, and receipts log `role: "worker"` records that
`check-dispatch.mjs` now lints (silent-collapse class). This closes the gap recorded in
`2026-07-15-check-fanout-has-no-tier-pin-check.md` (superseded, not edited — that entry's fact
about `check-fanout.mjs` itself remains true: the pin check deliberately lives in the new gate).

basis:
```
$ node scripts/check-tier-placement.mjs C:/Users/hossa/.claude/projects/C--Users-hossa-dev/943d1e81-1cb5-4154-8d99-0bae05328514/workflows/scripts/tic-durability-refactor-wf_5e8bf6e5-9df.js
check-tier-placement: 3 warning(s) for ...
  - agent() call 'scaffold' without a tier pin: ...
  - agent() call without a tier pin: ...
  - agent() call 'build-server' without a tier pin: ...
exit: 1
$ node scripts/check-tier-placement.mjs skills/fanout-build/example.mjs
check-tier-placement: every non-verify agent() call carries a tier pin (structure only).
$ node --test   # 125 tests, 125 pass, 0 fail
```

re-verify: `node --test tests/tier-placement.test.mjs` (12 tests incl. the tic regression by
name) and `node scripts/check-tier-placement.mjs skills/fanout-build/example.mjs` (clean). The
red-on-real-artifact rerun needs this box (transcript-local script path in basis).
