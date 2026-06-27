# Feedback log (provisional → settled)

Each entry records a time a rigor component **helped** or **misfired**, and in
**what domain**. A component is promoted from `provisional` to `settled` after it
survives **≥2 independent domains** here. "Independent" means a different repo /
problem domain — exercising a component against rigor's own files counts as use,
but not as an independent domain.

Format: `<date> · <component> · <helped|misfired> · <domain> · <one-line note>`

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

## Promotion ledger

| Component | Independent domains survived | Status |
|---|---|---|
| `refute` | 2 (payments/regulatory, credit-risk ML) | **settled** — demonstrated for numeric provenance + citation fidelity; reach over semantic/design/omission defects **unproven** (see 2026-06-27) |
| `implemented-vs-planned` | 0 | provisional |
| `fanout-recon-synthesize` | 0 (1 same-repo exercise) | provisional — inherits `refute`'s numeric/string reach by construction; has independently caught nothing (see 2026-06-27) |
| `gate-discipline` | 0 | provisional |
| `verify-the-effect` | 1 strong (digital-asset API decoder) + 1 convergent (CLUE eval — re-derives a documented gap); both same-author, static/record-level not live (see 2026-06-27) | provisional — short of `refute`'s standard until a live end-to-end probe |
| `effect-prober` | 0 (authored 2026-06-27) | provisional |
| `check-effect-probe` | 0 (exercised on the 2 catches above, same session) | provisional |
| `skeptic-verifier` | 2 (payments/regulatory, credit-risk ML) | **settled** — every logged win was a numeric recompute; same scope caveat as `refute` (see 2026-06-27) |
| `/verify-claim`, `/honesty-check`, `/recon`, `/handoff`, `/fanout`, `/verify-effect` | 0 | provisional |
| `git-guard`, `session-start` | 0 | provisional |
| `fanout-build` | 0 | provisional |
| `orchestrate` | 0 | provisional |
| `check-fanout` | 0 | provisional |
| `check-citation-fidelity` | 0 | provisional — verified for identifier/quote fidelity; **insufficient for numeric provenance** (see 2026-06-26 misfire) |
