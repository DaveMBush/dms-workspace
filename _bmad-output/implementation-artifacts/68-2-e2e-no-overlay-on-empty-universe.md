# Story 68.2: Add E2E Regression Test for Empty Universe State

Status: Approved

## Story

As a developer,
I want an E2E regression test that asserts no overlay message appears above the Universe table,
so that the empty-state overlay cannot be accidentally re-introduced.

## Acceptance Criteria

1. **Given** the Universe screen is loaded with an empty dataset (no rows seeded),
   **When** the page finishes rendering,
   **Then** the Playwright test confirms `.empty-state` is not present in the DOM (or has a count
   of zero).

2. **Given** the column headers of the Universe table,
   **When** the page is rendered with no rows,
   **Then** the column headers are visible and no element obscures them.

3. **Given** the new test is added,
   **When** `pnpm all` runs,
   **Then** the test is **green** and the full suite passes.

## Tasks / Subtasks

- [ ] Task 1: Confirm the fix from Story 68.1 is present before writing the test (AC: #1)
  - [ ] Subtask 1.1: Verify `@if (showEmptyState$())` block is absent from
        `apps/dms-material/src/app/global/global-universe/global-universe.component.html`
  - [ ] Subtask 1.2: Use the Playwright MCP server to navigate to `/global/universe` with a clean
        (empty) test database; confirm `.empty-state` is not present in the DOM snapshot

- [ ] Task 2: Write the regression E2E test (AC: #1, #2, #3)
  - [ ] Subtask 2.1: Open
        `apps/dms-material-e2e/src/universe-table-workflows.spec.ts`
  - [ ] Subtask 2.2: Add a new `test.describe` block (or add to an existing appropriate describe
        block) with a test named `'should not show empty-state overlay when universe has no rows'`
  - [ ] Subtask 2.3: The test should:
        (a) Log in and navigate to `/global/universe` without seeding any data (or with an explicit
        empty-state setup — do not reuse the `seedUniverseData` helper that populates rows),
        (b) Wait for the page to stabilise (network idle or `dms-base-table` visible),
        (c) Assert `page.locator('.empty-state').count()` equals `0`,
        (d) Assert at least one column header (`th.mat-mdc-header-cell`) is visible
  - [ ] Subtask 2.4: If the `beforeEach` in the containing `test.describe` always seeds data,
        add the empty-universe regression test in its own `test.describe` block with its own
        `beforeEach` that does NOT call `seedUniverseData`
  - [ ] Subtask 2.5: Add a comment block above the test referencing Epic 68 Story 68.2 and
        explaining what regression it guards against

- [ ] Task 3: Run the test in isolation and confirm it is green (AC: #3)
  - [ ] Subtask 3.1: Run `pnpm nx e2e dms-material-e2e --grep "should not show empty-state"` and
        confirm it passes
  - [ ] Subtask 3.2: Run `pnpm all` and confirm all tests pass

## Dev Notes

### Key Files

| File | Purpose |
|------|---------|
| `apps/dms-material-e2e/src/universe-table-workflows.spec.ts` | Host file for the new regression test |
| `apps/dms-material-e2e/src/helpers/login.helper.ts` | Login helper to reuse in `beforeEach` |
| `apps/dms-material-e2e/src/helpers/seed-universe-data.helper.ts` | Data seeder — do NOT call this in the empty-state test |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.html` | Confirms `.empty-state` block is gone after Story 68.1 |

### Test Structure Sketch

```typescript
test.describe('Empty Universe State', () => {
  /**
   * Regression guard for Epic 68 / Story 68.2.
   * The showEmptyState$ computed and its @if block were removed in Story 68.1.
   * This test ensures the empty-state overlay cannot be accidentally re-introduced.
   */
  test.beforeEach(async ({ page }) => {
    // Do NOT seed any universe data — we want the table empty.
    await login(page);
    await page.goto('/global/universe');
    await expect(page.locator('dms-base-table')).toBeVisible();
  });

  test('should not show empty-state overlay when universe has no rows', async ({ page }) => {
    // Assert the overlay element is absent entirely
    await expect(page.locator('.empty-state')).toHaveCount(0);

    // Assert column headers are visible and not obscured
    await expect(page.locator('th.mat-mdc-header-cell').first()).toBeVisible();
  });
});
```

### Why No Data Seeding

The `beforeEach` in the top-level `Universe Table Workflows` describe block calls
`seedUniverseData()`. To test the empty-state scenario, place the new test in its own
`test.describe` block that does **not** call the seeder. This ensures the test exercises the
page in the state that triggered the original bug — loading with zero rows.

### Cleanup Note

The empty-state test itself does not create any database rows, so no `afterEach` cleanup is needed
for data. However, if the `login` call creates a session, the existing logout/cleanup pattern
from the rest of the file should be followed if applicable.

### Project Structure Notes

- E2E test files live under `apps/dms-material-e2e/src/`
- Helpers live under `apps/dms-material-e2e/src/helpers/`
- Use `await expect(locator).toHaveCount(0)` rather than `not.toBeVisible()` — the element should
  not be in the DOM at all, not merely hidden

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-13.md - Epic 68 Story 68.2]
- [Story 68.1: _bmad-output/implementation-artifacts/68-1-remove-no-results-message.md]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
