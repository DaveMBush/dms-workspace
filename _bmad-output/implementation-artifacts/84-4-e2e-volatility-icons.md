# Story 84.4: E2E Tests — Volatility Icons on Universe Screen

Status: Review

## Story

As a developer,
I want Playwright E2E tests that verify: the "Vol" column shows icons for symbols without
positions, and the three new icon categories are rendered correctly,
so that future regressions to either fix are caught automatically in CI.

## Acceptance Criteria

1. **Given** the Universe screen is loaded,
   **When** the Playwright test queries the "Vol" column for a symbol known to have no
   open positions,
   **Then** the test confirms a non-empty icon is present in that cell.

2. **Given** the test database contains at least one symbol whose distribution history
   qualifies for each new category (flat, up-then-down, down-then-up),
   **When** the Playwright test renders the Universe screen,
   **Then** the test confirms the expected icon is rendered for each such symbol (identified
   by the `aria-label` attribute on the icon element).

3. **Given** the E2E tests are committed,
   **When** `pnpm all` runs,
   **Then** all new tests pass alongside all pre-existing tests.

## Tasks / Subtasks

- [x] Task 1: Confirm the Story 84.1 test now covers AC #1 (AC: #1)

  - [x] Read `apps/dms-material-e2e/src/volatility-visibility.spec.ts` — this was created
        in Story 84.1 and updated to pass in Story 84.2
  - [x] Confirm the test seeds a symbol with no positions and asserts the Vol icon is visible
  - [x] If the test is already passing and covers AC #1 completely, no additional test is
        needed for this AC — document this decision in Dev Agent Record

