// Shared shell-command normalizer (ADR-0013 section 4). Used by both
// git-guard.mjs and change-guard.mjs so that wrapper stripping (env, command,
// timeout, nice, nohup, exec, xargs), subshell/backtick unwrapping, absolute
// paths, .exe suffixes, and `sh -c` / `bash -c` / `eval` bodies are matched
// identically by every hook that walks a shell command line. Pure functions
// only: no fs, no child_process, never throws.

// --- tokenizer -------------------------------------------------------------
// A pragmatic shell-like tokenizer: splits on unquoted whitespace, treats a
// single- or double-quoted span as literal content of the current token (no
// further unquoting inside it — single quotes inside double quotes are just
// characters, matching real shell semantics), treats a balanced
// `$( ... )`, `( ... )`, or backtick-delimited span as one token so a whole
// subshell/command-substitution can be recognized and unwrapped later even
// when it contains internal whitespace, and (fix round 5, item 6) drops an
// unquoted backslash before an ordinary character — bash semantics: the
// backslash is consumed and the following character is taken literally
// (`a\pply` -> `apply`), so a backslash can't be used to hide a command
// name from the string checks downstream.
function tokenize(input) {
  const s = String(input);
  const tokens = [];
  const n = s.length;
  let i = 0;

  function readBalancedParen(startDollar) {
    // s[i] === '(' on entry (startDollar tells the caller whether a leading
    // '$' was already appended to the token being built).
    let depth = 0;
    let out = startDollar ? '$(' : '(';
    depth = 1;
    i++; // consume the opening '('
    while (i < n && depth > 0) {
      const c = s[i];
      if (c === '(') depth++;
      else if (c === ')') depth--;
      out += c;
      i++;
    }
    return out;
  }

  while (i < n) {
    while (i < n && /\s/.test(s[i])) i++;
    if (i >= n) break;
    let tok = '';
    while (i < n && !/\s/.test(s[i])) {
      const c = s[i];
      if (c === '"' || c === "'") {
        const q = c;
        i++;
        const start = i;
        while (i < n && s[i] !== q) i++;
        tok += s.slice(start, i);
        if (i < n) i++; // skip closing quote
      } else if (c === '`') {
        const start = i;
        i++;
        while (i < n && s[i] !== '`') i++;
        if (i < n) i++; // include closing backtick
        tok += s.slice(start, i);
      } else if (c === '$' && s[i + 1] === '(') {
        i++; // consume '$'
        tok += readBalancedParen(true);
      } else if (c === '(') {
        tok += readBalancedParen(false);
      } else if (c === '\\') {
        // fix round 5, item 6: unquoted backslash escapes the next char and
        // is itself dropped; if it's the very last character, keep it as-is
        // (nothing to escape).
        if (i + 1 < n) { tok += s[i + 1]; i += 2; }
        else { tok += c; i++; }
      } else {
        tok += c;
        i++;
      }
    }
    tokens.push(tok);
  }
  return tokens;
}

function unwrapBracketToken(tok) {
  if (typeof tok !== 'string') return null;
  if (tok.length >= 4 && tok.startsWith('$(') && tok.endsWith(')')) return tok.slice(2, -1);
  if (tok.length >= 2 && tok.startsWith('(') && tok.endsWith(')')) return tok.slice(1, -1);
  if (tok.length >= 2 && tok.startsWith('`') && tok.endsWith('`')) return tok.slice(1, -1);
  return null;
}

function isVarAssignment(tok) {
  return typeof tok === 'string' && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tok);
}

