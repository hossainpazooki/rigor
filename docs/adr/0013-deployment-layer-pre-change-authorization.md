# ADR-0013 — Deployment layer: a pre-change authorization gate, not a deploy tool

**Status:** **Proposed 2026-08-22.** Nothing in this ADR is practice until it is
ratified; every unit it proposes enters as **provisional** and stays provisional
until it survives two independent domains under the promotion rule in
`docs/feedback/FEEDBACK.md` (which `docs/STATUS.md` tracks). The word "settled"
does not appear below in reference to anything this ADR adds.

**Revision note.** This text is the second draft. The first was refuted the same
day by three judgment-tier skeptics (verdicts in
`docs/plans/2026-08-22-deployment-layer-build.md`); the blocking findings — the
segregation-of-duties inference was false, a second promotion rule was being
called a reuse, and unbuilt code was described in the present tense — are fixed
below and the fixes are marked where they matter.

## Context

### Where rigor sits, in the change-enablement process's own words

rigor sits inside an existing change-enablement process. It never bypasses a
control; it makes the existing controls faster and refuses to let an agent skip
one. The agent **proposes** a change and the evidence for it (model-risk surface
kept narrow: typed claims, typed attacks). Deterministic gates **decide** whether
the evidence is sufficient (testable code, versioned, in the test floor). A
**human promotes** everything durable — that is a segregation-of-duties
invariant, not a maturity stage. The deployment layer extends this from "may the
agent write git history" (`git-guard`) to "may the agent's proposed change
proceed to implementation."

The vocabulary below — change enablement, backout plan, release integrity, SLO
health signal, post-implementation review, break-glass, standard / normal /
emergency change — is a **translation** of rigor's own vocabulary (refute,
negative control, fail-closed on unevaluable, logged bypass) for reviewers who
have never read `refute`. It is not a new model, and this layer is not modelled
on any specific company's deployment practice or on any named framework. It is
modelled on two things already in this repo: the data-engineering layer
(ADR-0002) and `hooks/git-guard.mjs`.

### What already exists, and where the new layer sits relative to it

- **`verify-the-effect` + `effect-prober` + `check-effect-probe`** (audited
  2026-06-27) are **post-implementation** validation: probe the resulting state,
  never the action's success report, and refuse a probe with no negative
  control. The new layer sits **upstream** — pre-change authorization. It does
  not re-derive them and does not absorb their scope; where a property below
  touches post-implementation evidence it yields and cross-references, and the
  record schema (§2) keeps pre-change and post-change evidence in **separate
  records** so the timing is coherent. The audit's standing caveat is carried
  forward verbatim: *"every catch was static/record-level, not a live probe
  against a running system."* That caveat applies to this layer until a first
  domain run exists.
- **`git-guard`** is the one place rigor already refuses an irreversible action
  and logs its bypass (`RIGOR_GIT_ALLOW=1`). Deployment is the second such
  place, and the bypass must be the same shape — with one upgrade: the bypass
  must carry a record (property 5). `git-guard` is **friction, not a security
  boundary** — the skeptic pass that refuted this ADR's first draft got
  agent-written content into `HEAD` by five routes it does not block (§4), and
  the ones that are pattern-shaped are fixed and pinned in the same change set.
- **The four data-engineering skills** show the control shape this layer
  copies: a review control (judgment inside the target repo), a detective
  control where one was mechanizable, an evidentiary ledger entry per firing,
  and **nothing credited until it has been seen red on a known-bad twin**.
- **ADR-0010 / ADR-0012** own misfire closure and re-audit of standing claims.
  Any misfire this layer produces — including a skeptic's — goes through
  ADR-0010's loop; class-0 probes (property 6) are standing claims swept under
  ADR-0012.

### The constraint that shapes everything: ADR-0002

rigor ships no turnkey validator, because the verified object's schema is
unknown to rigor. A deployment analogue — a generic checker that certified a
manifest or a plan it cannot understand — would be that ADR's signature failure
wearing a new hat. So: **rigor is a control, not a deployment tool.** The
detective control below inspects a *change record's* form and cross-field
consistency; it never inspects a manifest or a plan semantically. The target-
specific judgment (what the artifact's identity is, what a real backout is for
this target, which health signals are inside the blast radius, whether an
instance really belongs to the pattern it cites) is the skill's, applied inside
the target repo and recorded in the pattern's authorization. The hook matches a
command surface; it does not understand what the command deploys.

## Decision (proposed)

### 1. Four control shapes, named — and the fourth is new as a named *shape*

| Control shape | When it fires | What it does | rigor unit |
|---|---|---|---|
| **Review control** (manual, judgment) | at proposal, before the change record is complete | a named reviewer applies a refutation discipline to the agent's evidence; the verified object's schema is unknown to rigor (ADR-0002), so this cannot be automated | skill |
| **Preventive control** (automated, blocking) | at the change-execution edge, before the irreversible step | refuses the action when required evidence is absent; the only shape that can stop a deploy rather than report on it | hook |
| **Detective control** (automated, after the fact) | in the test floor on every push, and in ADR-0012 sweeps | verifies that recorded evidence has the required form and that the red twin still goes red; cannot stop anything, keeps the property refutable over time | check script |
| **Evidentiary control** (record) | at the moment the action or bypass happens | writes the claim, its basis, and the actor into an append-only record that a later detective control or a human auditor can re-verify | change-record line |

The evidentiary shape is already how rigor works (`docs/feedback/`,
`closure-log.jsonl`, `check-dispatch` receipts; the ledger kit is a named
*component* in `docs/STATUS.md`) but has never been named as a control
**shape**. Naming it is what makes property 5 a first-class property rather than
a side effect of the hook.

