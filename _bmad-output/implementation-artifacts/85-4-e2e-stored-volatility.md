# Story 85.4: E2E Verify Stored Volatility Correctness and Performance

Status: Approved

## Story

As a developer,
I want E2E tests that confirm stored volatility values produce the same icons as the previous
on-the-fly calculation and that icons update correctly after a data-change trigger event,
so that the optimisation introduced in Epic 85 is validated and a regression baseline is
established.

## Acceptance Criteria

1. **Given** the Universe screen loads with the stored volatility approach (from Story 85.3),
   **When** the Playwright test queries the "Vol" column for at least three symbols with
   known distribution history,
   **Then** the icons displayed match the categories expected for those symbols (icons are
   non-empty and use a valid `aria-label` matching the expected category).

2. **Given** a trigger event occurs (e.g. a universe symbol's distribution value is updated
   via the API in the test setup),
   **When** the Universe screen is refreshed (or the update propagates via the SmartNgRX
   store),
   **Then** the "Vol" icon for the affected symbol reflects the newly calculated value stored
   in the database.

3. **Given** the E2E tests are committed,
   **When** `pnpm all` runs,
   **Then** all new tests pass alongside all pre-existing tests.

## Tasks / Subtasks

- [ ] Task 1: Create seed helper for known-volatility symbols (AC: #1)
  - [ ] Create `apps/dms-material-e2e/src/helpers/seed-stored-volatility-e2e-data.helper.ts`
  - [ ] Seed at least 3 universe symbols, each with ≥ 12 months of `divDeposits` history
  - [ ] Symbol A: consistent amounts over 12 months (expected: `steady` → `volatility_long`/`volatility_short`)
  - [ ] Symbol B: increasing amounts over 12 months (expected: `increasing`)
  - [ ] Symbol C: varying/high-variance amounts (expected: `volatile`)
  - [ ] After inserting symbols and divDeposits, call the recalculation trigger via a POST/PATCH to the API (or run recalculation directly via test DB if easier) so `volatility_long` is populated
  - [ ] Return symbol names and expected categories for use in tests

- [ ] Task 2: Write E2E test — volatility icons are correct for known symbols (AC: #1)
  - [ ] Create `apps/dms-material-e2e/src/stored-volatility.spec.ts`
  - [ ] Use `seedStoredVolatilityData` helper to set up test data
  - [ ] Log in and navigate to the Universe screen
  - [ ] For each seeded symbol, locate its row in the table and verify the `mat-icon` in the "Vol" cell has the correct `aria-label` (e.g. `aria-label="Volatility: steady"`)
  - [ ] Use `expect.poll` for retries instead of fixed waits

- [ ] Task 3: Write E2E test — icon updates after data-change trigger (AC: #2)
  - [ ] In the same spec or a new `describe` block, seed a symbol with known distribution history
  - [ ] Record the initial `volatility_long` value (e.g. `steady`)
  - [ ] Send a PATCH request to the universe update API endpoint to modify the symbol's distribution value (triggering Story 85.2 recalculation)
  - [ ] Refresh the Universe screen
  - [ ] Confirm the "Vol" icon for that symbol changes to reflect the new stored category
  - [ ] If the distribution change doesn't produce a different category, assert the icon is still non-empty

- [ ] Task 4: Full test run (AC: #3)
  - [ ] Run `pnpm all` and confirm all tests pass including the new E2E spec

## Dev Notes

### E2E Test Environment

- E2E tests run against the dev server at **port 4301**: `http://localhost:4301`
- Run with: `pnpm e2e:dms-material:chromium`
- Login: use the `login` helper from `apps/dms-material-e2e/src/helpers/login.helper.ts`
- Do **not** use `waitForLoadState('networkidle')` — use `expect.poll()` or explicit element waits

### Seed Data Pattern

Follow the existing seed helper pattern from `seed-scroll-universe-data.helper.ts` and `seed-universe-e2e-data.helper.ts`:

```typescript
// apps/dms-material-e2e/src/helpers/seed-stored-volatility-e2e-data.helper.ts
export async function seedStoredVolatilityData(baseUrl: string): Promise<SeedResult> {
  // POST to /api/admin/test/seed or similar test seed endpoint
}
```

Check existing helpers to confirm the seed API endpoint pattern used in this project.

### Vol Column Icon `aria-label` Values

After Epic 84, the expected `aria-label` values on `<mat-icon>` elements in the "Vol" column:
- `aria-label="Volatility: steady"`
- `aria-label="Volatility: increasing"`
- `aria-label="Volatility: decreasing"`
- `aria-label="Volatility: volatile"`
- `aria-label="Volatility: flat"` (Epic 84)
- `aria-label="Volatility: up-then-down"` (Epic 84)
- `aria-label="Volatility: down-then-up"` (Epic 84)
- No icon rendered for `null` (insufficient data)

Use these to write reliable assertions without coupling to icon names.

### Table Selector Pattern

From `universe-scrolling-regression.spec.ts`, the universe table uses:
- Viewport: `cdk-virtual-scroll-viewport`
- Rows: `tr.mat-mdc-row`
- First cell in row: `tr.mat-mdc-row td:first-child`

For the Vol column (first column), target the `<mat-icon>` within the first `<td>`:
```typescript
const volCell = page.locator('tr.mat-mdc-row').filter({ hasText: symbolName }).locator('td').first();
const icon = volCell.locator('mat-icon');
await expect(icon).toHaveAttribute('aria-label', `Volatility: ${expectedCategory}`);
```

### Key Commands

```bash
pnpm start:server              # Start Fastify API (required for E2E)
pnpm start:dms-material        # Start Angular dev server (port 4301)
pnpm e2e:dms-material:chromium # Run E2E tests
pnpm all                       # Full lint + build + test
```

### References

- [apps/dms-material-e2e/src/helpers/login.helper.ts](apps/dms-material-e2e/src/helpers/login.helper.ts) — Login helper
- [apps/dms-material-e2e/src/helpers/seed-scroll-universe-data.helper.ts](apps/dms-material-e2e/src/helpers/seed-scroll-universe-data.helper.ts) — Seed helper pattern reference
- [apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts](apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts) — Row/cell selector patterns
- [apps/dms-material/src/app/global/global-universe/global-universe.component.html](apps/dms-material/src/app/global/global-universe/global-universe.component.html) — Vol column `aria-label` values in template
- Stories 85.1, 85.2, 85.3 must be completed before this E2E story
