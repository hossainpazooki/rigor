# Handoff — ADR-0013 layer committed, mid tier on Opus 5, README rebuilt for the delivery reader

2026-08-22 (UTC) · newest commit this brief describes: **`c04d55b`** ("README
visuals") — pick-up measures drift from here. Written by session `1b845026`.

**This brief supersedes one statement in its predecessor.**
[`2026-08-22-deployment-layer-proposed.md`](2026-08-22-deployment-layer-proposed.md)
was written at `a8f1bb6` and says "everything this session produced is
uncommitted." The operator has since committed it across eight commits
(`166e94a` → `c04d55b`). That brief is immutable and stays as written; this
entry is the correction.
re-verify: `git log --oneline 166e94a~1..c04d55b` (8 commits) and
`git status --short` (one modified path, below).

**Uncommitted at write time:** the five learnings entries + index rows this
command just wrote, this brief, **one README correction** (below), and the
long-standing `docs/comparisons/2026-07-21-dataeng-landscape-deep-research.md`
modification — **not this session's**, now carried unresolved across **six**
briefs.

**A claim in this brief failed its own re-verification and was fixed rather
than softened.** The brief asserted `grep -c -i adr README.md` → 0; executing
it returned **2**, both inside the docs-map diagram added at `c04d55b`
(`DEC --> ADR["adr/…"]` and its `classDef` line). The instruction to strip
decision references had been applied to the prose and missed the diagram
labels. The node is removed in the working tree; the README at `c04d55b` still
carries it.
re-verify: `grep -c -i adr README.md` (0 in the working tree, 2 at `c04d55b`)
and `docs/learnings/2026-08-22-a-content-rule-must-be-applied-to-diagram-labels-too.md`.

## Current state

- **built** ADR-0013 (`docs/adr/0013-deployment-layer-pre-change-authorization.md`),
  **Proposed** — a pre-change authorization gate: four control shapes, six
  properties, a change-class rubric, nine self-refutations, and a named
  residual bypass tail. Committed `166e94a`.
  re-verify: `grep -n "^\*\*Status:\*\*" docs/adr/0013-deployment-layer-pre-change-authorization.md` (Proposed).
- **built** the layer's units, all **provisional, zero independent codebases,
  zero live runs**: six skills under `skills/`, `scripts/check-change-record.mjs`
  (three-outcome gate), `hooks/change-guard.mjs` (second PreToolUse hook),
  `hooks/shell-normalize.mjs` (shared by both hooks), and `git-guard` hardening.
  re-verify: `node --test` (523 pass, 0 fail).
- **built** the merge floor moved 178 → 523 tests across one build and four fix
  rounds; each round's claims were rejected by independent reviewers until
  round 5, which is the first that survived intact.
  re-verify: read `docs/plans/2026-08-22-deployment-layer-build.md` §4.1–4.6.
- **built** `git-guard` closed ten bypass forms, **five of which predate this
  session** (`reset -q --hard`, `reset HEAD~1`, `tag -a -f`, `branch -df`,
  `branch -M`) plus wrappers (`sudo`, `if …; then`, a lone `&`, uppercase
  binaries, `pwsh -c`, `env -S`, `time -p`) and remote-side `gh` writes.
  Recorded as a failure with a pinned closure and a 33/70 red-proof.
  re-verify: `node --test tests/git-guard.test.mjs` (70 pass) and
  `docs/feedback/2026-08-22-git-guard-bypass-forms-misfire.md`.
- **built** mid tier re-pinned `claude-opus-4-8` → **`claude-opus-5`** in
  `config/models.json` and both mid-tier agents' frontmatter; ADR-0007 amended
  in place. Committed `af4284a`. **No receipt has answered on Opus 5 yet** —
  all three integration receipts in the session's verdict log read
  `claude-opus-4-8[1m]`.
  re-verify: `node scripts/check-tier-sync.mjs` (clean, 5 agents) and
  `docs/learnings/2026-08-22-mid-tier-repinned-to-opus-5-with-no-receipt-yet.md`.
- **built** README rewritten twice on operator instruction: first for the
  delivery/correctness reader (change-enablement vocabulary, no toolkit
  coinages, no decision numbers), then with **8 mermaid diagrams**, one per
  section. Committed `e05aab8`, `c04d55b`; one correction still uncommitted
  (the diagram-label reference above).
  re-verify: `grep -c mermaid README.md` (8) and, in the working tree,
  `grep -c -i adr README.md` (0).
- **built** `docs/DECISIONS.md` — the bridge from each README claim to the
  decision behind it, with status and as-built per entry. Committed `b161ba1`.
  re-verify: `ls docs/DECISIONS.md` and follow its links.
- **built** first-domain rehearsal at **record level only**
  (`docs/audits/2026-08-22-deployment-layer-first-domain-rehearsal.md`): the
  gate refuses an honest proposal built from the target's real pipeline on
  P1×4 / form×2 / P4, and both artifact-integrity twins are red on the real
  rendered overlay.
  re-verify: `cd docs/audits/2026-08-22-first-domain-rehearsal && node ../../../scripts/check-change-record.mjs change-log.twin-p2-tampered.jsonl --root .` (exit 1, a P2 line).
- **built** ledgers: 32 learnings entries (gate clean), 4 closure records
  (2 pinned, 2 open), 3 new feedback entries, STATUS re-stamped with
  provisional counts 8 / 20 / 5 / 3 / 11.
  re-verify: `node scripts/check-learnings.mjs docs/learnings` (clean, 32).
- **built, intentionally red** two gates that must stay red until an operator
  decides: `check-misfire-closure` exits **2** (two open records) and
  `check-dispatch` exits **1** on the session's verdict log (one fabricated
  worker receipt kept exactly as returned).
  re-verify: `node scripts/check-dispatch.mjs docs/plans/2026-08-22-deployment-layer-build.verdicts.jsonl` (exit 1).
