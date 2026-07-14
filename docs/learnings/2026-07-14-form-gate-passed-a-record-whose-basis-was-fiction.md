ts: 2026-07-14T14:57:35Z
commit: 8eb7058
session: 495274ae-4189-4c09-b42d-8027685f9f5b (rigor-loop-engineering)
status: verified

fact: `check-learnings` passed a ledger **green** whose entry quoted a test count that does not exist at the commit the entry anchors to (recorded `39 passed`; actual `46` at the same tree). The gate verified every field, the ordering, and append-onlyness — and could not see that the basis was fiction, exactly as ADR-0003's named residual limit says ("it can never verify the basis is genuine"). The limit is not theoretical: it fired on the kit's first non-origin use, one day after the kit shipped. What caught it was re-executing the entry's own `re-verify:` line. **Design consequence, now encoded:** a form gate is a floor, never a verdict — the ledger's credibility rests on `pick-up` re-running claims, not on the gate going green. The mechanical fingerprint of the failure (all entries sharing one `ts:`, i.e. stamped at write time rather than at capture) IS detectable, and is now flagged — but that detects the *shape* of the error, never the truth of a basis.

basis: same ledger, same commit, one day apart:
```
2026-07-13  $ node scripts/check-learnings.mjs docs/learnings   # tic
            learnings: clean (6 entries)                        # FALSE GREEN
2026-07-14  $ wsl … python3 -m pytest -q                        # the entry's re-verify line
            46 passed                                           # entry claims 39
2026-07-14  $ node scripts/check-learnings.mjs docs/learnings   # after hardening
            LEARNINGS FAIL … ts identical to … — entries stamped at write time, not at capture
            (5 flagged)   exit=1
```

re-verify: `node scripts/check-learnings.mjs <dir>` on a ledger whose entries share a `ts:` must exit 1; and no version of this gate should ever be described as proving a ledger true — see `docs/feedback/2026-07-14-ledger-kit-write-time-stamping-misfire.md`.
