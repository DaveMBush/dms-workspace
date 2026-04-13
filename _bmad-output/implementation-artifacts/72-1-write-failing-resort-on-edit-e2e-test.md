# Story 72.1: Write Failing E2E Test for Re-sort After Cell Edit

Status: Approved

## Story

As a developer,
I want a failing E2E test that demonstrates the row does not move to its correct sorted position
after an in-cell edit,
so that fixing the bug in Story 72.2 can be validated by making the test green.

## Acceptance Criteria

1. **Given** the Universe table is sorted by a column (e.g. `distribution` ascending),
   **When** the Playwright MCP server edits a cell value in a row such that the row should move
   (e.g. changes a low distribution to a high value that would place it at the bottom),
   **Then** the test asserts the row is now at the correct sorted position — and currently **FAILS**
   because the row remains at its old position.

2. **Given** the test is added to `apps/dms-material-e2e/src/universe-table-workflows.spec.ts` or
   a new `apps/dms-material-e2e/src/universe-resort-on-edit.spec.ts`,
   **When** `pnpm all` runs,
   **Then** the new test is the only new failing test (all other tests continue to pass).

3. **Given** no production code is changed in this story,
   **When** `pnpm all` runs,
   **Then** all previously passing tests continue to pass.

## Tasks / Subtasks

- [ ] Task 1: Reproduce the bug with Playwright MCP server (AC: #1)
  - [ ] Subtask 1.1: Start the dev server and navigate to the Universe screen
  - [ ] Subtask 1.2: Sort the Universe table by distribution (ascending) so rows are ordered
        by distribution value from lowest to highest
  - [ ] Subtask 1.3: Note the symbol and position of a row with a low distribution value
  - [ ] Subtask 1.4: Edit that row's distribution cell to a high value that should move the
        row toward the bottom of the sorted list
  - [ ] Subtask 1.5: Confirm the row does NOT move after the edit — document this in Dev Notes

- [ ] Task 2: Write the failing E2E test (AC: #1, #2)
  - [ ] Subtask 2.1: Choose the target spec file — prefer adding to
        `apps/dms-material-e2e/src/universe-table-workflows.spec.ts` if appropriate; otherwise
        create `apps/dms-material-e2e/src/universe-resort-on-edit.spec.ts`
  - [ ] Subtask 2.2: Write a test that:
        (a) navigates to the Universe screen
        (b) sorts the table by a sortable column
        (c) records the pre-edit row order (e.g. first row symbol)
        (d) edits a cell value that should change the row's sorted position
        (e) asserts the row has moved to the correct new position
  - [ ] Subtask 2.3: Mark the test with `test.fail()` so `pnpm all` continues to pass while
        the production bug exists
  - [ ] Subtask 2.4: Name the test `BUG(72-1): row does not re-sort after cell edit`
  - [ ] Subtask 2.5: Run `pnpm all` and confirm it passes with the `test.fail()` annotation

- [ ] Task 3: Confirm no regressions (AC: #3)
  - [ ] Subtask 3.1: Verify all previously passing e2e tests still pass
  - [ ] Subtask 3.2: Confirm the new `test.fail()` test is the only new failure

## Dev Notes

### Key Files

| File | Purpose |
|------|---------|
| `apps/dms-material-e2e/src/universe-table-workflows.spec.ts` | Primary target spec for the failing test |
| `apps/dms-material-e2e/src/universe-resort-on-edit.spec.ts` | Alternative: create this if the above is too large or unrelated |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.ts` | Contains `sortColumns$` (signal, line ~104) and `filteredData$` (computed, line ~166) |
| `apps/dms-material/src/app/global/global-universe/handle-cell-edit.function.ts` | `handleCellEdit` function — mutates row in-place |

### Architecture Context

The bug root cause (to be confirmed by Playwright MCP session):

The `handleCellEdit` function in `handle-cell-edit.function.ts` mutates the row object in-place.
`filteredData$` is a `computed()` signal that depends on `sortColumns$` and other signals. Because
the row mutation happens on the object reference — not by setting a new signal value — Angular's
reactivity graph has no reason to re-run the `filteredData$` computed, and the table does not
re-sort.

The test must exercise this exact scenario: edit a cell in a sorted table and assert the row
physically moved in the rendered DOM.

### Technical Guidance

**Test structure (approximate):**
```ts
test.fail('BUG(72-1): row does not re-sort after cell edit', async function verifyRowResortAfterCellEdit({ page }) {
  await page.goto('/universe');
  // Wait for table to load
  // Sort by distribution ascending
  // Get the symbol of the first row (lowest distribution)
  // Edit that row's distribution to a very high value
  // Assert the first row is now a DIFFERENT symbol (original first row moved down)
});
```

**Playwright selectors to use (check actual rendered DOM with MCP snapshot first):**
- The Universe table uses CDK virtual scroll — rows may use `data-testid` attributes
- Use `page.locator('[data-testid="universe-row"]').first()` or similar after inspecting the DOM
- Column headers may be clickable for sorting — verify with MCP snapshot

**Test data considerations:**
- The test should use symbols already present in the Universe (do not add new symbols in this test)
- If the Universe is empty in the test environment, skip or navigate to ensure data is present first
- Use a deterministic edit (e.g. set distribution to 0 to force to top, or 9999 to force to bottom)

### Testing Standards

- E2E tests: Playwright in `apps/dms-material-e2e/src/`
- Use `test.fail()` for intentionally failing regression tests
- `pnpm all` must pass
- Named functions required everywhere (ESLint `@smarttools/no-anonymous-functions`)
- Test naming must include the story number prefix: `BUG(72-1): ...`
- No production code changes in this story

### Project Structure Notes

- E2E spec directory: `apps/dms-material-e2e/src/`
- Component under test: `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`
- Signal definitions: `sortColumns$` at line ~104, `filteredData$` at line ~166

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-13.md - Epic 72 Story 72.1]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
