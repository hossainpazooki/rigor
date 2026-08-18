# ADR-0012 — Re-audit sweep: verification over standing state, not just at the publish moment

**Status:** **Accepted 2026-08-18** (Proposed the same day). Acceptance ratifies
the design and records the ADR-0005 resolution-2 unblock; it is **not** the
operator go — opening the sweep still requires an explicit go recorded in a run
log, per §8 and the effort chassis.

## Context

Every check rigor ships fires **at a moment**. `docs/SYSTEM.md` says so in its own
words, as a kept-visible limit: "nothing here yet owns re-auditing *standing*
published data as upstream reality drifts after the publish."

ADR-0005 named the same gap from the write-audit-publish side and went further —
it checked the claim against WAP as actually practised (Iceberg branch WAP, the
AWS Glue reference implementation, Dremio) and found the audit universally sited
at the promotion boundary and nowhere after it. Its resolution 2 designated a
**standing-catalog sweep** as the second instance of ADR-0004's L1 sweep class,
and deliberately **blocked** it: opening a second pilot before the first reported
would be "exactly the loop-shopping this repo's Goodhart guard names." That ADR
also required that the unblock itself be a recorded event.

**The block has since lifted, and this ADR is that record.** ADR-0004's pilot was
evaluated and **SETTLED 2026-07-14** — three runs, two sessions, all five criteria
met. The stated precondition for resolution 2 is therefore discharged. What
remains is not a dependency but a decision: an explicit operator go, recorded in a
run log. ADR-0005's status line and the backlog spine both still read "remains not
started," which is accurate about the work and silent about the fact that the
thing it was waiting for has happened.

Why the gap matters more than a freshness SLA does. A published artifact carries a
verdict — "audited, green, promoted" — and that verdict is a claim **about a past
state of the world**. Three things move underneath it afterwards: the upstream data
it derived from, the code that would regenerate it, and the reality it describes.
A green publish six months old is, in rigor's own vocabulary, a self-reported
success from a session that can no longer defend it. That is precisely what
`pick-up` refuses to trust in a handoff brief — and a data catalog is a mutable
STATE.md that nobody runs `pick-up` against.

Honesty about novelty, because the repo has already been burned here: the
2026-07-21 landscape research found this absent **per surveyed tool**, and
explicitly killed the stronger claim — "unpracticed anywhere" was refuted 7 times.
Freshness monitors, data observability tooling, and SLA alerting all cover parts of
this. What is thin in the surveyed field is the *credit rule*: re-audit as a
verdict-demotion mechanism with a polarity requirement, rather than an alert.

## Decision

**1. Scope — what re-enters audit.** Not the whole catalog. An artifact is
sweepable only if it carries a **standing claim** somebody may act on: a published
dataset with an audit verdict, a freshness assertion, a lineage or replay claim, or
a pinned regression from ADR-0010. Artifacts with no standing claim are out of
scope by construction — the sweep re-verifies *claims*, not files.

**2. The three drift surfaces**, which the skill teaches enumerating and which no
generic monitor enumerates for you:

- **the inputs** — upstream tables, reference data, vendor feeds, and their
  restatements (a restated upstream is the `no-lookahead` seam reopening after
  publish);
- **the regenerator** — the code, config, and pinned dependencies that would
  rebuild the artifact. If regenerating today would not reproduce it, the artifact's
  identity claim is already false (`lineage-replay`);
- **the world** — the reality the data describes, including the *schema of that
  reality*: a field that silently changed meaning is invisible to every hash.

**3. Drift versus rot — the distinction the whole design turns on.**

- **Drift**: the artifact was correct at publish; the world moved. Response is
  refresh and republish, and nothing was ever wrong.
- **Rot**: the artifact was **always** wrong; our detection improved. Response is
  retroactive invalidation of the artifact *and everything downstream that consumed
  it* — and, by construction, an ADR-0010 incident, because the publish-time audit
  passed something it should have caught.

Collapsing rot into drift is the expensive error: it converts a verification
failure into a routine refresh, and the LEARN loop never runs. The skill's job is
to force the question explicitly, and to say plainly when it cannot be answered.

**4. The drift budget, and demotion.** Each standing claim declares a tolerance —
the upstreams it depends on and how much movement is acceptable before its verdict
expires. Crudest form is age; better is content-addressed (a consumed upstream's
hash moved); best is semantic (an upstream change touching a *consumed* field).
Crossing the budget demotes the claim's standing:

- **verified** — audited green, within budget;
- **stale** — budget exceeded; **re-verify before trust**. Not "wrong" — unevaluable,
  and unevaluable halts anything that would consume it as verified;
- **invalidated** — rot found; retroactively wrong, downstream notified.

Demotion is automatic on budget breach; **promotion back to verified requires a
re-run audit**, never the mere passage of a sweep that found nothing.

**5. Cadence: event-driven, with a scheduled floor.** Event-driven on upstream
change is the correct semantics — a claim expires when what it rests on moves, not
when a clock ticks. But absence of an event is not evidence of no change (an
upstream you stopped watching emits nothing), so a scheduled floor sweep runs
regardless and is what catches the *unwatched* dependency. Both, and the scheduled
one is the honest half.