Rules for assigning shapes:

- A property takes only the shapes it can make go red. **This applies to the
  review shape too:** a review control is credited only after its named
  reviewer has refused a seeded known-bad proposal — a reviewer-level twin,
  logged as a firing in `docs/feedback/`. Until that firing exists the review
  shape is a stated intention, not a control. A preventive control with no
  twin is always-green; a detective control that verifies form only must say
  so (the ledger-kit misfire, 2026-07-14: a form gate is a floor, never a
  verdict).
- **Every property takes the evidentiary shape.**
- No property takes all four by default; the assignment per property is stated
  and is what the skeptic refutes. (Property 1 does take all four; it says so.)
- The evidentiary shape is **queryable at volume**: change records are
  append-only JSONL, one line per record, corrections by supersession — the
  append-only and supersession rules of ADR-0004's run log, **not** its
  per-run keying — so "N clean instances of a pattern" is a query, not a
  reading.
- Segregation of duties, stated honestly after the first draft's inference
  was refuted: the review control and the preventive control are never
  satisfied by the same actor's output. The agent's own claim is never the
  evidence the hook checks for. **What makes this real is the target's branch
  protection, not anything rigor ships.** The hook reads the record from a
  configured git ref (default `HEAD`, `--no-replace-objects`); a record on a
  branch that required a human review to reach it has passed through a human's
  hands, and a record on an unprotected branch has not. rigor's hook raises
  the cost of forgery from "write a file" to "defeat the target's branch
  protection"; it does not, by itself, prove a human promoted anything. The
  first domain (§6) has **zero** protection rules on its production
  environment today, and the rehearsal says so.

### 2. The change record — the shared schema every unit codes against

Lives in the **target repo** (rigor ships the schema and the gate, never the
log), as `docs/changes/change-log.jsonl` or wherever the target's `AGENTS.md`
names. Four record kinds, one file, append-only. A correction is a new record
carrying `supersedes: <change_id>` and the same `change_id` (ADR-0004
amendment 2026-08-18). **Pre-change evidence lives in `proposal`; post-change
evidence lives in `outcome`.** The first draft mixed them, which made every
proposal red under `check-effect-probe` before the change had run.

**`proposal`** — one per change instance, written before execution:

| field | meaning |
|---|---|
| `kind` | `"proposal"` |
| `change_id` | unique; never reused |
| `pattern` | the change-pattern key (property 6 queries by this) |
| `ts_proposed`, `ts_recorded` | RFC 3339 UTC, in that order |
| `proposed_by` | the proposing actor (an agent, named) |
| `target` | `{ kind, ref }` — informational; rigor attaches no semantics to `kind` |
| `class` | `{ proposed: 0 \| 1 \| 2, authorization: <authorization id> \| null }` |
| `artifact` | `{ identity: [{ name, path?, sha256?, value? }] }` — the attested identity as a **generic list**; what goes in it is the pattern's `identity_rule` (authorization), not rigor's. A k8s manifest is one entry `{ name: "rendered-manifest", path, sha256 }`; a Terraform change is three: plan `{ path, sha256 }`, lock file `{ path, sha256 }`, `{ name: "state_serial", value }`. Entries with `path` + `sha256` are recomputed by the hook; `value`-only entries are form-checked and the skill says so |
| `backout` | `{ kind, exercised_against, exit_code, run_ref, by }` — `kind` is one of `rollout-undo`, `previous-rendered-manifest`, `reverse-plan-ephemeral`, `state-snapshot-restore`, or `described` (a claim, not evidence); `exercised_against` is the identity digest of this proposal's `artifact.identity`; credit requires **`exit_code === 0`** and a non-empty `run_ref` |
| `blast_radius` | `{ declared: [ids], plan_diff: [ids], plan_diff_source: { cmd, sha256 } }` |
| `health_baseline` | `{ verdict, window: { from, to }, signals: [{ id, scope, outcome, source, last_sample_ts }] }` — the **pre-change** reading of the in-radius signals; `window.to` must not be after `ts_proposed`. Verdict vocabulary: `pass \| fail \| unevaluable`; signal `scope`: `in-radius \| not-in-scope`; signal `outcome`: `pass \| fail \| unevaluable \| not-in-scope` |
| `probe_plan` | `{ claim, control, ref }` — the **pre-registered** post-implementation probe and its negative-control design; results go in `outcome` |
| `approval` | `{ who, when, ref }` or `null` |

**`outcome`** — one per executed instance:

| field | meaning |
|---|---|
| `kind` | `"outcome"` |
| `change_id` | the proposal it closes (an outcome with no proposal is an orphan → red) |
| `ts_executed`, `ts_recorded` | RFC 3339 UTC, in that order |
| `executed_by` | who ran the irreversible step |
| `health` | same shape as `health_baseline`, over the **rollout window** (`window.from` not before `ts_executed`) |
| `probe` | `{ claim, probePassed, controlRan, controlPassed, ref }` — `check-effect-probe`'s record shape plus `ref`; the existing gate's matcher runs on it unchanged |
| `outcome` | `clean \| misfire` |
| `misfire_closure` | ADR-0010 closure id, or `null` |
| `break_glass` | `null`, or `{ who, when, why, command }` with every field non-empty |

