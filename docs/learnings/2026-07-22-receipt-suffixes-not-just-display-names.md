ts: 2026-07-22T19:00:20Z
commit: e78e902
session: 10d1e5e1-afa3-40ab-97bd-6ddbf851cfce (fanout-loop run 4)
status: verified

fact: Receipt drift is not only display names — the first live mid-tier
dispatch answered `claude-opus-4-8[1m]` (a context-variant suffix appended to
the bare id) against requested `claude-opus-4-8`, even with the bare-id
receipt prompt. The old exact-equality check-dispatch would have flagged this
as a silent downgrade; `receiptMatches`' token-containment normalization
accepted it correctly on its first real log. Variant suffixes (`[1m]`) join
display names as a known receipt-echo class.

basis:
```
$ node scripts/check-dispatch.mjs docs/efforts/backlog-settlement/runs/run-4-verdicts.jsonl
dispatch: clean (3 records)
# record 3: requested claude-opus-4-8, answered claude-opus-4-8[1m]
# (token boundary: '[' is outside [A-Za-z0-9-], so containment matches;
#  no other configured tier model echoed, so no ambiguity fail-close)
```

re-verify: node -e "import('./scripts/check-dispatch.mjs').then(m => console.log(m.receiptMatches('claude-opus-4-8','claude-opus-4-8[1m]',{judgment:'claude-fable-5',mid:'claude-opus-4-8',build:'claude-sonnet-5'})))"
