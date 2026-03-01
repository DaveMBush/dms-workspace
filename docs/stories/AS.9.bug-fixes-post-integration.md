# Story AS.9: Bug Fixes - Post Integration

**Status:** Approved

## Story

**As a** user
**I want** the Global Summary and table features to display and scroll correctly
**So that** I can reliably use them for portfolio analysis without visual glitches

## Context

**Current System:**

- Epic AS (AS.1–AS.8) is complete
- Integration testing with real data revealed additional visual and data bugs
- These bugs were not caught by unit tests because they manifest in the browser

**Purpose:**

- Fix table scrolling visual regressions (borders, filter header)
- Fix Portfolio Performance graph display and data accuracy issues
- Fix year picker visibility on Global Summary screen
- Prepare for E2E testing in Story AS.10

**Bug Discovery Process:**

1. Manual testing with real backend after AS.8 merge
2. Visual inspection of scrolling behaviour in all table components
3. Comparison of Portfolio Performance graph against expected data model

## Acceptance Criteria

### Functional Requirements

1. [ ] Table borders remain visible (non-transparent) while scrolling
2. [ ] Filter header row remains stable and visible while scrolling
3. [ ] Year picker is visible and usable on the Global Summary screen
4. [ ] Portfolio Performance graph: January data point begins at the December closing value of the previous year
5. [ ] Portfolio Performance graph occupies the full height of its panel (consistent with Account Summary)
6. [ ] Portfolio Performance graph Capital Gains line plots: Base + Capital Gains (cumulative)
7. [ ] Portfolio Performance graph Dividend line plots: Base + Capital Gains + Dividends (cumulative)
8. [ ] Universe table displays Avg Purchase Yield %, Most Recent Sell Date, and Most Recent Sell $ values
9. [ ] CUSIP numbers are correctly resolved to ticker symbols during CSV import (or clearly documented as needing manual follow-up if the OpenFIGI API has changed)

### Technical Requirements

1. [ ] Regression tests added for each bug fixed
2. [ ] All existing tests still passing
3. [ ] Code follows project coding standards
4. [ ] No console errors or warnings

## Tasks / Subtasks

- [ ] Fix table scrolling border transparency (AC: 1)
  - [ ] Identify CSS rule causing borders to become transparent on scroll
  - [ ] Apply fix (likely `background-clip`, `background-color`, or `will-change` on sticky cells)
  - [ ] Verify fix in Chrome and Firefox
- [ ] Fix filter header scroll stability (AC: 2)
  - [ ] Identify why filter header disappears momentarily on scroll
  - [ ] Apply fix (likely z-index or `position: sticky` stacking context issue)
  - [ ] Verify fix in Chrome and Firefox
- [ ] Fix year picker visibility (AC: 3)
  - [ ] Identify why year picker is not visible on Global Summary screen
  - [ ] Apply fix (likely a CSS layout or `mat-select` styling issue)
  - [ ] Verify fix
- [ ] Fix Portfolio Performance graph January starting value (AC: 4)
  - [ ] Update graph data generation to carry the December closing value forward as the January opening value
  - [ ] Add regression test
- [ ] Fix Portfolio Performance graph height (AC: 5)
  - [ ] Update CSS/template so the line chart container fills the panel height
  - [ ] Compare with Account Summary screen layout
- [ ] Fix Portfolio Performance Capital Gains line formula (AC: 6)
  - [ ] Update `performanceChartData` computed signal to plot Base + Capital Gains
  - [ ] Add regression test
- [ ] Fix Portfolio Performance Dividend line formula (AC: 7)
  - [ ] Update `performanceChartData` computed signal to plot Base + Capital Gains + Dividends
  - [ ] Add regression test
