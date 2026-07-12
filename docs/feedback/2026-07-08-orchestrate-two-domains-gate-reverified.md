# orchestrate — promoted to settled (scoped): two non-origin domains, gates re-run green

2026-07-08T19:59:30Z · `orchestrate` · helped · deterministic-systems Go
(treasury-intent-controller) + credit-risk ML (closed-loop-default-detection) ·
**provisional → settled (scoped).** Promotion rests on two independent, non-origin
domains whose OWN gates were **re-run green by the operator**, not on logged
self-reports.

## What moved it

A read-only backlog recon (Workflow run `wf_1955b9bb-7f9`, 14 agents over 30+
session transcripts) surfaced candidate firings of every provisional component.
Its governing rule — and its verdict — was that **transcripts only index candidate
firings; a gate re-run is what moves a status.** It promoted nothing. The two
domains below were then re-verified by re-running each repo's own gate directly:

| Domain | Commit tested | Gate re-run | Result |
|---|---|---|---|
| treasury-intent-controller (tic) | `3d50b2b` (HEAD `53625f2` is a docs-only advance) | `go build ./... && go vet ./... && go test ./... -count=1` | green — 8/8 pkgs `ok`, build + vet clean |
| closed-loop-default-detection (CLDD) | `6fd839e` | `.venv/Scripts/python.exe -m pytest -q` | green — 123 tests, 0 fail |

Both are non-origin (VANTAGE is `orchestrate`'s first domain but its sbt gate is
not re-runnable on this box — Temurin-17 pin vs local JDK — so it does not furnish
a re-verified domain), and both repos are present in `~/dev` today.

**re-verify (tic):** `cd ~/dev/treasury-intent-controller && go build ./... && go vet ./... && go test ./... -count=1`
**re-verify (CLDD):** `cd ~/dev/closed-loop-default-detection && .venv/Scripts/python.exe -m pytest -q`

## Why this is not a logs-as-evidence promotion

The operator's directive was to settle provisional statuses "using session log
files." Logs were used strictly as an **index**: they pointed at where
`orchestrate` had genuinely been applied (real Workflow-tool runs leaving
`subagents/workflows/wf_*` artifacts, with an integration gate and a skeptic pass).
Every "green" in those transcripts was treated as a lead, never as proof — because
the VANTAGE 2026-06-28 run is the standing counter-example: its logged skeptic
verdicts were 2/4 FALSE, corrected only by an orchestrator re-run. The two greens
above are trusted only because they were re-run here, not because a transcript
asserted them.

## Scope and honest limits

- **Same operator across all three domains** — the independence is of repo/problem
  domain (Scala/Spark lakehouse, stdlib-only Go durability, Python/sklearn ML), not
  of operator. Same caveat already carried by `fanout-build`.
- `orchestrate` and `fanout-build` overlap: `fanout-build` (settled scoped) *uses*
  `orchestrate`. tic and CLDD are shared domains; this entry credits the
  orchestration discipline (Workflow-tool deterministic fan-out + guardrails)
  specifically, corroborated by those repos' prior fan-out entries.
- Provenance pointer (not proof): recon journal at
  `subagents/workflows/wf_1955b9bb-7f9/journal.jsonl`; rigor at `e1f4be0`.
