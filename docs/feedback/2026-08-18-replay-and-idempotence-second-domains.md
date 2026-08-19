# 2026-08-18 · lineage-replay + idempotent-restatement + re-audit sweep · second domains · helped

Continuation of the same session's PARALLAX firing. Where that run gave each
component its *first* non-origin domain, this one supplies the second for three
of them — and honestly fails to for a fourth.

Orchestrator-executed throughout. **Zero subagent tokens, no fan-out, no agent
verdicts.** Every number below is a re-executed command.

Domains: **passed-vs-true-demo** (static site over two sibling research repos) and
**correct-shaped-lies** (adversarial producer/oracle simulation). Neither is
VANTAGE, the origin repo for all four data-eng skills.

## 1. passed-vs-true-demo — a genuine BATCH replay-and-diff

`lineage-replay`'s recorded gap was blunt: *even the origin firing is unconfirmed
as a true replay-diff.* This closes it.

pvt-demo's `ingest` transform reads six artifacts from two pinned sibling repos,
verifies each against a `PINNED_HASH` of its **canonical** bytes, cross-checks
`catch_rate` recomputed from `episodes.csv` against `summary.csv`, and writes
`public/data/*.json` plus a provenance `manifest.json`.

**Re-executed the real transform** via the exported `buildBundle` — keeping the
content-hash verification and the cross-check gate intact, bypassing only the
`PINNED_SHA` bookkeeping check, and writing to a scratch directory so the repo was
never mutated (`git status` clean before and after).

| artifact | replay vs committed |
|---|---|
| `erosion.json` | **identical** |
| `summary.json` | **identical** |
| `episodes.json` | **identical** |
| `transfer_validation.json` | **identical** |
| `gap_audit.json` | **identical** |
| `manifest.json` | differs — **commit shas only** |

The manifest delta is fully explained and fully benign: `diff` contains **zero**
`contentHash` lines. Only `generatedFrom.clue`/`.csl` and six `commitSha` fields
moved, because both siblings' HEADs have drifted (`a777cca`→`52de35d`,
`1d4c8e7`→`bdb182f`) while their artifact **content is bit-identical**. Verified
independently of the repo's own gate by recomputing all six canonical-byte hashes
from source: **6 match, 0 differ**.

That is ADR-0012's drift-versus-rot distinction firing on a second repo and
correctly answering **drift** — identity moved, content did not.

`F1=0.9143` and 180 episodes reproduced. pvt-demo's own gate re-run: **48 passed**
across 20 files.

**Polarity.** Negative control: the real `summary.csv` hashes to its pin — no false
alarm. Planted twin: a copy with `catch_rate` changed `1.0000`→`0.9999` — a single
digit — hashes to `0347096207a399ba…` and is **caught**. The first planted attempt
silently failed to mutate the file and was *not* recorded as a pass; it was
re-planted until the mutation provably landed. A twin that does not mutate is a
vacuous polarity test.

## 2. correct-shaped-lies — run twice, diff

`idempotent-restatement` move 1 demands proof by running twice and diffing, never
by reasoning about the code. `results/` there is gitignored, so the artifacts are
regenerable-but-untracked — the exact case that motivated pvt-demo's content pins.

Protocol: backed `results/` up first, ran `scripts/run_sweep.py` twice, diffed, and
**restored the backup unconditionally**. Repo left clean, restoration verified
byte-identical to the pre-session state.

- **run 1 vs run 2** — identical across `episodes.csv`, `summary.csv`,
  `erosion.csv`. Deterministic, no accumulation.
- **run 1 vs the pre-existing artifacts** — identical. The regenerator reproduces
  the pinned state exactly, which independently confirms that pvt-demo's content
  pins are *regenerable*, not merely stable on disk.

**Non-vacuity, stated precisely.** The sha-diff is proven non-blind: the same
technique caught a single-digit change in §1. The separate risk — a pipeline that
ignores its inputs would be trivially "idempotent" — is covered by **pre-existing
dated evidence** in this ledger (2026-07-01: perturbed-seed → hash mismatch).
**I did not re-run that control this session** and do not claim to have.

