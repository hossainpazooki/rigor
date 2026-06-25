# Rigor Plugin Audit Report

Severity-ranked findings from adversarial review. All findings below have `verdict.verdict === "REAL"` — reproduced against the live codebase.

---

## Critical

### 1. `git rebase` not blocked — history rewrite bypasses guard

**Location:** `hooks/git-guard.mjs:3-10` (BLOCKED array)

**Evidence:** All three invocations return `{ block: false }`:
- `decide('git rebase main', {})`
- `decide('git rebase -i HEAD~5', {})`
- `decide('git rebase --onto main dev feature', {})`

The BLOCKED array contains no pattern matching the `rebase` subcommand. The official test suite has zero rebase test cases.

**Fix:** Add to the BLOCKED array:

```js
/^git\s+rebase(?!\s*(--abort|--skip)\b)/,
```

This blocks all history-rewriting rebase forms while allowing `git rebase --abort` and `git rebase --skip`. Place after the existing `reset --hard` entry. Also add test cases to `tests/git-guard.test.mjs`:

```js
test('blocks git rebase', () => {
  assert.equal(decide('git rebase main', env).block, true);
  assert.equal(decide('git rebase -i HEAD~5', env).block, true);
  assert.equal(decide('git rebase --onto main dev feature', env).block, true);
  assert.equal(decide('git rebase --abort', env).block, false);
  assert.equal(decide('git rebase --skip', env).block, false);
});
```

**Dimension:** `git-guard-bypass` — any code change needs a matching test.

---

### 2. `git cherry-pick` not blocked — applies commits and creates new history

**Location:** `hooks/git-guard.mjs:3-10` (BLOCKED array)

**Evidence:** Both return `{ block: false }`:
- `decide('git cherry-pick abc123', {})`
- `decide('git cherry-pick A..B', {})`

**Fix:** Add to the BLOCKED array:

```js
/^git\s+cherry-pick(?!\s+--abort\b)/,
```

This blocks all history-writing cherry-pick invocations while leaving `git cherry-pick --abort` unblocked. Add corresponding tests asserting both forms block and `--abort` does not.

**Dimension:** `git-guard-bypass` — any code change needs a matching test.

---

### 3. `git -C` / `--git-dir` / `--no-pager` global flags before subcommand defeat the `^git\s+<sub>` anchor

**Location:** `hooks/git-guard.mjs:18-19` (startsWith + BLOCKED test logic)

**Evidence:** All five return `{ block: false }`:
- `decide('git -C /repo commit -m x', {})`
- `decide('git --git-dir=.git commit -m x', {})`
- `decide('git --no-pager commit -m x', {})`
- `decide('git --git-dir=.git push origin main', {})`
- `decide('git -C /repo reset --hard HEAD', {})`

Root cause: BLOCKED regexes anchor to `/^git\s+commit\b/` etc., but git accepts global options before the subcommand, so `'git -C /tmp commit'` never matches `/^git\s+commit\b/`.

**Fix:** Strip the git binary and any leading global-option tokens before matching the subcommand:

```js
for (const raw of segments) {
  const seg = raw.trim();
  if (!seg.startsWith('git ') && seg !== 'git') continue;
  const tokens = seg.split(/\s+/);
  let i = 1; // skip 'git'
  const VALUE_FLAGS = new Set(['-C', '--git-dir', '--work-tree', '--namespace', '--exec-path']);
  while (i < tokens.length) {
    const t = tokens[i];
    if (VALUE_FLAGS.has(t)) { i += 2; continue; }
    if (/^(--git-dir=|--work-tree=|--namespace=|--exec-path=)/.test(t)) { i++; continue; }
    if (/^(-p|--paginate|--no-pager|--bare|--no-replace-objects|--literal-pathspecs|--glob-pathspecs|--noglob-pathspecs|--icase-pathspecs)$/.test(t)) { i++; continue; }
    break;
  }
  const normalized = ['git', ...tokens.slice(i)].join(' ');
  if (BLOCKED.some((re) => re.test(normalized)) || /--no-verify\b/.test(seg) || /--force\b/.test(seg)) {
    return { block: true, reason: '...' };
  }
}
```

Add tests covering all five bypass patterns.

**Dimension:** `git-guard-bypass` — any code change needs a matching test.

---

### 4. Shell env-prefix form (`VAR=val git commit`) bypasses guard

**Location:** `hooks/git-guard.mjs:18` (startsWith check)

**Evidence:** All three return `{ block: false }`:
- `decide('GIT_AUTHOR_NAME=x git commit -m x', {})`
- `decide('GIT_DIR=/repo/.git git commit -m x', {})`
- `decide('ENV=val git push origin main', {})`

