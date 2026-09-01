# Learnings ledger (index)

Anchored, re-executable records of non-obvious facts learned about **this
repo** — what survived refutation and what got killed (ADR-0003). Entries live
beside this file as dated immutable markdown files, `YYYY-MM-DD-<topic>.md`,
so a plain listing sorts chronologically (newest at the bottom). This index
holds **pointers only, never evidence**: every claim here must trace to an
entry file, which traces to its quoted basis.

Each entry is a record with required fields, gated by
`scripts/check-learnings.mjs`:

- `ts:` — RFC 3339 UTC, captured from the system clock when the finding
  landed (never composed from memory, never reconstructed later)
- `commit:` — this repo's HEAD at capture, the against-what-state anchor
- `session:` — provenance pointer into the harness transcript (pointer, not
  proof: transcripts are machine-local and ephemeral)
- `status:` — `verified` | `refuted-assumption` | `suspected`
- `fact:` — the one-line non-obvious finding
- `basis:` — the command run and its output, quoted into the entry at capture
- `re-verify:` — one executable line that re-establishes the fact

Entries are immutable once written; a wrong entry is never edited in place — a
dated superseding entry with a `kills:` reference is appended instead.
`/rigor:handoff` is the sole writer: it curates the per-run scratch buffer's
survivors, carrying their original timestamps — nothing enters un-judged.
The ledger started empty on 2026-07-12 and earns entries forward, never
backfilled (a reconstructed entry is a capture-shaped lie).

This folder is distinct from `docs/feedback/`: feedback holds verdicts about
rigor's **components** (the promotion ledger, rigor-only); learnings hold
anchored facts about the **repo** itself. Target repos rigor works in get a
learnings folder of their own; they never get a feedback folder.

## Entries

