# Story 82.1: Inventory All Skipped Tests

Status: Done

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

- [x] Run grep to locate all skipped tests (AC: #1)

  - [x] Execute the inventory grep from repo root `/home/dave/code/dms-workspace/`
  - [x] Capture file path, line number, and test name for each match
  - [x] Check adjacent lines for explanatory comments
  - [x] Exclude any files containing `// @atdd` — these are intentionally-skipped ATDD scaffolding tests (AC: #1)

- [x] Separate results by type (AC: #1)

  - [x] Unit test skips: `apps/dms-material/src/**/*.spec.ts`, `apps/server/src/**/*.spec.ts`
  - [x] E2E test skips: `apps/dms-material-e2e/src/*.spec.ts`

- [x] Categorise each skipped test (AC: #2)

  - [x] Category A — duplicate: another currently-passing test covers the same behaviour → mark for deletion
  - [x] Category B — unique: no other test covers this behaviour → mark for unskip/fix
  - [x] Record rationale for each categorisation decision

- [x] Document inventory in Dev Notes table (AC: #1, #2)

  - [x] Unit tests table with columns: File | Line | Test Name | Reason | Category
  - [x] E2E tests table with same columns
  - [x] Count totals: how many unit skips (A vs B), how many E2E skips (A vs B)

- [x] Verify no code was changed and `pnpm all` still passes (AC: #3)
  - [x] Run `pnpm all`
  - [x] Confirm exit code 0

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

| Category | Meaning                                                       | Action in subsequent story                   |
| -------- | ------------------------------------------------------------- | -------------------------------------------- |
| A        | Another currently-passing test covers the identical behaviour | Delete the skipped test (Story 82.2 or 82.3) |
| B        | No other test covers this behaviour; represents real coverage | Unskip and fix (Story 82.2 or 82.3)          |

### Scope Separation

Count and report separately:

- **Unit tests**: `apps/dms-material/src/**/*.spec.ts` and `apps/server/src/**/*.spec.ts`
- **E2E tests**: `apps/dms-material-e2e/src/*.spec.ts`

This separation mirrors the ownership split: Story 82.2 owns unit tests, Story 82.3 owns E2E tests.

### Inventory Results

#### @atdd Exempt Files

No files contain `// @atdd`. All skipped tests below are included in the inventory.

#### Unit Tests — dms-material (Angular frontend)

| File                                                                                    | Line | Test Name                                                 | Reason                                                            | Category |
| --------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------- | ----------------------------------------------------------------- | -------- |
| apps/dms-material/src/app/shared/services/symbol-search.service.spec.ts                 | 206  | `it.skip('should debounce search requests by 300ms')`     | BLOCKED: debouncing requires service API redesign (issue #690)    | B        |
| apps/dms-material/src/app/shared/services/symbol-search.service.spec.ts                 | 234  | `it.skip('should not debounce separate search sessions')` | BLOCKED: debouncing requires service API redesign (issue #690)    | B        |
| apps/dms-material/src/app/global/import-dialog/file-upload-validation.spec.ts           | 84   | `describe.skip('file size validation')`                   | BLOCKED: file upload features not implemented (Story AR.4)        | B        |
| apps/dms-material/src/app/global/import-dialog/file-upload-validation.spec.ts           | 134  | `describe.skip('file content preview')`                   | BLOCKED: file upload features not implemented (Story AR.4)        | B        |
| apps/dms-material/src/app/global/import-dialog/file-upload-validation.spec.ts           | 197  | `describe.skip('FormData creation')`                      | BLOCKED: file upload features not implemented (Story AR.4)        | B        |
| apps/dms-material/src/app/global/import-dialog/file-upload-validation.spec.ts           | 257  | `describe.skip('upload progress tracking')`               | BLOCKED: file upload features not implemented (Story AR.4)        | B        |
| apps/dms-material/src/app/global/import-dialog/file-upload-validation.spec.ts           | 313  | `describe.skip('upload cancellation')`                    | BLOCKED: file upload features not implemented (Story AR.4)        | B        |
| apps/dms-material/src/app/global/import-dialog/file-upload-validation.spec.ts           | 386  | `describe.skip('file type validation edge cases')`        | BLOCKED: file upload features not implemented (Story AR.4)        | B        |
| apps/dms-material/src/app/global/import-dialog/file-upload-validation.spec.ts           | 439  | `describe.skip('empty and corrupted file handling')`      | BLOCKED: file upload features not implemented (Story AR.4)        | B        |
| apps/dms-material/src/app/account-panel/open-positions/open-positions.component.spec.ts | 322  | `describe.skip('Data Transformation for Display')`        | BLOCKED: unrealized gain calculation not implemented (Story AO.2) | B        |

**Unit dms-material subtotal: 10 — Cat A: 0, Cat B: 10**

#### Unit Tests — server (Fastify backend)

| File                                                                            | Line | Test Name                                                                     | Reason                                                                       | Category |
| ------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------- |
| apps/server/src/app/prisma/optimized-prisma-client.spec.ts                      | 12   | `describe.skip('OptimizedPrismaClient')`                                      | BLOCKED: needs database schema setup with Prisma migrations for test DB      | B        |
| apps/server/src/app/prisma/prisma-client.spec.ts                                | 55   | `it.skip('should handle database connection errors gracefully')`              | BLOCKED: SQLite accepts any path; test appropriate for PostgreSQL only       | B        |
| apps/server/src/app/prisma/prisma-client.spec.ts                                | 87   | `it.skip('should handle connection failures with retry logic')`               | BLOCKED: SQLite connection never fails; test appropriate for PostgreSQL only | B        |
| apps/server/src/app/routes/summary/get-risk-group-data.function.spec.ts         | 23   | `describe.skipIf(CI)('getRiskGroupData')`                                     | BLOCKED: integration test requires live database in CI                       | B        |
| apps/server/src/app/routes/universe/sync-from-screener/sync.integration.spec.ts | 24   | `describe.skipIf(CI)('sync-from-screener database integration tests')`        | BLOCKED: integration test requires live database in CI                       | B        |
| apps/server/src/app/routes/universe/delete-universe.spec.ts                     | 98   | `describe.skipIf(CI)('DELETE /universe/:id')`                                 | BLOCKED: integration test requires live database in CI                       | B        |
| apps/server/src/app/services/database-performance-integration.spec.ts           | 262  | `it.skip('should record and track authentication operations')`                | BLOCKED: optimizer service doesn't call monitor for metrics tracking         | B        |
| apps/server/src/app/services/database-performance-integration.spec.ts           | 348  | `describe.skip('Performance Benchmarks - 30% Reduction Target')`              | BLOCKED: benchmark thresholds need tuning for test environment               | B        |
| apps/server/src/app/services/database-performance-integration.spec.ts           | 424  | `it.skip('should maintain connection pool efficiency during load')`           | BLOCKED: optimizer service doesn't call monitor for metrics tracking         | B        |
| apps/server/src/app/services/database-performance-integration.spec.ts           | 450  | `it.skip('should provide accurate performance monitoring during operations')` | BLOCKED: optimizer service doesn't call monitor for metrics tracking         | B        |

**Unit server subtotal: 10 — Cat A: 0, Cat B: 10**

**Total unit test skips: 20 — Cat A: 0, Cat B: 20**

#### E2E Tests — dms-material-e2e (Playwright)

| File                                                       | Line | Test Name                                                                                                         | Reason                                                                   | Category |
| ---------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------- |
| apps/dms-material-e2e/src/session-warning.spec.ts          | 8    | `test.describe.skip('Session Warning Dialog')`                                                                    | BLOCKED: needs test hook mechanism to trigger session warning dialog     | B        |
| apps/dms-material-e2e/src/session-warning.spec.ts          | 134  | `test.skip()` (inside `'should auto-logout when timer reaches zero'`, which is inside describe.skip above)        | BLOCKED: same as parent describe                                         | B        |
| apps/dms-material-e2e/src/sold-positions.spec.ts           | 259  | `test.describe.skip('Date Range Filtering')`                                                                      | BLOCKED: date range filtering not implemented (stories AP.5/AP.6)        | B        |
| apps/dms-material-e2e/src/universe-table-workflows.spec.ts | 351  | `test.skip('should display delete button for deletable symbols')` (inside active `describe('Symbol Deletion')`)   | BLOCKED: symbol deletion not fully testable (TODO E3)                    | B        |
| apps/dms-material-e2e/src/universe-table-workflows.spec.ts | 384  | `test.skip('should show confirmation dialog when delete is clicked')`                                             | BLOCKED: symbol deletion not fully testable (TODO E3)                    | B        |
| apps/dms-material-e2e/src/universe-table-workflows.spec.ts | 398  | `test.skip('should cancel deletion when Cancel is clicked')`                                                      | BLOCKED: symbol deletion not fully testable (TODO E3)                    | B        |
| apps/dms-material-e2e/src/universe-table-workflows.spec.ts | 416  | `test.skip('should remove symbol when deletion is confirmed')`                                                    | BLOCKED: symbol deletion not fully testable (TODO E3)                    | B        |
| apps/dms-material-e2e/src/universe-table-workflows.spec.ts | 440  | `test.skip('should show success notification after deletion')`                                                    | BLOCKED: symbol deletion not fully testable (TODO E3)                    | B        |
| apps/dms-material-e2e/src/universe-table-workflows.spec.ts | 491  | `test.skip('should validate symbol format before adding')`                                                        | BLOCKED: add symbol feature not fully testable (TODO E3)                 | B        |
| apps/dms-material-e2e/src/universe-table-workflows.spec.ts | 509  | `test.skip('should add symbol to table on successful submission')`                                                | BLOCKED: add symbol feature not fully testable (TODO E3)                 | B        |
| apps/dms-material-e2e/src/universe-table-workflows.spec.ts | 534  | `test.skip('should show success notification after adding symbol')`                                               | BLOCKED: add symbol feature not fully testable (TODO E3)                 | B        |
| apps/dms-material-e2e/src/universe-table-workflows.spec.ts | 552  | `test.skip('should handle duplicate symbol error')`                                                               | BLOCKED: add symbol feature not fully testable (TODO E3)                 | B        |
| apps/dms-material-e2e/src/universe-table-workflows.spec.ts | 575  | `test.describe.skip('Update Fields Operation')`                                                                   | BLOCKED: TDD RED phase (Story AN.12 will enable)                         | B        |
| apps/dms-material-e2e/src/universe-table-workflows.spec.ts | 670  | `test.describe.skip('Filter Combinations')`                                                                       | BLOCKED: TDD RED phase (Story AN.12 will enable)                         | B        |
| apps/dms-material-e2e/src/universe-table-workflows.spec.ts | 799  | `test.describe.skip('Table Refresh')`                                                                             | BLOCKED: TDD RED phase (Story AN.12 will enable)                         | B        |
| apps/dms-material-e2e/src/universe-table-workflows.spec.ts | 855  | `test.describe.skip('Edge Cases and Error Handling')`                                                             | BLOCKED: TDD RED phase (Story AN.12 will enable)                         | B        |
| apps/dms-material-e2e/src/universe-table-workflows.spec.ts | 980  | `test.describe.skip('Accessibility and Keyboard Navigation')`                                                     | BLOCKED: TDD RED phase (Story AN.12 will enable)                         | B        |
| apps/dms-material-e2e/src/editable-cell.spec.ts            | 6    | `test.describe.skip('Editable Cell Component')`                                                                   | BLOCKED: EditableCell not integrated into a feature page (TODO E3)       | B        |
| apps/dms-material-e2e/src/open-positions.spec.ts           | 63   | `test.skip('should add new position via dialog')`                                                                 | BLOCKED: requires universe data seeding in test database (TODO E3)       | B        |
| apps/dms-material-e2e/src/open-positions.spec.ts           | 213  | `test.skip('should edit quantity inline')`                                                                        | BLOCKED: requires universe data seeding (TODO E3)                        | B        |
| apps/dms-material-e2e/src/open-positions.spec.ts           | 280  | `test.skip('should edit buy price inline')`                                                                       | BLOCKED: requires universe data seeding (TODO E3)                        | B        |
| apps/dms-material-e2e/src/open-positions.spec.ts           | 343  | `test.skip('should edit buy date inline')`                                                                        | BLOCKED: requires universe data seeding (TODO E3)                        | B        |
| apps/dms-material-e2e/src/open-positions.spec.ts           | 406  | `test.skip('should cancel inline edit with escape key')`                                                          | BLOCKED: requires universe data seeding (TODO E3)                        | B        |
| apps/dms-material-e2e/src/open-positions.spec.ts           | 472  | `test.skip('should filter positions by symbol')`                                                                  | BLOCKED: requires universe data seeding (TODO E3)                        | B        |
| apps/dms-material-e2e/src/open-positions.spec.ts           | 548  | `test.skip('should delete position')`                                                                             | BLOCKED: requires universe data seeding (TODO E3)                        | B        |
| apps/dms-material-e2e/src/summary-display.spec.ts          | 70   | `test.skip(browserName === 'webkit', 'Chart resize flaky on webkit')` (inside `'charts resize on window resize'`) | Conditional: Chart.js resize inconsistent on webkit (TODO E3)            | B        |
| apps/dms-material-e2e/src/symbol-filter-header.spec.ts     | 9    | `test.skip('should display filter dropdown with options')`                                                        | BLOCKED: symbol filter header feature not implemented (TODO E3)          | B        |
| apps/dms-material-e2e/src/symbol-filter-header.spec.ts     | 18   | `test.skip('should filter table data when option selected')`                                                      | BLOCKED: symbol filter header feature not implemented (TODO E3)          | B        |
| apps/dms-material-e2e/src/symbol-filter-header.spec.ts     | 29   | `test.skip('should show all data when "All" option selected')`                                                    | BLOCKED: symbol filter header feature not implemented (TODO E3)          | B        |
| apps/dms-material-e2e/src/symbol-filter-header.spec.ts     | 40   | `test.skip('should fit filter within table header cell')`                                                         | BLOCKED: symbol filter header feature not implemented (TODO E3)          | B        |
| apps/dms-material-e2e/src/symbol-filter-header.spec.ts     | 47   | `test.skip('should navigate filter options with keyboard')`                                                       | BLOCKED: symbol filter header feature not implemented (TODO E3)          | B        |
| apps/dms-material-e2e/src/symbol-filter-header.spec.ts     | 58   | `test.skip('should close dropdown with Escape key')`                                                              | BLOCKED: symbol filter header feature not implemented (TODO E3)          | B        |
| apps/dms-material-e2e/src/symbol-filter-header.spec.ts     | 67   | `test.skip('should close dropdown when clicking outside')`                                                        | BLOCKED: symbol filter header feature not implemented (TODO E3)          | B        |
| apps/dms-material-e2e/src/symbol-filter-header.spec.ts     | 77   | `test.skip('should render many options performantly')`                                                            | BLOCKED: symbol filter header feature not implemented (TODO E3)          | B        |
| apps/dms-material-e2e/src/symbol-filter-header.spec.ts     | 88   | `test.skip('should show active filter indicator when not "All"')`                                                 | BLOCKED: symbol filter header feature not implemented (TODO E3)          | B        |
| apps/dms-material-e2e/src/symbol-filter-header.spec.ts     | 100  | `test.skip('should announce filter changes to screen readers')`                                                   | BLOCKED: symbol filter header feature not implemented (TODO E3)          | B        |
| apps/dms-material-e2e/src/accounts.spec.ts                 | 7    | `test.describe.skip('Account List')`                                                                              | BLOCKED: accounts cannot be added via the UI yet (TODO E3)               | B        |
| apps/dms-material-e2e/src/electron-launch.spec.ts          | 26   | `test.skip(true, 'Electron dist not built...')`                                                                   | Conditional: electron dist not present in test environment               | B        |
| apps/dms-material-e2e/src/symbol-autocomplete.spec.ts      | 6    | `test.describe.skip('Symbol Autocomplete Component')`                                                             | BLOCKED: SymbolAutocomplete not integrated into a feature page (TODO E3) | B        |
| apps/dms-material-e2e/src/add-symbol-dialog.spec.ts        | 158  | `test.skip(true, 'Risk groups not loaded...')` (inside `'should display risk group dropdown'`)                    | Conditional: SmartNgRX store timing issue (TODO E3)                      | B        |
| apps/dms-material-e2e/src/add-symbol-dialog.spec.ts        | 199  | `test.skip(true, 'Risk groups not loaded...')` (inside `'should select risk group when option clicked'`)          | Conditional: SmartNgRX store timing issue (TODO E3)                      | B        |

**E2E subtotal: 41 — Cat A: 0, Cat B: 41**

#### Grand Total

| Scope             | Total  | Cat A (delete) | Cat B (unskip/fix) |
| ----------------- | ------ | -------------- | ------------------ |
| Unit dms-material | 10     | 0              | 10                 |
| Unit server       | 10     | 0              | 10                 |
| E2E               | 41     | 0              | 41                 |
| **TOTAL**         | **61** | **0**          | **61**             |

All 61 skipped tests are Category B (unique coverage, no duplicates found). Zero are Category A. All are blocked on unimplemented features, integration constraints, or TDD RED-phase scaffolding.

### ESLint Context

The ESLint rule `vitest/no-disabled-tests` is set to `warn` in `eslint.config.mjs`, with an `off` override applied to files containing `// @atdd`. This means that each non-`@atdd` skip will produce a lint warning in CI output, which can also serve as a supplementary signal when reading CI logs.

### Key Commands

| Purpose                                | Command                                                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Inventory grep                         | `grep -rn "\.skip\|xit\b\|xdescribe\b\|test\.skip\|it\.skip\|describe\.skip" apps/ --include="*.spec.ts" --include="*.test.ts"` |
| Find @atdd exempt files                | `grep -rl "@atdd" apps/ --include="*.spec.ts" --include="*.test.ts"`                                                            |
| Run all tests (no-change verification) | `pnpm all`                                                                                                                      |

### Key Files

| File                                  | Purpose                                                  |
| ------------------------------------- | -------------------------------------------------------- |
| `apps/dms-material/src/**/*.spec.ts`  | Angular frontend unit test files                         |
| `apps/server/src/**/*.spec.ts`        | Fastify backend unit test files                          |
| `apps/dms-material-e2e/src/*.spec.ts` | Playwright E2E test files                                |
| `eslint.config.mjs`                   | ESLint config — contains `vitest/no-disabled-tests` rule |

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

- Grep run from worktree `/home/dave/code/dms/story-82.1` against `apps/` directory
- No `@atdd` exempt files found — all matches included
- False positives filtered: `accessibility.spec.ts:632` (`.skip-link` CSS selector), `top/index.spec.ts:609,805` (`universeCall.skip` property access), and comment-only lines in `indexes-open-trades.spec.ts:8`, `indexes-sold-trades.spec.ts:8`, `file-upload-handling.spec.ts:36`
- `skipIf(process.env.CI)` variants included (3 server integration test suites)

### Completion Notes List

- Zero Category A (duplicate) entries found — every skipped test covers unique behaviour
- All 61 skips are Category B (unskip/fix in Stories 82.2/82.3)
- `pnpm all` passes with exit code 0; no code was modified in this story
- Three server tests use `describe.skipIf(process.env.CI)` — they run locally but skip in CI due to missing live database; Story 82.2 should consider these carefully
- Conditional `test.skip(true, ...)` calls in `add-symbol-dialog.spec.ts` and `electron-launch.spec.ts` only trigger at runtime under specific conditions; they still count as skipped coverage

### File List

- `_bmad-output/implementation-artifacts/82-1-inventory-skipped-tests.md` (this file — inventory added to Dev Notes)

### Change Log

| Date       | Change                                                                               | Author            |
| ---------- | ------------------------------------------------------------------------------------ | ----------------- |
| 2026-04-22 | Inventory of 61 skipped tests added to Dev Notes; all tasks completed; Status → Done | Claude Sonnet 4.6 |
