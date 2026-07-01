# orchestrate misfire — subagents idle without auto-delivering

2026-07-01 · `orchestrate` · misfire (partial) · same run · both spawned subagents
(`recon-domains`, `fanout-prober`) went **idle without auto-delivering** their structured
result; each needed an explicit `SendMessage` pull, and `recon-domains` never delivered at
all (backstopped by inline recon). Fanout eventually returned a clean, honestly-caveated
JSON. Reinforces #8: the orchestrator re-ran every load-bearing probe itself; the run did
not depend on either subagent's self-report.
