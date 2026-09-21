// Shared fixture for plan-waves and execute-plan tests: a five-task
// writing-plans plan. Task 3 modifies Task 1's file; Task 5 shares Task 2's
// test file; Task 4 is disjoint from everything. Not a test file itself (no
// `.test.` in the name), so node --test does not run it.
export const FIXTURE = `# Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: whatever.

**Goal:** Build the widget.

## Global Constraints

- Node stdlib only.
- Every task ends green.

---

### Task 1: Core module

**Files:**
- Create: \`src/a.js\`
- Test: \`tests/a.test.js\`

**Interfaces:**
- Consumes: nothing
- Produces: \`a(x: number) -> number\`

- [ ] **Step 1: Write the failing test**

\`\`\`js
test('a', () => assert.equal(a(1), 2));
\`\`\`

- [ ] **Step 2: Commit**

\`\`\`bash
git add src/a.js tests/a.test.js
git commit -m "feat: add a"
\`\`\`

### Task 2: Second module

**Files:**
- Create: \`src/b.js\`
- Test: \`tests/b.test.js\`

**Interfaces:**
- Consumes: nothing
- Produces: \`b() -> string\`

- [ ] **Step 1: Commit**

\`\`\`bash
git commit -m "feat: add b"
\`\`\`

### Task 3: Extend core

**Files:**
- Modify: \`src/a.js:10-20\`
- Test: \`tests/a2.test.js\`

**Interfaces:**
- Consumes: \`a(x)\` from Task 1
- Produces: \`a2(x: number) -> number\`

- [ ] **Step 1: Commit**

\`\`\`bash
git commit -m "feat: extend a"
\`\`\`

### Task 4: Independent helper

**Files:**
- Create: \`src/c.js\`

**Interfaces:**
- Consumes: nothing
- Produces: \`c() -> void\`

### Task 5: More b tests

**Files:**
- Modify: \`tests/b.test.js\`

**Interfaces:**
- Consumes: \`b()\` from Task 2
- Produces: nothing

## Appendix

Not a task.
`;
