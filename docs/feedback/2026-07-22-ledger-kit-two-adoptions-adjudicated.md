# 2026-07-22 — ledger kit: two adoptions adjudicated; misfire #2 logged; domain 2 NOT credited

ts: 2026-07-22T20:22:37Z · rigor HEAD at write: `e9e38bf` · session `10d1e5e1` (fanout-loop
run 5) · workflow `wf_7824e937-c28` (4 agents, 185,212 subagent tokens — **BUDGET BREACH**,
see run log) · verdict log: `docs/efforts/backlog-settlement/runs/run-5-verdicts.jsonl`.
Both skeptics SURVIVED the adjudication claim; gates re-run by the orchestrator.

## passed-vs-true-demo: bases genuine, adoption uncommitted — a named gap, not a credit

- `check-learnings` clean (2 entries), re-run by orchestrator from inside the repo.
- Both bases reproduce byte-for-byte TODAY: `npm run build` fails with the exact quoted
  pin-drift message (redness-by-design, the invariant firing — re-run by the evidence
  agent, the primary skeptic, AND the orchestrator); `vercel git connect` returns
  "already connected" verbatim. Entries anchored to the repo's actual current HEAD.
- **Kill: the entire `docs/learnings/` + `docs/handoff/` tree is UNTRACKED in git**
  (`git ls-files` → 0 files). The gate's append-only/immutability leg is vacuously green;
  the adoption exists only in a working tree. By the effort's own standard (a local
  pointer is not a real integration), this cannot credit domain 2 until the ledger is
  committed. Named gap, cheaply closable by the operator.

## closed-loop-default-detection: KIT-CONTRACT MISFIRE #2 (serialization dialect)

- All 13 entries are substance-complete — every one of the 7 fields populated with real
  anchored content, confirmed entry-by-entry (not sampled); 14 ledger files tracked and
  clean, so the immutability check is REAL there; two frontmatter commit anchors
  independently confirmed via `git cat-file -e`.
- But `check-learnings` fails all 13 with exactly 39 = 13×3 violations: the body fields
  use `**fact:**` bold-markdown labels, and the gate's `/^(?:- )?fact:/m` regex misses
  them. **Decisive substance test (primary skeptic): sed-normalizing ONLY the three bold
  labels on copies → `clean (13 entries)`** — the failure is purely serialization.
- Verdict: the kit's cross-repo contract under-specifies serialization; the writer
  (`/rigor:handoff` in a CLDD session) emitted a dialect the kit's own gate rejects
  wholesale. That is a **kit misfire** (#2, after the 2026-07-14 batch-stamping), not an
  entry defect. Accidental-tolerance nuance: YAML frontmatter fences pass only because
  `---`-fenced `ts:` lines still match the bare regex — dialect tolerance is unspecified
  in both directions.

## Two further kit findings (from the same run)

- **Re-verify lines must be read-only.** pvt-demo's vercel entry has `vercel git connect
  --yes` as its re-verify — a mutating-shaped command. The evidence agent executed it
  despite a READ-ONLY task instruction (flagged by the harness; effect was a no-op — the
  repo was already connected — but a verification probe that can mutate is a contract
  defect in the entry, and the kit nowhere forbids it).
- **Re-verify durability.** cldd's machine-derived-hash entry's re-verify silently
  breaks as written (`gh run list --limit 10` — the target run aged out); the underlying
  fact reproduces at `--limit 100`. Limit-bounded queries decay; the kit's guidance
  should say so.

## Status

Ledger kit: **1 domain, 2 logged misfires** (batch-stamping 07-14; serialization dialect
07-22), domain 2 NOT credited — pvt-demo pending its commit, cldd pending a kit decision
(harden the writer's serialization, widen the gate, or both — operator's call, not made
here). Same-operator caveat stands on everything above.
