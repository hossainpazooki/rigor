---
description: Execute a written implementation plan wave by wave — fresh implementer and spec/quality reviewer per task, bounded fix loop, integration gate and commit block per wave, whole-branch refutation on the last wave, ledger that survives compaction. Agents never write history.
status: provisional
---

Invoke the `execute-plan` skill on the plan at the path below. Run
`scripts/plan-waves.mjs` on it first and refuse to proceed on exit 2; read
the progress ledger before dispatching; dispatch one wave per Workflow run
with tiers from `config/models.json`; halt the wave to me on `BLOCKED`,
`NEEDS_CONTEXT`, a third failing review, or a red gate; emit each wave's
commit block for me to run and wait for the new HEAD before the next wave;
refute the plan's claims on the last wave. Re-run the named gate yourself
after every wave — the workflow's green is a claim.

$ARGUMENTS
