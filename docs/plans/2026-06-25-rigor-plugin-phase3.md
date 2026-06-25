# rigor Phase 3 — Orchestration Discipline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package the discipline that makes a multi-agent **build** trustworthy — one shared contract, disjoint-file ownership, scaffold-first, an integration gate, and a skeptic pass that refutes the *claim* (not just the gate) — as a `fanout-build` skill, a `/fanout` command, and an executable `check-fanout` structural gate.

**Architecture:** A new on-demand skill (`fanout-build`) carrying the build-shaped sibling of `fanout-recon-synthesize`, with a runnable domain-neutral `example.mjs` of the proven pipeline; a thin `/fanout` command entry point; and a heuristic `check-fanout.mjs` gate (rigor's executable-discipline pattern, alongside `git-guard`/`surface-scrub`) that flags a fan-out workflow script missing its trustworthiness scaffolding. No new agent — `fanout-build` dispatches the already-vendored `integration-runner` and `skeptic-verifier`.

**Tech Stack:** Markdown (skill/command), Node.js ≥18 ESM `.mjs` (the check + the example), `node:test` + `node:assert`, the existing surface-scrub + frontmatter conventions.

## Design grounding (why these components)

This phase is **not** invented — every component is justified by two independent real multi-agent builds in the author's history (a systems-language migration and a web-frontend migration), mined from their session transcripts. Both, independently, converged on the same pipeline and hit the same failure modes.

**The convergent pipeline** (run in order; only Build and Verify fan out):
`Spike(+halt) → Contract(schema'd) → Scaffold(owns shared files, must compile) → Build(parallel, one file per agent, against the contract) → Integrate(integration-runner runs the real named gate) → Verify(skeptics refute the load-bearing claim)`.

**The anti-drift mechanism (both builds):** a shared **CONTRACT constant prepended verbatim to every build agent** — exact types/signatures, a file→owner map, and "code against THIS, not each other's files; you own ONLY <files>" — plus structured output schemas on every agent. Disjointness was enforced by prompt instruction alone (neither build used filesystem isolation); both flagged this as the residual hazard.

**The load-bearing failure mode — gate-green ≠ claim-true.** In both builds the integration step *truthfully* reported the test gate green, yet the higher-level claim was false: a build agent's prose was literally wrong; a "rewired" frontend had only 1 of 9 pages actually wired and components "built but UNMOUNTED"; a criterion marked green was behind an off flag and **panicked on first real run**; a determinism gate was green on one OS and **RED on another** (line-ending round-trip). Only an adversarial skeptic pass — refuting the *claim*, recomputing from raw output, probing execution / environment / non-vacuousness — separated gate-green from claim-true.

**Survival failure modes (both builds):** a long monolithic pipeline that died mid-stage and stranded a half-mutated tree (needed a purpose-built resume run guarded against "smuggling future-stage code"); null/partial agent results crashing aggregation; stalls and session limits mid-fan-out; one risky stage per run with the human committing between runs.

**Git discipline at scale (both builds):** agents never write git — the orchestrator emits commit commands for the human; stages close via a real merge, not a local pointer.

These map 1:1 onto the components below. Out-of-scope here (recorded, not built): upgrading the Phase 2 `/handoff` template and `gate-discipline` skill with the richer governance structures the same mining surfaced (cold-start seed, reuse map, "don't re-litigate" locked decisions, stale-brief tombstones), and the **Phase 4 learning loop** — both noted in *Future work*.

## Global Constraints

- **Plugin:** `rigor` at `~/dev/rigor`. Every new skill/command carries `status: provisional` frontmatter.
- **Domain-neutral, always.** No project names or domain terms in any shipped file (skills/commands/agents/scripts/example). The denylist is the gitignored local `surface-scrub.denylist`; the gate scans `skills/`, `commands/`, `agents/`. Run `node scripts/check-surface-scrub.mjs` before committing any skill/command task.
- **Git is commands-for-Hossain.** The executing agent NEVER runs `git init/add/commit/push`. Every "Commit" step prints the exact command for Hossain to run and continues.
- **Node ESM:** all scripts `.mjs`, run as `node <path>`, Node ≥18, `node:test`. Each `.mjs` must be safely importable with **no side effects** (gate the CLI block behind an `import.meta.url` main-module check, Windows-safe via `pathToFileURL(resolve(argv[1]))`).
- **check-fanout is heuristic.** It checks *structure*, not *semantics* — it cannot prove file-disjointness, that the contract is correct, or that the claim is true. Its output and docs must say so (the surface-scrub honesty-caveat pattern).
- **example.mjs is a workflow-runtime script**, not a standalone module: it uses top-level `await`/`return` and the injected `agent()`/`parallel()`/`phase()`/`log()` globals, so it intentionally fails `node --check`. It is validated by `check-fanout` + surface-scrub, not by the test runner.

---

## File Structure

```
~/dev/rigor/
├── scripts/
│   └── check-fanout.mjs              # NEW: heuristic structural gate over a fan-out workflow script
├── skills/
│   └── fanout-build/
│       ├── SKILL.md                  # NEW: the trustworthy multi-agent build pipeline
│       └── example.mjs               # NEW: runnable, domain-neutral pipeline skeleton
├── commands/
│   └── fanout.md                     # NEW: /fanout → fanout-build
├── tests/
│   └── fanout-check.test.mjs         # NEW: tests for analyzeFanout()
├── README.md                         # MODIFY: add Phase 3 row + diagram node
└── FEEDBACK.md                       # MODIFY: add fanout-build to the ledger
```

---

### Task 1: `check-fanout` structural gate

**Files:**
- Create: `~/dev/rigor/scripts/check-fanout.mjs`
- Create: `~/dev/rigor/tests/fanout-check.test.mjs`

**Interfaces:**
- Produces: `analyzeFanout(src: string) -> string[]` (pure, exported — returns structural warnings for a fan-out workflow script; `[]` for a clean fan-out or a non-fan-out script). CLI wrapper reads a script file path, prints warnings, exits 1 if any.

- [ ] **Step 1: Write the failing test**

`~/dev/rigor/tests/fanout-check.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeFanout } from '../scripts/check-fanout.mjs';

const GOOD = `
const CONTRACT = 'exact types + file->owner map';
phase('Build');
await parallel([() => agent(CONTRACT + ' task', { schema: S, label: 'build:a' })]);
phase('Integrate');
await agent('run the gate', { agentType: 'integration-runner', schema: S });
phase('Verify');
await parallel([() => agent('refute the claim', { agentType: 'skeptic-verifier', schema: V })]);
`;

test('a complete fan-out script yields no warnings', () => {
  assert.deepEqual(analyzeFanout(GOOD), []);
});
test('a non-fan-out script is ignored (no parallel/pipeline)', () => {
  assert.deepEqual(analyzeFanout('const x = 1; await agent("hi", { schema: S });'), []);
});
test('flags a fan-out with no adversarial verify phase', () => {
  const src = `const CONTRACT='c'; phase('Build'); await parallel([()=>agent(CONTRACT,{schema:S})]); await agent('gate',{agentType:'integration-runner',schema:S});`;
  assert.ok(analyzeFanout(src).some((w) => /adversarial verify/.test(w)));
});
test('flags a fan-out with no integration step', () => {
  const src = `const CONTRACT='c'; phase('Build'); await parallel([()=>agent(CONTRACT,{schema:S,agentType:'skeptic-verifier'})]);`;
  assert.ok(analyzeFanout(src).some((w) => /integration/.test(w)));
});
test('flags agents without output schemas', () => {
  const src = `const CONTRACT='c'; await parallel([()=>agent('t')]); agent('g',{agentType:'integration-runner'}); agent('r',{agentType:'skeptic-verifier'});`;
  assert.ok(analyzeFanout(src).some((w) => /without schemas/.test(w)));
});
test('flags a fan-out with no shared contract constant', () => {
  const src = `phase('Build'); await parallel([()=>agent('t',{schema:S})]); agent('g',{agentType:'integration-runner',schema:S}); agent('r',{agentType:'skeptic-verifier',schema:V});`;
  assert.ok(analyzeFanout(src).some((w) => /shared contract/.test(w)));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd ~/dev/rigor && node --test tests/fanout-check.test.mjs`
Expected: FAIL — `Cannot find module '../scripts/check-fanout.mjs'`.

- [ ] **Step 3: Implement the gate**

`~/dev/rigor/scripts/check-fanout.mjs`:
```js
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Heuristic structural linter for a multi-agent fan-out workflow SCRIPT.
// HONESTY CAVEAT: checks STRUCTURE (is there a verify phase, an integration step,
// output schemas, a shared contract constant), NOT SEMANTICS. It cannot prove file
// ownership is disjoint, that the contract is correct, or that the claim is true.
// A clean result means "the trustworthy-build scaffolding is present," nothing more.
export function analyzeFanout(src) {
  const warnings = [];
  const fansOut = /\b(parallel|pipeline)\s*\(/.test(src);
  if (!fansOut) return warnings; // not a fan-out script — nothing to check

  if (!/skeptic-verifier/.test(src) && !/\bphase\(\s*['"`]?verify/i.test(src) && !/\brefute/i.test(src)) {
    warnings.push(
      'no adversarial verify: a fan-out with no skeptic/refute phase trusts a green ' +
      'gate as a true claim (gate-green is not claim-true)'
    );
  }
  if (!/integration-runner/.test(src) && !/\bphase\(\s*['"`]?integrat/i.test(src)) {
    warnings.push('no integration step: nothing runs the real, named gate to green before verification');
  }
  if (/\bagent\s*\(/.test(src) && !/\bschema\s*:/.test(src)) {
    warnings.push('agents without schemas: results are unstructured prose, not mechanically mergeable');
  }
  if (!/\b(CONTRACT|SHARED|CONTRACT_SCHEMA)\b/.test(src)) {
    warnings.push(
      'no shared contract constant: parallel agents have no single source of truth and ' +
      'may drift — declare one and prepend it verbatim to every build prompt'
    );
  }
  return warnings;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const file = process.argv[2];
  if (!file) { console.error('usage: node scripts/check-fanout.mjs <workflow-script.(js|mjs)>'); process.exit(2); }
  const warnings = analyzeFanout(readFileSync(file, 'utf8'));
  if (warnings.length) {
    console.error(`check-fanout: ${warnings.length} structural warning(s) for ${file}:`);
    for (const w of warnings) console.error('  - ' + w);
    console.error('(Heuristic: structure only. It cannot prove file-disjointness or that the claim is true.)');
    process.exit(1);
  }
  console.log('check-fanout: trustworthy-build scaffolding present (structure only).');
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd ~/dev/rigor && node --test tests/fanout-check.test.mjs`
Expected: PASS — all 6 assertions green.

- [ ] **Step 5: Verify no import side-effect**

Run: `cd ~/dev/rigor && node --input-type=module -e "await import('./scripts/check-fanout.mjs'); process.stdout.write('IMPORT_OK')"`
Expected: prints only `IMPORT_OK` (the CLI block is behind the main-module guard).

- [ ] **Step 6: Commit (command for Hossain)**

```bash
cd ~/dev/rigor
git add scripts/check-fanout.mjs tests/fanout-check.test.mjs
git commit -m "feat(scripts): check-fanout structural gate for multi-agent fan-out scripts"
```

---

### Task 2: `fanout-build` skill

**Files:**
- Create: `~/dev/rigor/skills/fanout-build/SKILL.md`

**Interfaces:**
- Produces: the `fanout-build` skill, invoked by `/fanout` (Task 4) and referencing the already-vendored `integration-runner` and `skeptic-verifier` agents and the `refute` skill.

- [ ] **Step 1: Write the skill (domain-neutral throughout)**

`~/dev/rigor/skills/fanout-build/SKILL.md`:
```markdown
---
name: fanout-build
description: Use when a build is too big for one pass and you'll split it across parallel agents — the discipline that makes a multi-agent build trustworthy: one shared contract, disjoint-file ownership, scaffold-first, an integration gate, and a skeptic pass that refutes the CLAIM, not just the gate.
status: provisional
---

# Fan-out build

Splitting a build across parallel agents is fast and dangerous: each agent can
pass its own tests while the assembled tree is broken, and a green gate can hide a
false claim. This is the pipeline that makes a multi-agent build trustworthy — the
build-shaped sibling of `fanout-recon-synthesize`.

## The pipeline

Run in order; only **Build** and **Verify** fan out.

1. **Spike (+ halt gate).** Prove the riskiest unknown first — does the toolchain
   build, does the dependency resolve, is the assumed approach viable. If the spike
   fails, **halt**; do not let build agents diverge on an unbuildable base.
2. **Contract.** One read-only agent produces the **single source of truth**: the
   exact types, signatures, file→owner map, and reuse points every build agent
   codes against. Emit it as a structured schema.
3. **Scaffold.** One agent owns the **shared files** (manifests, shared types,
   module wiring) and makes the project **compile** with stubbed bodies — so the
   parallel build agents never touch a shared declaration.
4. **Build (fan out).** One agent per file. Each prompt carries the contract
   verbatim and an explicit ownership line: "you own ONLY <these files>; code
   against the contract, not each other's files." Disjoint ownership is the whole
   game — two agents on one file is the drift hazard.
5. **Integrate.** One `integration-runner` runs the **real, named gate** to green
   (build + test + lint + a live probe), fixes only the cross-file drift the
   authors could not (they owned only their files), and returns the **verbatim**
   command output — evidence, not a self-certification.
6. **Verify (fan out).** `skeptic-verifier`s refute the **load-bearing claim** —
   one per claim, default refuted unless proven, recomputing from raw output.

## The contract — what prevents drift

Define it ONCE and prepend it verbatim to every build agent:
- the exact types and signatures the agents must produce and consume;
- a file→owner map — who owns what, with no overlaps;
- "code against THIS, not each other's files; you own ONLY <files>";
- the hard rules (no new fixtures, never weaken a test, never run git).
Give every agent a structured output schema so results merge mechanically.

## Gate-green is not claim-true (the load-bearing rule)

A passing gate proves the **gate ran**, not that the **claim is true**. The two
diverge constantly — a feature can compile, typecheck, lint, and unit-test green
while being unmounted, unreachable, behind an off flag, or green only on one OS.
Before you write "done":
- **Re-run the named gate yourself** — do not trust the integration agent's word.
- **Refute the claim, not the gate** — is the thing actually wired / mounted /
  reachable by a user, or merely present? One skeptic per claim. (This is `refute`.)
- **Probe execution** — did the path actually *run*, or just pass a test behind a
  flag? "Tests pass" is not "the path ran."
- **Probe the environment** — is "green" a function of the developer's OS? Re-check
  a determinism-sensitive gate on a second platform.
- **Prove the test is non-vacuous** — inject the bug; if the test still passes, it
  proves nothing.

## Survival rules for the fan-out itself

- **One risky stage per run; the human commits between runs.** A long monolithic
  pipeline that dies mid-stage strands a half-mutated tree.
- **A resume run restores the interrupted stage — it must not smuggle in the next
  stage's code.**
- **Tolerate partial results** — agents stall, hit limits, return null; aggregation
  must be null-safe and stalls must retry.
- **Agents never write git** — emit the commit command for the human; close a stage
  via a real merge, not a local pointer.

## Example

A runnable, domain-neutral skeleton of this exact pipeline ships beside this skill
at `example.mjs` (workflow-runtime script). It is the shape two independent real
builds converged on: a shared contract prepended to every disjoint-file build
agent, an `integration-runner` closer on the named gate, and `skeptic-verifier`s
refuting each load-bearing claim — with null-safe result handling throughout.
```

- [ ] **Step 2: Run the surface-scrub gate**

Run: `cd ~/dev/rigor && node scripts/check-surface-scrub.mjs`
Expected: `surface-scrub: clean`.

- [ ] **Step 3: Commit (command for Hossain)**

```bash
cd ~/dev/rigor
git add skills/fanout-build/SKILL.md
git commit -m "feat(skills): fanout-build — the trustworthy multi-agent build pipeline"
```

---

### Task 3: `fanout-build` runnable example

**Files:**
- Create: `~/dev/rigor/skills/fanout-build/example.mjs`

**Interfaces:**
- Produces: a workflow-runtime script demonstrating the pipeline; validated by `check-fanout` (Task 1) and surface-scrub, NOT by `node --check`.

- [ ] **Step 1: Write the example**

`~/dev/rigor/skills/fanout-build/example.mjs`:
```js
// fanout-build — the trustworthy multi-agent build, domain-neutral.
//
// Run via the workflow runtime. The shape (Spike -> Contract -> Scaffold ->
// Build -> Integrate -> Verify) is the one two independent real builds converged
// on. Only Build and Verify fan out; everything else is one agent. This file uses
// top-level await/return and injected globals, so it is NOT a standalone module
// (it intentionally fails `node --check`); check-fanout + surface-scrub validate it.

export const meta = {
  name: 'fanout-build',
  description: 'Trustworthy multi-agent build: shared contract, disjoint files, scaffold-first, integration gate, skeptic claim-refutation.',
  phases: [
    { title: 'Spike' }, { title: 'Contract' }, { title: 'Scaffold' },
    { title: 'Build' }, { title: 'Integrate' }, { title: 'Verify' },
  ],
}

// args: { spikePrompt, contractPrompt, scaffoldPrompt, files:[{path,prompt}], gate, claims:[...] }
const A = args || {};

const FILE_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['done', 'notes'],
  properties: { done: { type: 'boolean' }, notes: { type: 'string' } },
};
const INTEG_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['green', 'commands'],
  properties: {
    green: { type: 'boolean' },
    commands: { type: 'array', items: {
      type: 'object', additionalProperties: false, required: ['cmd', 'exitCode', 'tail'],
      properties: { cmd: { type: 'string' }, exitCode: { type: 'integer' }, tail: { type: 'string' } },
    } },
  },
};
const VERDICT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['claim', 'verdict', 'evidence'],
  properties: {
    claim: { type: 'string' },
    verdict: { type: 'string', enum: ['true', 'refuted', 'unverifiable'] },
    evidence: { type: 'string' },
  },
};

