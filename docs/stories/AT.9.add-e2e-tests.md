# Story AT.9: Add E2E Tests for Account Summary

**Status:** Ready

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

1. [ ] E2E tests cover navigation to account summary
2. [ ] E2E tests verify account-specific data display
3. [ ] E2E tests verify pie chart renders
4. [ ] E2E tests verify performance chart renders
5. [ ] E2E tests verify month selector functionality
6. [ ] E2E tests verify year selector functionality
7. [ ] E2E tests verify data updates when selectors change
8. [ ] E2E tests verify error handling

### Technical Requirements

1. [ ] E2E tests use Playwright
2. [ ] Tests run in CI/CD pipeline
3. [ ] Tests are reliable (no flakiness)
4. [ ] Tests follow project E2E patterns
5. [ ] Tests include appropriate wait conditions
6. [ ] Code follows project coding standards

## Tasks / Subtasks

- [ ] Create E2E test file (AC: T1)
  - [ ] Create `apps/dms-material-e2e/src/account-summary.spec.ts`
  - [ ] Import necessary Playwright utilities
  - [ ] Set up test fixtures
- [ ] Create navigation tests (AC: F1)
  - [ ] Test navigating to account summary from account list
  - [ ] Test direct URL navigation with accountId
  - [ ] Test browser back button behavior
- [ ] Create data display tests (AC: F2)
  - [ ] Test account name displays correctly
  - [ ] Test deposits, dividends, capital gains display
  - [ ] Test data is specific to selected account
  - [ ] Verify data differs from global summary
- [ ] Create chart rendering tests (AC: F3, F4)
  - [ ] Test pie chart appears
  - [ ] Test pie chart has correct labels
  - [ ] Test pie chart segments are visible
  - [ ] Test performance chart appears
  - [ ] Test performance chart has data points
- [ ] Create selector interaction tests (AC: F5-F7)
  - [ ] Test month selector opens
  - [ ] Test month options are populated
  - [ ] Test selecting different month
  - [ ] Test year selector opens
  - [ ] Test year options are populated
  - [ ] Test selecting different year
  - [ ] Test chart updates after selection
- [ ] Create error handling tests (AC: F8)
  - [ ] Test with invalid accountId
  - [ ] Test error message displays
  - [ ] Test graceful fallback behavior
- [ ] Verify tests pass in CI (AC: T2)
- [ ] Run validation commands

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

- [ ] E2E test file created
- [ ] All user flows covered with E2E tests
- [ ] Navigation tests passing
- [ ] Data display tests passing
- [ ] Chart rendering tests passing
- [ ] Selector interaction tests passing
- [ ] Error handling tests passing
- [ ] Tests pass locally
- [ ] Tests pass in CI/CD pipeline
- [ ] Tests are not flaky (run 3+ times successfully)
- [ ] Code follows project conventions
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
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
