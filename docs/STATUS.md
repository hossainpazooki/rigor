# Status: what's proven, what isn't

State as of 2026-07-18. (Moved out of the README 2026-07-18.) The source of
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
| `data-quality-fail-closed`, `no-lookahead`, `idempotent-restatement`, `lineage-replay` | skills | provisional — built 2026-07-02, no independent data-eng domain survived yet. A publish-boundary firing was designated 2026-07-18 to their **origin** repo (ADR-0005 addendum): it exercises the discipline but cannot count as the independent domain |
| `judgment-dispatch` | skill | provisional — built 2026-07-07; its frontmatter pin mechanism is live-verified (non-vacuous probe, [plan](plans/2026-07-07-judgment-dispatch-plan.md)), but no independent domain has run through the rubric yet |
| `integration-runner`, `repo-cartographer`, `skeptic-verifier-fast` | agents | provisional (`skeptic-verifier-fast` shares the settled canonical body, but its cheap-tier verdict quality is unproven) |
| all 7 commands, both hooks, all 8 check scripts | commands / hooks / gates | provisional (`check-citation-fidelity` carries a logged limit: insufficient for numeric provenance; `check-tier-placement` built 2026-07-18, non-vacuity verified red on a real collapsed run, no independent domain yet) |

The misfires stay in the table on purpose — a verification toolkit that hides
its own false refutations would be its own counterexample. Full dated entries:
[`feedback/`](feedback/) — filenames are `YYYY-MM-DD-<topic>.md`, so the
listing reads oldest-first; scroll to the bottom for the newest entries.