**`authorization`** — human-written, one per class grant: `{ kind:
"authorization", id, pattern, class: 0 | 1, granted_by, granted_on
(YYYY-MM-DD), identity_rule, backout_rule, criteria: { min_clean_instances,
backout_exercised, probe_nonvacuous, sweep_cadence_days,
sweep_every_n_instances }, basis }`. `identity_rule` and `backout_rule` are
the per-pattern judgments (what the attested identity is; what a real backout
is) — prose a human wrote once, which the skill's review control applies.

**`reproof`** — human-written after a misfire closes: `{ kind: "reproof",
pattern, closure_id, by, on }`.

**The standalone break-glass record** (added in the post-build skeptic round;
the first two drafts left it implicit): the record a bypass is written *before*
it runs is **not** a change-log line — an `outcome` cannot exist before the
step executes. It is a separate file on the configured ref, named by
`RIGOR_BREAK_GLASS`, holding one JSON object `{ who, when, why, command }`
with every field non-empty, `when` parseable, and `command` the **exact**
normalized command it authorizes. `outcome.break_glass` is the post-fact
transcription of that record into the change log; the detective control
checks the transcription's form, and an outcome that executed onto an
`unevaluable` baseline with `break_glass: null` is a P5 violation (the hook
would have halted; if the step ran anyway, either a bypass was recorded or
the record is lying).

**Schema rules that the gate enforces, stated once:** every timestamp the gate
reads (`ts_*`, `window.from/to`, `last_sample_ts`, `approval.when`,
`break_glass.when`) carries an **explicit UTC offset** (`Z` or `±hh:mm`) — a
naive timestamp's ordering depends on the runner's timezone and is refused as
malformed. `backout.kind` is one of the five enumerated values; any other
string (`apply-previous-module`) is a form violation and never credited. Every
signal carries `id`, `scope`, `outcome`, `source`, `last_sample_ts`; a signal
missing any of them, or with an outcome outside its vocabulary, or with scope
`in-radius` and outcome `not-in-scope`, is malformed — and in the fold an
in-radius signal with an absent or empty `source`, an absent or unparseable
`last_sample_ts`, or an unrecognised outcome is **unevaluable** (a missing
metric is a missing metric). `approval` on a class-1 proposal needs `who`,
`when`, and `ref` all non-empty.

### 3. The six properties — argued, shaped, twinned

Each carries its rigor name and its change-enablement / SRE name; each names
the shapes it takes, the twin that must go red on the detective control, and —
where it carries the review shape — the reviewer-level twin that must be
refused before the review shape is credited.

#### Property 1 — `change-backout-exercised` (rigor: rollback-before-rollout; SDLC: the backout plan, *tested* not written)

**For:** a written backout is the most common correct-shaped lie in a change
record. The first domain's own CD (§6) runs `rollout undo` only when its own
deploy step fails, inside the deploy job; it is never exercised against the
candidate before the deploy, and nothing backs out a failed validation.
**Against:** exercising a backout per instance is expensive. Answer: that cost
is the class system's job (property 6) — class 2 makes it mandatory, class 0
amortizes it.

**Rule.** A change is not credited until the backout path has been **run
against the candidate, before the deploy, and exited 0**. Terraform has no
rollback: "backout exercised" means (a) the reverse plan applied to an
ephemeral workspace against a copy of state, or (b) a state-snapshot restore
rehearsed against the candidate. "Apply the previous module version" is not a
backout and is never credited as one. The record's `backout.kind` says which.

**Shape: review + preventive + detective (form-only) + evidentiary** — the one
property that takes all four, stated. The detective control verifies only form:
`kind` is not `described`, `exit_code === 0`, `run_ref` non-empty,
`exercised_against` equals the identity digest of *this* candidate. A generic
check that the backout *really* ran is the validator ADR-0002 refused. The
preventive control refuses on any of those.

**Detective twins:** `kind: "described"`; `exit_code: 1` (run and **failed** —
the first draft credited this); `run_ref` empty; `exercised_against` naming a
different identity digest. All red.
**Reviewer twin:** a seeded proposal whose `run_ref` points at a backout log
from a *different* candidate; the reviewer must refuse it.

#### Property 2 — `release-artifact-integrity` (rigor: attested bytes; SDLC: release-package integrity; the build/deploy SoD boundary)

**For:** `verify-the-effect` already states "the artifact you verified is the
artifact that acted" — as a **precondition it never enforces**. The first
domain's prod overlay carries `${ECR_REGISTRY}` / `${IMAGE_TAG}` placeholders
that CI substitutes with `kustomize edit set image` inside the deploy job:
whatever bytes anyone looked at, they are not the bytes applied, by
construction. **Against:** this is a hash compare; a skill is prose around it.
Answer: accepted for the per-instance control, which is purely mechanical. The
one judgment — *what the attested identity is for a pattern* — is made once by
a human and recorded as the authorization's `identity_rule`.

**Rule.** Content hash recorded at review, recomputed at the dispatch edge,
refused on mismatch. Reuse `lineage-replay`'s content-addressing vocabulary
(tamper-evident < signed < attested < revocable); do not invent a second hash
scheme, and do not call a hash "signed". The skill states the two identity
rules the first domains need: a rendered k8s manifest is content-addressable
as-is (one entry); a Terraform plan is only meaningful against a state serial
and a provider set, so its identity is the tuple **(plan-file hash, state
serial, provider lock-file hash)** and the preventive control refuses if any
element moved between review and apply. These are skill text, not rigor
schema.

**Shape: preventive + detective + evidentiary.** No per-instance review
control. **First-domain limit, stated:** the hook can only hash what exists on
disk where it runs; in the first domain the image tag is substituted inside
the CI job, so property 2 cannot be enforced at the hook until the substituted
manifest is rendered and committed before dispatch — a change to the target
the rehearsal recommends.

