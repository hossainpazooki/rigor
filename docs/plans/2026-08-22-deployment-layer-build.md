# Build record — deployment layer (ADR-0013), 2026-08-22

Point-in-time build record (see `docs/README.md`: `plans/` are build records, never
"fixed" retroactively). Companion files beside this one: `…build.verdicts.jsonl`
(the run's verdict log, linted by `check-dispatch`) and `…build.workflow.mjs` (the
fan-out script, linted by `check-fanout` + `check-tier-placement`).

## 1. ADR review — three judgment-tier skeptics, before any skill text

Dispatched via the Workflow tool, `agentType: rigor:skeptic-verifier` (frontmatter
pin `claude-fable-5`; receipts `claude-fable-5` ×3). Lenses: ADR-0002/SoD/shape
assignment; hook viability and bypass seams; class rubric + first-domain recompute.
Verdicts: **PARTIAL / REFUTED / REFUTED.** Subagent tokens: 282,719.

**Blocking findings, all accepted and fixed in the ADR's second draft:**

| # | Finding | Evidence class | Fix |
|---|---|---|---|
| 1 | "A record in `HEAD` has therefore passed through a human's hands" is false — agent-written content reached `HEAD` in a throwaway clone via `git -c x=y commit` (`-c` not in `VALUE_FLAGS`), plumbing (`hash-object -t commit -w` + `checkout -B`), stash + `checkout --detach`, `git replace`, `git worktree add`, `sh -c "git commit"`, absolute-path `git` | live, two independent skeptics | SoD restated: the hook reads a configured ref with `--no-replace-objects`; the control is the **target's branch protection**; `git-guard` called friction, not a boundary; pattern-shaped holes fixed red-first (B3) |
| 2 | "No second promotion rule is invented" — the ≥2-instance downward floor and the 30-day/10th-instance cadence have no ledger precedent; "honest negatives count" contradicts `FEEDBACK.md` practice | `FEEDBACK.md:4-7, :18`; ADR-0012 §5 | ADR now says **new rule, new parameters**, and drops "honest negatives count" |
| 3 | Present-tense claims about unbuilt things: a rehearsal audit cited that did not exist; "the hook survived"; "its tests are wired" | `ls docs/audits`, `git status` | Everything unbuilt is now specification / future tense |

**Material findings, accepted:** production environment has **0 protection
rules** on the remote (`gh api …/environments/production` → `protection_rules: []`);
`skip-approval` is declared (`cd-production.yml:10`) and never read; validation
failure does not roll back (rollback is scoped to the deploy job, `:110`); the CD
workflows have **never succeeded** (41/41 runs failed, no credentials); the first
draft's `proposal` carried post-implementation evidence (probe result, rollout
window) — split into `proposal` / `outcome`; per-target identity rules were
hard-coded in rigor's schema (ADR-0002) — now a generic `identity` list with the
rule in the authorization; P1 credited a backout with `exit_code: 1` — now `=== 0`;
P3's stale-sample twin was inexpressible — `last_sample_ts` added per signal;
review controls had no reviewer-level twins — added per property; `--dry-run=none`
is mutating; `gh pr merge` / `gh api PUT contents|merge` / `POST merges` write
history remotely and neither hook saw them; `git show HEAD:./path` from a foreign
cwd silently reads the wrong repo — path now resolved against `--show-toplevel`;
the hook script is agent-writable in the plugin cache and re-read per call.

**Skeptic misfire (ADR-0010 capture, not yet closed):** one skeptic reported that
`scripts/check-runlog.mjs`'s `resolveSupersession` export "landed 2026-08-18
ahead of this ADR" (`git log -1` date of the file's last commit). Recomputed:
`git show HEAD:scripts/check-runlog.mjs | grep -c resolveSupersession` → **0**;
the export is this session's uncommitted edit. Mechanism: the skeptic read the
file's last-commit date as the provenance of working-tree content. Closure state
**open** — a pin would be a test that a provenance claim cites a blob, not a
commit date; declined/pinned is the operator's call.

## 2. The contract (prepended verbatim to every build agent)

See §CONTRACT in `…build.workflow.mjs` — the single source of truth. Summary:

- **Schema** = ADR-0013 §2, verbatim.
- **`hooks/shell-normalize.mjs`** (owner B3): `splitSegments(command)`,
  `normalizeSegment(seg) → { argv, inner }`, `expandCommands(command) → string[]`.