// finding (b): a token may carry a $( ... ) or `...` command-substitution
// span embedded inside it — as the value of a VAR=$(...) assignment, or
// simply adjacent to other text in a token that survives stripping (e.g.
// the second token of `echo $(cmd)`). Scan the raw token text (independent
// of tokenize()'s own paren-balancing, which only fires when the whole
// segment is a single bracket token) and return every span's inner content
// so callers can surface it as an additional inner command to expand.
function findSubshellSpans(str) {
  if (typeof str !== 'string') return [];
  const spans = [];
  const n = str.length;
  let i = 0;
  while (i < n) {
    if (str[i] === '$' && str[i + 1] === '(') {
      const start = i;
      i += 2;
      let depth = 1;
      while (i < n && depth > 0) {
        if (str[i] === '(') depth++;
        else if (str[i] === ')') depth--;
        i++;
      }
      if (depth === 0) spans.push(str.slice(start + 2, i - 1));
      continue;
    }
    if (str[i] === '`') {
      const start = i + 1;
      let j = start;
      while (j < n && str[j] !== '`') j++;
      if (j < n) spans.push(str.slice(start, j));
      i = j + 1;
      continue;
    }
    i++;
  }
  return spans;
}

// fix round 5, item 2: a leading redirection token — either self-contained
// (an attached target, e.g. `2>/dev/null`, `>out.txt`) or the bare operator
// with the target as the following token (e.g. `> out.txt`). Matches an
// optional leading fd digit-string then one of the redirection operators.
const LEADING_REDIR_RE = /^[0-9]*(>>|<<|>&|&>|>|<)/;

