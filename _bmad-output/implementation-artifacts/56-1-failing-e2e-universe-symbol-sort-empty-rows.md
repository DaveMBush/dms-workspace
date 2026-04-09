# Story 56.1: Write Failing E2E Test for Empty Rows on Symbol Sort

Status: review

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

- [x] **Task 1: Reproduce via Playwright MCP server**

  - [x] Open Universe screen
  - [x] Clear localStorage sort state so default sort applies
  - [x] Set Symbol ascending sort (click Symbol column header once or set via localStorage)
  - [x] Observe: first visible rows have empty symbol cells immediately on load
  - [x] Scroll down and back up — rows populate (confirms lazy-load refresh issue)
  - [x] Capture a screenshot of the empty rows for reference

- [x] **Task 2: Create `universe-symbol-sort-empty-rows.spec.ts`**

  - [x] Seed enough symbols so the virtual scroll viewport has rows to display
  - [x] Set Symbol ascending sort in localStorage before navigating to Universe (or click the sort header after navigation)
  - [x] Wait for the Universe table to render (wait for row count > 0, or a specific Angular CDK virtual scroll stabilise)
  - [x] **Do NOT scroll** — inspect the first 3 rows immediately
  - [x] Assert that row 1's symbol cell text is non-empty (this will currently **fail**)

- [x] **Task 3: Verify test is red**
  - [x] Run `pnpm run e2e:dms-material:chromium --grep "empty rows"` and confirm failure

## Dev Notes

### Key Files

| File                                                                 | Purpose                                                   |
| -------------------------------------------------------------------- | --------------------------------------------------------- |
| `apps/dms-material-e2e/src/helpers/seed-universe-e2e-data.helper.ts` | Seed helper                                               |
| `apps/dms-material-e2e/src/universe-screen-e2e.spec.ts`              | Reference for row selectors                               |
| `apps/dms-material-e2e/src/universe-sort-filter-persistence.spec.ts` | Reference for localStorage manipulation before navigation |

### Setting sort state in localStorage before test

```typescript
// Set Symbol ascending sort before navigating to Universe
await page.evaluate(function setSortState(): void {
  localStorage.setItem(
    'dms-sort-filter-state',
    JSON.stringify({
      universes: { sortColumns: [{ active: 'symbol', direction: 'asc' }] },
    })
  );
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

## Dev Agent Record

### Implementation Plan

1. Investigated `universeDefinition.defaultRow` — confirms `symbol: ''` is returned for unloaded positions.
2. Confirmed that SmartNgRX returns `defaultRow` objects immediately when CDK virtual scroll accesses proxy indices, dispatching `loadByIds` asynchronously.
3. Used Playwright `page.route()` to intercept and delay `/api/universe` POST requests by 6 seconds before navigation so the initial load triggers empty cell state reliably.
4. Set Symbol ascending `sortColumns` state in localStorage (`{ column: 'symbol', direction: 'asc' }`) before navigating so sort is applied on first render.
5. Used `waitFor({ state: 'attached' })` on first `tr.mat-mdc-row` to detect rows without waiting for data.
6. Verified test fails with `Expected first visible symbol cell to be non-empty but got: ""` — confirms the bug.
7. Verified `pnpm all` (lint + build + unit tests) passes.
8. Verified `pnpm dupcheck` passes.
9. Verified `pnpm format` makes no changes.

### Completion Notes

- Test file `apps/dms-material-e2e/src/universe-symbol-sort-empty-rows.spec.ts` created.
- Test reliably fails (red) — `symbol` cell returns empty string because SmartNgRX `defaultRow` is shown before `/api/universe` responds.
- All previously passing tests continue to pass.
- `pnpm all` passes.
- Correct SortColumn localStorage format: `{ column: 'symbol', direction: 'asc' }` (not `active` as noted in Dev Notes — corrected).

## File List

- `apps/dms-material-e2e/src/universe-symbol-sort-empty-rows.spec.ts` (new)

## Change Log

- 2026-04-08: Created failing e2e test `universe-symbol-sort-empty-rows.spec.ts` that reproducibly fails due to SmartNgRX showing empty `defaultRow` objects (symbol:'') before `/api/universe` data loads when Symbol ascending sort is applied on navigation.