phase('Spike');
const spike = await agent(
  A.spikePrompt || 'Prove the riskiest unknown builds before any fan-out. If it cannot build, say HALT.',
  { label: 'spike', phase: 'Spike' }
);
if (/\bHALT\b|cannot build/i.test(String(spike))) { log('spike halted the build'); return { halted: true, spike }; }

phase('Contract');
// The single source of truth, prepended verbatim to every build agent.
const CONTRACT = await agent(
  (A.contractPrompt || 'Produce the exact types, signatures, and file->owner map every build agent will code against.') +
  ' Output the contract as text that can be pasted verbatim into each downstream prompt.',
  { label: 'contract', phase: 'Contract' }
);

phase('Scaffold');
// One agent owns the shared files and must make the project COMPILE with stubs.
await agent(
  'SHARED CONTRACT (code against this exactly):\n' + CONTRACT + '\n\n' +
  (A.scaffoldPrompt || 'You OWN the shared files (manifests, shared types, module wiring). Make the project COMPILE with stubbed bodies; leave each owned-elsewhere body a TODO. Do not run git.'),
  { label: 'scaffold', phase: 'Scaffold' }
);

phase('Build');
// One agent per file, disjoint ownership, contract prepended verbatim.
const files = A.files || [];
const built = await parallel(files.map((f) => () => agent(
  "SHARED CONTRACT (code against this, NOT each other's files):\n" + CONTRACT + '\n\n' +
  'You own ONLY: ' + f.path + '\n' + f.prompt + '\nNever run git.',
  { label: 'build:' + f.path, phase: 'Build', schema: FILE_SCHEMA }
)));
log(built.filter(Boolean).filter((b) => b.done).length + '/' + files.length + ' files built');

