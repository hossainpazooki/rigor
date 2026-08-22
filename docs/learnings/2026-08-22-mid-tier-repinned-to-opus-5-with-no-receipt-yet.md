# 2026-08-22 - mid tier repinned to opus 5 with no receipt yet

ts: 2026-08-22T20:01:03Z
commit: c04d55b
session: 1b845026-b1af-4fd8-b589-7cdf5e2dce7a
status: verified
fact: the mid tier now pins claude-opus-5 in config and in both mid-tier agents' frontmatter, tier-sync green - but ZERO receipts in the session's verdict log answered on it (all 3 integration-runner receipts read claude-opus-4-8[1m]), so the re-pin is a config change whose first receipt arrives on the next mid-tier dispatch
basis: date -u -> 2026-08-22T20:01:03Z; git rev-parse --short HEAD -> c04d55b; grep -n '"mid"' config/models.json -> 3:  "mid": "claude-opus-5"; grep -n '^model:' agents/integration-runner.md agents/skeptic-verifier-fast.md -> both claude-opus-5; node scripts/check-tier-sync.mjs -> tier-sync: clean (5 agents); grep -c '"answered": "claude-opus-5' docs/plans/2026-08-22-deployment-layer-build.verdicts.jsonl -> 0
re-verify: node -e "const fs=require('fs');console.log('mid:',JSON.parse(fs.readFileSync('config/models.json')).mid,'| opus-5 receipts:',(fs.readFileSync('docs/plans/2026-08-22-deployment-layer-build.verdicts.jsonl','utf8').match(/claude-opus-5/g)||[]).length)"
