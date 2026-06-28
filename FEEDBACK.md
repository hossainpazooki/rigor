# Feedback log (provisional → settled)

Each entry records a time a rigor component **helped** or **misfired**, and in
**what domain**. A component is promoted from `provisional` to `settled` after it
survives **≥2 independent domains** here. "Independent" means a different repo /
problem domain — exercising a component against rigor's own files counts as use,
but not as an independent domain.

Format: `<date> · <component> · <helped|misfired> · <domain> · <one-line note>`

## Promotion ledger

| Component | Independent domains survived | Status |
|---|---|---|
| `refute` | 2 (payments/regulatory, credit-risk ML) | **settled** — demonstrated for numeric provenance + citation fidelity; reach over semantic/design/omission defects **unproven** (see 2026-06-27) |
| `implemented-vs-planned` | 1 (point-in-time lakehouse — VANTAGE) | provisional — first independent domain; final summary flagged the `main()` stub + CI-defined-not-run + Databricks-configured-not-deployed without overclaim (see 2026-06-28) |
| `fanout-recon-synthesize` | 0 (1 same-repo exercise) | provisional — inherits `refute`'s numeric/string reach by construction; has independently caught nothing (see 2026-06-27) |
| `gate-discipline` | 0 | provisional |
| `verify-the-effect` | 1 strong (digital-asset API decoder) + 1 convergent detector (CLUE) + 1 convergent builder (VANTAGE) — all same-author, no live end-to-end probe | provisional — short of `refute`'s standard until a live end-to-end probe (see 2026-06-27, 2026-06-28) |
| `effect-prober` | 0 (authored 2026-06-27) | provisional |
| `check-effect-probe` | 0 (exercised on the 2 catches above, same session) | provisional |
| `skeptic-verifier` | 2 (payments/regulatory, credit-risk ML) | **settled** — every prior logged win was a numeric recompute (same scope caveat as `refute`); VANTAGE (2026-06-28) is a **misfire** — default-refute skeptics returned 2/4 false refutations, caught only by orchestrator re-run |
| `integration-runner` | 1 (point-in-time lakehouse — VANTAGE) | provisional — ran the real `sbt` gate to green and fixed 5 cross-file drifts without weakening any assertion (see 2026-06-28) |
| `orchestrate` | 1 (point-in-time lakehouse — VANTAGE) | provisional — guardrail #8 (re-run ≥1 load-bearing check yourself) caught 2 false refutations the fan-out missed (see 2026-06-28) |
| `/verify-claim`, `/honesty-check`, `/recon`, `/handoff`, `/fanout`, `/verify-effect` | 0 | provisional |
| `git-guard`, `session-start` | 0 | provisional |
| `fanout-build` | 1 (point-in-time lakehouse — VANTAGE) | provisional — first independent domain, end-to-end; orchestrator-as-skeptic caught 2 false refutations from its own verify stage (see 2026-06-28) |
| `check-fanout` | 0 | provisional |
| `check-citation-fidelity` | 0 | provisional — verified for identifier/quote fidelity; **insufficient for numeric provenance** (see 2026-06-26 misfire) |

## Entries

- 2026-06-25 · `fanout-recon-synthesize` · helped · rigor's own Phase-1 spine
  (self-audit) · ran end-to-end — 5 disjoint recon dimensions fanned out under one
  shared findings schema, each finding refuted by an independent `skeptic-verifier`,
  survivors synthesized. Proves the loop executes; **n=1 and same-repo**, so still
  provisional until it survives an independent domain.

- 2026-06-26 · `refute` · helped · payments/regulatory compliance (ATLAS
  regulatory-rule-engine) · ran the refute spine by hand against a payments-compliance
  brief, in a domain INDEPENDENT of rigor's own repo. Recompute + dispatch caught a
  fabricated citation and several regulatory overstatements before they were written
  down. **First independent domain** for `refute` (n=1 outside rigor's own files).

- 2026-06-26 · `skeptic-verifier` · helped · payments/regulatory compliance (ATLAS
  regulatory-rule-engine) · skeptics dispatched by that same refute pass refuted the
  regulatory overstatements — load-bearing for refute's dispatch move. **First
  independent domain** for `skeptic-verifier`.

- 2026-06-26 · `refute` · misfired (by omission) · payments/regulatory compliance
  (ATLAS regulatory-rule-engine) · the same pass surfaced two gaps now being fixed.
  **GAP 1 (citation fidelity):** no move caught a claim citing a source that does not
  actually contain the named identifier/quote — a fabricated or drifted citation slips
  through unless someone reads the source by hand. **GAP 2 (dispatch ≠ discharge):**
  refute's dispatch move read as if spawning skeptics discharges the duty, yet the
  fabricated citation was caught only by the orchestrator's own direct read of the
  source — the fan-out of skeptics collectively missed it. Fixes: new 4th move
  **Check citation fidelity** + `scripts/check-citation-fidelity.mjs`, and a
  dispatch-move cross-link to `orchestrate` guardrail #8 (independently re-execute at
  least one load-bearing check yourself).