## 3. Promotion arithmetic — including the one that did NOT settle

| Component | Domains | Status |
|---|---|---|
| `lineage-replay` | 2 non-origin — PARALLAX (claim replay, 2026-08-18) + **pvt-demo (batch replay-and-diff)**, corroborated by CSL regeneration | **settled (scoped)** — the "unconfirmed as a true replay-diff" gap is **closed** |
| `idempotent-restatement` | 2 non-origin — **pvt-demo** (ingest run-twice identical) + **correct-shaped-lies** (sweep run-twice identical, reproduces pinned state) | **settled (scoped)** — move 1 proven twice. **Moves 2–3 unproven:** no same-key restatement tiebreak was exercised in either repo |
| re-audit sweep (ADR-0012) | 2 — PARALLAX + pvt-demo | **settled (scoped)** |
| `no-lookahead` | **1 non-origin** — PARALLAX only | **NOT settled.** Still 1 of ≥2 |

### Caveats, stated rather than buried

- **Same operator** for every domain, as for every prior promotion here.
- **pvt-demo and correct-shaped-lies are siblings** — pvt-demo *consumes* CSL's
  artifacts. The two firings are about different code (a site ingest transform vs
  an episode-simulation pipeline) in different repos with different problem
  domains, which is why they are counted separately. A stricter reader could call
  this one coupled domain rather than two; the coupling is recorded so the
  judgment is reviewable rather than hidden.
- **`idempotent-restatement` is settled on move 1 only.** Its moves 2–3 — an
  explicit, tested same-key tiebreak exercised with out-of-order arrival — were
  **not** exercised. The scope of "settled" is *rerun idempotence*, not
  restatement-collision resolution.

## 4. `no-lookahead` — one domain, and why it stopped there

PARALLAX supplied a full, non-vacuous firing: live surface **PASS** (440,661 rows
evaluated on C1/C3, 280,324 on C2), staged good subset of 935,935 rows **PASS**
(negative control), and the staged known-bad twin **FAIL** — `no_future_accepted`
1 violation, `restatement_visibility` 1 violation, "twin verdict: RED as required".
That exercises all three moves, including the restatement seam.

A second domain needs another repo with real as-of/point-in-time semantics.
VANTAGE is the origin and cannot open one. treasury-intent-controller has the
right shape (temporal revocation precedence, a durable sequenced feed) and its
Go gate/durable suites were re-run green here — but its payment-loop effort is
`paused: true` on a budget breach, and that pause is honored fail-closed rather
than worked around. So the component stands honestly at **1 of ≥2**, and settling
it is the next session's work, not something this one can assert.


### Candidate considered and REJECTED for `no-lookahead` domain 2

**closed-loop-default-detection.** It carries an explicit, tested "no-leakage
discipline" — disjoint train cohorts, `true_default` withheld at fit time, and
`tests/test_loop.py` covering it. Superficially a strong fit.

Rejected on inspection. CLDD's leakage is **cohort disjointness** (train/test
contamination in an ML fit); `no-lookahead` is specifically about *as-of /
point-in-time* data, where no row's value may depend on data timestamped after
that row's as-of instant, and whose named anti-pattern is an untested same-key
**restatement** tiebreak. CLDD has no same-key restatement and no as-of instant.
The two are adjacent, not the same, and crediting the resemblance would be a
manufactured domain — the exact move the promotion rules exist to prevent.

Recorded here rather than left silent so the judgment is reviewable: someone who
disagrees can see what was rejected and why.

## Re-verify

```
cd ~/dev/passed-vs-true-demo && npx vitest run            # 48 passed
cd ~/dev/parallax && .venv/Scripts/python.exe scripts/run_gate_local.py \
    --gold <gold> --cik-mod 97 --stage-twin <scratch>     # live PASS, good PASS, twin RED
```
CSL rerun-and-diff is destructive-then-restored; re-run it only with the same
backup-first protocol.
