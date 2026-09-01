# ADR-0014 — Session harvest: a transcript is a lead, a re-run is the evidence

**Status:** **Proposed 2026-09-01.** Code exists ahead of this decision (the
ADR-0010 precedent). Nothing built for it is credited: the command, the indexer
and the gate are **provisional, fixture-tested, zero domains**, and the harvest
ledger starts empty.

## Context

rigor's promotion ledger moves a component from `provisional` to `settled` only
after it survives **≥2 independent domains**. The mechanism works — thirteen
components have moved through it — but it only ever counts *forward*. A
component is credited when someone remembers to log a firing at the moment it
fires, so a long tail of rows sits at **0 domains** not because the components
never fired but because nobody wrote it down: `/verify-claim`, `/honesty-check`,
`/recon`, `/fanout`, `/verify-effect`, `check-fanout`,
`check-citation-fidelity`, `session-start`, and every unit of ADR-0013.

The standing plan for those rows was to *manufacture* new firings. That is
expensive and produces the weakest evidence the ledger accepts — a firing staged
in order to be credited, on the origin operator's own box.

Meanwhile the sessions already happened. Measured 2026-09-01 across 44
transcripts (~106 MB): **378 control firings**, of which **108 are
domain-eligible** across **16 repositories other than rigor** — including gates
run in repos whose rows currently read 0.

The question this ADR settles is not whether to look. It is what looking is
allowed to *prove*.

## Decision

**A transcript firing is a lead. Credit comes only from re-running the control
today.** The harvest record names where the lead was found; the `basis` of any
credit is a command executed now, with its observed exit code.

This is not a new rule. `commands/fanout-loop.md` step 4 already says *"logs
index candidates; only a gate re-run moves a status"*, and FEEDBACK.md's
`orchestrate` row was moved on exactly this basis on 2026-07-08: *"a
backlog-recon surfaced only log **leads**; the gate re-run is what moved this."*
Harvest generalizes that precedent and mechanizes it.

**Therefore the AGENTS.md invariant "No ledger is ever backfilled" is preserved,
not amended.** A harvest entry is dated the day its re-run happened and asserts
only what that re-run showed. It is not a record written today about what was
true in August; it is a record written today about what is true today, which a
transcript told us to go and check.

`scripts/check-harvest.mjs` enforces this rather than documenting it: a record
with `credited: true` and no `reverified_at`, no re-run command, or no observed
integer exit is a **violation**, and a `reverified_at` earlier than the lead it
re-verifies is a violation too.

### What harvest may not do

- **It never writes `docs/feedback/FEEDBACK.md`.** It emits *proposed* rows.
  Promotion stays a human act; a mechanism that could credit components on its
  own authority would be marking its own homework.
- **It never credits a domain it is not entitled to.** A firing in rigor's own
  tree is `domain_eligible: false` — use, not an independent domain, per
  FEEDBACK.md's own rule — and the gate refuses `credit_kind: "domain"` on such a
  record.
- **It never credits another repo's gates.** Sibling repositories run their own
  `check-*.mjs` scripts; those are recorded as `foreign-gate` and are evidence
  about nothing rigor ships.
- **A re-verification command must be read-only.** A verifier executes it. This
  closes the contract gap logged 2026-07-22, when a mutating `--yes` re-verify
  line was executed by a verification agent.

### Detection is structural, never keyword search

Every session's system prompt lists every skill by name, so `grep -l
no-lookahead` matches **27 transcripts with zero real firings**. Detectors key
on `tool_use` blocks, `tool_result` payloads and hook attachments instead.

## Considered and refused

- **A retrospective ledger that never feeds promotion.** Honest, and it keeps
  the invariant untouched by construction — but nothing moves off zero, which is
  the entire point. Refused as ceremony.
- **Amending the no-backfill invariant.** Unnecessary once credit is defined as a
  present-tense re-run. Amending a rule you can satisfy is how a rule stops
  meaning anything.
- **Fanning out across the corpus in one workflow.** Faster, and wrong shape: a
  barrier across 44 sessions makes a partial result unusable, and multi-agent
  dispatch is opt-in here. One session per invocation, queue-driven, resumable.
- **Trusting the transcript's own report of an outcome.** The single largest
  temptation, and the one this ADR exists to refuse. A transcript records what an
  agent *said* a gate did.

## Self-refutations

1. **The silent-skip detector over-produces, and its first version was mostly
   false.** Measured: of 91 `implemented-vs-planned` candidates, roughly 50 were
   `/rigor:handoff` writing its own ledger entries — the command doing exactly
   its job, scored as an unchecked claim. The trigger was narrowed and the FP
   class pinned as a red twin; the count fell 104 → 43. The residual rate is
   still unmeasured and the rows stay **candidates**, not defects.
2. **`check-*.mjs` matched foreign gates.** Two sibling repos ran their own
   `check-ledger.mjs` 15 times; the first indexer scored all 15 as rigor firings.
   Now classified `foreign-gate` and never creditable. Both defects were found by
   reading the indexer's output, not by its tests — which is an argument that the
   tests were written to the design rather than to the corpus.
3. **A re-run proves the control works *now*, not that it worked *then*.** A
   component could have been broken during the session and fixed since; harvest
   would credit it on today's behaviour. The lead's `ts` and the `reverified_at`
   are both recorded so the gap is visible, but nothing closes it.
4. **The gate is form-only.** It cannot tell whether a re-run exercised what it
   claims, or whether a verdict is the right reading. A floor, never a verdict —
   the same honest limit `check-runlog` and `check-learnings` carry.
5. **Harvest adds shipped surface to a repo already ahead of its decisions.**
   ADR-0013 is Proposed with zero domains; this adds a command, a gate, a script
   and a ledger on top. The defence is that harvest is not more discipline
   surface — it is the mechanism by which the existing surface gets credited or
   refuted. If that argument fails, harvest should be rejected and the indexer
   kept as a diagnostic.
6. **The corpus is one operator, one machine.** Every domain it can credit
   carries the same-operator caveat every other row in the ledger already
   carries. Harvest widens the count of domains; it does not widen the count of
   people, and a component credited across sixteen of one person's repositories
   is still unproven for anyone else.

## Out of scope

- Writing or promoting anything in `FEEDBACK.md`.
- Reading transcripts outside the operator's own machine.
- Any claim about a component's behaviour during the harvested session beyond
  "a firing appears at this line."
