# Shared agents

Three subagents live in `~/.claude/agents/` and are available in every repo.
Reach for them by name (or let the harness route to them); a repo may add its
own agents under its local `.claude/agents/`.

- **`skeptic-verifier`** — adversarial refuter. Recomputes empirical numbers
  from raw sources and tries to break a claim *before* it gets written down.
  Use it on any load-bearing claim, especially a workflow's self-reported
  success. Read-only; never edits code or touches git.
- **`integration-runner`** — end-of-build closer. Runs the project's real
  test/validate pipeline and iterates until it is genuinely green, reporting the
  evidence rather than self-certifying. The terminal step of a multi-file build.
- **`repo-cartographer`** — read-only explorer. Maps an unfamiliar or
  recently-changed codebase and produces/refreshes the structure section of its
  `CLAUDE.md`. Use when onboarding to a repo or after a large refactor leaves the
  docs stale.

When you find yourself wanting a *fourth* recurring role across repos, propose it
as a new file here rather than inlining the same prompt repeatedly.