- **in-progress** Nothing half-built.
- **planned, not started** A live run in any codebase; a reviewer-level
  known-bad proposal seeded for any of the four review controls (0 of 4
  credited); the residual bypass tail; a three-outcome fix for `check-fanout`
  (below).

## Locked decisions

- **Both hooks are friction that keeps a boundary visible, not a security
  boundary.** Reason: reviewers got agent-written content into `HEAD` by five
  routes and found a long wrapper tail; the real segregation-of-duties control
  is the target repository's branch protection. *Check whether any target ever
  gains required reviewers — that is what would change this.*
- **Pre-change evidence lives in the `proposal` record, post-change evidence in
  the `outcome` record; the emergency-change record is a standalone file on the
  configured ref.** Reason: the first draft put post-implementation evidence in
  a pre-change record, which made every proposal fail its own probe check.
- **`artifact.identity` is a generic list; per-target identity rules live in the
  authorization record, not in rigor's schema.** Reason: per-kind rules inside
  rigor are a generic validator by another name (ADR-0002).
- **The class-demotion rule (≥2 clean instances, downward) and the 30-day /
  10th-instance sweep cadence are new, invented parameters — not a reuse of the
  promotion rule.** Reason: the promotion ledger counts independent codebases
  upward; claiming reuse was rejected on the record.
