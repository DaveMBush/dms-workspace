# Story 92.2: E2E Regression Test — Volatility Present After CSV Import

Status: Approved

## Story

As Dave,
I want a Playwright E2E test that imports a known CSV fixture and then asserts that the
imported symbol has non-null volatility fields in the universe API response,
So that a regression in the import volatility path is caught automatically before a release.

## Acceptance Criteria

1. **Given** a Playwright test fixture containing a single Fidelity CSV row for a known CEF
   ticker (e.g., PDI),
   **When** the fixture CSV is posted to `POST /api/import/fidelity`,
   **Then** a subsequent universe API call for that symbol returns a record where
   `volatilityLong` and `volatilityShort` are non-null values.

2. **Given** the Playwright test suite,
   **When** `pnpm e2e:dms-material:chromium` and `pnpm e2e:dms-material:firefox` run,
   **Then** both pass, including the new import-volatility assertions.

3. **Given** the test environment may not have live internet access,
   **When** the E2E test runs,
   **Then** the `dividendhistory.net` fetch is intercepted (via `page.route` or equivalent)
   and returns a fixture response, so the test is deterministic.

## Tasks / Subtasks

- [ ] Task 1: Identify the correct E2E test file for CSV import
  - [ ] Search in `apps/dms-material-e2e/src/` for existing import-related test files
  - [ ] Understand how other tests intercept external HTTP calls (look for `page.route` or server-level mocking patterns)

- [ ] Task 2: Create or extend the E2E test
  - [ ] Create a CSV fixture file with a single Fidelity-format row for a known symbol (e.g., PDI)
  - [ ] Set up route interception for `dividendhistory.net` to return a fixture with at least 12 monthly distribution rows
  - [ ] After posting the CSV, query the universe endpoint and assert `volatilityLong !== null` and `volatilityShort !== null`

- [ ] Task 3: Verify
  - [ ] `pnpm e2e:dms-material:chromium` passes
  - [ ] `pnpm e2e:dms-material:firefox` passes
  - [ ] `pnpm all` passes

## Dev Notes

### Context

Story 92.1 adds the volatility capture logic to `create-universe-entry.helper.ts`. This story
adds the regression test that would have caught the original bug and will prevent future
regressions.

### Existing Import E2E Tests

Look in `apps/dms-material-e2e/src/` for files related to CSV import. Epic 69 (story
`69-1-write-failing-csv-import-e2e-test.md`) wrote the original import E2E tests — those
files are the best starting point for adding the volatility assertion.

### Intercepting dividendhistory.net

Use Playwright's `page.route` to intercept calls to `dividendhistory.net`. The fixture
should return HTML that mimics the structure parsed in `dividend-history.service.ts`
(`parseDividendTable`). At minimum, include 12+ monthly rows so `calculateVolatility`
returns a non-`insufficient-history` category.

Example interception pattern:
```typescript
await page.route('**/dividendhistory.net/**', (route) => {
  route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: buildDividendHistoryFixtureHtml('PDI'),
  });
});
```

### Universe API Response Shape

After import, the universe GET endpoint returns objects with `volatilityLong` and
`volatilityShort` fields (camelCase, from the server's `mapUniverseToResponse` function in
`apps/server/src/app/routes/universe/index.ts`).

### Test Scope

Playwright E2E only. No new unit tests in this story (unit tests are in Story 92.1).

## Dev Agent Record

### Agent Notes

_To be filled in during implementation._

## File List

_To be populated during implementation._

## Change Log

_To be populated during implementation._
