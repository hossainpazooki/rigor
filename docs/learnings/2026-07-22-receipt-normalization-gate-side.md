ts: 2026-07-22T18:42:11Z
commit: 7e51117 (receiptMatches uncommitted at capture — operator commits pending)
session: 10d1e5e1-afa3-40ab-97bd-6ddbf851cfce (fanout-loop build)
status: verified

fact: Gate-side receipt normalization is now BUILT — `receiptMatches` in
`scripts/check-dispatch.mjs` accepts an `answered` that is, or unambiguously
token-contains, the requested id, and fails closed when any other configured
tier model is also echoed. This supersedes the 2026-07-19 entry's closing
clause ("gate-side normalization remains unbuilt"); that entry's fact and
basis remain true as written. Bare-id prompt discipline stays recommended —
the gate now tolerates display echoes, it does not invite them.

basis:
```
node --test tests/dispatch-check.test.mjs  # 26 pass, 0 fail — includes:
# 'a worker display-name echo containing the requested id is not a downgrade'
#   (red before receiptMatches, green after)
# 'an answered echoing a second configured model is ambiguous — fail-closed'
```

re-verify: node --test tests/dispatch-check.test.mjs (26 pass); confirm
`receiptMatches('model-j', 'Judgment 5 (model-j)', {judgment:'model-j'})`
is true and `receiptMatches('model-j', 'model-j (fallback: model-c)',
{judgment:'model-j', cheap:'model-c'})` is false via `node -e` one-liners.
