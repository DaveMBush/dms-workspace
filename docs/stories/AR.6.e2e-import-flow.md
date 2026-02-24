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

- [ ] Set up E2E test infrastructure (AC: 1)
  - [ ] Create test file in e2e directory
  - [ ] Set up test database with seed data
  - [ ] Create test CSV files (valid and invalid)
- [ ] Write happy path E2E test (AC: 1, 7)
  - [ ] Navigate to Global/Universe screen
  - [ ] Click Import button
  - [ ] Verify dialog opens
  - [ ] Select valid CSV file
  - [ ] Click Upload button
  - [ ] Verify progress indicator shows
  - [ ] Verify success message displays
  - [ ] Verify import count is correct
  - [ ] Verify dialog closes
  - [ ] Verify data appears in universe table
  - [ ] Verify data persisted in database
- [ ] Write validation error test (AC: 2)
  - [ ] Upload CSV with invalid data
  - [ ] Verify error messages display
  - [ ] Verify row numbers shown
  - [ ] Verify field names shown
  - [ ] Verify dialog stays open
- [ ] Write file upload error test (AC: 3)
  - [ ] Try to upload non-CSV file
  - [ ] Verify error message
  - [ ] Try to upload oversized file
  - [ ] Verify error message
- [ ] Write account not found test (AC: 4)
  - [ ] Upload CSV with non-existent account name
  - [ ] Verify specific error message
  - [ ] Verify which row(s) had issue
- [ ] Write duplicate warning test (AC: 5)
  - [ ] Upload CSV with transactions already in database
  - [ ] Verify warning message displays
  - [ ] Verify data not duplicated
- [ ] Write partial success test (AC: 6)
  - [ ] Upload CSV with mix of valid and invalid rows
  - [ ] Verify valid rows imported
  - [ ] Verify invalid rows reported
  - [ ] Verify counts are correct
  - [ ] Verify only valid data in database
- [ ] Add cleanup logic
  - [ ] Delete test data after each test
  - [ ] Reset database to known state
- [ ] Run E2E tests and verify passing
- [ ] Run validation commands

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

- [ ] All E2E tests written and passing
- [ ] Tests cover all acceptance criteria scenarios
- [ ] Test data setup and cleanup working
- [ ] Tests are stable and repeatable
- [ ] Tests run in CI/CD pipeline
- [ ] Test code follows project conventions
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
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

_To be populated during implementation_

### Debug Log References

_To be populated during implementation_

### Completion Notes List

_To be populated during implementation_

### File List

_To be populated during implementation_

---

## QA Results

_To be populated after implementation_
