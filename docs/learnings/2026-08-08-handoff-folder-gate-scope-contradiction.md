ts: 2026-08-08T17:44:00Z
commit: 903759f
session: fcb0d613-5fe9-439c-8124-ec75edc46c36 (fanout-loop run 6, pre-dispatch calibration)
status: verified

fact: rigor's own sources contradict each other on whether `check-learnings`'
field-record schema applies to `docs/handoff/` folders. The plan doc says do
NOT point the script at `docs/handoff/`
(docs/plans/2026-07-12-ledger-kit-plan.md:60-63); the tool itself accepts
`HANDOFF.md` as a valid index (index-file regex `^[A-Z]+\.md$`) and AGENTS.md
calls handoff the "same index-plus-entries shape". Empirically every handoff
brief — including rigor's own — fails all seven field checks by construction
(briefs are prose, not field records), so pointing the gate at a handoff
folder reds any adopter regardless of discipline. Adjudicating an adopter on
that red is gate misapplication per the plan doc, or a non-conformance per
the tool's implied scope: the contract must pick one.

basis:
```
# calibration, minutes before the run-6 dispatch (launched 17:52Z):
cd ~/dev/rigor && node scripts/check-learnings.mjs docs/handoff
LEARNINGS FAIL 2026-07-15-rigor-loop-engineering-conclusion.md: missing or malformed required field: ts
LEARNINGS FAIL ... (commit/session/status/... — rigor's OWN briefs fail all field checks)
# plan doc line vs tool: run-6 primary skeptic quoted
# docs/plans/2026-07-12-ledger-kit-plan.md:60-63 "do not point the script at
# `docs/handoff/`"; the vote countered with the tool's HANDOFF.md index
# acceptance + AGENTS.md "same shape" prose. Both readings verified real.
(ts approximated to the calibration run — the nearest captured clock)
```

re-verify: node scripts/check-learnings.mjs docs/handoff
