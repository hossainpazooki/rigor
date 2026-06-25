# Provenance

Vendored from `~/.claude/rules/` @ 2026-06-25.

These are a point-in-time copy so the plugin is self-contained on a fresh machine
(ADR-0001). The author's `~/.claude/rules/` remains the always-on source on their
own machine; `session-start.mjs` injects this copy ONLY when `~/.claude/rules` is
absent, to avoid double-loading. Re-sync when the source rules change; bump the
date above.