**Twins:** naive drift (rebuild from the same source differs — rendering the
first domain's overlay twice gives identical bytes, so this twin stays green
there and the CI substitution is the real red); deliberate drift (one byte
changed after review). Both red on the detective and preventive controls.
Terraform's third twin — same plan hash, `state_serial` advanced out of band —
is **not** a digest twin: `state_serial` is a `value`-only identity entry, and
neither control can observe the live serial. It is red only where the target
writes the serial into a hashed, path-bearing artifact (a state snapshot
committed beside the plan) or at the target-side pre-plan check; the skill
says so rather than crediting a refusal that cannot fire.

#### Property 3 — `health-signal-fail-closed` (rigor: fail-closed on unevaluable; SRE: the SLO/SLI gate on a progressive rollout — an unreadable SLI halts, never passes)

**For:** the first domain's validation job curls a placeholder hostname six
times with no declared window; when the signal cannot be read the job fails
with the candidate left in place — **unevaluable coerced into fail, and nothing
backs out**. `data-quality-fail-closed` says halt and fail are different
terminal states. **Against:** across a fleet one stale probe would halt every
change. Answer: blast-radius scoping, below — correct and usable.

**Rule.** Three outcomes, verbatim from `data-quality-fail-closed`: pass, fail,
**unevaluable** — and unevaluable **halts**. A missing metric, a stale probe
(`last_sample_ts` before `window.from`), an empty evaluation window, an SLI
with a zero denominator: unevaluable. Never coerced to pass; never coerced to
fail. **Blast-radius scoping:** only signals inside the change's declared blast
radius are evaluated. Signals outside it are **not-in-scope** — a fourth label
distinct from the three, never folded into any of them. The declared radius is
itself a refutable claim: the detective control goes red on an under-declared
radius (`plan_diff` not a subset of `declared`) **before any health signal is
read**. The verdict is the fold: any in-radius unevaluable → unevaluable; else
any in-radius fail → fail; else pass; zero in-radius signals → unevaluable.
The **pre-change** reading (`health_baseline`) is what the hook checks —
nobody deploys onto an unreadable signal; the **rollout-window** reading
(`outcome.health`) is the SRE gate the target runs, and rigor only verifies its
form.

