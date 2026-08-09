ts: 2026-08-08T17:58:30Z
commit: 903759f
session: fcb0d613-5fe9-439c-8124-ec75edc46c36 (fanout-loop run 6)
status: verified

fact: `check-learnings`' append-only leg examines only `git diff HEAD
--name-status` — the working tree against HEAD. A dated entry edited in place
and COMMITTED passes the gate vacuously: the tree is clean, so the clause
examines zero changes. "Gate green" therefore proves immutability only for
uncommitted drift, never for history. Found live in run 6: pvt-demo's ledger
is tracked+clean and two dated entries were nonetheless Modified after their
first commit (A→M in history), invisible to the gate.

basis:
```
# gate source (scripts/check-learnings.mjs, CLI boundary):
changes = execSync(`git diff HEAD --name-status -- "${dir}"`, ...)
# pvt-demo, clean tree (git status --short docs/learnings -> empty), yet:
git log --name-status --format=%h --no-renames -- docs/learnings
  eb2a8f4  M  docs/learnings/2026-07-24-pin-cannot-cover-untracked-artifacts.md
  a645895  M  docs/learnings/2026-07-15-pin-drift-fail-loud.md
  aae103a  A  docs/learnings/2026-07-24-pin-cannot-cover-untracked-artifacts.md
  587d656  A  docs/learnings/2026-07-15-pin-drift-fail-loud.md
# gate run on the same state: exit 1 but ONLY on the status-field regex —
# zero append-only findings. Both run-6 skeptics confirmed independently
# (runs/run-6-verdicts.jsonl, REFUTED ×2).
(ts is the run-6 verdict receipt; the finding is the skeptics', re-confirmed
against the gate source by the orchestrator)
```

re-verify: grep -n "git diff HEAD" scripts/check-learnings.mjs