- [x] Task 2: Extend the E2E seed helper for new categories (AC: #2)

  - [x] Read `apps/dms-material-e2e/src/helpers/seed-vol-column-e2e-data.helper.ts` (from
        Story 81.3) for the seeding pattern
  - [x] Create or extend a seed helper that inserts distribution records qualifying for each
        of the three new categories:
    - `flat`: insert 24 months of nearly identical amounts (e.g., all `1.00`)
    - `up-then-down`: insert 24 months — first 12 at `2.00`, second 12 at `1.00`
    - `down-then-up`: insert 24 months — first 12 at `1.00`, second 12 at `2.00`
  - [x] Each seeded symbol must have no open trades (to also satisfy AC #1 coverage)
  - [x] Include a `cleanup` function to remove seeded data in `afterAll`
  - [x] Follow the same helper pattern as `seed-vol-column-e2e-data.helper.ts`

- [x] Task 3: Write E2E tests for the three new icon categories (AC: #2)

  - [x] Create `apps/dms-material-e2e/src/volatility-new-categories.spec.ts`
  - [x] Structure: `beforeAll` seeds data via the helper from Task 2; `afterAll` cleans up;
        `beforeEach` navigates to Universe screen
  - [x] Test 1 — `flat` icon:
    - Search for the seeded `flat` symbol
    - Assert `page.locator('[aria-label="Volatility: flat"]').first()` is visible
  - [x] Test 2 — `up-then-down` icon:
    - Search for the seeded `up-then-down` symbol
    - Assert `page.locator('[aria-label="Volatility: up-then-down"]').first()` is visible
  - [x] Test 3 — `down-then-up` icon:
    - Search for the seeded `down-then-up` symbol
    - Assert `page.locator('[aria-label="Volatility: down-then-up"]').first()` is visible
  - [x] Use `{ timeout: 10_000 }` on visibility assertions to allow for API latency
  - [x] All test functions must be named (no anonymous arrow functions)
  - [x] No `test.skip()` calls

- [x] Task 4: Verify icons have correct `aria-label` attributes (AC: #2)

  - [x] Read `apps/dms-material/src/app/global/global-universe/global-universe.component.html`
  - [x] Confirm that the `<mat-icon>` elements for `flat`, `up-then-down`, and `down-then-up`
        have the exact `aria-label` values expected by the E2E tests:
    - `aria-label="Volatility: flat"`
    - `aria-label="Volatility: up-then-down"`
    - `aria-label="Volatility: down-then-up"`
  - [x] If `aria-label` values differ between the template and the tests, update the tests to
        match the template (the template from Story 84.3 is the source of truth)

- [x] Task 5: Verify no regression to existing vol-column E2E tests (AC: #3)

  - [x] Run `apps/dms-material-e2e/src/vol-column.spec.ts` tests — confirm all still pass
  - [x] Run `apps/dms-material-e2e/src/volatility-visibility.spec.ts` tests — confirm pass
  - [x] Run new `apps/dms-material-e2e/src/volatility-new-categories.spec.ts` tests

- [x] Task 6: Run `pnpm all` and confirm all tests pass (AC: #3)
  - [x] Run `pnpm all` from workspace root
  - [x] All new and existing tests must pass
  - [x] No skipped tests introduced by this story

## Dev Notes

### Prerequisite Stories

- Story 84.1: provides the `volatility-visibility.spec.ts` failing test
- Story 84.2: fixes the visibility bug so `volatility-visibility.spec.ts` passes
- Story 84.3: adds the three new categories and icon template blocks with `aria-label`

Read the Dev Agent Records of all three stories before writing tests.

### Existing E2E Pattern (from Story 81.3)

```typescript
// apps/dms-material-e2e/src/vol-column.spec.ts
test.beforeAll(async function seedData() {
  const result = await seedVolColumnE2eData();
  cleanup = result.cleanup;
  symbol = result.symbol;
});

test.afterAll(async function teardown() {
  if (cleanup !== undefined) {
    await cleanup();
  }
});

test.beforeEach(async function navigateToUniverse({ page }) {
  await login(page);
  await page.goto('/global/universe');
  await page.waitForLoadState('networkidle');
});
```

Follow this pattern exactly in the new spec file.

### Icon Aria Labels

The `aria-label` values are set by Story 84.3 in `global-universe.component.html`. The E2E
tests must use the exact same strings. The expected mapping (set in Story 84.3) is:

- `flat` → `aria-label="Volatility: flat"`
- `up-then-down` → `aria-label="Volatility: up-then-down"`
- `down-then-up` → `aria-label="Volatility: down-then-up"`

Verify these against the actual template before writing the locators.

### Seeding Strategy for New Categories

The seed data must trigger the calculation thresholds defined in Story 84.3. Use the exact
amounts from the Story 84.3 unit tests as a reference for what data produces each category.

Example distribution record structure (check the actual API endpoint used by existing seed helpers):

```typescript
// POST to whatever endpoint seed-vol-column-e2e-data.helper.ts uses
// Each record: { symbol, amount, date, universeId }
// Seed 24 records for up-then-down: first 12 months at amount=2.00, next 12 at amount=1.00
```

### New Test File Structure

```typescript
// apps/dms-material-e2e/src/volatility-new-categories.spec.ts
import { expect, test } from 'playwright/test';
import { login } from './helpers/login.helper';
import { seedVolatilityNewCategoriesData } from './helpers/seed-volatility-new-categories.helper';

test.describe('Volatility — new icon categories', function describeNewCategories() {
  let cleanup: (() => Promise<void>) | undefined;
  let flatSymbol: string;
  let upThenDownSymbol: string;
  let downThenUpSymbol: string;

  test.beforeAll(async function seedData() {
    const result = await seedVolatilityNewCategoriesData();
    cleanup = result.cleanup;
    flatSymbol = result.flatSymbol;
    upThenDownSymbol = result.upThenDownSymbol;
    downThenUpSymbol = result.downThenUpSymbol;
  });

  test.afterAll(async function teardown() {
    if (cleanup !== undefined) {
      await cleanup();
    }
  });

  test.beforeEach(async function navigateToUniverse({ page }) {
    await login(page);
    await page.goto('/global/universe');
    await page.waitForLoadState('networkidle');
  });

  test('flat symbol shows flat icon', async function flatSymbolShowsFlatIcon({ page }) {
    const searchInput = page.locator('input[placeholder="Search Symbol"]');
    await searchInput.fill(flatSymbol);
    await expect(page.locator('[aria-label="Volatility: flat"]').first()).toBeVisible({ timeout: 10_000 });
  });

  // ... similar for upThenDownSymbol and downThenUpSymbol
});
```

### Key Commands

```bash
# Run only the new E2E tests
pnpm nx run dms-material-e2e:e2e -- --grep "Volatility — new icon categories"

# Run all volatility-related E2E tests
pnpm nx run dms-material-e2e:e2e -- --grep "Volatility"

# Run full suite
pnpm all
```

### References

- [Source: apps/dms-material-e2e/src/vol-column.spec.ts]
- [Source: apps/dms-material-e2e/src/volatility-visibility.spec.ts (Story 84.1)]
- [Source: apps/dms-material-e2e/src/helpers/seed-vol-column-e2e-data.helper.ts]
- [Source: apps/dms-material/src/app/global/global-universe/global-universe.component.html]
- [Source: _bmad-output/implementation-artifacts/84-1-investigate-volatility-visibility-bug.md]
- [Source: _bmad-output/implementation-artifacts/84-2-fix-volatility-data-filtering.md]
- [Source: _bmad-output/implementation-artifacts/84-3-add-new-volatility-icons.md]
- [Source: _bmad-output/planning-artifacts/epics-2026-04-23.md#story-844]

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Implementation Summary

- Added `apps/dms-material-e2e/src/helpers/seed-volatility-new-categories.helper.ts` to seed
  three no-position symbols with deterministic dividend histories for `flat`, `up-then-down`,
  and `down-then-up`, plus cleanup for seeded rows and the temporary account.
- Added `apps/dms-material-e2e/src/volatility-new-categories.spec.ts` using the existing
  beforeAll/afterAll/beforeEach E2E pattern, row-scoped search helpers, exact `aria-label`
  assertions, and explicit `0.00` position assertions so the new tests also prove zero-position
  rows still render a Vol icon.
- Kept AC #1 covered in two ways: the existing live `volatility-visibility.spec.ts` still passes,
  and the new seeded spec verifies the same no-position behavior deterministically for the new
  category fixtures.
- Used the exact classifier-triggering monthly sequences from Story 84.3's unit tests rather than
  the earlier 24-month sketch in the task notes, because those fixtures were already proven to
  resolve to the intended categories.

### Validation Notes

- `pnpm exec prisma generate` passed in the 84.4 worktree before test execution.
- `pnpm exec playwright test src/volatility-new-categories.spec.ts --project=chromium --config=apps/dms-material-e2e/playwright.config.ts`
  passed with 3 tests.
- `pnpm exec playwright test src/vol-column.spec.ts --project=chromium --config=apps/dms-material-e2e/playwright.config.ts`
  passed with 3 tests.
- `pnpm exec playwright test src/volatility-visibility.spec.ts --project=integration --config=apps/dms-material-e2e/playwright.config.ts`
  passed with 2 tests.
- `pnpm nx affected -t lint build --parallel=16 --uncommitted` ran no tasks because this story
  only changed `dms-material-e2e`, and the affected set for this workspace exposes E2E execution
  targets rather than `lint`, `build`, or `test` targets for that slice.
- `pnpm nx affected -t test --coverage --parallel=16 --uncommitted` also ran no tasks for the
  same reason.
- `pnpm all` passed from the committed story branch after the lint-rule refactor commit. The only
  remaining lint output was the pre-existing warning set in
  `apps/dms-material-e2e/src/helpers/seed-vol-column-e2e-data.helper.ts` about unused
  `eslint-disable` directives; there were no new lint errors, build failures, or test failures.

### Completion Notes List

- The new spec uses row-scoped locators instead of page-global icon lookups, so a wrong icon in
  another row cannot produce a false green.
- The helper keeps the no-trade setup from the existing volatility column seed pattern, which
  makes the icon assertions meaningful for the exact zero-position case that originally regressed.
- The lint refactor on the new helper reduced parameter count and function length to satisfy the
  repository's `max-params-no-constructor` and `max-lines-per-function` rules without changing the
  seeded behavior.

## File List

- `apps/dms-material-e2e/src/helpers/seed-volatility-new-categories.helper.ts` - added seeded
  volatility category fixtures and cleanup for new E2E coverage
- `apps/dms-material-e2e/src/volatility-new-categories.spec.ts` - added deterministic Playwright
  coverage for `flat`, `up-then-down`, and `down-then-up` icons
- `_bmad-output/implementation-artifacts/84-4-e2e-volatility-icons.md` - updated task state and
  recorded Story 84.4 implementation and validation details
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - moved Story 84.4 to `review`

## Change Log

| Date       | Change                                                                                                                 | Author |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- | ------ |
| 2026-04-26 | Added deterministic E2E seeding and Playwright coverage for the new volatility icon categories                         | Agent  |
| 2026-04-26 | Revalidated the existing visibility and Vol-column regressions, fixed helper lint violations, and ran `pnpm all` green | Agent  |
