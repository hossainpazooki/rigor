# refute misfire — citation-fidelity + dispatch-not-discharge gaps

2026-06-26 · `refute` · misfired (by omission) · payments/regulatory compliance
(ATLAS regulatory-rule-engine) · the same pass surfaced two gaps now being fixed.
**GAP 1 (citation fidelity):** no move caught a claim citing a source that does not
actually contain the named identifier/quote — a fabricated or drifted citation slips
through unless someone reads the source by hand. **GAP 2 (dispatch ≠ discharge):**
refute's dispatch move read as if spawning skeptics discharges the duty, yet the
fabricated citation was caught only by the orchestrator's own direct read of the
source — the fan-out of skeptics collectively missed it. Fixes: new 4th move
**Check citation fidelity** + `scripts/check-citation-fidelity.mjs`, and a
dispatch-move cross-link to `orchestrate` guardrail #8 (independently re-execute at
least one load-bearing check yourself).
