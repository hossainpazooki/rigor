# ADR-0011 — Verifier-calibration ledger: the verifiers are claims too

**Status:** **Accepted 2026-08-18** (Proposed the same day), with one named open
design point carried into build: the demotion scope (whole session vs affected
claim class — self-refutation 4) must be decided before the first control
dispatch. Nothing is built yet; build order per ADR-0012 §8.

## Context

rigor's core move is that a claim is refuted before it is believed. The one actor
exempt from that rule today is the refuter.

The exemption has already cost something. At VANTAGE (2026-06-28) a fan-out of
default-refute skeptics returned **2 false refutations out of 4** — half its
output was wrong, in the confident direction. Nothing in the system noticed. It
was caught because the orchestrator re-ran the gates by hand, and `FEEDBACK.md`
records the lesson in exactly those terms: the promotion of `orchestrate` "rests
on tic + CLDD, whose OWN gates were re-run green by the operator — **not** logged
self-reports (a backlog-recon surfaced only log *leads*; the gate re-run is what
moved this, per the VANTAGE 2/4-false precedent)."

That is a per-incident save. It does not accumulate. Today a verifier's verdict is
trusted or re-checked case by case, on the orchestrator's instinct, and **nothing
tracks whether a given verifier on a given tier deserves trust at all.** Three
facts make that gap sharper than it looks:

1. **The tier ladder now routes verification by cost.** ADR-0007 added a mid tier
   and pointed `skeptic-verifier-fast` at it. The stated rationale was
   operator-reported usage economics — and the ADR's own honest-status line says
   the quality premise was never measured.
2. **The cheap rung has never run.** Re-verified 2026-08-18: no verdict record in
   any effort carries an `agentType`, and the one committed workflow script
   dispatches generic agents with a `model:` pin. `skeptic-verifier-fast` has
   never been dispatched on any tier. We are one operator decision away from
   routing real verification to a rung whose verdict quality is entirely unknown.
3. **`check-dispatch` cannot see the difference.** Its record schema has tier and
   model receipts but **no agent-identity field and no verdict-outcome field**. It
   proves *which model answered*. It cannot begin to say *whether the answer was
   right*.

`fanout-build`'s own entry contains the most uncomfortable version of this: "verify
has still never caught a false refutation when non-vacuity was mandated." That
could mean the mandate works. It could equally mean the verify phase is toothless
and nobody has measured which. Absent calibration data, those two readings are
indistinguishable — and rigor's whole posture is that indistinguishable-from-broken
is not a passing grade.

## Decision

Make verifier reliability **computable rather than asserted**, per verifier, per
tier, per claim class.

**1. An append-only calibration ledger: `docs/calibration/verifier-log.jsonl`**,
with a pointer-only `CALIBRATION.md`. Two record types share the log, so the
ledger stays genuinely append-only while verdicts acquire outcomes over time:

- a **`dispatch`** record, written when a verifier is dispatched: `id`,
  `ts`, `verifier` (the agent), `tier`, `claim_class` (e.g. numeric-provenance,
  gate-green, effect-probe, ledger-immutability), `verdict`
  (`refuted` | `survives` | `unevaluable`), and the `run` it belongs to;
- an **`adjudication`** record, written whenever ground truth later lands:
  `dispatch_id`, `held` (`true` | `false` | `undetermined`), and `basis` — the
  command re-run and its output that settled it.

Precision and recall per verifier per tier per claim class are then **computed
from the log**, never stated in prose. No row in `STATUS.md` may assert verifier
quality that this ledger cannot reproduce.

**2. Negative controls aimed at the verifiers themselves.** Every dispatch class
carries a seeded **known-true** and **known-false** claim, drawn from a pool and
mixed into the batch the verifier receives. This is `check-effect-probe`'s rule —
credit a probe only if it passed *and* its negative control failed — turned on the
prober:

- a verifier that **passes the known-false** claim, or **refutes the known-true**
  claim, is flagged in the ledger for that session;
- and its verdicts on *real* claims in that session are **demoted to
  `unevaluable`** — not to `refuted`, not to `survives`. Fail-closed applies to
  verdicts exactly as it applies to data. A verifier demonstrated blind on a
  planted case has not earned the benefit of the doubt on the live ones.

An always-agreeing verifier is the verification analogue of an always-green gate,
and the repo already calls that unevaluable.

**3. `check-verifier-calibration.mjs`, three outcomes:**

