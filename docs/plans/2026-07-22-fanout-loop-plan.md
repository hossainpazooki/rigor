# `/rigor:fanout-loop` (ADR-0008) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `/rigor:fanout-loop` command (one loop iteration per invocation, tier-laddered fan-out per ADR-0007), fix `check-dispatch`'s receipt-normalization false positive, record ADR-0008, and queue settlement runs 4–5 as the first instantiation.

**Architecture:** Four self-contained changes: (1) a gate-side `receiptMatches` normalization in `check-dispatch.mjs` (TDD, fail-closed on ambiguity); (2) a new domain-neutral command file `commands/fanout-loop.md`; (3) ADR-0008 + index maintenance; (4) a `## Run queue` section in the settlement effort's STATE.md. `check-runlog` is deliberately NOT built here — the spec defers it to run 4 itself (ADR-0004's "mechanize on the 4th run" condition), encoded in the run-queue entry.

**Tech Stack:** Node stdlib only (`node:test`, no deps). Markdown for command/ADR/STATE files.

## Global Constraints

- Spec: `docs/specs/2026-07-22-fanout-loop-design.md` — every requirement traces there.
- **Agents never run `git commit`/`git push`** (git-guard enforces): every "Commit" step means *output the command block for the operator*, then keep working.
- The shipped surface (`commands/`, `skills/`, `agents/`) must stay domain-neutral: no repo names, no run content. `node scripts/check-surface-scrub.mjs` must stay clean.
- `docs/` may name domains freely.
- Merge floor: `node --test` fully green (`133` tests expected after Task 1: 128 current + 5 new).
- Learnings entries need capture-time anchoring (ADR-0003 §5): fill `ts:`/`commit:` at write time from `date -u +%Y-%m-%dT%H:%M:%SZ` and `git rev-parse --short HEAD`, never batch-stamped later.
- Windows box: console output ASCII; use forward-slash paths in commands.

---

### Task 1: `check-dispatch` receipt normalization (`receiptMatches`)

**Files:**
- Modify: `scripts/check-dispatch.mjs` (class-4 comparisons at the two `answered !== requested` sites, lines ~45 and ~77; new exported helper)
- Test: `tests/dispatch-check.test.mjs`

**Interfaces:**
- Produces: `export function receiptMatches(requested, answered, config = {})` → boolean. True iff `answered` is exactly `requested` (trimmed), or contains `requested` as a whole token (delimited by non-`[A-Za-z0-9-]` characters or string edges) with **no other configured tier model** (`config.judgment/mid/build/cheap`) also token-present. Consumed only inside `findDispatchViolations`, whose signature does not change.

- [ ] **Step 1: Write the failing tests** — append to `tests/dispatch-check.test.mjs` (also import `receiptMatches` in the top import line):

```js
// Gate-side receipt normalization (ADR-0006 open item; learnings 2026-07-19-receipt-
// answered-needs-bare-model-id): display-name echoes that CONTAIN the requested id are
// not downgrades; anything ambiguous or genuinely different still fails closed.
test('a worker display-name echo containing the requested id is not a downgrade', () => {
  const r = worker({ verifier_model: { requested: 'model-b', answered: 'Builder 5 (model-b)' } });
  assert.deepEqual(findDispatchViolations([r], CONFIG), []);
});

test('a verifier display-name echo containing the requested id is not a downgrade', () => {
  const r = clean({ verifier_model: { requested: 'model-j', answered: 'Judgment 5 (model ID: model-j)' } });
  assert.deepEqual(findDispatchViolations([r], CONFIG), []);
});

test('normalization never matches an extended id (token boundary, not substring)', () => {
  assert.equal(receiptMatches('model-j', 'model-j2', CONFIG), false);
  assert.equal(receiptMatches('model-j', 'model-j-mini', CONFIG), false);
});

test('a display echo of the WRONG id is still a downgrade', () => {
  const r = worker({ verifier_model: { requested: 'model-b', answered: 'Judgment 5 (model-j)' } });
  const bad = findDispatchViolations([r], CONFIG);
  assert.equal(bad.length, 1);
  assert.match(bad[0].reason, /silent downgrade/);
});

test('an answered echoing a second configured model is ambiguous — fail-closed', () => {
  const r = clean({ verifier_model: { requested: 'model-j', answered: 'model-j (fallback: model-c)' } });
  const bad = findDispatchViolations([r], CONFIG);
  assert.equal(bad.length, 1);
  assert.match(bad[0].reason, /silent downgrade/);
});
```

