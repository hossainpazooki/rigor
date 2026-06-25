# Multi-agent workflows

I opt into orchestration **explicitly** — I'll say "use workflows" / "spin up a
team", or you'll see `ultracode`. Don't fan out a fleet of agents for ordinary
tasks; the opt-in is required (it can burn a lot of tokens). When I have opted in:

## Fan-out discipline
- Fan out **independent** work as parallel agents, each owning **disjoint
  files** against **one shared interface contract embedded in the prompt.** This
  is how these codebases were actually built — the shared contract is what
  prevents interface drift between agents.
- Use **`pipeline()` by default** so each item flows through all stages without a
  barrier. Reserve a `parallel()` barrier for when a stage genuinely needs *all*
  prior-stage results at once (dedup-before-verify, zero-count early exit,
  cross-item comparison).
- Give every agent a **structured output schema** so results are machine-usable,
  not prose I have to re-parse.

## Finishing a build
- End a multi-file build with a **single integration agent** that runs the
  project's real pipeline/validator and **iterates until it actually passes**
  (e.g. the validator prints its success line, the test suite is green).
- **Never trust a workflow's self-reported success.** The integration agent's
  job is to produce evidence, and you independently confirm it per
  `verification-and-honesty.md`. A workflow saying "done" is a claim to verify,
  not a result to accept.

## Reusable shapes
- Adversarial verify: N independent skeptics per finding, each prompted to
  *refute*; keep only what survives a majority.
- Loop-until-dry: keep finding until K consecutive rounds surface nothing new.
- Judge panel: N independent attempts from different angles, scored, synthesized
  from the winner.
