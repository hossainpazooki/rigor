# ADR-0015 — Tiers follow the latest model

**Status:** **Proposed 2026-09-29.** Code exists ahead of this decision (the
ADR-0010 precedent). Everything built for it is **provisional, fixture-tested,
zero domains**.

## Context

`config/models.json` and the agents' frontmatter pinned exact model ids. When a
newer model of a family became available, every workflow kept using the pinned
one until both places were edited by hand (the 2026-08-22 re-pin of the mid
tier, ADR-0007, is the one recorded instance).

The pins were not decoration. ADR-0006 requires that a substituted model shows
up as a logged downgrade, and `check-dispatch` enforced that by exact id: a
receipt naming `claude-fable-5-1` against a `claude-fable-5` pin was a
violation by design.

Operator direction, 2026-09-29: a newer model of a family, once available,
should be used in place of the older one without an edit. Decisions taken the
same day: all tiers, and aliases with a lock file.

## Decision

1. **A tier's value is a family alias**, in `config/models.json` and in agent
   frontmatter. The tiers ship on `fable`, `opus` and `sonnet`; the code also
   reads `haiku`, which no tier uses. The harness resolves an alias at
   dispatch, to the version its alias points to.
2. **`config/models.lock.json` records which model id each family last
   resolved to**, with the date and the run that showed it. It holds the
   current state; its git history is the record of model moves.
3. **`check-dispatch` matches a receipt by family and judges its version
   against the lock.** Equal is clean. Newer is a move: printed, not a
   failure, and printed only on a run with no violation. Older is a
   regression: a violation. A receipt that is not one bare model id, and a
   family with no readable lock entry, are each unevaluable, exit 2. A bare id
   may carry a context-window tag such as `[1m]` and a trailing date, and
   nothing else. A record logged `downgraded: true` is not judged against the
   lock at all, as it is not judged by the silent-downgrade check: the flag is
   the orchestrator's own statement that something else answered. A lock file
   that cannot be read is unevaluable whatever the records say.
4. **`tier-lock` prints the lock a run implies and writes nothing.** The lock
   changes only by a commit the human runs. It reads the receipts that
   requested an alias and are not logged `downgraded: true`, and proposes no
   lock when one of them is not one bare id, when a family answered on two
   versions, when the run is older than the lock, or when any key of the lock
   is not a family holding one bare id of that family: an entry is never
   lowered and never replaced unread. A lock file that names a family twice is
   read as JSON reads it, last entry wins; the earlier one is never seen.
5. **A historical verdict log is checked against the config and the lock in
   force when it was written.**

## What this gives up

- **Like-for-like evidence across a move.** The model under a verifier can
  change with no edit to the shipped surface. The lock dates the boundary; it
  does not make runs on either side comparable.
- **Exact-id strictness for alias tiers.** A receipt on a newer version of the
  requested family now passes. An exact-id request is still matched exactly.

## Considered and refused

- **Aliases with no lock.** A model change would be visible only inside run
  receipts, and the same-family rule below would pass unseen.
- **Exact pins plus a command that rewrites them.** Every move would be a
  commit, but the operator asked for use without an edit.

## Self-refutations

1. **"Latest" is the harness's claim, not ours.** Per the harness
   documentation, an alias of the session model's own family resolves to the
   session's exact model. A session on an older model of a family dispatches
   that family's agents on the older model. The lock reports it as a
   regression; nothing prevents it. The same documentation says an alias can
   resolve to an older model than the newest available, which is then reached
   only by its full id or by an environment variable that redirects the
   alias. Nothing in this repository checks that an alias points at the
   newest model; the title of this record states the aim, not a guarantee.
2. **Receipts are self-reported.** `answered` is what an agent reads from its
   own system prompt. This decision does not strengthen that. The first build
   read an id anywhere inside a receipt, so another model echoing the
   requested id passed (refuted 2026-09-29). A receipt is now one bare id or
   it is unreadable; a bare id is still the agent's word.
3. **Version order is read from the digits in the id.** It says which id is
   numbered higher, not which model is better, and it reads only ids shaped
   `claude-<family>-<n>`.
4. **A move is seen only when a run produces a receipt.** Nothing polls for
   new models. Between runs the lock can be behind.
5. **A model passed on a dispatch overrides the agent's frontmatter.** Measured
   2026-09-29: a `claude-fable-5`-pinned agent dispatched with the `fable`
   alias answered as `claude-fable-5-1`.

## Out of scope

Tiers for a second harness. Polling for new models. Any automatic commit.