// --- wrapper-prefix stripping (token-array level) --------------------------
function stripPrefixTokens(tokensIn) {
  let t = tokensIn.slice();
  let changed = true;
  while (changed) {
    changed = false;
    if (!t.length) break;
    if (isVarAssignment(t[0])) { t = t.slice(1); changed = true; continue; }
    // fix round 5, item 2: a leading redirection aimed at the segment as a
    // whole (`2>/dev/null git commit -m x`) doesn't change what command
    // runs; strip it (and its target, when the target is a separate token)
    // before looking at the head keyword.
    {
      const m = LEADING_REDIR_RE.exec(t[0] || '');
      if (m) {
        const rest = t[0].slice(m[0].length);
        if (rest.length) t = t.slice(1); // attached target: whole token consumed
        else t = t.slice(t.length > 1 ? 2 : 1); // bare operator: consume its target token too
        changed = true; continue;
      }
    }
    const head = t[0];
    if (head === 'env') {
      t = t.slice(1);
      let envChanged = true;
      while (envChanged) {
        envChanged = false;
        // a bare '--' ends env's own option parsing; whatever follows is
        // the command to run (fix round 3, finding c).
        if (t[0] === '--') { t = t.slice(1); break; }
        if (t[0] === '-i' || t[0] === '--ignore-environment') { t = t.slice(1); envChanged = true; continue; }
        if ((t[0] === '-u' || t[0] === '--unset') && t.length > 1) { t = t.slice(2); envChanged = true; continue; }
        if (/^--unset=/.test(t[0] || '')) { t = t.slice(1); envChanged = true; continue; }
        if (/^-u.+/.test(t[0] || '')) { t = t.slice(1); envChanged = true; continue; }
        if ((t[0] === '-C' || t[0] === '--chdir') && t.length > 1) { t = t.slice(2); envChanged = true; continue; }
        if (/^--chdir=/.test(t[0] || '')) { t = t.slice(1); envChanged = true; continue; }
        if (/^-C.+/.test(t[0] || '')) { t = t.slice(1); envChanged = true; continue; }
        // fix round 4, finding (a): -S (and --split-string=) takes a
        // shell-like split-string argument; split it into tokens exactly
        // like an `sh -c` body and splice those tokens in ahead of whatever
        // argv followed -S's own argument, so the loop continues over the
        // combined result (expanded body + remaining argv) instead of
        // silently discarding the split-string text.
        if (t[0] === '-S' && t.length > 1) {
          t = tokenize(t[1]).concat(t.slice(2));
          envChanged = true; continue;
        }
        if (/^--split-string=/.test(t[0] || '')) {
          t = tokenize(t[0].slice('--split-string='.length)).concat(t.slice(1));
          envChanged = true; continue;
        }
        // fix round 5, item 5: an attached `-S<body>` (no space, e.g.
        // `-S'git commit -m x'` tokenizes to one token) or a combined short
        // cluster carrying `S` (e.g. `-iS<body>`) also carries a
        // split-string body — whatever follows the last `S` in the token.
        if (/^-[A-Za-z]*S(.+)$/.test(t[0] || '')) {
          const mm = /^-[A-Za-z]*S(.+)$/.exec(t[0]);
          t = tokenize(mm[1]).concat(t.slice(1));
          envChanged = true; continue;
        }
        if (isVarAssignment(t[0])) { t = t.slice(1); envChanged = true; continue; }
        // fix round 4, finding (a): a leading dash-token that matches none of
        // the recognized env options above is, per env's own getopt-style
        // parsing, consumed as an (unrecognized) env option rather than
        // treated as the start of the command — this is what makes an
        // unrecognized flag spliced in from -S's split-string (e.g. the
        // "-x -y" placeholder in the pre-existing -S test below) fall away
        // instead of hiding the real command that follows it.
        if (/^-/.test(t[0] || '')) { t = t.slice(1); envChanged = true; continue; }
      }
      changed = true; continue;
    }
    if (head === 'command') {
      t = t.slice(1);
      if (t[0] === '-p') t = t.slice(1);
      changed = true; continue;
    }
    if (head === 'nohup') {
      t = t.slice(1);
      changed = true; continue;
    }
    if (head === 'exec') {
      // fix round 5, item 2: exec [-a NAME] cmd...
      t = t.slice(1);
      if (t[0] === '-a' && t.length > 1) t = t.slice(2);
      changed = true; continue;
    }
    if (head === 'time') {
      // fix round 5, item 2: time [-p] cmd...
      t = t.slice(1);
      if (t[0] === '-p') t = t.slice(1);
      changed = true; continue;
    }
    // fix round 3, finding (c) + fix round 5, item 2: a leading brace-group
    // opener, and the shell keywords that can prefix a segment once
    // splitSegments() has already cut it apart on ';' or a lone '&' (e.g.
    // "if true; then git commit -m x; fi" yields a "then git commit -m x"
    // segment; "while ! git push; do ..." yields a "while ! git push"
    // segment, itself stripped one keyword at a time down to "git push").
    if (
      head === '{' || head === 'then' || head === 'do' || head === 'else' ||
      head === 'elif' || head === 'if' || head === 'while' || head === 'until' ||
      head === '!'
    ) {
      t = t.slice(1);
      changed = true; continue;
    }
    if (head === 'timeout') {
      t = t.slice(1);
      while (t.length && /^-/.test(t[0])) {
        if (/^(-s|--signal|-k|--kill-after)$/.test(t[0])) t = t.slice(2);
        else t = t.slice(1);
      }
      if (t.length) t = t.slice(1); // the duration token
      changed = true; continue;
    }
    if (head === 'nice') {
      t = t.slice(1);
      if (t[0] === '-n') t = t.slice(2);
      // fix round 5, item 2: attached -nN and --adjustment=N forms.
      else if (/^-n\d+$/.test(t[0] || '')) t = t.slice(1);
      else if (/^--adjustment=/.test(t[0] || '')) t = t.slice(1);
      else if (/^-\d+$/.test(t[0] || '')) t = t.slice(1);
      changed = true; continue;
    }
    if (head === 'xargs') {
      t = t.slice(1);
      let innerChanged = true;
      while (innerChanged) {
        innerChanged = false;
        if (t[0] === '-0') { t = t.slice(1); innerChanged = true; continue; }
        if (t[0] === '-n' && t.length > 1) { t = t.slice(2); innerChanged = true; continue; }
        if (/^-n\d+$/.test(t[0] || '')) { t = t.slice(1); innerChanged = true; continue; }
        if (t[0] === '-I' && t.length > 1) { t = t.slice(2); innerChanged = true; continue; }
        if (/^-I.+$/.test(t[0] || '')) { t = t.slice(1); innerChanged = true; continue; }
        // fix round 3, finding (c): -L N / -LN (max args per command line),
        // -P N / -PN (parallelism), -d <delim>, -a <file>.
        if (t[0] === '-L' && t.length > 1) { t = t.slice(2); innerChanged = true; continue; }
        if (/^-L\d+$/.test(t[0] || '')) { t = t.slice(1); innerChanged = true; continue; }
        if (t[0] === '-P' && t.length > 1) { t = t.slice(2); innerChanged = true; continue; }
        if (/^-P\d+$/.test(t[0] || '')) { t = t.slice(1); innerChanged = true; continue; }
        if (t[0] === '-d' && t.length > 1) { t = t.slice(2); innerChanged = true; continue; }
        // fix round 4, finding (b): attached delimiter form (e.g. -d,).
        if (/^-d.+$/.test(t[0] || '')) { t = t.slice(1); innerChanged = true; continue; }
        if (t[0] === '-a' && t.length > 1) { t = t.slice(2); innerChanged = true; continue; }
        // fix round 5, item 5: --delimiter / --delimiter=<c> and the
        // (per the normalizer contract) boolean -r/-t/-p/-x/-E flags.
        if (t[0] === '--delimiter' && t.length > 1) { t = t.slice(2); innerChanged = true; continue; }
        if (/^--delimiter=/.test(t[0] || '')) { t = t.slice(1); innerChanged = true; continue; }
        if (/^(-r|-t|-p|-x|-E)$/.test(t[0] || '')) { t = t.slice(1); innerChanged = true; continue; }
      }
      changed = true; continue;
    }
    // fix round 5, item 2: sudo|doas [-E] [-n] [-H] [-i] [-s] [-u <user>] [--]
    if (head === 'sudo' || head === 'doas') {
      t = t.slice(1);
      let sChanged = true;
      while (sChanged) {
        sChanged = false;
        if (t[0] === '--') { t = t.slice(1); break; }
        if (/^(-E|-n|-H|-i|-s)$/.test(t[0] || '')) { t = t.slice(1); sChanged = true; continue; }
        if (t[0] === '-u' && t.length > 1) { t = t.slice(2); sChanged = true; continue; }
      }
      changed = true; continue;
    }
    // fix round 5, item 2: setsid — simple wrapper, no options we need to
    // parse for the command line to remain visible.
    if (head === 'setsid') {
      t = t.slice(1);
      changed = true; continue;
    }
    // fix round 5, item 2: unbuffer — simple wrapper (expect's stdbuf-alike).
    if (head === 'unbuffer') {
      t = t.slice(1);
      changed = true; continue;
    }
    // fix round 5, item 2: stdbuf -i/-o/-e <mode> (separate or attached).
    if (head === 'stdbuf') {
      t = t.slice(1);
      let bChanged = true;
      while (bChanged) {
        bChanged = false;
        if (/^-[ioe]$/.test(t[0] || '') && t.length > 1) { t = t.slice(2); bChanged = true; continue; }
        if (/^-[ioe].+/.test(t[0] || '')) { t = t.slice(1); bChanged = true; continue; }
      }
      changed = true; continue;
    }
    // fix round 5, item 2: flock [opts] <file> cmd...
    if (head === 'flock') {
      t = t.slice(1);
      let fChanged = true;
      while (fChanged) {
        fChanged = false;
        if (/^(-s|--shared|-x|--exclusive|-n|--nonblock|-o|--close|-F|--no-fork|-v|--verbose)$/.test(t[0] || '')) {
          t = t.slice(1); fChanged = true; continue;
        }
        if ((t[0] === '-w' || t[0] === '--timeout' || t[0] === '-E') && t.length > 1) { t = t.slice(2); fChanged = true; continue; }
        if (/^--timeout=/.test(t[0] || '')) { t = t.slice(1); fChanged = true; continue; }
      }
      if (t.length) t = t.slice(1); // the lock file/fd positional
      changed = true; continue;
    }
    // fix round 5, item 2: ionice [-c CLASS] [-n LEVEL] [-t] [-p PID] cmd...
    if (head === 'ionice') {
      t = t.slice(1);
      let iChanged = true;
      while (iChanged) {
        iChanged = false;
        if (t[0] === '-t') { t = t.slice(1); iChanged = true; continue; }
        if ((t[0] === '-c' || t[0] === '-n' || t[0] === '-p') && t.length > 1) { t = t.slice(2); iChanged = true; continue; }
        if (/^-[cnp].+/.test(t[0] || '')) { t = t.slice(1); iChanged = true; continue; }
      }
      changed = true; continue;
    }
    // fix round 5, item 2: chrt [opts] <priority> cmd...
    if (head === 'chrt') {
      t = t.slice(1);
      let cChanged = true;
      while (cChanged) {
        cChanged = false;
        if (/^-[abdfiomrv]+$/.test(t[0] || '')) { t = t.slice(1); cChanged = true; continue; }
      }
      if (t.length) t = t.slice(1); // the priority positional
      changed = true; continue;
    }
    // fix round 5, item 2: taskset [opts] <mask> cmd...
    if (head === 'taskset') {
      t = t.slice(1);
      let tsChanged = true;
      while (tsChanged) {
        tsChanged = false;
        if (/^(-a|--all-tasks|-c|--cpu-list)$/.test(t[0] || '')) { t = t.slice(1); tsChanged = true; continue; }
      }
      if (t.length) t = t.slice(1); // the mask positional
      changed = true; continue;
    }
  }
  return t;
}

