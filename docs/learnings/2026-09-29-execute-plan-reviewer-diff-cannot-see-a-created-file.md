# 2026-09-29 - execute-plan's reviewer is told to diff against the base, which shows nothing for a created file

ts: 2026-09-29T22:40:47Z
commit: f710402
session: aae428e0-da70-4149-a7b2-c538ab5bbe38
status: verified
fact: The reviewer prompt tells the reviewer to verify the implementer's report with `git diff --stat <base>` and `git diff <base> -- <files_changed>`. A file the task created is untracked until the human commits, so both print nothing for it. When the human has not yet committed earlier waves, the diff for a file two waves touched shows both. Reviewers in this run were given a snapshot of each file as the previous wave left it and told to use `git diff --no-index`. One reviewer of a task with two created files reported that it had counted their tests and had not compared their text with the plan; the orchestrator compared every built file with its own prototype byte for byte.
basis: at 2026-09-29T22:40:47Z at f710402, `grep -n "git diff --stat" skills/execute-plan/example.mjs` -> line 121, inside the reviewer prompt. `git diff --stat HEAD -- tests/tier-lock.test.mjs scripts/tier-lock.mjs | wc -l` -> 0, while `git status --porcelain` for the same two paths printed `?? scripts/tier-lock.mjs` and `?? tests/tier-lock.test.mjs`.
re-verify: grep -n "git diff --stat" skills/execute-plan/example.mjs
