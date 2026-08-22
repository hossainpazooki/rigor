import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitSegments, normalizeSegment, expandCommands, expandArgv } from '../hooks/shell-normalize.mjs';

// --- splitSegments ---

test('splitSegments splits on && || ; | and newlines, trimmed, non-empty', () => {
  assert.deepEqual(splitSegments('git add . && git commit -m x'), ['git add .', 'git commit -m x']);
  assert.deepEqual(splitSegments('a; b'), ['a', 'b']);
  assert.deepEqual(splitSegments('a | b'), ['a', 'b']);
  assert.deepEqual(splitSegments('a || b'), ['a', 'b']);
  assert.deepEqual(splitSegments('a\nb'), ['a', 'b']);
  assert.deepEqual(splitSegments('  a  ;;  '), ['a']);
  assert.deepEqual(splitSegments(''), []);
});

// --- normalizeSegment: plain commands ---

test('normalizeSegment leaves a plain command as argv with no inner', () => {
  const { argv, inner } = normalizeSegment('git commit -m x');
  assert.deepEqual(argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(inner, []);
});

test('normalizeSegment keeps a quoted argument as one token, quotes removed', () => {
  const { argv } = normalizeSegment('echo "remember to git commit later"');
  assert.deepEqual(argv, ['echo', 'remember to git commit later']);
});

// --- VAR=val prefixes ---

test('normalizeSegment strips a single leading VAR=val token', () => {
  const { argv } = normalizeSegment('GIT_AUTHOR_NAME=x git commit -m x');
  assert.deepEqual(argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment strips multiple leading VAR=val tokens', () => {
  const { argv } = normalizeSegment('FOO=bar BAZ=qux git commit -m x');
  assert.deepEqual(argv, ['git', 'commit', '-m', 'x']);
});

// --- wrapper prefixes ---

test('normalizeSegment strips env and its VAR=val tokens', () => {
  assert.deepEqual(normalizeSegment('env FOO=bar git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('env FOO=bar BAZ=qux git commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment strips command wrapper', () => {
  assert.deepEqual(normalizeSegment('command git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('command -p git commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment strips timeout with flags and a duration', () => {
  assert.deepEqual(normalizeSegment('timeout 30 git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('timeout 30s git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('timeout -k 5 30 git commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment strips nice with -n N', () => {
  assert.deepEqual(normalizeSegment('nice -n 10 git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('nice git commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment strips nohup and exec', () => {
  assert.deepEqual(normalizeSegment('nohup git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('exec git commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment strips xargs and its flags', () => {
  assert.deepEqual(normalizeSegment('xargs git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('xargs -0 git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('xargs -n 1 git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('xargs -I {} git commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

// --- $( ), ( ), backtick unwrap ---

test('normalizeSegment unwraps $( ... )', () => {
  assert.deepEqual(normalizeSegment('$(git commit -m x)').argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment unwraps ( ... )', () => {
  assert.deepEqual(normalizeSegment('(git commit -m x)').argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment unwraps backticks', () => {
  assert.deepEqual(normalizeSegment('`git commit -m x`').argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment unwraps a subshell that itself carries a VAR=val prefix', () => {
  assert.deepEqual(normalizeSegment('$(FOO=bar git commit -m x)').argv, ['git', 'commit', '-m', 'x']);
});

// --- absolute paths and .exe suffixes ---

test('normalizeSegment strips a directory prefix from argv[0]', () => {
  assert.deepEqual(normalizeSegment('/usr/bin/git commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment strips a .exe suffix from argv[0]', () => {
  assert.deepEqual(normalizeSegment('kubectl.exe apply -f x.yaml').argv, ['kubectl', 'apply', '-f', 'x.yaml']);
});

test('normalizeSegment strips both a Windows directory prefix and .exe suffix', () => {
  const { argv } = normalizeSegment('"C:/Program Files/Git/bin/git.exe" commit -m x');
  assert.deepEqual(argv, ['git', 'commit', '-m', 'x']);
});

// --- sh -c / bash -lc / eval bodies ---

test('normalizeSegment extracts the sh -c body as inner', () => {
  const { argv, inner } = normalizeSegment('sh -c "git commit -m x"');
  assert.deepEqual(argv, ['sh', '-c', 'git commit -m x']);
  assert.deepEqual(inner, ['git commit -m x']);
});

test('normalizeSegment extracts the bash -lc body as inner', () => {
  const { inner } = normalizeSegment('bash -lc "git commit -m x"');
  assert.deepEqual(inner, ['git commit -m x']);
});

test('normalizeSegment extracts the zsh -c and dash -c body as inner', () => {
  assert.deepEqual(normalizeSegment('zsh -c "git push origin main"').inner, ['git push origin main']);
  assert.deepEqual(normalizeSegment('dash -c "git push"').inner, ['git push']);
});

test('normalizeSegment extracts an eval body as inner', () => {
  const { argv, inner } = normalizeSegment('eval git commit -m x');
  assert.deepEqual(argv, ['eval', 'git', 'commit', '-m', 'x']);
  assert.deepEqual(inner, ['git commit -m x']);
});

// --- expandCommands ---

test('expandCommands returns one normalized string per segment', () => {
  assert.deepEqual(
    expandCommands('git add . && git commit -m x'),
    ['git add .', 'git commit -m x'],
  );
});

test('expandCommands recursively expands sh -c inner bodies', () => {
  assert.deepEqual(
    expandCommands('sh -c "git commit -m x"'),
    ['sh -c git commit -m x', 'git commit -m x'],
  );
});

test('expandCommands recursively expands nested wrappers and subshells', () => {
  const out = expandCommands('timeout 30 bash -c "$(echo git) commit -m x"');
  // the outer wrapper collapses to the bash -c form, and the inner body
  // itself expands (its own $() subshell unwraps down to the echo command).
  assert.ok(out.includes('bash -c git commit -m x') || out.some((s) => s.includes('commit -m x')));
});

test('expandCommands never throws on garbage input', () => {
  assert.doesNotThrow(() => expandCommands('$(('));
  assert.doesNotThrow(() => expandCommands(''));
  assert.doesNotThrow(() => expandCommands(null));
  assert.doesNotThrow(() => expandCommands(undefined));
  assert.doesNotThrow(() => expandCommands('"unterminated'));
});

test('expandCommands hides nothing: a git-guard-relevant command survives every wrapper combination', () => {
  const cases = [
    'GIT_AUTHOR_NAME=x env FOO=bar timeout 30 nice -n 5 nohup exec /usr/bin/git.exe commit -m x',
    'xargs -0 sh -c "git commit -m x"',
  ];
  for (const c of cases) {
    const out = expandCommands(c);
    assert.ok(out.some((s) => s === 'git commit -m x'), `expected "git commit -m x" in ${JSON.stringify(out)}`);
  }
});

// ===========================================================================
// ADR-0013 section 7 (skeptic findings), fix round 2, finding (b).
// ===========================================================================

test('expandCommands recurses into a VAR=$(...) assignment value (ADR-0013 fix round 2)', () => {
  const out = expandCommands('OUT=$(kubectl apply -k kube/overlays/prod)');
  assert.ok(out.includes('kubectl apply -k kube/overlays/prod'), `expected inner command in ${JSON.stringify(out)}`);
});

test('expandCommands expands an embedded $(...) that is not the sole token (ADR-0013 fix round 2)', () => {
  const out = expandCommands('echo $(kubectl apply -k x)');
  assert.ok(out.includes('kubectl apply -k x'), `expected inner command in ${JSON.stringify(out)}`);
});

test('expandCommands expands an embedded backtick subshell that is not the sole token (ADR-0013 fix round 2)', () => {
  const out = expandCommands('echo `kubectl apply -k x`');
  assert.ok(out.includes('kubectl apply -k x'), `expected inner command in ${JSON.stringify(out)}`);
});

test('normalizeSegment strips env -i / -u / -C options (ADR-0013 fix round 2)', () => {
  assert.deepEqual(normalizeSegment('env -i kubectl apply -k x').argv, ['kubectl', 'apply', '-k', 'x']);
  assert.deepEqual(normalizeSegment('env -u FOO kubectl apply -k x').argv, ['kubectl', 'apply', '-k', 'x']);
  assert.deepEqual(normalizeSegment('env -C /dir kubectl apply -k x').argv, ['kubectl', 'apply', '-k', 'x']);
});

test('normalizeSegment strips the attached xargs -I{} form (ADR-0013 fix round 2)', () => {
  assert.deepEqual(normalizeSegment('xargs -I{} kubectl apply -f {}').argv, ['kubectl', 'apply', '-f', '{}']);
});

// ===========================================================================
// ADR-0013 section 7 (skeptic findings), fix round 3.
// ===========================================================================

// --- expandArgv: same expansion as expandCommands, as argv arrays with
// quoted values kept intact as single tokens. ---

test('expandArgv keeps a quoted value with embedded whitespace as one array element (fix round 3)', () => {
  const argv = expandArgv('gh api -H "Accept: application/vnd.github+json" repos/o/r/pulls/1/merge');
  assert.equal(argv.length, 1);
  assert.deepEqual(argv[0], ['gh', 'api', '-H', 'Accept: application/vnd.github+json', 'repos/o/r/pulls/1/merge']);
});

test('expandCommands(cmd) equals expandArgv(cmd).map(a => a.join(\' \')) (fix round 3)', () => {
  const cases = [
    'git add . && git commit -m x',
    'gh api -H "Accept: application/vnd.github+json" -X PUT repos/o/r/pulls/1/merge',
    'timeout 30 bash -c "$(echo git) commit -m x"',
    'env -i -- git commit -m x',
    'xargs -L1 git commit -m x',
    'time git commit -m x',
    '{ git commit -m x; }',
    'if true; then git commit -m x; fi',
  ];
  for (const c of cases) {
    assert.deepEqual(expandCommands(c), expandArgv(c).map((a) => a.join(' ')), `mismatch for ${JSON.stringify(c)}`);
  }
});

test('expandArgv never throws on garbage input (fix round 3)', () => {
  assert.doesNotThrow(() => expandArgv('$(('));
  assert.doesNotThrow(() => expandArgv(''));
  assert.doesNotThrow(() => expandArgv(null));
  assert.doesNotThrow(() => expandArgv(undefined));
});

// --- finding (c): additional prefix/wrapper stripping ---

test('normalizeSegment strips a leading "time" token (fix round 3, finding c)', () => {
  assert.deepEqual(normalizeSegment('time git commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment strips a leading "{" brace-group token (fix round 3, finding c)', () => {
  assert.deepEqual(normalizeSegment('{ git commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment strips leading then/do/else/elif shell keywords (fix round 3, finding c)', () => {
  assert.deepEqual(normalizeSegment('then git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('do git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('else git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('elif git commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment strips env long/attached option forms and a terminating -- (fix round 3, finding c)', () => {
  assert.deepEqual(normalizeSegment('env --unset=FOO git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('env -uFOO git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('env -C/tmp git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('env --chdir=/tmp git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('env -S "-x -y" git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('env -i -- git commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment strips xargs -L N / -LN / -P N / -PN / -d <delim> / -a <file> (fix round 3, finding c)', () => {
  assert.deepEqual(normalizeSegment('xargs -L 1 git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('xargs -L1 git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('xargs -P 4 git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('xargs -P4 git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('xargs -d , git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('xargs -a list.txt git commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

// ===========================================================================
// ADR-0013 section 7 (skeptic findings), fix round 4.
// ===========================================================================

// --- finding (a): env -S / --split-string=... splits its argument like an
// sh -c body and continues the remaining argv as well. ---
test('normalizeSegment expands env -S with a quoted split-string body (fix round 4, finding a)', () => {
  assert.deepEqual(normalizeSegment("env -S 'git commit -m x'").argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment expands env -S with an unquoted split-string arg, continuing the remaining argv (fix round 4, finding a)', () => {
  assert.deepEqual(normalizeSegment('env -S git commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment expands env --split-string= attached form (fix round 4, finding a)', () => {
  assert.deepEqual(normalizeSegment("env --split-string='git commit -m x'").argv, ['git', 'commit', '-m', 'x']);
});

test('expandCommands includes the split body for env -S on a non-git command (fix round 4, finding a)', () => {
  const out = expandCommands("env -S 'kubectl apply -k x'");
  assert.ok(out.includes('kubectl apply -k x'), `expected inner command in ${JSON.stringify(out)}`);
});

// --- finding (b): xargs attached delimiter form -d<char> (e.g. -d,). ---
test('normalizeSegment strips the attached xargs -d<delim> form (fix round 4, finding b)', () => {
  assert.deepEqual(normalizeSegment('xargs -d, git commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

// ===========================================================================
// ADR-0013 section 7, FIX ROUND 5 (bounded, final): normalizer contract
// additions (1)-(6).
// ===========================================================================

// --- (1): splitSegments splits on a lone '&' background operator, but not
// on '&&', '>&', '&>', or a digit-prefixed '2>&1' form. ---

test('splitSegments splits on a lone "&" background operator (fix round 5, item 1)', () => {
  assert.deepEqual(splitSegments('true & git push origin main'), ['true', 'git push origin main']);
  assert.deepEqual(splitSegments('a & b & c'), ['a', 'b', 'c']);
});

test('splitSegments does not split "&&", ">&", "&>", or "2>&1" as a lone "&" (fix round 5, item 1)', () => {
  assert.deepEqual(splitSegments('a && b'), ['a', 'b']); // still splits, but as && not lone &
  assert.deepEqual(splitSegments('echo hi >& log.txt'), ['echo hi >& log.txt']);
  assert.deepEqual(splitSegments('echo hi &> log.txt'), ['echo hi &> log.txt']);
  assert.deepEqual(splitSegments('echo hi 2>&1'), ['echo hi 2>&1']);
});

// --- (2): normalizeSegment strips leading if/while/until/"!" keywords (in
// addition to the already-covered elif/then/do/else/'{'), leading
// redirection tokens, and the new wrapper prefixes. ---

test('normalizeSegment strips leading if/while/until/"!" keywords (fix round 5, item 2)', () => {
  assert.deepEqual(normalizeSegment('if git push origin main').argv, ['git', 'push', 'origin', 'main']);
  assert.deepEqual(normalizeSegment('while git push').argv, ['git', 'push']);
  assert.deepEqual(normalizeSegment('until git push').argv, ['git', 'push']);
  assert.deepEqual(normalizeSegment('! git commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment strips a leading redirection token, attached or operator-alone (fix round 5, item 2)', () => {
  assert.deepEqual(normalizeSegment('2>/dev/null git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('>out.txt git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('> out.txt git commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment strips sudo/doas with their common flags (fix round 5, item 2)', () => {
  assert.deepEqual(normalizeSegment('sudo git push origin main').argv, ['git', 'push', 'origin', 'main']);
  assert.deepEqual(normalizeSegment('sudo -E -u root git push').argv, ['git', 'push']);
  assert.deepEqual(normalizeSegment('sudo -n -H -i -s -- git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('doas git commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment strips setsid and unbuffer (fix round 5, item 2)', () => {
  assert.deepEqual(normalizeSegment('setsid git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('unbuffer git commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment strips stdbuf with an attached option (fix round 5, item 2)', () => {
  assert.deepEqual(normalizeSegment('stdbuf -oL git commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment strips flock with a lock-file positional (fix round 5, item 2)', () => {
  assert.deepEqual(normalizeSegment('flock /tmp/lock git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('flock -n /tmp/lock git commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment strips ionice with its options (fix round 5, item 2)', () => {
  assert.deepEqual(normalizeSegment('ionice -c2 -n7 git commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment strips chrt with a priority positional (fix round 5, item 2)', () => {
  assert.deepEqual(normalizeSegment('chrt -f 10 git commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment strips taskset with a mask positional (fix round 5, item 2)', () => {
  assert.deepEqual(normalizeSegment('taskset 0x1 git commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment strips "time -p" (fix round 5, item 2)', () => {
  assert.deepEqual(normalizeSegment('time -p git commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment strips "exec -a NAME" (fix round 5, item 2)', () => {
  assert.deepEqual(normalizeSegment('exec -a myname git commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment strips nice attached -nN and --adjustment=N (fix round 5, item 2)', () => {
  assert.deepEqual(normalizeSegment('nice -n5 git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('nice --adjustment=5 git commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

// --- (3): argv[0] binary name lowercased after directory/.exe stripping. ---

test('normalizeSegment lowercases argv[0] after stripping directory and .exe (fix round 5, item 3)', () => {
  assert.deepEqual(normalizeSegment('GIT push origin main').argv, ['git', 'push', 'origin', 'main']);
  assert.deepEqual(normalizeSegment('Git.exe commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('"C:/Program Files/Git/bin/GIT.EXE" commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

// --- (4): pwsh/powershell -c|-Command, cmd /c|/k, ksh/ash/fish/mksh joining
// the sh -c shell list, and busybox <shell> -c. ---

test('normalizeSegment extracts pwsh/powershell -c|-Command bodies as inner (fix round 5, item 4)', () => {
  assert.deepEqual(normalizeSegment('pwsh -c "git commit -m x"').inner, ['git commit -m x']);
  assert.deepEqual(normalizeSegment('powershell -Command "git push"').inner, ['git push']);
  assert.deepEqual(normalizeSegment('powershell -NoProfile -NoLogo -Command "git push"').inner, ['git push']);
});

test('normalizeSegment extracts "cmd /c" and "cmd /k" bodies as inner (fix round 5, item 4)', () => {
  assert.deepEqual(normalizeSegment('cmd /c git commit -m x').inner, ['git commit -m x']);
  assert.deepEqual(normalizeSegment('cmd /k git commit -m x').inner, ['git commit -m x']);
});

test('normalizeSegment treats ksh/ash/fish/mksh -c like sh -c (fix round 5, item 4)', () => {
  assert.deepEqual(normalizeSegment('ksh -c "git commit"').inner, ['git commit']);
  assert.deepEqual(normalizeSegment('ash -c "git commit"').inner, ['git commit']);
  assert.deepEqual(normalizeSegment('fish -c "git commit"').inner, ['git commit']);
  assert.deepEqual(normalizeSegment('mksh -c "git commit"').inner, ['git commit']);
});

test('normalizeSegment extracts "busybox <shell> -c" bodies as inner (fix round 5, item 4)', () => {
  assert.deepEqual(normalizeSegment('busybox sh -c "git commit -m x"').inner, ['git commit -m x']);
});

// --- (5): env -S combined-cluster forms, and xargs --delimiter[=] plus the
// -r/-t/-p/-x/-E booleans. ---

test('normalizeSegment splits env -S in an attached/combined-cluster form (fix round 5, item 5)', () => {
  assert.deepEqual(normalizeSegment("env -S'git commit -m x'").argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment("env -iS'git commit -m x'").argv, ['git', 'commit', '-m', 'x']);
});

test('normalizeSegment strips xargs --delimiter[=] and the -r/-t/-p/-x/-E booleans (fix round 5, item 5)', () => {
  assert.deepEqual(normalizeSegment('xargs --delimiter=, git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('xargs --delimiter , git commit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('xargs -r -t -p -x -E git commit -m x').argv, ['git', 'commit', '-m', 'x']);
});

// --- (6): an unquoted backslash before an ordinary character is dropped by
// the tokenizer (bash semantics). ---

test('tokenizer drops an unquoted backslash before an ordinary character (fix round 5, item 6)', () => {
  assert.deepEqual(normalizeSegment('git co\\mmit -m x').argv, ['git', 'commit', '-m', 'x']);
  assert.deepEqual(normalizeSegment('a\\pply file').argv, ['apply', 'file']);
});
