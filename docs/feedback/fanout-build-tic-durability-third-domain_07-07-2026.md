# fanout-build — third independent domain (Go authorization gate, durability refactor)

2026-07-07 · `fanout-build` · helped · deterministic distributed-systems Go
(treasury-intent-controller — stdlib-only authorization gate; a domain independent
of VANTAGE's Scala/Spark and CLDD's Python/sklearn) · **Third independent domain**,
run end-to-end as a Workflow-tool pipeline (`wf_5e8bf6e5-9df`): Spike → Contract
(CONTRACT-DURABILITY, then named CONTRACT-V2) → Scaffold → Build (3 disjoint-file
agents ∥, then server) → Integrate (named gate + live kill/restart probe) →
Verify (6 skeptics, one per contract claim). 12 agents, 0 errors, ~34 min.

**Evidentiary basis (honesty line):** same operator as the prior two domains, and
this entry is written by the session that ran the build — evidence is the
workflow's structured result plus the orchestrator's OWN independent gate re-runs
(below), not agent self-reports alone. No third-party verification.

**Pause/resume across sessions worked.** The pipeline was stopped pre-scaffold on
07-02 (human pause), state recorded in a `/handoff` brief + memory, and resumed
07-06 via `resumeFromRunId` — the saved script re-ran from zero cached agents with
no drift. First live confirmation that the fanout-build shape survives a
multi-day interruption.

**Environment adaptation without weakening the gate.** The named gate includes
`-race`, which needs cgo; the Windows host has no C compiler. The build agent
installed gcc + Go inside WSL and ran the VERBATIM gate there rather than
dropping the flag — and reported the substitution explicitly instead of
claiming the literal command ran. The orchestrator then re-ran BOTH legs himself
(native minus `-race`, WSL with `-race`; all packages ok) per `orchestrate` #8.

**Integrate probed the effect, not the exit code.** A 7-step live probe built the
real binary, drove an intent to ACHIEVED, `taskkill`-ed the process, restarted
over the same data dir, and asserted byte-identical records, gapless GlobalSeq
continuation, and a same-key refusal across the restart — the durability CLAIM,
not the test suite's word for it.

**Verify: 6/6 survived under MANDATED non-vacuity — and the skeptics out-probed
the official suite twice.** Every skeptic had to inject the guarded-against bug
into a temp COPY and watch a probe go red before its PASS counted. Two
skeptic-authored probes caught vacuities the shipped tests missed: (a) deleting
the `ByIntent` sort left the official suite GREEN (single-run file order is
coincidentally sorted) — only the skeptic's same-intent-resubmit probe went red;
(b) a `GlobalSeq = len(records)+1` mutant stayed green under the contract probe
(count==max blind spot) — only the skeptic's out-of-band-max probe caught it.
Contrast with VANTAGE (2/4 FALSE refutations, 06-28): with non-vacuity mandated
in the prompt, this run produced 0 false refutations and 2 genuine
suite-strengthening finds. One skeptic also correctly diagnosed a mid-run
failure as an external temp-dir wiper (environmental) instead of misattributing
it to the code — 4/4 green on pristine re-runs.

**Residual caveats.** Same operator across all three domains; the verify pass was
again un-stressed by a false refutation (nothing to catch, unlike VANTAGE); the
`-race` leg ran only in WSL, never natively; skeptics noted a crash between
`Write` and `Sync` is not simulable in-process.