**Shape: review + preventive + detective + evidentiary.** The review control
enumerates coercion sites in the target's health logic (`data-quality-fail-
closed` move 1). The preventive control refuses on any baseline verdict but
`pass`, and distinguishes HALT (unevaluable) from refusal (fail) in its reason.
The detective control verifies the **form** of both verdicts — that each
equals the fold of its own signals, that stale signals are `unevaluable`, that
the baseline window precedes the proposal and the rollout window follows the
execution — not the health itself, and says so.

**Detective twins:** source absent and verdict `pass` → red (coercion: an
in-radius signal with no `source` folds to unevaluable, so the `pass` verdict
no longer equals the fold); an in-radius signal with an absent or unrecognised
outcome and verdict `pass` → red (the same coercion site, found live in the
first build); a signal with `last_sample_ts` before `window.from` and outcome
`pass` → red;
declared radius smaller than `plan_diff` → red before the verdict is read; an
honestly recorded `unevaluable` with no outcome → **exit 2 (halt), not exit 1**.
**Reviewer twin:** a seeded health script with a `try/except: return "pass"`
around the metric read; the reviewer must name the coercion site.

#### Property 4 — `post-implementation-probe` (rigor: vacuous-probe rejection; SDLC/SRE: post-implementation review with live evidence, not a checkbox)

**For:** the first domain's post-deploy check is `curl -sf <root>` — it passes
whether or not the new image is live. **Against:** this is `verify-the-effect`
move 2 and `check-effect-probe` already mechanizes it. Answer: correct, and
that is why this property **builds no second detective control**. Its job is to
refuse *crediting* a probe before `verify-the-effect` runs it — the handoff
point. The proposal carries the **pre-registered** probe plan (claim + control
design); the outcome carries the result in `check-effect-probe`'s shape so the
existing matcher runs on it unchanged.

**Shape: review + evidentiary.** Detective = the existing `check-effect-probe`,
imported, not rebuilt.

**Detective twin:** an outcome probe with `controlRan: false`, or
`controlPassed: true` → red; a proposal whose `probe_plan.control` is empty →
red. **Reviewer twin:** a seeded probe plan whose control is "the same request
against the previous version, which also returns 200"; the reviewer must refuse
it as vacuous by design.

#### Property 5 — `break-glass-on-record` (rigor: no silent downgrade; SDLC: emergency change; break-glass creates its record *before* it runs)

**For:** the first domain's production workflow declares a `skip-approval`
input "for emergencies only" that **no job reads**, over a GitHub environment
that has **no protection rules** on the remote — the "Requires manual approval"
line is a YAML comment. The real silent downgrade there is not a bypass flag;
it is an approval gate that exists only in prose. That is the downgrade
ADR-0006 names, found in a deploy pipeline. **Against:** none worth the name;
the only question was shape.

**Rule.** A bypass is written as a refutable claim — who, when, why, and the
exact command it authorizes — a record with an actor and a reason, which is
more than `check-dispatch`'s boolean `downgraded: true` records. The record
exists *before* the bypass runs. A bypass with any field empty is **refused**,
not logged empty. Break-glass is the **one documented exception** to the
class-2 refusal in §4.

**Shape: preventive + detective + evidentiary** — the property where the
evidentiary shape is load-bearing. The hook refuses an unrecorded bypass at the
edge; the detective control verifies bypass records after the fact.

**Twins:** `RIGOR_BREAK_GLASS` pointing at a record with `why` empty →
refused; a record whose `command` does not match the command being run →
refused; an `outcome` carrying `break_glass` with an empty field → red.

#### Property 6 — `change-class-earned` (rigor: judgment-dispatch applied to the change itself; SDLC: standard / normal / emergency classification, with standard changes pre-authorized)

**For:** the middle ground between per-change human approval and fully
automated promotion. A human promotes every **class**, not every instance.
**Against:** the class is declared by the agent. Answer: the class is a
refutable claim with a citation the detective control checks, and
**unclassifiable → class 2**.

**The rubric.**

- **Class 2 — irreversible or externally visible.** Automated gates,
  asynchronous human approval on the record, *and* a human executing the step
  synchronously. **Every change pattern enters here.** `git-guard` is a class-2
  control today. Property 1 is mandatory.
- **Class 1 — normal.** Automated gates plus an asynchronous human approval
  written to the record before execution.
- **Class 0 — standard.** Pre-authorized once by a human, with the authorizing
  criteria recorded. Instances run on preventive + detective + evidentiary
  controls only. No human per instance.

**Rules.**

1. The agent proposes a class citing an `authorization` record; the detective
   control checks the citation hits (exists, same pattern, same class). No
   citation or a bad one → the effective class is **2**. Fail-closed on
   unevaluable, same tri-state.
2. Class is earned **downward only, by a human, on ledger evidence** — clean
   outcomes with non-vacuous probes (property 4) and at least one exercised
   backout (property 1), recorded as an `authorization` with its criteria.
   **This is a new rule, not a reuse** (the first draft said otherwise and was
   refuted): the promotion ledger's rule counts *independent domains* and
   moves *upward*; this one counts *instances of one pattern* and moves
   *downward*. What is reused is the mechanism — a human promotes on ledger
   evidence, never the agent — and the floor's numeral: **≥ 2 clean instances**
   per step down, with the human's judgment above the floor. The number is a
   stated provisional parameter, refutable with data.
3. **A misfire re-promotes the class.** One `outcome: misfire` at class 0
   returns the pattern to class 1 until a `reproof` cites the ADR-0010 closure
   that pinned it.
4. A class-0 pattern's probe is a standing claim under ADR-0012. If a sweep
   finds it **rot** (not drift), the pattern returns to class 1 pending
   re-proof. **Sweep cadence — the safety parameter for class 0:** every
   class-0 pattern's probe is re-run at least every **30 days** and at every
   **10th instance**, and on any change to the probe or to its signal source.
   Both numbers are **invented here and unmeasured** — ADR-0012 §5 gives the
   shape (event-driven with a scheduled floor) and no number — stated so the
   ADR can be revised on data rather than on an assumption.

**Shape: review + preventive + detective + evidentiary**, and the review
control is a **human's** — the agent proposes a class; it never grants one.
The preventive control reads the effective class to decide whether a human
must be present: class 2 → the agent is refused regardless of evidence (break-
glass excepted, property 5).

**Detective twins:** (a) an instance citing a class-0 authorization whose
criteria it does not meet (no credited backout; fewer prior clean outcomes than
`min_clean_instances`) → red; (b) a pattern with a recorded misfire and no
later reproof, still proposing class 0 → red; (c) an instance with no
classifiable pattern proposing class 1 → red, effective class 2.
**Not form-refutable, and said so — twin (d):** an instance citing a valid
class-0 authorization for a pattern the change does not semantically belong to
(a schema migration labelled as the image-tag-bump pattern). Every form check
passes. Pattern membership is the human review control's judgment (ADR-0002),
and the reviewer twin for this property is exactly that seeded mislabelled
instance.

### 4. The hook — argued before built

**Viability halt-gate.** `git-guard` works because git commands are textual and
enumerable. Deploys are not, in general: `kubectl apply`, `helm upgrade`,
`pulumi up`, `terraform apply`, a `curl` to a release API, a job trigger. The
test: name the deploy-command surface for the first domain, show one twin the
hook will go red on, and one legitimate read-only command in the same family it
will stay green on.

**First domain (§6) surface:** the production deploy is a GitHub Actions
`workflow_dispatch`; the operator's `gh` token carries the `workflow` scope, so
an agent on this box **can** dispatch it today (`gh workflow run
cd-production.yml`), and the run then fails at `configure-aws-credentials`. The
kubeconfig present on the box points at a foreign admin context in another
account whose endpoint no longer resolves, so `kubectl apply -k
kube/overlays/prod` would be refused by the cluster, not by anything rigor
ships. **Twin (red):** `kubectl apply -k kube/overlays/prod` with no change
record; `gh workflow run cd-production.yml`. **Same family, green:** `kubectl
kustomize kube/overlays/prod`, `kubectl diff -k kube/overlays/prod`, `kubectl
apply -k . --dry-run=server`, `kubectl rollout status …`, `gh workflow view
cd-production.yml`, `gh run list --workflow …`. Both are enumerable, so the hook
passes the paper viability test — **as a specification; nothing below exists
until the build lands, and it is credited only when its tests have been seen
red** — scoped to the enumerable CLI surface:

- mutating verbs of `kubectl` (apply, create, replace, patch, delete, edit,
  scale, set, label, annotate, taint, cordon, uncordon, drain, expose, run,
  exec, cp, debug, `rollout undo|restart|pause|resume`), `helm` (install,
  upgrade, rollback, uninstall, delete), `terraform`/`tofu` (apply — including
  `apply <planfile>` and `-auto-approve`, destroy, import, taint, untaint,
  force-unlock, `state rm|mv|push|replace-provider`, `workspace delete`),
  `pulumi` (up, destroy, refresh, import, `state delete|rename|unprotect`,
  `stack rm`), `gh workflow run|enable|disable`, `gh release
  create|delete|edit|upload`, `gh run rerun|cancel`, `argocd app
  sync|rollback|delete|set|create|patch|terminate-op`, `flux
  reconcile|suspend|resume|delete|create|bootstrap|install|uninstall`, and a
  PR comment whose body carries `atlantis apply` (`gh pr comment`, `gh api
  …/comments`);
- **dry-run exemption, exact:** only `--dry-run=client`, `--dry-run=server`,
  and bare `--dry-run` stay green. `--dry-run=none` is the mutating default
  for `kubectl` and `helm` and is **blocked**, pinned by a red test;
- **wrappers normalized** the same way for both hooks (a shared
  `hooks/shell-normalize.mjs`): env-prefix tokens, `env`, `command`,
  `timeout N`, `nice`, `nohup`, `exec`, `xargs`, absolute binary paths and
  `.exe` suffixes, subshells, and the body of `sh -c` / `bash -c` / `eval`.

**Uncovered, stated:** HTTP calls (`curl` to a release API), SDK calls inside
scripts (`node -e`, `python -c`), wrapper targets (`make deploy`, `python
deploy.py`), GUIs, and the hook script itself — which is agent-writable at the
plugin cache path and re-read on every call (§ self-refutation 7). On those the
hook is always-green and cites nothing; a target's repo brief must list its
wrappers. The first domain's inventory (this ADR, until the target gains a
brief entry): no deploy wrapper in `scripts/`, no Makefile; the deploy runs
inside Actions.

**GitOps targets (Argo / Flux):** the irreversible step is the merge to the
environment branch. Locally that is `git-guard`'s surface; **remotely it is
not** — `gh pr merge`, `gh api -X PUT …/pulls/N/merge`, `gh api -X PUT
…/contents/<path>` (a server-side commit), and `gh api -X POST …/merges` were
all allowed by `git-guard` when the skeptic probed them. Those forms write git
history through the host API and belong in **`git-guard`**, where they are
added with red-first tests in this change set. After that, the preventive
control for GitOps targets collapses into `git-guard`; no second hook fires.
**Terraform under a run trigger (Atlantis, TFC, a CI job):** a PR comment
carrying `atlantis apply` is a CLI string the hook *does* see and matches; an
API-driven trigger is an accepted blind spot, stated. The first draft cited a
generator ADR-0002 explicitly deferred; that citation is withdrawn.

**Decision when a deploy-shaped command is seen** (specification):

1. `RIGOR_BREAK_GLASS=<path>` set → load the record through the same
   ref-loader as step 2 (an emergency change creates its record before it
   runs, and a human promotes it); require `who`, `when`, `why`, `command`
   non-empty and **every** deploy-shaped command in the invocation to equal
   the record's `command` exactly after normalization — no prefix matching
   (a record for `kubectl apply -k kube/overlays/prod` authorizes neither
   `…/production` nor `…/prod && terraform destroy`) → allow. Any field
   empty, or any deploy-shaped command unmatched → **refuse** (property 5's
   twin). The friction of
   committing first is the point: it is the checkpoint `git-guard` already
   imposes.
2. `RIGOR_CHANGE_RECORD=<repo-root-relative path>` + `RIGOR_CHANGE_ID=<id>`
   set → load the log with `git --no-replace-objects show <ref>:<path>` where
   `<ref>` is `RIGOR_CHANGE_REF` (default `HEAD`), the path is resolved against
   the hook's `git rev-parse --show-toplevel` (backslash and absolute paths
   are refused with a reason — a PowerShell path fails closed), and the hook
   resolves every path against that toplevel. Find the proposal; run the
   detective matcher over the log; compute the effective class. Class 2 →
   refuse ("a human executes class 2"). **Read the selected proposal's
   `health_baseline.verdict` directly, not through the newest-record channel
   (a later outcome must not mask it):** `unevaluable` → refuse as **HALT**;
   `fail` → refuse ("baseline fail"); anything but `pass` → refuse. Any
   property 1–3 or 6 violation → refuse, listing them. Class 1 without a
   complete `approval` (`who`, `when`, `ref`) → refuse. Any `artifact.identity`
   entry with a `path` whose recomputed digest ≠ `sha256` → refuse; a path
   entry whose digest **cannot be recomputed** (file missing, unreadable) →
   refuse as HALT — an unrecomputable identity is unevaluable, never verified.
   Otherwise allow. **Tool global flags are stripped before the verb is read**
   (`kubectl -n prod apply`, `--context=`, `--kubeconfig`, `helm -n`,
   `terraform -chdir=`, `gh -R`), the way `git-guard` strips git's.
3. Neither set → refuse with `git-guard`'s message shape: output the exact
   command for the human to run, then continue.

The hook will import the detective matcher from the check script, so the
preventive and detective controls cannot drift apart. Its tests will be wired
the way `git-guard`'s are: a pure `decide(command, env, io)` with injected
record and digest loaders, a red twin per refusal class, and the read-only
family kept green.

### 5. The detective control — one gate, three outcomes (specification)

`scripts/check-change-record.mjs`, house style (pure exported matcher, fs at
the CLI boundary, Windows-safe main check), **extending `check-runlog`, not
forking it**: it imports `check-runlog`'s JSONL parser and a supersession
resolver exported from it for this purpose (the export was made in this same
change set, uncommitted at the time of writing — it is *not* pre-existing), and
shares the three-outcome CLI convention `check-misfire-closure` introduced. It
imports `check-effect-probe`'s matcher for property 4. Outcomes: **exit 0**
clean; **exit 1** FAIL on any red twin above or a malformed / orphan /
out-of-order / badly-superseded record; **exit 2** UNEVALUABLE when a change's
newest record carries an honestly `unevaluable` verdict and no break-glass —
unevaluable halts. An empty log passes **vacuously** and the CLI says so.
Honest limit, on the file and in every skill: **form only**. It cannot run a
backout, read a metric, or hash an artifact it is not handed.

### 6. First domain — described from the remote's actual state

The **ATLAS kernel on EKS / Kustomize** (`regulatory-rule-engine`): a real
portfolio repo with a push-based deploy workflow — `kubectl apply -k` over a
Kustomize prod overlay inside GitHub Actions — **that has never succeeded**:
every recorded run of both CD workflows failed at startup (41/41 at the time
of the skeptic's probe; the staging workflow's own comment says no AWS
credentials or OIDC are wired). Its `environment: production` has **zero
protection rules** on the remote, so the "manual approval" in the workflow
comment does not exist; its `skip-approval` input is never read; its rollback
step fires only on its own deploy job's failure; its validation curls a
placeholder hostname. It enters at **class 2**; this ADR demotes nothing.

**A live run is not possible this session.** The first exercise will be a
**record-level rehearsal** on the real rendered overlay, recorded at
`docs/audits/2026-08-22-deployment-layer-first-domain-rehearsal.md` once the
gate exists to run against it. The 2026-06-27 caveat applies verbatim until a
live run exists. The rehearsal's first recommendation to the target is
already known: put a required-reviewer rule on the production environment,
because until then there is nothing for class 2 to stand on.

### 7. What the post-build skeptic round found, and what it changed

Nine judgment-tier skeptics refuted the first build (verdict summary in the
build record). The defects that reached code — all fixed red-first in the
second build round — are recorded here because each is a control that would
have read as built while being always-green or fail-open:

- the hook read the tool verb without stripping global flags, so the form
  every operator types (`kubectl -n prod apply …`) was allowed;
- the hook never read the baseline verdict directly, so a `fail` baseline
  deployed and a later outcome masked an `unevaluable` one;
- break-glass matching was an unbounded string prefix over *any one* deploy
  hit, so a record for `kubectl` authorized `kubectl delete ns prod`;
- the health fold treated every unrecognised or absent signal outcome as
  `pass` — the coercion site property 3 exists to refuse, inside the unit
  that claimed to refuse it;
- `git-guard`'s new `gh api` check took the first token after `api` as the
  endpoint, so flag-first forms — the ADR's own examples — bypassed it;
- a path-bearing identity entry whose digest could not be recomputed was
  treated as verified (fail-open), and `backout.kind: apply-previous-module`
  was credited;
- `OUT=$(kubectl apply …)` normalized to nothing.

**Rounds 2–5 (same day).** Four further fix rounds, each refuted by skeptics
before the next; round 5 was the first in which every claim survived. Beyond
the list above, the rounds closed: the hook discarding every `form` violation
at the edge (so `apply-previous-module` and naive timestamps deployed); a
duplicate proposal without `supersedes` masking an unevaluable baseline;
pflag attached values and unlisted global flags (`-nprod`, `--as=admin`); the
hook's own verb fallback refusing `kubectl auth can-i create pods` (a read-only
form refused — a self-refutation-3 misfire, closed); a cited authorization
that fails form being credited; `gh api …/actions/workflows/…/dispatches` —
the first domain's own trigger — allowed by both hooks; `gh api` quoted
whitespace values displacing the endpoint, `-X=PUT`, `/graphql`, `--field
query=@file`, `merge-upstream`, `update-branch`, `repo sync`; and in
`git-guard` **five bypass forms that predate this ADR** (`reset -q --hard`,
`reset HEAD~1`, `tag -a -f`, `branch -df`, `branch -M`) plus the wrapper class
(`sudo`, `if …; then`, a lone `&`, uppercase binary names on Windows, `pwsh
-c`/`cmd /c`, `env -S`, `time -p`) — recorded as an ADR-0010 closure with the
red-proof (current tests vs the pre-session hook: 33 of 70 fail). The test
floor went 178 → 523.

**Residual tail, named and not closed:** variable indirection (`K=kubectl; $K
apply`), `find … -exec` / `parallel` argv surfaces, graphql bodies supplied via
`$(cat file)`, `node -e` / `python -c` / `make deploy` wrappers, verb-list rot
in every family, `mergeBranch` blocked but unpinned, the agent-writable
plugin-cache hook file, `disableAllHooks`. Each is a reason the hook is
friction; none is a reason to claim it is a boundary.

Two ADR inconsistencies were also the skeptics' finding and are fixed above:
§3 said the hook refuses a `fail` baseline while §4 did not list it, and the
pre-bypass break-glass record had no schema home. A sentence claiming the hook
"refuses if its toplevel is not the target's" described a check that was never
built and is struck; the hook resolves paths against its own toplevel and the
operator's `RIGOR_CHANGE_RECORD` is the statement of which repo that is.

## Considered and refused

- **A deploy executor.** rigor does not deploy anything. It decides whether an
  agent's proposed change has earned the right to proceed, and refuses when it
  hasn't. Building the executor would be the deployment-shaped validator
  ADR-0002 refused. rigor is the control at the change-approval step; it is not
  the pipeline, the CAB, or the operator.
- **Error-budget policy, on-call, incident response.** SRE's. rigor consumes an
  SLI as a gate input and nothing more; a reader should not expect an SRE
  platform.
- **A hook over the full deploy surface** (HTTP, SDKs, wrappers). Either
  always-green or a false-positive machine. Refused; the enumerable CLI surface
  is kept and the remainder is named as uncovered.
- **A detective control that verifies the backout ran** against the candidate.
  Requires target semantics — the validator ADR-0002 refused.
- **Per-target identity rules in rigor's schema.** The first draft hard-coded
  `k8s-manifest` / `terraform` identities; refused as an ADR-0002 violation.
  The identity is a generic list; the rule is the authorization's.
- **A second hash scheme** for Terraform plans. Refused; the identity is a
  tuple of content hashes plus the state serial, under `lineage-replay`'s
  vocabulary.
- **A second non-vacuity gate** for property 4. `check-effect-probe` exists;
  the outcome record embeds its shape.
- **"In `HEAD` therefore human-promoted."** Refuted live; refused as a premise.
  The hook reads a configured ref and the target's branch protection is the
  control.
- **Per-instance skeptic dispatch.** Does not scale (model economics, composed-
  stack gap 3, still paper only). Not a reason to coerce; a reason class 0 is
  gated on a stated sweep cadence rather than on a skeptic per instance.

## Consequences

- **If accepted:** "the change is safe to ship" stops being self-certifying.
  An agent's deploy-shaped command is refused until a record on the configured
  ref carries an exercised backout, an attested artifact, a readable in-radius
  baseline, a pre-registered probe, and a class citation — or until a human
  writes a break-glass record with a reason.
- **Cost.** Six skills, one gate + tests, one hook + tests, one shared
  normalizer, one hooks.json entry, `git-guard` hardening with red-first tests,
  one audit. Claim ceiling moves **8 / 14 / 5 / 2 / 10 → 8 / 20 / 5 / 3 /
  11**, all additions **provisional**, none credited until seen red on a
  known-bad twin in a real domain.
- **Two things do not scale, and this ADR says so:** per-instance skeptic
  dispatch, and the sweep cadence that keeps class 0 honest (unmeasured).
  Neither is a reason to coerce; both are reasons class 0 is gated on a stated
  cadence rather than an assumed one.
- **No CI exists in this repo** (`.github/` is absent, zero tracked files).
  "Red twin in CI on every push" therefore means the `node --test` merge floor
  the operator runs; adding a CI workflow is a separate operator decision this
  ADR does not make.

## Self-refutation — what would make this a correct-shaped lie?

1. **The record is forgeable by the agent.** Every evidentiary field is text an
   agent can write, and — refuted live — an agent can get it into `HEAD`.
   The hook is a floor on form; the human-promotion guarantee is the target's
   branch protection, which rigor requires and the rehearsal audits, never
   something rigor provides. Reviewer fields name a person and a `run_ref`, so
   a fabricated record is falsifiable by re-running it, never self-proving.
2. **Wrapper blindness.** `make deploy` is always-green. If the first domain
   ever grows a wrapper, the hook cites nothing there, and nothing warns. The
   inventory of wrappers is a prose discipline, not a gate.
3. **Verb-list rot.** Tool versions add verbs; the dry-run exemptions and
   `--dry-run=none` are pinned by tests, new verbs are not. Every false
   positive enters the ADR-0010 loop.
4. **Ceremony for a layer with zero live runs.** Falsifiable: if after ten
   recorded changes the gate has refused nothing a human review would not
   have, collapse the six skills to one.
5. **Class 0 may never be earned.** If the cost of N clean instances with
   exercised backouts is never paid, every pattern stays at class 2 — today's
   posture plus paperwork. Falsifiable on the same ten-change horizon.
6. **The blast radius is a self-report compared with a self-report.**
   `declared` and `plan_diff` may be written by the same actor. Mitigation:
   `plan_diff_source` records the tool command and the digest of its output,
   so the diff is re-runnable; still form-level.
7. **The hook's own seams.** Its env vars cannot be set inline by the agent
   (prefix tokens are stripped; verified against `git-guard`) but the
   harness's settings files can populate a session's environment, and an
   agent can write `.claude/settings.local.json` — effective next session.
   Worse and shared with `git-guard` today: the live hook script sits in a
   writable plugin cache directory and is re-executed by a fresh `node` on
   every call, so an agent edit to it changes the next decision with no
   restart; and `disableAllHooks` exists. Named, not assumed away.
8. **The health fold is too simple for real SLOs.** Burn-rate windows,
   multi-window alerts, and error budgets do not reduce to per-signal
   pass/fail/unevaluable. Deliberate: rigor consumes a verdict, the target
   computes it; if the fold is wrong for a target, the skill's move 1 is where
   that gets found.
9. **Reviewer twins may never be seeded.** The review shape is credited only
   after a reviewer refuses a seeded known-bad proposal. Nobody is obliged to
   seed one, and until someone does every "review control" here is an
   intention with a name.

---
*Related: ADR-0002 (no universal validator), ADR-0004 (append-only JSONL with
supersession), ADR-0006 (no silent downgrade), ADR-0010 (misfire closure),
ADR-0012 (class-0 probes are swept standing claims),
`docs/audits/2026-06-27-deployment-discipline-verify-the-effect.md`,
`hooks/git-guard.mjs`, and the four data-engineering skills whose control shape
this copies.*
