---
description: Verify the effect of an irreversible action — probe the resulting state, not the action's success report.
status: provisional
---

Invoke the `verify-the-effect` skill on the action below (a deploy, migration,
pipeline run, `apply`, publish, or rollout). Separate the action's success report
from its effect, and verify the effect: probe the resulting state in layers
(substrate up → the thing answers → dependencies reachable → real cases correct)
rather than trusting the exit code; cross-check any `passed`-style verdict against
its own numbers and fail closed on mismatch; confirm the artifact you verified is
the immutable artifact that acted; confirm a failed probe reverses and
re-verifies; and name what the effect was verified against (self-consistent /
independent / oracle-gap). Report which effects are proven with evidence attached,
and which actions reported success without their effect being verified:

$ARGUMENTS
