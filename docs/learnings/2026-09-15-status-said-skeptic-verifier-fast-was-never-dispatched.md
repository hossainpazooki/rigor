# 2026-09-15 - STATUS said skeptic-verifier-fast was never dispatched

ts: 2026-09-15T01:11:57Z
commit: 8f91906
session: 44a40c81-affc-4987-b881-bf7aec377496
status: verified
fact: docs/STATUS.md said `skeptic-verifier-fast` was "still never dispatched" - written in 226a531 (2026-08-18), "re-confirmed" at the 2026-08-22 stamp, and cited by the ADR-0011 row as that ADR's motivating fact - but session transcripts carry Agent-tool dispatches with subagent_type `rigor:skeptic-verifier-fast` at 2026-08-18T20:21:28Z and 20:31:42Z (the same two tool calls appear in transcripts 741f21a6 and 3ca345ea) and two more on 2026-09-11 in another workspace, and the repo's own committed verdict logs have carried mid-tier verifier votes since 2026-07-22 (backlog-settlement run 4). A "never happened" claim was re-confirmed without searching the places the event is recorded. On 2026-09-14 this session repeated the error in STATUS ("first dispatched 2026-09-14") until a round-2 skeptic searched the transcripts.
basis: at 2026-09-15T01:11:57Z: grep of ~/.claude/projects/*/*.jsonl for `"subagent_type":"rigor:skeptic-verifier-fast"` -> 4 transcripts with the timestamps above, each an assistant Agent tool_use; `grep -c '"dispatch_tier": *"mid"'` over tracked *verdicts.jsonl -> backlog-settlement run-4 1 (added 1467125, 2026-07-22), run-5 1 and run-6 1 (added 1d980d4, 2026-08-09), payment-loop-randomized run-1 3 (added 6565f02, 2026-08-13); `git log -S'still never dispatched' -- docs/STATUS.md` -> 226a531. The verdict logs record the tier, not the agent definition, so they show mid-tier votes rather than which agent answered.
re-verify: git log --format=%h -S'still never dispatched' -- docs/STATUS.md
