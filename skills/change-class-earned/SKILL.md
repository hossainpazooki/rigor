---
name: change-class-earned
description: Use when a change proposal claims a class (0, 1, or 2) — every pattern enters at class 2, and moving a pattern down is a human-only act on ledger evidence, never a claim the agent gets to grant itself.
status: provisional
---

# change-class-earned

The rigor name is **judgment-dispatch applied to the change itself**; the
change-enablement / SRE name is **standard / normal / emergency
classification, with standard changes pre-authorized**. This is the middle
ground between per-change human approval and fully automated promotion: a
human promotes every **class**, not every instance. The class is a refutable
claim with a citation the detective control checks, and an unclassifiable or
badly-cited proposal is never coerced toward leniency — it is **class 2**,
fail-closed, the same tri-state posture `data-quality-fail-closed` and
`health-signal-fail-closed` already use.

**Every change pattern enters at class 2.** There is no default, initial, or
assumed lower class for a new pattern, no matter how routine it looks. A
pattern moves down from class 2 by exactly one route: **a human writes an
`authorization` record**, citing ledger evidence for that pattern (clean
outcomes with non-vacuous probes, at least one exercised backout), and that
record is what the agent's later proposals cite. The agent never writes an
`authorization` record and never grants itself a class; it only proposes one,
citing whichever `authorization` record already exists.

**The rubric, in three lines:**

- **Class 2 — irreversible or externally visible.** Automated gates,
  asynchronous human approval on the record, *and* a human executing the
  step synchronously. Every change pattern enters here.
- **Class 1 — normal.** Automated gates plus an asynchronous human approval
  written to the record before execution.
- **Class 0 — standard.** Pre-authorized once by a human, with the
  authorizing criteria recorded. Instances run on preventive + detective +
  evidentiary controls only; no human per instance.

## Control shape

| Control | Assigned? | What it does here | rigor unit |
|---|---|---|---|
| Review (judgment) | assigned, human-only | a human reads the ledger evidence for a pattern and decides whether to write the `authorization` record that demotes it below class 2 — the agent proposes a class, it never grants one | skill (this document) + a human-authored `authorization` record |
| Preventive (blocking) | assigned | reads the effective class; class 2 refuses the agent outright (break-glass excepted) regardless of what evidence the proposal cites; class 1 is refused too, without a complete `approval` (`who`, `when`, `ref`) on the proposal | `hooks/change-guard.mjs` (`decide`, ladder step 2, via `effectiveClass`) |
| Detective (after the fact) | assigned | checks the citation resolves (exists, same pattern, same class), checks earned-class criteria (`min_clean_instances`, `backout_exercised`) against queried ledger evidence, checks a misfired pattern has not re-proposed class 0 without a `reproof` | `scripts/check-change-record.mjs` (`effectiveClass`, `earnedClassEvidence`, property P6 in `findChangeRecordViolations`) |
| Evidentiary (record) | assigned | `proposal.class = { proposed, authorization }`; the `authorization` record itself (`id, pattern, class, granted_by, granted_on, identity_rule, backout_rule, criteria, basis`); the `reproof` record that re-earns a demoted pattern | change-record kinds `authorization`, `reproof`; field `proposal.class` |

## Moves

1. **Start every new pattern at class 2, no exceptions.** A pattern that looks
   routine — "just an image tag bump" — is still class 2 until a human has
   written the `authorization` record for it. Routineness is not evidence;
   ledger evidence is.
2. **Check the citation, not the label.** A proposal claiming class 0 or 1 must
   name an `authorization` record. If that citation does not resolve — wrong
   id, pattern, or class, or no such record — the effective class is 2, full
   stop, regardless of what the proposal's `class.proposed` field says. Even
   a resolving citation is not enough at class 1: effective class 1 is
   refused without a complete `approval` (`who`, `when`, `ref`, all
   non-empty) on the proposal — the asynchronous human approval the rubric
   requires has to be on the record, not merely citable in principle.
3. **Query the ledger before writing an authorization, and cite the query.**
   `earnedClassEvidence(records, pattern, beforeTs)` counts clean instances
   (outcomes with `outcome: 'clean'` whose probe passes `findVacuousProbes`),
   exercised backouts, and non-vacuous probes. The **floor is ≥ 2 clean
   instances** per step down — a stated provisional parameter. Its numeral is
   borrowed from the promotion ledger's ≥ 2; the rule is not: refutable with
   data as more domains run, not a derivation from that other floor.
4. **Treat this floor as its own rule, not a reuse.** `docs/feedback/
   FEEDBACK.md`'s promotion ledger counts *independent domains* and moves a
   component *upward*. This rule counts *instances of one pattern* and moves a
   class *downward*. The numeral ≥ 2 and the human-promotes-on-ledger-evidence
   mechanism are shared; the counted object and direction are not — do not
   call one a reuse of the other.
