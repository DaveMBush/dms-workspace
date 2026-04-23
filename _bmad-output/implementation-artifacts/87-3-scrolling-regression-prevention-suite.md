# Story 87.3: Comprehensive Scrolling Regression Prevention Suite

Status: Approved

## Story

As a developer,
I want a comprehensive Playwright E2E regression-prevention suite covering all four affected
screens (Universe, Open Positions, Sold Positions, Dividend Deposits) with scroll patterns and
data volumes representative of the live application,
so that any future recurrence of the janky-scroll defect is caught in CI before it reaches
production.

## Acceptance Criteria

1. **Given** the regression-prevention suite runs against test databases seeded with a number
   of rows similar in scale to the live application,
   **When** each screen is loaded and scrolled through multiple patterns — fast to bottom,
   fast to top, oscillation (bottom → top → bottom), scroll-after-filter, scroll-after-sort —
   **Then** all test cases pass with no blank rows, missing symbols, or empty data at any
   scroll position.

2. **Given** the suite covers all four screens (Universe, Open Positions, Sold Positions,
   Dividend Deposits),
   **When** a future change re-introduces the scrolling defect on any one of those screens,
   **Then** at least one test in the suite fails before the change ships.

3. **Given** the test database seed for the suite,
   **When** the developer configures the seed data,
   **Then** each affected screen has enough rows to require virtual scrolling — at a minimum
   more rows than the default CDK viewport can display at once (use ≥ 60 rows for Universe,
   ≥ 40 rows for Open/Sold Positions, ≥ 60 rows for Dividend Deposits).

4. **Given** the existing regression tests from Epics 60 and 64
   (`universe-scrolling-regression.spec.ts`),
   **When** the new suite is committed,
   **Then** the existing tests are preserved and extended — not replaced — so that all
   previously captured failure modes remain guarded.

5. **Given** all changes are committed,
   **When** `pnpm all` runs,
   **Then** all new and existing scrolling regression tests pass.

## Tasks / Subtasks

