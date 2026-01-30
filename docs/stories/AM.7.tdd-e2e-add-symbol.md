# Story AM.7: Write E2E Tests for Add Symbol Flow - TDD RED Phase

## Story

**As a** developer
**I want** to write comprehensive E2E tests for the complete add symbol workflow
**So that** I verify the end-to-end user experience (TDD RED phase)

## Context

**Current System:**

- Add Symbol functionality complete from Stories AM.1-AM.6
- Need E2E tests to verify complete workflow
- Tests should cover happy path and error scenarios

**Implementation Approach:**

- Write E2E tests for full add symbol flow
- Test dialog interaction, search, validation, submission
- Disable tests with `test.describe.skip` to allow CI to pass
- Tests will be re-enabled in Story AM.8

## Acceptance Criteria

### Functional Requirements

- [ ] E2E tests for opening add symbol dialog
- [ ] E2E tests for symbol input and autocomplete
- [ ] E2E tests for successful symbol addition
- [ ] E2E tests for validation errors
- [ ] E2E tests for API error handling
- [ ] E2E tests for cancel functionality
- [ ] All tests initially fail (RED phase)
- [ ] Tests disabled with `test.describe.skip`

### Technical Requirements

- [ ] Uses Playwright test framework
- [ ] Tests use proper data-testid selectors
- [ ] Mocks API responses appropriately
- [ ] Tests are independent and isolated
- [ ] Run on multiple browsers (chromium, firefox)

## Implementation Details

### Step 1: Create E2E Test File

Create `apps/dms-material-e2e/src/add-symbol.spec.ts`:

\`\`\`typescript
import { test, expect } from '@playwright/test';
import { loginAsUser } from './helpers/login.helper';

test.describe.skip('Add Symbol Flow', () => {
test.beforeEach(async ({ page }) => {
await loginAsUser(page);
await page.goto('/global/universe');
});

test.describe('Dialog Interaction', () => {
test('should open add symbol dialog', async ({ page }) => {
await page.click('[data-testid="add-symbol-button"]');
await expect(page.locator('[data-testid="add-symbol-dialog"]'))
.toBeVisible();
});

    test('should close dialog on cancel', async ({ page }) => {
      await page.click('[data-testid="add-symbol-button"]');
      await page.click('[data-testid="cancel-button"]');
      await expect(page.locator('[data-testid="add-symbol-dialog"]'))
        .not.toBeVisible();
    });

});

test.describe('Symbol Input and Autocomplete', () => {
test('should show autocomplete results', async ({ page }) => {
await page.route('\*\*/api/symbols/search?q=AA', async (route) => {
await route.fulfill({
json: [
{ symbol: 'AAPL', name: 'Apple Inc.' },
{ symbol: 'AAL', name: 'American Airlines' }
]
});
});

      await page.click('[data-testid="add-symbol-button"]');
      await page.fill('[data-testid="symbol-input"]', 'AA');
      await expect(page.locator('.mat-autocomplete-panel')).toBeVisible();
      await expect(page.locator('text=AAPL - Apple Inc.')).toBeVisible();
    });

    test('should select symbol from autocomplete', async ({ page }) => {
      await page.click('[data-testid="add-symbol-button"]');
      await page.fill('[data-testid="symbol-input"]', 'AA');
      await page.click('text=AAPL - Apple Inc.');
      await expect(page.locator('[data-testid="symbol-input"]'))
        .toHaveValue('AAPL');
    });

});

test.describe('Successful Addition', () => {
test('should add symbol successfully', async ({ page }) => {
await page.route('\*\*/api/universe', async (route) => {
await route.fulfill({
status: 201,
json: { symbol: 'AAPL', id: 123 }
});
});

      await page.click('[data-testid="add-symbol-button"]');
      await page.fill('[data-testid="symbol-input"]', 'AAPL');
      await page.click('[data-testid="submit-button"]');

      await expect(page.locator('.snackbar-success')).toBeVisible();
      await expect(page.locator('text=Symbol added successfully'))
        .toBeVisible();
    });

    test('should refresh universe table after addition', async ({ page }) => {
      // Test implementation
    });

});

test.describe('Validation Errors', () => {
test('should show error for empty symbol', async ({ page }) => {
await page.click('[data-testid="add-symbol-button"]');
await page.click('[data-testid="submit-button"]');
await expect(page.locator('text=Symbol is required')).toBeVisible();
});

    test('should show error for invalid format', async ({ page }) => {
      await page.click('[data-testid="add-symbol-button"]');
      await page.fill('[data-testid="symbol-input"]', '123');
      await expect(page.locator('text=Invalid symbol format'))
        .toBeVisible();
    });

});

test.describe('API Error Handling', () => {
test('should handle duplicate symbol error', async ({ page }) => {
await page.route('\*\*/api/universe', async (route) => {
await route.fulfill({
status: 409,
json: { message: 'Symbol already exists' }
});
});

      await page.click('[data-testid="add-symbol-button"]');
      await page.fill('[data-testid="symbol-input"]', 'AAPL');
      await page.click('[data-testid="submit-button"]');

      await expect(page.locator('.snackbar-error')).toBeVisible();
      await expect(page.locator('text=Symbol already exists in universe'))
        .toBeVisible();
    });

    test('should handle server errors', async ({ page }) => {
      await page.route('**/api/universe', async (route) => {
        await route.fulfill({ status: 500 });
      });

      await page.click('[data-testid="add-symbol-button"]');
      await page.fill('[data-testid="symbol-input"]', 'AAPL');
      await page.click('[data-testid="submit-button"]');

      await expect(page.locator('text=Server error')).toBeVisible();
    });

});
});
\`\`\`

### Step 2: Add data-testid Attributes

Ensure components have proper test selectors:

- `data-testid="add-symbol-button"` on add button
- `data-testid="add-symbol-dialog"` on dialog
- `data-testid="symbol-input"` on input field
- `data-testid="submit-button"` on submit
- `data-testid="cancel-button"` on cancel

### Step 3: Run Tests and Verify RED Phase

\`\`\`bash
pnpm e2e:dms-material --grep "Add Symbol"
\`\`\`

### Step 4: Tests Already Disabled

Tests use `test.describe.skip` so CI will pass.

## Definition of Done

- [ ] All E2E tests written and initially skipped
- [ ] Tests cover complete add symbol workflow
- [ ] Tests disabled with test.describe.skip
- [ ] data-testid attributes documented
- [ ] All validation commands pass:
  - [ ] Run \`pnpm all\`
  - [ ] Run \`pnpm e2e:dms-material\`
  - [ ] Run \`pnpm dupcheck\`
  - [ ] Run \`pnpm format\`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the E2E TDD RED phase
- Tests disabled to allow CI to pass
- Story AM.8 will re-enable and ensure tests pass

## Related Stories

- **Prerequisite**: Story AM.6
- **Next**: Story AM.8 (E2E GREEN phase)
- **Pattern Reference**: Story AL.5 (Similar E2E RED phase)
