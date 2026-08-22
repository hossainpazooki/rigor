# 2026-08-22 - first domain has no protection rules and no successful deploy

ts: 2026-08-22T16:52:29Z
commit: a8f1bb6 (rigor); regulatory-rule-engine d7aba0f
session: 1b845026-b1af-4fd8-b589-7cdf5e2dce7a
status: verified
fact: the first domain's "Requires manual approval" on environment: production is a YAML comment backed by no protection rule; skip-approval is never read; all 41 CD runs failed at startup - no enforced human approval and no successful deploy to date, and the operator's gh token (workflow scope) can dispatch the workflow
basis: gh api repos/hossainpazooki/regulatory-rule-engine/environments/production --jq '{name, protection_rules, can_admins_bypass}' -> {"can_admins_bypass":true,"name":"Production","protection_rules":[]}; all 5 environments rules:0; gh run list --workflow cd-production.yml --limit 100 -> [{"conclusion":"failure","n":20}] (newest 2026-06-11T23:43:06Z); cd-staging.yml -> [{"conclusion":"failure","n":21}]; grep -rn skip-approval .github/ -> only cd-production.yml:10; gh auth status -> scopes include workflow
re-verify: gh api repos/hossainpazooki/regulatory-rule-engine/environments/production --jq '.protection_rules|length'