Root cause: The guard is `seg.startsWith('git ')`. A segment like `GIT_AUTHOR_NAME=x git commit` does not start with `git `, so it is skipped entirely.

**Fix:** In `hooks/git-guard.mjs`, replace lines 17-19:

```js
const seg = raw.trim();
const stripped = seg.replace(/^(\w+=\S*\s+)+/, '');
if (!stripped.startsWith('git ') && stripped !== 'git') continue;
if (BLOCKED.some((re) => re.test(stripped))) {
```

Also add tests asserting all three env-prefix bypass inputs return `block: true`.

**Dimension:** `git-guard-bypass` — any code change needs a matching test.

---

### 5. Subshell and command-substitution wrappers bypass guard

**Location:** `hooks/git-guard.mjs:18` (startsWith check)

**Evidence:** All three return `{ block: false }`:
- `decide('( git commit -m x )', {})`
- `decide('`git commit -m x`', {})`
- `decide('$(git commit -m x)', {})`

Root cause: The split regex splits on `&&`, `||`, `;`, `|`, `\n` but not on `(` or `$(` or backticks.

**Fix:** Strip subshell/substitution wrappers before the startsWith check:

```js
const inner = seg
  .replace(/^\$\(/, '')
  .replace(/^\(/, '')
  .replace(/^`/, '')
  .replace(/[`\)]+$/, '')
  .trim();
const effective = inner || seg;
if (!effective.startsWith('git ') && effective !== 'git') continue;
if (BLOCKED.some((re) => re.test(effective))) { ... }
```

Alternatively, extend the split regex: `String(command).split(/&&|\|\||;|\||\n|\$\(|\(|`/)`. Add tests for all three bypass forms.

**Dimension:** `git-guard-bypass` — any code change needs a matching test.

---

### 6. `git filter-branch` not blocked — mass history rewrite entirely unguarded

**Location:** `hooks/git-guard.mjs:3-10` (BLOCKED array)

**Evidence:** Both return `{ block: false }`:
- `decide('git filter-branch --env-filter "GIT_AUTHOR_EMAIL=new" HEAD', {})`
- `decide('git filter-branch --tree-filter "rm -f passwords.txt" -- --all', {})`

Note: `filter-branch -f` uses the short flag `-f`, not `--force`, so the `/--force\b/` catch-all does not help.

**Fix:** Add to BLOCKED after line 9:

```js
/^git\s+filter-branch\b/,
```

Add a corresponding test asserting `decide('git filter-branch --env-filter ...', env).block === true`.

**Dimension:** `git-guard-bypass` — any code change needs a matching test.

---

### 7. `git am` not blocked — applies patch series and creates commits

**Location:** `hooks/git-guard.mjs:3-10` (BLOCKED array)

**Evidence:** Both return `{ block: false }`:
- `decide('git am patch.mbox', {})`
- `decide('git am *.patch', {})`

**Fix:** Add to BLOCKED:

```js
/^git\s+am(?!\s+--abort)\b/,
```

If `git am --abort` (recovery only, no commits) should remain permitted, use the negative-lookahead variant shown. Add test asserting `decide('git am patch.mbox', env).block === true`.

**Dimension:** `git-guard-bypass` — any code change needs a matching test.

---

### 8. `SessionStart additionalContext` silently dropped for plugin hooks — core feature non-functional

**Location:** `hooks/session-start.mjs` (lines 32-34) and `hooks/hooks.json` (lines 11-17)

**Evidence:** The script emits the correct JSON shape, but GitHub issue #16538 (closed as "not planned") confirms that when a `SessionStart` hook is registered via a plugin's `hooks.json`, Claude does NOT receive `hookSpecificOutput.additionalContext` — it only gets a generic "SessionStart:Callback hook success: Success" message. The same hook registered in `~/.claude/settings.json` works correctly.

**Fix:** Register the `SessionStart` hook in `~/.claude/settings.json` (user config) rather than relying on the plugin's `hooks.json` for this event. The plugin can continue to ship `hooks/session-start.mjs` but must document that users add it manually:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"<absolute-path-to-rigor>/hooks/session-start.mjs\""
          }
        ]
      }
    ]
  }
}
```

The `SessionStart` entry in `hooks/hooks.json` lines 11-17 should either be removed or kept with a prominent comment noting it is non-functional on the plugin execution path due to platform issue #16538 (closed as not planned).

**Dimension:** `hook-schema-web`

---

### 9. Vendored rules suppressed on any machine that already has `~/.claude/rules` — defeats portability for the primary target audience

**Location:** `hooks/session-start.mjs:30` and `buildContext()` at line 13

**Evidence:** On this machine, `~/.claude/rules/` exists with 6 personal rule files and `rigor/rules/` has 7 vendored files. Running the hook produces 1 line / 299 chars / `contains vendored rules: False`. The condition `if (!homeRulesPresent && vendoredRules)` at line 13 is false whenever the directory exists, silently dropping the entire vendored rule payload. Any developer who already uses Claude Code with personal `~/.claude/rules` — the primary plugin-install audience — receives only the POINTER string.

**Fix:** In `hooks/session-start.mjs`, replace line 30 and the condition at line 13:

```js
// Line 30 — add a sentinel check:
const homeRulesPresent = existsSync(join(homedir(), '.claude', 'rules'));
const rigorAlreadySynced = homeRulesPresent &&
  existsSync(join(homedir(), '.claude', 'rules', 'verification-and-honesty.md'));

// Line 13 — change the guard from:
if (!homeRulesPresent && vendoredRules) {
// to:
if (!rigorAlreadySynced && vendoredRules) {
```

This injects the vendored rules whenever rigor's own sentinel file is absent from `~/.claude/rules/`, regardless of whether the user has other personal rules there. It prevents double-injection on machines that have already synced rigor's rules, while correctly serving the plugin-install case.

**Dimension:** `hook-portability`

---

## Important

### 10. `git revert` not blocked — creates new reversal commits

**Location:** `hooks/git-guard.mjs:3-10` (BLOCKED array)

**Evidence:** Both return `{ block: false }`:
- `decide('git revert HEAD', {})`
- `decide('git revert HEAD~3..HEAD', {})`

**Fix:** Add to BLOCKED:

```js
/^git\s+revert(?!\s+(--no-commit|-n)\b)/,
```

This blocks commit-creating revert invocations while allowing `git revert --no-commit HEAD` and `git revert -n HEAD` (staging only). Note: the `-n` short alias must be included; omitting it blocks a safe staging operation. Add corresponding tests.

**Dimension:** `git-guard-bypass` — any code change needs a matching test.

---

### 11. `git fast-import` not blocked — low-level bulk history import

**Location:** `hooks/git-guard.mjs:3-10` (BLOCKED array)

**Evidence:** `decide('git fast-import', {})` returns `{ block: false }`.

**Fix:** Add to BLOCKED:

```js
/^git\s+fast-import\b/,
```

Add a test: `assert.equal(decide('git fast-import', env).block, true)`.

**Dimension:** `git-guard-bypass` — any code change needs a matching test.

---

### 12. `git update-ref` not blocked — directly rewrites branch/tag refs bypassing all safety checks

**Location:** `hooks/git-guard.mjs:3-10` (BLOCKED array)

**Evidence:** Both return `{ block: false }`:
- `decide('git update-ref refs/heads/main abc123', {})`
- `decide('git update-ref HEAD abc123', {})`

**Fix:** Add to BLOCKED:

```js
/^git\s+update-ref\b/,
```

**Dimension:** `git-guard-bypass` — any code change needs a matching test.

---

### 13. `git reset --soft` and `--mixed` not blocked — move HEAD without `--hard`

**Location:** `hooks/git-guard.mjs:6` (only `--hard` variant blocked)

**Evidence:** Both return `{ block: false }`:
- `decide('git reset --soft HEAD~1', {})`
- `decide('git reset --mixed HEAD~3', {})`

Line 7 of source: `/^git\s+reset\s+--hard\b/` — only `--hard` is blocked.

**Fix:** Change line 7 from:

```js
/^git\s+reset\s+--hard\b/,
```

to:

```js
/^git\s+reset\s+--(soft|mixed|hard)\b/,
```

This blocks all three history-moving reset modes while leaving plain unstage invocations (`git reset HEAD <file>`, `git reset <file>`) unblocked. Add tests.

**Dimension:** `git-guard-bypass` — any code change needs a matching test.

---

### 14. `git merge` not blocked — non-fast-forward merge creates a merge commit

**Location:** `hooks/git-guard.mjs:3-10` (BLOCKED array)

**Evidence:** Both return `{ block: false }`:
- `decide('git merge feature-branch', {})`
- `decide('git merge --no-ff feature', {})`

**Fix:** Add to BLOCKED, with exceptions for safe operations:

```js
/^git\s+merge\b(?!\s+(--abort|--squash)\b)/,
```

Add tests.

**Dimension:** `git-guard-bypass` — any code change needs a matching test.

---

### 15. `git tag -f` and `git tag -d` not blocked — force-tag rewrites and deletes tags

**Location:** `hooks/git-guard.mjs:6` (only `branch -f/-D` blocked, not `tag`)

**Evidence:** Both return `{ block: false }`:
- `decide('git tag -f v1.0 HEAD', {})`
- `decide('git tag -d v1.0', {})`

Note: the catch-all `/--force\b/` blocks `--force` (long form) but not `-f` (short form).

**Fix:** Add to BLOCKED:

```js
/^git\s+tag\s+(-f|--force|-d|--delete)\b/,
```

Add tests covering `git tag -f`, `git tag -d`, and `git tag --delete`.

**Dimension:** `git-guard-bypass` — any code change needs a matching test.

---

### 16. `git reflog delete` / `git reflog expire` not blocked — erases reflog history permanently

**Location:** `hooks/git-guard.mjs:3-10` (BLOCKED array)

**Evidence:** Both return `{ block: false }`:
- `decide('git reflog delete HEAD@{0}', {})`
- `decide('git reflog expire --expire=now --all', {})`

**Fix:** Add to BLOCKED:

```js
/^git\s+reflog\s+(delete|expire)\b/,
```

This blocks only the two destructive subcommands while leaving `git reflog show` (read-only) unaffected.

**Dimension:** `git-guard-bypass` — any code change needs a matching test.

---

### 17. `/--force\b/` regex false-positives on read-only git commands (`git fetch --force`, `git log --grep="--force"`)

**Location:** `hooks/git-guard.mjs:9` (`/--force\b/` pattern)

**Evidence:** All three are incorrectly blocked (`block: true`):
- `decide('git fetch --force origin main', {})`
- `decide('git log --grep="--force" --oneline', {})`
- `decide('git log --format=%H --force', {})`

`git fetch --force` only updates remote-tracking refs, not local commit history. `git log` commands are read-only.

**Fix:** In `hooks/git-guard.mjs`, replace line 6 and remove line 9:

```js
// Line 6 — expand branch pattern to catch flag anywhere in command:
/^git\s+branch\b.*(\s-f\b|\s--force\b|\s-D\b)/,

// Add after line 7 (reset --hard):
/^git\s+rebase\b.*--force-rebase\b/,

// Remove line 9 entirely:
// /--force\b/,   <-- delete this line
```

`git push --force` is already caught by `/^git\s+push\b/`. Add a test: `decide('git fetch --force origin').block === false`.

**Dimension:** `git-guard-bypass` — any code change needs a matching test.

---

### 18. Importing `session-start.mjs` without `NODE_TEST_CONTEXT` immediately writes JSON to stdout as a side effect of import

**Location:** `hooks/session-start.mjs:28-35`

**Evidence:** Running `node --input-type=module --eval 'const mod = await import("./hooks/session-start.mjs"); console.error("done");'` without `NODE_TEST_CONTEXT` set writes the full JSON blob to stdout before any caller code runs. The guard at line 28 (`if (!process.env.NODE_TEST_CONTEXT)`) fires at module evaluation time, not invocation time.

**Fix:** Replace the module-level guard block (lines 28-35) with an `import.meta.url` main-module check:

```js
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  const root = process.env.CLAUDE_PLUGIN_ROOT ?? process.cwd();
  const homeRulesPresent = existsSync(join(homedir(), '.claude', 'rules'));
  const context = buildContext({ homeRulesPresent, vendoredRules: readVendoredRules(root) });
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context },
  }));
}
```

This makes the module safely importable with no side effects. `NODE_TEST_CONTEXT` is no longer needed as a workaround.

**Dimension:** `hook-portability`

---

### 19. Importing `git-guard.mjs` outside the test runner registers stdin listeners as a side effect of import

**Location:** `hooks/git-guard.mjs:33-48`

**Evidence:** Importing the module without `NODE_TEST_CONTEXT` set yields +1 data listener and +1 end listener on `process.stdin`. Any caller that imports `git-guard.mjs` to use the exported `decide()` function will have its stdin consumed by the hook's listener as a side effect.

**Fix:** Export a `run()` function and call it only from a main-module guard:

```js
export function run() {
  let buf = '';
  process.stdin.on('data', (d) => (buf += d));
  process.stdin.on('end', () => {
    let cmd = '';
    try { cmd = JSON.parse(buf)?.tool_input?.command ?? ''; } catch {}
    const { block, reason } = decide(cmd);
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: block ? 'deny' : 'allow',
        permissionDecisionReason: block ? reason : 'ok',
      },
    }));
  });
}

const isMain = process.argv[1] &&
  (await import('node:url')).fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) run();
```

**Dimension:** `hook-portability`

---

### 20. `CLAUDE_PLUGIN_ROOT` unset falls back to `process.cwd()`, which reads no rules when invoked from any directory other than the rigor repo root

**Location:** `hooks/session-start.mjs:29`

**Evidence:** Running the hook from `/tmp` without `CLAUDE_PLUGIN_ROOT` set: `root resolved to: C:\Users\hossa\AppData\Local\Temp`, `rules dir exists: false`, vendored rules silently empty. `CLAUDE_PLUGIN_ROOT` is template-expanded into the command string but is NOT set as a process environment variable by Claude Code.

**Fix:** Use `import.meta.url` to compute the canonical root at module load time, with Windows-safe path handling:

```js
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// At module top level:
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Replace line 29 with:
// const root = ROOT;
// Remove the process.env.CLAUDE_PLUGIN_ROOT reference entirely.
```

Note: `new URL('..', import.meta.url).pathname` has a leading-slash bug on Windows — use `fileURLToPath` instead.

**Dimension:** `hook-portability`

---

### 21. Empty or partial `~/.claude/rules` directory still suppresses vendored rules injection

**Location:** `hooks/session-start.mjs:30` — `existsSync` check on directory, not on file contents

**Evidence:** An empty `~/.claude/rules/` directory causes `homeRulesPresent = true`, suppressing all vendored rules. Same outcome for a directory containing only unrelated files.

**Fix:** Replace line 30 in `hooks/session-start.mjs`:

```js
// Before:
const homeRulesPresent = existsSync(join(homedir(), '.claude', 'rules'));

// After:
const rulesDir = join(homedir(), '.claude', 'rules');
const homeRulesPresent = existsSync(rulesDir) &&
  readdirSync(rulesDir).some(f => f.endsWith('.md') && f !== 'PROVENANCE.md');
```

This mirrors the identical filter already used in `readVendoredRules` (line 23), making detection symmetric.

**Dimension:** `hook-portability`

---

### 22. `\b` word-boundary false-positive: hyphenated tokens match when hyphen-extended (`ke-cli-v2` flags as `ke-cli`)

**Location:** `scripts/check-surface-scrub.mjs:10`

**Evidence:**
- `findFingerprints('ke-cli-extra')` => `[ 'ke-cli' ]`
- `findFingerprints('ke-cli-v2')` => `[ 'ke-cli' ]`
- `findFingerprints('ke-workbench-api')` => `[ 'ke-workbench' ]`

Root cause: `/\bke-cli\b/i` fires when `ke-cli` is followed by a hyphen because `-` is `\W`, so `\b` asserts between `i` (`\w`) and `-` (`\W`).

**Fix:** Replace line 10:

```js
if (new RegExp(`(?<![\\w-])${tok}(?![\\w-])`, 'i').test(text)) hits.add(tok);
```

**Dimension:** `surface-scrub-gaps`

---

### 23. `\b` word-boundary false-negative: alphanumeric suffix on hyphenated token escapes detection (`ke-cliv2` not flagged)

**Location:** `scripts/check-surface-scrub.mjs:10`

**Evidence:**
- `findFingerprints('ke-cliv2')` => `[]`
- `findFingerprints('ke-workbench2')` => `[]`

In `ke-cliv2`, after the final `i` the next char is `v` (`\w`), so no `\b` assertion fires.

**Fix:** Same as finding 22 — the negative lookahead/lookbehind fix closes both the false-positive and false-negative simultaneously.

**Dimension:** `surface-scrub-gaps`

---

### 24. CLI scan runs as a side effect when the module is imported outside the `node:test` runner

**Location:** `scripts/check-surface-scrub.mjs:29-38`

**Evidence:** Importing `findFingerprints` without `NODE_TEST_CONTEXT` prints `surface-scrub: clean` to stdout and would call `process.exit(1)` if fingerprints were found in cwd — completely surprising behavior for a library import.

**Fix:** Replace lines 29-38 with a `pathToFileURL`-based main-module check (the proposed `new URL(process.argv[1], 'file:').href` has a Windows bug — use `pathToFileURL(resolve(process.argv[1]))` instead):

```js
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = process.argv[2] ?? process.cwd();
  let bad = false;
  for (const f of mdFiles(root)) {
    const hits = findFingerprints(readFileSync(f, 'utf8'));
    if (hits.length) { bad = true; console.error(`SURFACE-SCRUB FAIL ${f}: ${hits.join(', ')}`); }
  }
  if (bad) { console.error('Fix: replace project fingerprints with domain-neutral examples.'); process.exit(1); }
  console.log('surface-scrub: clean');
}
```

**Dimension:** `surface-scrub-gaps`

---

### 25. Scan coverage excludes `agents/*.md` — a fingerprint planted in an agent file ships ungated

**Location:** `scripts/check-surface-scrub.mjs:15-27` (`mdFiles` generator)

**Evidence:** `agents/skeptic-verifier.md` is never visited by the scanner. The `mdFiles()` generator has only two branches (`skills/` and `commands/`); there is no `agents/` branch.

**Fix:** Add an `agents/` branch to `mdFiles()`:

```js
const agentsDir = join(root, 'agents');
if (existsSync(agentsDir)) {
  for (const f of readdirSync(agentsDir)) if (f.endsWith('.md')) yield join(agentsDir, f);
}
```

**Dimension:** `surface-scrub-gaps`

---

### 26. Denylist contains overly broad generic terms that cause false positives under case-insensitive matching

**Location:** `scripts/check-surface-scrub.mjs:4-5` (DENY array)

**Evidence:** All six trigger detection incorrectly:
- `findFingerprints('genius solution')` => `[ 'GENIUS' ]`
- `findFingerprints('postcard example')` => `[ 'postcard' ]`
- `findFingerprints('temporal coupling')` => `[ 'Temporal' ]`
- `findFingerprints('FCA compliant')` => `[ 'FCA' ]`
- `findFingerprints('RWA token')` => `[ 'RWA' ]`
- `findFingerprints('MiCA compliance')` => `[ 'MiCA' ]`

A skill teaching regulatory or DeFi compliance cannot mention MiCA, FCA, or RWA without triggering a hard fail — yet these are the domain's canonical vocabulary.

**Fix:** Split DENY into two tiers — keep only project-unique tokens in the hard-fail gate:

```js
const DENY = ['ATLAS', 'COMPASS', 'ke-workbench', 'ke-cli', 'regulatory-rule-engine', 'ke-canon'];
```

Remove `MiCA`, `FCA`, `RWA`, `Temporal`, `GENIUS`, `postcard` from the denylist; they represent domain vocabulary, not project fingerprints.

**Dimension:** `surface-scrub-gaps`

---

### 27. Plan doc: `node --test tests/` fails on Node >=20 (two locations in plan body + embedded README draft)

**Location:** `docs/plans/2026-06-25-rigor-plugin-phase1.md`, lines 841 and 891; embedded README draft at line 841

**Evidence:** `node --test tests/` on Node v24.13.0 exits 1 with `Error: Cannot find module '...\tests'`. `node --test` (no argument) exits 0 with 13 pass / 0 fail. `README.md` line 60 already has the corrected form.

**Fix:**
- Line 841: change `node --test tests/` to `node --test`
- Line 891: change `cd ~/dev/rigor && node --test tests/` to `cd ~/dev/rigor && node --test`

Individual-file invocations (e.g. `node --test tests/git-guard.test.mjs`) supply explicit file paths, not a directory, and work correctly — no change needed there.

**Dimension:** `doc-consistency`

---

### 28. Plan Task 5 Step 4 verification command: `HOME=/nonexistent` is a no-op on Windows; `os.homedir()` reads `USERPROFILE`, not `HOME`

**Location:** `docs/plans/2026-06-25-rigor-plugin-phase1.md`, line 564

**Evidence:** Running with only `HOME=/nonexistent` (USERPROFILE still set): `os.homedir()` returns `C:\Users\hossa`. The absent-home injection path never fires, but the command silently exits 0 — a broken test that cannot distinguish a working injection from a silently-skipped one. With both `HOME=/nonexistent USERPROFILE=/nonexistent`, the vendored rules ARE injected correctly.

**Fix:** Replace line 564 with:

```
cd ~/dev/rigor && HOME=/nonexistent USERPROFILE=/nonexistent CLAUDE_PLUGIN_ROOT=$(pwd) node hooks/session-start.mjs
```

Add a note: "On Windows, `os.homedir()` reads `USERPROFILE` (not `HOME`); both must be overridden to simulate an absent `~/.claude/rules` directory and trigger the vendored-rules injection path."

**Dimension:** `doc-consistency`

---

## Minor

### 29. `git fetch --force` also covered under finding 17 (false-positive) — see finding 17

*(No separate entry needed; fully addressed by the fix in finding 17.)*

---

### 30. `git revert` test suite gap — see finding 10

*(Covered by the test requirement in finding 10.)*

---

### 31. `git fast-import` test suite gap — see finding 11

*(Covered by the test requirement in finding 11.)*

---

### 32. Test suite has no coverage for `\b` false-positive (hyphenated extension) or false-negative (alphanumeric suffix) cases

**Location:** `tests/surface-scrub.test.mjs:1-14`

**Evidence:** The three existing tests only exercise `ATLAS`, `COMPASS`, and `ke-cli` (exact match). None test hyphen-extended variants, alphanumeric-suffixed variants, or generic-word false positives. All known broken behaviors are undetected by CI.

**Fix:** Add to `tests/surface-scrub.test.mjs`:

```js
test('does not false-positive on hyphenated extension of token', () => {
  assert.deepEqual(findFingerprints('ke-cli-extra'), []);
});
test('does not miss alphanumeric-suffixed token', () => {
  assert.ok(findFingerprints('ke-cliv2').includes('ke-cli'));
});
test('does not false-positive on generic word temporal', () => {
  assert.deepEqual(findFingerprints('temporal coupling'), []);
});
test('does not false-positive on generic word genius', () => {
  assert.deepEqual(findFingerprints('genius idea'), []);
});
test('does not false-positive on generic word postcard', () => {
  assert.deepEqual(findFingerprints('postcard design'), []);
});
```

**Dimension:** `surface-scrub-gaps`

---

### 33. PreToolUse allow path emits redundant `permissionDecisionReason: "ok"`

**Location:** `hooks/git-guard.mjs` (line 44)

**Evidence:** `echo '{"tool_name":"Bash","tool_input":{"command":"ls -la"}}' | node hooks/git-guard.mjs` produces `"permissionDecisionReason":"ok"` on an allow decision. Official docs only show this field in deny examples.

**Fix:** In `hooks/git-guard.mjs`, change line 44 from:

```js
permissionDecision: block ? 'deny' : 'allow',
permissionDecisionReason: block ? reason : 'ok',
```

to:

```js
permissionDecision: block ? 'deny' : 'allow',
...(block && { permissionDecisionReason: reason }),
```

**Dimension:** `hook-schema-web`

---

### 34. Spec Open Questions: hook implementation language still listed as open although Phase 1 committed to Node `.mjs`

**Location:** `docs/specs/2026-06-25-rigor-plugin-design.md`, lines 207-213

**Evidence:** The spec still lists "Hook implementation language (shell vs node)" as an open question. The plan (line 18) resolved it: "Node ESM: all scripts are .mjs". Both hooks are confirmed `.mjs` files wired via `node` in `hooks.json`.

**Fix:** In the spec, replace the open bullet at lines 211-212 with a struck-through resolved note:

> ~~Hook implementation language (shell vs node)~~ — resolved: Node `.mjs` (ESM, `node:test`, `node:fs`, `node:os`), targeting Node >=18. Chosen for win32/Linux portability without Git-Bash dependency.

**Dimension:** `doc-consistency`

---

### 35. Spec architecture tree presents Phase 2 (unbuilt) files with no visual distinction from Phase 1 (built) files

**Location:** `docs/specs/2026-06-25-rigor-plugin-design.md`, lines 47-70

**Evidence:** The tree lists `fanout-recon-synthesize/SKILL.md`, `gate-discipline/SKILL.md`, `recon.md`, and `handoff.md` alongside built files. None of the four exist on disk. No inline comment marks them as unbuilt.

**Fix:** Annotate the four Phase 2 entries with inline comments:

```
│   ├── fanout-recon-synthesize/SKILL.md  # Phase 2 — not yet built (see BACKLOG.md)
│   ├── gate-discipline/SKILL.md          # Phase 2 — not yet built (see BACKLOG.md)
│   ├── recon.md            # Phase 2 — not yet built (see BACKLOG.md)
│   └── handoff.md          # Phase 2 — not yet built (see BACKLOG.md)
```

**Dimension:** `doc-consistency`

---

### 36. `FEEDBACK.md` is referenced in README, BACKLOG, plan, and spec but does not exist in the repo

**Location:** `README.md:24`; `BACKLOG.md:19`; `docs/plans/2026-06-25-rigor-plugin-phase1.md:825,872`; `docs/specs/2026-06-25-rigor-plugin-design.md:181,192`

**Evidence:** `FEEDBACK.md` does not exist at the repo root (six references across four files point to it by exact backtick-quoted path). No reference annotates it as "to be created on first use."

**Fix:** Create a stub `FEEDBACK.md`:

```markdown
# Feedback / promotion log

_No entries yet. Add one when a component survives an independent context._

| Date | Component | Domain | Outcome (helped / misfired) | Notes |
|------|-----------|--------|-----------------------------|-------|
```

**Dimension:** `doc-consistency`

---

### 37. Plan Task 10 README draft shows different component order than actual `README.md`, and retains the broken `node --test tests/` command

**Location:** `docs/plans/2026-06-25-rigor-plugin-phase1.md`, lines 812-819 and 841

**Evidence:** Plan template orders: refute, implemented-vs-planned, skeptic-verifier, /verify-claim+/honesty-check, git-guard, session-start. Actual `README.md` orders: git-guard, session-start, skeptic-verifier, refute, implemented-vs-planned, /verify-claim+/honesty-check. Plan line 841 still has `node --test tests/`.

**Fix:** Update the plan's embedded README template (lines 800-848) to match the actual `README.md` table order and change `node --test tests/` to `node --test`.

**Dimension:** `doc-consistency`

---

## Recommended Apply Order

Apply code and test fixes before doc fixes. Within each tier, address the broadest bypass surface first.

1. **Fix finding 4** — strip env-prefix tokens (`VAR=val git commit`) in `hooks/git-guard.mjs` before the `startsWith` check. Foundational: all other BLOCKED additions are ineffective while this bypass exists.
2. **Fix finding 3** — strip global-flag tokens (`-C`, `--git-dir`, `--no-pager`) before subcommand matching. Same class of structural bypass.
3. **Fix finding 5** — strip subshell/substitution wrappers (`$(...)`, `(...)`, backticks) from segments.
4. **Fix finding 17** — remove bare `/--force\b/` from BLOCKED; expand `branch` pattern to catch flag anywhere in command. Eliminates false positives before adding more patterns.
5. **Fix finding 1** — add `/^git\s+rebase(?!\s*(--abort|--skip)\b)/` to BLOCKED + tests.
6. **Fix finding 2** — add `/^git\s+cherry-pick(?!\s+--abort\b)/` to BLOCKED + tests.
7. **Fix finding 6** — add `/^git\s+filter-branch\b/` to BLOCKED + tests.
8. **Fix finding 7** — add `/^git\s+am(?!\s+--abort)\b/` to BLOCKED + tests.
9. **Fix finding 11** — add `/^git\s+fast-import\b/` to BLOCKED + tests.
10. **Fix finding 12** — add `/^git\s+update-ref\b/` to BLOCKED + tests.
11. **Fix finding 13** — expand `reset` pattern to `--soft|--mixed|--hard` + tests.
12. **Fix finding 10** — add `/^git\s+revert(?!\s+(--no-commit|-n)\b)/` to BLOCKED + tests.
13. **Fix finding 14** — add `/^git\s+merge\b(?!\s+(--abort|--squash)\b)/` to BLOCKED + tests.
14. **Fix finding 15** — add `/^git\s+tag\s+(-f|--force|-d|--delete)\b/` to BLOCKED + tests.
15. **Fix finding 16** — add `/^git\s+reflog\s+(delete|expire)\b/` to BLOCKED + tests.
16. **Fix finding 33** — omit `permissionDecisionReason` on allow path.
17. **Fix finding 9** — switch vendored-rules injection guard to sentinel-file check.
18. **Fix finding 21** — replace `existsSync` directory check with content-aware check.
19. **Fix finding 20** — replace `CLAUDE_PLUGIN_ROOT` fallback with `fileURLToPath(import.meta.url)`-derived root.
20. **Fix finding 18** — move `session-start.mjs` side-effectful block behind `import.meta.url` main-module check.
21. **Fix finding 19** — move `git-guard.mjs` stdin listener registration into exported `run()` behind main-module guard.
22. **Fix finding 8** — document `SessionStart` plugin hook limitation; add `~/.claude/settings.json` registration instructions to README.
23. **Fix finding 22 + 23** — replace `\b` boundaries with `(?<![\w-])...(?![\w-])` lookaheads in `check-surface-scrub.mjs`.
24. **Fix finding 26** — remove generic-vocabulary tokens (`MiCA`, `FCA`, `RWA`, `Temporal`, `GENIUS`, `postcard`) from DENY.
25. **Fix finding 24** — move CLI side-effect in `check-surface-scrub.mjs` behind `pathToFileURL`-based main-module check.
26. **Fix finding 25** — add `agents/` branch to `mdFiles()` generator.
27. **Fix finding 32** — add boundary edge-case and false-positive tests to `tests/surface-scrub.test.mjs`.
28. **Fix finding 27** — fix `node --test tests/` → `node --test` in plan doc (two locations).
29. **Fix finding 28** — add `USERPROFILE=/nonexistent` to Windows verification command in plan doc.
30. **Fix finding 36** — create stub `FEEDBACK.md`.
31. **Fix finding 34** — strike through resolved open question in spec.
32. **Fix finding 35** — annotate Phase 2 entries in spec architecture tree.
33. **Fix finding 37** — sync plan's embedded README draft table order and test command.
