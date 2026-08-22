# Decisions behind the README

The README makes a handful of claims about what rigor refuses to do and why.
Each rests on a recorded decision. This page is the bridge: one entry per
claim, with the decision's status, what is actually built against it, and the
link into the full record ([`adr/`](adr/README.md), where every decision keeps
its "decided" and "as built" columns apart). Added 2026-08-22 when the README
was cut free of decision numbers; the numbers live here.

Status words mean what they mean in [`STATUS.md`](STATUS.md): **accepted** is a
locked decision, **proposed** is a recommendation whose resolutions must never
be quoted as practice, and **provisional** is a built component that has not
yet survived two independent domains.

## No turnkey validator

**README claim:** "discipline, not content … deliberately no turnkey validator."

**Decision:** [ADR-0002 — Data-eng verification is judgment, not a universal
gate](adr/0002-dataeng-is-judgment-not-a-universal-gate.md) · **accepted**
2026-07-02.

**What it binds:** the verified object (a table, a manifest, a plan) lives in
*your* repo with a schema rigor cannot know, so a shipped validator that
certified it would itself be an unverified claim of the kind rigor exists to
refuse. rigor ships
the attack moves as skills, the fingerprint gate (`check-surface-scrub`), and
form-only check scripts — never a checker that understands your data. Every
later layer is held to this: the data-engineering skills (settled, scoped), the
re-audit sweep (built in the target repos, not here), and the deployment layer's
gate, which inspects a change *record's* form and never a manifest's meaning.

## Silent tier collapse

**README claim:** "a multi-agent build … answered 505 of 505 turns on the
expensive orchestrating model … now a gate."

**Decision:** [ADR-0006 — Silent tier
collapse](adr/0006-silent-tier-collapse.md) · **accepted** 2026-07-18; the mid
tier it routes through is [ADR-0007](adr/0007-mid-tier-opus.md) · accepted
2026-07-22, **re-pinned to `claude-opus-5` 2026-08-22**.

**What is built:** `check-tier-placement` (every non-verify `agent()` call must
carry a real tier pin; `agentType:` alone is not one), worker receipts naming
the model that actually answered, and `check-dispatch` (fail-closed on an
unlogged inference, a floored node off the judgment tier, or a silent
downgrade). Verified red on the real collapsed script before being credited.
Honest limit: a receipt is runtime-asserted text, not billing metadata — on
2026-08-22 a worker fabricated one, and the gate caught it only because the
placeholder could not echo the requested id.

## Deployment layer

**README claim:** "agents never trigger a deployment … a pre-change
authorization gate … proposed."

**Decision:** [ADR-0013 — Deployment layer: a pre-change authorization gate,
not a deploy tool](adr/0013-deployment-layer-pre-change-authorization.md) ·
**proposed** 2026-08-22. Nothing in it is practice until ratified.

**What is built (all provisional, zero domains, zero live runs):** six skills
(`change-backout-exercised`, `release-artifact-integrity`,
`health-signal-fail-closed`, `post-implementation-probe`,
`break-glass-on-record`, `change-class-earned`), the three-outcome gate
`check-change-record`, the `change-guard` hook, and the `shell-normalize`
module both PreToolUse hooks share. Built ahead of ratification on the
ADR-0010 precedent; the design's first draft was refuted by three skeptics, the
first build by nine, and four fix rounds followed before round 5 survived
([build record](plans/2026-08-22-deployment-layer-build.md)). The first domain
was rehearsed at record level only
([audit](audits/2026-08-22-deployment-layer-first-domain-rehearsal.md)): its
production environment has no protection rules and its deploy workflow has
never succeeded, so it enters at class 2 with nothing to demote.

**What it explicitly is not:** a deploy executor, an error-budget policy, an
on-call or incident tool. Both hooks are **friction, not a security boundary**
— the ADR names the residual bypass tail rather than claiming it closed.

## The hooks never write history

**README claim:** "agents never write your git history."

**Decision:** no ADR — a standing invariant from the vendored working
agreement ([`../rules/git.md`](../rules/git.md), [ADR-0001](adr/0001-vendor-the-rules.md)
for why the rules are vendored). `git-guard` enforces it; on 2026-08-22 skeptics
found ten bypass forms, five predating the hook's tests, all closed red-first
and recorded as a misfire with a pinned closure
([feedback](feedback/2026-08-22-git-guard-bypass-forms-misfire.md)).

## Self-applied promotion

**README claim:** "every component stays provisional until it survives ≥2
independent domains."

**Decision:** the promotion rule in [`feedback/FEEDBACK.md`](feedback/FEEDBACK.md)
(not an ADR), with the ledger kit that records it in
[ADR-0003](adr/0003-repo-context-and-learnings-files.md) · accepted, and the
misfire-closure loop in [ADR-0010](adr/0010-learn-from-misfire.md) · accepted
2026-08-18. As of 2026-08-22 the closure ledger holds two `open` records and its
gate exits 2 — unevaluable by design, not green.

## Everything else

The full index, decided-vs-as-built for all thirteen decisions:
[`adr/README.md`](adr/README.md). The three pages that must track the tree —
[`SYSTEM.md`](SYSTEM.md), [`STATUS.md`](STATUS.md),
[`DEVELOPMENT.md`](DEVELOPMENT.md) — are listed in [`README.md`](README.md).
