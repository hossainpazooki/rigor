# Backlog (live work queue)

## Spine remediation — DONE (2026-06-25, independently verified)
The Phase-1 audit's code findings are fixed and re-verified (git-guard bypass
battery 23/23, full suite green, gate clean, no import side-effects). Detail:
[`audits/2026-06-25-spine-audit.md`](audits/2026-06-25-spine-audit.md).
- **git-guard** — env-prefix / global-flag / subshell normalization before
  matching, plus the missing history-write subcommands; 2 false-positives removed.
- **session-start** — sentinel-driven injection (a host's own `~/.claude/rules` no
  longer suppresses the vendored copy), content-aware home check,
  `import.meta.url` root, no import side-effects. Platform limit #16538 documented
  in [`session-start-setup.md`](session-start-setup.md).
- **surface-scrub** — boundary lookaround, `agents/` scanned, import guard, and the
  **denylist externalized** to a gitignored local file so no project fingerprints
  ship (`surface-scrub.denylist.example` is the template).

## Remaining — doc consistency (low priority)
Stale references inside the dated plan/spec (historical artifacts): the plan still
shows `node --test tests/` (#27) and `HOME=/nonexistent` (#28); the spec lists the
resolved hook-language question as open (#34) and its Phase-2 tree predates the
build (#35). Fix on a docs pass or leave as record.

## Held agents (migrate only when they actually fire as named agents)
- `repo-cartographer` — cartography was done by generic explore agents.
- `integration-runner` — integration was run inline by the operator.

## Promotion
Provisional → settled after surviving ≥2 independent domains; evidence in
`FEEDBACK.md`.
