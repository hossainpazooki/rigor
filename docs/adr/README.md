# ADR index

Status is the ADR's own header line — not a summary of how the work feels. Two columns are kept
apart on purpose: **Status** is what was *decided*, **As built** is what actually *exists in the
tree today*. An accepted decision with nothing built is a plan; saying so is the point
(`implemented-vs-planned`).

| # | Decision | Status | As built | Open |
|---|---|---|---|---|
| [0001](0001-vendor-the-rules.md) | Vendor the working-agreement rules into the plugin — self-contained beats elegant | **Accepted** 2026-06-25 | Built — `rules/` + `rules/PROVENANCE.md` (point-in-time copy of `~/.claude/rules/`); `session-start` injects them only when the host has none (no double-load) | Re-vendor when the source rules change; the copy is dated, not live |
| [0002](0002-dataeng-is-judgment-not-a-universal-gate.md) | Data-eng verification is judgment, not a universal validator — ship discipline, not content | **Accepted** 2026-07-02 | Built — the four data-eng skills + the check scripts. **No universal validator, deliberately** | All four skills are still **origin-only** (VANTAGE); none has a non-origin domain |
| [0003](0003-repo-context-and-learnings-files.md) | Per-repo context (AGENTS.md canonical + CLAUDE.md stub) and anchored learnings records | **Accepted** 2026-07-08, amended **07-12** (folder layout) and **07-14** (capture-time anchoring) | Built — `docs/learnings/` + `docs/handoff/` kit, `check-learnings.mjs`, `handoff`/`pick-up` skill edits, cartographer emits the brief pair, rigor's own AGENTS.md | **1 domain, 1 logged misfire** — first non-origin use produced a record whose basis did not reproduce; gate hardened. Needs a 2nd adopting repo |
| [0004](0004-loop-chassis-rigor-conscience.md) | Loop chassis (STATE.md spine + append-only run log + L1/L2/never-L3 + budget kill switch), piloted on the backlog effort | **Accepted** 2026-07-08 · **pilot SETTLED 2026-07-14** | Built + evaluated — 3 runs / 2 sessions; all five success criteria met (evaluation table in the ADR). Chassis kept and generalized into the ADR-0003 kit | `check-runlog` form gate **not earned** — criterion 2 was met by hand 3×; mechanize on the 4th |
| [0005](0005-wap-composition-and-catalog-drift.md) | WAP is the chassis at pipeline scale, not the conscience; the standing catalog drifts | **Proposed** 2026-07-09 — *not ratified* | Nothing. Zero surface, by design — the ADR is the artifact | ① Operator must ratify the 4 resolutions. ② Resolution 2 (catalog sweep) **unblocked 2026-07-14** by ADR-0004's evaluation, but not started. ③ Needs a first non-origin WAP-shaped firing |

## Reading the statuses

- **Accepted** — the decision is locked; relitigate only if its stated *reason* stops holding
  (`pick-up` move 4 checks premises, never the decision).
- **Proposed** — a recommendation. **Never quote a Proposed ADR's resolutions as practice.**
  ADR-0005 is the live example: its mapping table reads like doctrine and is not yet ratified.
- **Settled** (ADR-0004 only) — an ADR that carried a *pilot* whose success criteria were
  evaluated and met. Distinct from Accepted: acceptance authorized the experiment, settlement
  reports its outcome.

Amendments are dated and appended in place; an ADR is never quietly rewritten. Where an amendment
changed the letter of a decision (0003's folder layout, its §7 dogfooding split, and the
capture-time anchoring rule), the amendment says which clause it revises and why.
