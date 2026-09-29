# 2026-09-29 - A handoff brief is true only until the session's next write

ts: 2026-09-29T22:40:52Z
commit: f710402
session: aae428e0-da70-4149-a7b2-c538ab5bbe38
status: verified
fact: A handoff brief harvested on 2026-09-29 carried two re-verify lines that were false when its session ended. One stated a file count that the same session changed 13 seconds after writing the brief, by adding an index file a gate had asked for. The other stated a pull request was open 12 minutes after it had been merged. The handoff command does not ask for the lines to be run after the brief and the ledger are written. A brief's re-verify lines are evidence only when they are executed after the last write of the session.
basis: at 2026-09-29T22:40:52Z at f710402, record 4 of docs/harvest/ed0788c7.jsonl (committed in 3759d6a): control `handoff`, verdict `misfired`, excerpt "Two lines were false when the session ended. The staged-entries count prints 6 against a stated 5: the session added the index 13 seconds after writing the brief. The pull request line prints MERGED against a stated OPEN: it was merged 2026-09-18T20:27:24Z, 12 minutes before the brief was written." The record is uncredited: the orchestrator's first reading was refuted in part by a judgment-tier skeptic and the record carries the corrected reading. `grep -n "re-verify" commands/handoff.md` -> two lines, neither about running them.
re-verify: node -e "const r=require('fs').readFileSync('docs/harvest/ed0788c7.jsonl','utf8').trim().split('\n').map(JSON.parse).find(x=>x.n===4);console.log(r.verdict,r.reverify.excerpt)"
