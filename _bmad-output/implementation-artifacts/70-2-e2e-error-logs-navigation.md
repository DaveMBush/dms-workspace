# Story 70.2: Add E2E Regression Test for Error Logs Navigation

Status: Approved

## Story

As a developer,
I want an E2E test that explicitly navigates to the Error Logs page and asserts it loads,
so that accidental route removal is caught immediately in CI.

## Acceptance Criteria

1. **Given** a new test added to `apps/dms-material-e2e/src/error-logs.spec.ts` (or `accounts.spec.ts` if a dedicated file is not desired), **When** the test clicks the "Error Logs" nav link in the shell navigation, **Then** the URL becomes `/global/error-logs` and the page body is visible with no runtime errors.

2. **Given** the e2e test, **When** `pnpm all` runs, **Then** the test is green and no previously passing test regresses.

## Tasks / Subtasks

- [ ] **Task 1: Identify the nav link selector for Error Logs** (AC: #1)
  - [ ] Subtask 1.1: Use the Playwright MCP server to inspect the shell navigation (`ShellComponent`) — find the selector or accessible role/name for the "Error Logs" nav link (likely a `<a>` or `<button>` with text "Error Logs" or a `data-testid`)
  - [ ] Subtask 1.2: Read `apps/dms-material/src/app/shell/shell.component.html` or equivalent to confirm the nav link markup and its text/testid

- [ ] **Task 2: Decide on host spec file** (AC: #1)
  - [ ] Subtask 2.1: Check if `apps/dms-material-e2e/src/error-logs.spec.ts` already exists; if not, create a new dedicated file
  - [ ] Subtask 2.2: Alternatively, add to `accounts.spec.ts` if the test naturally fits there (the epic leaves the choice open)

- [ ] **Task 3: Write the E2E test** (AC: #1, #2)
  - [ ] Subtask 3.1: Create `apps/dms-material-e2e/src/error-logs.spec.ts` (preferred) with the following structure:
    - `test.beforeEach`: call `login(page)` and navigate to a page that renders the shell nav (e.g. `/global/universe` or `/dashboard`)
    - Test: click the "Error Logs" nav link
    - Assert: `page.url()` ends with `/global/error-logs`
    - Assert: no `NG04002` error in browser console
    - Assert: a known element from `GlobalErrorLogsComponent` is visible (e.g. the page heading, or the main content container)
  - [ ] Subtask 3.2: If the nav link is not always visible (e.g. behind a menu), use the Playwright MCP server to reproduce the correct click sequence before writing the test
  - [ ] Subtask 3.3: If the `GlobalErrorLogsComponent` renders a specific `data-testid` or heading, assert its visibility to confirm the component loaded

- [ ] **Task 4: Confirm the test is green** (AC: #2)
  - [ ] Subtask 4.1: Run `pnpm all` and confirm the new test passes
  - [ ] Subtask 4.2: Confirm `accessibility.spec.ts` continues to pass (it also tests the same route)

## Dev Notes

### Background

Story 70.1 restores the `global/error-logs` route entry in `app.routes.ts`. This story adds an explicit E2E regression test so that any future removal of the route is caught immediately by CI. The test should navigate via the nav link (not direct URL) to test the full user journey.

### Key Files

| File | Purpose |
|------|---------|
| `apps/dms-material-e2e/src/error-logs.spec.ts` | New regression test (create this file) |
| `apps/dms-material/src/app/shell/shell.component.html` | Shell navigation markup — find "Error Logs" nav link selector |
| `apps/dms-material/src/app/global/global-error-logs/global-error-logs.ts` | Component being tested — read to find a reliable visible element to assert |
| `apps/dms-material-e2e/src/accessibility.spec.ts` | Line 142 already tests this route via direct navigation — this story adds a nav-click test |
| `apps/dms-material-e2e/src/helpers/login.helper.ts` | Login helper used in `beforeEach` |

### Notes on Nav Link Discovery

Use the Playwright MCP server to:
1. Navigate to the app (logged in)
2. Take a snapshot of the shell navigation
3. Find the "Error Logs" link — likely `page.getByRole('link', { name: 'Error Logs' })` or `page.locator('[data-testid="nav-error-logs"]')`

### Notes on GlobalErrorLogsComponent Assertion

Read `apps/dms-material/src/app/global/global-error-logs/global-error-logs.ts` and its template to find a reliable visible element. Common choices:
- `page.getByRole('heading', { name: 'Error Logs' })` (if the component has a heading)
- `page.locator('[data-testid="error-logs-container"]')` (if a testid exists)
- `page.locator('dms-global-error-logs')` (component host element selector)

A `NG04002` console error means the route was not found — check console messages with `page.on('console', ...)` or use `.toBeVisible()` on the component element as a sufficient proxy.

### Project Structure Notes

- E2E tests: `apps/dms-material-e2e/src/`
- Helper imports: `login` from `./helpers/login.helper`
- `pnpm all` must be fully green after this story

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-13.md - Epic 70 Story 70.2]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
