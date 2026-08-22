# First-domain rehearsal — ADR-0013 deployment layer against the ATLAS kernel's real prod overlay

**Date:** 2026-08-22 · **Target:** `regulatory-rule-engine` at `d7aba0f` (the ATLAS
kernel: Kustomize overlays on EKS, GitHub Actions CD) · **rigor:** `a8f1bb6` +
this session's uncommitted build · **Kind:** record-level rehearsal. **Not a live
run, not a domain.** The 2026-06-27 audit's caveat applies verbatim: *every catch
was static/record-level, not a live probe against a running system.*

**One-line conclusion:** the layer's six properties each find something real in
the first domain's own deploy pipeline without any planting — and the gate, run
on a proposal record written honestly from that pipeline, refuses it on four
properties and halts on a fifth. The domain enters at **class 2** and nothing is
demoted. A live run is impossible today: the CD has never succeeded (41/41 runs
failed at startup; no AWS credentials wired), the production environment has
**zero** protection rules on the remote, and the operator's kubeconfig points at
a foreign admin context whose endpoint no longer resolves.

## Evidentiary basis

- **[RECOMPUTED]** by the orchestrator from the raw files and `gh` API, stamped
  in the session's learnings entries (`docs/learnings/2026-08-22-*`): the
  rendered-overlay hashes (16:34:12Z), the remote environment/run state
  (16:52:29Z). Three skeptic-verifier passes independently reached the same
  remote-state facts (`docs/plans/2026-08-22-deployment-layer-build.md` §1).
- **Fixture files** beside this audit in
  `2026-08-22-first-domain-rehearsal/`: the three rendered manifests (reviewed,
  CI-substituted, tampered) and the change-log fixtures built from them.

## 1. The real overlay, rendered three ways

`kubectl kustomize kube/overlays/prod` (kubectl v1.34.1, Kustomize v5.7.1),
156 lines:

| render | sha256 | what it is |
|---|---|---|
| reviewed | `2ca713b1c30f47662b00bce23a660e4ff574e2b32330bf0474641ec1832a52e7` | what anyone reviewing the overlay sees — line 63 `image: ${ECR_REGISTRY}/legal-compliance-frontend:${IMAGE_TAG}` (literal placeholders) |
| reviewed, rendered again | `2ca713b1…` (identical) | rendering is byte-deterministic here — the **naive-drift** twin stays green on this domain |
| CI-substituted | `643e2da2ebe5343e0c825be96a2fde63d366250b3024986b4c7dde044495f3e7` | the `kustomize edit set image …` step at `cd-production.yml:98-99` applied to a copy — what `kubectl apply -k .` at `:102` actually ships |
| tampered | `047d87df274a359456dbfa8722527a235f704c931dbc833aa484c42aa4a818a6` | one line changed (`replicas: 2` → `3`) after review — the **deliberate-drift** twin |

**Property 2 finding, no planting needed:** the reviewed bytes and the applied
bytes differ *by construction* — the image tag is substituted inside the deploy
job, after any review could have happened. The hook can only hash what is on
disk where it runs, so release-artifact-integrity **cannot be enforced at the
edge** in this domain until the substituted manifest is rendered and committed
before dispatch. That is the rehearsal's first recommendation to the target.

## 2. What each property finds in the pipeline as it stands

| property | finding in `regulatory-rule-engine` | file:line |
|---|---|---|
| 1 backout exercised | `rollout undo` runs only inside the deploy job, only on that job's own failure; never exercised against the candidate before the deploy; a failed *validation* does not back out at all | `cd-production.yml:110,114` |
| 2 artifact integrity | image tag substituted in CI after review (§1) | `kustomization.yaml:18-19`, `cd-production.yml:98-102` |
| 3 health fail-closed | validation curls `https://legal-compliance.example.com/` — a placeholder hostname — six times after a fixed 30 s sleep, no declared window; an unreadable signal fails the job with the candidate left in place: **unevaluable coerced to fail, and no backout** | `cd-production.yml:130,135-136` |
| 4 non-vacuous probe | the same curl is the only post-deploy check; it passes whether or not the new image is live — a static readiness read with no negative control | `cd-production.yml:136` |
| 5 break-glass on record | `skip-approval` is declared "for emergencies only" and **read by no job**; the `# Requires manual approval` line is a YAML comment; the `Production` environment has `protection_rules: []` on the remote — the real silent downgrade is an approval gate that exists only in prose | `cd-production.yml:10,71`; `gh api …/environments/production` |
| 6 class earned | no pattern, no authorization, no human approval mechanism: **class 2** by rule 1 (unclassifiable → 2); nothing to demote | — |

