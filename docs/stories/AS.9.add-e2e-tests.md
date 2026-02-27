# Story AS.9: Add E2E Tests for Global Summary

**Status:** Approved

## Story

**As a** quality assurance engineer
**I want** comprehensive end-to-end tests for the Global Summary feature
**So that** we can verify the complete user journey and prevent regression

## Context

**Current System:**

- Epic AS (AS.1–AS.8) is complete and bug-free
- Feature fully functional with real backend
- Unit tests provide code-level coverage
- Need E2E tests to verify complete user workflows

**Purpose:**

- Test complete user journeys through the UI
- Verify backend integration in realistic scenarios
- Ensure feature works across different browsers
- Provide regression safety for future changes

## Acceptance Criteria

### Functional Requirements

1. [ ] E2E test for initial page load and data display
2. [ ] E2E test for month selection and data refresh
3. [ ] E2E test for empty state (no data)
4. [ ] E2E test for error state (backend failure)
5. [ ] E2E test for pie chart rendering
6. [ ] E2E test for loading states
7. [ ] E2E test for navigation to/from summary page

### Technical Requirements

1. [ ] Tests use Playwright framework
2. [ ] Tests are independent and can run in any order
3. [ ] Tests clean up after themselves
4. [ ] Tests have clear descriptions
5. [ ] Tests include proper waits (no fixed delays)
6. [ ] All tests passing consistently

## Tasks / Subtasks

- [ ] Create E2E test file (AC: 1)
  - [ ] Create `apps/dms-material-e2e/src/global-summary.spec.ts`
  - [ ] Set up test fixtures
  - [ ] Add test data setup/teardown
- [ ] Implement page load test (AC: 1, 7)
  - [ ] Navigate to /global/summary
  - [ ] Verify page title
  - [ ] Verify summary data displays
  - [ ] Verify pie chart visible
  - [ ] Verify month selector visible
- [ ] Implement month selection test (AC: 2)
  - [ ] Load page with default month
  - [ ] Select different month from dropdown
  - [ ] Verify loading spinner appears
  - [ ] Verify data updates
  - [ ] Verify chart updates
- [ ] Implement empty state test (AC: 3)
  - [ ] Set up backend with no data for selected month
  - [ ] Navigate to page
  - [ ] Verify "No data available" message
  - [ ] Verify chart not displayed
- [ ] Implement error state test (AC: 4)
  - [ ] Mock backend failure
  - [ ] Navigate to page
  - [ ] Verify error message displays
  - [ ] Verify chart not displayed
- [ ] Implement chart rendering test (AC: 5)
  - [ ] Navigate to page with data
  - [ ] Verify pie chart canvas exists
  - [ ] Verify chart legend displays
  - [ ] Verify chart segments match data
  - [ ] Hover over segment and verify tooltip
- [ ] Implement loading state test (AC: 6)
  - [ ] Navigate to page
  - [ ] Verify loading spinner appears
  - [ ] Verify spinner disappears when loaded
  - [ ] Verify data displays after loading
- [ ] Implement navigation test (AC: 7)
  - [ ] Navigate to different page
  - [ ] Navigate to /global/summary
  - [ ] Verify component loads correctly
  - [ ] Navigate back
  - [ ] Navigate to /global/summary again
  - [ ] Verify data persisted/refreshed correctly
- [ ] Run and verify all E2E tests (AC: 6)
- [ ] Run validation commands

## Dev Notes

### Testing Standards

- **Test Location:** `apps/dms-material-e2e/src/global-summary.spec.ts`
- **Testing Framework:** Playwright
- **Test Pattern:** Arrange-Act-Assert
- **Browser Coverage:** Chromium (primary), Firefox, WebKit (optional)

### Technical Context

- Page URL: `/global/summary`
- Component: GlobalSummary
- Backend endpoints tested: `/api/summary`, `/api/summary/months`
- Test data: Seed database with known test data

