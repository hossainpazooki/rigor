# 2026-08-22 - skeptic read commit date as provenance

ts: 2026-08-22T16:45:00Z
commit: a8f1bb6
session: 1b845026-b1af-4fd8-b589-7cdf5e2dce7a
status: verified
fact: a judgment-tier skeptic asserted an uncommitted working-tree edit "landed 2026-08-18" because git log -1 -- <file> dates the last COMMIT, not the working copy; a provenance claim must cite the blob (git show HEAD:<path>), never the file's commit date
basis: skeptic verdict (wf_84bdc01c-0cd): "scripts/check-runlog.mjs:22 already reads 'Supersession resolver...' ... git log -1 -- scripts/check-runlog.mjs => ccf3ed1 2026-08-18 ... the export was built before the ADR existed"; recompute: git show HEAD:scripts/check-runlog.mjs | grep -c resolveSupersession -> 0; git diff --stat scripts/check-runlog.mjs -> 29 insertions(+), 12 deletions(-)
re-verify: git show HEAD:scripts/check-runlog.mjs | grep -c resolveSupersession
