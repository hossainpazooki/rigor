---
name: fanout-recon-synthesize
description: Use when one question is too big for a single pass and needs many angles — decomposes it into disjoint parallel recon against one shared return contract, refutes the load-bearing findings, then synthesizes the survivors into a conclusion (naming what was dropped or never covered).
status: provisional
---

# Fan-out, recon, synthesize

For a question no single pass answers well — "does this system do X, and where
could it fail?" — one reader misses angles a fan-out would catch. This skill is
the decompose → gather → refute → synthesize loop. It is the multi-agent shape
behind `/recon`.

## The four moves

1. **Decompose into disjoint recon tasks.** Split the question so each task owns a
   distinct slice with **no overlap**, and embed **one shared return contract**
   (what every task returns, in what shape) into each task's prompt. The shared
   contract is what keeps parallel findings comparable instead of drifting apart.
2. **Fan out in parallel.** Run the recon tasks concurrently; each is blind to the
   others and reports against the shared contract.
3. **Refute the load-bearing findings.** Every finding a conclusion will rest on
   goes through `refute` — recompute, re-run the gate, dispatch independent
   `skeptic-verifier` skeptics prompted to break it. A finding that does not
   survive is **dropped, not softened**.
4. **Synthesize the survivors.** Combine only what survived into a conclusion, and
   **name what was dropped and what no task covered** — silent gaps read as "all
   clear" when they are not.

## Relation to refute

This is not `refute`. It adds the two judgments `refute` has no opinion on:
decomposing a question into disjoint slices against a shared contract, and
synthesizing survivors into a conclusion. It *calls* `refute` on its findings.
Where `refute` breaks one claim, this breaks a question into many, breaks each
finding, and rebuilds a conclusion from what is left.

## The proven shape (runnable)

A domain-neutral example of this exact loop, written for the workflow runtime,
ships beside this skill at `example.mjs`: five recon dimensions fan out under a
shared findings schema, each finding is refuted by an independent skeptic, and
only the survivors are synthesized. It is the shape that audited this toolkit's
own spine — `pipeline(dimensions, recon, refute-each)` then a synthesis pass.

## Example

Question: "does feature X exist and actually work?" Decompose into disjoint recon
— where it is defined, where it is called, what tests cover it, where it could
silently no-op — each returning the same `{claim, evidence, location}` contract.
Run them in parallel, refute each load-bearing claim, then synthesize: "present
and exercised, except path P has no coverage" — naming the gap, not hiding it.
