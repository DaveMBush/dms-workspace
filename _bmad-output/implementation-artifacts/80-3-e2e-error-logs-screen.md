# Story 80.3: E2E Test — Error Logs Screen Renders and Deletes Files

Status: Done

## Story

As a developer,
I want a Playwright E2E test that navigates to the Error Logs screen, asserts the file-viewer is rendered, and verifies that a file can be deleted,
so that future refactors cannot break the route again without failing CI.

## Acceptance Criteria

1. **Given** at least one error log file exists in test environment's logs directory,
   **When** E2E test navigates to Error Logs route,
   **Then** file-viewer component is rendered and at least one file name is visible (summary stub must NOT be rendered).

2. **Given** a visible error log file,
   **When** E2E test clicks Delete button for that file,
   **Then** file disappears from list and no error message is shown.

3. **Given** E2E test committed,
   **When** `pnpm all` runs,
   **Then** new test passes along with all pre-existing tests.

## Tasks / Subtasks

- [x] Task 1: Explore existing E2E structure and helpers (AC: #1, #2)

  - [x] List `apps/dms-material-e2e/src/` to find existing spec patterns and helper files
  - [x] Find and read the login helper: `apps/dms-material-e2e/src/helpers/login.helper.ts`
  - [x] Find the Error Logs route URL from `apps/dms-material/src/app/app.routes.ts`
  - [x] Inspect the restored ErrorLog component template (from Story 80.2) to identify selectors for: file list, individual file rows, Delete buttons

- [x] Task 2: Identify or create test log file seeding mechanism (AC: #1)

  - [x] Check if `logs/` directory already contains files that would be available in the E2E test environment
  - [x] If not, add `beforeEach` that creates a test log file (e.g., `test-e2e-error.log`) using `fs.writeFileSync` in the test
  - [x] Alternatively, call a test endpoint if one exists — check server routes
  - [x] Ensure `afterAll` cleans up the test log file to avoid test pollution

- [x] Task 3: Write E2E spec file (AC: #1, #2)

  - [x] Extend existing `apps/dms-material-e2e/src/error-logs.spec.ts` with new describe block
  - [x] `beforeEach`: create test log file in `logs/` directory using `fs.writeFileSync` (handles retries)
  - [x] `afterAll`: delete any remaining test log files
  - [x] Test 1: login → navigate to Error Logs route → assert file-viewer renders (not stub) → assert at least one filename visible
  - [x] Test 2: click Delete on the test log file → assert that file row disappears from list → assert no error message
  - [x] Named functions for all callbacks — no anonymous arrow functions

- [x] Task 4: Verify stub is NOT rendered (AC: #1)

  - [x] Identify the stub component's selector or unique text from the current (broken) route state
  - [x] Add an assertion that the stub is NOT present after routing fix is in place
  - [x] This confirms the regression guard works correctly

- [x] Task 5: Run full test suite (AC: #3)
  - [x] Run `pnpm all` and confirm all tests pass
  - [x] Run `pnpm e2e:dms-material:chromium` to run E2E specifically
  - [x] Do not modify pre-existing tests

## Dev Notes

### Prerequisites

Story 80.2 must be completed — the file-viewer component must be restored and the route must be fixed before E2E tests can pass.

### E2E Test Structure

```typescript
// apps/dms-material-e2e/src/error-logs.spec.ts
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { login } from './helpers/login.helper'; // adjust path

const TEST_LOG_FILE = 'test-e2e-error.log';
const LOGS_DIR = path.resolve(__dirname, '../../../../logs'); // adjust relative path to workspace root logs/
const TEST_LOG_PATH = path.join(LOGS_DIR, TEST_LOG_FILE);

// Find the actual route URL from app.routes.ts
const ERROR_LOGS_ROUTE = '/error-logs'; // confirm from Angular router config

test.describe('Error Logs screen', () => {
  test.beforeAll(async function createTestLogFile() {
    fs.writeFileSync(TEST_LOG_PATH, 'Test error log content for E2E\n', 'utf8');
  });

  test.afterAll(async function cleanupTestLogFiles() {
    if (fs.existsSync(TEST_LOG_PATH)) {
      fs.unlinkSync(TEST_LOG_PATH);
    }
  });

  test('renders file-viewer component with at least one log file', async function testFileViewerRenders({ page }) {
    await login(page);
    await page.goto(ERROR_LOGS_ROUTE);
    // Assert file-viewer is rendered — check for a filename or Delete button
    await expect(page.getByText(TEST_LOG_FILE)).toBeVisible();
    // Assert stub component is NOT rendered — adjust text to match actual stub
    await expect(page.getByText('Error Log Summary')).not.toBeVisible(); // adjust if stub has different text
  });

  test('deletes a log file and removes it from list', async function testDeleteLogFile({ page }) {
    await login(page);
    await page.goto(ERROR_LOGS_ROUTE);
    await expect(page.getByText(TEST_LOG_FILE)).toBeVisible();
    // Click Delete button for the test log file row
    // Adjust selector based on component template structure
    await page.getByRole('row', { name: TEST_LOG_FILE }).getByRole('button', { name: 'Delete' }).click();
    // Assert file is gone from list
    await expect(page.getByText(TEST_LOG_FILE)).not.toBeVisible();
    // Assert no error message
    await expect(page.getByRole('alert')).not.toBeVisible();
  });
});
```

### Finding Correct Selectors

Before writing the spec, inspect the restored component template from Story 80.2 to identify:

| Element        | Likely Selector Strategy                             |
| -------------- | ---------------------------------------------------- |
| File rows      | `mat-list-item` or `tr` containing filename text     |
| Delete button  | `button` with text "Delete" or `aria-label="Delete"` |
| File name text | Direct text match or `data-testid` attribute         |
| Stub component | Look for the stub's selector or unique heading text  |

Use the Playwright MCP server to visually inspect the rendered page and confirm selectors before finalising the test.

### Logs Directory Path

The `logs/` directory is at the workspace root: `/home/dave/code/dms-workspace/logs/`. Adjust the `LOGS_DIR` constant in the test to use the correct absolute or relative path.

### Confirming the Route URL

From `apps/dms-material/src/app/app.routes.ts`, find the entry for Error Logs and use that path. Common candidates: `/error-logs`, `/admin/error-logs`, `/logs`.

### Key Commands

| Purpose                 | Command                                               |
| ----------------------- | ----------------------------------------------------- |
| Run all tests           | `pnpm all`                                            |
| Run Chromium E2E        | `pnpm e2e:dms-material:chromium`                      |
| Find Angular routes     | `cat apps/dms-material/src/app/app.routes.ts`         |
| List existing E2E specs | `ls apps/dms-material-e2e/src/`                       |
| Check logs directory    | `ls logs/`                                            |
| Find login helper       | `find apps/dms-material-e2e/src/ -name "*.helper.ts"` |

### Key Files

| File                                                           | Purpose                                                         |
| -------------------------------------------------------------- | --------------------------------------------------------------- |
| `80-2-restore-error-log-viewer.md`                             | Prerequisite — component must be restored first                 |
| `apps/dms-material-e2e/src/error-logs.spec.ts`                 | New E2E spec to create                                          |
| `apps/dms-material-e2e/src/helpers/login.helper.ts`            | Login helper — import into new spec                             |
| `apps/dms-material/src/app/app.routes.ts`                      | Angular router — find Error Logs route URL                      |
| `apps/dms-material/src/app/error-log/error-log.component.html` | Component template — find file list and Delete button selectors |
| `logs/`                                                        | Logs directory — create test file here in beforeAll             |

### Constraints

- Tests are authoritative — do not modify pre-existing tests
- Playwright MCP server must be used for visual selector verification
- Named functions for all callbacks — no anonymous arrow functions
- `beforeAll` must create the test log file; `afterAll` must clean it up to avoid polluting other tests
- The test must be a **regression guard** — it must fail if the route points to the stub instead of the file-viewer

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

- Extended existing `error-logs.spec.ts` (rather than creating a new file) with a `Error Logs Screen` describe block
- Used `beforeEach` (not `beforeAll`) for file creation to handle Playwright retries after the delete test
- Route confirmed as `/global/error-logs`; delete button aria-label is `Delete <displayName>` where displayName strips `.log` and replaces `-` with space
- `logs/` directory is gitignored; test creates it with `mkdirSync({ recursive: true })` if absent

### File List

- `apps/dms-material-e2e/src/error-logs.spec.ts` — extended with new `Error Logs Screen` describe block