Remote state, recomputed 16:52:29Z: all five environments `rules: 0`;
`cd-production.yml` 20 runs all `failure` (newest 2026-06-11T23:43:06Z);
`cd-staging.yml` 21 runs all `failure`; the operator's `gh` token carries the
`workflow` scope, so an agent on this box **can** dispatch the workflow today and
it fails at `configure-aws-credentials`.

## 3. The gate on an honest proposal record

`2026-08-22-first-domain-rehearsal/change-log.real.jsonl` is a `proposal`
written truthfully from the pipeline: class 2, no authorization, backout
`described` (no run), identity = the reviewed render's hash, blast radius =
the five resources the render touches, baseline signal = the placeholder curl
(source unreadable, no sample), probe plan with the curl and an empty control.

Gate output — see §5 (filled in after the final build round of the session).

## 4. The two P2 twins on the real overlay

`change-log.twin-p2-ci-substitution.jsonl` attests the reviewed hash while the
identity path points at the CI-substituted bytes; `change-log.twin-p2-tampered.jsonl`
does the same against the tampered bytes. Both must be red on P2 when the gate is
handed the files (`--root` at the fixture directory). Output in §5.

## 5. Gate runs (19:11:51Z, after build round 5; `node --test` 523/523)

`node scripts/check-change-record.mjs change-log.real.jsonl --root .` → **exit 1**:

```
[form] missing or malformed: backout.exercised_against, backout.run_ref, backout.by, backout.exit_code
[P1]   backout.kind is "described" - a claim, not evidence; a backout must be run against the candidate before the deploy
[P1]   backout.exit_code is null, not 0 - a run that failed is not a credited backout
[P1]   backout.run_ref is empty - no evidence the backout ran
[P1]   backout.exercised_against does not match this candidate's identity digest
[form] signal frontend-root-200 is missing last_sample_ts
[P4]   probe_plan is missing a non-empty claim or control
```

Seven refusals on a record written truthfully from the pipeline: the backout is
a description (P1, four ways), the only health signal has never been sampled
(form), and the probe has no control (P4). The baseline verdict is honestly
`unevaluable`; the gate reports **exit 1, not exit 2**, because violations
outrank the halt channel — the HALT would surface only once the form and P1
defects were fixed. Class: 2 by rule 1. The hook, given this record and
`RIGOR_CHANGE_ID=rre-prod-2026-08-22-001`, refuses before reading any of it:
"class 2: a human executes".

Both P2 twins → **exit 1** with the same seven lines plus one more each:

```
[P2] artifact.identity[0] (rendered-manifest) sha256 does not match the recomputed digest for rendered-prod-overlay.ci-substituted.yaml
[P2] artifact.identity[0] (rendered-manifest) sha256 does not match the recomputed digest for rendered-prod-overlay.tampered.yaml
```

That is release-artifact-integrity red on the first domain's own bytes with no
planting (the CI substitution) and on a one-line tamper. Negative control: the
`reviewed` render re-hashed to the recorded digest (`2ca713b1…`) on both
renders, so the P2 check is not always-red.

## 6. Honest bounds

- **Record-level only.** No cluster was reached; no rollout, rollback, or probe
  ran. Every catch here is a reading of files and a remote API, the same class
  as the 2026-06-27 audit's catches.
- **Use, not a domain.** The rehearsal exercises the layer on a real repo but
  does not open a promotion domain: nothing was proposed, refused, or authorized
  by a human through it. `docs/feedback/2026-08-22-deployment-layer-authored.md`
  holds the ledger position (0 domains).
- **Same operator** as every other domain in the ledger.
- **The hook is friction, not a boundary** (ADR-0013 §4, self-refutation 7;
  `AGENTS.md` invariants). The round-4 skeptics found bypass forms in both
  hooks — several pre-existing in `git-guard` — that round 5 closed and a tail
  that is recorded, not closed, in the ADR and the handoff.

## 7. Recommendations to the target (not applied; rigor does not edit the target)

1. Put a required-reviewer rule on the `Production` environment — until then
   class 2 has nothing to stand on.
2. Render and commit the image-substituted manifest before dispatch so the
   attested bytes are the applied bytes.
3. Replace the placeholder validation hostname and declare the evaluation
   window; pair the probe with a negative control (the previous image must
   fail it).
4. Exercise `rollout undo` against the candidate in staging before the
   production dispatch, and record its exit code.
5. Delete the dead `skip-approval` input or wire it to a record with who/why.
