# 2026-09-01 - uncommitted work outlives its provenance window

ts: 2026-09-01T22:32:15Z
commit: 13e51e8
session: 1b845026-b1af-4fd8-b589-7cdf5e2dce7a
status: verified
fact: an uncommitted working-tree modification carried across sessions loses its provenance when the transcripts rotate - the 80-line DQX addendum to docs/comparisons/2026-07-21-dataeng-landscape-deep-research.md (authored between the base commit 952e44d on 2026-07-21 and the first brief that carried it, 2026-07-22) has NO authoring record in any surviving transcript, so whether it passed the base doc's kill-it-seven-times verification is permanently unknowable; it was finally resolved 2026-09-01 by absorbing it into docs/contributions/2026-07-21-dqx-adjacency-survey.md with the provenance gap stated in the header, after seven briefs had carried it as "not folded in"
basis: 0 transcripts under ~/.claude/projects/C--Users-hossa-dev/ contain a structural Write/Edit tool_use on the file (grep over all *.jsonl -> 0 files); the oldest surviving transcript is dated 2026-08-03; git log for the file shows exactly one commit, 952e44d. Captured at 13e51e8 with the comparisons file clean (the addendum content now lives under docs/contributions/)
re-verify: sed -n '1,18p' docs/contributions/2026-07-21-dqx-adjacency-survey.md
