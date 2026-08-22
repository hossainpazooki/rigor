---
name: release-artifact-integrity
description: Use when a deploy claims the reviewed artifact and the applied artifact are the same bytes — content-hash the identity at review, recompute it at the dispatch edge, and refuse on any mismatch rather than trusting the claim.
status: provisional
---

# release-artifact-integrity

rigor name: **attested bytes**. SDLC name: **release-package integrity, the
build/deploy segregation-of-duties boundary**. `verify-the-effect` already
states, as a precondition it never enforces, that "the artifact you verified
is the artifact that acted." This property is that precondition, made
mechanical: a content hash recorded at review, recomputed at the dispatch
edge, and refused on mismatch. One clause on the name itself: "attested
bytes" is this property's rigor **label**, not a claim that a recomputed
sha256 by itself reaches the "attested" rung of the content-addressing
ladder in move 3 — a hash compare is tamper-evident; nothing here signs or
attests anything in the stronger sense those words carry elsewhere.

## Control shape

| Control | Assigned | What it does here | rigor unit |
|---|---|---|---|
| Review | **not assigned** | none — see below | — |
| Preventive | yes | recomputes each `path`-bearing identity entry's sha256 at the change-execution edge and refuses on mismatch | `hooks/change-guard.mjs` (property P2) |
| Detective | yes | verifies `artifact.identity` is non-empty, every entry carries `sha256` or `value`, and any `path`-bearing entry's digest is recomputed when the file is present and readable under `--root`; a `path`-bearing entry whose file is missing or unreadable makes the CLI exit 2 (unevaluable), never clean; a `sha256` that is present but not 64 lowercase hex characters is a P2 form violation; an identity `path` that is absolute or contains `..` is a P2 form violation; value-only entries are form-checked — each must carry a non-empty string or a finite number, an empty string or `null` is a P2 form violation | `scripts/check-change-record.mjs` (property P2) |
| Evidentiary | yes | `proposal.artifact.identity` is the append-only record of what bytes were reviewed | change-record field (`artifact.identity`) |

**This property carries no per-instance review control, and says so.** The
per-instance check is purely mechanical — a hash compare needs no human
judgment applied to each instance. The one judgment this property does need —
*what the attested identity even is, for this pattern* — is made once by a
human and recorded permanently in the authorization's `identity_rule`; after
that, every instance is preventive plus detective plus evidentiary only.

## Moves

1. Do not invent per-target identity semantics inside a hook or a check
   script — that is exactly the generic, schema-aware validator ADR-0002
   refuses to build. The identity is a generic list of `{ name, path?,
   sha256?, value? }` entries; what belongs in that list for a given pattern
   is a human judgment, written once as the authorization's `identity_rule`,
   and applied by the skill inside the target repo.
2. State the identity rule for each of the two shapes this layer starts
   with, so the reviewer writing an `identity_rule` has a concrete precedent
   rather than a blank page:
   - **A rendered artifact that is content-addressable as-is** (for example
     a rendered manifest) is **one entry**: `{ name, path, sha256 }`.
   - **A plan that is only meaningful relative to state it was computed
     against** (for example a Terraform plan) is identified by a **tuple of
     three entries**: the plan file's hash, the state serial the plan was
     computed against (`{ name: "state_serial", value }`), and the provider
     lock file's hash. The plan hash and the lock-file hash are `path`-bearing
     and recomputed by the hook; **the state serial is a `value`-only entry,
     and value-only entries are form-checked** — it must carry a non-empty
     string or a finite number, never an empty string or `null` — but
     neither the preventive nor
     the detective control can observe a live state serial that advanced out
     of band, so the plan hash and lock-file hash staying identical while the
     serial moved is not something either control can catch from here. That
     drift is only red where the target writes the serial into a hashed,
     path-bearing artifact (a state snapshot committed beside the plan) or at
     a target-side pre-plan check — a target property to build, not something
     this property's hash compare can do on a bare `value` field.
3. Reuse `lineage-replay`'s content-addressing vocabulary rather than
   inventing a second scheme: tamper-evident (a hash) < signed < attested <
   revocable. A sha256 recorded and recomputed is **tamper-evident**. Never
   call it "signed" — that word names a different, stronger guarantee this
   property does not provide.
4. Before trusting the preventive control on a real target, locate where the
   artifact's bytes are actually produced relative to where the hook runs.
   If anything downstream of review still substitutes bytes — a template
   value filled in by a later CI step, a tag resolved at deploy time — the
   hook is hashing the wrong artifact by construction, no matter how clean
   its arithmetic is. That gap is a target property to fix, not something
   this skill's hash compare can paper over.

## Negative control

Detective twins that must go red: naive drift (rebuilding from the same
source produces different bytes than the recorded hash — note that for a
purely declarative render this twin may legitimately stay green, which is
itself informative, not a bug); and deliberate drift (one byte of the
artifact changed after review, before apply). Both must fail
`findChangeRecordViolations`'s property `P2` check — an identity entry with a
`path` present in the supplied digests whose recomputed digest disagrees with
the recorded one — before this property is trusted.

The Terraform tuple's third twin — same plan hash, `state_serial` advanced
out of band — is **not** a P2 digest-mismatch twin, and this skill does not
credit a refusal that cannot fire: `state_serial` is a `value`-only identity
entry, so neither the preventive nor the detective control can observe the
live serial. It is red only where the target writes the serial into a
hashed, path-bearing artifact (a state snapshot committed beside the plan),
which then behaves like any other P2 digest twin, or at the target-side
pre-plan check, which is outside this property entirely.

A separate, always-applicable twin: a `path`-bearing identity entry whose
digest **cannot be recomputed** at the edge (the file is missing or
unreadable) is **HALT** (unevaluable), never treated as verified — an
unrecomputable identity is not a pass by default.

No reviewer twin applies: there is no per-instance review control to credit.

## Anti-pattern (correct-shaped lie)

A change record whose `artifact.identity` carries a clean sha256, recorded at
review and never contradicted by anything the hook checks — while the actual
bytes applied at deploy time were assembled by a later pipeline step that
substitutes a value (an image tag, a resolved reference) the reviewed
manifest only carried as a placeholder. Every hash in the record matches
itself; none of them describe what was actually applied. The record is not
lying about its own arithmetic — it is attesting to the wrong artifact.

## Refute link

"The deployed artifact matches what was reviewed" is refuted by recomputing
the hash of the bytes actually handed to the mutating command at the moment
it runs (`refute` move 1: recompute from the raw source, not from the
record's own claim) and comparing it to the record — never by re-reading the
record's own `sha256` field back to itself.

## Record fields

Reads and writes `proposal.artifact.identity` (the list of `{ name, path?,
sha256?, value? }` entries) and the authorization's `identity_rule` (prose, a
human judgment, not a schema field rigor enforces). `change-backout-exercised`
depends on this field too: `backout.exercised_against` is the identity digest
computed over exactly this list.

## Honest limit

**First-domain limit, stated plainly:** the preventive control can only hash
what already exists on disk at the point it runs. Where a target's pipeline
substitutes bytes *inside* a CI job — after review, before the mutating
command — the hook cannot see or hash the substitution; it can only attest to
whatever was on disk when it ran, which is not necessarily what got applied.
Closing that gap is a change to the target (rendering and committing the
substituted artifact before dispatch), not something this property's hash
compare can do from outside the pipeline.

## Pairs with

`change-backout-exercised` (its `exercised_against` digests this property's
identity list); `lineage-replay` (the shared content-addressing vocabulary,
not re-derived here); `change-class-earned` (a class-0 pattern's authorization
carries the `identity_rule` this property applies per instance).