phase('Integrate');
const integ = await agent(
  'Run the REAL gate and iterate until genuinely green, then fix only the cross-file drift the per-file agents could not (they owned only their files). ' +
  'Gate: ' + (A.gate || 'build + test + lint + a live probe') + '. ' +
  'Do NOT weaken assertions, skip tests, or run git. Return the verbatim final output of each command as evidence.',
  { label: 'integrate', phase: 'Integrate', agentType: 'integration-runner', schema: INTEG_SCHEMA }
);

phase('Verify');
// Refute the CLAIM, not just the gate. gate-green != claim-true.
const claims = A.claims || [];
const verdicts = await parallel(claims.map((c) => () => agent(
  'Gate-green is not claim-true. REFUTE this claim: check it is actually wired/mounted/reachable and that its path RAN ' +
  '(not just compiled or passed behind a flag). Recompute from raw output; default to refuted unless proven. Claim: ' + c,
  { label: 'verify', phase: 'Verify', agentType: 'skeptic-verifier', schema: VERDICT_SCHEMA }
)));

const refuted = verdicts.filter(Boolean).filter((v) => v.verdict === 'refuted');
return { gate: integ, claims: verdicts, claimTrue: Boolean(integ && integ.green) && refuted.length === 0 };
```

- [ ] **Step 2: check-fanout passes on the example (dogfood)**

Run: `cd ~/dev/rigor && node scripts/check-fanout.mjs skills/fanout-build/example.mjs`
Expected: `check-fanout: trustworthy-build scaffolding present (structure only).` (it has a shared `CONTRACT`, an `integration-runner` integrate step, a skeptic verify phase, and schemas).

- [ ] **Step 3: surface-scrub stays clean**

Run: `cd ~/dev/rigor && node scripts/check-surface-scrub.mjs`
Expected: `surface-scrub: clean` (the gate scans `skills/**/SKILL.md`, not `example.mjs`; this confirms the SKILL.md from Task 2 is still clean).

- [ ] **Step 4: Commit (command for Hossain)**

```bash
cd ~/dev/rigor
git add skills/fanout-build/example.mjs
git commit -m "feat(skills): runnable domain-neutral fanout-build example"
```

---

### Task 4: `/fanout` command

**Files:**
- Create: `~/dev/rigor/commands/fanout.md`

**Interfaces:**
- Consumes: `fanout-build` (Task 2).

- [ ] **Step 1: Write the command**

`~/dev/rigor/commands/fanout.md`:
```markdown
---
description: Run a trustworthy multi-agent build — shared contract, disjoint files, scaffold-first, integration gate, skeptic claim-refutation.
status: provisional
---

