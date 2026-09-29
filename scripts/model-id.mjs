/**
 * Model-id reading shared by check-dispatch and tier-lock. A tier in
 * config/models.json may hold a FAMILY ALIAS (the harness resolves it to a
 * model of that family at dispatch) or a full model id (an exact pin).
 * Pure functions, no fs.
 *
 * A receipt is a bare id, or it is unreadable. The first version of this module
 * looked for an id anywhere inside the text; the whole-branch refutation of
 * 2026-09-29 showed that `claude-fable-5-1-mini` and `I am Haiku 4.5, not
 * claude-fable-5-1` both then read as claude-fable-5-1. The second version
 * accepted any text in a bracket suffix, so another model's name could ride
 * inside the brackets; the second round of the same day refuted that.
 *
 * HONEST LIMITS:
 *  - Reads only ids shaped `claude-<family>-<n>[-<n>...]`, alone in the text,
 *    with an optional context-window tag such as `[1m]`. Anything else is
 *    unreadable, and unreadable is reported, never guessed at.
 *  - Version order is read from the digits in the id. It says which id is
 *    numbered higher, not which model is better.
 *  - A bare id is still the agent's own word for what answered.
 */

export const FAMILIES = ['fable', 'opus', 'sonnet', 'haiku'];

/** True when the string is a family alias rather than a full model id. */
export function isAlias(value) {
  return typeof value === 'string' && FAMILIES.includes(value.trim());
}

// The tag in brackets is digits and one lowercase letter: [1m], [200k].
const ID_RE = /^claude-(fable|opus|sonnet|haiku)-(\d+(?:-\d+)*)(?:\[\d{1,3}[a-z]\])?$/;

/**
 * Read the model id a receipt or a lock entry holds. Returns
 * { family, version, id } or null when the text is not one bare id.
 * A trailing 8-digit date part and a context-window tag are not part of the
 * version; a version part longer than three digits is not a version.
 */
export function parseModelId(text) {
  if (typeof text !== 'string') return null;
  const m = ID_RE.exec(text.trim());
  if (m === null) return null;
  const parts = m[2].split('-');
  if (parts.length > 1 && /^\d{8}$/.test(parts.at(-1))) parts.pop();
  if (parts.some((p) => p.length > 3)) return null;
  const version = parts.map(Number);
  return { family: m[1], version, id: `claude-${m[1]}-${version.join('-')}` };
}

/** Negative when a is numbered lower than b, zero when equal, positive when higher. */
export function compareVersions(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}