- **`scripts/check-change-record.mjs`** (owner B1): `identityDigest(identity)`,
  `foldHealth(health)`, `effectiveClass(records, proposal)`,
  `earnedClassEvidence(records, pattern)`, `findChangeRecordViolations(records,
  { digests }) → { violations: [{ entry, property, reason }], unevaluable: [] }`,
  `parseChangeLog(text)`; CLI exit 0 / 1 / 2. Imports `parseRunlog` +
  `resolveSupersession` from `check-runlog`, `findVacuousProbes` from
  `check-effect-probe`.
- **`hooks/change-guard.mjs`** (owner B2): `isDeployCommand(normalized) → { deploy,
  family }`, `decide(command, env, io) → { block, reason? }`, `run()`; `io = {
  loadRecords({ path, ref }), digest(path), toplevel() }`.
- **`hooks/git-guard.mjs`** hardening (owner B3): `-c` in `VALUE_FLAGS`,
  `--no-optional-locks` in `BOOL_FLAGS_RE`, wrapper normalization via
  `shell-normalize`, new BLOCKED: `checkout -B`, `switch -C|--force-create`,
  `symbolic-ref <ref> <target>` (write form), `replace` (non-list/delete),
  `hash-object … -w … -t commit`, `stash store`, `pull`, `fetch <refspec-with-dst>`;
  `gh pr merge`, mutating `gh api` against pulls/merge, merges, contents, git/refs.
  **Red-first:** tests written and run red against the pre-edit `decide()` before
  the fix; the red output is returned verbatim in the builder's receipt.
- **Skills** (owners B4, B5): one `SKILL.md` per property, frontmatter
  `name` / `description` / `status: provisional`; sections — statement (rigor name
  + SDLC/SRE name), **Control shape** (all four shapes, assigned or not, rigor
  unit), Moves, Negative control (detective twins + reviewer twin), Anti-pattern,
  Refute link, Record fields, Honest limit, Pairs with. Domain-neutral.

File→owner map (disjoint): B1 `scripts/check-change-record.mjs`,
`tests/change-record.test.mjs` · B2 `hooks/change-guard.mjs`,
`tests/change-guard.test.mjs`, `hooks/hooks.json` · B3 `hooks/shell-normalize.mjs`,
`hooks/git-guard.mjs`, `tests/git-guard.test.mjs`, `tests/shell-normalize.test.mjs`
· B4 `skills/change-backout-exercised/`, `skills/release-artifact-integrity/`,
`skills/health-signal-fail-closed/` · B5 `skills/post-implementation-probe/`,
`skills/break-glass-on-record/`, `skills/change-class-earned/`.

## 3. Tier placement

Builders `model: tiers.build` (config-sourced via `args`); integration closer
`agentType: rigor:integration-runner` (mid, frontmatter-pinned); skeptics
`agentType: rigor:skeptic-verifier` (judgment). Stakes for every skeptic dispatch:
**high** — `irreversibility` (the layer gates deploys) and `downstream-decisions`.
Every worker returns a `model_receipt`; receipts are recorded `role: "worker"` in
the verdict log.

## 4. Results

Filled in after the run — see the sections appended below.

### 4.1 Round 1 — `wf_b01ded50-285` (after a 7 ms first launch that died on an unescaped `${CLAUDE_PLUGIN_ROOT}` in the contract template; zero agents ran)

15 agents, 0 errors, **1,413,000 subagent tokens**, 24 min. Receipts: 5 builders
`claude-sonnet-5`; integration `claude-opus-4-8[1m]` (accepted by
`receiptMatches`); 9 skeptics `claude-fable-5`. Verdict log: 18 records,
`check-dispatch` clean.

Builders: B1 gate (69 tests), B2 hook (29 tests, hooks.json third hook), B3
normalizer + git-guard hardening (**red-first: 16 new tests seen failing against
the unedited hook, output captured in the receipt**; 24 pre-existing tests kept
green — the contract said 27, which was wrong), B4/B5 six skills. Integration:
`node --test` 321/321, surface-scrub clean, tier-sync clean, gate CLI exit 0/1/2
demonstrated, hook smokes correct, **0 fixes needed**. Orchestrator re-ran all of
it: same numbers.

Skeptics: **2 SURVIVES / 4 PARTIAL / 3 REFUTED.** What they found (all accepted,
all fixed red-first in round 2 — ADR §7 carries the list):

