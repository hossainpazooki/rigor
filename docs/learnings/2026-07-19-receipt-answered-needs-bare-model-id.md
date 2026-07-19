ts: 2026-07-19T16:18:29Z
commit: ba58192
session: 0e090857-9de3-4fc5-9b6c-b44b7a2b8ba3 (rigor WAP settlement)
status: verified

fact: The ADR-0006 worker/verifier receipt line ("report the model name verbatim from your own
system prompt") elicits DISPLAY names — `Fable 5 (claude-fable-5)`, `Sonnet 5 (model ID:
claude-sonnet-5)` — unless the prompt demands the bare id. `check-dispatch.mjs` compares
`answered` to `requested` by string equality, so display-name echoes false-positive the
silent-downgrade class: 13/16 receipts flagged on the first live recon run, all false (every
echoed string contained the requested id). Prompt-side fix ("report ONLY the bare model id, no
display name, no parentheses") produced 9/9 clean receipts on the same day's build run and
20/20 across both later runs. Gate-side normalization (accept an `answered` that contains the
requested id, or strip display wrapping) remains unbuilt — prompt discipline is the only
current defense.

basis:
```
$ node scripts/check-dispatch.mjs .../recon-verdicts.jsonl   # first run, pre-fix prompts
DISPATCH FAIL ...: silent downgrade — answered Fable 5 (claude-fable-5) != requested claude-fable-5 ...
(13 such lines, exit 1; every answered string contains the requested id — inspection)
# post-fix runs: cldd-v3-build receipts 9/9 requested==answered exactly;
# VANTAGE gate-b dispatch-log.json → dispatch: clean (10 records)
```

re-verify: rerun `node scripts/check-dispatch.mjs` on the first recon's receipts file (13
failures, all display-name echoes) vs the v3 build's receipts (clean). Until a normalization
ships, any new dispatch prompt must carry the bare-id wording from `fanout-build`'s RECEIPT
pattern.
