# Build spec — rigor data-engineering verification layer

**Path (target):** `~/dev/rigor/docs/plans/2026-07-02-rigor-dataeng-verification-layer.md`
**status:** execution-ready — refuted 2026-07-02; amendments applied (scrub architecture, refute move labels, ledger paths, refute scope note, ADR number, rationale externalized to a gitignored side-file)
**Executor:** agent in Plan Mode. Every `git` step is a command emitted for the human; the agent never commits (git-guard is active).
**Gate-discipline:** no Task starts until the prior Task's acceptance criteria are green. Open an ADR if any criterion can't be met rather than weakening it.

---

## 1. Thesis

rigor today verifies *claims, git history, and status* — assertions an agent makes about code. Data-engineering work shifts the verified object to *properties of data and transformations*, which are statistical and semantic, not syntactic. The rigor **mechanism** transfers wholesale: gate at a boundary, fail closed, emit an audit trace, and verify the claim rather than the gate (gate-green ≠ data-correct). Only the **predicates** are new. This layer adds four single-pattern judgment skills, one `refute` specialization, and one surface-scrub extension — and explicitly declines to ship a universal automated data gate, because that is not honestly buildable.

## 2. What ships / what explicitly does NOT

**Ships:** four data-eng judgment skills; a `refute` data-claim specialization (carries test-path-fidelity); an extended surface-scrub gate (denylist categories in the tracked `.example` + synthetic-token fixture tests — the tracked scanner stays name-free); README status rows; one ADR.

**Does NOT ship, and the spec says so in the README and the ADR:**
- No universal `check-dq.mjs` / `check-no-lookahead.mjs` that "validates any pipeline." The target schema is unknown to rigor; a gate that claims to validate arbitrary pipelines is a correct-shaped lie. rigor ships the discipline the agent applies *inside* the target repo, not a turnkey validator.
- No new agent. `skeptic-verifier` is the refutation engine; these skills give it checklists. (rigor's own rule: do not ship agents that don't fire.)
- No new command in v1 (fork 3). `/verify-claim` specializes via the skills.

The two hardest gates — **test-path-fidelity** and **no-lookahead** — are semantic. rigor ships *how to attack them*, not automation that closes them. This is stated, not implied.

## 3. Open forks (resolve before Task 1)

1. Skills, not scripts (generators deferred to phase 2). **Default: accept.**
2. test-path-fidelity as a `refute` extension, not a standalone skill. **Default: accept.**
3. No new command; specialize `/verify-claim`. **Default: accept.**
4. Employer/vendor/project names never enter tracked files — they live only in the gitignored rationale side-file (`*.local.md`) and the gitignored `surface-scrub.denylist`; the tracked scanner and its tests stay name-free (synthetic tokens only). **Default: accept.**

## 4. Component inventory

| Component | Kind | New/Extended | Fork dep |
|---|---|---|---|
| `data-quality-fail-closed` | skill | new | — |
| `no-lookahead` | skill | new | — |
| `idempotent-restatement` | skill | new | — |
| `lineage-replay` | skill | new | — |
| `refute` (+ data-claim moves) | skill | extended | 2 |
| surface-scrub gate (denylist categories + synthetic fixtures; scanner name-free) | script/gate | extended | 4 |
| README status rows + ADR-0002 | docs | new | — |

---

## Task 1 — skill `data-quality-fail-closed`

**Files:** create `skills/data-quality-fail-closed/SKILL.md`
**Interfaces:** cross-links `refute` (recompute + re-execute); consumed by `skeptic-verifier` when the claim is a DQ-suite pass.

- [ ] **Step 1: Write the skill (domain-neutral, surface-scrubbed).**