**6. Polarity requirement, inherited and non-negotiable.** A sweep never seen red
is unevaluable, exactly like an audit never seen red. Before any sweep's verdict is
credited: plant a drift (mutate a **copy** of an upstream the artifact depends on)
and show the sweep catches it, **and** run the negative control (no drift → no
alarm). Both legs. The one-leg version — catches planted drift, never tested for
false alarms — produces a sweep that demotes everything and is switched off within
a week.

**7. Ship discipline, not a sweeper (ADR-0002).** rigor ships the skill: the moves
for enumerating drift surfaces, the drift/rot question, the budget and demotion
ladder, the polarity requirement, and the claim-calibration language. Any
automation is a **generator stamped into the target repo**, against that repo's own
schema and catalog — because a shipped sweeper that certified catalogs whose
semantics it cannot know would be this repo's signature failure mode wearing a new
hat.

**8. Sequenced last.** Largest surface of the three; it depends on ADR-0010's pin
concept (pins are sweepable standing claims) and produces verdicts that ADR-0011's
ledger records. Build order: 0010 → 0011 → 0012.

## Consequences

- **If accepted:** a catalog acquires the property a handoff brief already has —
  its claims carry re-verify lines and expire rather than standing forever on a
  past green.
- **This closes ADR-0005 resolution 2's design**, and nothing more. Opening the
  work still needs an explicit operator go recorded in a run log, per that ADR's
  own sequencing rule and the effort chassis.
- **`lineage-replay` gets its missing exercise.** Its own anti-pattern is "a
  byte-equivalent replay line that no test re-executes," and its origin firing is
  recorded as *unconfirmed as a true replay-diff*. A regenerator-drift check is
  a replay-and-diff by another name — the sweep is the most likely route to the
  skill's first honest firing.
- **Cost is the real objection** — see self-refutation 2. This is the largest of
  the three extensions and the least certain to earn its keep.

## Self-refutation — what would make this a correct-shaped lie?

1. **Re-running a vacuous audit produces confident green forever.** If the
   publish-time gate was blind to a defect class, the sweep inherits the blindness
   and now reasserts it on a schedule — manufacturing *repeated* evidence for a
   claim that was never checked. This is the strongest objection, and the polarity
   requirement (§6) is aimed squarely at it: the sweep must be shown red on planted
   drift **for each artifact class**, not once globally. A sweep credited on one
   class's red is a correct-shaped lie about all the others.
2. **Cost grows with the catalog; value concentrates in the recent.** Standing
   claims accumulate monotonically, so an exhaustive sweep is O(catalog) forever
   while nearly all consumption is of recent artifacts. Unbounded, this is a
   token furnace — and the two most recent loop iterations in this repo both
   **halted on budget breach**. Any implementation must be consumption-weighted or
   explicitly sampled, and must **log what it did not sweep** (silent truncation
   reading as full coverage is the failure this repo names elsewhere).
3. **Drift and rot may be undecidable without an independent historical oracle.**
   Deciding "was it always wrong, or did the world move" often requires knowing the
   past state of the world independently of the artifact — which, for
   point-in-time data, is the very thing under construction. The skill may have to
   answer `unevaluable` most of the time, and a distinction that usually cannot be
   drawn is a weak foundation for a demotion ladder.
4. **Alarm fatigue kills it.** An upstream that moves constantly demotes everything
   to `stale` permanently; `stale` becomes the normal state, is ignored, and the
   ladder is decorative. Falsifiable and worth pre-committing to: if more than half
   of standing claims sit `stale` for two consecutive sweeps, the budget model is
   wrong and the ADR should be revised, not the threshold quietly raised.
5. **Novelty overclaim.** "Nothing re-audits standing state" is true per surveyed
   tool and false as a universal — killed 7 times in the 2026-07-21 research.
   Freshness SLAs and observability platforms cover real parts of this. If the
   honest delta turns out to be only the demotion ladder plus the polarity rule,
   that is a *skill*, not a workstream, and this ADR should shrink to match.
6. **It could be a monitor wearing rigor's vocabulary.** If in practice the sweep
   reduces to "alert when upstream changed," it has added ceremony to a solved
   problem. The test of whether it is more: does it ever produce an **invalidation**
   (rot) rather than a refresh? If the first ten sweeps produce zero invalidations,
   the distinction that justifies the design is not paying for itself.

---
*Discharges the precondition of ADR-0005 resolution 2 (blocked on ADR-0004's
evaluation, settled 2026-07-14) and records that unblock per that ADR's criterion 2.
Related: ADR-0002 (no universal validator), ADR-0004 (the L1 sweep class and its
budget kill-switch), ADR-0010 (rot is an incident; pins are sweepable claims),
ADR-0011 (sweep verdicts are calibration records), `docs/wap-bridge.md`, and the
four data-engineering skills — `lineage-replay` and `no-lookahead` most directly.*
