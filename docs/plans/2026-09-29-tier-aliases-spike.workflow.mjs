export const meta = {
  name: 'tier-alias-spike',
  description: 'rigor: does a Workflow script accept a family alias as a model, and which model id answers',
  phases: [
    { title: 'Probe', detail: 'one agent per alias, no tools, reports its own model id' },
  ],
}

const A = (typeof args === 'string' ? JSON.parse(args) : args) || {};
const ALIASES = A.aliases;
if (!Array.isArray(ALIASES) || ALIASES.length === 0) return { halted: true, reason: 'args.aliases required, e.g. ["fable","opus","sonnet"]' };

const RECEIPT = {
  type: 'object',
  required: ['model'],
  properties: { model: { type: 'string' } },
};
const PROMPT = 'Availability probe. Run no tools. Report in the "model" field the bare model ID verbatim from your own system prompt ' +
  '(the string after "The exact model ID is"). If you cannot determine it, report "unknown".';

phase('Probe');
const answers = await parallel(ALIASES.map((alias) => () =>
  agent(PROMPT, { label: 'probe:' + alias, phase: 'Probe', schema: RECEIPT, model: alias, effort: 'low' })
    .then((v) => ({ alias, answered: v && v.model ? v.model : 'no answer' }))
));

const missing = ALIASES.length - answers.filter(Boolean).length;
if (missing) log('WARNING: ' + missing + ' probe(s) returned null - those aliases are NOT settled');
return {
  missing,
  receipts: answers.filter(Boolean).map((r) => ({
    role: 'worker', node: 'tier-alias.spike', label: 'probe:' + r.alias,
    verifier_model: { requested: r.alias, answered: r.answered },
  })),
};
