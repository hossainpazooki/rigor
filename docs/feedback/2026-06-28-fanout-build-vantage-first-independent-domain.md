# fanout-build — first independent domain (VANTAGE lakehouse)

2026-06-28 · `fanout-build` · helped · point-in-time SEC fundamentals lakehouse
(VANTAGE — Scala/Spark/Delta, a domain independent of all prior entries) · **First
independent domain** for `fanout-build`, run end-to-end: Spike(halt-gate) -> Contract ->
Scaffold -> Build(7 disjoint-file agents under one shared contract pointer) ->
Integrate(`integration-runner` ran the real `sbt` gate to green) -> Verify(`skeptic-verifier`
refutation). The spike halt-gate fired as designed — one agent proved
`deequ-2.0.7-spark-3.5` + Delta 3.2 + Spark 3.5.1 + sbt-assembly coexist (real exit 0,
216 MB jar, live probe) BEFORE any fan-out, so nothing was built on an unbuildable base.
**Load-bearing payoff = orchestrator as terminal skeptic (`orchestrate` #8):** the verify
stage refuted all four pipeline claims; re-running each prescribed probe by hand showed
**2 of 4 were FALSE refutations** — `permutation-silver` (order-invariant, proven through
the full silver->gold path) and §7 non-vacuity (proven by injecting the lookahead bug and
watching the test go red) — and 1 was a TRUE refutation (`missing-col`: §6 missing≠incomplete
collapses to `Fail` via `castNum` end-to-end), then fixed with a source-level
`requiredColumnsPresent` precondition + a new end-to-end test (23 -> 24 green). Trusting the
fan-out's self-report would have logged 2 non-bugs as real and shipped without the 1 real fix.
Independently verified from committed source + the 10 test-report XMLs (24 tests / 0 fail /
0 err; reports timestamped newer than all committed source). **Author caveat:** same
Claude/rigor operator as the other domains — a second independent *domain*, not a second
independent *author*. **Live-rerun caveat:** evaluator could not re-run `sbt` (JDK-21 box,
build pins Temurin 17); gate confirmation rests on the produced XML + source reads, not a
fresh run.
