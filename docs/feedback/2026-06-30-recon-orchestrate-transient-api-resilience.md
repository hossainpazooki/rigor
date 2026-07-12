# /recon + orchestrate misfire — no transient-API-error resilience (CLDD)

2026-06-30 · `fanout-recon-synthesize` (`/recon`) / `orchestrate` · misfired
(infrastructure — no transient-API-error resilience) · credit-risk ML
(closed-loop-default-detection — a "how can the validation harness be taken to alpha?"
recon) · **First logged infrastructure misfire of the workflow runtime, not of the
reasoning.** Of 17 agents, **5 died on `API Error: Connection closed mid-response`**:
two of the five recon dimensions — `recon:tests` and `recon:validity` — crashed
**entirely** (each returned `null`, so its whole slice produced zero findings), plus
three refuters (`not-on-pypi`, `sphinx-build-clean`, `fidelity-doc-unrunnable`) crashed,
leaving load-bearing findings **unverified**. **The danger this exposes:** a crashed
recon dimension drops silently to `null` and a crashed refuter leaves its finding
un-adjudicated — both read as *"all clear"* unless synthesis explicitly accounts for
them. The synthesize move's "name what no task covered" rule is what saved it: the
orchestrator named `tests`+`validity` as **uncovered** and self-discharged the two
load-bearing survivors the dead refuters dropped — re-ran `pytest` (**90 passed, exit
0**) and re-inspected `inspect.signature(run_fidelity_gate)` to confirm the hardcoded
`WindowsPath('C:/Users/hossa/dev/intuit-techweek-hackathon/.../dataset')` default
(`orchestrate` #8 in action, this time against *infrastructure* gaps, not false
refutations). Also confirmed the crashed `recon:validity` agent (mid-`git status`,
having regenerated artifacts) left the repo **clean** (`git status --short` empty).
**Structural gap (the fix this entry is filed for):** `/recon` /
`fanout-recon-synthesize` / `orchestrate` have **no resilience to transient API
connection errors and no coverage-accounting guard**. Proposed fixes: (a) wrap each
`agent()` in per-agent **retry-with-backoff** on transient `Connection closed
mid-response` / connection-reset errors before dropping to `null` (the runtime's
built-in retry did not catch these); (b) a synthesis-time **coverage ledger** that
treats any dimension or refuter returning `null` as an explicit, loudly-surfaced
*uncovered-gap*, never folded silently into the survivor list — make the
"name-what-was-dropped" move mechanical, not dependent on the orchestrator remembering
(same opt-in-vs-triggered theme as 2026-06-26 enforcement); (c) document/automate
**resume-on-failure** as the standard recovery — `Workflow({scriptPath,
resumeFromRunId})` re-runs only the crashed agents (12 cached / 5 live), which is the
mitigation used here. **Evidentiary basis (honest):** the 5-agent failure set is read
from the workflow's own result JSON (`logs[]` + per-agent `state==error`); the two
self-verifications (pytest, fidelity signature) and the clean-tree check were re-run by
this orchestrating session. The surviving findings corroborated the prior
`/honesty-check` (sklearn-API-incompatible, `4-Beta` overstated, fidelity gate
unrunnable by outsiders) but are secondary here — this entry is logged for the
**runtime-resilience** lesson. Same author/operator caveat.
**Rerun outcome (`resumeFromRunId wf_5c79cea0-42a`, 12 cached / 11 live):** the two
dead dimensions completed and the resume-as-recovery path worked — but it carried
**two further lessons.** (1) **A different failure mode recurred:** one refuter
(`refute:tests:fidelity-green-rests-on-absent-private-data`) died on
`StructuredOutput retry cap (5) exceeded`, **not** a connection error — so the
resilience gap is broader than connection-closed; the coverage-guard fix (b) must
treat *any* `null`/errored agent as an uncovered slot regardless of cause (its finding
was salvaged only because two convergent survivors covered it). (2) **`skeptic-verifier`
false refutation #N (recurring theme, now credit-risk ML too):** the validity skeptic
returned `headline-gcomp-reproduces` = **survives:false**, claiming fresh seed-42
`strong_gap=0.0082427` vs committed `0.0078823`. The orchestrator re-ran it directly
(`run_counterfactual_eval(seed=42, selection_severity∈{0.4,1.0})`) and reproduced the
committed `seed_sweep_25.csv` rows **exactly to 10 decimals** (0.0078823063…, 0.0017032393…)
— the skeptic had run `scripts/run_seed_sweep.py --quick` (reduced config) and compared
it against the full-config artifact, an apples-to-oranges false refutation. **`orchestrate`
#8 (re-run ≥1 load-bearing check yourself) caught it again** — same pattern as 2026-06-28
VANTAGE (2/4 false refutations) and 2026-06-26 ATLAS GAP 2. Net corrections to the synthesis:
the fidelity gate **does** reconfirm on this machine (data present; `check_fidelity.py` →
`OVERALL: PASSED`, n=51,722, re-run by orchestrator), and the §3 g-comp headline **does**
reproduce deterministically — but both are author-machine/private-data bound and CI-unverified
(`pytest.skip` at `tests/test_fidelity.py:36` when the dataset is absent; the "90 passed / 0
skipped" count is machine-specific). All orchestrator re-runs left the tree clean
(`git status --short` empty).
