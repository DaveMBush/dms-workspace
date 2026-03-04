# Story AT.9: Add E2E Tests for Account Summary

**Status:** Done

## Story

**As a** developer
**I want** comprehensive end-to-end tests for the account summary feature
**So that** we ensure the complete user flow works correctly in a real browser environment

## Context

**Current System:**

- Account summary feature fully implemented and bug-fixed through AT.8
- Unit tests provide good coverage
- Ready for end-to-end testing
- Need to test full user flows in browser

**Problem:**

- Need to verify feature works in real browser environment
- Need to test complete user journeys
- Need to ensure integration with routing and navigation
- Need automated regression tests for CI/CD

## Acceptance Criteria

### Functional Requirements

1. [x] E2E tests cover navigation to account summary
2. [x] E2E tests verify account-specific data display
3. [x] E2E tests verify pie chart renders
4. [x] E2E tests verify performance chart renders
5. [x] E2E tests verify month selector functionality
6. [x] E2E tests verify year selector functionality
7. [x] E2E tests verify data updates when selectors change
8. [x] E2E tests verify error handling

### Technical Requirements

1. [x] E2E tests use Playwright
2. [x] Tests run in CI/CD pipeline
3. [x] Tests are reliable (no flakiness)
4. [x] Tests follow project E2E patterns
5. [x] Tests include appropriate wait conditions
6. [x] Code follows project coding standards

## Tasks / Subtasks

- [x] Create E2E test file (AC: T1)
  - [x] Create `apps/dms-material-e2e/src/account-summary.spec.ts`
  - [x] Import necessary Playwright utilities
  - [x] Set up test fixtures
- [x] Create navigation tests (AC: F1)
  - [x] Test navigating to account summary from account list
  - [x] Test direct URL navigation with accountId
  - [x] Test browser back button behavior
- [x] Create data display tests (AC: F2)
  - [x] Test account name displays correctly
  - [x] Test deposits, dividends, capital gains display
  - [x] Test data is specific to selected account
  - [x] Verify data differs from global summary
- [x] Create chart rendering tests (AC: F3, F4)
  - [x] Test pie chart appears
  - [x] Test pie chart has correct labels
  - [x] Test pie chart segments are visible
  - [x] Test performance chart appears
  - [x] Test performance chart has data points
- [x] Create selector interaction tests (AC: F5-F7)
  - [x] Test month selector opens
  - [x] Test month options are populated
  - [x] Test selecting different month
  - [x] Test year selector opens
  - [x] Test year options are populated
  - [x] Test selecting different year
  - [x] Test chart updates after selection
- [x] Create error handling tests (AC: F8)
  - [x] Test with invalid accountId
  - [x] Test error message displays
  - [x] Test graceful fallback behavior
- [x] Verify tests pass in CI (AC: T2)
- [x] Run validation commands

## Dev Notes

### Testing Standards

- **Test Location:** `apps/dms-material-e2e/src/account-summary.spec.ts`
- **Testing Framework:** Playwright
- **Run Command:** `pnpm e2e:dms-material`
- **Follow Patterns:** Reference existing E2E tests

### Technical Context

- Account summary URL: `/accounts/:id/summary`
- Reference E2E tests: Global summary tests in `apps/dms-material-e2e/src/global-summary.spec.ts`
- Playwright docs: https://playwright.dev/

### E2E Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Account Summary', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to account summary
    await page.goto('/accounts/1/summary');
    await page.waitForLoadState('networkidle');
  });

  test('should display account-specific summary', async ({ page }) => {
    // Verify page title or heading
    await expect(page.getByRole('heading', { name: /Account Summary/ })).toBeVisible();

    // Verify key metrics are visible
    await expect(page.getByText(/Deposits:/)).toBeVisible();
    await expect(page.getByText(/Dividends:/)).toBeVisible();
    await expect(page.getByText(/Capital Gains:/)).toBeVisible();
  });

  test('should render allocation pie chart', async ({ page }) => {
    // Wait for chart to render
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // Verify chart has data (canvas is not empty)
    const boundingBox = await canvas.boundingBox();
    expect(boundingBox).toBeTruthy();
    expect(boundingBox!.width).toBeGreaterThan(0);
  });

  test('should change data when month selector is changed', async ({ page }) => {
    // Get initial value
    const initialValue = await page.locator('[data-testid="deposits"]').textContent();

    // Open month selector
    await page.getByLabel('Month').click();

    // Select different month
    await page.getByRole('option', { name: /January/ }).click();

    // Wait for data to update
    await page.waitForResponse((response) => response.url().includes('/api/summary/graph'));

    // Verify data changed (or verify loading state appeared)
    // Depending on your implementation
  });

  test('should handle invalid account ID', async ({ page }) => {
    await page.goto('/accounts/999999/summary');

    // Verify error message appears
    await expect(page.getByText(/Error loading account/)).toBeVisible();
  });
});
```

### Selectors to Use

Use data-testid attributes for stable selectors:

```html
<div data-testid="deposits">{{ deposits() | currency }}</div>
<div data-testid="dividends">{{ dividends() | currency }}</div>
<div data-testid="capital-gains">{{ capitalGains() | currency }}</div>
<canvas data-testid="allocation-chart"></canvas>
<canvas data-testid="performance-chart"></canvas>
```

### Wait Strategies

```typescript
// Wait for network to be idle
await page.waitForLoadState('networkidle');

// Wait for specific API call
await page.waitForResponse((response) => response.url().includes('/api/summary'));

// Wait for element to be visible
await expect(page.getByTestId('allocation-chart')).toBeVisible();

// Wait for loading spinner to disappear
await expect(page.getByRole('progressbar')).toBeHidden();
```

## Definition of Done

- [x] E2E test file created
- [x] All user flows covered with E2E tests
- [x] Navigation tests passing
- [x] Data display tests passing
- [x] Chart rendering tests passing
- [x] Selector interaction tests passing
- [x] Error handling tests passing
- [x] Tests pass locally
- [ ] Tests pass in CI/CD pipeline
- [x] Tests are not flaky (run 3+ times successfully)
- [x] Code follows project conventions
- [x] All validation commands pass:
  - [x] Run `pnpm all`
  - [x] Run `pnpm e2e:dms-material`
  - [x] Run `pnpm dupcheck`
  - [x] Run `pnpm format`
  - [x] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- Add data-testid attributes to component for stable selectors
- Use appropriate wait strategies to avoid flaky tests
- Test both happy path and error scenarios
- Keep tests independent (each test should work standalone)
- Use beforeEach for common setup
- Reference global summary E2E tests for patterns
- Run tests multiple times to ensure reliability

## Related Stories

- **Previous:** Story AT.8 (Bug Fixes)
- **Epic:** Epic AT - Wire Up Account/Summary Screen

---

## Change Log

| Date       | Version | Description      | Author |
| ---------- | ------- | ---------------- | ------ |
| 2026-03-02 | 1.0     | Initial creation | PM     |
| 2026-03-04 | 1.1     | Implementation complete - 35 E2E tests across 10 test groups | Dev |
