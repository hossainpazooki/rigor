# 2026-09-01 - resolveSupersession conflated key name with key type

ts: 2026-09-01T22:32:21Z
commit: 13e51e8
session: 1b845026-b1af-4fd8-b589-7cdf5e2dce7a
status: verified
fact: the shared supersession resolver in scripts/check-runlog.mjs decided whether `supersedes` must be numeric by testing `key === 'run'` - the key's NAME stood in for its TYPE, so the first consumer with a numeric key not called "run" (check-harvest's `n`) was rejected with "supersedes must be a non-empty n" on a perfectly valid correction record; fixed by an explicit `numeric` option defaulting to the historical behavior (`numeric = key === 'run'`), so both prior consumers (check-runlog, check-change-record) are byte-for-byte unaffected while new numeric keys state their type
basis: red test at build time: harvest-check.test.mjs "a correction is a new record with supersedes, never an edit" failed with `[{ entry: 'record 1', reason: 'supersedes must be a non-empty n' }]`; after the option landed (commit 08973e5), re-captured at 13e51e8: grep -n "numeric = key === 'run'" scripts/check-runlog.mjs -> line 29, and node --test tests/harvest-check.test.mjs -> 25 pass 0 fail
re-verify: grep -n "numeric = key === 'run'" scripts/check-runlog.mjs
