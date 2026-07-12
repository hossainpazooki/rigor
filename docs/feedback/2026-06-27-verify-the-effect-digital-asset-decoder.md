# verify-the-effect / effect-prober — independent domain #1 (digital-asset decoder stub)

2026-06-27 · `verify-the-effect` / `effect-prober` / `check-effect-probe` ·
helped · institutional digital-asset platform API (decoder service) · **First
catch — independent domain #1, and a non-numeric/non-string defect** (exactly the
class the 2026-06-27 scope entry flagged as unproven). The LLM decoder reports a
healthy, configured deploy — `get_health()` (`src/decoder/llm_service.py:121-129`)
returns `status: healthy, anthropic_configured: true, available_tiers: [anchored,
guided, exploratory]` when a key is set — yet `explain()` (`llm_service.py:28-88`)
returns a hardcoded stub ("This is a stub explanation … available once the
Anthropic API key is configured") on **every** call, with no code path that
references `has_api_key` or any client. The *report* (healthy + configured) is
true while the *effect* (a real explanation) is absent. The spine's numeric/citation
moves slide right over it: `confidence: 0.85` is a real number and the citations
resolve to real input fields — every number and string checks out while the
behavior is a stub. Caught by a complete static read of `explain()` (exhaustive
over inputs) + the verify-the-effect content probe (`'stub' not in explanation` →
**EFFECT-REFUTED**); `check-effect-probe.mjs` flagged the as-deployed
`/decoder/health` probe as *vacuous* (no control separating stub from real). Note:
**stronger than the original mining summary**, which said "returns stub when no key
set" — the raw source shows it returns the stub *even with a key configured*.
Confirmed from source, not the subagent summary. Caveat: static + record-level, not
a live end-to-end probe against a running deploy.
