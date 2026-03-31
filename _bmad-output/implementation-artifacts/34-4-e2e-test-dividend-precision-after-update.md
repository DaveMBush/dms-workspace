# Story 34.4: Add E2E Test for Dividend Precision After Update

Status: Approved

## Story

As Dave (the investor),
I want an end-to-end test that verifies the dividend amount displayed in the UI after an update operation has more decimal precision than Yahoo Finance provides,
so that there is a regression guard against accidentally reverting to the lower-precision source.

## Acceptance Criteria

1. **Given** a test symbol whose dividend history is available from the new source with ≥ 4 decimal places, **When** the e2e test triggers a dividend update action (e.g. via the Update Fields flow or a dedicated API call), **Then** the test asserts that the stored dividend amount has ≥ 4 significant decimal places (i.e. the 4th decimal place is non-zero for a known ticker).
2. **Given** the e2e test is part of the Playwright suite, **When** `pnpm e2e` runs, **Then** the test passes in the CI environment.
3. **Given** the test requires network access to the new dividend source, **When** the test environment does not allow external network access, **Then** the test is designed to use a recorded/mocked response (MSW or test fixture) so it can run offline in CI.

## Definition of Done

- [ ] Playwright e2e test added under `apps/dms-material-e2e/`
- [ ] Test verifies ≥ 4 decimal place precision for at least one known ticker
- [ ] Test is appropriately isolated (mock or fixture if needed for CI)
- [ ] `pnpm e2e` passes
- [ ] `pnpm all` passes

## Tasks / Subtasks

- [ ] Identify a suitable known ticker (e.g. `PDI`) that provides ≥ 4 decimal dividend precision from the new source (AC: #1)
- [ ] Create Playwright test file (or add to existing) under `apps/dms-material-e2e/` (AC: #2)
  - [ ] Navigate to the Universe Screen with the test ticker present
  - [ ] Trigger the dividend update via the UI or direct API call
  - [ ] Assert the displayed dividend amount has ≥ 4 significant decimal places
- [ ] Add a mock/fixture for the new dividend source HTTP response to enable offline CI execution (AC: #3)
  - [ ] Use MSW or Playwright route interception to intercept and replay the dividend source response
- [ ] Run `pnpm e2e` and confirm the test passes
- [ ] Run `pnpm all` and fix any failures

## Dev Notes

### Key Files

- `apps/dms-material-e2e/` — existing Playwright test suite; follow existing test naming and fixture conventions
- `apps/server/src/app/routes/common/dividend-history.service.ts` — the service under test (via the full stack)
- Existing e2e fixtures/mocks — check for patterns using MSW or Playwright `page.route()` interception

### Approach

This is an end-to-end regression test. Use Playwright `page.route()` to intercept requests to the new dividend source and return a fixture response that includes a known ticker's dividend with 4+ decimal places. The test should: (1) seed the universe with the test ticker if not present, (2) trigger an update, (3) read the displayed dividend value from the UI, (4) assert the precision. Use string-based assertion (`.toMatch(/\.\d{4,}/)`) rather than numeric comparison to avoid floating-point rounding.

## Dev Agent Record

### Agent Model Used

### Completion Notes

## File List
