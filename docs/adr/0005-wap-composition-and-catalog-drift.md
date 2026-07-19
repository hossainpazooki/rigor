# ADR-0005 — WAP is the chassis at pipeline scale, not the conscience; and the catalog drifts

**Status:** **Settled (scoped) 2026-07-19** — success criterion 1 satisfied on the operator's
two-domain basis (addenda 2–3: origin exemplar fired + credited at VANTAGE Gate B; non-origin
adjudicating firing executed at CLDD's v3 sweep publish, verdict **clarified**); the bridge doc
is earned and built (`docs/wap-bridge.md` + data-eng skill cross-links). Proposed 2026-07-09;
operator direction 2026-07-18 (addendum 1). Resolution 2's standing-catalog sweep remains
**not started** — settlement of the framing does not open it.

## Context

An operator-side analysis (chat, 2026-07-09, provided as input — not independently verified
before this ADR) claimed two things about Write-Audit-Publish, the data-engineering pattern of
staging data invisibly, checking it, then atomically promoting it to consumers:

1. **WAP already *is* the ADR-0004 composition at pipeline scale** — write gated by contract
   (spec polarity), audit refuting the claim before consumers believe it (refute polarity),
   publish as the promotion rule.
2. **WAP's gap is temporal** — it audits a batch once at publish, and nothing re-audits the
   standing catalog as reality drifts; the catalog is a mutable STATE.md nobody runs `pick-up`
   against.

Per this repo's own standard, both claims were checked against WAP as actually practiced before
being built on. Sources examined 2026-07-09:

- **Iceberg branch-based WAP** (write to an isolated branch → run data-quality checks →
  fast-forward to `main`; checks named in the ecosystem docs are null/duplicate/referential-
  integrity rules): [iceberglakehouse.com](https://iceberglakehouse.com/iceberg/iceberg-wap-pattern/),
  [Dremio](https://www.dremio.com/blog/streamlining-data-quality-in-apache-iceberg-with-write-audit-publish-branching/)
  — search-level; and the [AWS reference implementation](https://aws.amazon.com/blogs/big-data/build-write-audit-publish-pattern-with-apache-iceberg-branching-and-aws-glue-data-quality/)
  (fetched): audit = Glue Data Quality DQDL rules (e.g. `ColumnValues "current_temperature"
  between -10 and 50`) written by the same engineers in the same notebook; **"no mention exists
  of testing audit rules against known-bad data, negative controls, or independent verification
  of the audit logic itself"**; post-publish, **"no re-audit mechanism or drift detection is
  discussed — the pattern assumes audit quality is final"**; failed-branch handling is not
  addressed at all.
- **dbt blue-green / build-then-swap** ([dbt community write-up](https://discourse.getdbt.com/t/performing-a-blue-green-deploy-of-your-dbt-project-on-snowflake/1349),
  fetched): the audit step is literally `dbt run; dbt test; dbt run-operation swap_database` —
  the project's **own** test suite, authored by the same modeling team; publish is Snowflake's
  atomic `alter database prod swap with stage`; **"testing occurs only in the pre-swap phase."**
- dbt Labs' own WAP essay ("Testing is not enough: Transforming data quality with Write, Audit,
  Publish") — indexed by search but the URL 404s at fetch time: `unverifiable-here`; not relied on.

**Refutation outcome:**

- **Claim 1 is weakened, materially.** The *chassis* half holds: write = isolated stage invisible
  to consumers, audit = a gate slot before belief, publish = an atomic promotion that a red gate
  blocks. That is loop-chassis shape — staged work, a gate, graduated exposure. But the *conscience*
  half is refuted as stated: in practice the audit is the **producer's own pre-specified checks** —
  spec polarity, `gate-discipline`-shaped, the same team authoring data and audit (the
  fox-and-henhouse shape `judgment-dispatch` exists to neutralize elsewhere). No source shows
  negative controls, proof the audit can fail, or an independent oracle. **WAP supplies the slot
  where a conscience could go; it does not supply the conscience.** The in-house specimen of why
  this matters: VANTAGE's committed suite was green on the one input distribution that hid a
  real defect (`docs/feedback/2026-07-08-no-lookahead-vantage-origin-firing.md`) — a WAP audit
  running that suite would have published wrong data at full history, atomically and with
  confidence.
- **Claim 2 survives.** Both fetched sources confirm audit is a one-time pre-publish step with no
  re-audit of published state. The "catalog as un-picked-up STATE.md" framing is an analogy, but
  the gap it names is real in the sources examined.

**What the 2026-07-02 data-eng plan already anticipated:** the mechanism transfer (gate at a
boundary, fail closed, gate-green ≠ data-correct), the predicates (the four skills), and the
refusal to ship a universal validator (ADR-0002). `verify-the-effect` even carries the publish
row already ("publish accepted → a consumer pulls and loads the *exact* artifact"). **What it
missed:** the temporal dimension entirely — every skill audits a claim *at a moment*; nothing
owns re-auditing standing published state as upstream reality drifts (`pick-up` is
session-boundary-scoped, not catalog-scoped) — and the stage-architecture framing itself: the
plan organized by claim class, not by where in a write→audit→publish lifecycle each check lives.

## Decision (proposed — vocabulary + sequencing + one requirement; zero plugin surface)

**1. Vocabulary: rigor keeps its own names; the mapping is documented, one-directional.**
rigor's stages stay `refute`/`gate-discipline`/`verify-the-effect`/`pick-up` vocabulary. WAP
terms enter rigor only as a *reader's bridge* — this ADR is that bridge — never as stage names.
Two reasons. (a) The mapping is not 1:1: WAP's "audit" is spec-polarity in practice (refuted
above); renaming rigor's refute-polarity checks "audit" would import the weaker meaning and
blur exactly the distinction rigor exists to keep sharp. (b) rigor's discipline skills are
domain-neutral by standing rule; WAP is data-engineering community vocabulary, and adopting it
as stage naming would scope general discipline to one domain. A data-eng reader gets the table
below; a rigor reader learns WAP is the chassis instance. The mapping:

| WAP stage | What real WAP provides | rigor component in that slot | What rigor adds in the slot |
|---|---|---|---|
| Write | isolated branch/temp schema, invisible to consumers | `gate-discipline` rule 1 (define green before the stage starts) | acceptance criteria stated *before* the write, not discovered at audit time |
| Audit | producer-authored DQ rules / the project's own `dbt test` | `data-quality-fail-closed` (three outcomes; unevaluable **halts**, is not coerced) + the predicate skills (`no-lookahead`, `idempotent-restatement`, `lineage-replay`) | **polarity upgrade**: test-path fidelity (`refute` move 5), and the audit must be *shown able to fail* — see resolution 3 |
| Publish | atomic fast-forward / schema swap; red blocks it | `verify-the-effect` + `gate-discipline` rule 3 (a real integration, not a local pointer) | probe the **consumer-visible** state after the swap, paired with a negative control; failed-branch handling defined (the reference implementations leave it undefined) |
| *(absent)* | — | `pick-up` (scoped to briefs today) / ADR-0004's L1 sweep class | the temporal extension — resolution 2 |

**2. The standing-catalog sweep is sequenced, not started.** The gap claim survived, and the
remedy has an obvious shape: the ADR-0004 L1 re-verify sweep extended to a new claim class —
standing published-data claims (catalog entries, freshness assertions, lineage/replay claims,
still-holds re-runs of publish-time audits), executed as judgment inside the target repo per
ADR-0002, recorded per the ADR-0003 schema (`re-verify:` lines with prerequisites named,
`unverifiable-here` when the box can't run them). **But ADR-0004's pilot is unevaluated (zero
runs since acceptance), and opening a second pilot before the first reports would be exactly the
loop-shopping this repo's Goodhart guard names.** So: the catalog sweep is *designated* as the
second instance of the L1 sweep class and *blocked* on ADR-0004's success-criteria evaluation.
Sequencing is the decision.

**3. The negative-control requirement for a publish — stated now, because it is vocabulary-free
and already implied by shipped skills.** A data publish is credited only when three things hold:

- the audit passed on the candidate (branch / temp schema / staged batch);
- the **same audit demonstrably fails on an effect-absent or known-bad state** — a mutated twin
  of the candidate (corrupt a partition, drop rows, shift a timestamp — the target repo picks
  the mutation; rigor does not know its schema, per ADR-0002), or the prior snapshot for
  freshness-class checks. An audit that has never been seen red on known-bad input is
  **unevaluable** as a gate — and per `data-quality-fail-closed`, unevaluable halts; it is not
  coerced into pass;
- post-publish, the effect is probed on the **consumer path** — query through the catalog/main
  branch as a consumer would, and the probe must distinguish the new snapshot from the prior one
  (`verify-the-effect` moves 1–2; `check-effect-probe`'s credit rule is the mechanization:
  effect-claim credited only if the probe passed *and* a paired negative control failed).

This is not new machinery — it is `verify-the-effect`'s existing publish row plus
`check-effect-probe`'s existing credit rule, composed and stated for the WAP shape. Precedent at
n=1 (origin): VANTAGE's negative-control mutation (3/5 tests red with the exact leak signature)
plus its committed non-vacuity companion. Tagged honestly: **stated discipline, applied once, in
the origin repo** — planned-shaped until it fires in a non-origin domain.

**4. Nothing ships to plugin surface.** No new skill, no skill renames, no command, no check
script, no cross-reference edits to the four data-eng skills yet. This ADR is the artifact. A
`docs/` bridge note or skill cross-links are deferred until the first genuine WAP-shaped firing
in a non-origin repo — which is also, not coincidentally, what the four data-eng skills need for
their first non-origin domain (`docs/efforts/backlog-settlement/STATE.md` already lists the
candidates). One real firing serves both; a doc written before it would be vocabulary ahead of
evidence.

## Success criteria (when does this mapping earn more than an ADR)

1. A first genuine WAP-shaped firing in a **non-origin** repo applies the mapping and the
   resolution-3 requirement (audit red-on-twin actually demonstrated), and its feedback entry
   records whether the WAP framing clarified or confused the work. Clarified → the bridge doc
   is earned. Confused → this ADR gets a dated correction, not a quiet edit.
2. The catalog sweep unblocks only after ADR-0004's pilot is evaluated against its five criteria
   — whichever way that evaluation goes, the outcome is recorded before a second sweep class opens.
3. Promotion rules untouched throughout: a WAP-vocabulary entry in FEEDBACK.md counts exactly as
   much as it would have without the vocabulary — ≥2 genuine independent non-origin
   gate-rerunnable domains, gates re-run by the orchestrator.

## Decisions pending (operator review)

1. Ratify the four resolutions above (each carries its recommendation inline).
2. One genuinely open call: when the first WAP-shaped firing happens, does its negative-control
   evidence (the red-on-twin run) belong in the target repo's records, rigor's feedback entry, or
   both? Recommendation: both — the target repo holds the runnable artifact (ADR-0003's eventual
   LEARNINGS.md is its natural home), rigor's entry holds the anchored pointer plus quoted output.

## Consequences

- **If ratified:** rigor gains a documented bridge to the data-engineering community's dominant
  quality pattern without renaming anything, a concrete publish-credit rule composed from shipped
  skills, and a sequenced (not abandoned) answer to the real temporal gap — while the weakened
  claim 1 keeps the pitch honest: rigor is not "WAP for agents"; rigor is what WAP's audit slot
  is missing.
- **Risk — vocabulary drift.** Future docs start calling refutation "audit" and the polarity
  distinction erodes. Mitigated: resolution 1 is explicit that WAP terms are reader-bridge only;
  the mapping table names the polarity difference in its own cells.
- **Risk — premature second pilot** (the named Goodhart shape): the catalog sweep is attractive
  and unblocked-looking. Mitigated: resolution 2 blocks it on ADR-0004's evaluation, and
  criterion 2 makes the unblock itself a recorded event.
- **Risk — the mapping overclaims by association.** "WAP is the chassis" could read as "rigor
  has pipeline-scale evidence." It does not: every data-eng skill is origin-only as of
  2026-07-09, and resolution 3's requirement has fired once, in the origin repo. The
  implemented-vs-planned line in resolution 3 exists so this ADR cannot be quoted as practice.
- **Cost.** One ADR. Zero surface, zero always-on tokens, zero new gates.

## Addendum — 2026-07-18: operator direction — the WAP workstream uses VANTAGE

Asked to choose between ratify-as-written, amend-and-ship-surface-now, or mechanize resolution 3,
the operator answered: **"use vantage."** Recorded as direction, honestly scoped:

- The first WAP-shaped firing — the resolution-3 publish-credit rule applied end-to-end (audit
  green on the candidate, the same audit demonstrably red on a mutated twin, post-publish probe on
  the consumer path with a paired negative control) — is **designated to VANTAGE**, whose Gate B
  (Databricks) publish boundary is the natural site. The standing-catalog sweep (resolution 2)
  likewise targets VANTAGE's catalog when opened.
- **What this does not change:** VANTAGE is the origin repo for every data-eng skill, so a VANTAGE
  firing exercises the discipline but cannot serve as the non-origin domain that criterion 1 and
  resolution 4 gate the bridge doc and promotions on. Those unlocks still wait for a non-origin
  firing; promotion rules (criterion 3) untouched.
- The four resolutions themselves remain as proposed; no plugin surface ships from this ADR. The
  status stays **Proposed with recorded direction** — designating the firing domain is an operator
  action short of ratifying the resolutions, and this ledger keeps that distinction visible.

## Addendum 2 — 2026-07-19: operator settlement directive; VANTAGE fired, CLDD designated

Operator directive (in-session goal, 2026-07-19): **settle the WAP framing on two domains — the
origin exemplar plus one separate, non-origin domain.** Recorded here as the settlement basis:

- **Origin exemplar: FIRED and credited.** VANTAGE Gate B ran resolution 3's three-part rule
  end-to-end at a genuine external publish boundary (audit green on candidate and published
  state; same audit red on a mutated twin at exactly the planted count; post-publish
  consumer-path probe with a pre-publish negative control, `check-effect-probe` clean). Evidence:
  `vantage/docs/GATE-B-WAP-EVIDENCE.md`; rigor-side record with the orchestrator's own gate
  re-runs: `docs/feedback/2026-07-19-wap-firing-vantage-origin-gate-b.md`. Origin status
  unchanged: exemplar, not adjudicator.
- **Non-origin adjudicating domain: CLDD v3 sweep publish, designated.** The v3 build (spec Rev
  2.1) built the audit machinery the slot requires — H4 integrity control (seen red on a real
  defect at the pilot gate before going exactly-zero), byte-identity and column-identity gates,
  recompute-from-CSV stats — and the 450-run sweep is in flight. The firing applies resolution 3
  at the sweep-publish boundary; its feedback entry carries criterion 1's clarified-vs-confused
  verdict.
- **Settlement lands when the CLDD entry is written** — not before. This addendum authorizes the
  path; it does not pre-claim the outcome. Promotion rules (criterion 3) remain untouched — the
  framing settles on the operator's two-domain basis, component promotion does not. *(Scope
  corrected before publication, same day: the CLDD firing gives `data-quality-fail-closed` its
  first non-origin domain — the boundary it fired at is a three-outcome fail-closed audit gate.
  The other three data-eng skills did not genuinely fire at CLDD and gain nothing from it.)*

## Addendum 3 — 2026-07-19: settlement executed; criterion 1 verdict = clarified

The designated non-origin firing ran at CLDD's v3 sweep publish boundary, all three parts of
resolution 3, orchestrated and re-verified from this session:

1. **Audit green on the candidate:** 450/450 runs, `feedback_sweep_stats.py` exit 0, H4
   integrity identity ≤ 1e-10 on all 900 checked rows, H1 confirmed / H2–H3 honestly not.
2. **The same audit demonstrably red on a mutated twin:** +0.001 planted on 11 frozen-arm
   rows → H4 FAIL at exactly the planted magnitude and severity, exit 1, publication
   mechanically blocked. Beyond the staged twin, the audit was seen red on **two real
   defects** during the firing itself: the pilot gate caught a pricing-basis non-additivity
   (spec Rev 2.1), and the full-matrix gate caught artifact precision below its own tolerance
   (Rev 2.2 — precision raised, tolerance never loosened).
3. **Consumer-path probe with negative control:** headline numbers recomputed from the
   published CSV as a reader would; effect-absent control exits non-zero;
   `check-effect-probe: clean`.

**Criterion 1 verdict: CLARIFIED** — recorded with its evidence and one honest nuance (the
"publish" of a research artifact is the operator's commit, so the post-publish probe runs on
the staged artifact with the commit as the atomic final step) in
`docs/feedback/2026-07-19-wap-firing-cldd-nonorigin-v3-sweep.md`. The framing's load-bearing
claim — real WAP supplies the audit *slot*, rigor supplies the *conscience* — was operative,
not decorative: a producer-authored green-only audit would have shipped both real defects.

**Settled (scoped)** on the operator's directed basis: one origin exemplar + one non-origin
adjudicating domain, same operator across both (caveat carried). Component promotions are
untouched; `data-quality-fail-closed` records domain 1 of 2.

---
*Related: ADR-0002 (the boundary: judgment, not a universal gate — unchanged here), ADR-0003
(record schema any sweep artifact reuses), ADR-0004 (the composition this instantiates at
pipeline scale; its pilot gates resolution 2), `docs/plans/2026-07-02-rigor-dataeng-verification-layer.md`
(the layer this reframes by lifecycle stage), `docs/efforts/backlog-settlement/STATE.md` (where
the first non-origin firing is already a named candidate). Sources: fetched 2026-07-09 — AWS
Iceberg-branching WAP reference implementation, dbt community blue-green write-up (links in
Context); Iceberg ecosystem docs at search level; dbt Labs WAP essay `unverifiable-here` (404).*
