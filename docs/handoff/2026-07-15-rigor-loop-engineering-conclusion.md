# Handoff — rigor-loop-engineering (session conclusion)
2026-07-15 · newest commit this brief describes: `ae2c042` ("docs: propose ADR-0006, mechanize
build-tier pin check") · `git log -1 --format='%H %cI %s'` to confirm nothing has landed since.

This closes out a multi-day session (`495274ae-4189-4c09-b42d-8027685f9f5b`) that ran the
ledger-kit build, settled ADR-0004's pilot, and ends here on a proposed-not-built ADR-0006. Working
tree was clean and `git status --short` empty at write time — every commit below is real, not a
pending diff.

## Current state

- **Feedback ledger renamed to ISO chronological format** — built. All 31 `docs/feedback/` entries
  are `YYYY-MM-DD-<topic>.md`; grandfathering revoked. `re-verify: ls docs/feedback/ | sort` sorts
  chronologically; read `FEEDBACK.md`'s header for the migration note. Commits `4b75ff1`/`93f64e0`.
- **Ledger kit** (`docs/learnings/` + `docs/handoff/` per-repo folders, `check-learnings.mjs`,
  `commands/handoff.md` + `skills/pick-up` edits, `extract-tails.mjs`) — built.
  `re-verify: node --test` (108/108) and `node scripts/check-learnings.mjs docs/learnings` (clean,
  2 entries as of this brief). Commits `ed3b5f0`, `181938b`.
- **repo-cartographer emits AGENTS.md + CLAUDE.md-stub pair**, plus rigor's own dogfood
  `AGENTS.md`/`CLAUDE.md` at repo root — built. `re-verify:` read `agents/repo-cartographer.md`
  and the two root files. Commit `8eb7058`.
- **Capture-time-anchoring fix** (ADR-0003 amendment) — built and verified **non-vacuous**: the
  identical-`ts:` check was run against the real defective tic ledger and went RED where it had
  passed GREEN the day before; a second self-bug (monotonic-ts-in-filename-order) false-positived
  on same-day entries and was replaced with the correct per-entry `ts.slice(0,10) === filename
  date` check. `re-verify: node --test` (15 tests in `tests/learnings-check.test.mjs` cover both
  regressions by name). Commit `12eff68`.
- **ADR-0004 pilot SETTLED** — all 5 stated success criteria evaluated with quoted evidence in the
  ADR itself. `re-verify:` read `docs/adr/0004-loop-chassis-rigor-conscience.md`, section "Pilot
  evaluation — 2026-07-14 (SETTLED)". Commit `968e14d`.
- **`verify-the-effect` promoted settled (scoped)**, 2nd domain — tic's live payment-loop probe,
  golden IntentSpec `c7a36959` ⇒ ACHIEVED seq14, unknown hash ⇒ refuse, real-scorer kill ⇒ refuse,
  restore ⇒ ACHIEVED seq35 (non-vacuity via recovery). `re-verify:` read
  `docs/feedback/2026-07-14-verify-the-effect-tic-live-loop.md` for the exact commands; the probe
  needs the synthesized IntentSpec kind-environment (see Reuse map) to reproduce. Commit `dc3c226`.
- **`pick-up` promoted settled (scoped)**, 2nd domain, first genuine claim kill — tic's 07-13
  learnings entry said "39 passed" at commit `6adff98`; actual **46**, re-verified live this
  session. `re-verify:` `docs/feedback/2026-07-14-pick-up-tic-brief-killed-a-claim.md`; rerun
  `wsl … python3 -m pytest -q` in the tic scorer dir → expect 46. Commit `dc3c226`.
- **`gate-discipline` first firing (1 domain)** — ATLAS's ADR-0023 is BUILT + self-green on a
  pushed branch but has zero open PRs while its own acceptance rule says "acceptance = PR merge" —
  correctly refused credit. `re-verify:` `docs/feedback/2026-07-14-gate-discipline-atlas-graph-export.md`;
  re-check PR count in `regulatory-rule-engine` for drift since 07-14. Commit `dc3c226`.
- **Ledger-kit misfire, logged and fixed same day** (mine) — `docs/feedback/2026-07-14-ledger-kit-write-time-stamping-misfire.md`.
  Commit `dc3c226`.
- **ADR status index** — `docs/adr/README.md`, Status-vs-As-built columns for all 6 ADRs. `re-verify:`
  read the file; every claim in it was checked against the named ADR's own text before being
  written. Commit `866095d`.
- **ADR-0006 "Silent tier collapse"** — **Proposed, NOT ratified, zero surface shipped.** Names the
  gap between `orchestrate` guardrail #11 / `fanout-build` §4 (workers must run build-tier) and
  `check-fanout.mjs` (checks contract/schema/integration/verify, never a tier pin). Proposes 3
  resolutions: extend `check-fanout.mjs` with a tier-pin warning; source the build-tier model name
  from `config/models.json` instead of hardcoded literals; reuse `judgment-dispatch`'s
  `requested`/`answered` `MODEL:` receipt line for workers too. `re-verify:` read
  `docs/adr/0006-silent-tier-collapse.md`; `grep -n "agentType\|model:" scripts/check-fanout.mjs`
  currently returns no match, confirming the gap is still open. Commit `ae2c042`.
- **Learnings entry, today** — the check-fanout gap above, captured as an anchored fact independent
  of the ADR prose: `docs/learnings/2026-07-15-check-fanout-has-no-tier-pin-check.md`. `re-verify:`
  same grep as above.

**Not started:** ADR-0005's 4 resolutions (still Proposed, unratified, since 2026-07-09); ADR-0006's
3 resolutions (proposed today, nothing built); ADR-0005 resolution 2 (the standing-catalog sweep —
unblocked 2026-07-14, not opened); `check-runlog` form gate (ADR-0004's one open item — criterion 2
has been met by hand 3 times, never mechanized).

## Locked decisions

- **Ledger entries (`feedback`/`learnings`/`handoff`) use ISO `YYYY-MM-DD-<topic>.md`, chronological,
  newest at the bottom.** Reason: a plain directory listing should sort as a timeline; the prior
  `<topic>_MM-DD-YYYY.md` convention did not, and was explicitly grandfathered before this session
  revoked that grandfathering. Renaming used `git mv`; history is preserved.
- **Ledger indexes hold pointers only, never evidence; entries are immutable — corrections are new
  dated entries with a `kills:` reference, never edits.** Reason: an editable ledger is not a
  ledger; this is what let the write-time-stamping misfire get *fixed forward* instead of quietly
  erased. See `AGENTS.md` Invariants.
- **A form gate is a floor, never a verdict.** Reason: `check-learnings` verified every field, the
  ordering, and append-onlyness on the tic ledger and still passed a basis that was fiction — a
  gate can check shape, never truth. `docs/learnings/2026-07-14-form-gate-passed-a-record-whose-basis-was-fiction.md`.
  This is why `pick-up`'s re-run of a claim, not a green gate, is what actually catches fiction —
  and it is the same reason ADR-0006 requires its own future gate to be verified non-vacuous before
  it's trusted (success criterion 1).
- **Logs index candidate firings; only a gate re-run moves a status.** Reason: self-reported success
  is exactly the failure mode this whole toolkit exists to catch (precedent: VANTAGE's 2/4
  false-verdicts). Every promotion in this session's log was gated by *me* re-running the check, not
  by trusting a brief or a subagent.
- **ADR-0005 and ADR-0006 remain Proposed / unratified — never quote either as settled practice.**
  Reason: ratification is an explicit operator action; a session cannot grant itself one. ADR-0006
  in particular should not be treated as "the gate exists" — nothing has been built yet.
- **No backfill of ledger records, ever.** Reason: a reconstructed entry is a capture-shaped lie
  (`docs/learnings/LEARNINGS.md` header). Findings are captured at the moment they land, in a
  scratch buffer if needed, and curated later with their *original* timestamps — this is the rule
  whose violation caused this session's central defect.

## Reuse map

- `scripts/check-learnings.mjs` (`findLedgerViolations({entries, index, changes})`) — the ledger
  form gate. Already hardened against write-time-stamping and the ts/filename-date mismatch; don't
  re-derive either check, read `tests/learnings-check.test.mjs` for the exact regressions it covers.
- `scripts/check-fanout.mjs` (`analyzeFanout(src)`) — the fan-out structural linter. ADR-0006 is the
  design spec for its next extension (a tier-pin warning class); read the ADR before touching this
  file rather than re-deriving the shape.
- `config/models.json` — single source of tier truth (`judgment`/`build`/`cheap`, `tier_agents`,
  `floored_nodes`). ADR-0006 resolution 2 proposes extending its authority to fan-out build scripts,
  which today hardcode the model string.
- `docs/adr/README.md` — the status index. Append a row here for any new ADR; don't build a parallel
  index.
- `commands/handoff.md` / `skills/pick-up/SKILL.md` — already carry the capture-time-anchoring rule
  and the reading order (repo context → STATE.md → HANDOFF.md index → newest entry → refute). Follow
  as written; this brief is itself a live instance of both.
- `docs/efforts/backlog-settlement/STATE.md` + `run-log.jsonl` — the ADR-0004 chassis spine, now
  *settled*, not retired: future L1/L2 sweeps append runs here rather than starting a parallel effort
  file.

## Invariants

- `git-guard` hook blocks `git commit`/`git push` and compound git commands issued via Bash — always
  emit commands for the human, never attempt to run them.
- Ledger entries are immutable; corrections are new dated entries with `kills:`, never in-place edits.
- No ledger is ever backfilled from memory — a finding without a captured basis is not an entry.
- `anchor-rule-since:` is a one-time, index-level exemption for pre-rule ledgers — never a per-entry
  excuse to skip the identical-`ts:` check.
- Proposed ADRs (0005, 0006) are not practice until ratified — do not build against either as if
  settled.
- Component promotion requires ≥2 genuine independent non-origin gate-rerunnable domains, gates
  re-run by the orchestrator — never by trusting a subagent's or a brief's self-report.
- `no-lookahead`, `idempotent-restatement`, `lineage-replay`, `data-quality-fail-closed`,
  `judgment-dispatch`, `skeptic-verifier-fast`, `repo-cartographer` remain zero-firing or origin-only
  (VANTAGE). Explicitly **not** credited this session: COMPASS's restatement claim (open PR, no
  diff output) and treasury's as-of plumbing (never probed across a validity boundary) — crediting
  either would be a manufactured domain (`docs/efforts/backlog-settlement/STATE.md`, "Next
  candidates").
- `paused: true` in any effort's STATE.md is honored fail-closed — `docs/efforts/backlog-settlement/STATE.md`
  currently reads `paused: false`.

## Open / next

1. **Operator ratification, two ADRs waiting:** ADR-0005's 4 resolutions (Proposed since 07-09) and
   ADR-0006's 3 resolutions (Proposed today) — plus ADR-0006's one open implementation call (new
   warning class inside `check-fanout.mjs` vs. a separate `check-tier-placement.mjs`).
2. **Before ADR-0006 resolution 1 is built:** independently re-verify the tic-build "ran on Fable-5
   throughout" claim against that session's own transcript. It is currently carried into ADR-0006's
   Context from project memory, **not re-verified this session**, and is load-bearing for the whole
   ADR — this is flagged as the first blocker in the ADR's own "Decisions pending" §3.
3. **Once built, prove non-vacuity:** run `check-fanout.mjs`'s new tier-pin warning against a
   deliberately unpinned fan-out script and confirm it goes red, the same discipline used for
   `check-learnings`'s identical-ts check — do not trust it green without having first seen it red.
4. ADR-0005 resolution 2 (the standing-catalog sweep) is unblocked but not started — opening it
   still needs operator ratification of ADR-0005 first (loop-shopping guard).
5. Second repo adoption of the ledger kit, ideally one whose entries are written by a session the
   orchestrator doesn't run (candidate list: `STATE.md` "Next candidates").
6. ATLAS ADR-0023's PR, when it opens, is `gate-discipline` domain 2 — check whether the merge gate
   actually re-runs the harness or stays non-gating.
7. `check-runlog` form gate — ADR-0004's one open item; criterion 2 has been satisfied by hand 3
   times, mechanize it on the 4th run rather than a 4th manual pass.

No hard blocker on any of the above — all wait on operator ratification or on real work landing in
target repos (`STATE.md`'s standing rule: domains cannot be manufactured to feed this loop).
