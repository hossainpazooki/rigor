# OTel GenAI lane — measured evidence (point-in-time record)

2026-09-01. Two priors from the strategy discussion were stated as fact before
they were checked ("semconv moves on issues + working emitters"; "maintainers
merge docs PRs out of politeness"). Both were then measured against public
record the same day. This file is the dated record: what was run, what came
back, and what the instruments got wrong on the way. Numbers are as-of the
capture instant; re-derive before citing.

## Prior 1 — "prototype-first" · VERIFIED, stronger than asserted

It is written process, not folklore. `open-telemetry/semantic-conventions`
`CONTRIBUTING.md` (fetched 2026-09-01):

> In the PR description, include links to the relevant instrumentation and any
> applicable prototypes. Non-trivial changes to semantic conventions should be
> prototyped in the corresponding instrumentation(s).

Refinement from the record: the prototype is table stakes, not where review
energy goes. PR #2563 ("Gen AI Evaluation Result", merged 2025-08-26 — the PR
that created `gen_ai.evaluation.result`) ran 122 review comments and 32
commits over 5 files, and the discussion is schema vocabulary throughout
(naming, cardinality, score-label semantics).

## The gap is novel, not rejected

Across PR #2563's full discussion — 6,301 words of review + issue comments:

| term | occurrences |
|---|---|
| negative (control) | 0 |
| calibration | 0 |
| ground truth | 0 |
| false positive | 0 |
| "can fail" | 0 |
| evaluator | 18 |

The lone "fail" mention concerns score thresholds (a chatbot likert example),
not evaluator ability-to-fail. The concern was never raised — a filing would
be novelty, not re-litigation. **Scope limit:** this scans the founding PR
only; the issue tracker is still owed before "confirmed absence."

## Prior 2 — "docs merge politely" · supported at OpenLineage, refuted in-sample at semconv

40 most-recently-updated merged PRs per repo, classified docs-only vs code/spec
by changed-file paths; review depth = `review_comments + comments`:

| repo | docs-only | code/spec |
|---|---|---|
| OpenLineage/OpenLineage | n=5 · mean 0.0 · **all 5 zero-written-review** | n=29 · mean 4.1 · median 1 · 12 zero-review |
| open-telemetry/semantic-conventions | n=0 in sample | n=31 · mean 5.9 · median 2 · **0 zero-review** |

Limitations, stated: small recent-window samples; an approve-with-no-comment
scores 0, so "zero-written-review" means no written discussion, not
unreviewed; docs-only classified by file extension/path.

Consequence for claim cards: an OpenLineage docs merge is weak evidence by
measurement; a semconv merge always carried written contest in-sample; a
spec-field debate ending in acceptance is the strong form.

## Instrument failures caught during measurement

- `gh api <path> -f per_page=100` on a GET silently sends a POST → 422 → a
  downstream `grep -c` counted matches in the error body and reported **"0
  mentions of 'implement' in 122 comments"** with a clean exit. Caught by the
  positive control (prove the fetch returned text before trusting any zero);
  the true corpus was 6,301 words. Pagination on GETs belongs in the path
  (`'...?per_page=100'`), never in `-f`.
- A zero from a broken instrument is indistinguishable from a zero from the
  world. Every zero count above was re-run behind a proven fetch.

## Re-verify

- `gh api repos/open-telemetry/semantic-conventions/pulls/2563 --jq '{comments,review_comments,commits,changed_files}'`
- `gh api --paginate 'repos/open-telemetry/semantic-conventions/pulls/2563/comments?per_page=100' --jq '.[].body'` then count terms behind a `wc -w` positive control
- `gh api repos/open-telemetry/semantic-conventions/contents/CONTRIBUTING.md --jq .content | base64 -d | grep -n prototyped
