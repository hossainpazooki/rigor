# check-citation-fidelity misfire — insufficient for numeric provenance

2026-06-26 · `check-citation-fidelity` (refute move 4) · misfired (insufficient depth) ·
credit-risk ML / causal inference (closed-loop-default-detection) · root-causing the CLDD
§7 defect showed the move-4 check would NOT have caught it. The error was a **numeric
provenance** failure — a 25-seed cross-seed mean (0.0134) mislabeled as a single "seed 42"
measurement, plus level numbers (`0.0734/0.0598`) sourced from nothing. The check is a
**string-substring matcher**: brittle to rounding (`0.0734` is a substring of `0.073412…`)
and it verifies "string appears in *a* source," not "this number equals the output of the
*specific* computation it is attributed to." What actually caught it was move 1 (recompute).
Citation-fidelity is right for identifiers/section-refs/quotes, **insufficient for numbers**.
Candidate fix: a numeric-provenance check — `(claimed_value, source_csv, column, row-filter)
→ assert match within tolerance` — the move-1 mechanization the substring check is not.