Invoke the `fanout-build` skill for the build described below. Spike the riskiest
unknown first; author one shared contract; scaffold the shared files until they
compile; fan out one agent per file against the contract (each owning only its
files); close with an `integration-runner` on the real named gate; then refute the
load-bearing claim with `skeptic-verifier`s — gate-green is not claim-true. Emit
commit commands for me to run; never write git history yourself.

$ARGUMENTS
```

- [ ] **Step 2: Run the surface-scrub gate**

Run: `cd ~/dev/rigor && node scripts/check-surface-scrub.mjs`
Expected: `surface-scrub: clean`.

- [ ] **Step 3: Commit (command for Hossain)**

```bash
cd ~/dev/rigor
git add commands/fanout.md
git commit -m "feat(commands): /fanout -> fanout-build"
```

---

### Task 5: README + FEEDBACK updates

**Files:**
- Modify: `~/dev/rigor/README.md`
- Modify: `~/dev/rigor/FEEDBACK.md`

- [ ] **Step 1: Add the Phase 3 section to the README**

In `~/dev/rigor/README.md`, immediately after the `## Phase 2 (operating-system layer)` block (its table + paragraph), insert:
```markdown
## Phase 3 (orchestration discipline)

| Component | Kind | Status |
|---|---|---|
| `fanout-build` | skill | provisional |
| `/fanout` | command | provisional |
| `check-fanout` | gate (heuristic) | provisional |

`fanout-build` packages the trustworthy multi-agent **build** — one shared
contract, disjoint-file ownership, scaffold-first, an `integration-runner` gate,
and a `skeptic-verifier` pass that refutes the *claim* (a green gate is not a true
claim). `/fanout` is its entry point; `check-fanout` flags a fan-out workflow
script missing that scaffolding (structure only — it cannot prove file-disjointness
or that a claim is true). Grounded in two independent real multi-agent builds.
```