- **Round 5 was the final fix round; the residual tail is recorded, not
  closed.** Reason: pattern-matching hooks do not converge (verb-list rot is
  the ADR's own self-refutation 3), so the honest move is to name what is open.
- **The fabricated receipt stays in the verdict log; the two open closure
  records stay open.** Reason: a cleaned log or a forced decline would be
  precisely the unverified-claim pattern this repo exists to refuse. Deciding
  them is the operator's call, not the agent's.
- **The README carries no decision numbers; `docs/DECISIONS.md` is the bridge.**
  Reason: operator instruction 2026-08-22 — the front page is for a reader
  evaluating correctness and delivery discipline, not for navigating an ADR set.
- **The README uses delivery vocabulary, not toolkit coinages.** Reason: same
  instruction; the internal terms remain in `docs/` and the skills, where the
  audience already has the context.
- **Mid tier = `claude-opus-5`.** Reason: operator instruction 2026-08-22. The
  decision that a mid tier exists is unchanged; only the model string moved,
  and the usage-economics premise remains unmeasured on either model.

## Reuse map

- **`docs/plans/2026-08-22-deployment-layer-build-round5.workflow.mjs`** — the
  matured shape of a red-first fix fan-out, including a normalizer contract
  shared between two consumers. Copy its contract header, not its task list.
- **Dry-evaluating a workflow script before launch** — wrap the script body in
  an async function with stubbed `agent`/`parallel`/`phase`/`log`/`args`
  globals and run it. It caught a `${CLAUDE_PLUGIN_ROOT}` interpolation that
  killed a run in 7 ms with zero agents, and an escaped-quote syntax error.
  Neither `check-fanout` nor `check-tier-placement` evaluates a script, so this
  is currently a habit, not a gate.
- **Old-hook-vs-new-hook probe** — import `git show HEAD:hooks/<hook>.mjs`
  beside the working-tree copy and table both decisions per form. It is the
  cheapest red-proof for a hook change and produced this session's closure
  evidence.
- **Parsing shipped mermaid** — install `mermaid` + `jsdom` in a scratch
  directory *outside* the repo, set `globalThis.window`/`document` from JSDOM,
  and call `mermaid.parse` per fenced block. `mermaid.parse` touches the DOM,
  so a bare import is not enough.
- **`scripts/check-runlog.mjs` → `resolveSupersession(records, { key, label })`**
  — the shared supersession resolver; `check-change-record` consumes it rather
  than reimplementing it.
- **`tests/change-record.test.mjs`** (143 tests, CLI subprocess tests with temp
  roots, three-outcome separation) and **`tests/change-guard.test.mjs`**
  (injected `io` with a spy that throws if a loader is called on an invalid
  path) are the patterns for testing a gate and a hook respectively.

## Invariants

- Agents never write git history **and never trigger a deployment** — the agent
  emits the command and a human runs it. Violated ⇒ the segregation-of-duties
  claim on the front page becomes false.
- A content rule about a document applies to its **diagram labels** as well as
  its prose. Violated ⇒ the page keeps saying what it promised to stop saying,
  invisibly to a prose read (caught this session by a brief's own re-verify
  line).
- **Run verification commands as independent statements, never joined by
  `&&`.** `grep -c` exits 1 on zero matches, so a chain stops silently and a
  trailing `echo "<name> exit=$?"` reports the grep's code under a later
  command's name. This session produced exactly that false confirmation while
  checking this brief; both commands were re-run separately.
- The shipped surface (`skills/`, `agents/`, `commands/`) stays domain-neutral
  (`check-surface-scrub`), and the six ADR-0013 skills never contain the literal
  word "settled". **Scope that grep to those six directories** — a repo-wide
  version hit a validated skill's ordinary English and an agent edited it out of
  scope (reverted).
- Ledger indexes hold pointers, never evidence; dated entries are immutable;
  corrections are new dated entries. Violated ⇒ the ledger stops being a record
  and becomes a summary.
- Fan-out fixers own disjoint files, and **the orchestrator's gate instructions
  must be scoped to those files** — an over-broad instruction is an instruction
  to edit whatever it hits.
- A worker receipt that fails its schema is **re-filled, never placeholdered**.
  `check-dispatch` catches a placeholder only when it cannot echo the requested
  model id; one that echoed the right id would pass.
- `paused: true` in an effort's STATE.md is honored fail-closed. No effort was
  touched this session.

## Open / next

**First: the operator's ruling on ADR-0013** — ratify, reject, or amend. Code
exists ahead of the decision (the ADR-0010 precedent). If rejected, delete the
six skills, the gate, the two hook files, the `hooks.json` entry, and the tests
— but **keep the `git-guard` hardening regardless**, since it closes holes that
predate the ADR.

Then, in rough order:

1. **Decide the two open closure records** — the reviewer that dated a
   working-tree edit by its file's last commit, and the fabricated worker
   receipt. Pin or decline with a date; the closure gate exits 2 until then.
   re-verify: `node scripts/check-misfire-closure.mjs docs/learn/closure-log.jsonl` (exit 2).
2. **Seed one reviewer-level known-bad proposal** for one review control in one
   real codebase — the cheapest path to crediting anything in the layer, since
   0 of 4 review controls have ever fired.
3. **`check-fanout` reports "not applicable" as "passed"** — it early-returns on
   any file without `parallel(`/`pipeline(`, so an empty file, a one-word file,
   and README.md all print "trustworthy-build scaffolding present" and exit 0.
   A mistyped path reads as a clean lint. The fix is the three-outcome shape the
   repo's newer gates already use. This session's own five scripts were
   genuinely checked, so no result here is retroactively void.
   re-verify: `node scripts/check-fanout.mjs README.md` (exit 0, "scaffolding present").
4. **First-domain prerequisites** before any live run is possible: a
   required-reviewer rule on the target's production environment, and rendering
   plus committing the substituted manifest before dispatch (rehearsal §7).
5. **Adjudicate `judgment-dispatch`** — it now has a fourth candidate firing.
6. **Resolve `docs/comparisons/2026-07-21-…`** — sixth brief carrying it.

**Blocker on none of the above.** Standing caveat for the receiving session:
every reviewer verdict in the build record was reached against the **working
tree**, before the operator's commits. The tree is now committed and
`node --test` is 523/523 at `c04d55b`, so the claims and the commits agree —
but re-run the floor yourself rather than believing this line.
