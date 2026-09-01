# Open-source contributions — targets, rules, and standing

2026-09-01. The umbrella for taking this portfolio's thesis into external
standards bodies and OSS projects. Owner: the operator; this document is the
working reference, updated as lanes move (unlike the ledgers, it is a mutable
current-state doc — the STATE.md tense, not the dated-entry tense).

**The shared thesis, one line:** AI interprets, deterministic gates decide, and
no claim earns status without a recomputable proof it can fail.

**Why external venues, precisely:** every settled row in rigor's promotion
ledger carries the same caveat — *same operator, all domains*. An OSS venue is
the first gate in the program the operator does not control: maintainer review
is a skeptic nobody prompted, and a merge or a substantive rejection is a
verdict rendered by someone with no stake in the thesis. **External venues
verify the doctrine; they never credit the components.** A merged facet proves
the gap is real to people who own the vocabulary — it does not prove
`check-effect-probe` works, because no maintainer ran the twin. Component
credit stays with the promotion ledger and its domain rules.

## The three lanes

| lane | target | gap shape | contribution shape | standing |
|---|---|---|---|---|
| /baseline | OpenLineage data-quality facets | `success` without ability-to-fail | custom `baseline_gateVerdict` run facet + docs | **first** — spec written (2026-08-30 facet design) |
| /rigor | OTel GenAI semconv `gen_ai.evaluation.result` | score without ability-to-fail | negative-control attributes + emitter demo + docs | second — target confirmed, evidence measured (below) |
| /intent | FINOS CDM (`WorkflowStep`) | event without a seat for the authorization decision | worked example, or model read first | third — 7.1.0 model read owed before any gap claim |

Same gap twice (baseline, rigor): a verdict schema with no negative-control
field. Different gap once (intent): a domain model with no representation of
the refusal that produced no event. **Merge order is baseline → rigor → intent**
and is load-bearing: the rigor article's hook is "the same hole, one ecosystem
over," which requires the baseline contribution to exist first.

### Lane rules (settled 2026-09-01)

- **rigor is the thesis anchor, not the queue head.** The /rigor page states
  the one-gap-three-vocabularies frame; each lane keeps a landing page native
  to its audience (OpenLineage reviewers land on baseline material, FINOS
  reviewers on intent material — never on a Claude Code plugin page).
- **Every filing gets a pre-registered claim card,** committed and dated
  **before** submission and immutable after it: what a merge would prove, what
  a substantive rejection would refute, and a date window after which silence
  is recorded as **unevaluable** — never coerced into "no objection" or
  "failed." Post-hoc card edits are the laundering channel this rule exists to
  close. Claim cards land beside this file as dated entries when the first
  filing is prepared.
- **Merge evidence is graded by what was contested, not by what landed.**
  Measured 2026-09-01 (small recent samples, see
  [`2026-09-01-otel-lane-evidence.md`](2026-09-01-otel-lane-evidence.md)):
  OpenLineage docs-only PRs merged 5/5 with zero written review, so a docs
  merge there is weak evidence; every sampled semconv merge carried written
  discussion. A spec-field debate that ends in acceptance is the strong form.
- **A rejection on substance is the most valuable outcome available** — the
  independent refutation no internal skeptic can deliver. It is recorded as a
  misfire of the gap claim, kept visible, never spun.
- **If every venue can only ever say yes** — because only sure things are
  filed, or silence is read as assent — the program has rebuilt the evaluator
  that never fails, one level up. The claim cards are what keep the failing
  label reachable.

## The rigor lane, in detail

**Evidence measured 2026-09-01** (methods and limitations in
[`2026-09-01-otel-lane-evidence.md`](2026-09-01-otel-lane-evidence.md)):

- Prototype-first is **written process** at the target, not community folklore:
  semconv `CONTRIBUTING.md` — "Non-trivial changes to semantic conventions
  should be prototyped in the corresponding instrumentation(s)."
- The gap is **novel, not rejected**: the full discussion that created
  `gen_ai.evaluation.result` (PR #2563, merged 2025-08-26 — 122 review
  comments, 6,301 words) contains zero occurrences of negative control,
  calibration, ground truth, or ability-to-fail. Review energy went to schema
  vocabulary.

**Work list, tagged:**

1. ~~`check-fanout` three-outcome~~ — **done 2026-09-01** (`8881a56`): the
   contribution face no longer ships a gate that reports not-applicable as
   passed.
2. ~~/rigor page counts re-derived from the tree~~ — **done 2026-09-01**
   (site `cb2da49`): 20 skills · 9 commands · 5 agents · 3 hooks · 12 gates.
3. **Emitter demo** — planned: rigor's gates emitting `gen_ai.evaluation.result`
   events carrying negative-control attributes; the prototype the eventual
   issue points at, per the target's own contribution rules.
4. **Full issue-tracker scan** — planned: the founding PR is scanned; the
   tracker is owed before "no filed issue on evaluator-can-fail evidence"
   can claim confirmed absence.
5. **File + article** — blocked by design on the baseline lane's first landed
   contribution.

**Article material already banked:** the self-applied negative-control story —
rigor's own evaluator (`git-guard`) caught refusing a read-only command for
five weeks, found by harvesting a past session (ADR-0014), fixed with three
twins proving no blocked verb was weakened; and `check-fanout`'s
not-applicable-as-passed misfire, closed pinned. The credible version of
"evaluators that never fail" is told on ourselves first.

## Adjacent OSS — surveyed, not chosen

- **DQX** — [`2026-07-21-dqx-adjacency-survey.md`](2026-07-21-dqx-adjacency-survey.md):
  the VANTAGE-vs-DQX comparison and the rigor-on-Databricks application notes.
  Written 2026-07-21, five weeks before the facet design — the earliest dated
  record of the ability-to-fail gap applied to a platform. DQX weakens two
  load-bearing semantics by design (row disposition over batch refusal;
  skip-on-unevaluable); tracked, not targeted.
- deequ/PyDeequ, Great Expectations, Pandera, Langfuse, Arize Phoenix,
  OpenEvals — surveyed in the operator's portfolio index (2026-08-31);
  candidates for telemetry arcs, none currently a filing target. LangSmith
  ruled out (hosted platform).

## Unverified — halt-gated before any of it appears in print

- OTel: full issue-tracker scan (item 4); GenAI convention stability/pinning
  state at filing time (pin to a commit and date it — the field names may move).
- OpenLineage: whether any GE/dbt/Spark integration already emits
  failure-demonstration evidence (scan at a pinned commit); docs-vs-blog path.
- CDM: `WorkflowStep` 7.1.0 proposed/rejected/approval semantics; FINOS
  contribution path (CLA, Rosetta tooling); whether the AI Governance
  Framework is the better first landing; the EMIR Refit action-type table
  against current validation rules.
- The operator's 2026-08-31 portfolio index described the /rigor page with
  counts from its 08-14 vintage; the live page had been refreshed 08-23. Any
  future index re-derives from the live pages at write time.
