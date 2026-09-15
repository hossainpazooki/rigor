# Status: what's proven, what isn't

State as of 2026-09-15 (git-guard, learn-from-misfire, agent, judgment-dispatch
and ADR-0011 rows plus the closure counts refreshed by the 2026-09-14 pick-up
session, which ran past midnight UTC; prior stamp 2026-08-22, which had drifted
by then on two points: the closure-ledger tally (said 4 records/2 pinned while
HEAD already held 5 records/3 pinned after the 09-01 check-fanout closure), and
the `skeptic-verifier-fast` "never dispatched" line, false since 2026-08-18 —
both fixed below. Its claim-ceiling test count (591) was accurate at HEAD and
moves to 598 only because of the seven `git-guard` twins added at this stamp.
2026-08-18's stale "ADR-0012 … nothing built" row was fixed at the 08-22 stamp.
The source of truth this table tracks is the promotion ledger,
[`feedback/FEEDBACK.md`](feedback/FEEDBACK.md) — dated entries in
[`feedback/`](feedback/), chronological, newest at the bottom.

rigor applies its own standard to itself. Every component is **provisional**
(extracted from real working sessions, not yet survived ≥2 *independent*
domains as a packaged component) until the ledger records the promotion.
"Settled (scoped)" means settled *for the named scope only*, with unproven
reach kept visible.

**Claim ceiling (2026-09-15):** **9** commands / **20** skills / 5 agents / **3**
hooks / **12** check gates — the six skills, one gate, and one hook added by
ADR-0013, plus the command and gate added by ADR-0014, are **provisional,
fixture-tested only, zero domains**, and enter the ceiling only because each has
been seen red on a known-bad twin in `tests/` (**598** tests, `node --test`,
measured 2026-09-15 — up from 591 on 2026-09-01 via the seven `git-guard`
regression twins added below).
They leave it the moment a twin stops going red.

**ADR-0014 harvest (2026-09-01, Proposed).** `/rigor:harvest` +
`scripts/check-harvest.mjs` + `scripts/index-sessions.mjs` (indexer, not a gate).
One session harvested end-to-end. It produced the **first evidence this repo has
ever taken from its own history**, and the first thing it found was a live
defect in shipped code: `git-guard` refused an entirely read-only command in a
non-rigor repo on 2026-08-25 and still did on 2026-09-01, because a redirection
token (`2>&1`) survived normalization into `argv` and counted as the positional
argument that makes `symbolic-ref` a write. Fixed in
`shell-normalize.stripRedirections`, 4 twins pinned including three proving no
blocked verb was weakened. Both of the indexer's own false-positive classes
(~50 of 91 silent-skip candidates; 15 foreign-gate runs) were found by reading
its output, not by its tests. **Its queue is decaying:** transcripts age out on
a window of about 30 days (inferred from file mtimes, not read from a setting),
8 of the 23 sessions queued on 2026-09-01 were purged before harvest, and the
queue was re-ranked by inferred deadline on 2026-09-15 (closure `open`).

| Component | Kind | Status |
|---|---|---|
| `refute` | skill | **settled (scoped)** — 2 domains, for numeric provenance + citation fidelity; reach over semantic/design/omission defects unproven; data-claim moves provisional |
| `skeptic-verifier` | agent | **settled** — 2 domains, **2 logged misfires** (2/4 false refutations at VANTAGE 2026-06-28; **provenance read off a commit date 2026-08-22** — an uncommitted edit reported as four days old; closure `open`). 23 verdicts this session with 0 false refutations otherwise |
| `fanout-build` | skill | **settled (scoped)** — 2 independent domains end-to-end; caveat: same operator both times. **2026-08-22 use on rigor itself:** 1 build + 4 fix rounds, 54 agents, every round's claims refuted before the next; one worker **fabricated a receipt** after a schema rejection (closure `open`) |
| `effect-prober` | agent | **settled (scoped)** — 3 non-vacuous probes, self-verified; unproven: an independent oracle, and the aftermath of a genuine live irreversible action |
| `verify-the-effect` | skill | **settled (scoped)** — 2 domains; the live end-to-end probe gap is closed (paired negative controls, non-vacuity proven by recovery). Unproven: an oracle independent of the gate under test, and a genuinely irreversible external action. **Unchanged by ADR-0013**, which sits upstream and hands off to it |
| `pick-up` | skill | **settled (scoped)** — 2 domains; domain 2 is the first time it killed a claim. Unproven: picking up a brief written by someone else |
| `implemented-vs-planned`, `fanout-recon-synthesize`, `orchestrate` | skills | provisional (1 independent domain each) |
| `gate-discipline` | skill | provisional — 1 domain (first firing 2026-07-14) |
| ledger kit (`docs/learnings/` + `docs/handoff/`) | convention + gate | provisional — 1 domain, **1 logged misfire**; hardened; a form gate never verifies that a basis is genuine |
| `data-quality-fail-closed` | skill | **settled (scoped)** — 2 non-origin domains (CLDD 2026-07-19; PARALLAX 2026-08-18). Same-operator caveat. Its three-outcome vocabulary is reused verbatim by ADR-0013's `health-signal-fail-closed` |
| `lineage-replay` | skill | **settled (scoped)** — 2 non-origin domains 2026-08-18; replay-diff gap closed. Same-operator + sibling-coupling caveats |
| `idempotent-restatement` | skill | **settled (scoped)** — move 1 on 2 non-origin domains; moves 2–3 closed at tic 2026-08-18; moves split across repos |
| `no-lookahead` | skill | **settled (scoped)** — 2 non-origin domains 2026-08-18 (PARALLAX timestamped as-of; tic sequence as-of); neither exercised a timestamp-vs-sequence disagreement |
| re-audit sweep (ADR-0012) | target-repo generator (**no shipped skill** — the 2026-08-18 row called it a "skill"; no `skills/` folder exists) | **settled (scoped)** — 2 domains 2026-08-18 (PARALLAX: 7 claims, 6 verified / 1 ROT, 2 self-defects pinned; passed-vs-true-demo: drift-not-rot). The former "accepted, nothing built" row was wrong by the time it was stamped; the sweep is **built in the target repos**, per ADR-0002, not in rigor |
| `judgment-dispatch` | skill | provisional — pin mechanism live-verified. **Candidate firings, uncredited:** backlog runs 4–6, payment run 1, and **the 2026-08-22 ADR-0013 build** (54-record verdict log, three-way receipts, `check-dispatch` red on a fabricated receipt — the gate catching a receipt, not a model). **2026-09-14 closure-ledger build:** 4 judgment-tier skeptic dispatches errored on exhausted credits; 7 votes re-ran on the mid tier with `downgraded: true`, so `check-dispatch` is **red on purpose** on `plans/2026-09-14-closure-ledger-pair.verdicts.jsonl` (four high-stakes votes below the judgment tier) until a judgment-tier round runs. A log indexes a candidate; only an adjudication moves it |
| `integration-runner`, `repo-cartographer`, `skeptic-verifier-fast` | agents | provisional (`skeptic-verifier-fast` **was dispatched long before this row admitted it** — Agent-tool dispatches on 2026-08-18 and 2026-09-11 in session transcripts, and mid-tier verifier votes in committed verdict logs since 2026-07-22; this row's 2026-08-18 / 08-22 "never dispatched" reading was wrong (learnings 2026-09-15, closure `open`). On 2026-09-14 it cast 7 votes as the logged mid-tier fallback (`downgraded: true`) while the judgment tier was out of credits — 6 refutations, among them two shipped `git-guard` bypasses (quoted global value, unlisted global flags); use, not a calibration record. Every 2026-08-22 skeptic dispatch was `rigor:skeptic-verifier`; `integration-runner` ran 5 times this session on the mid tier, receipts `claude-opus-4-8[1m]`, zero fixes needed in 5 of 5 runs — use, not a domain) |
| all 9 commands, `session-start`, the 10 pre-existing check scripts | commands / hook / gates | provisional (`check-citation-fidelity` carries a logged limit; `check-runlog` gained `resolveSupersession` as a shared export 2026-08-22; **`check-dispatch` helped 2026-08-22** — first live catch of a fabricated worker receipt, left red on the record; **`check-fanout` misfire closed 2026-09-01** — it reported not-applicable as passed (README.md, an empty file, and a mistyped path all printed "scaffolding present", exit 0); now three-outcome with NOT APPLICABLE / UNEVALUABLE exit 2, pinned red-first in `tests/fanout-check.test.mjs`, closure record in `learn/closure-log.jsonl`) |
| `git-guard` | hook | provisional — **misfired 2026-08-22, closed pinned:** ten bypass forms found by skeptics, five predating the session (`reset -q --hard`, `reset HEAD~1`, `tag -a -f`, `branch -df`, `branch -M`) plus wrappers (`sudo`, `if …; then`, lone `&`, uppercase binary, `pwsh -c`, `env -S`, `time -p`), `git -c`, `sh -c` bodies, remote-side `gh pr merge` / mutating `gh api` incl. graphql. Hardened through the shared `shell-normalize.mjs`; 70 + 67 tests; red-proof 33/70 against the pre-session hook. **Misfired again 2026-09-01, closed pinned:** a trailing redirect (`2>&1`) survived normalization into `argv` and was counted as a positional, so a read-only `symbolic-ref --short … 2>&1` was refused as a write; fixed in `shell-normalize.stripRedirections`, 4 twins pinned. **Misfired a third time, closed pinned 2026-09-14:** the merge rule's `\b` matched before a hyphen, so `git merge-base` / `git merge-tree` and the rest of the merge-* plumbing (`merge-file`, `merge-index`, `merge-one-file`, the `merge-<strategy>` helpers — working tree or index, never a ref; allowed by operator ruling) were refused as `git merge`; fixed with a `(?![\w-])` lookahead. The fix went through three refuted versions before commit — `(?=\s|$)` let `git merge>out` through; `(?![\w-])` exposed that the hook re-split argv on whitespace; the argv-only walk lost writes where the tokenizer differs from bash — and surfaced **two bypasses in shipped code, both closed pinned:** a quoted global value holding a space shifted the subcommand (`git -C "a b" commit -m x` allowed, present since `c93cb4c`, 2026-06-25), and unlisted global flags were read as the subcommand (`git -P push` allowed). Final state: `normalizeGitSegment` skips any unlisted dash token and knows `--config-env` / `--attr-source`, and both the argv view and the old re-split view vote (operator ruling, union of both views). 7 twins; `tests/git-guard.test.mjs` now 81 tests, 0 fail. **Not yet verified at the judgment tier:** both mid-tier skeptic rounds refuted earlier versions, and the final state has survived only the orchestrator's re-runs of those rounds' corpora. Accepted over-blocks (friction): helper rules reachable behind a quoted global value, empty-string subcommands, `git -C "x commit" status`, `$(...)` global values. **Open:** alias bypass by name (`-c alias.<name>=<verb>`, config aliases). **Friction, not a security boundary** — named residual tail in ADR-0013 |
| `learn-from-misfire` + `check-misfire-closure` | skill + gate | provisional — **12 closure records** (by `ts_recorded`: 1 pinned 08-18; 1 pinned + 2 `open` 08-22; 1 pinned 09-01; 3 pinned 09-14; 1 pinned + 3 `open` 09-15 — 7 pinned, 5 open total), so the ledger is **exit 2 / unevaluable** by its own rule. The 2026-08-18 audit's 8 historical open items remain an audit, not records |
| **ADR-0013 deployment layer** — `change-backout-exercised`, `release-artifact-integrity`, `health-signal-fail-closed`, `post-implementation-probe`, `break-glass-on-record`, `change-class-earned`; `check-change-record`; `change-guard`; `shell-normalize` | 6 skills + gate + hook + shared normalizer | **provisional — Proposed, fixture-tested, 0 domains, 0 live runs.** Built 2026-08-22 ahead of ratification; the ADR's first draft was refuted by 3 skeptics, the first build by 9, and four fix rounds followed until round 5 survived (`plans/2026-08-22-deployment-layer-build.md`). First domain (ATLAS kernel) rehearsed at **record level only**: the gate refuses the honest proposal on P1×4/form×2/P4 and both P2 twins on the real rendered overlay; the domain has **zero** remote protection rules and a CD that has never succeeded, so it enters at class 2 with nothing to demote. **0 of 4 review controls credited** (no reviewer-level firing). The 2026-06-27 caveat applies verbatim. Residual hook tail named, not closed |
| ADR-0011 verifier-calibration ledger | **accepted 2026-08-18, nothing built** | unchanged; its motivating fact — `skeptic-verifier-fast` never dispatched — was false when written (Agent-tool dispatches on 2026-08-18, mid-tier votes in committed verdict logs since 2026-07-22; learnings 2026-09-15), so the ADR's premise needs re-reading before anything is built — still no calibration record |

The misfires stay in the table on purpose — a verification toolkit that hides
its own false refutations would be its own counterexample. **The closure ledger
is now live and not green:** [`learn/closure-log.jsonl`](learn/closure-log.jsonl)
holds **12 records (7 pinned, 5 open)**, recounted 2026-09-15 after this session
appended the 09-01 `git-guard` redirect closure, three more pinned `git-guard`
closures (merge rule, quoted global value, unlisted global flags) and three open
records (alias bypass, the STATUS never-dispatched claim, the harvest queue's
transcript retention); the file already held the 09-01 `check-fanout` closure
that a prior stamp of this doc had not reflected. `check-misfire-closure` still
exits **2** — five records are open, the two 08-22 ones
(`skeptic-provenance-from-commit-date`, `fabricated-worker-receipt`) among them.
The 2026-08-18 survey (5 pinned / 0 declined / 8 open historical) stands as an
audit. **The 2026-08-22 verdict log is red on purpose** — one fabricated worker
receipt is kept as returned so `check-dispatch` shows it — **and so is the
2026-09-14 one**, whose four high-stakes votes ran on the mid tier as logged
downgrades. Full dated entries:
[`feedback/`](feedback/) — filenames are `YYYY-MM-DD-<topic>.md`, so the
listing reads oldest-first; scroll to the bottom for the newest entries.
