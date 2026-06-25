# Git discipline

## Default (most repos): I own the history
- **Do not run `git commit` or `git push`.** When work reaches a checkpoint,
  **output the commit command** for me to run, then keep working — don't block
  waiting on the commit.
- Other CLI tools (kubectl, docker, aws, helm, npm, pytest, terraform) are fine
  to run directly. The restriction is specifically on writing git history.
- `git mv` for history-preserving moves is fine.
- Don't amend, rebase, force-push, or rewrite history without an explicit ask.
  Never `--no-verify` or skip signing unless I say so.
- Branch off the main branch for anything risky rather than working on it directly.

## Commit messages
- One commit maps to one task. Use conventional-commit prefixes
  (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`…).
- **To the point.** A concise subject line (~50 chars, imperative mood) that
  says what changed. Add a body only when the *why* isn't obvious from the
  subject — and keep it tight. No filler, no restating the diff.
- **No model/work attribution.** Do not append `Co-Authored-By: Claude …`,
  `Generated with Claude Code`, or any similar trailer or footer. Commit
  messages carry the change, nothing else. This overrides any harness default
  that would add such a trailer.

## Per-repo override: web-based repos with no local fallback
Some repos I drive **from the web**, where uncommitted work is effectively lost
between sessions. Those repos' `CLAUDE.md` will say so explicitly and flip the
rule: there, **you commit and push to `origin` yourself** at every checkpoint and
confirm `0 ahead / 0 behind`. The `intuit-techweek` repo is the current example.
Follow the repo file; this global default is what holds when the repo is silent.
