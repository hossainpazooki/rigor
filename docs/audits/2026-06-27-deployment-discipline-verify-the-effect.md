# Deployment-Discipline Audit → `verify-the-effect`

**Audit period:** 2026-06-26 → 2026-06-27 · **Consolidated:** 2026-06-28
**Subject:** mining three deploy/release repos for the discipline that distinguishes an
action's *success report* from its *effect*, the skill that came out of it
(`verify-the-effect`), the two defects it then caught, and the actions taken.
**Record of source:** the load-bearing facts here are the verified entries in
`FEEDBACK.md` (2026-06-26 authored entry; 2026-06-27 two catch entries; 2026-06-27 scope
entry). This doc is the narrative; the ledger is the audited record.

**One-line conclusion:** a real, reusable discipline — "probe the resulting state, never
the success log" — was distilled from three deploy/release repos and immediately caught
two defects of the exact class rigor's numeric/string spine slides over (a deploy that
reports healthy while its behavior is a stub; an eval that reports an in-sample number as
if it generalized). But all five repos involved share one author, and every catch was
static/record-level, not a live probe against a running system. Genuinely useful, not yet
independent.

---

## Evidentiary basis
- **[LEDGER-VERIFIED]** — confirmed from raw source in the originating sessions and
  recorded in `FEEDBACK.md` (those entries explicitly note "Confirmed from source, not the
  subagent summary"). The file:line cites below are from that record; they were **not
  independently re-read while writing this consolidation.**
- **Standing caveats:** (1) the three mined repos + the two catch domains are
  same-author/adjacent-domain — correlated, not independent. (2) Both catches were static
  + record-level, not a live end-to-end probe against a running deploy.

---

## 1. What was mined
Three deploy/release repos, deliberately spanning different release shapes:
- a **k8s + Terraform infra** repo,
- a **FastAPI app** repo,
- an **ML reproducibility** repo.

### The three convergent disciplines they shared
1. **An action's success report ≠ its effect.** All three close a transition with a probe
   of the *live state*, not the apply log — a health-gate + auto-rollback; a layered
   post-deploy smoke script; a transfer-validation + verdict/evidence cross-check.
2. **The shipped artifact is pinned and immutable end-to-end** — immutable registry tags,
   commit/digest-addressed images, pinned base images + a seeded PRNG.
3. **"Validated" is labeled by what it was validated against** — self-consistent vs. an
   independent oracle.

**Honesty caveat recorded at the time:** the convergence is real but *correlated, not
independent* — three repos, one author, adjacent domains. Closer to one engineer's
consistent habit observed thrice than three teams discovering the same law.

---

## 2. The synthesis — `verify-the-effect`
The skill distilled from the mining. Its core moves: **probe state, not exit code**;
**non-vacuity / negative control** (a probe is credited only if it passes AND a negative
control fails against an effect-absent state — the behavioral analogue of
recompute-from-source); cross-check verdict vs evidence (fail closed); reversibility;
**name the oracle** (self-consistent / independent / oracle-gap). Non-vacuity is the crux:
it is the move that escapes rigor's numbers-and-strings ceiling.

The skill composes three existing ones: `refute` (probe, don't trust the report),
`gate-discipline` (ordered gates, re-run not remembered), and `implemented-vs-planned`
(the validated-against axis).

---

## 3. Findings — what it caught

### Finding 1 — service deploy reports healthy, behavior is a stub [LEDGER-VERIFIED]
**Domain:** institutional digital-asset platform API (decoder service).
`get_health()` (`src/decoder/llm_service.py:121-129`) returns
`status: healthy, anthropic_configured: true, available_tiers: [...]` when a key is set —
yet `explain()` (`llm_service.py:28-88`) returns a hardcoded stub on **every** call, with
no code path referencing `has_api_key` or any client. The *report* (healthy + configured)
is true while the *effect* (a real explanation) is absent.
**Why the spine missed it:** `confidence: 0.85` is a real number and the citations resolve
to real input fields — every number and string checks out while the behavior is a stub.
**How it was caught:** a complete static read of `explain()` (exhaustive over inputs) + the
content probe (`'stub' not in explanation` → **EFFECT-REFUTED**); `check-effect-probe.mjs`
flagged the as-deployed `/decoder/health` probe as **vacuous** (no control separating stub
from real).
**Note:** stronger than the original mining summary, which said "returns stub when no key
set" — the raw source shows it returns the stub *even with a key configured*. The
recompute-from-source discipline caught the summary undersell.

### Finding 2 — eval reports an in-sample number as if it generalized [LEDGER-VERIFIED]
**Domain:** genomics label-error ML (CLUE) — a *different action type*, model/eval rollout
rather than a service deploy. `tune_decision_threshold()` (`clue/loop.py:88-112`) picks the
threshold that maximises F1 and reports that maximum **on the very cohort it tuned on** — an
in-sample number that took selection on the data it is then scored against.
**Verdict:** the non-vacuity move classifies the reported F1 as a **vacuous-probe** result —
it cannot discriminate generalization from in-sample fit. The discriminating control already
exists in the repo: `select_threshold_holdout()` (`loop.py:115-144`) applies a threshold
chosen on a disjoint `tune_cohort` to a held-out `measure_cohort`; `check-effect-probe.mjs`
**credits** that record (probe passed, control failed) and flags the in-sample one.
**Honest framing:** convergence, not novel discovery — CLUE independently arrived at the same
negative-control discipline and even labels the residual shared-generator optimism as its own
gap. An independent methodology landing on a *known* real defect validates the lens; it does
not get full credit for finding it.

---

## 4. Subsequent actions
- **Built the artifact set** around the discipline: the `verify-the-effect` skill (6 moves,
  non-vacuity as the crux), the `/verify-effect` command, the `effect-prober` agent
  (returns `EFFECT-CONFIRMED / EFFECT-REFUTED / VACUOUS-PROBE / UNVERIFIABLE`), and
  `scripts/check-effect-probe.mjs` (flags records where the probe didn't pass, no control
  ran, or the control passed with the effect absent). Tests added
  (`tests/effect-probe.test.mjs`), taking the suite to 59 passing.
- **Logged every exercise honestly** in `FEEDBACK.md` — the authored entry (0 independent
  domains at authoring), then the two catches as independent domains #1 and #2, each with its
  static/record-level caveat.
- **Recorded the structural limit** (2026-06-27 scope entry): rigor's *demonstrated* reach
  was numeric provenance + citation/string fidelity; `verify-the-effect`'s behavioral
  (probe-the-effect) move is precisely the capability with the least evidence, so it is
  **aspirational until proven on a repo it did not come from.** That entry is why the skill
  sits at `provisional`, not `settled`, in the promotion table.

---

## 5. Honest bounds (carry these forward)
- **Same operator throughout** — three mined repos + two catch domains, one author. No
  third-party adoption; the convergence is a consistent habit, not an independently
  rediscovered law.
- **Static / record-level, never live** — both catches read source and stored records; no
  probe ran against a running deploy. The skill's strongest claim (probe the *live* effect)
  is the one with the least evidence behind it.
- **Provisional status stands** — per `FEEDBACK.md`, `verify-the-effect` is "1 strong + 1
  convergent (+ 1 convergent builder from VANTAGE, 2026-06-28), all same-author, no live
  end-to-end probe." Settling it needs a live probe and, ideally, a different author.

---
*Continuation:* the 2026-06-28 VANTAGE/recon audit
(`docs/audits/2026-06-28-rigor-performance-vantage-recon.md`) carries the same
implemented-vs-verified discipline into the build and recon domains; `FEEDBACK.md` is the
living ledger of record.