### E2E Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Global Summary', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test data if needed
    // Navigate to page
    await page.goto('/global/summary');
  });

  test('should display summary data on page load', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('[data-testid="global-summary-container"]');

    // Verify data is displayed
    const basisElement = page.locator('[data-testid="basis-value"]');
    await expect(basisElement).toBeVisible();
    await expect(basisElement).not.toHaveText('$0');

    // Verify chart is displayed
    const chart = page.locator('[data-testid="allocation-chart"]');
    await expect(chart).toBeVisible();

    // Verify month selector is displayed
    const monthSelector = page.locator('[data-testid="month-selector"]');
    await expect(monthSelector).toBeVisible();
  });

  test('should update data when selecting different month', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('[data-testid="global-summary-container"]');

    // Get initial basis value
    const basisElement = page.locator('[data-testid="basis-value"]');
    const initialBasis = await basisElement.textContent();

    // Select different month
    const monthSelector = page.locator('[data-testid="month-selector"]');
    await monthSelector.click();
    await page.locator('mat-option').first().click();

    // Wait for loading to complete
    await page.waitForSelector('[data-testid="loading-spinner"]', { state: 'hidden' });

    // Verify data updated (may be same or different based on test data)
    const newBasis = await basisElement.textContent();
    expect(newBasis).toBeDefined();
  });

  test('should display "No data available" when no data exists', async ({ page }) => {
    // This test would need mocking or specific test month with no data

    // Select month with no data
    await page.goto('/global/summary?month=2020-01');

    // Wait for load
    await page.waitForSelector('[data-testid="global-summary-container"]');

    // Verify no data message
    const noDataMessage = page.locator('[data-testid="no-data-message"]');
    await expect(noDataMessage).toBeVisible();
    await expect(noDataMessage).toHaveText(/No data available/i);

    // Verify chart not displayed
    const chart = page.locator('[data-testid="allocation-chart"]');
    await expect(chart).not.toBeVisible();
  });

  test('should display error message on backend failure', async ({ page }) => {
    // Mock backend failure
    await page.route('/api/summary*', (route) => {
      route.abort('failed');
    });

    await page.goto('/global/summary');

    // Wait for error state
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText(/Failed to load/i);

    // Verify chart not displayed
    const chart = page.locator('[data-testid="allocation-chart"]');
    await expect(chart).not.toBeVisible();
  });

  test('should render pie chart with correct segments', async ({ page }) => {
    await page.waitForSelector('[data-testid="global-summary-container"]');

    // Wait for chart to render
    await page.waitForSelector('[data-testid="allocation-chart"]');

    // Verify chart canvas exists
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // Verify legend items (number should match risk groups)
    const legendItems = page.locator('.chart-legend-item');
    const count = await legendItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should show loading spinner initially', async ({ page }) => {
    // Navigate and immediately check for spinner
    const navigationPromise = page.goto('/global/summary');

    // Spinner should appear quickly
    const spinner = page.locator('[data-testid="loading-spinner"]');
    await expect(spinner).toBeVisible();

    // Wait for navigation to complete
    await navigationPromise;

    // Wait for loading to finish
    await page.waitForSelector('[data-testid="loading-spinner"]', { state: 'hidden' });

    // Verify data is displayed
    const basisElement = page.locator('[data-testid="basis-value"]');
    await expect(basisElement).toBeVisible();
  });

  test('should navigate to and from summary page correctly', async ({ page }) => {
    // Navigate to a different page first
    await page.goto('/global/screener');

    // Navigate to summary
    await page.goto('/global/summary');
    await page.waitForSelector('[data-testid="global-summary-container"]');

    // Verify data loaded
    const basisElement = page.locator('[data-testid="basis-value"]');
    await expect(basisElement).toBeVisible();

    // Navigate back
    await page.goBack();
    await page.waitForURL('**/global/screener');

    // Navigate forward to summary again
    await page.goForward();
    await page.waitForURL('**/global/summary');

    // Verify data still displayed
    await expect(basisElement).toBeVisible();
  });

  test('should display chart tooltip on hover', async ({ page }) => {
    await page.waitForSelector('[data-testid="global-summary-container"]');
    await page.waitForSelector('[data-testid="allocation-chart"]');

    // Get canvas element
    const canvas = page.locator('canvas').first();

    // Hover over chart center (where pie chart should be)
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

      // Wait a bit for tooltip to appear
      await page.waitForTimeout(500);

      // Verify tooltip is visible (implementation-dependent)
      // This would need to check for Chart.js tooltip or custom tooltip
    }
  });

  test('should maintain selected month when refreshing page', async ({ page }) => {
    await page.waitForSelector('[data-testid="global-summary-container"]');

    // Select specific month
    const monthSelector = page.locator('[data-testid="month-selector"]');
    await monthSelector.click();
    const secondMonth = page.locator('mat-option').nth(1);
    const monthText = await secondMonth.textContent();
    await secondMonth.click();

    // Wait for data to load
    await page.waitForSelector('[data-testid="loading-spinner"]', { state: 'hidden' });

    // Refresh page
    await page.reload();

    // Wait for page to load again
    await page.waitForSelector('[data-testid="global-summary-container"]');

    // Verify same month is selected (if localStorage persistence is implemented)
    const selectedMonth = page.locator('[data-testid="month-selector"] .mat-select-value-text');
    await expect(selectedMonth).toHaveText(monthText || '');
  });
});
```

### Data Test IDs to Add

Add these to the template:

```html
<div data-testid="global-summary-container">
  <div data-testid="basis-value">{{ basis$() | currency }}</div>
  <div data-testid="capital-gains-value">{{ capitalGain$() | currency }}</div>
  <div data-testid="dividends-value">{{ dividends$() | currency }}</div>

  <mat-select data-testid="month-selector" [formControl]="selectedMonth">
    ...
  </mat-select>

  @if (isLoading()) {
    <mat-spinner data-testid="loading-spinner"></mat-spinner>
  }

  @if (hasError()) {
    <p data-testid="error-message">{{ errorMessage() }}</p>
  }

  @if (riskGroups$().length === 0) {
    <p data-testid="no-data-message">No data available</p>
  }

  @if (riskGroups$().length > 0) {
    <dms-summary-display
      data-testid="allocation-chart"
      [chartData]="allocationData"
      chartType="pie"
    />
  }
