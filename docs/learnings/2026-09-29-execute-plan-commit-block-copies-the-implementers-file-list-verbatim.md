# 2026-09-29 - execute-plan builds its commit block from the implementer's file list, unchecked

ts: 2026-09-29T22:40:46Z
commit: f710402
session: aae428e0-da70-4149-a7b2-c538ab5bbe38
status: verified
fact: The commit block execute-plan emits takes its paths from the implementer's `files_changed` whenever that list is non-empty, and falls back to the plan's Files list only when it is empty. Nothing checks that each item is a path inside the repository. An implementer that reported absolute paths with an annotation produced a `git add` line that cannot run. The orchestrator rewrote the block by hand and told later implementers to report repo-relative paths with no annotation.
basis: at 2026-09-29T22:40:46Z at f710402, `grep -n "r.impl.files_changed : allFiles(t)" skills/execute-plan/example.mjs` -> line 199. The persisted record of run wf_d8bbc7a4-900 has as the first line of its commit block `git add <repo>\scripts\check-dispatch.mjs (modified) <repo>\tests\dispatch-alias.test.mjs (created)` (the absolute prefix is shortened here to <repo>).
re-verify: grep -n "r.impl.files_changed : allFiles(t)" skills/execute-plan/example.mjs