```markdown
# data-quality-fail-closed

A data-quality constraint has three outcomes, not two: pass, fail, and
**unevaluable** — the constraint could not be computed (null or empty input,
missing partition, schema drift, zero denominator, parse failure). Fail-closed
means unevaluable **halts**; it is not silently passed, and it is not coerced
into fail. Halt and fail are different terminal states.

## Moves
1. Enumerate coercion sites: every cast, aggregate, join, division, and
   default-fill where an unevaluable input can become a pass or a fail value.
   These are where three-valued logic collapses to two-valued.
2. Assert the three-valued outcome survives each site end to end.
3. Prove the gate halts on unevaluable: a test that feeds an unevaluable input
   and asserts the pipeline **stops** — not that it returns fail. A test that
   only checks fail has not exercised the halt path.

## Anti-pattern (correct-shaped lie)
A numeric-cast helper that turns a parse failure or null into a fail (or, worse,
a 0), while its unit test feeds only well-formed numbers and never exercises the
failure branch — a green test that never sees the coercion. The arithmetic is
real; the experiment is self-referential.

## Refute link
"The DQ suite is green" → confirm an unevaluable input was actually fed and the
pipeline halted. Green means the tests ran; it does not mean the unevaluable
branch was one of them.
```

- [ ] **Step 2:** `cd ~/dev/rigor && node scripts/check-surface-scrub.mjs` → **Expected:** `surface-scrub: clean` (extend scrub in Task 6 if this leaks; do not weaken the example).
- [ ] **Step 3: Commit (command for Hossain)**
```bash
cd ~/dev/rigor
git add skills/data-quality-fail-closed/SKILL.md
git commit -m "feat(skills): data-quality-fail-closed (tri-state, halt-on-unevaluable)"
```

---

## Task 2 — skill `no-lookahead`

**Files:** create `skills/no-lookahead/SKILL.md`
**Interfaces:** cross-links `idempotent-restatement` (shared tiebreak seam); `refute`.

- [ ] **Step 1: Write the skill.**

```markdown
# no-lookahead

In any as-of / point-in-time dataset, no row's value may depend on data
timestamped **after** that row's as-of instant. Lookahead is future information
bleeding into the past. It invalidates the result silently — the pipeline is
green, the data is wrong.

## Moves
1. Name the as-of key on every row. If there isn't one, that is the first defect.
2. Enumerate every join, window function, and aggregate that can reach a row
   with a later timestamp than the current row's as-of. Each is a leak candidate.
3. Test with **restatement / backfill** — a later-arriving correction to a past
   period — not only append-only forward data. Append-only can pass while
   restatement leaks through the same code.

## Anti-pattern (correct-shaped lie)
An order-invariance test proves the final transform is order-independent, while
the upstream tiebreak that resolves same-key records by ingest order is never
tested with a same-key restatement. The proven property is real but narrow; the
seam where lookahead actually enters is the one left untested.

## Claim calibration
Say "the final transform is order-invariant," not "the load order cannot leak,"
until a same-key restatement test lands. The stronger claim is unearned until the
seam is exercised.
```

- [ ] **Step 2:** run surface-scrub → **Expected:** `surface-scrub: clean`.
- [ ] **Step 3: Commit (command for Hossain)**
```bash
cd ~/dev/rigor
git add skills/no-lookahead/SKILL.md
git commit -m "feat(skills): no-lookahead (as-of leakage via restatement seam)"
```

---

## Task 3 — skill `idempotent-restatement`

**Files:** create `skills/idempotent-restatement/SKILL.md`
**Interfaces:** cross-links `no-lookahead`; `refute` (re-execute + diff).

- [ ] **Step 1: Write the skill.**

```markdown
# idempotent-restatement

Rerunning a pipeline, or reprocessing a source that resends or revises records,
must not double-count and must resolve same-key records deterministically.

## Moves
1. Reruns are idempotent: same input → same output, no accumulation. Prove it by
   running twice and diffing, not by reasoning about the code.
2. Same-key restatement resolves by an **explicit, tested** tiebreak — not by
   arrival order and not by chance.
3. Exercise the tiebreak with adversarial same-key input: two records, same key,
   different values, out-of-order arrival. If that path never runs in a test, the
   tiebreak is assumed, not verified.

## Anti-pattern
A merge that assumes last-writer-wins by arrival order, tested only with distinct
keys, so the same-key collision path is never executed. The test suite is green
on the one input distribution that hides the defect.
```

- [ ] **Step 2:** surface-scrub → **Expected:** clean.
- [ ] **Step 3: Commit (command for Hossain)**
```bash
cd ~/dev/rigor
git add skills/idempotent-restatement/SKILL.md
git commit -m "feat(skills): idempotent-restatement (rerun + same-key tiebreak)"
```

---

## Task 4 — skill `lineage-replay`

