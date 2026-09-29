/**
 * Model-id reading shared by check-dispatch and tier-lock. A tier in
 * config/models.json may hold a FAMILY ALIAS (the harness resolves it to the
 * newest model of that family at dispatch) or a full model id (an exact pin).
 * Pure functions, no fs.
 *
 * HONEST LIMITS:
 *  - Reads only ids shaped `claude-<family>-<n>[-<n>...]`. An id in any other
 *    shape is unreadable here, and unreadable is reported, never guessed at.
 *  - Version order is read from the digits in the id. It says which id is
 *    numbered higher, not which model is better.
 */

export const FAMILIES = ['fable', 'opus', 'sonnet', 'haiku'];

/** True when the string is a family alias rather than a full model id. */
export function isAlias(value) {
  return typeof value === 'string' && FAMILIES.includes(value.trim());
}

const ID_RE = /claude-(fable|opus|sonnet|haiku)-(\d+(?:-\d+)*)/g;

/**
 * Read the one model id a receipt names. Returns { family, version, id } or
 * null when the text names no readable id, or names two different ones.
 * A trailing 8-digit date part and a `[1m]` suffix are not part of the version.
 */
export function parseModelId(text) {
  if (typeof text !== 'string') return null;
  const found = new Map();
  for (const m of text.matchAll(ID_RE)) {
    const parts = m[2].split('-');
    if (parts.length > 1 && /^\d{8}$/.test(parts.at(-1))) parts.pop();
    const id = `claude-${m[1]}-${parts.join('-')}`;
    found.set(id, { family: m[1], version: parts.map(Number), id });
  }
  return found.size === 1 ? [...found.values()][0] : null;
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
