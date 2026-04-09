# Story 54.1: Write Failing E2E Test for Universe Sort State Persistence

Status: Approved

## Story

As a developer,
I want a Playwright e2e test that proves the Universe sort state is **not** currently persisted
across navigation,
so that I have a reproducible red test to guide the fix in Story 54.2.

## Acceptance Criteria

1. **Given** a developer navigates to the Universe screen and applies a non-default sort (e.g. Symbol descending),
   **When** the developer navigates to another route and back to the Universe screen,
   **Then** the sort indicator reflects the previously chosen sort — and the test currently **FAILS** because the sort is not restored.

2. **Given** the e2e test is committed with the current (broken) behaviour,
   **When** `pnpm run e2e:dms-material:chromium` runs,
   **Then** the new test fails (confirming the regression is captured).

3. **Given** all other existing e2e tests are unmodified,
   **When** the test suite runs,
   **Then** all previously passing tests continue to pass.

## Definition of Done

- [ ] Playwright test file `universe-sort-stickiness.spec.ts` created in `apps/dms-material-e2e/src/`
- [ ] Test applies a sort, navigates away, navigates back, and asserts the sort indicator is restored
- [ ] Test is currently **red** (failing) to confirm the regression exists
- [ ] `pnpm all` passes (unit tests unaffected; only the new e2e test fails)

## Tasks / Subtasks

- [ ] **Task 1: Reproduce the regression manually via Playwright MCP server**

  - [ ] Open the Universe screen
  - [ ] Click the Symbol column header to sort descending
  - [ ] Navigate to another route (e.g. Accounts)
  - [ ] Navigate back to Universe
  - [ ] Observe: sort indicator is gone / reset — confirm the bug is live

- [ ] **Task 2: Create `universe-sort-stickiness.spec.ts`**

  - [ ] Import `Page` from `@playwright/test` and the existing `clearSortFilterState` helper pattern
  - [ ] Seed minimal universe data (at least 2 symbols) using existing `seed-universe-e2e-data.helper.ts`
  - [ ] Clear `dms-sort-filter-state` from localStorage at test start
  - [ ] Navigate to Universe, click Symbol header to apply Symbol descending sort
  - [ ] Navigate to another route (e.g. `/accounts`)
  - [ ] Navigate back to Universe
  - [ ] Assert the active sort indicator on the Symbol column is `desc` (this will **fail**)
  - [ ] Assert the first row's symbol is Z-sorted (last alphabetically) — also fails currently

- [ ] **Task 3: Verify test is red**
  - [ ] Run `pnpm run e2e:dms-material:chromium --grep "sort stickiness"` and confirm it fails

## Dev Notes

### Key Files

| File                                                                     | Purpose                                       |
| ------------------------------------------------------------------------ | --------------------------------------------- |
| `apps/dms-material-e2e/src/universe-sort-filter-persistence.spec.ts`     | Existing persistence tests — use as reference |
| `apps/dms-material-e2e/src/helpers/seed-universe-e2e-data.helper.ts`     | Seed helper for universe e2e data             |
| `apps/dms-material/src/app/shared/services/sort-filter-state.service.ts` | Service that reads/writes localStorage        |

### localStorage key

```typescript
// Clear sort state helper pattern (from universe-sort-filter-persistence.spec.ts)
async function clearSortFilterState(page: Page): Promise<void> {
  await page.evaluate(function removeSortFilterState(): void {
    localStorage.removeItem('dms-sort-filter-state');
  });
}
```

### Sort indicator selector pattern

The sort direction indicator on column headers uses Angular Material's `mat-sort-header`. Look for
`aria-sort` attribute on the `<th>` element or the `mat-sort-header-arrow` element visibility to
assert the current sort direction.
