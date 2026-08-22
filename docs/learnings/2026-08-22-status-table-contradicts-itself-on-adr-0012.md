# 2026-08-22 - status table contradicts itself on adr 0012

ts: 2026-08-22T16:26:35Z
commit: a8f1bb6
session: 1b845026-b1af-4fd8-b589-7cdf5e2dce7a
status: verified
fact: STATUS.md (stamped 2026-08-18) carries the 08-19 handoff's settlements in its skill rows but still has an ADR-0012 row reading "accepted, nothing built", and labels the re-audit sweep a "skill" that has no skills/ folder (the 14-skill ceiling excludes it)
basis: grep -n "ADR-0012\|re-audit sweep (ADR-0012)" docs/STATUS.md -> 30: re-audit sweep (ADR-0012) | skill + target-repo generator | **settled (scoped)** ...; 36: ADR-0012 re-audit sweep | **accepted 2026-08-18, nothing built** | design only ...; ls skills | grep -i sweep -> no match; docs/SYSTEM.md:220-221 "the re-audit sweep it proposes stays out of this list until it has actually fired"
re-verify: grep -c "nothing built" docs/STATUS.md; ls skills | grep -ci sweep