- [ ] **Step 2: Add the `fanout-build` node to the "How it works" diagram**

In `~/dev/rigor/README.md`, inside the `osys` subgraph of the Mermaid diagram, add a node and class so the Phase-3 skill appears in the operating-system layer:
```
        RC["/recon"] --> FRS["fanout-recon-synthesize<br/>decompose · fan-out · synthesize"]
        FB["/fanout"] --> FBS["fanout-build<br/>contract · disjoint · gate · refute claim"]
        GD["gate-discipline"]
        HO["/handoff"]
```
and extend the Phase-2 class line to include the two new nodes:
```
    class RC,FRS,GD,HO,FB,FBS p2;
```
and add a dotted cross-edge showing it calls back into refute/skeptics:
```
    FBS -. refutes the claim via .-> REF
```

- [ ] **Step 3: Add `fanout-build` to the FEEDBACK ledger**

In `~/dev/rigor/FEEDBACK.md`, add a row to the promotion-ledger table:
```markdown
| `fanout-build` | 0 | provisional |
```

- [ ] **Step 4: surface-scrub stays clean + diagram label check**

Run: `cd ~/dev/rigor && node scripts/check-surface-scrub.mjs`
Expected: `surface-scrub: clean`.
Confirm every new Mermaid node label that begins with `/` is double-quoted (`"/fanout"`) so it does not trigger the parallelogram-shape parse bug.

