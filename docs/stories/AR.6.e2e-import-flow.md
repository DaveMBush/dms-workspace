# Story AR.6: Add E2E Tests for Import Flow

**Status:** Approved

## Story

**As a** QA engineer
**I want** end-to-end tests for the complete import flow
**So that** the entire import feature is verified from user perspective

## Context

**Current System:**

- All import functionality implemented in stories AR.1-AR.5
- Unit and integration tests cover individual components
- Need E2E tests to verify complete user journey

**Implementation Approach:**

- Write E2E tests using Playwright/Cypress
- Test complete user flow from button click to data display
- Verify integration between all components
- Test happy path and error scenarios

## Acceptance Criteria

### Functional Requirements

1. [ ] E2E test for successful import flow
2. [ ] E2E test for import with validation errors
3. [ ] E2E test for file upload errors
4. [ ] E2E test for account not found error
5. [ ] E2E test for duplicate transaction warning
6. [ ] E2E test for partial success scenario
7. [ ] E2E test verifies data appears in universe table

### Technical Requirements

1. [ ] Tests use project's E2E testing framework (Playwright)
2. [ ] Tests follow existing E2E test patterns
3. [ ] Tests are isolated and repeatable
4. [ ] Test data is cleaned up after tests
5. [ ] Tests run in CI/CD pipeline
6. [ ] Tests have appropriate timeouts and waits

## Tasks / Subtasks

- [x] Set up E2E test infrastructure (AC: 1)
  - [x] Create test file in e2e directory
  - [x] Set up test database with seed data
  - [x] Create test CSV files (valid and invalid)
- [x] Write happy path E2E test (AC: 1, 7)
  - [x] Navigate to Global/Universe screen
  - [x] Click Import button
  - [x] Verify dialog opens
  - [x] Select valid CSV file
  - [x] Click Upload button
  - [x] Verify progress indicator shows
  - [x] Verify success message displays
  - [x] Verify import count is correct
  - [x] Verify dialog closes
  - [x] Verify data appears in universe table
  - [x] Verify data persisted in database
- [x] Write validation error test (AC: 2)
  - [x] Upload CSV with invalid data
  - [x] Verify error messages display
  - [x] Verify row numbers shown
  - [x] Verify field names shown
  - [x] Verify dialog stays open
- [x] Write file upload error test (AC: 3)
  - [x] Try to upload non-CSV file
  - [x] Verify error message
  - [x] Try to upload oversized file
  - [x] Verify error message
- [x] Write account not found test (AC: 4)
  - [x] Upload CSV with non-existent account name
  - [x] Verify specific error message
  - [x] Verify which row(s) had issue
- [x] Write duplicate warning test (AC: 5)
  - [x] Upload CSV with transactions already in database
  - [x] Verify warning message displays
  - [x] Verify data not duplicated
- [x] Write partial success test (AC: 6)
  - [x] Upload CSV with mix of valid and invalid rows
  - [x] Verify valid rows imported
  - [x] Verify invalid rows reported
  - [x] Verify counts are correct
  - [x] Verify only valid data in database
- [x] Add cleanup logic
  - [x] Delete test data after each test
  - [x] Reset database to known state
- [x] Run E2E tests and verify passing
- [x] Run validation commands

## Dev Notes

### Testing Standards

- **Test Location:** `apps/dms-material-e2e/src/**/*.spec.ts`
- **Testing Framework:** Playwright
- **Patterns:** Page Object Model for reusability
- **Coverage:** Cover critical user paths

### Technical Context

- **E2E Test Structure:**

  ```typescript
  test.describe('Fidelity Import', () => {
    test.beforeEach(async ({ page }) => {
      // Set up test database
      // Navigate to Global/Universe screen
      // Log in as test user
    });

    test.afterEach(async () => {
      // Clean up test data
    });

    test('should import valid CSV successfully', async ({ page }) => {
      // Test steps...
    });
  });
  ```

### Test Data

- Create test CSV files in `apps/dms-material-e2e/fixtures/`:

  - `fidelity-valid.csv` - All valid transactions
  - `fidelity-invalid-account.csv` - Invalid account name
  - `fidelity-invalid-quantity.csv` - Invalid quantity values
  - `fidelity-mixed.csv` - Mix of valid and invalid rows
  - `fidelity-duplicates.csv` - Duplicate transactions

