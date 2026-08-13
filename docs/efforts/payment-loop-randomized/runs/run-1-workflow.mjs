export const meta = {
  name: 'payment-loop-randomized-run-1',
  description: 'Adjudicate the randomized payment-loop run: evidence, then skeptics who try to refute',
  phases: [
    { title: 'Evidence', detail: 'independent evidence-gather per claim (build tier)' },
    { title: 'Refute', detail: 'primary skeptic per claim (judgment tier)' },
    { title: 'Vote', detail: 'second independent refuter (mid tier)' },
  ],
}

const TIERS = args.tiers
const REPO = args.repo
const EVIDENCE = args.evidence

const GUARD = `
FIRST, confirm you are in the right tree: run \`cat ${REPO}/go.mod | head -3\` and verify the
module is github.com/hossainpazooki/intent-plane. If it is not, stop and report repoConfirmed:false.

You may RUN things (read-only w.r.t. the repo — the driver writes only to a temp dir):
  ${REPO}/core/scorer/.venv/Scripts/python ${REPO}/treasury/randomized_loop.py --seed <N> --intents 40
Each run takes 1-3 minutes. You may NOT edit any file in the repo and you may NOT touch git.

The run being adjudicated is described in ${EVIDENCE}.

Report the EXACT model id you are answering on as answered_model, bare (e.g. claude-fable-5),
never a display name.
`

const CLAIMS = [
  {
    key: 'oracle-independence',
    claim: `The driver's oracle() in ${REPO}/treasury/randomized_loop.py is an INDEPENDENT second
implementation of CONTRACT.md 4.2's refusal order, so 240/240 agreement with the live gate over
four seeds is evidence about the gate rather than a tautology.`,
    attack: `Try to show the agreement is circular or vacuous: the oracle reading the gate's own
response before predicting, the oracle being a transliteration of gate.go rather than of the
contract (and whether that matters), classes whose prediction cannot fail, or a comparison that
tolerates disagreement (e.g. comparing only the terminal and not the reason).`,
  },
  {
    key: 'coverage-live',
    claim: `All thirteen terminal possibilities in CLASSES actually occurred against the REAL gate
binary and the REAL Python scorer in every seed, and a run in which a class never occurs FAILS.`,
    attack: `Try to show a class is reached by something other than the live loop (a stub, the
proxy answering for the gate, a class counted from the oracle rather than from the gate's
response), or that the resample-until-covered loop makes coverage a property of the PLAN rather
than of the observed run, or that a missing class could pass unnoticed.`,
  },
  {
    key: 'plant-nonvacuity',
    claim: `The driver is non-vacuous: three defects planted in a copy of the module (thin-spec
defense deleted; idempotency collision check deleted; unknown posture silently defaulting to
enforce) each turned the driver red FOR ITS OWN SEMANTIC REASON, not by crashing or failing to
build.`,
    attack: `Try to show a plant was red for the wrong reason (compile error, harness crash, a
generic failure that would fire for any change), that a plant did not actually exercise the
defect, or that the recorded plant evidence cannot be reproduced. You may re-plant yourself: copy
the module to your own temp dir, inject the defect, run the driver there.`,
  },
]

const EVIDENCE_SCHEMA = {
  type: 'object',
  required: ['repoConfirmed', 'finding', 'weaknesses', 'answered_model'],
  properties: {
    repoConfirmed: { type: 'boolean' },
    finding: { type: 'string' },
    supporting_paths: { type: 'array', items: { type: 'string' } },
    weaknesses: { type: 'array', items: { type: 'string' } },
    answered_model: { type: 'string' },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['refuted', 'verdict', 'reason', 'answered_model'],
  properties: {
    refuted: { type: 'boolean' },
    verdict: { type: 'string', enum: ['REFUTED', 'SURVIVES', 'SURVIVES_NARROWED', 'UNVERIFIABLE'] },
    reason: { type: 'string' },
    commands_run: { type: 'array', items: { type: 'string' } },
    narrowing: { type: 'string' },
    answered_model: { type: 'string' },
  },
}

const results = await pipeline(
  CLAIMS,
  (c) => agent(
    `${GUARD}\nGATHER EVIDENCE for this claim, without deciding it:\n${c.claim}\n\n` +
    `Read the driver, the gate (${REPO}/core/internal/gate/gate.go), and the evidence file. ` +
    `Report what a skeptic would need: where the claim rests, and every weakness you can see.`,
    { label: `evidence:${c.key}`, phase: 'Evidence', model: TIERS.build, schema: EVIDENCE_SCHEMA },
  ),
  (ev, c) => agent(
    `${GUARD}\nYou are an adversarial refuter. DEFAULT TO REFUTED when uncertain.\n\n` +
    `CLAIM: ${c.claim}\n\nHOW TO ATTACK: ${c.attack}\n\n` +
    `A prior evidence pass reported: ${JSON.stringify(ev)}\n` +
    `Do not trust it — verify anything you rely on. Run the driver if that helps.`,
    { label: `refute:${c.key}`, phase: 'Refute', model: TIERS.judgment, schema: VERDICT_SCHEMA },
  ).then((v) => ({ claim: c, evidence: ev, primary: v })),
  (r) => agent(
    `${GUARD}\nSecond independent refuter. Do NOT read the first verdict as authority.\n\n` +
    `CLAIM: ${r.claim.claim}\n\nHOW TO ATTACK: ${r.claim.attack}\n\n` +
    `Reach your own verdict from your own checks.`,
    { label: `vote:${r.claim.key}`, phase: 'Vote', model: TIERS.mid, schema: VERDICT_SCHEMA },
  ).then((v) => ({ ...r, vote: v })),
)

return results.filter(Boolean).map((r) => ({
  key: r.claim.key,
  evidence: r.evidence,
  primary: r.primary,
  vote: r.vote,
  refuted_votes: [r.primary, r.vote].filter(Boolean).filter((v) => v.refuted).length,
}))
