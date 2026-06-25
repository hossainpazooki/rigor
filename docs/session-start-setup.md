# session-start setup (required for context delivery)

The `session-start` hook surfaces the `using-rigor` pointer and, on a machine
without rigor's vendored rules, injects them.

## Why manual registration is required

A plugin's `hooks.json` `SessionStart` hook does **not** currently surface
`hookSpecificOutput.additionalContext` to Claude — it returns only a generic
success message. This is upstream
[claude-code#16538](https://github.com/anthropics/claude-code/issues/16538)
(closed as not planned). Verified 2026-06-25.

Shipping the hook in the plugin's `hooks.json` alone therefore leaves the
toolkit's self-introduction **degraded**: the pointer and vendored rules never
reach the model.

## Fix: register in `~/.claude/settings.json`

The same hook registered in user config works correctly. Add:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "node \"<absolute-path-to-rigor>/hooks/session-start.mjs\"" }
        ]
      }
    ]
  }
}
```

Replace `<absolute-path-to-rigor>` with this repo's path. The plugin's own
`hooks.json` SessionStart entry can stay (harmless on the plugin path) or be
removed.
