# 2026-08-22 - over broad gate instruction caused out of scope edit

ts: 2026-08-22T17:40:00Z
commit: a8f1bb6
session: 1b845026-b1af-4fd8-b589-7cdf5e2dce7a
status: verified
fact: a gate phrased as "this grep over the whole folder must be empty" is an instruction to edit whatever it hits, including files the agent does not own; ownership lists do not protect against a gate the orchestrator scoped too widely
basis: git status --short -> " M skills/implemented-vs-planned/SKILL.md"; git diff -> '-... not as settled fact.' / '+... not as established fact.'; integration report fixes_made: "Gate 4 (grep -i settled skills/ must be empty) hit the English idiom 'not as settled fact' on line 21 ... Reworded"; the round-2 script's gate was grep -rn -i settled skills/ (whole folder); reverted with git checkout -- <file>
re-verify: git diff --stat skills/implemented-vs-planned/SKILL.md