- [ ] Task 1: Extend `universe-scrolling-regression.spec.ts` with new scroll patterns (AC: #1, #4)
  - [ ] Open `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts`
  - [ ] Add the following new `test()` cases (do NOT remove existing tests):
    - `'scrolls fast to bottom and back without blank rows'` — already exists; confirm still passing
    - `'handles oscillation (fast bottom-top-bottom-top) without blank rows'` — new
    - `'no blank rows after applying a filter and scrolling'` — new (use risk group filter)
    - `'no blank rows after changing sort order and scrolling'` — new (sort by symbol, then scroll)
  - [ ] Use the existing `seedScrollUniverseData` helper and `assertVisibleSymbolsNonEmpty` utility
  - [ ] Data volume: ≥ 60 rows (use existing seed helper — it already seeds 60 rows)

- [ ] Task 2: Create `open-positions-scrolling-regression.spec.ts` (AC: #1, #2, #3)
  - [ ] Create `apps/dms-material-e2e/src/open-positions-scrolling-regression.spec.ts`
  - [ ] Use the `seedScrollOpenPositionsData` helper from Story 87.1 findings / existing helper
  - [ ] Data volume: ≥ 40 open-position rows (enough to require virtual scroll)
  - [ ] Test cases:
    - `'all position rows populate after fast scroll to bottom'`
    - `'no blank rows after oscillation scroll (bottom-top-bottom)'`
    - `'position data (symbol, quantity, buy price) non-empty at all scroll positions'`
  - [ ] Assertion: every visible row's symbol cell, quantity cell, and buy-price cell must be non-empty
  - [ ] Use `expect.poll` — no fixed sleeps

- [ ] Task 3: Create `sold-positions-scrolling-regression.spec.ts` (AC: #1, #2, #3)
  - [ ] Create `apps/dms-material-e2e/src/sold-positions-scrolling-regression.spec.ts`
  - [ ] Use `seedScrollSoldPositionsData` helper from `seed-scroll-sold-positions-data.helper.ts`
  - [ ] Data volume: ≥ 40 sold-position rows
  - [ ] Test cases:
    - `'all sold-position rows populate after fast scroll to bottom'`
    - `'no blank rows after oscillation scroll'`
  - [ ] Assertion: symbol cell and sell-price cell non-empty at all scroll positions

- [ ] Task 4: Extend `div-deposits-smooth-scroll.spec.ts` OR create `div-deposits-scrolling-regression.spec.ts` (AC: #1, #2, #3, #4)
  - [ ] Check `apps/dms-material-e2e/src/div-deposits-smooth-scroll.spec.ts` — if it already covers the required scroll patterns, extend it; otherwise create a new file
  - [ ] Use `seedScrollDivDepositsWithSymbolsData` helper
  - [ ] Data volume: ≥ 60 deposit rows
  - [ ] Test cases:
    - `'all deposit rows populate after fast scroll to bottom'`
    - `'no blank rows after oscillation scroll'`
    - `'no blank rows after filter and scroll'` (filter by deposit type if available)
  - [ ] Preserve all existing tests in the file

- [ ] Task 5: Verify `universe-smooth-scroll.spec.ts` is still passing (AC: #4)
  - [ ] Open `apps/dms-material-e2e/src/universe-smooth-scroll.spec.ts`
  - [ ] Run it and confirm green
  - [ ] If any tests are flaky, stabilise them using `expect.poll` (do not skip)

- [ ] Task 6: Full test run (AC: #5)
  - [ ] Run `pnpm all` and confirm all scrolling regression tests pass
  - [ ] Confirm no tests are skipped with `test.skip()` or `test.describe.skip()`
  - [ ] Check with: `grep -r "test.skip\|describe.skip" apps/dms-material-e2e/src/` — should return empty results for scrolling specs

## Dev Notes

### E2E Test Environment

- Port: **4301** (`pnpm start:dms-material`)
- Run with: `pnpm e2e:dms-material:chromium`
- Login helper: `apps/dms-material-e2e/src/helpers/login.helper.ts`
- Do **not** use `waitForLoadState('networkidle')`
- Do **not** use fixed `page.waitForTimeout()` — use `expect.poll()` or `toBeVisible()`

### Data Volume Requirements

The CDK virtual scroll viewport activates when there are more rows than can be displayed in
the viewport height. Based on the `row-height-audit.md` documentation, rows are ~48px. A
typical viewport is ~700px → ~14 visible rows. Use these minimums:

| Screen | Minimum Rows | Existing Seed Helper |
|--------|-------------|----------------------|
| Universe | 60 rows | `seed-scroll-universe-data.helper.ts` |
| Open Positions | 40 rows (in same account) | `seed-scroll-open-positions-data.helper.ts` |
| Sold Positions | 40 rows | `seed-scroll-sold-positions-data.helper.ts` |
| Dividend Deposits | 60 deposits | `seed-scroll-div-deposits-with-symbols-data.helper.ts` |

### Scroll Pattern Helper

Use the programmatic scroll pattern from `universe-scrolling-regression.spec.ts`:

```typescript
async function scrollToBottom(page: Page): Promise<void> {
  await page.locator('cdk-virtual-scroll-viewport').evaluate(
    function doScroll(el: Element) {
      (el as HTMLElement).scrollTop = (el as HTMLElement).scrollHeight;
    }
  );
}

async function scrollToTop(page: Page): Promise<void> {
  await page.locator('cdk-virtual-scroll-viewport').evaluate(
    function doScroll(el: Element) {
      (el as HTMLElement).scrollTop = 0;
    }
  );
}
```

### `assertVisibleSymbolsNonEmpty` Utility

The `universe-scrolling-regression.spec.ts` file contains a reusable assertion utility. Extract
it to a shared helper file if it needs to be used by more than one spec:

```
apps/dms-material-e2e/src/helpers/assert-visible-rows-non-empty.helper.ts
```

### Filter/Sort Scroll Test Strategy

For `scroll-after-filter` tests:
1. Apply a risk group filter (if on Universe) or date range filter
2. Wait for the filtered result to render
3. Scroll to the bottom of the filtered list
4. Assert no blank rows in the visible viewport

For `scroll-after-sort` tests:
1. Click a sortable column header to change sort order
2. Wait for re-render
3. Scroll to the bottom
4. Assert no blank rows

### Existing Spec Files

Do NOT modify these files' existing tests — only extend:
- `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts` ← extend
- `apps/dms-material-e2e/src/universe-smooth-scroll.spec.ts` ← keep as-is
- `apps/dms-material-e2e/src/open-positions-smooth-scroll.spec.ts` ← keep as-is (new regression spec is separate)
- `apps/dms-material-e2e/src/div-deposits-smooth-scroll.spec.ts` ← extend or create companion

### Key Commands

```bash
pnpm start:server                      # Start API
pnpm start:dms-material                # Start Angular dev server (port 4301)
pnpm e2e:dms-material:chromium         # Run all E2E tests
pnpm all                               # Full lint + build + test

# Confirm no scrolling tests are skipped:
grep -r "test\.skip\|describe\.skip" apps/dms-material-e2e/src/
```

### References

- [apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts](apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts) — Primary regression spec (extend, do not replace)
- [apps/dms-material-e2e/src/universe-smooth-scroll.spec.ts](apps/dms-material-e2e/src/universe-smooth-scroll.spec.ts) — Smooth scroll patterns reference
- [apps/dms-material-e2e/src/open-positions-smooth-scroll.spec.ts](apps/dms-material-e2e/src/open-positions-smooth-scroll.spec.ts) — Open positions scroll reference
- [apps/dms-material-e2e/src/div-deposits-smooth-scroll.spec.ts](apps/dms-material-e2e/src/div-deposits-smooth-scroll.spec.ts) — Div deposits scroll reference
- [apps/dms-material-e2e/src/helpers/seed-scroll-universe-data.helper.ts](apps/dms-material-e2e/src/helpers/seed-scroll-universe-data.helper.ts) — Universe seed
- [apps/dms-material-e2e/src/helpers/seed-scroll-open-positions-data.helper.ts](apps/dms-material-e2e/src/helpers/seed-scroll-open-positions-data.helper.ts) — Open positions seed
- [apps/dms-material-e2e/src/helpers/seed-scroll-sold-positions-data.helper.ts](apps/dms-material-e2e/src/helpers/seed-scroll-sold-positions-data.helper.ts) — Sold positions seed
- [apps/dms-material-e2e/src/helpers/seed-scroll-div-deposits-with-symbols-data.helper.ts](apps/dms-material-e2e/src/helpers/seed-scroll-div-deposits-with-symbols-data.helper.ts) — Div deposits seed
- [apps/dms-material/src/app/shared/components/base-table/base-table.component.ts](apps/dms-material/src/app/shared/components/base-table/base-table.component.ts) — BaseTableComponent
- Story 87.2 must be completed before this story (tests must pass, not fail)
