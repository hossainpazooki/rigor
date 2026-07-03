---
name: lineage-replay
description: Use when a dataset claims reproducibility, replay, or provenance — every published batch carries a content-addressed identity, and any replay claim is re-executed and diffed, never asserted.
status: provisional
---

# lineage-replay

Every published dataset carries a content-addressed identity, and any
reproducibility or replay claim is **executed and diffed**, never asserted.

## Moves

1. Content-address the batch: hash of inputs + code + config, so identity is
   verifiable, not merely named.
2. "Replay is reproducible / byte-equivalent" is a claim. Re-execute from the
   recorded identity and diff the output (`refute` move 2 — re-execute the real
   gate). If you have not diffed, you have not verified — you have described.
3. Name the provenance rung honestly, in order:
   tamper-evident (a hash) < signed < attested < revocable. Do not call a hash
   "signed." Do not call retrieval "replay."

## Anti-pattern

A "byte-equivalent replay" line in the docs that no test ever re-executes. The
reproducibility is asserted; the diff never runs.