5. **A misfire re-promotes the class, automatically, in the gate.** One
   `outcome: 'misfire'` at class 0 returns the pattern to class 1 until a
   `reproof` cites the ADR-0010 closure that pinned it — the gate enforces
   the demotion; earning it back down still requires a human-written
   `reproof` citing a real closure.
6. **Treat a class-0 probe as a standing claim, not a one-time grant.**
   ADR-0012's shape applies (event-driven with a scheduled floor): re-run
   every class-0 pattern's probe on any change to the probe or its signal
   source, and at least every 30 days and every 10th instance as the
   scheduled floor. The 30-day / 10th-instance numbers are ADR-0013's own,
   not ADR-0012's, and **unmeasured** — stated so they can be revised on
   data, not defended as final.

## Negative control

**Detective twins (must go red):**
- **(a)** An instance citing a class-0 `authorization` whose criteria it does
  not meet — no credited backout, or fewer prior clean outcomes than
  `min_clean_instances` — must be refused/flagged even though the citation
  itself resolves.
- **(b)** A pattern with a recorded `misfire` and no later `reproof`, still
  proposing class 0, must be flagged; its effective class is 1.
- **(c)** An instance with no classifiable pattern (or a citation that does not
  resolve at all) proposing class 1 must resolve to effective class 2, and the
  reason recorded must say so explicitly ("effective class 2"), never silently
  pass as class 1.

**A fourth detective twin on the outcome side:** an outcome executed at
effective class 1 - the class computed as of execution, so an instance's own
later outcome cannot demote it - with no complete `approval` (`who`, `when`,
`ref`) on its proposal is a P6 violation; a pending class-1 proposal with
`approval: null` is legitimate until it executes. The violation attaches to
execution without approval, not to a proposal still waiting on one. A cited
`authorization` that fails form (no `granted_by`, `granted_on`, or
`criteria`) does not resolve - effective class 2 at both controls: the hook
refuses it as unresolved, and the detective control (after round 5) returns
effective class 2 for it and additionally emits a form violation on the
authorization record itself.

**Not form-refutable — twin (d), named honestly:** an instance citing a
genuinely valid class-0 `authorization` for a pattern the change does **not**
semantically belong to (a schema migration labelled with the image-tag-bump
pattern's id). Every form check on this instance passes — the citation
resolves, the criteria are met, the record is internally consistent. Nothing
in `findChangeRecordViolations` can catch it, because pattern membership is a
semantic judgment about what the change actually *is*, not a property of the
record's fields. This is the **human review control's** job (ADR-0002: rigor
ships no validator that understands what a change means), and it is exactly
what the reviewer twin for this property tests: a seeded, mislabelled instance
that a human reviewer must catch by reading what the change actually does, not
by trusting its `pattern` field.

## Anti-pattern (correct-shaped lie)

A pattern that has run cleanly twice, gets an `authorization` record, and then
quietly absorbs a change that is *not* the same pattern under the same
citation. The record looks identical to a legitimate class-0 instance; the
mismatch is invisible to every field-level check and visible only to someone
who reads what shipped.

## Refute link

"This proposal is class 0, so no human needs to look at it" is exactly the
claim `judgment-dispatch` teaches you to distrust when a stakes rubric is
self-applied. Refute it the way that skill refutes a tier claim: recompute the
citation (does the `authorization` record actually exist, for this pattern, at
this class?), recompute the evidence (`earnedClassEvidence`, not the
proposal's own count), and check for an un-reproved misfire — never accept
"class: 0" as self-certifying.

## Record fields

Writes/reads (ADR-0013 §2): `proposal.class = { proposed: 0|1|2,
authorization: <id>|null }`; `authorization = { kind: "authorization", id,
pattern, class: 0|1, granted_by, granted_on, identity_rule, backout_rule,
criteria: { min_clean_instances, backout_exercised, probe_nonvacuous,
sweep_cadence_days, sweep_every_n_instances }, basis }`; `reproof = { kind:
"reproof", pattern, closure_id, by, on }`.

## Honest limit

This is form-refutable for twins (a)–(c) only. Twin (d) — pattern
membership — is never form-refutable and this document does not claim
otherwise: no field-level check can tell whether an instance really *is* the
pattern it cites, only whether its fields are internally consistent with that
citation. That judgment stays with the human reviewer, permanently, by design
(ADR-0002). The 30-day / 10th-instance sweep cadence and the ≥2 clean-instance
floor are both stated as unmeasured, provisional parameters, not derived
thresholds.

## Pairs with

`judgment-dispatch` (the same stakes-rubric shape, applied to a change instead
of a verifier), `change-backout-exercised` (the exercised-backout count this
property reads), `post-implementation-probe` (the non-vacuous-probe count
`earnedClassEvidence` computes from this property's records, for the human's
authorization query — not gate-enforced; `criteria.probe_nonvacuous` on an
`authorization` record is form-recorded, not gate-read), `break-glass-on-
record` (the one documented exception to class 2's refusal), `learn-from-
misfire` (the loop a misfire's re-promotion and later `reproof` both run
through).
