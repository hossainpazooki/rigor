# refute — second independent domain (CLDD credit-risk ML)

2026-06-26 · `refute` · helped · credit-risk ML / causal inference
(closed-loop-default-detection) · ran the full spine against the CLDD repo, a domain
independent of both rigor's own files and the ATLAS regulatory work. Re-executed the
gate (`pytest` → **90 passed / 0 failed**, byte-determinism confirmed in-process) and
recomputed numbers from raw artifact CSVs. Caught two load-bearing defects in
`SESSION_HANDOFF.md`: (a) the §7 g-computation numbers attributed to "Measured (seed
42)" — `0.0734→0.0598 (+0.0135)` / `+0.0038` — reproduce from nothing; the raw
`seed_sweep_25.csv` seed-42 rows are `0.0714→0.0635 (+0.0079)` / `+0.0017`, and the
`+0.0135` is the 25-seed cross-seed mean mislabeled as a single seed; (b) the test
count "66" is stale (suite is 90; README already says 90). **Second independent
domain** for `refute`.
