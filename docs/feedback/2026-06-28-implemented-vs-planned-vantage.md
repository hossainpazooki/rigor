# implemented-vs-planned — first independent domain (VANTAGE)

2026-06-28 · `implemented-vs-planned` · helped · point-in-time SEC fundamentals lakehouse
(VANTAGE) · **First independent domain.** The build's final summary held the
implemented-vs-validated boundary without prompting: `Pipeline.main` named as a `println`
stub ("the engine is tested" vs "you can point it at `2023q2` and get a gold table" — the
TSV read path was never built, the plan's Open Item #1); CI workflow "*defined*, exact
sequence verified green locally, **not** yet run on GitHub Actions — don't claim a passing
badge"; Databricks bundle "*configured*, **not** deployed/validated — verb is
'ships/configures,' not 'deployed'." No aspirational work presented as built. Verified
against transcript L924/L934 and the committed tree (`main()` is a stub in `Pipeline.scala`;
`runFromFrames` is the real, tested path).
