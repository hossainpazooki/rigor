// fanout-recon-synthesize — the proven shape, domain-neutral.
//
// Run via the workflow runtime. Pass args.dimensions = [{ key, prompt }], each a
// DISJOINT slice of the question whose prompt cites the shared findings contract
// below. Each load-bearing finding is refuted by an independent skeptic before it
// counts; only survivors are synthesized.
//
// This is the loop that audited this toolkit's own Phase-1 spine.

export const meta = {
  name: 'fanout-recon-synthesize',
  description: 'Decompose a question into disjoint recon, refute every finding, synthesize the survivors.',
  phases: [{ title: 'Recon' }, { title: 'Verify' }, { title: 'Synthesize' }],
}

// The shared return contract — every recon task returns exactly this shape, so
// findings from blind parallel agents stay comparable.
const FINDING = {
  type: 'object', additionalProperties: false, required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['title', 'severity', 'location', 'evidence', 'proposed_fix', 'confidence'],
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'important', 'minor'] },
          location: { type: 'string' },
          evidence: { type: 'string', description: 'Reproduced: the command + output, or exact lines.' },
          proposed_fix: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
  },
}

const VERDICT = {
  type: 'object', additionalProperties: false, required: ['verdict', 'reason'],
  properties: {
    verdict: { type: 'string', enum: ['REAL', 'FALSE', 'UNVERIFIABLE'] },
    reason: { type: 'string' },
  },
}

const DIMENSIONS = (args && args.dimensions) || []

phase('Recon')

// pipeline (not a barrier): each dimension's findings start refuting the moment
// that dimension's recon returns — a slow dimension never blocks a fast one.
const verified = await pipeline(
  DIMENSIONS,
  (d) => agent(d.prompt, { label: 'find:' + d.key, phase: 'Recon', schema: FINDING, model: 'sonnet' }),
  (res, d) => parallel(((res && res.findings) || []).map((f) => () =>
    agent(
      'A reviewer claims the following is a real defect. REFUTE it: reproduce it, ' +
      'attack the strongest literal reading, and return REAL only if it survives. ' +
      'Default to FALSE/UNVERIFIABLE when uncertain.\n' + JSON.stringify(f),
      { label: 'verify:' + d.key, phase: 'Verify', schema: VERDICT, agentType: 'skeptic-verifier', model: 'sonnet' }
    ).then((v) => ({ ...f, dimension: d.key, verdict: v }))
  ))
)

const real = verified.flat().filter(Boolean).filter((x) => x.verdict && x.verdict.verdict === 'REAL')
log('synthesizing ' + real.length + ' survived findings')

phase('Synthesize')
const conclusion = await agent(
  'Synthesize these verified findings into one conclusion. Name what was dropped ' +
  '(refuted) and, where knowable, what no recon task covered:\n' + JSON.stringify(real, null, 1),
  { label: 'synthesize', phase: 'Synthesize', model: 'sonnet' }
)

return { findings: real, conclusion }
