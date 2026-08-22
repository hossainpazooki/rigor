---
name: break-glass-on-record
description: Use when an emergency change bypasses the normal change-record gate — the bypass record must exist before the bypass runs, every field non-empty, bound to the exact command it authorizes, and it is the one documented exception to class-2 refusal.
status: provisional
---

# break-glass-on-record

The rigor name is **no silent downgrade**; the change-enablement / SRE name is
**emergency change**. Every deployment-shaped command that reaches the
preventive control (`hooks/change-guard.mjs`) is refused unless a change
record on the configured ref clears the ladder in ADR-0013 §4 — except one
documented path: `RIGOR_BREAK_GLASS=<path>`. That path is not a way around the
control; it is the control, applied to a bypass instead of a change.

**The actual pre-bypass unit is not a change-log line.** It is a **standalone
record** — one JSON object `{ who, when, why, command }`, every field
non-empty — living at the path named by `RIGOR_BREAK_GLASS`, loaded through
the same ref-loader as the normal path (from the configured ref, default
`HEAD`). It cannot be a change-log line for the same reason an `outcome`
cannot exist before the step runs: the record has to exist *before* the
bypass, and the change log's `outcome` kind is written *after*. What lands in
the change log afterward is `outcome.break_glass`, the **post-fact
transcription** of that standalone record — the detective control checks the
transcription's form, not the original file, which may no longer even be
readable at audit time.

The generic anti-pattern this property exists to fix: an emergency input no
job reads, declared over an environment with no protection rules — a bypass
mechanism that exists in name, authorizes nothing, and blocks nothing, while
giving the appearance that emergencies are handled.

## Control shape

| Control | Assigned? | What it does here | rigor unit |
|---|---|---|---|
| Review (judgment) | not assigned | no reviewer twin exists for a bypass — property 5 is preventive and evidentiary, not a per-instance human judgment call | — |
| Preventive (blocking) | assigned | reads `RIGOR_BREAK_GLASS=<path>`, loads the standalone record through the same ref-loader as the normal path, requires `who`/`when`/`why`/`command` non-empty, requires `when` to carry an explicit UTC offset (a naive timestamp is refused), and requires **every** deploy-shaped command in the invocation to equal the record's `command` exactly after normalization — no prefix matching — any field empty, any naive `when`, or any command unmatched is **refused** | `hooks/change-guard.mjs` (`decide`, ladder step 1) |
| Detective (after the fact) | assigned | verifies, after the fact, that every recorded `outcome.break_glass` carries all four fields non-empty and that its `when` carries an explicit UTC offset — a transcription written with an empty field, or a naive `when`, is a form violation (P5) regardless of whether the hook ever saw the original record | `scripts/check-change-record.mjs` (property P5 in `findChangeRecordViolations`) |
| Evidentiary (record) | assigned, load-bearing | the standalone pre-bypass record itself (who, when, why, the exact command) plus its post-fact transcription in the change log | standalone file at `RIGOR_BREAK_GLASS`; change-record field `outcome.break_glass = { who, when, why, command }` |

This is the property where the evidentiary shape is load-bearing rather than
incidental: the hook's refusal and the detective control's form check both
exist only because a record is required to exist first.

## Moves

1. **Write the standalone record before the action, not after.** The
   friction of committing a `who`/`when`/`why`/`command` file first is the
   point — it is the same checkpoint `git-guard` already imposes on writing
   history, applied one step downstream to deploying. This record is not a
   change-log line; an `outcome` cannot exist before the step it describes
   has run, so the pre-bypass authorization has to live somewhere else —
   the path named by `RIGOR_BREAK_GLASS`.
2. **Bind the record to the exact command, not a category, and not a
   prefix.** `command` must equal, after normalization, **every**
   deploy-shaped command in the invocation — exactly, with no prefix
   matching. A record authorizing `kubectl apply -k kube/overlays/prod` does
   not authorize `kubectl apply -k kube/overlays/production`, and it does not
   authorize `kubectl apply -k kube/overlays/prod && terraform destroy` —
   the second deploy-shaped command in that compound has no record of its
   own and the whole invocation is refused.
3. **Treat an empty field as a refusal, never a downgrade to log and wave
   through.** `who`, `when`, `why`, `command` are each independently
   required; an emergency change with no stated reason is an unauthorized
   change, not an emergency change with a paperwork gap.
4. **After the fact, re-check the transcription, not the outcome.** The
   detective control does not ask whether the emergency was justified —
   outside what a form check can judge — it asks whether `outcome.
   break_glass` is complete and internally consistent. An entry with any
   field empty is a violation regardless of whether the underlying
   emergency was real.