- 2026-06-26 · `refute` · helped · credit-risk ML / causal inference
  (closed-loop-default-detection) · ran the full spine against the CLDD repo, a domain
  independent of both rigor's own files and the ATLAS regulatory work. Re-executed the
  gate (`pytest` → **90 passed / 0 failed**, byte-determinism confirmed in-process) and
  recomputed numbers from raw artifact CSVs. Caught two load-bearing defects in
  `SESSION_HANDOFF.md`: (a) the §7 g-computation numbers attributed to "Measured (seed
  42)" — `0.0734→0.0598 (+0.0135)` / `+0.0038` — reproduce from nothing; the raw
  `seed_sweep_25.csv` seed-42 rows are `0.0714→0.0635 (+0.0079)` / `+0.0017`, and the
  `+0.0135` is the 25-seed cross-seed mean mislabeled as a single seed; (b) the test
  count "66" is stale (suite is 90; README already says 90). **Second independent
  domain** for `refute`.

- 2026-06-26 · `skeptic-verifier` · helped · credit-risk ML / causal inference
  (closed-loop-default-detection) · the dispatched skeptic recomputed CL1–CL5 from the
  artifact CSVs and live `src/` runs, returned CL2 REFUTED with the exact seed-42 vs
  cross-seed-mean discrepancy (independently re-confirmed by the orchestrator from the
  raw CSV before being written here — `orchestrate` #8 in action), plus a "shrinks toward
  noise" overstatement (p=1.4e-4 at sev 1.0 is still significant). **Second independent
  domain** for `skeptic-verifier`.

- 2026-06-26 · `check-citation-fidelity` (refute move 4) · misfired (insufficient depth) ·
  credit-risk ML / causal inference (closed-loop-default-detection) · root-causing the CLDD
  §7 defect showed the move-4 check would NOT have caught it. The error was a **numeric
  provenance** failure — a 25-seed cross-seed mean (0.0134) mislabeled as a single "seed 42"
  measurement, plus level numbers (`0.0734/0.0598`) sourced from nothing. The check is a
  **string-substring matcher**: brittle to rounding (`0.0734` is a substring of `0.073412…`)
  and it verifies "string appears in *a* source," not "this number equals the output of the
  *specific* computation it is attributed to." What actually caught it was move 1 (recompute).
  Citation-fidelity is right for identifiers/section-refs/quotes, **insufficient for numbers**.
  Candidate fix: a numeric-provenance check — `(claimed_value, source_csv, column, row-filter)
  → assert match within tolerance` — the move-1 mechanization the substring check is not.

- 2026-06-26 · `refute` (enforcement) · misfired (by omission) · credit-risk ML / causal
  inference (closed-loop-default-detection) · the wrong §7 numbers landed in a "RESOLVED"
  status doc **un-refuted** and sat there until rigor was manually aimed at the repo — rigor
  caught them as a *detector* but never as a *preventer*. Nothing gates "a number in a
  published status doc must carry a reproducible source." **Same root as `check-fanout` #7**
  (a check that depends on someone *remembering* to run it gets skipped under momentum) — now
  the recurring theme across three instances (skipped #7 pre-flight; §7 authored un-refuted;
  stale `66` count). The structural insufficiency is enforcement: rigor's load-bearing checks
  are opt-in, not triggered.

- 2026-06-26 · `verify-the-effect` · authored (not yet exercised) · derived from mining
  three deploy/release repos (a k8s+Terraform infra repo, a FastAPI app repo, and an
  ML reproducibility repo). Three convergent disciplines grounded the skill: (1) an
  action's success report ≠ its effect — all three close a transition with a probe of
  the live state (health-gate + auto-rollback; a layered post-deploy smoke script; a
  transfer-validation + verdict/evidence cross-check), not the apply log; (2) the
  shipped artifact is pinned and immutable end-to-end (immutable registry tags,
  commit/digest-addressed images, pinned base images + a seeded PRNG); (3) "validated"
  is labeled by what it was validated against (self-consistent vs. independent oracle).
  **Honesty caveat:** the three repos share one author in adjacent domains, so the
  convergence is real but *correlated, not independent* — closer to one engineer's
  consistent habit observed thrice than three teams discovering the same law. Author
  status only; **0 independent domains** until it runs against a repo it did not come
  from. The skill composes `refute` (probe, don't trust the report), `gate-discipline`
  (ordered gates, re-run not remembered), and `implemented-vs-planned` (the
  validated-against axis).

- 2026-06-27 · `refute` / `skeptic-verifier` / `fanout-recon-synthesize` · scope
  limitation (audit of this log) · meta / rigor's own ledger · An audit of every
  logged independent-domain win shows the spine's **demonstrated** reach is narrow:
  each catch bottoms out in one of two mechanizable checks — **recompute a number**
  (numeric provenance) or **match a string to its cited source** (citation
  fidelity). Concretely: ATLAS (payments/regulatory) = a fabricated citation +
  number-anchored overstatements; CLDD (credit-risk ML) = §7 numbers that reproduce
  from nothing + a stale `66` test count + the CL2 seed-42-vs-cross-seed-mean
  discrepancy. **Not one logged catch** is a pure semantic/logic error (numbers
  right, reasoning wrong), a design/architecture error, a "present but does the
  wrong thing," or a genuine omission. **Structural reason:** 3 of `refute`'s 4
  moves reduce to recompute-a-number or grep-a-string (move 1 recompute; move 2
  re-run the gate → stale/failing; move 4 citation fidelity); move 3 (dispatch
  skeptics) is broad in principle, but every logged skeptic win was *itself* a
  numeric recompute. The architecture is biased toward exactly the two failure
  classes it has caught — so the gap between rigor's **claimed** scope ("refute any
  load-bearing claim"; "decompose any question") and its **demonstrated** scope
  (numeric provenance + citation/string fidelity) is real and currently invisible in
  the README. `/recon` (`fanout-recon-synthesize`) is the sharpest case: **zero**
  independent-domain exercises — its one run was same-repo (the self-audit) — so it
  inherits `refute`'s profile by construction (its verify step *is* `refute`) yet has
  independently caught nothing. Same root applies to this session's
  `verify-the-effect`: its central move (probe the *effect* — behavior past
  numbers-and-strings) is precisely the capability with the least evidence, so that
  move is **aspirational, not demonstrated**. Closing it needs: (a) the
  numeric-provenance mechanization already planned (commit `af09650`); (b) ≥1
  independent-domain `/recon` run that catches a non-numeric defect (semantic or
  omission); (c) honest scope language — state in the README/skills that `refute` is
  demonstrated for numeric provenance + citation fidelity and **provisional over
  semantic/design/omission defects**.

- 2026-06-27 · `verify-the-effect` / `effect-prober` / `check-effect-probe` ·
  helped · institutional digital-asset platform API (decoder service) · **First
  catch — independent domain #1, and a non-numeric/non-string defect** (exactly the
  class the 2026-06-27 scope entry flagged as unproven). The LLM decoder reports a
  healthy, configured deploy — `get_health()` (`src/decoder/llm_service.py:121-129`)
  returns `status: healthy, anthropic_configured: true, available_tiers: [anchored,
  guided, exploratory]` when a key is set — yet `explain()` (`llm_service.py:28-88`)
  returns a hardcoded stub ("This is a stub explanation … available once the
  Anthropic API key is configured") on **every** call, with no code path that
  references `has_api_key` or any client. The *report* (healthy + configured) is
  true while the *effect* (a real explanation) is absent. The spine's numeric/citation
  moves slide right over it: `confidence: 0.85` is a real number and the citations
  resolve to real input fields — every number and string checks out while the
  behavior is a stub. Caught by a complete static read of `explain()` (exhaustive
  over inputs) + the verify-the-effect content probe (`'stub' not in explanation` →
  **EFFECT-REFUTED**); `check-effect-probe.mjs` flagged the as-deployed
  `/decoder/health` probe as *vacuous* (no control separating stub from real). Note:
  **stronger than the original mining summary**, which said "returns stub when no key
  set" — the raw source shows it returns the stub *even with a key configured*.
  Confirmed from source, not the subagent summary. Caveat: static + record-level, not
  a live end-to-end probe against a running deploy.

- 2026-06-27 · `verify-the-effect` / `check-effect-probe` · helped · genomics
  label-error ML (CLUE) · **Independent domain #2 — a different action type
  (model/eval rollout, not a service deploy).** The IMPROVE step
  `tune_decision_threshold()` (`clue/loop.py:88-112`) picks the threshold that
  maximises F1 **and reports that maximum on the very cohort it tuned on** — an
  in-sample number that took selection on the data it is then scored against (the
  repo's own documented gap #2). The non-vacuity move classifies that reported F1 as
  a *vacuous-probe* result: it cannot discriminate generalization from in-sample fit.
  The discriminating control already exists in the repo — `select_threshold_holdout()`
  (`loop.py:115-144`) applies a threshold chosen on a disjoint `tune_cohort` to a
  held-out `measure_cohort`; `check-effect-probe.mjs` **credits** that record (probe
  passed, control failed) and flags the in-sample one. Honest framing — convergence,
  not novel discovery: CLUE independently arrived at the same negative-control
  discipline and even labels the residual *shared-generator-structure* optimism as
  gap #1 (the oracle-gap — move 6). An independent methodology landing on a known real
  defect validates the lens; it does not get full credit for finding it. Confirmed
  from `loop.py` source.

- 2026-06-28 · `fanout-build` · helped · point-in-time SEC fundamentals lakehouse
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

- 2026-06-28 · `skeptic-verifier` · misfired (false refutation) · point-in-time SEC
  fundamentals lakehouse (VANTAGE) · the verify-stage skeptics, prompted "default to refuted
  unless positively proven," refuted **all four** claims — but **two were false**
  (`permutation-silver`, §7 non-vacuity), caught only when the orchestrator re-ran the probes
  itself. A default-refute skeptic biases toward false positives, so its verdict is a lead to
  re-run, never a discharge — the same `dispatch ≠ discharge` theme as 2026-06-26 ATLAS GAP 2,
  now reconfirmed in a third domain. The harness encoded the right guardrail in its own return
  value (`note: gateGreen/refutals are self-reports; orchestrator must independently re-run`),
  and that re-run is what corrected the record. Net: the fan-out + orchestrator loop got the
  right answer; the skeptic agents alone did not.

- 2026-06-28 · `implemented-vs-planned` · helped · point-in-time SEC fundamentals lakehouse
  (VANTAGE) · **First independent domain.** The build's final summary held the
  implemented-vs-validated boundary without prompting: `Pipeline.main` named as a `println`
  stub ("the engine is tested" vs "you can point it at `2023q2` and get a gold table" — the
  TSV read path was never built, the plan's Open Item #1); CI workflow "*defined*, exact
  sequence verified green locally, **not** yet run on GitHub Actions — don't claim a passing
  badge"; Databricks bundle "*configured*, **not** deployed/validated — verb is
  'ships/configures,' not 'deployed'." No aspirational work presented as built. Verified
  against transcript L924/L934 and the committed tree (`main()` is a stub in `Pipeline.scala`;
  `runFromFrames` is the real, tested path).

- 2026-06-28 · `verify-the-effect` · convergent support (not independent-detector) ·
  point-in-time SEC fundamentals lakehouse (VANTAGE) · the build practiced the skill's central
  **non-vacuity / negative-control** move as a *builder*, not as a lens aimed at foreign code:
  the §7 no-lookahead test is proven non-vacuous by bug-injection (inject the leak -> test goes
  red), and the §6 gate's missing-col precondition is the control that separates `Unevaluable`
  (effect-absent) from a vacuous `Pass`. A third independent domain independently landing on
  negative-control discipline strengthens the lens — but, as with CLUE (2026-06-27), this is
  **convergence, not a novel catch**, and same-operator. Does **not** advance the
  independent-detector count; the live end-to-end gap from 2026-06-27 stays open.
