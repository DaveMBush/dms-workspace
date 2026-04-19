# Story 68.1: Remove the Empty-State Overlay from the Universe Screen

Status: Approved

## Story

As a user,
I want the Universe table to display cleanly when it has no rows,
so that I am not shown a misleading "No results found" message above the column headers during
loading.

## Acceptance Criteria

1. **Given** the Universe screen is loaded before data arrives,
   **When** the Playwright MCP server is used to observe the page,
   **Then** no `.empty-state` card containing "No results found" appears above the column headers
   at any point during or after loading.

2. **Given** the `@if (showEmptyState$())` block in `global-universe.component.html` (lines 82–90),
   **When** that block and the `showEmptyState$` computed signal in
   `global-universe.component.ts` are removed,
   **Then** the template renders the table container directly with no overlay element.

3. **Given** unit tests in `global-universe.component.spec.ts` assert on `showEmptyState$` or the
   `.empty-state` CSS class,
   **When** those tests are removed (because the feature no longer exists),
   **Then** no remaining assertions reference the deleted code and the spec file still compiles and
   passes.

4. **Given** all changes are applied,
   **When** `pnpm all` runs,
   **Then** all tests pass with no new failures or regressions.

## Tasks / Subtasks

- [ ] Task 1: Remove the empty-state block from the template (AC: #1, #2)
  - [ ] Subtask 1.1: Open
        `apps/dms-material/src/app/global/global-universe/global-universe.component.html`
  - [ ] Subtask 1.2: Locate the `@if (showEmptyState$())` block at approximately lines 82–90:
        ```html
        } @if (showEmptyState$()) {
        <mat-card class="empty-state">
          <mat-card-content>
            <mat-icon>info</mat-icon>
            <p>No results found</p>
          </mat-card-content>
        </mat-card>
        }
        ```
  - [ ] Subtask 1.3: Delete the entire `@if (showEmptyState$())` block (including the closing `}`)
        from the template; do not modify any surrounding code
  - [ ] Subtask 1.4: Verify the template still compiles by running `pnpm nx build dms-material` or
        checking for TypeScript/template errors

- [ ] Task 2: Remove the `showEmptyState$` computed signal from the component class (AC: #2)
  - [ ] Subtask 2.1: Open
        `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`
  - [ ] Subtask 2.2: Locate `readonly showEmptyState$ = computed(...)` at line ~180 and delete
        the entire declaration (the `computed()` call referencing
        `globalLoading.isLoading() && filteredData$().length === 0`)
  - [ ] Subtask 2.3: Confirm that `showEmptyState$` is not referenced anywhere else in the
        component class or its template — after Step 1 the template reference is already gone;
        a grep confirms no other usages exist
  - [ ] Subtask 2.4: If `MatCardModule` is imported in the component only to support the empty-state
        card and is not used elsewhere in the template, remove it from the `imports` array;
        otherwise leave it as-is

- [ ] Task 3: Update unit tests (AC: #3)
  - [ ] Subtask 3.1: Open
        `apps/dms-material/src/app/global/global-universe/global-universe.component.spec.ts`
  - [ ] Subtask 3.2: Search for any `it`/`test` blocks that reference `showEmptyState$`,
        `.empty-state`, or `"No results found"` — remove those test cases entirely
  - [ ] Subtask 3.3: Run the unit test file in isolation (`pnpm nx test dms-material --testFile
        global-universe.component.spec.ts`) and confirm all remaining tests pass

- [ ] Task 4: Verify with Playwright MCP server (AC: #1)
  - [ ] Subtask 4.1: Start the dev server
  - [ ] Subtask 4.2: Use the Playwright MCP server to navigate to `/global/universe`
  - [ ] Subtask 4.3: During initial page load, confirm via snapshot or `page.locator('.empty-state').count()`
        that no `.empty-state` element is present at any point
  - [ ] Subtask 4.4: After data loads, confirm the table renders correctly with column headers visible
        and no overlay above them
  - [ ] Subtask 4.5: Document the MCP session evidence in the Dev Agent Record

- [ ] Task 5: Run full test suite (AC: #4)
  - [ ] Subtask 5.1: Run `pnpm all` and confirm all tests pass

## Dev Notes

### Key Files

| File | Purpose |
|------|---------|
| `apps/dms-material/src/app/global/global-universe/global-universe.component.html` | Lines 82–90: `@if (showEmptyState$())` block to remove |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.ts` | Line ~180: `readonly showEmptyState$ = computed(...)` to remove |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.spec.ts` | Remove any tests asserting on `showEmptyState$` or `.empty-state` |

### Template Context

The block to remove is between the `screenerError$()` error card and the `<div class="table-wrapper">`:

```html
} @if (showEmptyState$()) {
<mat-card class="empty-state">
  <mat-card-content>
    <mat-icon>info</mat-icon>
    <p>No results found</p>
  </mat-card-content>
</mat-card>
}

<div class="table-wrapper">
  <dms-base-table ...>
```

After removal, the `<div class="table-wrapper">` follows directly after the screenerError card's
closing `}`.

### Why This Fix Is Safe

The `showEmptyState$` signal returns `true` only when `globalLoading.isLoading() === true && filteredData$().length === 0`.
During initial page load this condition fires briefly, rendering the card above the column headers.
Once data arrives, `filteredData$()` becomes non-empty and the card disappears. This is the wrong
UX: it's a transient flash of a misleading message. Removing the block entirely means an empty
table shows column headers with no rows — which is standard Angular Material behaviour and
sufficient feedback.

### What NOT to Change

- The `screenerError$()` error card (`data-testid="error-message"`) must **not** be removed — it
  is a different feature and is correct
- The cusip-cache `data-testid="no-results"` referenced in the epic requirements file is **exempt**
  from this change — it is a search result indicator in a different screen

### Project Structure Notes

- `MatCardModule` — check whether it is used elsewhere in `global-universe.component.html` before
  removing it from the `imports` array. The error card also uses `mat-card` so it should remain.

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-13.md - Epic 68 Story 68.1]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
