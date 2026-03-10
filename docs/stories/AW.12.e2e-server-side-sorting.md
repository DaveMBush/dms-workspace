# Story AW.12: Add E2E Tests for Complete Server-Side Sorting Workflow

## Story

**As a** developer
**I want** comprehensive e2e tests for server-side sorting
**So that** we can prevent regressions and ensure the feature works end-to-end

## Context

**Current System:**

- All implementation completed (AW.1-AW.11)
- Unit tests passing
- Integration testing and bug fixes completed
- Need e2e tests for confidence

**Implementation Approach:**

- Write Playwright e2e tests for all sorting scenarios
- Test complete user workflows
- Verify sort state persistence
- Test across different browsers

## Acceptance Criteria

### Functional Requirements

- [ ] E2E tests for universe table sorting
  - [ ] Test sorting by each field in both directions
  - [ ] Test sort state persistence across page refresh
  - [ ] Test visual feedback of sort state
- [ ] E2E tests for open trades sorting
  - [ ] Test sorting by each field in both directions
  - [ ] Test sort state persistence
- [ ] E2E tests for closed trades sorting
  - [ ] Test sorting by each field in both directions
  - [ ] Test sort state persistence
- [ ] All e2e tests passing in Chromium and Firefox

### Technical Requirements

- [ ] Tests use Playwright best practices
- [ ] Tests are reliable and non-flaky
- [ ] Tests verify actual data order
- [ ] Tests check network requests
- [ ] Tests are well-documented

## Implementation Details

### Step 1: Create Universe Table E2E Tests

```typescript
test.describe('Universe Table - Server-Side Sorting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/universe');
    await page.waitForLoadState('networkidle');
  });

  test('should sort by symbol ascending', async ({ page }) => {
    await page.click('[data-testid="sort-symbol"]');

    // Verify request headers
    const response = await page.waitForResponse(/\/api\/universe/);
    const headers = response.request().headers();
    expect(headers['x-sort-field']).toBe('symbol');
    expect(headers['x-sort-order']).toBe('asc');

    // Verify visual order
    const symbols = await page.locator('[data-testid="universe-symbol"]').allTextContents();
    expect(symbols).toEqual([...symbols].sort());
  });

  test('should persist sort across page refresh', async ({ page }) => {
    await page.click('[data-testid="sort-name"]');
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify sort indicator still shows
    await expect(page.locator('[data-testid="sort-name"][data-sort="asc"]')).toBeVisible();

    // Verify request still includes sort headers
    const response = await page.waitForResponse(/\/api\/universe/);
    const headers = response.request().headers();
    expect(headers['x-sort-field']).toBe('name');
  });

  // Add tests for all other fields...
});
```

### Step 2: Create Trades E2E Tests

```typescript
test.describe('Trades - Server-Side Sorting', () => {
  test('should sort open trades by openDate descending', async ({ page }) => {
    await page.goto('/trades');
    await page.click('[data-testid="tab-open-trades"]');
    await page.click('[data-testid="sort-openDate"]');
    await page.click('[data-testid="sort-openDate"]'); // Click twice for desc

    const response = await page.waitForResponse(/\/api\/trades\/open/);
    const headers = response.request().headers();
    expect(headers['x-sort-field']).toBe('openDate');
    expect(headers['x-sort-order']).toBe('desc');
  });

  test('should sort closed trades by profit', async ({ page }) => {
    await page.goto('/trades');
    await page.click('[data-testid="tab-closed-trades"]');
    await page.click('[data-testid="sort-profit"]');

    const response = await page.waitForResponse(/\/api\/trades\/closed/);
    const headers = response.request().headers();
    expect(headers['x-sort-field']).toBe('profit');
  });

  // Add more trade sorting tests...
});
```

### Step 3: Create Sort Persistence E2E Test

```typescript
test.describe('Sort State Persistence', () => {
  test('should maintain sort state across navigation and return', async ({ page }) => {
    // Sort universe
    await page.goto('/universe');
    await page.click('[data-testid="sort-sector"]');

    // Navigate away
    await page.goto('/trades');

    // Navigate back
    await page.goto('/universe');

    // Verify sort still applied
    await expect(page.locator('[data-testid="sort-sector"][data-sort="asc"]')).toBeVisible();
    const response = await page.waitForResponse(/\/api\/universe/);
    expect(response.request().headers()['x-sort-field']).toBe('sector');
  });
});
```

### Step 4: Run E2E Tests

```bash
pnpm e2e:dms-material:chromium
pnpm e2e:dms-material:firefox
```

## Definition of Done

- [ ] All e2e tests written and passing
- [ ] Tests cover all sorting scenarios
- [ ] Tests verify network requests and headers
- [ ] Tests verify visual state and data order
- [ ] Tests verify sort persistence
- [ ] Tests passing in both Chromium and Firefox
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the final story in Epic AW
- All e2e tests must be reliable and non-flaky
- Tests provide confidence for future changes
- Epic complete upon story completion

## Related Stories

- **Previous**: Story AW.11 (Bug Fix and Verification)
- **Next**: Story AW.13 (bug fix)
- **Epic**: Epic AW

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Status

In Progress

### Tasks / Subtasks

- [x] Research existing e2e patterns and sort interceptor behavior
- [x] Create server-side-sorting.spec.ts with 17 e2e tests
  - [x] Universe sorting: Symbol, Risk Group, direction toggle, indicator, localStorage
  - [x] Universe persistence: page refresh, cross-navigation
  - [x] Open Positions: pre-set sort, unrealizedGain, sortable headers, visual indicator
  - [x] Closed Positions: pre-set sort, sortable column, visual indicator
  - [x] Cross-table: independent states, no-sort-params, clear on 3rd click
- [x] pnpm all passes (EXIT=0)
- [x] pnpm format passes
- [x] pnpm dupcheck passes (1 pre-existing clone in server code, not ours)
- [ ] e2e-chromium passes
- [ ] e2e-firefox passes
- [ ] Commit, push, create PR
- [ ] CodeRabbit review loop
- [ ] Squash merge

### File List

- apps/dms-material-e2e/src/server-side-sorting.spec.ts (new)

### Change Log

- Created server-side-sorting.spec.ts with 17 comprehensive e2e tests
- Tests verify localStorage sort state, persistence, cross-table independence
- Uses query params (sortBy/sortOrder) approach matching sort.interceptor.ts

### Debug Log References

- GitHub Issue: #628
