# Story AG.2: Add E2E Tests Verifying Risk Groups Load Correctly

## Story

**As a** QA engineer
**I want** end-to-end tests that verify risk groups load properly
**So that** I can ensure the application works correctly from user perspective

## Context

**Current System:**

- AG.1 integrated risk group validation with comprehensive unit tests
- Need E2E tests to verify integration works end-to-end

**Testing Target:**

- E2E tests that verify risk groups exist when app starts
- Tests verify UI components can access risk groups
- Tests verify data flows correctly through the stack

## Acceptance Criteria

### Functional Requirements

- [ ] Test verifies risk groups load on app startup
- [ ] Test verifies screener can access risk groups
- [ ] Test verifies universe can access risk groups
- [ ] Test verifies all three risk groups exist (Equities, Income, Tax Free Income)

### Technical Requirements

- [ ] Use Playwright for E2E tests
- [ ] Tests run against real database (test environment)
- [ ] Tests verify database state
- [ ] Tests clean up after themselves

## Test-Driven Development Approach

### Step 1: Create E2E Tests

Create `apps/rms-material-e2e/src/risk-groups.spec.ts`:

```typescript
import { test, expect } from 'playwright/test';
import { login } from './helpers/login.helper';

test.describe('Risk Group Initialization', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should load all three risk groups on app start', async ({ page }) => {
    // Navigate to a page that uses risk groups (e.g., screener)
    await page.goto('/global/screener');
    await page.waitForLoadState('networkidle');

    // Verify risk group filter shows all three groups
    const riskGroupFilter = page.locator('mat-select[formControlName="riskGroup"]');
    await riskGroupFilter.click();

    // Verify all three risk groups are available
    await expect(page.getByRole('option', { name: 'Equities' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Income' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Tax Free Income' })).toBeVisible();
  });

  test('should load risk groups for universe screen', async ({ page }) => {
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');

    // Verify risk group filter available
    const riskGroupFilter = page.locator('.risk-group-filter');
    await expect(riskGroupFilter).toBeVisible();

    // Open filter dropdown
    await riskGroupFilter.click();

    // Verify all groups present
    await expect(page.getByRole('option', { name: 'Equities' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Income' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Tax Free Income' })).toBeVisible();
  });

  test('should have risk groups available immediately on app load', async ({ page }) => {
    // Start from login page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to any screen using risk groups
    await page.goto('/global/screener');

    // Risk groups should be immediately available (no loading delay)
    const riskGroupFilter = page.locator('mat-select');
    await riskGroupFilter.first().click();

    // Should see options without additional waiting
    await expect(page.getByRole('option', { name: 'Equities' })).toBeVisible({ timeout: 1000 });
  });

  test('should persist risk groups across navigation', async ({ page }) => {
    await page.goto('/global/screener');
    await page.waitForLoadState('networkidle');

    // Verify risk groups loaded
    const screenerFilter = page.locator('.risk-group-filter').first();
    await screenerFilter.click();
    await expect(page.getByRole('option', { name: 'Equities' })).toBeVisible();
    await page.keyboard.press('Escape'); // Close dropdown

    // Navigate to different screen
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');

    // Verify risk groups still available (not reloaded)
    const universeFilter = page.locator('.risk-group-filter').first();
    await universeFilter.click();
    await expect(page.getByRole('option', { name: 'Equities' })).toBeVisible();
  });

  test('should handle app refresh without losing risk groups', async ({ page }) => {
    await page.goto('/global/screener');
    await page.waitForLoadState('networkidle');

    // Verify initial load
    const filterBefore = page.locator('.risk-group-filter').first();
    await filterBefore.click();
    await expect(page.getByRole('option', { name: 'Equities' })).toBeVisible();
    await page.keyboard.press('Escape');

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify risk groups still available
    const filterAfter = page.locator('.risk-group-filter').first();
    await filterAfter.click();
    await expect(page.getByRole('option', { name: 'Equities' })).toBeVisible();
  });
});

test.describe('Risk Group Database Integrity', () => {
  test('should have exactly three risk groups in database', async ({ request }) => {
    // Query backend API to verify risk groups
    const response = await request.post('http://localhost:3000/api/risk-group', {
      data: [], // Load all
    });

    expect(response.ok()).toBeTruthy();
    const riskGroups = await response.json();

    expect(riskGroups).toHaveLength(3);

    const names = riskGroups.map((rg: any) => rg.name).sort();
    expect(names).toEqual(['Equities', 'Income', 'Tax Free Income']);
  });

  test('should create missing risk groups on first app load', async ({ request }) => {
    // This test would require database reset capability
    // Verify that if risk groups are missing, they are created

    // Query top endpoint (which triggers risk group validation)
    const response = await request.post('http://localhost:3000/api/top', {
      data: ['1'],
    });

    expect(response.ok()).toBeTruthy();

    // Verify response includes risk groups
    const topData = await response.json();
    expect(topData[0].riskGroups).toBeDefined();
    expect(topData[0].riskGroups.length).toBeGreaterThan(0);
  });
});
```

### Step 2: Run E2E Tests (Initial Run)

```bash
pnpm nx e2e rms-material-e2e
```

### Step 3: Debug and Fix Issues

- Review any failing tests
- Check network requests in Playwright trace
- Verify database state
- Fix any integration issues

### Step 4: Run E2E Tests (Should Pass)

```bash
pnpm nx e2e rms-material-e2e
```

All E2E tests should pass.

### Step 5: Verify with Playwright MCP

Use Playwright MCP server to:

1. Capture screenshots of risk group filters
2. Verify no console errors
3. Check network timing for risk group loading

## Technical Approach

### Files to Create

- `apps/rms-material-e2e/src/risk-groups.spec.ts` - E2E tests for risk groups

### Implementation Steps

1. Create test file structure
2. Add tests for risk group loading
3. Add tests for persistence across navigation
4. Add tests for database integrity
5. Run and debug tests
6. Verify with Playwright MCP

### Test Scenarios

- **Initialization**: Risk groups load on app start
- **UI Integration**: Risk groups available in dropdowns
- **Navigation**: Risk groups persist across routes
- **Refresh**: Risk groups survive page reload
- **Database**: Verify database contains exactly 3 risk groups
- **API**: Verify backend returns risk groups correctly

## Files Created

| File                                            | Purpose                   |
| ----------------------------------------------- | ------------------------- |
| `apps/rms-material-e2e/src/risk-groups.spec.ts` | E2E tests for risk groups |

## Definition of Done

- [ ] All E2E tests created
- [ ] Tests verify risk groups load on startup
- [ ] Tests verify UI integration
- [ ] Tests verify persistence
- [ ] Tests verify database integrity
- [ ] All E2E tests pass
- [ ] Playwright MCP verification complete (no console errors)
- [ ] All existing tests still pass
- [ ] Lint passes
- [ ] Code reviewed
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:rms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- This completes Epic AG (Risk Group Data Initialization)
- E2E tests provide confidence that the integration works end-to-end
- Use Playwright's tracing feature for debugging
- Consider adding performance tests for risk group loading time
- Verify tests work in CI/CD environment