function stripBinaryToken(tok) {
  if (!tok) return tok;
  const parts = tok.split(/[\\/]/);
  let base = parts[parts.length - 1];
  if (/\.exe$/i.test(base)) base = base.slice(0, -4);
  // fix round 5, item 3: case-fold the resolved binary name so `GIT`,
  // `Git.exe`, etc. all normalize the same as `git`.
  return base.toLowerCase();
}

// fix round 5, item 4: ksh/ash/fish/mksh join the sh -c shell list.
const SHELL_BINARIES = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh', 'ash', 'fish', 'mksh']);
const PWSH_BINARIES = new Set(['pwsh', 'powershell']);

// finds the index of a token that is (for SHELL_BINARIES) a short flag
// cluster carrying `c` (e.g. -c, -lc), starting the scan at `startIdx`.
function findShCFlagIndex(argv, startIdx) {
  for (let i = startIdx; i < argv.length; i++) {
    if (/^-[a-zA-Z]*c[a-zA-Z]*$/.test(argv[i])) return i;
  }
  return -1;
}

export function splitSegments(command) {
  // fix round 5, item 1: also split on a lone '&' (background operator),
  // but never one that is part of '&&', '>&', '&>', or a digit-prefixed
  // '2>&1' fd-duplication form — those are excluded by requiring the '&'
  // not be immediately adjacent (on either side) to another '&' or a '>'.
  return String(command)
    .split(/&&|\|\||;|\||\n|(?<![&>])&(?![&>])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * A redirection is not an argument. Found 2026-09-01 by harvesting a 2026-08-27
 * session: `git symbolic-ref --short HEAD 2>&1` was REFUSED while the bare form was
 * allowed, because `2>&1` survived into argv and counted as the second positional
 * that distinguishes a symbolic-ref write from a read. Any rule that counts
 * positionals had the same hole.
 *
 * Drops a redirection token, plus its target when the operator stands alone
 * (`> file`). Cannot weaken a rule: it removes only tokens the shell would have
 * consumed itself, so a blocked verb stays blocked (`git push 2>&1` is still push).
 */
export function stripRedirections(argv) {
  const OP = /^[0-9]*(>>|>&|&>|>|<)/;
  const OP_ONLY = /^[0-9]*(>>|>&|&>|>|<)$/;
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (!OP.test(t)) { out.push(t); continue; }
    if (OP_ONLY.test(t)) i += 1; // the target is a separate token: `> file`
  }
  return out;
}

export function normalizeSegment(seg) {
  let current = String(seg).trim();
  let argv = [];
  // finding (b): spans collected from raw (pre-strip) tokens at whichever
  // guard iteration finalizes argv — VAR=$(...) tokens get dropped by
  // stripPrefixTokens before argv is set, so span-scanning must run on the
  // token text before stripping, not on the final argv.
  const spanBodies = [];
  for (let guard = 0; guard < 10; guard++) {
    const rawTokens = tokenize(current);
    const stripped = stripPrefixTokens(rawTokens);
    if (stripped.length === 1) {
      const interior = unwrapBracketToken(stripped[0]);
      if (interior !== null) {
        current = interior.trim();
        if (!current) { argv = []; break; }
        // sole full-wrap: the loop recurses into the unwrapped body itself,
        // so don't also span-scan this token (would duplicate the same
        // command once unwrapped-as-argv and once as a spurious inner body).
        continue;
      }
    }
    for (const t of rawTokens) {
      for (const span of findSubshellSpans(t)) {
        if (span.trim()) spanBodies.push(span.trim());
      }
    }
    argv = stripped;
    break;
  }

  argv = stripRedirections(argv);

  if (argv.length) argv[0] = stripBinaryToken(argv[0]);

  let inner = [];
  const bin = argv[0];
  if (bin && SHELL_BINARIES.has(bin)) {
    const idx = findShCFlagIndex(argv, 1);
    if (idx !== -1 && idx + 1 < argv.length) {
      inner = [argv.slice(idx + 1).join(' ')];
    }
  } else if (bin === 'busybox' && argv.length > 1 && SHELL_BINARIES.has(argv[1])) {
    // fix round 5, item 4: busybox <shell> -c "<body>" — the inner shell
    // name occupies argv[1], so the -c/-lc-style flag search starts at 2.
    const idx = findShCFlagIndex(argv, 2);
    if (idx !== -1 && idx + 1 < argv.length) {
      inner = [argv.slice(idx + 1).join(' ')];
    }
  } else if (bin && PWSH_BINARIES.has(bin)) {
    // fix round 5, item 4: pwsh|powershell ... -c|-Command <body> — other
    // flags (-NoProfile, -NoLogo, ...) may precede the command flag; scan
    // for it anywhere after argv[0] rather than assuming a fixed position.
    let idx = -1;
    for (let i = 1; i < argv.length; i++) {
      if (/^-c(ommand)?$/i.test(argv[i])) { idx = i; break; }
    }
    if (idx !== -1 && idx + 1 < argv.length) {
      inner = [argv.slice(idx + 1).join(' ')];
    }
  } else if (bin === 'cmd') {
    // fix round 5, item 4: cmd /c|/k <body>.
    let idx = -1;
    for (let i = 1; i < argv.length; i++) {
      if (/^\/[ck]$/i.test(argv[i])) { idx = i; break; }
    }
    if (idx !== -1 && idx + 1 < argv.length) {
      inner = [argv.slice(idx + 1).join(' ')];
    }
  } else if (bin === 'eval') {
    inner = [argv.slice(1).join(' ')];
  }

  inner = inner.concat(spanBodies);

  return { argv, inner };
}

// fix round 3: git-guard's gh-api argument parser needs the argv ARRAY for
// each normalized command, not a joined-then-re-split string — re-splitting
// on whitespace loses a quoted value's internal spaces (e.g. a `-H "Accept:
// application/vnd.github+json"` header) and shifts every later flag/path
// position. expandArgv is the array-returning primitive; expandCommands is
// defined in terms of it so the two can never drift apart.
export function expandArgv(command) {
  const results = [];
  let segments = [];
  try { segments = splitSegments(command); } catch { return results; }
  for (const seg of segments) {
    try {
      const { argv, inner } = normalizeSegment(seg);
      if (argv.length) results.push(argv);
      for (const body of inner) {
        try { results.push(...expandArgv(body)); } catch {}
      }
    } catch {}
  }
  return results;
}

export function expandCommands(command) {
  return expandArgv(command).map((argv) => argv.join(' '));
}
