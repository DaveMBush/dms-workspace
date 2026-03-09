# Story AV.12: Write E2E Tests for State Persistence - TDD RED Phase

## Story

**As a** developer
**I want** to write comprehensive E2E tests for state persistence
**So that** I have automated tests that verify the complete user flow (TDD RED phase)

## Context

**Current System:**

- State persistence feature implemented and manually verified (AV.1-AV.11)
- Need E2E tests to prevent regressions
- Need test-first approach for E2E coverage

**Implementation Approach:**

- Write E2E tests for complete state persistence flow
- Test user interactions and page refreshes
- Cover all persistence scenarios
- Disable tests after writing to allow CI to pass
- Tests will be re-enabled in Story AV.13

## Acceptance Criteria

### Functional Requirements

- [ ] E2E tests written for state persistence
  - [ ] Test global tab selection persistence through refresh
  - [ ] Test account selection persistence through refresh
  - [ ] Test account tab selection persistence through refresh
  - [ ] Test complete state restoration after refresh
  - [ ] Test independent tab state per account
  - [ ] Test clearing state (fresh start)
- [ ] All tests initially configured but disabled
- [ ] Tests disabled with `.skip` to allow CI to pass

### Technical Requirements

- [ ] Tests use Playwright
- [ ] Tests properly handle page refreshes
- [ ] Tests verify UI state accurately
- [ ] Test descriptions are clear and specific
- [ ] Tests follow project E2E patterns

## Implementation Details

### Step 1: Write E2E Test Spec

```typescript
import { test, expect } from '@playwright/test';

test.describe.skip('State Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear localStorage before each test
    await page.evaluate(() => localStorage.clear());
  });

  test('should persist global tab selection through refresh', async ({ page }) => {
    // Select Account tab
    await page.click('[data-testid="global-tab-account"]');

    // Verify Account tab selected
    await expect(page.locator('[data-testid="global-tab-account"]')).toHaveAttribute('aria-selected', 'true');

    // Refresh page
    await page.reload();

    // Verify Account tab still selected
    await expect(page.locator('[data-testid="global-tab-account"]')).toHaveAttribute('aria-selected', 'true');
  });

  test('should persist account selection through refresh', async ({ page }) => {
    // Navigate to Account tab
    await page.click('[data-testid="global-tab-account"]');

    // Select specific account
    await page.click('[data-testid="account-123"]');

    // Verify account selected
    await expect(page.locator('[data-testid="selected-account-name"]')).toContainText('Account 123');

    // Refresh page
    await page.reload();

    // Verify account still selected
    await expect(page.locator('[data-testid="selected-account-name"]')).toContainText('Account 123');
  });

  test('should persist account tab selection per account through refresh', async ({ page }) => {
    // Navigate to Account tab
    await page.click('[data-testid="global-tab-account"]');

    // Select account 1 and set to Holdings tab
    await page.click('[data-testid="account-123"]');
    await page.click('[data-testid="account-tab-holdings"]');

    // Select account 2 and set to Activity tab
    await page.click('[data-testid="account-456"]');
    await page.click('[data-testid="account-tab-activity"]');

    // Verify account 2 Activity tab selected
    await expect(page.locator('[data-testid="account-tab-activity"]')).toHaveAttribute('aria-selected', 'true');

    // Refresh page
    await page.reload();

    // Verify account 2 Activity tab still selected
    await expect(page.locator('[data-testid="account-tab-activity"]')).toHaveAttribute('aria-selected', 'true');

    // Switch to account 1
    await page.click('[data-testid="account-123"]');

    // Verify account 1 Holdings tab selected (independent state)
    await expect(page.locator('[data-testid="account-tab-holdings"]')).toHaveAttribute('aria-selected', 'true');
  });

  test('should restore complete state on page load', async ({ page }) => {
    // Set up complete state
    await page.click('[data-testid="global-tab-account"]');
    await page.click('[data-testid="account-123"]');
    await page.click('[data-testid="account-tab-distributions"]');

    // Refresh page
    await page.reload();

    // Verify all state restored
    await expect(page.locator('[data-testid="global-tab-account"]')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-testid="selected-account-name"]')).toContainText('Account 123');
    await expect(page.locator('[data-testid="account-tab-distributions"]')).toHaveAttribute('aria-selected', 'true');
  });

  test('should handle fresh start with no saved state', async ({ page }) => {
    // Clear any saved state
    await page.evaluate(() => localStorage.clear());

    // Reload page
    await page.reload();

    // Verify defaults used
    await expect(page.locator('[data-testid="global-tab-sell"]')).toHaveAttribute('aria-selected', 'true');
  });
});
```

### Step 2: Add test-id Attributes

Ensure components have data-testid attributes for E2E testing.

### Step 3: Run Tests and Verify Skipped

```bash
pnpm e2e:dms-material:chromium
```

Verify all new tests are skipped.

## Definition of Done

- [ ] All E2E tests written and disabled (RED phase)
- [ ] Tests cover all acceptance criteria scenarios
- [ ] Tests disabled to allow CI to pass
- [ ] Test-id attributes added to components
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD RED phase for E2E tests
- Tests should be comprehensive but maintainable
- Story AV.13 will enable tests and fix any issues
- All unit and e2e tests must pass even if you think they are unrelated to this story.
- If any tests fail, fix them before merging this story to ensure a stable baseline for Story AV.13
- E2E tests must be run for Chromium and Firefox separately and both must pass before merge.

## Related Stories

- **Previous**: Story AV.11 (Bug Fix)
- **Next**: Story AV.13 (E2E Implementation)
- **Epic**: Epic AV

---

## Dev Agent Record

### Status

Ready for Review

### Agent Model Used

Claude Opus 4.6

### File List

- `apps/dms-material-e2e/src/state-persistence.spec.ts` (new - 9 skipped E2E tests)
- `apps/dms-material/src/app/accounts/account.html` (modified - added data-testid to global nav links)
- `apps/dms-material/src/app/account-panel/account-panel.component.html` (modified - added data-testid to tab links)
- `docs/stories/AV.12.tdd-e2e-state-persistence.md` (modified - Dev Agent Record)

### Change Log

- Created `state-persistence.spec.ts` with `test.describe.skip` containing 9 E2E tests
- Added data-testid attributes: global-nav-universe, global-nav-screener, global-nav-summary, global-nav-error-logs
- Added data-testid attributes: account-tab-summary, account-tab-open, account-tab-sold, account-tab-div-dep
- Tests cover: global tab persistence, account selection persistence, account tab persistence (including per-account independence), complete state restoration, fresh start

### Debug Log References

None needed

### Completion Notes

- All 9 E2E tests are skipped (RED phase)
- 1553 unit tests passing, 0 E2E failures (skipped tests don't count)
- E2E: 513 passed chromium + 513 passed firefox, 136 skipped each (including our 9)
- 0 clones, lint clean, format clean
