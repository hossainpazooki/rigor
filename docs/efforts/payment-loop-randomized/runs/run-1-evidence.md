# Run 1 evidence — randomized payment loop (2026-08-13)

Driver: `treasury/randomized_loop.py` in `~/dev/treasury-intent-controller` (untracked at
record; commit command emitted to the operator). Every number below was produced by the
orchestrator running the driver directly, not reported by a subagent.

## Shape of the run

Three processes: the real Python scorer (random facts), a fault-injection proxy, the real gate
binary. The driver randomizes facts, spec content (posture, criterion names/thresholds/
volatility, human-judgment entries, thin specs), which specs are revoked and at which point in
the stream, idempotency keys (with deliberate reuse and empty keys), and per-intent injected
faults (503 outage; PASS-at-declaration / FAIL-at-dispatch drift, which is the only way to reach
`volatile-recheck` without a mutable fact source).

Expectations come from `oracle()` — a second implementation of CONTRACT.md §4.2's refusal order
written against the contract, which never reads the gate's response before predicting.

## Seeds (each: 60 intents, driver run by the orchestrator)

| seed | plans sampled | oracle match | classes | ACHIEVED / distinct keys | verifier twins |
|---|---|---|---|---|---|
| 1 | 190 | 60/60 | 13/13 | 8 / 8 | VERIFIED, byte-identical |
| 7 | 3 | 60/60 | 13/13 | 6 / 6 | VERIFIED, byte-identical |
| 42 | 9 | 60/60 | 13/13 | 7 / 7 | VERIFIED, byte-identical |
| 1337 | 36 | 60/60 | 13/13 | 7 / 7 | VERIFIED, byte-identical |

240 intents, 240 oracle agreements, zero mismatches. Artifacts:
`%TEMP%\intent-rnd-<seed>-c60d38a6\run.json`.

The thirteen classes: ACHIEVED, SHADOW_RECORDED, idempotency-collision, policy-denied (criteria
named), unevaluable:unattested-spec, revoked:<ref>, unevaluable:invalid-posture,
unevaluable:empty-criteria, unevaluable:invalid-volatility:<name>,
unevaluable:human-judgment:<name>, unevaluable:<criterion>, volatile-recheck:<name>,
unevaluable:absent-key. A run FAILS if any class is absent.

## Non-vacuity: three planted defects, each red for its own reason

Plants were applied to a COPY of the module (`scratchpad/plantbase`, venv junctioned so the
scorer stayed identical), driven at `--seed 1 --intents 40`, then deleted.

| plant | injected defect | how the driver went red |
|---|---|---|
| A | thin-spec defense deleted (`gate.go` step 1b) | intent 31 expected `FAILED unevaluable:empty-criteria`, got **`ACHIEVED`**; class missing; feed carried 5 ACHIEVED against 4 expected |
| B | idempotency collision check deleted (`store.go` Reserve) | 3 intents expected `FAILED_AT_DISPATCH idempotency-collision`, got `ACHIEVED`; feed carried 7 ACHIEVED over only 4 distinct keys; **the independent verifier twin REFUTED the feed** |
| C | unknown posture silently defaults to enforce (`gate.go` step 1a4) | intent 0 expected `FAILED unevaluable:invalid-posture`, got `FAILED unevaluable:vega` — same terminal, different cause: only a reason-level oracle catches this one |

Plant C is the useful one to remember: a coarse "did it refuse?" check passes a system that
refused for the wrong reason.

## Defect found in the harness itself (fixed in-run)

The first pass keyed the artifact directory by seed alone, so a plant run against a mutated copy
**overwrote the clean run's artifact at the same path**. Caught by re-reading the artifacts
rather than trusting the terminal output, and fixed by keying the directory on the driven tree as
well. All four seeds above were re-run after the fix.

## Adjudication (same run, 9 agents) — and two corrections it forced

Verdicts in `run-1-verdicts.jsonl` (`check-dispatch`: clean, 9 records). Three claims, each with
an evidence pass (build tier), a primary refuter (judgment tier) and an independent second
refuter (mid tier). **Zero refutations; two narrowings, both of which correct text above.**

**Correction 1 — the sentence "the REAL Python scorer" is false as a universal.** The
coverage claim was stated as all thirteen classes occurring "against the real gate binary and the
real Python scorer in every seed". The refuter showed by deterministic plan reconstruction, and
corroborated live (`scorer_calls=42` in the artifact vs 36 POSTs in the scorer's own log = 6
intercepted), that:
- `volatile-recheck` is **proxy-forged in every seed** — the proxy fabricates `{"result":"FAIL"}`
  at the dispatch phase and never forwards, which is mechanically necessary because the facts are
  static;
- `unevaluable:criterion` in seed 1, and in seed 42 at 40 intents, came **only** from the injected
  503, never from the scorer's own unknown-fact UNEVALUABLE (seeds 7/1337 and 42@60 reached it
  both ways).

The gate still decided every terminal, and the class counts still come from the gate's own HTTP
responses — but "real scorer in every seed" is narrowed to: **real scorer for every
non-fault-injected call.**

**Correction 2 — the oracle's independence is computational, not authorial.** The refuters
confirmed the tautology attack fails: `oracle(plan)` is fully computed before the gate binary is
built, nothing flows gate to oracle, and the comparison is exact on BOTH terminal and reason. But
the oracle's step order matches `gate.go` one-for-one, and no artifact settles which source the
author had open. The orchestrator's own disclosure, which the evidence pass inferred
independently: **the oracle was written after reading `gate.go`.** So the agreement is evidence of
gate/contract self-consistency and of the absence of drift — and it is what caught all three
plants — but it is not evidence of correctness against a requirement authored independently of
the implementation. A second narrowing the evidence pass raised: `CONTRACT.md` itself documents at
least one ordering rule (revocation winning over unattested) that `gate.go`'s comment says was
"found by end-to-end smoke" and pinned afterward, so contract-derived independence has a ceiling.

**Gap found, not previously known:** the revoked-vs-unattested ordering edge — the exact rule
with the historical bug and its own regression test — is **structurally unreachable** by this
sampler. An intent either cites a published spec (revokable) or `spec_ref=-1` (unattested, no spec
object), so the two conditions can never co-occur. 13/13 class coverage is not ordering-interaction
coverage. Queue item 5.

Plant non-vacuity was the one claim that survived unnarrowed: both refuters re-planted all three
defects in their own copies, each ran a clean-copy control first (ruling out
any-change-goes-red), and both reproduced every narrated signature including plant C's `vega`
detail.

## What this does NOT show

- Concurrency: declarations are sequential. At-most-once under concurrent same-key declaration is
  unit-pinned (`TestConcurrentReserveDurable`), never exercised end-to-end here.
- Restart: the gate is never killed mid-stream.
- Outage realism: injected as HTTP 503 at a proxy, not a killed process (the quickstart's real
  `taskkill`/`kill` probe remains the stronger evidence for that class).
- Drift realism: injected at the proxy; a genuinely mutable fact source would be stronger.
- Deployment posture (R1/R2 key authority, workload identity) is untouched — test-grade keys
  throughout.
