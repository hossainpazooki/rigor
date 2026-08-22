# 2026-08-22 - git show head relative path refuses uncommitted

ts: 2026-08-22T16:31:00Z
commit: a8f1bb6
session: 1b845026-b1af-4fd8-b589-7cdf5e2dce7a
status: verified
fact: git show HEAD:./<path> resolves the path relative to the cwd (not the repo root) and fails on an uncommitted file, so a hook loading a record that way sees only committed content - but nothing about HEAD proves a human committed it (refuted the same day; see the ADR-0013 build record)
basis: (cd docs && git show HEAD:./STATUS.md | head -1) -> "# Status: what's proven, what isn't"; git show HEAD:./adr/0013-deployment-layer-pre-change-authorization.md -> non-zero exit (not in HEAD)
re-verify: cd docs && git show HEAD:./STATUS.md | head -1
