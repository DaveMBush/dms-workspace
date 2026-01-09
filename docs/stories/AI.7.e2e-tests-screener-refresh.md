# Story AI.7: Add E2E Tests for Screener Refresh

## Story

**As a** QA engineer
**I want** comprehensive E2E tests for screener refresh
**So that** I can verify the complete workflow

## Context

**Testing Goal:**

- Create Playwright E2E tests
- Test complete refresh workflow
- Verify UI updates

## Acceptance Criteria

### Functional Requirements

- [ ] Test refresh button click
- [ ] Test loading indicator appears
- [ ] Test table updates with new data
- [ ] Test error handling
- [ ] **CRITICAL** Tests pass in CI

### Technical Requirements

- [ ] Use Playwright
- [ ] Use data-testid selectors
- [ ] Mock backend responses
- [ ] Handle async operations

## E2E Test Approach

### Create Test File

Create `apps/dms-material-e2e/src/screener-refresh.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers/login.helper';

test.describe('Screener Refresh', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/universe');
  });

  test('should have refresh button', async ({ page }) => {
    const button = page.locator('[data-testid="refresh-button"]');
    await expect(button).toBeVisible();
  });

  test('should show loading indicator during refresh', async ({ page }) => {
    const button = page.locator('[data-testid="refresh-button"]');
    await button.click();

    const spinner = page.locator('mat-progress-spinner');
    await expect(spinner).toBeVisible();
  });

  test('should disable button during refresh', async ({ page }) => {
    const button = page.locator('[data-testid="refresh-button"]');
    await button.click();

    await expect(button).toBeDisabled();
  });

  test('should update table after successful refresh', async ({ page }) => {
    await page.route('**/api/screener', async (route) => {
      await route.fulfill({ json: { success: true, count: 100 } });
    });

    const button = page.locator('[data-testid="refresh-button"]');
    await button.click();

    // Wait for loading to complete
    const spinner = page.locator('mat-progress-spinner');
    await expect(spinner).not.toBeVisible({ timeout: 10000 });

    // Verify table has data
    const rows = page.locator('table tr');
    await expect(rows).not.toHaveCount(0);
  });

  test('should display error on failure', async ({ page }) => {
    await page.route('**/api/screener', async (route) => {
      await route.fulfill({ status: 500, json: { message: 'Scraper failed' } });
    });

    const button = page.locator('[data-testid="refresh-button"]');
    await button.click();

    const error = page.locator('[data-testid="error-message"]');
    await expect(error).toBeVisible();
    await expect(error).toContainText('failed');
  });

  test('should allow retry after error', async ({ page }) => {
    await page.route('**/api/screener', async (route) => {
      await route.fulfill({ status: 500 });
    });

    const button = page.locator('[data-testid="refresh-button"]');
    await button.click();

    const retryButton = page.locator('[data-testid="retry-button"]');
    await expect(retryButton).toBeVisible();
  });
});
```

### Run Tests

```bash
pnpm e2e:dms-material
```

## Definition of Done

- [ ] E2E tests created
- [ ] All tests passing
- [ ] Tests run in CI
- [ ] Coverage complete
