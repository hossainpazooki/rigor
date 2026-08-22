# 2026-08-22 · deployment layer (ADR-0013) · authored · 0 independent domains

Authored entry, same shape as the 2026-06-26 `verify-the-effect` authored entry:
it records the starting point so the ledger shows what the layer was credited
with on the day it was written — **nothing**.

## What was authored

ADR-0013 (**Proposed**) and, under it, six skills, one check gate, one hook, one
shared shell normalizer, and a `git-guard` hardening. Every unit enters
**provisional**. Full unit list and the build record:
`docs/plans/2026-08-22-deployment-layer-build.md`.

## What it is credited with today

- **Independent domains survived: 0.** No change has been proposed, refused, or
  authorized through it in any repo.
- **Live runs: 0.** The 2026-06-27 audit's caveat applies verbatim: *every catch
  was static/record-level, not a live probe against a running system.* The first
  exercise is a record-level rehearsal on a real rendered overlay in the first
  domain (`docs/audits/2026-08-22-deployment-layer-first-domain-rehearsal.md`),
  which is **use**, not a domain.
- **Twins seen red:** only the fixture twins in `tests/` (in-repo use, the same
  category as every other gate's test suite) and whatever the rehearsal records
  against the real overlay. Neither opens a domain.
- **Review controls credited: 0 of 4.** A review shape is credited only after a
  named reviewer refuses a seeded known-bad proposal and the refusal is logged
  here. No such firing exists.

## What the first draft got wrong, on the record

The ADR's first draft was refuted the same day by three judgment-tier skeptics
(verdict log: `docs/plans/2026-08-22-deployment-layer-build.verdicts.jsonl`,
`check-dispatch` clean). Two blocking findings and the one skeptic misfire are
in the build record. They are recorded there rather than here because they
are about a document, not a component firing — but the layer's promotion
arithmetic starts from a refuted first draft, and that is worth a line in the
ledger a future reader will actually open.

## What would move it

One non-origin repo where an agent's deploy-shaped command is refused by the
hook on a real missing-evidence condition, or a real proposal is refused by the
gate on a real twin-class defect, with the gate re-run by the operator. Two such
repos, and a reviewer-level firing for each review shape, before any row in
`docs/STATUS.md` reads other than provisional.
