# Story 82.1: Inventory All Skipped Tests

Status: Approved

## Story

As a developer,
I want a complete inventory of every skipped test in the codebase — file path, test name, and the reason it was skipped —
so that Stories 82.2, 82.3, and 82.4 can triage and resolve each one with full context.

## Acceptance Criteria

1. **Given** the workspace at `apps/`,
   **When** developer runs recursive grep for `.skip`, `xit`, `xdescribe`, `test.skip`, `it.skip`, `describe.skip` across all `*.spec.ts` and `*.test.ts` files,
   **Then** every matching occurrence is listed in Dev Notes with file path, line number, test description, and any adjacent comment.

2. **Given** inventory is complete,
   **When** developer categorises each skipped test as either (A) duplicate of existing passing test or (B) unique coverage not provided elsewhere,
   **Then** categorisation is recorded in Dev Notes with rationale for each entry.

3. **Given** inventory document is finalised,
   **When** no production or test code is changed in this story,
   **Then** `pnpm all` continues to pass with the same skip counts as before.

## Tasks / Subtasks

- [ ] Run grep to locate all skipped tests (AC: #1)
  - [ ] Execute the inventory grep from repo root `/home/dave/code/dms-workspace/`
  - [ ] Capture file path, line number, and test name for each match
  - [ ] Check adjacent lines for explanatory comments
  - [ ] Exclude any files containing `// @atdd` — these are intentionally-skipped ATDD scaffolding tests (AC: #1)

- [ ] Separate results by type (AC: #1)
  - [ ] Unit test skips: `apps/dms-material/src/**/*.spec.ts`, `apps/server/src/**/*.spec.ts`
  - [ ] E2E test skips: `apps/dms-material-e2e/src/*.spec.ts`

- [ ] Categorise each skipped test (AC: #2)
  - [ ] Category A — duplicate: another currently-passing test covers the same behaviour → mark for deletion
  - [ ] Category B — unique: no other test covers this behaviour → mark for unskip/fix
  - [ ] Record rationale for each categorisation decision

- [ ] Document inventory in Dev Notes table (AC: #1, #2)
  - [ ] Unit tests table with columns: File | Line | Test Name | Reason | Category
  - [ ] E2E tests table with same columns
  - [ ] Count totals: how many unit skips (A vs B), how many E2E skips (A vs B)

- [ ] Verify no code was changed and `pnpm all` still passes (AC: #3)
  - [ ] Run `pnpm all`
  - [ ] Confirm exit code 0

## Dev Notes

### Background

Epic 3 ("Enable Skipped Unit and E2E Tests") previously resolved the original batch of skipped tests and is done. This epic (82) targets **new** skipped tests that have been added to the codebase since Epic 3 was closed. The inventory created here will directly drive Stories 82.2 (unit tests) and 82.3 (E2E tests).

### Inventory Grep Command

Run from the repo root:

```bash
grep -rn "\.skip\|xit\b\|xdescribe\b\|test\.skip\|it\.skip\|describe\.skip" \
  apps/ \
  --include="*.spec.ts" \
  --include="*.test.ts"
```

### Identify @atdd Exempt Files

```bash
# List all files that contain @atdd (these are EXEMPT — do not include in inventory)
grep -rl "@atdd" apps/ --include="*.spec.ts" --include="*.test.ts"
```

Any skipped test in a file listed by this command must be excluded from the inventory and from all subsequent stories in this epic.

### Inventory Table Format

Record all findings in the following table format (one table for unit tests, one for E2E tests):

```
| File | Line | Test Name | Reason | Category |
|------|------|-----------|--------|----------|
| apps/.../foo.spec.ts | 42 | "should do X" | [comment or "no comment"] | A or B |
```

- **File**: workspace-relative path
- **Line**: line number from grep output
- **Test Name**: the string literal passed to `it()`, `test()`, `describe()`, or the bare test identifier
- **Reason**: inline comment on the skip line or the line immediately above; if none exists, write `"no comment"`
- **Category**: `A` (duplicate — delete in 82.2/82.3) or `B` (unique — unskip/fix in 82.2/82.3)

### Category Definitions

| Category | Meaning | Action in subsequent story |
|----------|---------|---------------------------|
| A | Another currently-passing test covers the identical behaviour | Delete the skipped test (Story 82.2 or 82.3) |
| B | No other test covers this behaviour; represents real coverage | Unskip and fix (Story 82.2 or 82.3) |

### Scope Separation

Count and report separately:

- **Unit tests**: `apps/dms-material/src/**/*.spec.ts` and `apps/server/src/**/*.spec.ts`
- **E2E tests**: `apps/dms-material-e2e/src/*.spec.ts`

This separation mirrors the ownership split: Story 82.2 owns unit tests, Story 82.3 owns E2E tests.

### ESLint Context

The ESLint rule `vitest/no-disabled-tests` is set to `warn` in `eslint.config.mjs`, with an `off` override applied to files containing `// @atdd`. This means that each non-`@atdd` skip will produce a lint warning in CI output, which can also serve as a supplementary signal when reading CI logs.

### Key Commands

| Purpose | Command |
|---------|---------|
| Inventory grep | `grep -rn "\.skip\|xit\b\|xdescribe\b\|test\.skip\|it\.skip\|describe\.skip" apps/ --include="*.spec.ts" --include="*.test.ts"` |
| Find @atdd exempt files | `grep -rl "@atdd" apps/ --include="*.spec.ts" --include="*.test.ts"` |
| Run all tests (no-change verification) | `pnpm all` |

### Key Files

| File | Purpose |
|------|---------|
| `apps/dms-material/src/**/*.spec.ts` | Angular frontend unit test files |
| `apps/server/src/**/*.spec.ts` | Fastify backend unit test files |
| `apps/dms-material-e2e/src/*.spec.ts` | Playwright E2E test files |
| `eslint.config.mjs` | ESLint config — contains `vitest/no-disabled-tests` rule |

## Dev Agent Record

### Agent Model Used

_TBD_

### Debug Log References

### Completion Notes List

### File List
