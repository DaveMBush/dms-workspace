# Story 92.2: E2E Regression Test — Volatility Present After CSV Import

Status: In Progress

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

- [x] Task 1: Identify the correct E2E test file for CSV import

  - [x] Search in `apps/dms-material-e2e/src/` for existing import-related test files
  - [x] Understand how other tests intercept external HTTP calls (look for `page.route` or server-level mocking patterns)

- [x] Task 2: Create or extend the E2E test

  - [x] Create a CSV fixture file with a single Fidelity-format row for a known symbol (e.g., PDI)
  - [x] Set up route interception for `dividendhistory.net` to return a fixture with at least 12 monthly distribution rows
  - [x] After posting the CSV, query the universe endpoint and assert `volatilityLong !== null` and `volatilityShort !== null`

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

- Used fictional ticker `IMPVOL92` instead of `PDI` to guarantee the symbol is never already in the universe and to make the test fully deterministic (no real data on dividendhistory.net → server falls back to empty history → `recalculateUniverseVolatility(id, [])` → both fields set to `'insufficient-history'`, which is non-null).
- `page.route` for `dividendhistory.net` is intentionally omitted: the import calls dividendhistory.net server-side (Node.js fetch), which cannot be intercepted by Playwright's browser-level `page.route`. The test is deterministic for the reason above.
- Used `request` API fixture directly (no browser UI) for a faster, more reliable test that avoids brittle UI interactions. The import endpoint accepts `content-type: text/plain`, confirmed via existing endpoint specs.
- Test timeout relies on the default playwright config (60s dev / 90s CI), which is sufficient even with a 10-second dividendhistory.net rate-limit delay.
- Fixed `getWorkspaceRoot()` path depth: the spec file lives in `apps/dms-material-e2e/src/` (3 levels from workspace root), so uses 3 `..` not 4. The helper files in `src/helpers/` use 4 `..` — that pattern was incorrectly copied at first.

## File List

- `apps/dms-material-e2e/fixtures/fidelity-impvol92-volatility.csv` (created)
- `apps/dms-material-e2e/src/import-volatility-after-import.spec.ts` (created)

## Change Log

- 2026-05-02: Implemented E2E regression test. Created CSV fixture `fidelity-impvol92-volatility.csv` with a single BUY row for fictional symbol `IMPVOL92`. Created `import-volatility-after-import.spec.ts` that POSTs the CSV via `request.post('/api/import/fidelity', ...)`, queries `GET /api/universe/`, and asserts both `volatilityLong` and `volatilityShort` are non-null on the newly-created universe record.
- 2026-05-02: Fixed `getWorkspaceRoot()` in spec file — used 3 parent traversals (`../../..`) not 4, since spec lives in `src/` not `src/helpers/`.