**Files:** create `skills/lineage-replay/SKILL.md`
**Interfaces:** reuses `refute`'s "re-execute the real gate" move against replay claims.

- [ ] **Step 1: Write the skill.**

```markdown
# lineage-replay

Every published dataset carries a content-addressed identity, and any
reproducibility or replay claim is **executed and diffed**, never asserted.

## Moves
1. Content-address the batch: hash of inputs + code + config, so identity is
   verifiable, not merely named.
2. "Replay is reproducible / byte-equivalent" is a claim. Re-execute from the
   recorded identity and diff the output. If you have not diffed, you have not
   verified — you have described.
3. Name the provenance rung honestly, in order:
   tamper-evident (a hash) < signed < attested < revocable. Do not call a hash
   "signed." Do not call retrieval "replay."

## Anti-pattern
A "byte-equivalent replay" line in the docs that no test ever re-executes. The
reproducibility is asserted; the diff never runs.
```

- [ ] **Step 2:** surface-scrub → **Expected:** clean.
- [ ] **Step 3: Commit (command for Hossain)**
```bash
cd ~/dev/rigor
git add skills/lineage-replay/SKILL.md
git commit -m "feat(skills): lineage-replay (content-address + executed replay diff)"
```

---

## Task 5 — extend `refute` with data-claim moves (fork 2)

**Files:** edit `skills/refute/SKILL.md`
**Interfaces:** consumed by `skeptic-verifier`, `/verify-claim`. Must not duplicate `implemented-vs-planned`'s remit (status verbs), nor re-specify empirical recompute (already refute's).

- [ ] **Step 1: Append a data-claim section to `refute` (do not restructure the four existing moves).**

```markdown
## Data-claim specialization

When the claim is about data or pipeline correctness ("the pipeline passes",
"the DQ suite is green", "replay is byte-equivalent", "no lookahead"), gate-green
is not claim-true. Add:

- **Move 5 — test-path fidelity.** Confirm the passing test exercised the *production
  transform path* — the real cast, join, window, merge under claim — not a bypass
  fixture, a hand-built output, or synthetic input that skips the coercion. A
  green test on a fabricated output validates nothing about the pipeline. This is
  the primary data-engineering correct-shaped lie; default to refuted until the
  production path is shown to have run.

Specialize the existing moves: **recompute (move 1)** at least one DQ metric from
raw output; **re-execute the gate (move 2)** by running replay and the
idempotent-rerun and diffing, rather than trusting the assertion.
```

