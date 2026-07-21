# 2026-07-21 — rigor's data-eng modules vs the open-source landscape (deep research)

Method: deep-research workflow `wf_95915aad-5bb` — 5 search angles, 15 fetched sources,
3-vote adversarial verification per claim (2/3 refutes kill), 103 agents across three
resumed runs. **7 broad-form claims were refuted in verification and excluded** — every
surviving claim is per-tool documented absence, never "unpracticed anywhere." Confidence
labels are the survivors' vote records.

## 1. Per-tool comparison against rigor's four semantics

| Tool | Fail-closed unevaluable? | Restatement/lookahead testing? | Audit-mutation control? | Replay-diff lineage? |
|---|---|---|---|---|
| **Great Expectations** (0.18→1.x) | **No — fail-open by default in production**: `catch_exceptions` coerces evaluation errors into `success=False`; outcome model strictly binary; error evidence survives in `exception_traceback`, so the three-outcome policy can be built *on top* — the exact layer rigor occupies (3-0 ×3, high) | no | no | no |
| **Databricks Labs DQX** (2025–26, most VANTAGE-relevant) | **No — opposite**: invalid/unevaluable check is *skipped* and folded into the failure channel while the pipeline continues (issue #609); two severities (error/warn) + row dispositions; its critique of Deequ/GE never mentions outcome semantics (3-0/2-1 ×4, medium — one binary-model characterization was refuted and corrected) | no | no (zero doc hits for mutation/negative control across 2.3MB) | `compare_datasets` is a real diff primitive to build rerun-twice-and-diff on |
| **SQLMesh** | **Closest practitioner of fail-closed**: audits blocking by default, plan halts on failure. But: zero-rows=pass means an audit over an empty/absent partition **passes vacuously** — unevaluable coerced to *pass*, the exact failure mode rigor's third outcome targets; isolation holds on the `plan` path only, not `run` (audit fires after bad data is already in prod) (3-0 ×3, high) | no | no (escape hatches are skip/blocking:false) | no |
| **Feast** | **Fail-open**: unjoinable rows silently null and proceed (issue #4133); GE-backed validation binary | **PIT by construction over append-only logs — precisely the case rigor warns passes while leaking on restatements**; no restatement handling documented (3-0 ×2, high) | no | no |
| **Iceberg WAP / AWS reference / lakeFS / Nessie** | The WAP gate *shape* is established, vendor-documented practice since Netflix ~2017 / AWS Dec 2024 — rigor's publish-credit rule builds on prior art, does not invent the slot (3-0) | — | The AWS reference describes no negative-control test of the audit (supporting claim refuted on a technicality, direction unrebutted) | — |
| **JENGA** (EDBT 2021) | — | — | **The nearest ancestor**: SchemaStresstest injects corruptions and checks the validator fires, false-negatives as the signal. But: dormant (last release 2022, ~43 stars), offline research harness — no publish gate, no credit rule (3-0 ×2, high) | — |
| **datacontract-cli** | Only a "passed" state documented (three-outcome claim refuted for over-specificity) | no — Databricks path is Spark SQL, not Delta-log-aware; no as_of exercise (3-0, high) | no | `changelog` is contract-doc diff only |

## 2. Projects VANTAGE and rigor should track

- **Databricks Labs DQX** — same stack as VANTAGE, active 2025–26; watch its outcome-model
  evolution (issue #609) and `compare_datasets`.
- **SQLMesh** — plan-path isolation + blocking audits is the closest shipped fail-closed
  stance; its vacuous-pass gap is a concrete upstream-issue opportunity.
- **datacontract-cli** — Databricks-connected contract testing; complements, does not
  cover, PIT-correctness ground.
- **Iceberg WAP branching / lakeFS** — the maturing publish-isolation substrate.
- **JENGA** — citable prior art for audit-mutation; its dormancy is the gap statement.
- **Feast** — PIT-join prior art whose append-only construction is the named blind spot.

## 3. Uniqueness assessment (capped by the 7 refutations)

Every rigor primitive has prior art in *shape*: WAP gates, blocking audits, PIT joins,
dataset diffing, validator stress-testing. What is absent from every surveyed tool's
documented, enforced surface is the **semantic layer**: (1) unevaluable as a first-class
third outcome that halts — every surveyed framework coerces it somewhere (GE→fail,
DQX→skip-and-continue, SQLMesh→vacuous pass, Feast→silent null); (2) restatement-based
testing of lookahead seams (surveyed PIT tooling is append-only by construction);
(3) audit-mutation negative controls as a *publish-credit precondition* (vs an offline
research harness); (4) replay-diff with content-addressed identity as the *credit rule*
for a reproducibility claim. The defensible statement — and the only one that survived
adversarial verification — is **per-tool documented absence across the surveyed field,
not universal novelty**. rigor's positioning ("what WAP's audit slot is missing") is
consistent with the evidence; "unpracticed anywhere" is not, and was killed 7 times.

*(Low-confidence corroboration: a representative practitioner DQ taxonomy (2024) contains
none of the four module concerns — one blog snapshot, labeled as such.)*
