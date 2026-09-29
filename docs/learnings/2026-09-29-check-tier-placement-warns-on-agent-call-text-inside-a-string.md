# 2026-09-29 - check-tier-placement warns on the text agent() inside a string

ts: 2026-09-29T22:40:44Z
commit: f710402
session: aae428e0-da70-4149-a7b2-c538ab5bbe38
status: verified
fact: check-tier-placement reports "agent() call without a tier pin" when the characters `agent()` appear inside a string literal, for instance in a workflow script's `meta.description`. The real call in the same script carries `model: TIERS.build` and is not the one flagged. The gate's header describes its source reading as string-aware. Found while linting a probe script whose description read "does a Workflow agent() accept a family alias". Worked around by rewording the description. Not fixed, and no closure record has been written.
basis: at 2026-09-29T22:40:44Z at f710402, `analyzeTierPlacement` on a three-line script whose meta description is 'mentions agent() in prose' returned one warning, `agent() call without a tier pin: an unpinned call inherits the SESSION model, not the build tier ...`; the same script with the description 'mentions nothing' returned `[]`.
re-verify: node --input-type=module -e "import { analyzeTierPlacement as a } from './scripts/check-tier-placement.mjs'; console.log(a(\"export const meta = { description: 'mentions agent() in prose' }\nphase('Build');\nawait agent('t', { model: TIERS.build, schema: S });\n\", {}).length)"
