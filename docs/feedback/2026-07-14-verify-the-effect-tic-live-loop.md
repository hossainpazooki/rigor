# 2026-07-14 · `verify-the-effect` · helped · deterministic-systems Go + Python (treasury-intent-controller)

**Domain:** treasury-intent-controller (tic) — Go authorization gate + Python scorer + a Rust
artifact wheel. Independent, non-origin, gate-rerunnable. **This is the live end-to-end probe
the component's row has been short of since 2026-06-27.**

## What fired

The 2026-07-13 handoff brief asserted the loop had been "probed live" with negatives —
*"REAL scorer kill ⇒ next declaration FAILED, zero new settlements"* — in a single clause, with
**no output quoted**. Per `logs index candidate firings; only a gate re-run moves a status`, that
is a lead, not evidence. The probe recipe was re-run from the brief with output captured.

## The probe (2026-07-14, orchestrator-run, not a self-report)

Gate on `:8080` (`TIC_SCORER_URL=http://127.0.0.1:8000/ml/evaluate`) → WSL scorer → real
`ke_artifact_py` wheel → folded verify of the signed, `Published` golden IntentSpec
`c7a36959…dc51` under a kind-correct environment.

```
PROBE 1  positive — golden spec hash
  {"terminal":"ACHIEVED","reason":"","achieved_seq":14}
PROBE 2  negative control (a) — unknown spec hash (64 zeros), ONE-input delta
  {"terminal":"FAILED","reason":"unevaluable:amount_under_ceiling"}
PROBE 3  negative control (b) — REAL scorer killed, identical golden declaration
  {"terminal":"FAILED","reason":"unevaluable:amount_under_ceiling"}
PROBE 4  recovery — scorer restored, identical golden declaration
  {"terminal":"ACHIEVED","reason":"","achieved_seq":35}

durable feed /v2/events (the CONSUMER-visible path, not the action's own report):
  {'DECLARED':5,'RESOLVING':5,'ACTIVE':5,'VERIFYING':5,'SCORED':5,
   'UNEVALUABLE':3,'FAILED':3,'IDEMPOTENCY_RESERVED':2,'ACHIEVED':2}
```

**Non-vacuity is proven, not assumed.** PROBE 4 is what makes PROBE 3 admissible: the *identical*
declaration goes green the moment the scorer returns, so the outage — not the declaration — is the
cause of the refusal. Both controls are one-input deltas from the green case. `check-effect-probe`'s
credit rule is satisfied: probe passed AND a paired control failed.

The effect was read off the **consumer path** (the durable feed), never the gate's own 200 —
`verify-the-effect` moves 1–2. 2 grants, 3 refusals, and the refusals include the outage.

## What the probe found that the brief did not

1. **The resolver verifies EVERY hash the gate sends.** A declaration carrying the test fixture's
   placeholder `rule_artifact_hash: "rule-hash-1"` fails closed — correct behavior, and the first
   probe attempt hit it. A real declaration sends a real rule hash or an empty one (empty hashes are
   dropped from the requested set). The brief's recipe omits this and would not have reproduced.
2. **One inputs directory is one kind-environment.** `~/tis-inputs` did NOT verify the IntentSpec;
   the env must be synthesized (kind-aware policy: SourceFidelity + PublicationApproval, no
   ScenarioCoverage; context `current_legal_source_hash` = the artifact's `source_corpus_hash`).
   The repo's own learnings entry says this; the brief's probe recipe contradicts it.

Both are recorded in tic as anchored learnings entries (2026-07-14).

## Scope caveats, named

- Same operator as every prior domain — the standing caveat across this ledger.
- The oracle is the gate's durable feed. It is independent of the *scorer's* report (a different
  process, killed and restarted mid-probe), but not independent of the *gate's* implementation.
  A fully independent oracle (a third-party consumer reading the feed) is still unproven.
- The probe exercised a live service loop, not an irreversible external action (no funds moved).
  `effect-prober`'s "aftermath of a genuine live irreversible action" gap is **narrowed, not closed**.

re-verify: `docs/handoff/2026-07-13-atlas-treasury-payment-loop.md` probe recipe, with the two
corrections above; or tic `docs/learnings/2026-07-14-payment-loop-live-probe-with-controls.md`.
