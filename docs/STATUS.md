# Status: what's proven, what isn't

State as of 2026-08-18 (rows refreshed by that day's pick-up; prior stamp
2026-07-18, when this table moved out of the README). The source of
truth this table tracks is the promotion ledger,
[`feedback/FEEDBACK.md`](feedback/FEEDBACK.md) — dated entries in
[`feedback/`](feedback/), chronological, newest at the bottom.

rigor applies its own standard to itself. Every component is **provisional**
(extracted from real working sessions, not yet survived ≥2 *independent*
domains as a packaged component) until the ledger records the promotion.
"Settled (scoped)" means settled *for the named scope only*, with unproven
reach kept visible.

| Component | Kind | Status |
|---|---|---|
| `refute` | skill | **settled (scoped)** — 2 domains, for numeric provenance + citation fidelity; reach over semantic/design/omission defects unproven; data-claim moves provisional |
| `skeptic-verifier` | agent | **settled** — 2 domains, **1 logged misfire** (2/4 false refutations on its one independent fan-out domain, caught only by the orchestrator's own re-run) |
| `fanout-build` | skill | **settled (scoped)** — 2 independent domains end-to-end; caveat: same operator both times, second domain smaller with an unstressed verify phase |
| `effect-prober` | agent | **settled (scoped)** — 3 non-vacuous probes, self-verified; unproven: an independent oracle, and the aftermath of a genuine live irreversible action |
| `verify-the-effect` | skill | **settled (scoped)** — 2 domains; the live end-to-end probe gap is closed (paired negative controls, non-vacuity proven by recovery). Unproven: an oracle independent of the gate under test, and a genuinely irreversible external action |
| `pick-up` | skill | **settled (scoped)** — 2 domains; domain 2 is the first time it killed a claim (refuted a recorded test count against its own commit anchor). Unproven: picking up a brief written by someone else |
| `implemented-vs-planned`, `fanout-recon-synthesize`, `orchestrate` | skills | provisional (1 independent domain each) |
| `gate-discipline` | skill | provisional — 1 domain (first firing 2026-07-14: refused to credit a built-but-unmerged ADR as accepted) |
| ledger kit (`docs/learnings/` + `docs/handoff/`) | convention + gate | provisional — 1 domain, **1 logged misfire**: its first non-origin use produced a record whose basis did not reproduce, and the form gate passed it green. Hardened; the limit stands — a form gate never verifies that a basis is genuine |
| `data-quality-fail-closed` | skill | **settled (scoped)** — 2 non-origin domains (CLDD v3 publish gate 2026-07-19; **PARALLAX re-audit sweep 2026-08-18** — three-outcome gate red on a planted-drift twin at exactly the planted magnitude AND on a real ROT, negative control clean). Same-operator caveat both domains. Domain 1: **first non-origin domain 2026-07-19** (a three-outcome fail-closed audit at a real publish boundary, seen red on a staged twin and on two real defects; 1 of the ≥2 promotion needs; same-operator caveat) |
| `lineage-replay` | skill | **settled (scoped)** — 2 non-origin domains 2026-08-18 (PARALLAX claim replay; **passed-vs-true-demo batch replay-and-diff**: 5/5 artifacts bit-identical, manifest delta exclusively commit shas, zero contentHash changes). The standing "unconfirmed as a true replay-diff" gap is **closed**. Same-operator + sibling-coupling caveats |
| `idempotent-restatement` | skill | **settled (scoped)** — move 1 on 2 non-origin domains 2026-08-18 (pvt-demo ingest; correct-shaped-lies sweep), each run twice and diffed identical, CSL additionally reproducing the pinned artifacts. **Moves 2–3 closed at tic 2026-08-18**: explicit first-writer-wins tiebreak, exercised with two intents on one key, and the test proven to discriminate against a last-writer-wins overlay twin. All three moves exercised, split across repos |
| `no-lookahead` | skill | **settled (scoped)** — 2 non-origin domains 2026-08-18: PARALLAX PIT gate (live PASS 440,661 evaluated; 935,935-row good subset PASS; known-bad twin **RED** on C1+C3) and **tic's durable feed** (as-of view immutable across a close/reopen restatement; planted backdated record **caught**). Scope: a timestamped instant at PARALLAX, a monotonic sequence at tic |
| re-audit sweep (ADR-0012) | skill + target-repo generator | **settled (scoped)** — 2 domains 2026-08-18: PARALLAX lane 1 (7 claims swept, 6 verified / **1 ROT**, 2 self-defects found and pinned before crediting) + passed-vs-true-demo (drifted sibling pins correctly classified **drift, not rot**; single-digit planted mutation caught) |
| `judgment-dispatch` | skill | provisional — built 2026-07-07; its frontmatter pin mechanism is live-verified (non-vacuous probe, [plan](plans/2026-07-07-judgment-dispatch-plan.md)). **Candidate firings, uncredited:** tier routing ran in backlog runs 4–6 and payment-loop run 1, receipts three-way and `check-dispatch` clean each time — but no adjudication has moved it, and per the standing rule a log indexes a candidate while only a gate re-run moves a status |
| `integration-runner`, `repo-cartographer`, `skeptic-verifier-fast` | agents | provisional (`skeptic-verifier-fast` shares the settled canonical body, but its below-judgment verdict quality is unproven — **still never dispatched**, re-confirmed 2026-08-18: no verdict record in either effort carries an `agentType`, and the one committed workflow script dispatches generic agents with a `model:` pin. A mid *tier* running is not this *agent* running) |
| all 8 commands, both hooks, all 10 check scripts | commands / hooks / gates | provisional (`check-citation-fidelity` carries a logged limit: insufficient for numeric provenance; `check-tier-placement` built 2026-07-18, non-vacuity verified red on a real collapsed run, no independent domain yet; `check-runlog` built 2026-07-22 on ADR-0004's 4th-run condition, 20 tests incl. supersession — its built-but-unwired residual was found and closed 2026-08-18: wired into `fanout-loop` step 5, incident pinned as the first closure-ledger record) |
| `learn-from-misfire` + `check-misfire-closure` | skill + gate | provisional — **built 2026-08-18, zero firings.** ADR-0010 **Accepted 2026-08-18** (built same day pre-ratification on operator direction, since regularized); the ledger schema is ratified. Red path proven: 21 tests, and all three CLI outcomes demonstrated on real fixtures (exit 0 closed / exit 1 on a pin with no red-proof / exit 2 on an open record), with a negative control showing a fully-closed ledger passes. **First live record 2026-08-18** (same day): the check-runlog wiring incident, forward-captured and closed pinned with a red-first proof — use, not an independent domain. The retrospective survey below remains an audit, not a firing |
| ADR-0011 verifier-calibration ledger | **accepted 2026-08-18, nothing built** | no folder, no gate, no config yet; demotion scope must be decided before the first control dispatch. Its motivating fact is measured, not assumed: `skeptic-verifier-fast` has never been dispatched (2026-08-18), so the mid-tier rung's verdict quality is entirely unmeasured |
| ADR-0012 re-audit sweep | **accepted 2026-08-18, nothing built** | design only, sequenced last. Records the ADR-0005 resolution-2 unblock (its precondition, ADR-0004's pilot evaluation, was discharged 2026-07-14); opening the work still needs an explicit operator go |

The misfires stay in the table on purpose — a verification toolkit that hides
its own false refutations would be its own counterexample. **Their closure is now
surveyed too** (2026-08-18, [`audits/2026-08-18-misfire-closure-survey.md`](audits/2026-08-18-misfire-closure-survey.md)):
of 13 recorded misfires, **5 are pinned by a test, 0 are declined on the record,
and 8 are open** — including two that read as "fixed" in this table but have no
regression test. Under `check-misfire-closure`'s own rule that shape is
**unevaluable (exit 2)**, not passing. Full dated entries:
[`feedback/`](feedback/) — filenames are `YYYY-MM-DD-<topic>.md`, so the
listing reads oldest-first; scroll to the bottom for the newest entries.