- [ ] Fix Universe table missing columns (AC: 8)
  - [ ] Add `avg_purchase_yield_percent` field to `Universe` interface in `apps/dms-material/src/app/store/universe/universe.interface.ts`
  - [ ] Verify backend API (`GET /api/universe`) returns the field (compare with `dms` app's universe store)
  - [ ] If server does not return the field, add it to the backend Prisma query and API response
  - [ ] Add regression test confirming all three columns are populated
- [ ] Investigate and fix CUSIP resolution (AC: 9)
  - [ ] Manually test OpenFIGI API with a known CUSIP to check current response structure
  - [ ] Verify `idType: 'ID_CUSIP'` is still the correct identifier type (OpenFIGI v3)
  - [ ] Check if response shape has changed (e.g. `ticker` field vs `shareClassFIGI` or other)
  - [ ] Update `resolve-cusip.function.ts` to match current API contract
  - [ ] If API is inaccessible/broken: document clearly and flag for manual follow-up
  - [ ] Add/update regression tests
- [ ] Final verification (AC: 1–9)
  - [ ] Run all unit tests
  - [ ] Run all validation commands
  - [ ] Manual testing of all scenarios
  - [ ] Verify no console errors

## Dev Notes

### Testing Standards

- **Test Location:** Frontend tests in `apps/dms-material/src/app/**/*.spec.ts`
- **Testing Framework:** Vitest
- **Testing Approach:** Fix → Regression test → Verify
- **Bug Fix Pattern:** Reproduce → Test → Fix → Verify

### Technical Context

- Component: `apps/dms-material/src/app/global/global-summary.ts`
- Template: `apps/dms-material/src/app/global/global-summary.html`
- Service: `apps/dms-material/src/app/global/services/summary.service.ts`
- Graph backend: `apps/server/src/app/routes/summary/graph/index.ts`
- Base table CSS: `apps/dms-material/src/app/shared/components/base-table/` (search for sticky cell styles)
- Universe interface: `apps/dms-material/src/app/store/universe/universe.interface.ts` — missing `avg_purchase_yield_percent`
- Universe enrich function: `apps/dms-material/src/app/global/global-universe/enrich-universe-with-risk-groups.function.ts` — does not copy `avg_purchase_yield_percent`
- Universe column definitions: `apps/dms-material/src/app/global/global-universe/global-universe.columns.ts` — columns defined but data absent
- Reference implementation: `apps/dms/src/app/global/global-universe/universe-display-data.interface.ts` — has `avg_purchase_yield_percent`
- CUSIP resolver: `apps/server/src/app/routes/import/resolve-cusip.function.ts`
- CUSIP resolver tests: `apps/server/src/app/routes/import/resolve-cusip.function.spec.ts`
- OpenFIGI API: `https://api.openfigi.com/v3/mapping` — verify `idType: 'ID_CUSIP'` and response shape still valid
- Local development: `pnpm dev` starts frontend and backend

### Portfolio Performance Graph Data Model

The graph endpoint returns per-month data in the form:

```typescript
interface GraphPoint {
  month: string;       // e.g. "01-2025"
  deposits: number;    // cumulative base (running total of deposits)
  dividends: number;   // monthly dividend income
  capitalGains: number; // monthly capital gains
}
```

The three lines to display are:

| Line | Formula | Description |
|------|---------|-------------|
| Base | `deposits` | Running total of deposits (already cumulative) |
| Capital Gains | `deposits + cumulative capitalGains` | Base plus accumulated capital gains |
| Dividends | `deposits + cumulative capitalGains + cumulative dividends` | All three combined |

- **January continuity**: The first data point of a year should begin at the last value of the previous year (December closing), not at zero. The backend may need to provide a "prior year closing" baseline, or the frontend should fetch and carry forward the December value from the previous year.
- **Graph height**: Use `height: 100%` / flexbox on the container div so the chart fills its panel.

### Bug Template

For each bug found, document:

```markdown
#### Bug #X: [Short Description]

**Severity:** Critical | Major | Minor

**Steps to Reproduce:**
1. Step 1

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**Fix:**
Description of the fix applied

**Regression Test:**
Test added to prevent recurrence
```

## Bug List

*Bugs will be documented here as they are discovered during implementation*

### Bug #1: Table Border Transparency on Scroll

**Severity:** Major

**Steps to Reproduce:**
1. Navigate to any screen with a large table (e.g. Open Positions, Sold Positions, Universe)
2. Scroll down

**Expected Behavior:**
Table borders remain visible (white/themed colour) while scrolling

**Actual Behavior:**
White borders disappear; table content bleeds through transparent cell borders

**Fix:**
TBD — likely a `background-color` missing on sticky cells, or a `background-clip` issue with border rendering during composited scroll.

---

### Bug #2: Filter Header Disappears Momentarily During Scroll

**Severity:** Major

**Steps to Reproduce:**
1. Navigate to any screen with a filterable table
2. Scroll down slowly

**Expected Behavior:**
Filter header row remains fully visible at all times

**Actual Behavior:**
Filter header row briefly disappears and reappears as user scrolls down

**Fix:**
TBD — likely a `z-index` or stacking context issue with `position: sticky` on the filter header row.

---

### Bug #3: Year Picker Not Visible on Global Summary

**Severity:** Major

**Steps to Reproduce:**
1. Navigate to Global Summary screen
2. Look for the year picker next to "Portfolio Performance" heading

**Expected Behavior:**
Year picker (`mat-select`) is visible and selectable

**Actual Behavior:**
Year picker is not visible

**Fix:**
TBD — investigate CSS layout issue. The element is in the DOM (see `global-summary.html`) but may be hidden by overflow or zero-height container.

---

### Bug #4: Portfolio Performance January Does Not Continue from December

**Severity:** Major

**Steps to Reproduce:**
1. Navigate to Global Summary
2. View Portfolio Performance graph

**Expected Behavior:**
The January data point starts at the same Y value where December of the previous year ended

**Actual Behavior:**
January starts at zero or an incorrect baseline

**Fix:**
TBD — carry forward the December closing value of the prior year as the January opening baseline.

---

### Bug #5: Portfolio Performance Graph Does Not Fill Panel Height

**Severity:** Minor

**Steps to Reproduce:**
1. Navigate to Global Summary
2. Compare chart height with Account Summary screen

**Expected Behavior:**
Portfolio Performance line chart fills the full height of the right panel (consistent with Account Summary)

**Actual Behavior:**
Chart is smaller than the available panel height

**Fix:**
TBD — update container CSS to use `height: 100%` or flexbox stretch.

---

### Bug #6: Capital Gains Line Plots Only Capital Gains (Not Base + Cap Gains)

**Severity:** Major

**Steps to Reproduce:**
1. Navigate to Global Summary
2. View Portfolio Performance graph Capital Gains line

**Expected Behavior:**
Capital Gains line = Base (deposits running total) + cumulative Capital Gains

**Actual Behavior:**
Capital Gains line plots only cumulative Capital Gains without the Base offset

**Fix:**
TBD — update `performanceChartData` computed signal dataset for "Capital Gains" to add the `deposits` value to each cumulative capital-gains total.

---

### Bug #7: Dividend Line Plots Incorrectly

**Severity:** Major

**Steps to Reproduce:**
1. Navigate to Global Summary
2. View Portfolio Performance graph Dividend line

**Expected Behavior:**
Dividend line = Base + cumulative Capital Gains + cumulative Dividends

**Actual Behavior:**
Dividend line plots only cumulative Dividends without the Base and Capital Gains offset

**Fix:**
TBD — update `performanceChartData` computed signal dataset for "Dividends" to add the `deposits` and cumulative capital gains values.

---

### Bug #8: Universe Table Missing Avg Purchase Yield, Most Recent Sell Date, Most Recent Sell $

**Severity:** Major

**Steps to Reproduce:**
1. Navigate to the Universe screen
2. Observe the `Avg Purch Yield %`, `Mst Rcnt Sll Dt`, and `Mst Rcnt Sell $` columns

**Expected Behavior:**
All three columns show the correct values from the data store

**Actual Behavior:**
`Avg Purch Yield %` always shows `-` (or zero); `Mst Rcnt Sll Dt` and `Mst Rcnt Sell $` may also be empty

**Root Cause:**
`avg_purchase_yield_percent` is missing from the `Universe` interface in `apps/dms-material/src/app/store/universe/universe.interface.ts`. The column definition and template rendering are already correct, but the property is never populated because the interface (and likely the backend query) does not include it.

**Fix:**
Add `avg_purchase_yield_percent: number` to the `Universe` interface. Verify the backend API returns the field and, if not, add it to the Prisma include/select in the universe route.

**Regression Test:**
Add test confirming `avg_purchase_yield_percent` is present and non-null on rows that have purchase history.

---

### Bug #9: CUSIP Resolution Not Working Correctly

**Severity:** Major

**Steps to Reproduce:**
1. Import a CSV file that contains CUSIP identifiers instead of ticker symbols
2. Observe that positions remain unmatched (symbol column shows the raw CUSIP)

**Expected Behavior:**
CUSIP identifiers are resolved to ticker symbols via the OpenFIGI API (with Yahoo Finance fallback), so imported positions are matched correctly

**Actual Behavior:**
CUSIP resolution fails — tickers are not returned / positions remain unresolved

**Root Cause (suspected):**
The OpenFIGI API v3 contract may have changed since the implementation was written. Possible issues:
- Response structure changed (`ticker` field renamed or nested differently)
- Rate limiting / authentication requirements changed
- The `idType: 'ID_CUSIP'` identifier type may need updating

**Fix:**
Investigate by sending a manual test request to `https://api.openfigi.com/v3/mapping` with a known CUSIP. Update `resolve-cusip.function.ts` to match the current API contract. If the API is fundamentally broken or requires paid access without an API key, document clearly and flag for manual follow-up by the developer.

**Note:** If investigation reveals this requires significant research into a changed API contract that cannot be completed autonomously, document the findings and leave a clear `TODO` for manual resolution.

**Regression Test:**
Update `resolve-cusip.function.spec.ts` to accurately mock the current API response shape.

---

## Definition of Done

- [ ] All 9 bugs fixed (or documented with clear TODO if CUSIP API requires manual follow-up)
- [ ] Regression tests added for each bug
- [ ] All tests passing (`pnpm all`)
- [ ] No console errors or warnings
- [ ] Code follows project conventions
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Manual verification complete

## Notes

- These bugs were found during manual integration testing after AS.8 was merged
- Focus on correct visual behaviour and chart data accuracy
- Keep fixes minimal and targeted; do not refactor unrelated code
- Bugs #1 and #2 (table scrolling) may share a root cause — investigate together
- Bug #8 (universe columns): The column definitions and template are correct; the fix is purely in the data model (`Universe` interface + possibly the backend query)
- Bug #9 (CUSIP): If the API has changed in a way that cannot be resolved autonomously, it is acceptable to document findings and leave a clear TODO rather than blocking the rest of the story

## Related Stories

- **Previous:** Story AS.8 (Bug Fixes for Global Summary)
- **Next:** Story AS.10 (Add E2E Tests)
- **Epic:** Epic AS - Wire Up Global/Summary Screen

---

## Change Log

| Date       | Version | Description      | Author |
| ---------- | ------- | ---------------- | ------ |
| 2026-03-01 | 1.0     | Initial creation | PM     |
| 2026-03-01 | 1.1     | Added bugs #8 (universe columns) and #9 (CUSIP resolution) | PM     |

---

## QA Results

*QA assessment will be recorded here after story review*

---

## Dev Agent Record

*This section will be populated during story implementation*
