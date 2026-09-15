# 2026-09-15 - git-guard cannot see through a git alias

ts: 2026-09-15T01:16:08Z
commit: 8f91906
session: 44a40c81-affc-4987-b881-bf7aec377496
status: verified
fact: git-guard matches the subcommand word, and nothing in hooks/git-guard.mjs or hooks/shell-normalize.mjs resolves aliases, so a git alias bypasses it by name: `git -c alias.ci=commit ci -m x` and `git -c alias.ship=push ship` are allowed by the shipped hook at 8f91906 and by the working tree, as is `git ci -m x` whenever `ci` is an alias in git config, which the hook cannot read. The 2026-09-14 merge fix added one shape to the class: `git -c alias.merge-now=merge merge-now feature` was blocked at 8f91906 only because `merge\b` matched `merge-now`, and is allowed now. Recorded as an OPEN closure with no pin: closing it needs alias resolution - at least inline `-c alias.*` values, plus a ruling on config-file aliases the hook cannot see - which is a design choice rather than a pattern fix. Friction, not a security boundary (ADR-0013).
basis: at 2026-09-15T01:16:08Z, `git -c alias.ver-now=version ver-now` (an alias to a read) printed `git version 2.49.0.windows.1`, exit 0 - git resolves a hyphenated inline alias; a case-insensitive grep for "alias" over hooks/git-guard.mjs and hooks/shell-normalize.mjs matched nothing. decide() table at 2026-09-15T01:14:50Z, 8f91906 vs working tree: `git -c alias.ci=commit ci -m x` allowed/allowed, `git -c alias.ship=push ship` allowed/allowed, `git ci -m x` allowed/allowed, `git -c alias.merge-now=merge merge-now feature` blocked/allowed.
re-verify: grep -n -i alias hooks/git-guard.mjs hooks/shell-normalize.mjs