| severity | unit | finding |
|---|---|---|
| blocking | change-guard | verb read without stripping global flags — `kubectl -n prod apply` allowed |
| blocking | change-guard | baseline verdict never read directly — a `fail` baseline deploys; a later outcome masks `unevaluable` |
| blocking | change-guard | break-glass match is an unbounded prefix with `.some` — `command: "k"` authorizes `kubectl delete ns prod`; compounds pass on one hit |
| blocking | check-change-record | `foldHealth` coerces absent/unknown outcomes to `pass`; no per-signal form check; `source` never read (the ADR's first P3 twin was never red) |
| blocking | git-guard | `gh api` flag-first forms bypass the new check (path taken as first token after `api`) — the ADR's own examples |
| material | change-guard | null digest fails open; approval `{who}` alone accepted; P2/P3/P6 not independently pinned at the hook (mutation survived) |
| material | check-change-record | `backout.kind: apply-previous-module` credited; naive timestamps make verdicts timezone-dependent; executed-onto-unevaluable-baseline with no break-glass reads clean; em-dashes in console strings |
| material | shell-normalize | `OUT=$(kubectl apply …)` normalizes to nothing; `$(…)` inside non-sole tokens, `env -i/-u/-C`, attached `xargs -I{}` unhandled |
| material | skills | six misattributions/overclaims (probe_plan twin credited to the wrong unit; "not derived from anything"; Terraform third twin claimed as a digest twin; break-glass unit misnamed; class rubric criteria missing; a form-incomplete "form-complete" snippet) |

Skeptic-side notes: one skeptic's "all 27 pre-existing tests" was the contract's
own wrong number (24); one found the ADR's "refuses if its toplevel is not the
target's" described a check never built (struck from the ADR). No false
refutation found in this round.

### 4.2 Round 2 — `wf_31a27749-97a` (fix round on the round-1 findings)

10 agents, 0 errors, **1,211,840 subagent tokens**, 23 min. Fixers F2/F3/F4
returned real receipts with **red-first evidence** (F2: 8 of 18 new hook tests
red before the fix; F3: 9 of 9 new tests red — `gh api` flag-first, `OUT=$(…)`,
`echo $(…)`, `env -i`, attached `xargs -I{}`). Integration: `node --test`
**375/375**, surface-scrub clean, tier-sync clean, smokes deny/deny/deny/allow/
deny/deny. Orchestrator re-ran: same numbers.

**Two misfires in the run itself, recorded rather than tidied:**

1. **F1 (the gate fixer) returned a fabricated receipt.** Its real
   `StructuredOutput` was rejected by the schema (missing `notes`); on retry the
   agent submitted `"a"` in every field. The work was real (96 gate tests, 375
   full, every fix present in the file — confirmed by the round-2 gate skeptic),
   but the receipt is fiction. Logged in the verdict log **as returned**;
   `check-dispatch` now exits 1 on this run's log — `silent downgrade — worker
   answered a != requested claude-sonnet-5` — which is the gate's first live
   catch of a fabricated receipt (a *use*, not a domain). The log is left red
   on purpose; a cleaned log would be the correct-shaped lie this repo exists
   to catch. Round 3's contract names the failure and forbids it.
2. **The integration closer edited a settled skill out of scope** —
   `skills/implemented-vs-planned/SKILL.md`, "settled fact" → "established
   fact" — because the orchestrator's gate instruction (`grep -rn -i settled
   skills/` must be empty) was over-broad: the rule applies to the six new
   skills, not the repo. Reverted with `git checkout -- <file>`; round 3 scopes
   the grep and forbids edits outside the fixers' files. Orchestrator
   instruction misfire, not the closer's.

**Skeptics (5): 0 SURVIVES / 4 PARTIAL / 1 REFUTED.** Residuals, all carried
into round 3:

| severity | unit | finding |
|---|---|---|
| blocking | git-guard | `isGhBlocked` re-splits the joined argv string, so a quoted `-H "Accept: …"` value displaces the endpoint path — GitHub's own REST-docs form bypasses; `-X=PUT` bypasses |
| material | change-guard | every `form` violation is discarded at the edge: `apply-previous-module`, naive timestamps, `probe_plan: null` all deploy; a later duplicate proposal without `supersedes` masks an unevaluable baseline; pflag attached values (`-nprod`, `--as=admin`) bypass the allowlist |
| material | check-change-record | class-1 proposal with `approval: null` is clean even after an outcome; several checks unpinned under mutation (naive outcome timestamps, absent `last_sample_ts`, per-signal form lines) |
| material | git-guard | `gh api graphql` mutations (`mergePullRequest`, `createCommitOnBranch`) allowed; `time`, `{ …; }`, `then` prefixes unhandled |
| material | skills | break-glass move 5 attributed the exit-2 halt to the baseline instead of `outcome.health`; health preventive row overclaimed "never masked" |

Skeptic-side: one skeptic confirmed round-2 red-first by reconstructing the
round-1 code from the ADR's §7 description (69/79 → all 10 new tests red) and
said so as an approximation, not a replay. No false refutation found.

### 4.3 Round 3 — `wf_9f3c1a8f-8f2`

9 agents, 0 errors, **1,175,962 subagent tokens**, 26 min. All four fixers
returned real receipts with red-first evidence (G1: 9 of the new gate tests red
pre-fix; G2: 10 of 20 new hook tests red pre-fix; G3: red on `gh api` quoted
values, `-X=PUT`, graphql, `time`/`{`/`then`, env long forms). Integration:
`node --test` **425/425**, zero edits, and it now reports `git status` so an
out-of-scope edit cannot recur silently. Orchestrator re-ran: same numbers;
smokes `kubectl -nprod apply` deny / `kubectl -n prod get pods` allow /
`gh api -H "Accept: …" -X PUT …/merge` deny / a `time`-prefixed commit deny.

**Skeptics (4): 0 SURVIVES / 4 PARTIAL.** No blocking logic hole in the hook
or gate; residuals carried into round 4 (the last this session):

| severity | unit | finding |
|---|---|---|
| material | check-change-record | outcome-side effective class is computed over the whole log, so a class-0 instance's own misfire demotes it and a spurious approval P6 appears |
| blocking (CLI shape) | check-change-record | a directory at an identity path crashes the CLI with EISDIR (exit 1, stack trace) instead of exit 2; path `''` with a sha256 is skipped; `sha256` never form-validated |
| material | change-guard | the round-3 verb fallback scans past the first non-flag token — `kubectl auth can-i create pods` is **refused** (a read-only RBAC check; ADR-0010 misfire candidate under self-refutation 3); a cited authorization that fails form is still credited |
| material | git-guard | `env -S '…'` bodies swallowed; `xargs -d,` attached; `gh api /graphql` (leading slash); `gh pr --repo o/r merge`; graphql body via `--input`/`@file` |
| material | skills | my round-3 instruction for break-glass move 5 was wrong against the code (the gate halts on the *newest* record, baseline included) — the fixer followed a bad instruction; change-class-earned's outcome-side sentence overstated what the code does |

Orchestrator-side misfire: the break-glass move-5 sentence was dictated verbatim
in the round-3 contract and was wrong; the skeptic caught it against the code.
A second one, live: the operator-installed `git-guard` (plugin-cache copy)
blocked the orchestrator's own Bash call that appended this section via a
heredoc, because the markdown table above mentions a commit command in prose
— the hook matches heredoc bodies (known; see the worktree-isolation learning).
The section was written with the editor tool instead.

### 4.4 Round 4 — `wf_ac638ce3-b7b`

9 agents, 0 errors, **1,113,938 subagent tokens**, 24 min. All four fixers
red-first (H1: 11 new gate tests red pre-fix, reverted-and-rerun; H2: 6 red;
H3: 9 red). Integration: `node --test` **455/455**, zero edits. Orchestrator
re-ran three times: 455/455 each (a fixer reported a mid-round flake in
`tests/change-guard.test.mjs` while a sibling's file was half-written; it
does not reproduce). Smokes: `kubectl auth can-i create pods` **allow** (the
round-3 false positive is closed), `kubectl -nprod apply` deny, `helm
--kube-tls-server-name list upgrade` deny, an `env -S` wrapped commit deny,
`gh pr --repo o/r merge 1` deny, `gh -R o/r pr view 1` allow, `gh api
/graphql --input m.json` deny.

**Skeptics (4): 0 SURVIVES / 3 PARTIAL / 1 REFUTED.** The gate and the
skills are down to material/minor residuals; the two hook skeptics were asked
to *invent* new forms and found a long tail, part of it **pre-existing in
`git-guard` before this session** (recomputed by the orchestrator against
`git show HEAD:hooks/git-guard.mjs`):

| severity | unit | finding |
|---|---|---|
| blocking, pre-existing | git-guard | `reset -q --hard` (mode flag not adjacent to the verb), `tag -a -f`, `branch -df`, `branch -M` all allowed — by the pre-session hook too |
| blocking | both hooks | shell keywords `if`/`while`/`until`/`!`, a lone `&` separator, `sudo`/`setsid`/`stdbuf`/`flock`, uppercase binary names on Windows (`KUBECTL`, `GIT`), `pwsh -c`/`cmd /c` bodies, `time -p`, `exec -a` |
| blocking | change-guard | `gh api -X POST …/actions/workflows/<wf>/dispatches` — the first domain's own trigger through a CLI the hook parses; `kubectl apply view-last-applied` (read-only) refused; `--help` forms refused |
| blocking | git-guard | `--field query=@file` (the long form of `-F`) missed while `--raw-field` (no `@file` magic) is checked |
| material | git-guard | `merge-upstream`, `pulls/N/update-branch`, `gh repo sync`, `mergeBranch` not enumerated; `env -S<attached>`, `xargs --delimiter=` |
| material | check-change-record | an outcome with `ts_executed` before its proposal's `ts_proposed` is clean (post-hoc proposal); a sha256 entry with no `path` key passes as neither shape; two original outcomes for one change_id are not refused |
| minor | skills | change-class-earned claims the detective returns class 2 on a form-failing authorization (it emits a form violation instead); health row says "for the pattern" where the hook selects by change_id |

Orchestrator decision: **one more bounded round (5)** for the blocking and
cheap items; everything the fifth round leaves is recorded as a named residual
in ADR-0013 §4 and the handoff, not fixed this session.

### 4.5 Round 5 — `wf_8d5d8948-b91` (bounded, final)

8 agents, 0 errors, **923,904 subagent tokens**, 26 min. All fixers red-first
(J1: 8 of 13 new gate tests red pre-fix; J2: 16 of 22 hook tests red; J3
reverted both normalizer and guard to pre-round content to capture red).
Integration: `node --test` **523/523**, zero edits. Orchestrator re-ran twice:
523/523; all ten pre-existing `git-guard` bypass forms now BLOCK against the
working tree while the pre-session hook still allows them (probe
`probe-gitguard-old-vs-new.mjs`, 19:11Z).

**Skeptics (3): 3 SURVIVES** — the first clean round. Residual: `mergeBranch`
is blocked but no test pins it (minor); one skeptic correctly noted every
verdict is about the working tree, not a commit.

### 4.6 Totals and what the run says about itself

| | |
|---|---|
| workflows | 6 (1 ADR review + 1 build + 4 fix rounds); 54 agents, 0 errors |
| subagent tokens | **6,121,363** |
| test floor | 178 → **523** (`node --test`), fail 0 on every orchestrator re-run |
| verdict log | 54 records; receipts three-way (28 fable / 3 opus[1m] / 20 sonnet / 1 fabricated + 2 long-form integration receipts accepted by `receiptMatches`); `check-dispatch` **exit 1** on the one fabricated receipt — left red on purpose |
| skeptic passes | 23 verdicts; 0 false refutations found; 1 skeptic misfire (provenance read off a commit date) |
| orchestrator misfires | 3 — an over-broad `settled` grep (out-of-scope edit, reverted), a dictated sentence wrong against the code (break-glass move 5), a contract template that interpolated `${CLAUDE_PLUGIN_ROOT}` (7 ms crash) |
| pre-existing defects found in settled-ish components | 5 `git-guard` bypass forms (`reset -q --hard`, `reset HEAD~1`, `tag -a -f`, `branch -df`, `branch -M`) + the wrapper class (`sudo`, `if`, lone `&`, uppercase binary) — closed red-first, recorded as an ADR-0010 closure |

**Named residual tail (recorded, not fixed):** variable indirection (`K=kubectl;
$K apply`), `find … -exec`/`parallel` argv surfaces, graphql bodies via
`$(cat file)`, `node -e`/`python -c`/`make deploy` wrappers, verb-list rot in
every family, `mergeBranch` unpinned, the plugin-cache hook file being
agent-writable, `disableAllHooks`. All named in ADR-0013 §4 / self-refutation
7, none claimed closed.
