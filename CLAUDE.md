@AGENTS.md

## Claude Code notes

- This repo IS the rigor plugin and its own local marketplace — editing
  `skills/`, `agents/`, `commands/`, or `hooks/` edits the shipped surface.
- The stub-plus-`@AGENTS.md` layout is deliberate (ADR-0003): AGENTS.md is
  the single canonical brief; probe-verified that this harness does not load
  AGENTS.md natively, so this stub is required. Add Claude-Code-only notes
  here; everything tool-neutral belongs in AGENTS.md.
