# Story 56.1: Write Failing E2E Test for Empty Rows on Symbol Sort

Status: Approved

## Story

As a developer,
I want a Playwright e2e test that confirms the first visible rows of the Universe are empty
immediately after applying Symbol ascending sort,
so that I have a reproducible red test to guide the fix in Story 56.2.

## Acceptance Criteria

1. **Given** the Universe screen loads with Symbol ascending sort applied,
   **When** the first rows of the virtual-scroll viewport are inspected immediately after load (no
   scrolling),
   **Then** the first row's symbol cell is empty — and the test currently **FAILS** (confirms the bug).

2. **Given** the test is committed,
   **When** `pnpm run e2e:dms-material:chromium` runs,
   **Then** the new test fails.

3. **Given** all other existing tests are unmodified,
   **When** the test suite runs,
   **Then** all previously passing tests continue to pass.

## Definition of Done

- [ ] Playwright test file `universe-symbol-sort-empty-rows.spec.ts` created in `apps/dms-material-e2e/src/`
- [ ] Test loads Universe with Symbol ascending sort and asserts the first visible row is NOT empty (assertion currently fails, confirming the bug)
- [ ] Test is currently **red**
- [ ] `pnpm all` passes

## Tasks / Subtasks

- [ ] **Task 1: Reproduce via Playwright MCP server**
  - [ ] Open Universe screen
  - [ ] Clear localStorage sort state so default sort applies
  - [ ] Set Symbol ascending sort (click Symbol column header once or set via localStorage)
  - [ ] Observe: first visible rows have empty symbol cells immediately on load
  - [ ] Scroll down and back up — rows populate (confirms lazy-load refresh issue)
  - [ ] Capture a screenshot of the empty rows for reference

- [ ] **Task 2: Create `universe-symbol-sort-empty-rows.spec.ts`**
  - [ ] Seed enough symbols so the virtual scroll viewport has rows to display
  - [ ] Set Symbol ascending sort in localStorage before navigating to Universe (or click the sort header after navigation)
  - [ ] Wait for the Universe table to render (wait for row count > 0, or a specific Angular CDK virtual scroll stabilise)
  - [ ] **Do NOT scroll** — inspect the first 3 rows immediately
  - [ ] Assert that row 1's symbol cell text is non-empty (this will currently **fail**)

- [ ] **Task 3: Verify test is red**
  - [ ] Run `pnpm run e2e:dms-material:chromium --grep "empty rows"` and confirm failure

## Dev Notes

### Key Files

| File | Purpose |
|------|---------|
| `apps/dms-material-e2e/src/helpers/seed-universe-e2e-data.helper.ts` | Seed helper |
| `apps/dms-material-e2e/src/universe-screen-e2e.spec.ts` | Reference for row selectors |
| `apps/dms-material-e2e/src/universe-sort-filter-persistence.spec.ts` | Reference for localStorage manipulation before navigation |

### Setting sort state in localStorage before test

```typescript
// Set Symbol ascending sort before navigating to Universe
await page.evaluate(function setSortState(): void {
  localStorage.setItem('dms-sort-filter-state', JSON.stringify({
    universes: { sortColumns: [{ active: 'symbol', direction: 'asc' }] }
  }));
});
await page.goto('/universe');
```

### Virtual scroll stabilisation

After navigation, wait for the first row to be in the DOM before asserting:
```typescript
const firstRow = page.locator('mat-row, cdk-row').first();
await firstRow.waitFor({ state: 'attached' });
// Do NOT scroll — immediately assert cell text
```
