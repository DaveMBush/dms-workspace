# Story AL.5: Write E2E Tests for Update Fields Flow (TDD)

## Story

**As a** developer
**I want** to write E2E tests for the Update Fields flow
**So that** the complete user workflow is verified

## Context

**Current System:**

- Update Fields button wired to service (Story AL.4)
- Need comprehensive E2E test coverage
- Tests will define expected end-to-end behavior

**TDD Approach:**

- Write E2E tests first (RED phase)
- Define complete user workflow expectations
- Disable failing tests to allow CI to pass
- Story AL.6 will refine implementation (GREEN phase)

## Acceptance Criteria

### Functional Requirements

- [ ] E2E tests written for Update Fields flow
- [ ] Tests cover button interaction
- [ ] Tests cover loading overlay display
- [ ] Tests cover success notification
- [ ] Tests cover error notification
- [ ] Tests cover concurrent operation prevention
- [ ] Tests disabled with `.skip` to allow CI to pass

### Technical Requirements

- [ ] Tests use Playwright
- [ ] Tests mock API responses
- [ ] Tests verify UI state changes
- [ ] Tests check notification content
- [ ] Tests follow existing E2E patterns

## Implementation Details

### Step 1: Create E2E Test File

Create `apps/dms-material-e2e/src/update-fields.spec.ts`:

```typescript
import { test, expect } from 'playwright/test';
import { login } from './helpers/login.helper';

function createMockUpdateResponse(updated: number) {
  return {
    updated,
    correlationId: 'test-correlation-id',
    logFilePath: 'test-update.log',
  };
}

test.describe.skip('Update Fields Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Update Button', () => {
    test('should trigger field update when button clicked', async ({ page }) => {
      let updateCallCount = 0;

      await page.route('**/api/universe/update-fields', async (route) => {
        updateCallCount++;
        await route.fulfill({
          status: 200,
          json: createMockUpdateResponse(10),
        });
      });

      const button = page.locator('[data-testid="update-fields-button"]');
      await button.click();

      await page.waitForTimeout(2000);
      expect(updateCallCount).toBe(1);
    });

    test('should disable button during update', async ({ page }) => {
      await page.route('**/api/universe/update-fields', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          json: createMockUpdateResponse(10),
        });
      });

      const button = page.locator('[data-testid="update-fields-button"]');
      await button.click();

      await expect(button).toBeDisabled();
    });

    test('should re-enable button after update completes', async ({ page }) => {
      await page.route('**/api/universe/update-fields', async (route) => {
        await route.fulfill({
          status: 200,
          json: createMockUpdateResponse(10),
        });
      });

      const button = page.locator('[data-testid="update-fields-button"]');
      await button.click();

      await page.waitForTimeout(2000);
      await expect(button).toBeEnabled();
    });
  });

  test.describe('Loading States', () => {
    test('should show global loading overlay', async ({ page }) => {
      await page.route('**/api/universe/update-fields', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          json: createMockUpdateResponse(10),
        });
      });

      const button = page.locator('[data-testid="update-fields-button"]');
      await button.click();

      const overlay = page.locator('.fixed.inset-0.bg-black.bg-opacity-50');
      await expect(overlay).toBeVisible();
      await expect(overlay).toContainText('Updating universe fields');
    });

    test('should hide loading overlay after completion', async ({ page }) => {
      await page.route('**/api/universe/update-fields', async (route) => {
        await route.fulfill({
          status: 200,
          json: createMockUpdateResponse(10),
        });
      });

      const button = page.locator('[data-testid="update-fields-button"]');
      await button.click();

      const overlay = page.locator('.fixed.inset-0.bg-black.bg-opacity-50');
      await expect(overlay).not.toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Success Notifications', () => {
    test('should display success notification', async ({ page }) => {
      await page.route('**/api/universe/update-fields', async (route) => {
        await route.fulfill({
          status: 200,
          json: createMockUpdateResponse(10),
        });
      });

      const button = page.locator('[data-testid="update-fields-button"]');
      await button.click();

      const snackbar = page.locator('mat-snack-bar-container');
      await expect(snackbar).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.snackbar-success')).toBeVisible();
    });

    test('should display update count in notification', async ({ page }) => {
      await page.route('**/api/universe/update-fields', async (route) => {
        await route.fulfill({
          status: 200,
          json: createMockUpdateResponse(25),
        });
      });

      const button = page.locator('[data-testid="update-fields-button"]');
      await button.click();

      const snackbar = page.locator('mat-snack-bar-container');
      await expect(snackbar).toBeVisible({ timeout: 10000 });
      await expect(snackbar).toContainText('25 entries updated');
    });
  });

  test.describe('Error Notifications', () => {
    test('should display error notification on failure', async ({ page }) => {
      await page.route('**/api/universe/update-fields', async (route) => {
        await route.fulfill({
          status: 500,
          json: { error: { message: 'Internal Server Error' } },
        });
      });

      const button = page.locator('[data-testid="update-fields-button"]');
      await button.click();

      const snackbar = page.locator('mat-snack-bar-container');
      await expect(snackbar).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.snackbar-error')).toBeVisible();
    });

    test('should re-enable button after error', async ({ page }) => {
      await page.route('**/api/universe/update-fields', async (route) => {
        await route.fulfill({
          status: 500,
          json: { error: { message: 'Internal Server Error' } },
        });
      });

      const button = page.locator('[data-testid="update-fields-button"]');
      await button.click();

      await page.waitForTimeout(2000);
      await expect(button).toBeEnabled();
    });
  });

  test.describe('Edge Cases', () => {
    test('should prevent concurrent update operations', async ({ page }) => {
      let updateCallCount = 0;

      await page.route('**/api/universe/update-fields', async (route) => {
        updateCallCount++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          json: createMockUpdateResponse(10),
        });
      });

      const button = page.locator('[data-testid="update-fields-button"]');

      await button.click();
      await expect(button).toBeDisabled();
      await button.click({ force: true });
      await button.click({ force: true });

      await page.waitForTimeout(2000);
      expect(updateCallCount).toBe(1);
    });
  });
});
```

## Definition of Done

- [ ] E2E tests written for Update Fields flow
- [ ] Tests cover all acceptance criteria
- [ ] Tests disabled with `test.describe.skip`
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD RED phase for E2E tests
- Tests disabled with `.skip` to allow CI to pass
- Story AL.6 will refine implementation (GREEN phase)
- Follow pattern from Story AK.5

## Related Stories

- **Prerequisite**: Story AL.4
- **Next**: Story AL.6
- **Epic**: Epic AL