- **exit 0** — every verifier meets its stated floor on every claim class with
  sufficient data, and no control failures are unaccounted for;
- **exit 1 (FAIL)** — a measured reliability below the floor, or a control failure
  whose session's verdicts were not demoted, or a malformed / orphaned
  adjudication;
- **exit 2 (UNEVALUABLE)** — **insufficient data.** Below the stated minimum
  sample per verifier × tier × claim class, no verdict is issued about the
  verifier at all.

**4. The floor is a recorded decision, not a default.** The minimum reliability and
the minimum sample both live in `config/calibration.json` with a dated rationale,
the same way `config/models.json` holds tier truth. A number nobody chose is a
number nobody owns.

**5. Per-tier is the point.** Reliability is tracked *per tier* precisely so that a
silent quality collapse on the cheap or mid rung becomes measurable rather than
anecdotal — which is the evidence ADR-0007's unmeasured economics premise has been
missing since it was accepted.

**6. Starts empty, earns forward.** No backfill (the standing invariant). The
VANTAGE 2/4 incident is *context* for this ADR, not seed data for its ledger.

## Consequences

- **If accepted:** "the skeptic said so" stops being a terminal argument. A cheap
  verifier can be adopted on evidence, or refused on evidence, instead of on
  reported economics.
- **`skeptic-verifier-fast`'s promotion path gets an actual criterion** — today it
  is blocked on "a firing", which measures that it ran, not that it was right.
- **Cost, and it is not small.** Two control claims per dispatch class inflate
  subagent spend materially, in a repo whose last two loop iterations both **halted
  on budget breaches** (run 5: 185k vs 150k; payment run 1: 725k vs 150k). The
  controls must be priced into the L1 cap *before* dispatch, not discovered after.
- **Interlock:** a control failure is an incident, and it enters the ADR-0010 LEARN
  loop; calibration verdicts about standing state are themselves re-audited by
  ADR-0012's sweep.

## Self-refutation — what would make this a correct-shaped lie?

1. **Selection bias makes "precision" a lie, and this is the deepest objection.**
   Adjudications land only on verdicts somebody bothered to check — and people
   check verdicts that already look wrong. Precision computed over that subset is
   precision *on suspicious verdicts*, not on verdicts. The ledger would produce a
   real number attached to a false meaning, which is the exact failure mode rigor
   is named after. **Mitigation, partial and honest:** report precision-on-
   adjudicated with the adjudication rate printed beside it, and never call it
   precision without the qualifier. If the adjudication rate stays under ~30%, the
   metric should be published as a lower bound or not at all.
2. **Small-n makes the floor theatre.** With 4 dispatches, one bad verdict swings
   measured precision by 25 points. A floor applied to that fires on noise, and
   worse, *passing* it means nothing. The exit-2 insufficient-data rung is the
   mitigation, but it has a cost worth stating plainly: this gate will sit at
   exit 2 for months and produce no signal, and a gate that never fires is one the
   operator learns to ignore.
3. **Controls are learnable.** A seeded known-false claim reused across dispatches
   becomes recognizable, and any agent with repo read access can find the control
   pool and pattern-match its way to a clean score. Rotating a pool slows this; it
   does not solve it. An agent that games the control is *worse* than an uncalibrated
   one, because it now carries a certificate.
4. **Demotion may destroy good work.** Voiding a whole session's verdicts on one
   control miss is aggressive; a verifier can be blind to a planted edge case and
   still be right about the live claims. The alternative — demote only the affected
   claim class — is less safe and more defensible, and this ADR does not have
   evidence to choose. **Genuinely open.**
5. **It may just move the trust problem.** The ledger is written by the same
   orchestrator whose judgment it is meant to check, and `held: true` is itself an
   unrefuted claim. The `basis` field (a re-run command and its output) is what
   keeps it falsifiable — the ledger is only as good as that field's discipline,
   and nothing mechanically enforces that the basis was really executed.
6. **A third new folder.** Same sprawl objection as ADR-0010 §4; the same
   consolidation review applies if two or more of ADR-0009/0010/0011 are accepted.

---
*Related: ADR-0006 / ADR-0007 (tier pins and receipts — this ADR supplies the
quality evidence those decisions were accepted without), ADR-0010 (control failures
enter the LEARN loop), `check-effect-probe` (the negative-control rule this
generalizes), and `docs/STATUS.md`'s `skeptic-verifier` misfire row.*
