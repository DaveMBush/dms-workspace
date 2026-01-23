# Story AK.5: TDD - Write E2E Tests for Universe Update Flow

## Story

**As a** QA engineer
**I want** comprehensive E2E tests for universe update functionality
**So that** I can verify the complete user workflow from button click to notification

## Context

**Current System:**

- Universe button fully implemented (Stories AK.1-AK.4)
- Notifications working for success/error scenarios
- Need E2E tests to verify complete flow

**TDD Approach:**

- Write failing E2E tests first (RED)
- Disable tests to keep CI green
- Implementation story (AK.6) will refine and make tests pass (GREEN)

## Acceptance Criteria

### Functional Requirements

- [ ] E2E test for successful universe update workflow
- [ ] E2E test verifies button click triggers sync
- [ ] E2E test verifies loading state displayed
- [ ] E2E test verifies success notification appears
- [ ] E2E test verifies error notification on failure
- [ ] **CRITICAL** Tests are disabled (.skip) to allow CI to pass

### Technical Requirements

- [ ] Use Playwright testing framework
- [ ] Use data-testid selectors for reliability
- [ ] Mock backend API responses
- [ ] Test notifications appear correctly
- [ ] Follow existing E2E test patterns

## Test-Driven Development Approach

### Step 1: Create Failing E2E Tests

Create `apps/dms-material-e2e/src/universe-update.spec.ts`:

```typescript
import { test, expect } from 'playwright/test';
import { login } from './helpers/login.helper';

// DISABLED: Will be enabled in Story AK.6
test.describe.skip('Universe Update Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');
  });

  test('should display Update Universe button', async ({ page }) => {
    const button = page.locator('[data-testid="update-universe-button"]');
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  });

  test('should show loading state during sync', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/universe/sync', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({ status: 200, json: { success: true, count: 10 } });
    });

    const button = page.locator('[data-testid="update-universe-button"]');
    await button.click();

    // Verify loading state
    await expect(button).toContainText('Syncing');
    await expect(button).toBeDisabled();
  });

  test('should show success notification after sync completes', async ({ page }) => {
    // Mock successful API response
    await page.route('**/api/universe/sync', async (route) => {
      await route.fulfill({
        status: 200,
        json: { success: true, count: 15, message: 'Universe updated' },
      });
    });

    const button = page.locator('[data-testid="update-universe-button"]');
    await button.click();

    // Wait for and verify success notification
    const notification = page.locator('.notification-success, [role="alert"]').filter({ hasText: /15.*symbol/i });
    await expect(notification).toBeVisible({ timeout: 5000 });
    await expect(notification).toContainText('Universe updated successfully');
  });

  test('should show error notification when sync fails', async ({ page }) => {
    // Mock failed API response
    await page.route('**/api/universe/sync', async (route) => {
      await route.fulfill({
        status: 500,
        json: { message: 'Sync service unavailable' },
      });
    });

    const button = page.locator('[data-testid="update-universe-button"]');
    await button.click();

    // Wait for and verify error notification
    const notification = page.locator('.notification-error, [role="alert"]').filter({ hasText: /failed/i });
    await expect(notification).toBeVisible({ timeout: 5000 });
    await expect(notification).toContainText('Universe sync failed');
  });

  test('should re-enable button after sync completes', async ({ page }) => {
    // Mock successful API response
    await page.route('**/api/universe/sync', async (route) => {
      await route.fulfill({ status: 200, json: { success: true, count: 5 } });
    });

    const button = page.locator('[data-testid="update-universe-button"]');
    await button.click();

    // Wait for sync to complete
    await page.waitForTimeout(1000);

    // Verify button is re-enabled
    await expect(button).toBeEnabled();
    await expect(button).not.toContainText('Syncing');
  });

  test('should prevent multiple concurrent sync operations', async ({ page }) => {
    let syncCallCount = 0;

    // Mock slow API response and count calls
    await page.route('**/api/universe/sync', async (route) => {
      syncCallCount++;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({ status: 200, json: { success: true, count: 10 } });
    });

    const button = page.locator('[data-testid="update-universe-button"]');

    // Click multiple times rapidly
    await button.click();
    await page.waitForTimeout(100);
    await button.click();
    await page.waitForTimeout(100);
    await button.click();

    // Wait for operation to complete
    await page.waitForTimeout(2000);

    // Should only have called API once
    expect(syncCallCount).toBe(1);
  });

  test('should display accurate symbol count in notification', async ({ page }) => {
    const expectedCount = 42;

    await page.route('**/api/universe/sync', async (route) => {
      await route.fulfill({
        status: 200,
        json: { success: true, count: expectedCount },
      });
    });

    const button = page.locator('[data-testid="update-universe-button"]');
    await button.click();

    const notification = page.locator('.notification-success, [role="alert"]');
    await expect(notification).toBeVisible({ timeout: 5000 });
    await expect(notification).toContainText(expectedCount.toString());
  });
});
```

### Step 2: Verify Tests Are RED

Run the tests to confirm they fail:

```bash
pnpm e2e:dms-material
```

Expected: Tests should fail (but are skipped, so CI passes)

### Step 3: Disable Tests for CI

Ensure all tests use `.skip` so CI pipeline passes.

## Definition of Done

- [ ] E2E tests created for universe update flow
- [ ] Tests cover happy path (success)
- [ ] Tests cover error scenarios
- [ ] Tests cover loading states
- [ ] Tests cover edge cases (concurrent operations)
- [ ] Tests use proper data-testid selectors
- [ ] Tests are disabled with `.skip`
- [ ] Tests would fail when run without `.skip` (RED phase confirmed)
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved
- [ ] Documentation updated if needed

## Notes

- This story creates the tests in RED state
- Story AK.6 will refine implementation to make tests pass
- Follow patterns from existing E2E tests (like screener-table.spec.ts)
- Mock API responses to control test scenarios
- Tests verify complete user workflow end-to-end

## Related Stories

- **Prerequisite**: Story AK.4 (Notifications implemented)
- **Next**: Story AK.6 (Refine implementation for E2E)
- **Reference**: Story AJ.5 (Screener E2E tests for patterns)
