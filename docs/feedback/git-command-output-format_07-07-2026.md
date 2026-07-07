# git-command output format — operator-confirmed "perfect"

2026-07-07 · `git-guard` (human-owned fallback path) · helped · auxiliary
tooling (tic-concept-chat) + deterministic-systems Go
(treasury-intent-controller) · When the guard forces the human-owned-history
fallback, the operator explicitly confirmed the emitted command format as
correct and worth reusing.

**Evidentiary basis (honesty line):** direct operator feedback this session
("your git command formatting is perfect") — not a self-report, the strongest
kind of data point. The format elements below are the session's own
reconstruction of what was on screen when that was said.

**What was emitted (the confirmed shape).** A two-repo change set; commands were
grouped per repo and per concern:

- **Grouped by repository**, each block opening with `cd ~/dev/<repo>` written
  for Git Bash / MINGW64 (the operator's primary git shell) — POSIX paths, not
  Windows `C:\…` backslashes — so it is copy-paste runnable.
- **One commit per concern**, not a catch-all: a hygiene commit
  (`git rm -r --cached __pycache__`, reason inline) kept separate from the
  feature commit.
- **Inline `#` comments on every non-obvious step**, stating *why* (why untrack
  pycache, what `-u` does), not just what.
- **Sequential steps ending in the push**; conventional-commit subjects, no
  attribution trailers.
- **What was NOT folded in was called out** and left to the operator's decision
  — an untracked file the session did not create, and dated docs now stale —
  rather than silently staged or dropped.
- **Verified-vs-assumed was stated**: working tree checked via read-only
  `git status` / `git log`; the remote was **not** checked, and `git push -u`
  was chosen because it is correct either way.

**Codified.** Promoted from a one-off into a standing convention in the global
git rule (`~/.claude/rules/git.md` → "When you output git commands, format them
this way"), so every session in every repo — including rigor builds — emits
this shape without re-deriving it. This entry is the provenance for that rule.