- [ ] **Step 2: Run and verify the red is the right red**

Run: `cd ~/dev/rigor && node --test tests/dispatch-check.test.mjs`
Expected: exactly the first two new tests FAIL (silent-downgrade violations where `[]` was asserted). The other three PASS today — they are regression guards pinning behavior the normalization must not break. If either guard fails now, stop: the baseline is not what this plan assumes.

- [ ] **Step 3: Implement** — in `scripts/check-dispatch.mjs`, add above `findDispatchViolations`:

```js
/** A receipt matches when answered IS the requested id, or unambiguously contains it
 * as a whole token (display-name echo). Any other configured tier model also present
 * makes the receipt ambiguous — fail-closed. Complements, never replaces, the bare-id
 * prompt discipline (learnings 2026-07-19). */
export function receiptMatches(requested, answered, config = {}) {
  const req = (requested ?? '').trim();
  const ans = (answered ?? '').trim();
  if (req !== '' && req === ans) return true;
  const token = (hay, needle) => {
    const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^A-Za-z0-9-])${esc}($|[^A-Za-z0-9-])`).test(hay);
  };
  if (req === '' || !token(ans, req)) return false;
  const others = ['judgment', 'mid', 'build', 'cheap']
    .map((t) => config[t])
    .filter((m) => typeof m === 'string' && m !== req);
  return !others.some((m) => token(ans, m));
}
```

Then replace both class-4 comparisons (worker branch and verifier branch):

```js
if (!receiptMatches(r.verifier_model.requested, r.verifier_model.answered, config) && r.downgraded !== true) {
```

(The two `bad.push` messages stay byte-identical.)

- [ ] **Step 4: Verify green + no collateral**

Run: `node --test tests/dispatch-check.test.mjs` → 26 pass, 0 fail.
Run: `node --test` → 133 pass, 0 fail.

- [ ] **Step 5: Commit checkpoint** — output for the operator (do not run):

```bash
cd ~/dev/rigor
git add scripts/check-dispatch.mjs tests/dispatch-check.test.mjs
git commit -m "fix: check-dispatch receipt normalization, fail-closed on ambiguity"
```

---

### Task 2: `commands/fanout-loop.md`

**Files:**
- Create: `commands/fanout-loop.md`

**Interfaces:**
- Consumes: nothing from Task 1 (independent).
- Produces: the shipped command; `$ARGUMENTS` = path to an effort directory (one containing `STATE.md` + `run-log.jsonl`). Task 4's run-queue section is what a real invocation will read.

- [ ] **Step 1: Create the file** with exactly this content (format mirrors `commands/pickup.md`: frontmatter + imperative body):

```markdown
---
description: Execute ONE iteration of an effort's fan-out loop — pick-up, derive the run, dispatch a tier-laddered pipeline, gate the receipts, write the ledgers, emit commit commands. Recurrence belongs to the host loop, never to this command.
status: provisional
---

Execute one iteration of the fan-out loop for the effort at the path below
(a directory containing `STATE.md` and `run-log.jsonl`). Apply the seven
steps in order; halting early is a recorded outcome, not a failure.

1. **Enter via pick-up.** Refute the effort's STATE.md before trusting it.
   `paused: true` halts fail-closed before any dispatch.
2. **Derive this run.** Pop the next entry from STATE.md's `## Run queue` if
   one exists; otherwise derive a sweep item list from the effort's backlog.
   No real candidate ⇒ record an honest dry pass — never invent an item to
   feed the loop.
3. **Dispatch as one Workflow script** (`orchestrate` guardrails):
   `pipeline(item → evidence-gather [build tier] → primary skeptic
   [judgment tier] → extra votes [mid tier])`, tiers sourced from
   `config/models.json` via `args`; run `check-tier-placement` on the
   script before launch. Budget: ≤150k subagent tokens per iteration (L1);
   anything larger halts and asks the operator.
4. **Exit gates, re-run by the orchestrator.** `check-dispatch` clean on the
   per-run verdict log (`<effort>/runs/run-N-verdicts.jsonl`), and the
   target repos' own gates for any status move — logs index candidates;
   only a gate re-run moves a status.
5. **Ledger writes.** Append the run to `run-log.jsonl` (the first entry
   this loop writes records the standing L1 authorization and the
   instantiation's total token ceiling); refresh STATE.md through
   `implemented-vs-planned`; write dated feedback entries for real firings.
6. **Emit commit commands** for the operator. Never write git history.
7. **Terminate or continue.** End the loop (tell the host loop to stop) on:
   two consecutive dry passes, the instantiation's total ceiling, or
   `paused: true`. A dry pass is a logged run, not a silent skip.

Credit boundary: a dispatch adjudicating a claim in a target repo may credit
that repo as an independent domain; a dispatch about the effort's own
bookkeeping is use only. The workflow's self-reported success is a claim —
re-run the load-bearing checks yourself.

Effort: $ARGUMENTS
```

- [ ] **Step 2: Verify the surface stays neutral**

Run: `node scripts/check-surface-scrub.mjs`
Expected: `surface-scrub: clean`

- [ ] **Step 3: Verify the suite is untouched**

Run: `node --test` → 133 pass, 0 fail.

- [ ] **Step 4: Commit checkpoint** — output for the operator:

```bash
cd ~/dev/rigor
git add commands/fanout-loop.md
git commit -m "feat: fanout-loop command — one tier-laddered loop iteration (ADR-0008)"
```

---

### Task 3: ADR-0008 + index maintenance

**Files:**
- Create: `docs/adr/0008-fanout-loop.md`
- Modify: `docs/adr/README.md` (append 0008 row after 0007; refresh 0002 row's stale Open column)

**Interfaces:**
- Consumes: Task 1's fix and Task 2's command exist (the "As built" column states them).
- Produces: the decision record Task 4's queue entries cite.

- [ ] **Step 1: Create `docs/adr/0008-fanout-loop.md`:**

```markdown
# ADR-0008 — fanout-loop: one command per iteration, chassis plus tier ladder

**Status:** Accepted 2026-07-22 — operator approved the design in-session
(spec: `docs/specs/2026-07-22-fanout-loop-design.md`); built same day.

## Context

The backlog-settlement effort needs recurring runs, and ADR-0007's tier
ladder needs real dispatches (at acceptance, no mid-tier dispatch had ever
run). Both existed as settled machinery with no composition: the ADR-0004
chassis has no notion of a fan-out, and `fanout-build` has no notion of
recurrence. Hand-running each iteration re-derives the same skeleton every
time and invites drift on exactly the steps (budget, gates, ledgers) that
must not drift.

## Decision

Ship `commands/fanout-loop.md`: **one invocation = one iteration** of a
named effort's loop — pick-up entry, run derivation (queue then sweep),
one tier-laddered Workflow dispatch, receipt + target-gate exit, ledger
writes, emitted commit commands. Recurrence belongs to the host
(`/loop /rigor:fanout-loop <effort>`), self-paced; the command never
schedules its own wakeups.

Authorization: invoking the host loop IS the recorded standing go for L1
iterations (≤150k subagent tokens each); recon-scale halts and asks. Each
instantiation sets a total ceiling, recorded in its first run-log entry.
Termination: two consecutive dry passes, the ceiling, or `paused: true`.

Two open items from prior ADRs are folded into the first instantiation as
obligations, not left dangling: ADR-0004's `check-runlog` gate is built by
run 4 itself (the ADR's "mechanize on the 4th run" condition), and
ADR-0006's receipt normalization was fixed gate-side before any verdict
log from this loop is trusted (`receiptMatches`, fail-closed on ambiguity).

## Consequences

- Every iteration emits a verdict log with the three-way
  Fable/Opus/Sonnet receipt split — each run is also ADR-0006/0007
  receipt evidence.
- The loop inherits the settlement rules it serves: no manufactured
  firings (a dry pass is a logged run), and the domain-credit boundary —
  target-repo adjudications may credit domains; effort bookkeeping is use
  only.
- Honest caveats: the first instantiation is rigor's own effort (use, not
  an independent domain for the command); same operator throughout; the
  mid tier is unexercised until the first iteration actually runs — a
  receipt mismatch there is a finding, not a design failure.
```

- [ ] **Step 2: Append the 0008 index row** in `docs/adr/README.md`, directly under the 0007 row (same table):

```markdown
| [0008](0008-fanout-loop.md) | fanout-loop command: one invocation = one tier-laddered loop iteration; recurrence belongs to the host loop; standing L1 go per iteration with a per-instantiation ceiling | **Accepted** 2026-07-22 | Built — `commands/fanout-loop.md` + `check-dispatch` receipt normalization (`receiptMatches`, red-first). `check-runlog` deliberately deferred to run 4 (ADR-0004's own condition) | First instantiation (settlement runs 4–5) not yet executed; mid tier still without a live dispatch until it runs |
```

- [ ] **Step 3: Refresh the stale 0002 Open column** — in the 0002 row, replace:

`All four skills are still **origin-only** (VANTAGE); none has a non-origin domain`

with:

`Three of four skills still **origin-only** (VANTAGE); `data-quality-fail-closed` reached its first non-origin domain 2026-07-19 (1 of ≥2)`

- [ ] **Step 4: Commit checkpoint** — output for the operator:

```bash
cd ~/dev/rigor
git add docs/adr/0008-fanout-loop.md docs/adr/README.md
git commit -m "docs: ADR-0008 fanout-loop accepted; refresh 0002 index row"
```

---

### Task 4: Settlement STATE.md run queue

**Files:**
- Modify: `docs/efforts/backlog-settlement/STATE.md` (new `## Run queue` section between `## Goal` and `## Backlog`; update the `last-updated` header line)

**Interfaces:**
- Consumes: ADR-0008 (cited as governor), Task 2's command (the queue's consumer).
- Produces: the two queued runs a real `/rigor:fanout-loop` invocation will pop.

- [ ] **Step 1: Insert the section** (verbatim; this is planned work and says so):

```markdown
## Run queue (planned — consumed top-down by /rigor:fanout-loop, ADR-0008)

Standing authorization for this instantiation, recorded here and in the
first run-log entry the loop writes: L1 per iteration (≤150k subagent
tokens), total ceiling 1M, terminate on 2 consecutive dry passes. Queue
entries are PLANNED work; nothing below is done until its run-log entry
and gate evidence exist.

1. **Run 4 — adjudication.** (a) Build `check-runlog` red-first (runs 1–3
   entries as green fixtures, a mutated twin red) BEFORE appending this
   run's entry — discharges ADR-0004's "mechanize on the 4th" condition;
   (b) adjudicate RRE PR #16's merge gate for `gate-discipline` domain 2 —
   did CI actually run the differential harness at merge?; (c) write the
   ADR-0006 criterion-2 FEEDBACK pointer entry (VANTAGE Gate B receipts);
   (d) refresh this file's stale backlog rows (dq-fail-closed 1/2;
   ADR-0005 settled).
2. **Run 5 — ledger-kit domain 2.** Verify passed-vs-true-demo's and
   CLDD's ledger adoptions: run `check-learnings` on each ledger,
   reproduce one entry's quoted basis at its own anchor (the run-2
   lesson); note pvt-demo's build is RED-by-design pending its re-pin.
   Credit ledger kit domain 2 (same-operator caveat) or record a misfire.

After the queue drains: sweep mode (derive items from the backlog rows
below), until dry.
```

- [ ] **Step 2: Update the header** — change the `last-updated:` line to the current UTC timestamp and session id, and append to the `last-run:` line: ` · run queue added 2026-07-22 (ADR-0008), runs 4–5 queued`.

- [ ] **Step 3: Verify nothing broke**

Run: `node --test` → 133 pass, 0 fail. Run: `node scripts/check-surface-scrub.mjs` → clean (STATE.md is docs/, unscanned — this is a regression check only).

- [ ] **Step 4: Commit checkpoint** — output for the operator:

```bash
cd ~/dev/rigor
git add docs/efforts/backlog-settlement/STATE.md
git commit -m "docs: queue settlement runs 4-5 for fanout-loop (ADR-0008)"
```

---

### Task 5: Learnings entry + final gate sweep

**Files:**
- Create: `docs/learnings/2026-07-22-receipt-normalization-gate-side.md`
- Modify: `docs/learnings/LEARNINGS.md` (index pointer line, if the index file exists — check first; rigor's learnings index convention)

**Interfaces:**
- Consumes: Task 1's shipped `receiptMatches`.
- Produces: the durable record that supersedes the 07-19 entry's "remains unbuilt" clause.

- [ ] **Step 1: Capture anchors at write time** (ADR-0003 §5 — never batch-stamp):

Run: `date -u +%Y-%m-%dT%H:%M:%SZ` and `git rev-parse --short HEAD` — use these values in the next step. Note HEAD here is the pre-commit tree if the operator hasn't run Task 1's commit yet; if so, write `commit: <HEAD> (receiptMatches uncommitted at capture — operator commits pending)` exactly as check-learnings' anchor honesty expects.

- [ ] **Step 2: Create the entry** (7-field schema; fill `<ts>`/`<commit>` from Step 1):

````markdown
ts: <ts>
commit: <commit>
session: 10d1e5e1-afa3-40ab-97bd-6ddbf851cfce (fanout-loop build)
status: verified

fact: Gate-side receipt normalization is now BUILT — `receiptMatches` in
`scripts/check-dispatch.mjs` accepts an `answered` that is, or unambiguously
token-contains, the requested id, and fails closed when any other configured
tier model is also echoed. This supersedes the 2026-07-19 entry's closing
clause ("gate-side normalization remains unbuilt"); that entry's fact and
basis remain true as written. Bare-id prompt discipline stays recommended —
the gate now tolerates display echoes, it does not invite them.

basis:
```
node --test tests/dispatch-check.test.mjs  # 26 pass, 0 fail — includes:
# 'a worker display-name echo containing the requested id is not a downgrade'
#   (red before receiptMatches, green after)
# 'an answered echoing a second configured model is ambiguous — fail-closed'
```

re-verify: node --test tests/dispatch-check.test.mjs (26 pass); confirm
`receiptMatches('model-j', 'Judgment 5 (model-j)', {judgment:'model-j'})`
is true and `receiptMatches('model-j', 'model-j (fallback: model-c)',
{judgment:'model-j', cheap:'model-c'})` is false via `node -e` one-liners.
````

- [ ] **Step 3: Index pointer** — `ls docs/learnings/` to find the index file (`LEARNINGS.md` or `README.md`); append its pointer line in that file's existing format. If no index file exists, skip (the folder convention may be entries-only — do not invent an index).

- [ ] **Step 4: Full gate sweep** (the plan's exit gate):

```
node --test                                  # 133 pass, 0 fail
node scripts/check-surface-scrub.mjs         # clean
node scripts/check-learnings.mjs docs/learnings   # clean (7 entries)
node scripts/check-tier-sync.mjs             # clean (5 agents)
```

If `check-learnings` flags the new entry, fix the entry (not the gate).

- [ ] **Step 5: Final commit checkpoint** — output for the operator:

```bash
cd ~/dev/rigor
git add docs/learnings/
git commit -m "docs: learnings — receipt normalization built gate-side"
```

---

## Not in this plan (deliberate)

- `check-runlog` — built by run 4 itself (spec's folded obligation; ADR-0004's letter).
- Executing any loop iteration — the operator starts the loop with
  `/loop /rigor:fanout-loop docs/efforts/backlog-settlement` when ready.
- The ADR-0006 criterion-2 FEEDBACK pointer entry — queued as run 4(c), needs a rigor
  session's evidence routing, not this build.
```
