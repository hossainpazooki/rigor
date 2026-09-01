# DQX adjacency survey — VANTAGE vs DQX, and rigor applied on Databricks

**Provenance.** Written 2026-07-21/22 as an uncommitted addendum (§4–§5) to
[`../comparisons/2026-07-21-dataeng-landscape-deep-research.md`](../comparisons/2026-07-21-dataeng-landscape-deep-research.md);
the authoring session's transcript is no longer recoverable, so whether these
sections went through that document's kill-it-seven-times verification is
unknown. Moved here 2026-09-01 under the contributions umbrella
([`STRATEGY.md`](STRATEGY.md)), where DQX is **adjacent OSS — surveyed, not
chosen**. Internal claims were re-verified against the tree on 2026-09-01
(`GATE-B-WAP-EVIDENCE.md` exists; `gate_b_mutate_twin.py:12` refuses paths
without "twin"; the 429,949 mutated-row count appears in the Gate B record;
`code_sha: unknown` is still open). **External DQX claims (issue #609,
quarantine semantics, `compare_datasets`) carry no fresh verification.**

Status note: §5 predates the 2026-08-18/19 settlements — the four data-eng
skills it calls "existing components, one live-proven" are since settled
(scoped). A dated survey that under-claims is left as written.


## 1. VANTAGE vs DQX — same stack, different question

Basis: DQX facts from the verified findings above; VANTAGE facts from its live Gate B
record (`vantage/docs/GATE-B-WAP-EVIDENCE.md`, publish credited 2026-07-19) and tracked
docs. Not a head-to-head of equivalents — the two answer different questions on the same
platform.

**What each is.** DQX is a general-purpose row/dataset validation *library*: declarative
checks, two severities (error/warn), row dispositions (drop, mark, quarantine), streaming
support, pre-commit filter-before-write. VANTAGE's gate is a *domain oracle*: eight
PIT-specific invariants (A1 no-lookahead through A6 registry-sane) over `as_of` semantics
that DQX has no vocabulary for — no DQX check type can express "no row may be visible
before its filing was accepted, across restatements."

**Where they genuinely differ in philosophy:**

- **Row disposition vs batch refusal.** DQX's model drops/marks/quarantines *rows* and
  continues. VANTAGE refuses *quarters whole* (five 2011–2012 quarters refused on
  natural-key collisions rather than deduped) — a collision is a finding, not a filter.
  Quarantine semantics would have silently laundered exactly the defects VANTAGE's
  refusals surfaced.
- **Unevaluable.** DQX skips an invalid check and continues (issue #609); VANTAGE's audit
  is three-outcome fail-closed — the Gate B audit exits 2 and halts when it cannot
  evaluate. This is the field-wide coercion gap of §1 showing up *within one platform*.
- **Audit trust.** DQX ships no mechanism to prove its checks would fire; VANTAGE's
  publish was credited only after the same audit went red on a mutated twin at exactly the
  planted count (429,949). Nothing stops DQX checks from being wrapped in the same
  twin-red discipline — that wrapper is rigor's layer, not DQX's or VANTAGE's.
- **Deequ succession.** VANTAGE replaced Deequ with a native DataFrame gate for the
  serverless port (`GateContract`); DQX is Databricks Labs' own answer to the same
  Deequ-era gaps. Convergent moves — DQX for generic checks, VANTAGE because serverless
  compatibility plus PIT-specific predicates made a small native gate cheaper than a
  dependency.

**Should VANTAGE adopt DQX?** Not as a replacement — the eight invariants and the
fail-closed/refusal semantics are the load-bearing parts and DQX weakens two of them by
design. Worth tracking for: generic-profile checks on *bronze* ingest (where row-level
explanations and quarantine are the right semantics for malformed source rows, before the
batch-refusal boundary), and `compare_datasets` as a maintained diff primitive for
rerun-twice-and-diff. If DQX's outcome model ever gains a halt-on-unevaluable mode, the
calculus improves.

## 2. How rigor would help on Databricks — proposals, tagged

Status honesty: everything below is **application of existing components**, one of them
live-proven on Databricks (the Gate B firing), the rest proposals shaped by it. Nothing
here is shipped Databricks-specific surface — per ADR-0002, rigor ships discipline, not a
platform validator.

1. **`verify-the-effect` on job runs — live-proven.** A Databricks job's success status is
   a self-report; the Gate B pattern probes the *published tables* instead: expectations
   pre-derived from an independent source (the local lake), a pre-publish negative
   control, `check-effect-probe` as the credit gate. This ran end-to-end on serverless
   2026-07-19 (workspace counts row-for-row against local). Generalizes to any
   job/DLT-pipeline "succeeded" claim.
2. **Fail-closed layering over DQX or expectations — the §1/§4 gap, closed at the agent
   layer.** Where DQX skips an unevaluable check or a framework coerces an error into
   fail, the agent applying `data-quality-fail-closed` treats the run as HALT — the same
   move GE's preserved `exception_traceback` enables (finding 1: the three-outcome policy
   is buildable on top; rigor is that top layer).
3. **Twin-red before promotion.** Databricks-side WAP (staging schema / branch / clone →
   audit → promote) gets the publish-credit rule: mutate a *clone* of the candidate
   (VANTAGE's `gate_b_mutate_twin.py` is the template — refuses paths without "twin"),
   demand the audit goes red, then promote. Cheap on Delta clones; unpracticed in any
   surveyed tool (§3).
4. **Receipts for orchestration.** The ADR-0006 receipt discipline (requested vs answered,
   logged, linted) maps to Databricks jobs as: pin the runtime/cluster spec, record what
   actually ran (VANTAGE's open `code_sha: unknown` follow-up is exactly a missing
   receipt), and treat env-var-shaped config on serverless as a known trap (no env vars —
   `KEY=VALUE` args, learned live).
5. **`pick-up` against workspace state.** Sessions resuming Databricks work verify the
   brief's claims against the *workspace* (job runs, table versions via DESCRIBE HISTORY),
   not local state — the auth quirk (`databricks auth login` stores a token but writes no
   profile from non-interactive shells) is recorded in VANTAGE's docs and belongs in any
   pick-up's environment checks.

The one-line version: Databricks provides the *mechanisms* (branches, clones, expectations,
DQX, job orchestration); rigor supplies what §3 found missing field-wide — the credit
rules that make a green mechanism believable.
