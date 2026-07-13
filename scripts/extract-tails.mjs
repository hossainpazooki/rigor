import { readFileSync, readdirSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';

/**
 * Tails index extractor: one JSONL row per session transcript —
 * {ts_start, ts_end, session_id, cwd, tail}. The output is a regenerable
 * harness-side CACHE for routing, never a record and never evidence: a tail
 * is the transcript's most concentrated self-report. Funnel doctrine: tails
 * route, mid-file grep locates, gate re-runs decide. Keep the output out of
 * any repo — it points at machine-local transcripts and is unscrubbed.
 *
 * Pure row derivation; the CLI walks the filesystem.
 */
export function sessionRow(lines, sessionId) {
  const recs = [];
  for (const l of lines) { try { recs.push(JSON.parse(l)); } catch { /* skip malformed */ } }
  if (!recs.length) return null;
  const stamps = recs.map(r => r.timestamp).filter(Boolean);
  let tail = null;
  for (let i = recs.length - 1; i >= 0 && tail === null; i--) {
    const c = recs[i]?.message?.content;
    if (recs[i].type !== 'assistant' || !Array.isArray(c)) continue;
    const text = c.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    if (text) tail = text.slice(0, 10000); // bounded cache, not a truncated record
  }
  return {
    ts_start: stamps[0] ?? null,
    ts_end: stamps.at(-1) ?? null,
    session_id: sessionId,
    cwd: recs.find(r => r.cwd)?.cwd ?? null,
    tail,
  };
}

// Windows-safe main-module check.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = process.argv[2] ?? join(homedir(), '.claude', 'projects');
  for (const proj of readdirSync(root)) {
    let files;
    try { files = readdirSync(join(root, proj)).filter(f => f.endsWith('.jsonl')); } catch { continue; }
    for (const f of files) {
      const lines = readFileSync(join(root, proj, f), 'utf8').split('\n');
      const row = sessionRow(lines, basename(f, '.jsonl'));
      if (row) console.log(JSON.stringify(row));
    }
  }
}