| Date | Entry | Status | Fact |
|---|---|---|---|
| 2026-07-14 | [2026-07-14-form-gate-passed-a-record-whose-basis-was-fiction.md](2026-07-14-form-gate-passed-a-record-whose-basis-was-fiction.md) | verified | `check-learnings` passed a ledger green whose quoted basis did not exist at its own commit anchor — a form gate is a floor, never a verdict |
| 2026-07-15 | [2026-07-15-check-fanout-has-no-tier-pin-check.md](2026-07-15-check-fanout-has-no-tier-pin-check.md) | verified | `check-fanout.mjs` checks contract/schema/integration/verify but has no check for a build-tier `model:`/`agentType:` pin on `agent()` calls — the gap ADR-0006 proposes to close *(superseded 2026-07-18: gap closed by `check-tier-placement.mjs`)* |
| 2026-07-18 | [2026-07-18-agenttype-is-not-a-tier-pin.md](2026-07-18-agenttype-is-not-a-tier-pin.md) | verified | `agentType:` alone is not a tier pin — with `model: inherit` frontmatter the call still collapses onto the session model (tic build: 505/505 turns on Fable despite 7 typed agents) |
| 2026-07-18 | [2026-07-18-tier-pin-gate-red-on-real-collapse.md](2026-07-18-tier-pin-gate-red-on-real-collapse.md) | verified | `check-tier-placement.mjs` built (separate gate, operator call) and verified non-vacuous red on the real tic collapse script; example.mjs fixed to config-sourced tiers + worker receipts |
| 2026-07-19 | [2026-07-19-receipt-answered-needs-bare-model-id.md](2026-07-19-receipt-answered-needs-bare-model-id.md) | verified | receipt prompts must demand the bare model id — display-name echoes false-positive check-dispatch's silent-downgrade class (13/16 on first live run); gate-side normalization still unbuilt *(superseded 2026-07-22: normalization built gate-side)* |
| 2026-07-19 | [2026-07-19-halt-check-needs-affirmative-marker.md](2026-07-19-halt-check-needs-affirmative-marker.md) | verified | `/\bHALT\b/` over spike free text halts on "No HALT" — affirmative markers only (`HALT:` or line-start); live false-halt on the CLDD v3 build; shipped example.mjs carried and now fixes the same pattern |
| 2026-07-22 | [2026-07-22-receipt-normalization-gate-side.md](2026-07-22-receipt-normalization-gate-side.md) | verified | `receiptMatches` built — check-dispatch now accepts an `answered` that unambiguously token-contains the requested id, fail-closed when another configured tier model is echoed; bare-id prompt discipline stays recommended |
| 2026-07-22 | [2026-07-22-workflow-args-can-arrive-json-encoded.md](2026-07-22-workflow-args-can-arrive-json-encoded.md) | verified | Workflow `args` can arrive as a JSON-encoded string — scripts must parse-if-string AND halt-if-unpinned, else every tier pin silently vanishes; example.mjs halts but does not yet parse |
| 2026-07-22 | [2026-07-22-receipt-suffixes-not-just-display-names.md](2026-07-22-receipt-suffixes-not-just-display-names.md) | verified | first live mid dispatch answered `claude-opus-4-8[1m]` — variant suffixes join display names as a receipt-echo class; receiptMatches accepted it, exact-equality would have false-positived |
| 2026-07-22 | [2026-07-22-check-learnings-dialect-and-cwd-limits.md](2026-07-22-check-learnings-dialect-and-cwd-limits.md) | verified | check-learnings rejects `**bold**` field labels (13 substance-complete entries → 39 failures; sed-normalize → clean) and must run from inside the target repo (append-only leg fails closed otherwise) — the kit contract states neither |
| 2026-08-08 | [2026-08-08-handoff-folder-gate-scope-contradiction.md](2026-08-08-handoff-folder-gate-scope-contradiction.md) | verified | plan doc says never point check-learnings at `docs/handoff/`; the tool accepts HANDOFF.md as an index and AGENTS.md says "same shape" — every prose brief fails all 7 field checks by construction, so the kit contract must pick a scope |
| 2026-08-08 | [2026-08-08-check-learnings-append-only-blind-to-history.md](2026-08-08-check-learnings-append-only-blind-to-history.md) | verified | the append-only leg diffs only working-tree-vs-HEAD — committed in-place edits pass vacuously; pvt-demo's clean tree hid two A→M dated entries and the gate examined zero changes (run-6 skeptics, REFUTED ×2) |
| 2026-08-18 | [2026-08-18-check-runlog-built-but-never-invoked.md](2026-08-18-check-runlog-built-but-never-invoked.md) | verified | `check-runlog` was built 07-22 and **no writer invokes it** — `fanout-loop` step 5 appends to the run log and never gates it, so a new effort's first entry drifted dialect and sat RED through its own commit |
| 2026-08-18 | [2026-08-18-verdict-logs-carry-no-agent-identity.md](2026-08-18-verdict-logs-carry-no-agent-identity.md) | refuted-assumption | no verdict record carries an `agentType` and `check-dispatch` has no agent-identity field — so "skeptic-verifier-fast FIRED in runs 4–6" is the tier firing, not the agent; the named agent has never been dispatched |
| 2026-08-19 | [2026-08-19-go-overlay-plants-twins-without-mutating.md](2026-08-19-go-overlay-plants-twins-without-mutating.md) | verified | `go test -overlay` substitutes (or adds) files at build time, so a planted-twin polarity leg runs against mutated source with the target repo's working tree untouched |
| 2026-08-19 | [2026-08-19-sweep-movement-must-be-per-surface.md](2026-08-19-sweep-movement-must-be-per-surface.md) | refuted-assumption | a single global "upstream moved" flag launders rot into drift — a moved gold table excused a regenerator-surface claim; movement must resolve per surface, and unknown must never collapse to unmoved |
| 2026-08-19 | [2026-08-19-drift-vs-rot-needs-a-historical-oracle.md](2026-08-19-drift-vs-rot-needs-a-historical-oracle.md) | verified | git history is an oracle independent of the artifact: it decided ROT where the movement heuristic would have said STALE, and an `anchor_oracle` outranks the heuristic wherever one exists |
| 2026-08-22 | [2026-08-22-status-table-contradicts-itself-on-adr-0012.md](2026-08-22-status-table-contradicts-itself-on-adr-0012.md) | verified | STATUS.md (stamped 2026-08-18) carries the 08-19 handoff's settlements in its skill rows but still has an ADR-0012 row reading "accepted, nothing built", and labels the r... |
| 2026-08-22 | [2026-08-22-repo-has-no-ci.md](2026-08-22-repo-has-no-ci.md) | verified | rigor has no CI configuration at all - no .github/, zero tracked files under it, none ever committed - so "a red twin in CI on every push" can only mean the operator-run... |
| 2026-08-22 | [2026-08-22-git-show-head-relative-path-refuses-uncommitted.md](2026-08-22-git-show-head-relative-path-refuses-uncommitted.md) | verified | git show HEAD:./<path> resolves the path relative to the cwd (not the repo root) and fails on an uncommitted file, so a hook loading a record that way sees only committed... |
| 2026-08-22 | [2026-08-22-kustomize-render-deterministic-but-ci-substitutes-bytes.md](2026-08-22-kustomize-render-deterministic-but-ci-substitutes-bytes.md) | verified | the reviewed rendered prod manifest (placeholders) and the applied one (image substituted inside the CI job) differ by construction - release-artifact-integrity's twin is... |
| 2026-08-22 | [2026-08-22-skeptic-read-commit-date-as-provenance.md](2026-08-22-skeptic-read-commit-date-as-provenance.md) | verified | a judgment-tier skeptic asserted an uncommitted working-tree edit "landed 2026-08-18" because git log -1 -- <file> dates the last COMMIT, not the working copy; a provenan... |
| 2026-08-22 | [2026-08-22-first-domain-has-no-protection-rules-and-no-successful-deploy.md](2026-08-22-first-domain-has-no-protection-rules-and-no-successful-deploy.md) | verified | the first domain's "Requires manual approval" on environment: production is a YAML comment backed by no protection rule; skip-approval is never read; all 41 CD runs faile... |
| 2026-08-22 | [2026-08-22-worker-fabricated-receipt-after-schema-rejection.md](2026-08-22-worker-fabricated-receipt-after-schema-rejection.md) | verified | when a worker's real receipt fails the StructuredOutput schema, the retry can be a placeholder that satisfies the schema and says nothing ("a" in every field); the work w... |
| 2026-08-22 | [2026-08-22-over-broad-gate-instruction-caused-out-of-scope-edit.md](2026-08-22-over-broad-gate-instruction-caused-out-of-scope-edit.md) | verified | a gate phrased as "this grep over the whole folder must be empty" is an instruction to edit whatever it hits, including files the agent does not own; ownership lists do n... |
| 2026-08-22 | [2026-08-22-git-guard-matches-heredoc-table-rows.md](2026-08-22-git-guard-matches-heredoc-table-rows.md) | verified | git-guard evaluates the whole Bash tool input including heredoc bodies, and a markdown table cell quoting a history-writing command is enough to refuse the call (the | sp... |
| 2026-08-22 | [2026-08-22-git-guard-five-pre-existing-bypass-forms.md](2026-08-22-git-guard-five-pre-existing-bypass-forms.md) | verified | the pre-session git-guard matched reset --hard, tag -f and branch -f/-D only when the flag sat immediately after the verb, so git reset -q --hard HEAD~1, git reset HEAD~1... |
| 2026-08-22 | [2026-08-22-mid-tier-repinned-to-opus-5-with-no-receipt-yet.md](2026-08-22-mid-tier-repinned-to-opus-5-with-no-receipt-yet.md) | verified | the mid tier now pins claude-opus-5 in config and in both mid-tier agents' frontmatter, tier-sync green - but ZERO receipts in the session's verdict log answered on... |
| 2026-08-22 | [2026-08-22-readme-mermaid-diagrams-are-ungated.md](2026-08-22-readme-mermaid-diagrams-are-ungated.md) | verified | the README ships 8 mermaid diagrams and no gate in the repo parses them - a syntax error would ship silently; a real parse needs mermaid + jsdom installed OUTSIDE th... |
| 2026-08-22 | [2026-08-22-check-fanout-reports-not-applicable-as-passed.md](2026-08-22-check-fanout-reports-not-applicable-as-passed.md) | verified | check-fanout early-returns zero warnings for any file without parallel( or pipeline( ('not a fan-out script - nothing to check'), and its CLI then prints 'trustworth... |
| 2026-08-22 | [2026-08-22-a-content-rule-must-be-applied-to-diagram-labels-too.md](2026-08-22-a-content-rule-must-be-applied-to-diagram-labels-too.md) | verified | an instruction to remove ADR references from the README was applied to the prose and missed a mermaid node label; a content rule enforced by reading prose does not see diagram labels |
| 2026-08-22 | [2026-08-22-and-chained-verification-can-report-an-exit-code-it-never-ran.md](2026-08-22-and-chained-verification-can-report-an-exit-code-it-never-ran.md) | verified | `grep -c` exits 1 on zero matches, so an `&&` verification chain stops silently and a trailing `echo exit=$?` reports the grep's code under a later command's name - a false confirmation |
| 2026-09-01 | [2026-09-01-uncommitted-work-outlives-its-provenance-window.md](2026-09-01-uncommitted-work-outlives-its-provenance-window.md) | verified | the DQX addendum sat uncommitted across seven briefs; when finally resolved, no surviving transcript contained its authoring edit (oldest transcript 2026-08-03, addendum authored 07-21/22) - whether it met the base doc's verification standard is permanently unknowable |
| 2026-09-01 | [2026-09-01-resolvesupersession-conflated-key-name-with-key-type.md](2026-09-01-resolvesupersession-conflated-key-name-with-key-type.md) | verified | the shared resolver tested `key === 'run'` to decide whether supersedes is numeric - key NAME stood in for key TYPE, rejecting check-harvest's numeric `n`; fixed with an explicit `numeric` option defaulting to the old behavior |