- [ ] **Step 5: Commit (command for Hossain)**

```bash
cd ~/dev/rigor
git add README.md FEEDBACK.md
git commit -m "docs: add Phase 3 (orchestration discipline) to README + FEEDBACK"
```

---

### Task 6: Phase 3 integration verification

**Files:** none created — this task produces evidence.

- [ ] **Step 1: Full suite green**

Run: `cd ~/dev/rigor && node --test`
Expected: all tests pass, 0 fail (git-guard + session-start + surface-scrub + the new fanout-check suite).

- [ ] **Step 2: Both gates clean**

Run: `cd ~/dev/rigor && node scripts/check-surface-scrub.mjs && node scripts/check-fanout.mjs skills/fanout-build/example.mjs`
Expected: `surface-scrub: clean` then `check-fanout: trustworthy-build scaffolding present (structure only).`

- [ ] **Step 3: No import side-effects on the new script**

Run: `cd ~/dev/rigor && node --input-type=module -e "await import('./scripts/check-fanout.mjs'); process.stdout.write('IMPORT_OK')"`
Expected: prints only `IMPORT_OK`.

- [ ] **Step 4: Negative check — check-fanout actually catches a bad script**

Run: `cd ~/dev/rigor && printf "phase('Build'); await parallel([()=>agent('t')]);\n" > /tmp/bad-fanout.mjs && node scripts/check-fanout.mjs /tmp/bad-fanout.mjs; echo "exit=$?"`
Expected: warnings printed (no verify, no integration, no schemas, no contract) and `exit=1`. (Confirms the gate is non-vacuous.)

