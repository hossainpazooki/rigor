# 2026-08-22 - and chained verification can report an exit code it never ran

ts: 2026-08-22T20:08:00Z
commit: c04d55b
session: 1b845026-b1af-4fd8-b589-7cdf5e2dce7a
status: verified
fact: `grep -c` prints its count and exits 1 when the count is zero, so a verification chain joined by `&&` silently stops at any zero-match grep - and a trailing `; echo "<name> exit=$?"` then reports the GREP's exit code under the later command's name; while checking this session's handoff brief, `grep -c -i adr README.md` (0 matches, exit 1) skipped both a commit count and check-dispatch, and the echo printed 'check-dispatch exit=1', which is exactly the value check-dispatch was expected to produce - a false confirmation that looked like the real one
basis: (approx ts; between the 20:07:31Z and 20:09:15Z clock readings) the chain `... && grep -c mermaid README.md && grep -c -i adr README.md && git log --oneline 166e94a~1..c04d55b | wc -l && node scripts/check-dispatch.mjs <log> >/dev/null 2>&1; echo "check-dispatch exit=$?"` printed `8`, `0`, then `check-dispatch exit=1` with NO commit count line - the `wc -l` output was absent, proving the chain had already stopped. Re-run as independent statements: commit count -> 8; `node scripts/check-dispatch.mjs <log>; echo exit=$?` -> exit=1 (genuine); `node scripts/check-misfire-closure.mjs docs/learn/closure-log.jsonl` -> exit=2
re-verify: bash -c 'grep -c -i adr README.md && echo REACHED || echo "chain stopped, exit was $?"'
