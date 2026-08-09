ts: 2026-07-22T20:22:37Z
commit: e9e38bf
session: 10d1e5e1-afa3-40ab-97bd-6ddbf851cfce (fanout-loop run 5)
status: verified

fact: check-learnings has two undocumented operational limits, both hit on its
first cross-repo sweep. (1) Serialization dialect: its required-field regexes
(`/^(?:- )?fact:/m` shape) accept bare `key:` lines — including, accidentally,
inside `---` YAML frontmatter fences — but reject `**fact:**` bold-markdown
labels, so a substance-complete ledger in that dialect fails wholesale (a
target repo's 13 entries → exactly 39 = 13×3 failures; sed-normalizing ONLY
the three labels on copies → clean 13/13, proving pure serialization). The
kit's cross-repo contract never states the serialization. (2) CWD: the
append-only leg shells out to git, so the gate must run FROM INSIDE the target
repo — invoked from rigor against an external path it fails closed with
"append-only check unevaluable".

basis:
```
$ node /c/.../rigor/scripts/check-learnings.mjs <external-repo>/docs/learnings   # from rigor cwd
fatal: ... is outside repository at 'C:/Users/hossa/dev/rigor'
LEARNINGS FAIL: git diff unavailable — append-only check unevaluable
$ cd <target-repo> && node /c/.../rigor/scripts/check-learnings.mjs docs/learnings
LEARNINGS FAIL 2026-07-20-...: missing or malformed required field: fact   # ×39 = 13×3
# skeptic experiment (run wf_7824e937-c28): copies + sed 's/^\*\*fact:\*\*/fact:/;...'
# → findLedgerViolations clean (13 entries)
```

re-verify: cd ~/dev/closed-loop-default-detection && node ~/dev/rigor/scripts/check-learnings.mjs docs/learnings  # exits 1 with exactly 39 fact/basis/re-verify failures until the serialization decision lands
