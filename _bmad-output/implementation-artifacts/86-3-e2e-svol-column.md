# Story 86.3: E2E Tests — SVol Column on Universe Screen

Status: Approved

## Story

As a developer,
I want Playwright E2E tests that verify the "SVol" column is the 2nd column, that the header
tooltip reads "Short-Term Volatility", and that at least one symbol displays a short-term
volatility icon,
so that future regressions to the column position, tooltip, or rendering are caught in CI.

## Acceptance Criteria

1. **Given** the Universe screen is rendered,
   **When** the Playwright test queries the table column headers,
   **Then** the first column header has the text "Vol" and the second column header has the
   text "SVol".

2. **Given** the "SVol" column header,
   **When** the Playwright test hovers over it,
   **Then** a tooltip containing "Short-Term Volatility" is visible.

3. **Given** at least one symbol with sufficient 1-year distribution history exists in the
   test database (seeded by the test),
   **When** the Universe screen is rendered,
   **Then** at least one row in the "SVol" column (2nd column) displays a `<mat-icon>` element
   with a non-empty `aria-label` attribute matching `"Short-Term Volatility: ..."`.

4. **Given** the E2E tests are committed,
   **When** `pnpm all` runs,
   **Then** all new tests pass alongside all pre-existing tests.

## Tasks / Subtasks

- [ ] Task 1: Create E2E spec file for SVol column (AC: #1, #2, #3)
  - [ ] Create `apps/dms-material-e2e/src/svol-column.spec.ts`
  - [ ] Seed test data with at least one symbol that has ≥ 12 months of `divDeposits` and a non-null `volatility_short` stored (use the seeder from Story 85.4 or create a minimal seeder)
  - [ ] Log in using `login` helper from `apps/dms-material-e2e/src/helpers/login.helper.ts`
  - [ ] Navigate to the Universe screen

- [ ] Task 2: Test — "Vol" is 1st column, "SVol" is 2nd column (AC: #1)
  - [ ] Query all `th.mat-mdc-header-cell` (or equivalent column header selector) in the universe table
  - [ ] Assert the first header text content is `"Vol"` (trim whitespace)
  - [ ] Assert the second header text content is `"SVol"` (trim whitespace)

- [ ] Task 3: Test — "SVol" header tooltip (AC: #2)
  - [ ] Locate the "SVol" column header element
  - [ ] Hover over it using `locator.hover()`
  - [ ] Wait for the Angular Material tooltip to appear (`mat-tooltip-component` or `.mdc-tooltip__surface`)
  - [ ] Assert the tooltip text contains "Short-Term Volatility"
  - [ ] Use `expect.poll` for tooltip visibility check to avoid flakiness

- [ ] Task 4: Test — at least one symbol has SVol icon (AC: #3)
  - [ ] Find all rows in the universe table
  - [ ] Locate the 2nd `<td>` in each row (the "SVol" column)
  - [ ] Assert that at least one of those cells contains a `mat-icon` with an `aria-label` matching `/Short-Term Volatility: /`
  - [ ] Use `expect.poll` to allow time for data to load

- [ ] Task 5: Full test run (AC: #4)
  - [ ] Run `pnpm all` and confirm all tests pass

## Dev Notes

### E2E Test Environment

- E2E tests run against dev server at **port 4301**: `http://localhost:4301`
- Run with: `pnpm e2e:dms-material:chromium`
- Login helper: `apps/dms-material-e2e/src/helpers/login.helper.ts`
- Do **not** use `waitForLoadState('networkidle')` — use `expect.poll()` or `toBeVisible()`
- Do **not** use `route.abort('failed')` for error mocking — use `route.fulfill({ status: 500 })`

### Column Header Selectors

Angular Material tables use `th.mat-mdc-header-cell` for column headers. The column header
order matches the `UNIVERSE_COLUMNS` array order. After Story 86.2:

```
th[0] → "Vol"
th[1] → "SVol"
th[2] → "Symbol"
...
```

Target the header text:
```typescript
const headers = page.locator('tr.mat-mdc-header-row th.mat-mdc-header-cell');
await expect(headers.nth(0)).toContainText('Vol');
await expect(headers.nth(1)).toContainText('SVol');
```

### Tooltip Interaction

Angular Material tooltips appear after a hover. The tooltip element selector:
```typescript
// Material MDC tooltip
const tooltip = page.locator('.mdc-tooltip__surface');
await page.locator('th').filter({ hasText: 'SVol' }).hover();
await expect(tooltip).toContainText('Short-Term Volatility', { timeout: 3000 });
```

### SVol Icon Assertion

The 2nd column `<td>` contains a `<mat-icon>` for non-null volatility:
```typescript
const svolCells = page.locator('tr.mat-mdc-row td:nth-child(2)');
const count = await svolCells.count();
let iconFound = false;
for (let i = 0; i < count; i++) {
  const icon = svolCells.nth(i).locator('mat-icon');
  const ariaLabel = await icon.getAttribute('aria-label');
  if (ariaLabel?.startsWith('Short-Term Volatility:')) {
    iconFound = true;
    break;
  }
}
expect(iconFound).toBe(true);
```

Or use `expect.poll` for cleaner retries.

### Seed Data

Reuse the seed helper created in Story 85.4 (`seed-stored-volatility-e2e-data.helper.ts`) or
use the symbol seeding pattern from `seed-universe-e2e-data.helper.ts`. The symbol must have:
1. `divDeposits` records spanning ≥ 12 months
2. `volatility_short` populated (either via trigger or direct DB seed)

### Key Commands

```bash
pnpm start:server              # Start API server (required for E2E)
pnpm start:dms-material        # Start Angular dev server (port 4301)
pnpm e2e:dms-material:chromium # Run E2E tests
pnpm all                       # Full lint + build + test
```

### References

- [apps/dms-material-e2e/src/helpers/login.helper.ts](apps/dms-material-e2e/src/helpers/login.helper.ts) — Login helper
- [apps/dms-material-e2e/src/helpers/seed-universe-e2e-data.helper.ts](apps/dms-material-e2e/src/helpers/seed-universe-e2e-data.helper.ts) — Universe seed pattern
- [apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts](apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts) — Table selector patterns
- [apps/dms-material/src/app/global/global-universe/global-universe.columns.ts](apps/dms-material/src/app/global/global-universe/global-universe.columns.ts) — Column order reference
- Stories 86.1 and 86.2 must be completed before this story
