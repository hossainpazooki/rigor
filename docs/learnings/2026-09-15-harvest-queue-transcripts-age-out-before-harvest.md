# 2026-09-15 - harvest queue transcripts age out before harvest

ts: 2026-09-15T01:10:19Z
commit: 8f91906
session: 44a40c81-affc-4987-b881-bf7aec377496
status: verified
fact: ADR-0014's harvest queue ranks sessions by domain-eligible firings, but the transcripts it points at are deleted on a rolling window. Of the 23 sessions queued on 2026-09-01, 8 had no transcript left by 2026-09-14 (1c43d113, fcb0d613, 6435db0b, c4006536, 578f8105, 6c30e95a, 98157576, b6167acd), and the oldest surviving transcript is about 29 days old by mtime while `cleanupPeriodDays` is unset - consistent with a 30-day retention keyed on file mtime (inferred; the deletion rule itself was not read). A queue that ignores deadlines loses the evidence it exists to mine, and "one session per invocation" drains it slower than retention empties it; the queue in docs/harvest/HARVEST.md is now ordered by inferred deadline.
basis: `ls` over ~/.claude/projects/*/<id>*.jsonl for all 23 queue ids during pick-up on 2026-09-14 (before 22:18Z) and again at 2026-09-15T01:10:19Z - the same 8 missing both times; per-id mtimes from the second run are the Transcript column in docs/harvest/HARVEST.md. Oldest surviving transcript at the second run: 0295a4ce, mtime 2026-08-16T18:02:30Z; the oldest at pick-up, f0658af6 (mtime date 2026-08-15), was gone when re-listed at 2026-09-15T01:11:57Z - a transcript deleted during the session itself. `cleanupPeriodDays` absent from ~/.claude/settings*.json (grep, 2026-09-14).
re-verify: ls -1tr ~/.claude/projects/*/*.jsonl | head -1
