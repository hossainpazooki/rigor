# fanout-build follow-up — second fan-out closes gaps (VANTAGE)

2026-06-28 (follow-up) · `fanout-build` · helped · point-in-time SEC fundamentals
lakehouse (VANTAGE) · **Second fan-out, same domain** — closed the two gaps the first run
honestly flagged: `Pipeline.main` wired to a real `TsvIngest.ingestQuarter` -> `runFromFrames`
end-to-end (no longer a `println` stub), and quarantine writes split to distinct `/rows`
`/detail` `/unevaluable` Delta paths with `Unevaluable` now quarantining before throwing. Two
reinforcing observations for the blueprint: (1) **the discipline held even with no false
alarm** — this run's 3 skeptics all returned `true` (vs the first run's 2 false refutations),
yet the orchestrator STILL re-ran a **clean** (non-incremental) gate rather than trust the
agreement; (2) **tests-as-probes** — `TsvIngestSpec`'s "real read path composes through
runFromFrames to a non-empty gold" fixture test *is* the `main-real` proof and
`PipelineQuarantineSpec` *is* the `quarantine-split` proof, so one clean-green run discharges
all three claims at once (a stronger verification design than run 1). Independently re-verified
this session from committed source (HEAD `3bcc0de`) + 12 test-report XMLs (**29 tests / 0 fail
/ 0 err**, reports newer than source; clean-gate log: `Total tests run: 29`, `EXTEND_GATE_EXIT=0`,
real `vantage` jar). Residual: `main()`'s thin wrapper (SparkSession builder, env var, quarter
`foreach`) is not directly invoked by a test — the *composition* it performs is; §8 gold
no-overlap and same-`accepted` ties remain untested. Same author/operator caveat as run 1.
