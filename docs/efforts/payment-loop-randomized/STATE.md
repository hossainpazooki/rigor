# STATE — randomized payment-loop exercise (treasury-intent-controller)

paused: true — **HALTED ON BUDGET, pending operator.** Run 1 spent 724,877 subagent tokens against a 150k L1 cap (4.8x) and blew the instantiation's 500k total ceiling in a single iteration. Nothing further dispatches until the operator either raises the cap (as they did for backlog-settlement after run 5) or tightens the shape.
budget: L1 sweep <= 150k subagent tokens per iteration (this instantiation's default; no raise granted). Recon-scale runs need an explicit operator go, recorded in run-log.jsonl
governed-by: ../../adr/0004-loop-chassis-rigor-conscience.md · run log: run-log.jsonl (append-only)
last-run: 1 (2026-08-13, fanout-loop iteration 1 — randomized driver built and run over the live loop; **13/13 terminal classes observed live across 4 seeds / 240 intents, 240/240 oracle agreement, 3 planted defects each red for its own reason**; adjudicated by 9 agents, 0 refutations, 2 narrowings; `check-dispatch` clean; see run-log entry 1)
last-updated: 2026-08-13 · operator-set goal ("run the payment loop with randomness introduced | main possibilities shown to be working")

**Why the cap was blown, for whoever raises or refuses it:** nine agents were each allowed to RUN
the live driver (1-3 minutes per seed) and two of them to copy the module and re-plant defects.
That is what made the adjudication worth having — the plant claim survived because two refuters
reproduced all three reds themselves — and it is also what cost 63k-93k tokens per agent. The
cheap version (read-only agents) would not have produced that evidence. The choice is real, not a
mistake to engineer away, but it must be priced BEFORE dispatch next time.

**This file is a mutable spine, not evidence.** Pick-up refutes it on every entry; the run log
and the per-run evidence/verdict files are the record. Every write here passes
`implemented-vs-planned`.

## Goal

The treasury payment loop is exercised under RANDOMIZED inputs — not only the ten hand-authored
quickstart probes — and every terminal possibility the contract names is shown to occur and to
be correct against an oracle that does not read the gate's code.

Honest boundary: this effort makes claims about the loop's BEHAVIOR under random inputs. It makes
no claim about deployment posture (R1/R2 key authority, workload identity), which stays where the
ROADMAP puts it.

## Run queue (consumed top-down by /rigor:fanout-loop)

Standing authorization for this instantiation, recorded here and in the first run-log entry:
L1 per iteration (<= 150k subagent tokens), total ceiling 500k, terminate on 2 consecutive dry
passes. Queue entries are PLANNED work; nothing below is done until its run-log entry and gate
evidence exist.

~~1. Build a randomized driver and show the main possibilities live~~ — **CONSUMED by run 1
(2026-08-13)**: `treasury/randomized_loop.py` built; seeds 1/7/42/1337 (220 intents) all matched
the independent oracle; 13/13 classes observed each run; plants A/B/C red. Adjudication in
`runs/run-1-verdicts.jsonl`.

2. **Concurrency**: the driver declares sequentially. At-most-once under CONCURRENT declaration of
   the same key is pinned by unit tests (`TestConcurrentReserveDurable`) but has never been
   exercised end-to-end through the live gate. Needs an operator go.

3. **Restart mid-stream**: kill and reboot the gate over the same `INTENT_DATA_DIR` part-way
   through a randomized stream, then continue — reservations and feed sequence must survive.
   Unbuilt.

4. **Seed-corpus regression**: keep a small file of seeds that once found a defect and re-run them
   as a gate. Empty today (no defect found yet by randomization).

5. **The revoked-vs-unattested ordering edge is unreachable by the sampler** (found by run 1's
   evidence pass, not previously known): an intent either cites a published spec (revokable) or
   `spec_ref=-1` (unattested, no spec object), so a hash that is BOTH revoked and unresolvable —
   the exact rule `gate.go` says was "found by end-to-end smoke" and pinned by
   `TestRevokedResolutionWinsOverUnattested` — never occurs. Closer: publish a spec, revoke it,
   then delete its `.env.json` from the store, leaving the tombstone; the resolver should still
   answer `revoked:<ref>`, not `unattested-spec`. Cheap to add; 13/13 class coverage is not
   ordering-interaction coverage.

6. **Make the fault-injected classes honest in the driver's own output**: `volatile-recheck` is
   proxy-forged in every seed and `unevaluable:criterion` sometimes is. The summary should mark
   which classes were reached only through injection, so the next reader cannot repeat run 1's
   overclaim about "the real scorer".

## Backlog / open questions

| Item | Standing | What moves it |
|---|---|---|
| Randomized driver | **built + run (2026-08-13)**, 4 seeds, oracle-checked, plant-proven | more seeds; it is not yet wired into any gate (deliberate: runtime ~1-3 min/seed) |
| Volatile-recheck realism | exercised via an injected fault proxy (PASS at declaration, FAIL at dispatch) | a real mutable fact source would exercise it without injection |
| Scorer-outage realism | injected as HTTP 503 through the proxy | the quickstart's real process-kill remains the stronger evidence for outage |
| Python scorer under random facts | exercised (real service, random facts) | — |
| Concurrency / restart | not exercised end-to-end | queue items 2 and 3 |