- Seed test database with:
  - Test user
  - Test accounts (matching CSV data)
  - Some existing transactions (for duplicate testing)

### Page Interactions

```typescript
// Click import button
await page.click('[data-testid="import-button"]');

// Upload file
const fileInput = await page.locator('input[type="file"]');
await fileInput.setInputFiles('fixtures/fidelity-valid.csv');

// Click upload
await page.click('[data-testid="upload-button"]');

// Wait for success
await page.waitForSelector('[data-testid="success-message"]');

// Verify message
const message = await page.textContent('[data-testid="success-message"]');
expect(message).toContain('42 transactions imported');

// Verify data in table
const rows = await page.locator('[data-testid="universe-table-row"]').count();
expect(rows).toBeGreaterThan(0);
```

### E2E Test Scenarios

1. **Happy Path:**

   - User clicks Import → selects valid CSV → uploads → sees success → data appears

2. **Validation Errors:**

   - User uploads invalid CSV → sees detailed errors → can fix and retry

3. **File Upload Errors:**

   - User tries wrong file type → sees clear error
   - User tries oversized file → sees clear error

4. **Account Not Found:**

   - User uploads CSV with wrong account name → sees specific error

5. **Duplicates:**

   - User uploads CSV with existing transactions → sees warnings

6. **Partial Success:**
   - User uploads mix of valid/invalid → sees which succeeded/failed

## Definition of Done

- [x] All E2E tests written and passing
- [x] Tests cover all acceptance criteria scenarios
- [x] Test data setup and cleanup working
- [x] Tests are stable and repeatable
- [x] Tests run in CI/CD pipeline
- [x] Test code follows project conventions
- [x] All validation commands pass:
  - [x] Run `pnpm all`
  - [x] Run `pnpm e2e:dms-material`
  - [x] Run `pnpm dupcheck`
  - [x] Run `pnpm format`
  - [x] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- E2E tests verify the complete user experience
- Tests should be realistic user scenarios
- Keep tests maintainable and not too brittle
- Use data-testid attributes for stable selectors
- Consider test execution time (keep tests fast)

## Related Stories

- **Previous:** Story AR.5 (Validation Implementation)
- **Epic:** Epic AR - Fidelity Transaction Import
- **Depends On:** All AR.1-AR.5 stories must be complete

---

## Change Log

| Date       | Version | Description      | Author |
| ---------- | ------- | ---------------- | ------ |
| 2026-02-24 | 1.0     | Initial creation | SM     |

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No debug issues encountered.

### Completion Notes List

- Created E2E test fixture CSV files in `apps/dms-material-e2e/fixtures/`
- Created seed data helper `seed-import-data.helper.ts` for test database setup/cleanup
- Created comprehensive E2E test spec `fidelity-import.spec.ts` covering all acceptance criteria
- Tests cover: dialog open/close, successful import, file type validation, account not found, CSV validation errors, duplicate handling, and partial success scenarios

### File List

- `apps/dms-material-e2e/src/fidelity-import.spec.ts` (new)
- `apps/dms-material-e2e/src/helpers/seed-import-data.helper.ts` (new)
- `apps/dms-material-e2e/fixtures/fidelity-valid.csv` (new)
- `apps/dms-material-e2e/fixtures/fidelity-invalid-quantity.csv` (new)
- `apps/dms-material-e2e/fixtures/fidelity-invalid-account.csv` (new)
- `apps/dms-material-e2e/fixtures/fidelity-duplicates.csv` (new)
- `apps/dms-material-e2e/fixtures/fidelity-mixed.csv` (new)
- `apps/dms-material-e2e/fixtures/fidelity-not-a-csv.txt` (new)

---

## QA Results

- Targeted AR.6 run: All 9 new E2E tests pass (Chromium)
- `pnpm all` passes (lint, build, unit tests)
- `pnpm e2e:dms-material` full suite: 406 passed, 127 skipped, 0 new failures (note: 4 pre-existing Firefox failures in sold-positions date filtering, unrelated to this PR)
- `pnpm dupcheck`: 0 clones found
- `pnpm format`: applied and clean
- All acceptance criteria verified through E2E tests