</div>
```

### Running E2E Tests

```bash
# Run all E2E tests
pnpm e2e:dms-material

# Run specific test file
pnpm playwright test global-summary.spec.ts

# Run in headed mode (see browser)
pnpm playwright test --headed

# Run with debugging
pnpm playwright test --debug

# Generate report
pnpm playwright show-report
```

## Definition of Done

- [ ] All E2E tests created and implemented
- [ ] Tests cover all user workflows
- [ ] Tests pass consistently (3 runs without failures)
- [ ] Tests run independently (any order)
- [ ] Data test IDs added to template
- [ ] Test documentation complete
- [ ] Code follows project conventions
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material` (should pass)
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] E2E tests reviewed and approved

## Notes

- E2E tests should test user workflows, not implementation details
- Use data-testid attributes for reliable selectors
- Avoid fixed timeouts; use waitFor methods
- Tests should be resilient to timing issues
- Mock external dependencies when necessary
- Consider testing on multiple browsers if resources allow

## Related Stories

- **Previous:** Story AS.8 (Bug Fixes)
- **Epic:** Epic AS - Wire Up Global/Summary Screen

---

## Change Log

| Date       | Version | Description      | Author |
| ---------- | ------- | ---------------- | ------ |
| 2026-02-27 | 1.0     | Initial creation | QA     |

---

## QA Results

*QA assessment will be recorded here after story review*

---

## Dev Agent Record

*This section will be populated during story implementation*
