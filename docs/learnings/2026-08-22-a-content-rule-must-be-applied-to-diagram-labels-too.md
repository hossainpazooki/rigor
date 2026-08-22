# 2026-08-22 - a content rule must be applied to diagram labels too

ts: 2026-08-22T20:05:00Z
commit: c04d55b
session: 1b845026-b1af-4fd8-b589-7cdf5e2dce7a
status: verified
fact: an instruction to remove ADR references from the README was applied to the prose and missed a mermaid node label, so `grep -c -i adr README.md` still returned 2 at c04d55b - both inside the docs-map diagram added later (`DEC --> ADR["adr/..."]` and its classDef line); a content rule enforced by reading prose does not see diagram labels, and the check that caught it was the brief's own re-verify line failing
basis: (approx ts; between the 20:03:25Z and 20:07:31Z clock readings) executing the handoff brief's asserted re-verify line `grep -c -i adr README.md` -> 2, against a brief claiming 0; `grep -n -i adr README.md` -> `278:    DEC --> ADR["adr/<br/>every decision, decided vs as-built"]` and `287:    class ADR,FB,LG n;`. After removing the node from the diagram: `grep -c -i adr README.md` -> 0, `grep -c mermaid README.md` -> 8, and all 8 blocks still parse ('8 blocks, 0 failing'). The fix is uncommitted at c04d55b
re-verify: grep -c -i adr README.md
