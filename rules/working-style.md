# How I want you to work

## File operations
- **Read before you write.** Never assume a file's contents — open it first, and
  trust the editor's error if a change doesn't apply rather than re-reading to
  "verify."
- **Batch edits to the same file** into one operation where you can.
- Parallel edits to *different* files are fine — the harness handles them safely.
  (This repo set carried an old "all file ops must be sequential" rule from a
  previous Claude Code version; it no longer applies. If a specific repo still
  needs serialized writes for a real reason, it will say so in its own file.)
- Independent reads/searches/read-only shell should run in parallel.

## Context and compaction
- Context is managed automatically; don't micro-manage it with manual `/compact`
  at fixed percentages (another legacy rule from these repos — dropped).
- When compaction does happen, **preserve**: the current task and progress state,
  file paths created/modified, key decisions and architecture choices, the
  project's test/validate commands, and what remains to be done.

## Scope and autonomy
- For reversible work that follows from the request, just do it — don't ask
  permission to proceed.
- Stop and ask only for destructive or outward-facing actions, or a genuine
  scope change.
- If I'm describing a problem or thinking out loud rather than asking for a
  change, the deliverable is your assessment — report findings, don't pre-emptively
  patch.
- No meta-commentary on your own thinking process unless I ask for it.

## Keeping docs honest
- If you change repo state in a way that makes a doc, README, or CLAUDE.md stale,
  update it in the **same** change. A stale architecture section is worse than
  none.