- [ ] **Step 2:** `node --test` (refute's own tests still green) and surface-scrub → **Expected:** pass; clean.
- [ ] **Step 3: Commit (command for Hossain)**
```bash
cd ~/dev/rigor
git add skills/refute/SKILL.md
git commit -m "feat(refute): data-claim moves; test-path-fidelity as move 5"
```

*If fork 2 flips to standalone:* create `skills/test-path-fidelity/SKILL.md` with move 5 as its body, cross-link from `refute`, and adjust this Task's commit accordingly.

---

## Task 6 — extend the surface-scrub gate (fork 4)

**Files:** edit `surface-scrub.denylist` (gitignored, local-only); edit `surface-scrub.denylist.example`; edit `tests/surface-scrub.test.mjs`
**Interfaces:** the gate that keeps every new skill domain-neutral. Dogfoods this layer against rigor's own scrub.
**Architecture constraint (unchanged from `check-surface-scrub.mjs`'s own contract):** the tracked scanner carries NO names — the fingerprint list lives only in the gitignored denylist, loaded at the CLI boundary. `scripts/check-surface-scrub.mjs` is NOT edited in this task. "Ticker-like tokens" is explicitly out of scope: a generic short-uppercase pattern false-positives on ordinary acronyms (JSON, YAML, ADR).

- [ ] **Step 1 (local, never committed): Add engagement-fingerprint tokens to the gitignored `surface-scrub.denylist`** — target-employer names, data-vendor and warehouse product names *when tied to a specific engagement*, and real schema/table identifiers. Keep generic technical terms (Spark, Parquet, join) out of the denylist — scrub *engagement* fingerprints, not the vocabulary.

- [ ] **Step 2: Extend the tracked `surface-scrub.denylist.example`** with commented *category* guidance for the new classes (employer names; engagement-tied vendor/warehouse product names; real schema/table identifiers) — categories only, no real names.

- [ ] **Step 3: Add a fixture test with SYNTHETIC tokens** — pass an invented engagement-shaped denylist (e.g. `acme-capital`, `fakevendor-dwh`) explicitly to `findFingerprints` (the existing test pattern; fixtures carry no real names) → **Expected:** flagged. And assert the four new skills scan clean.

- [ ] **Step 4:** `node --test tests/surface-scrub.test.mjs` → **Expected:** PASS. Then `node scripts/check-surface-scrub.mjs` over the repo (with the extended local denylist) → **Expected:** `surface-scrub: clean`.

- [ ] **Step 5: Commit (command for Hossain)** — the denylist itself is gitignored and never part of this commit.
```bash
cd ~/dev/rigor
git add surface-scrub.denylist.example tests/surface-scrub.test.mjs
git commit -m "feat(scrub): engagement-fingerprint categories in example + synthetic fixtures"
```

---

## Task 7 — README status rows + ADR

**Files:** edit `README.md`; create `docs/adr/0002-dataeng-is-judgment-not-a-universal-gate.md`

- [ ] **Step 1: Add a new "Data-eng layer" status table to the README** (alongside the existing v1-spine and Phase-2 tables), listing the five components as `provisional`. **Update `refute`'s existing row** from `**settled** — 2 domains (numeric + citation scope)` to `**settled** — 2 domains (numeric + citation scope); data-claim moves provisional`, so the settled tag does not silently cover the unproven extension. Add one line under "What's in v1": *"Data-eng verification is judgment + refutation, not a turnkey validator — see ADR-0002."*

- [ ] **Step 2: Write the ADR.**
```markdown
# ADR-0002 — Data-eng verification is judgment, not a universal gate

**Status:** Accepted (2026-07-02)

## Context
The verified object in data engineering (a table, a transform) lives in the
target repo with a schema rigor cannot know. A shipped `check-*.mjs` claiming to
validate arbitrary pipelines would certify pipelines it never understood — the
exact correct-shaped lie rigor exists to catch.

## Decision
Ship the discipline (skills), the refutation moves (refute specialization), and
the fingerprint gate (surface-scrub) — not a universal automated data validator.
The agent applies the checks inside the target repo. Generators (templates
stamped into the target) are deferred to phase 2.

## Consequences
- rigor makes no claim to auto-verify pipelines; the README says so.
- test-path-fidelity and no-lookahead remain semantic: rigor ships how to attack
  them, not automation that closes them.
```

- [ ] **Step 3:** surface-scrub → clean.
- [ ] **Step 4: Commit (command for Hossain)**
```bash
cd ~/dev/rigor
git add README.md docs/adr/0002-dataeng-is-judgment-not-a-universal-gate.md
git commit -m "docs: data-eng status rows + ADR-0002 (judgment, not universal gate)"
```

---

## Acceptance criteria (all must be green)

- Each new skill: one travelling pattern, one surface-scrubbed anti-pattern, a refute cross-link; scans clean against the extended local denylist.
- `refute` extension: named move 5; no duplication of `implemented-vs-planned` or of recompute.
- surface-scrub extension: synthetic-token fixture flagged; four new skills clean; the tracked scanner, example, and tests contain no real engagement names; `node --test` passes.
- No new agent; no new command (unless fork 3 flips).
- README "Data-eng layer" table lists all five as `provisional`; `refute`'s row carries the data-claim scope note; ADR-0002 present.

## Provisional → settled

Each new skill settles after it fires in **≥2 independent data-eng contexts**, consistent with rigor's existing rule. Log each firing as a **dated entry file in `docs/feedback/`** and update the component's row in `docs/feedback/FEEDBACK.md` — the ledger holds only the promotion table now; the dated files beside it are the record. Until then, `provisional` means *extracted, not yet validated across unfamiliar domains* — not "unused."

---

## Rationale — externalized (fork 4)

The role/engagement mapping that motivated these skills lives in a **gitignored local
side-file**: `docs/plans/2026-07-02-rigor-dataeng-verification-layer.rationale.local.md`
(covered by the `*.local.md` rule in `.gitignore`). It never enters a skill file, this
spec, or public history — same treatment as `surface-scrub.denylist`. The repo has a
public remote; engagement names in a committed doc would be permanent history.