5. **A well-formed transcription also changes the halt channel.** The gate
   halts (exit 2) when a change's newest record carries an honest
   unevaluable verdict with no break-glass - outcome.health on an executed
   change, or health_baseline on a proposal that has not executed yet - and
   when a path-bearing identity entry cannot be hashed. A well-formed
   outcome.break_glass takes an executed change out of that channel. An
   outcome that executed onto a non-pass baseline (unevaluable or fail) with
   break_glass: null is not a halt; it is a P5 violation (exit 1).

## Negative control

**Twins (must be refused / go red):**
- `RIGOR_BREAK_GLASS` pointing at a standalone record whose `why` is empty
  → the hook refuses.
- A standalone record whose `command` does not exactly match every
  deploy-shaped command in the invocation (a prefix, a superset, a second
  command with no record of its own) → the hook refuses.
- A standalone record whose `when` is unparseable, or parseable but naive
  (no explicit UTC offset) → the hook refuses.
- An `outcome` carrying `break_glass` with any field (`who`/`when`/`why`/
  `command`) empty, or with a naive `when` → the detective control marks it
  a P5 violation.
- An `outcome` that executed onto a non-pass (`unevaluable` or `fail`)
  baseline with `break_glass: null` → the detective control marks it a P5
  violation (the hook would have refused; if the step ran anyway, either a
  bypass was authorized and its transcription is missing, or the record is
  lying about what happened).

There is no reviewer twin for this property (it is not assigned the review
shape): a human authors and executes a break-glass by definition, so there is
no agent-authored proposal for a reviewer to refuse. What stands in its place
is the preventive control's refusal — an incomplete or mismatched record is
refused at the edge, before it ever becomes a bypass anyone acted on.

## Anti-pattern (correct-shaped lie)

An emergency input that exists in a pipeline's configuration, is documented
as "for emergencies only," and is never read by any job — so it authorizes
nothing and blocks nothing, while giving the appearance that emergencies are
handled. Its counterpart on the approval side: an environment declared to
require manual approval, over a remote with no protection rules configured —
the control reads as present because someone can point at the declaration,
and has never once fired, because nothing enforces it. And on the record
itself: a break-glass entry with `why: "urgent"` and `command: ""` — every
field technically present, none of it falsifiable, none of it bound to what
actually ran. `break-glass-on-record`'s evidentiary requirement is designed
not to be satisfiable by prose in any of these shapes — the record is checked
for form by a gate, not read for reassurance by a person skimming a
configuration comment.

## Refute link

"The bypass was logged" is not the claim to trust; the claim is "the bypass
was logged **before** it ran, **for this exact command**, **by a named
person**, **for a stated reason**." Refute it the way `refute` recomputes any
load-bearing claim: pull the standalone record, check its four fields are
each non-empty and independently meaningful (not four copies of the same
placeholder text), and diff its `command` field against every deploy-shaped
command that was actually executed — an exact match, not a prefix.

## Record fields

Writes/reads (ADR-0013 §2): the standalone pre-bypass record `{ who, when,
why, command }` at the path named by `RIGOR_BREAK_GLASS`, loaded from the
configured ref (default `HEAD`); and, post-fact, `outcome.break_glass = null
| { who, when, why, command }`, every field non-empty when present. The
standalone record is read by `hooks/change-guard.mjs` ladder step 1; the
transcription is read by `scripts/check-change-record.mjs` (property P5).

## Honest limit

The detective control checks **form**: are the four fields present and
non-empty in the transcription, and does its `when` carry an explicit UTC
offset — a naive timestamp is a P5 form violation, on the transcription and,
by the same rule, on the standalone record the hook reads. `when` is checked
for **well-formedness only** and is never ordered against execution time —
the gate has no independent clock to compare it to, so a well-formed but
backdated `when` is not something this property can catch. Likewise, "the record
existed before the bypass" rests entirely on the standalone record being
reachable from the configured ref at decision time; the gate does not and
cannot prove the file did not change between being written and being read,
only that it was there when it looked. Neither can it judge whether the
stated reason was a *good* reason, whether the emergency was real, or
whether a human other than the one who ran the command actually approved
it — that judgment is what the "human writes the record" requirement forces
into the open, not something a form gate can verify. Break-glass usage
staying rare and scrutinized is the target repo's process, not anything this
property enforces by itself; the gate only ensures that when it is used, it
cannot be used silently or incompletely.

## Pairs with

`git-guard` (the same friction-not-boundary shape, one step upstream), `change-
class-earned` (break-glass is the one documented exception to its class-2
refusal), `learn-from-misfire` (an emergency change that later turns out to
have been a misfire closes through the same loop as any other).
