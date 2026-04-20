# Story 82.2: Unskip and Fix Unit Tests

Status: Approved

## Story

As a developer,
I want all category-B skipped unit tests to be unskipped and fixed so they pass, and all category-A skipped unit tests to be deleted,
so that the unit test suite provides complete, meaningful coverage with no intentionally skipped tests.

## Acceptance Criteria

1. **Given** category-B skipped unit tests from Story 82.1,
   **When** developer removes the `.skip` annotation and runs each test,
   **Then** any failures are diagnosed and fixed in application or test code so each test passes.

2. **Given** category-A skipped unit tests (duplicates) from Story 82.1,
   **When** developer deletes these tests,
   **Then** coverage for the same behaviour is still provided by remaining passing tests.

3. **Given** all category-A tests deleted and all category-B tests unskipped and fixed,
   **When** `pnpm test` runs,
   **Then** output shows zero skipped unit tests and all tests pass.

4. **Given** `pnpm all` runs after unit test changes,
   **When** the full quality gate executes,
   **Then** all tests pass including the E2E suite.

## Tasks / Subtasks

- [ ] Read the inventory from Story 82.1 — obtain the unit test list (AC: #1, #2)
  - [ ] Identify all category-A unit tests (duplicates to delete)
  - [ ] Identify all category-B unit tests (unique coverage to unskip and fix)

- [ ] Process category-A unit tests — delete duplicates (AC: #2)
  - [ ] For each category-A test: confirm the identical behaviour is covered by a currently-passing test
  - [ ] Remove the entire skipped `it.skip` / `xit` / `test.skip` block
  - [ ] If removal empties a parent `describe` block, remove the `describe` block too
  - [ ] If removal empties the entire spec file, delete the spec file
  - [ ] Run `pnpm test` after each deletion to confirm still passing

- [ ] Process category-B unit tests — unskip and fix (AC: #1)
  - [ ] For each category-B test: remove the skip modifier (`it.skip` → `it`, `xit` → `it`, `test.skip` → `test`, etc.)
  - [ ] Run `pnpm test` to observe the failure (if any)
  - [ ] Diagnose the root cause — do NOT weaken assertions; find and fix the underlying issue
  - [ ] If test was skipped because of a known bug: fix the bug in application code first, then unskip
  - [ ] If test was skipped because of a completed refactor: just remove the skip — no other changes needed
  - [ ] Run `pnpm test` again to confirm the test passes
  - [ ] If a fix is too complex for this story: leave skip in place, add `// TODO(E82): blocked — see deferred list` above the skip, and document reason in Completion Notes

- [ ] Verify zero skipped unit tests remain (AC: #3)
  - [ ] Run the verification grep (see Key Commands below)
  - [ ] Result must be empty (excluding any `@atdd` exempt files)

- [ ] Run full quality gate (AC: #4)
  - [ ] `pnpm all`
  - [ ] Confirm exit code 0

## Dev Notes

### Unit Test Scope

Unit tests for this story are Vitest files colocated with source:

- `apps/dms-material/src/**/*.spec.ts` — Angular frontend
- `apps/server/src/**/*.spec.ts` — Fastify backend

Playwright E2E files (`apps/dms-material-e2e/`) are handled exclusively in Story 82.3.

### Categorisation Reference (from Story 82.1)

| Category | What it means | Action |
|----------|--------------|--------|
| A | Duplicate — another passing test covers identical behaviour | Delete the entire skipped test block |
| B | Unique — no other test covers this behaviour | Unskip and fix root cause |

### Running Unit Tests Only

```bash
# All unit tests (dms-material + server)
pnpm test

# Frontend only
pnpm nx run dms-material:test

# Backend only
pnpm nx run server:test

# Single spec file (faster iteration during fixes)
pnpm nx run dms-material:test --testFile=path/to/component.spec.ts
```

### Verifying Zero Skipped Unit Tests

```bash
grep -rn "\.skip\|xit\b\|xdescribe\b\|test\.skip\|it\.skip\|describe\.skip" \
  apps/ \
  --include="*.spec.ts" \
  --include="*.test.ts"
```

This command must return **zero results** (or only results in `@atdd`-exempt files) before this story is complete.

### Angular Coding Conventions

When fixing application code to make unit tests pass, follow project conventions:

- Use `inject()` pattern instead of constructor injection
- Set `changeDetection: ChangeDetectionStrategy.OnPush` on components
- Prefer signals over `BehaviorSubject` / `Observable` where the pattern already exists in the file

Do NOT refactor code that is not directly related to the failing test — only make the minimal change required.

### Quality Rules

- Do NOT change test assertions to match broken behaviour — find and fix the root cause in application code
- Do NOT delete a category-B test because the fix seems hard — either fix it or defer it with a `TODO` comment and documentation
- Do NOT introduce new skips while fixing; each change must leave the codebase with the same or fewer skipped tests

### Deferred Fix Protocol

If a category-B fix is too complex to complete within this story:

1. Leave the skip annotation in place
2. Add `// TODO(E82): blocked — <one-line reason>` immediately above the skip
3. Document the deferral in the Completion Notes with: test name, file path, and reason for deferral
4. The story can still be marked done — deferred items do not block completion provided they are documented

### Key Commands

| Purpose | Command |
|---------|---------|
| Run all unit tests | `pnpm test` |
| Run frontend unit tests only | `pnpm nx run dms-material:test` |
| Run backend unit tests only | `pnpm nx run server:test` |
| Verify zero skipped unit tests | `grep -rn "\.skip\|xit\b\|xdescribe\b\|test\.skip\|it\.skip\|describe\.skip" apps/ --include="*.spec.ts" --include="*.test.ts"` |
| Full quality gate | `pnpm all` |

### Key Files

| File | Purpose |
|------|---------|
| `apps/dms-material/src/**/*.spec.ts` | Angular frontend unit tests |
| `apps/server/src/**/*.spec.ts` | Fastify backend unit tests |
| `eslint.config.mjs` | ESLint config — `vitest/no-disabled-tests` rule |
| `vitest.config.ts` | Root Vitest configuration |
| `vitest.workspace.ts` | Vitest workspace project references |

## Dev Agent Record

### Agent Model Used

_TBD_

### Debug Log References

### Completion Notes List

### File List