- [ ] **Step 5: Commit (command for Hossain)**

```bash
cd ~/dev/rigor
git tag v0.3.0
# (push when ready — your call, your history)
```

---

## Future work (recorded, not built)

- **Phase 4 — the learning loop (kept as a live possibility).** Make the
  `provisional → settled` cycle real: a `/retro` that logs structured
  fired/helped/misfired-by-domain entries to `FEEDBACK.md`; a promotion mechanism
  that surfaces a suggestion once a component crosses ≥2 independent domains (and
  flags a stale `provisional` or a `settled`-without-evidence); a misfire→refinement
  path; and a `/self-audit` that institutionalizes the fan-out-recon spine audit.
  This is `implemented-vs-planned` + `refute` applied to the toolkit itself, over
  time. Not built here.
- **Phase 2 upgrade (separate follow-up).** The same mining that grounded this phase
  surfaced a proven **handoff-brief structure** (cold-start seed → state-in-one-line
  → reuse map → named invariants → "don't re-litigate" locked decisions →
  out-of-scope fences → independent-reviewer corrections) and two failure modes —
  **decisions relitigated across the handoff seam** and **stale-brief tombstones**
  ("do not execute as written"). These should upgrade the Phase 2 `/handoff`
  template and `gate-discipline` skill. Recorded for a Phase 2 revision, not part of
  this plan.

---

## Self-Review

**1. Spec coverage (against the design grounding):** the convergent pipeline →
`fanout-build` SKILL.md (T2) + runnable `example.mjs` (T3) ✓; shared-contract
anti-drift → contract section + example's verbatim-prepended `CONTRACT` ✓;
gate-green≠claim-true → its own SKILL section + the example's Verify phase + the
`check-fanout` "no adversarial verify" rule (T1) ✓; survival modes (one-stage,
resume-no-smuggle, null-safe, stall) → SKILL "Survival rules" + example's
`filter(Boolean)` null-safety ✓; git-at-scale → SKILL + example "never run git" +
commit-commands-for-Hossain across every task ✓; executable-discipline pattern →
`check-fanout` gate (T1) ✓; `/fanout` entry (T4) ✓; honest heuristic caveat
(T1 code + README) ✓; learning loop parked as Phase 4 ✓. No gaps.

**2. Placeholder scan:** every code/content step contains complete content; no TBD.
The example deliberately fails `node --check` (documented, validated by
check-fanout + surface-scrub instead) — by design, not a gap.

**3. Type consistency:** `analyzeFanout(src) -> string[]` (T1) matches its test and
CLI; the example's exported `meta` + the `agentType:'integration-runner'` /
`'skeptic-verifier'` strings match the vendored agent names; `check-fanout`'s
anchors (`skeptic-verifier`, `integration-runner`, `schema:`, `CONTRACT`) are
exactly the tokens the example emits, so T3 Step 2 (clean on the real example) and
T6 Step 4 (warns on a bad script) are mutually consistent.
