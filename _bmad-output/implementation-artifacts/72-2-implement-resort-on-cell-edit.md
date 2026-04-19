# Story 72.2: Implement Re-sort After Cell Edit Without Scroll Position Change

Status: Approved

## Story

As a user,
I want the Universe table to re-sort immediately after I edit a row value,
so that the row appears in the correct position without losing my place in the list.

## Acceptance Criteria

1. **Given** the `handleCellEdit` function in
   `apps/dms-material/src/app/global/global-universe/handle-cell-edit.function.ts` and its
   caller in `global-universe.component.ts`,
   **When** a cell edit completes successfully,
   **Then** `sortColumns$` signal is re-emitted (e.g. via `sortColumns$.set([...sortColumns$()])`)
   to force `filteredData$()` to recompute and re-sort.

2. **Given** the re-sort triggers,
   **When** the sorted row moves to a new position in the virtual scroll list,
   **Then** the viewport scroll offset is preserved (record the scroll offset before the edit,
   restore it via `viewport()?.scrollTo({ top: savedOffset })` after the sort settles).

3. **Given** the failing E2E test from Story 72.1,
   **When** the fix is applied,
   **Then** the test is now green (remove `test.fail()` annotation).

4. **Given** all existing universe component unit tests,
   **When** `pnpm all` runs,
   **Then** all tests pass.

## Tasks / Subtasks

- [ ] Task 1: Implement the re-sort trigger in `onCellEdit` (AC: #1)
  - [ ] Subtask 1.1: Read `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`
        in full — locate `onCellEdit` (line ~292) and the `sortColumns$` signal declaration
        (line ~104)
  - [ ] Subtask 1.2: In `onCellEdit`, after calling `handleCellEdit(...)`, add:
        `this.sortColumns$.set([...this.sortColumns$()])` to force `filteredData$()` to
        recompute with the updated row values
  - [ ] Subtask 1.3: Confirm that `filteredData$` has `sortColumns$` in its reactive dependency
        chain — if not, identify the correct signal to re-emit that triggers a re-sort

- [ ] Task 2: Implement scroll position preservation (AC: #2)
  - [ ] Subtask 2.1: Read how the CdkVirtualScrollViewport is referenced in
        `global-universe.component.ts` — look for a `viewport` ViewChild signal or query
  - [ ] Subtask 2.2: Before calling `handleCellEdit`, record the current scroll offset:
        `const savedOffset = this.viewport()?.measureScrollOffset('top') ?? 0`
  - [ ] Subtask 2.3: After triggering the re-sort (the `sortColumns$.set(...)` call), restore
        the scroll position using:
        `this.viewport()?.scrollTo({ top: savedOffset })`
        Use `setTimeout(..., 0)` or `afterNextRender` if the scroll must wait for the DOM to
        settle after the re-sort

- [ ] Task 3: Verify with Playwright MCP server (AC: #3)
  - [ ] Subtask 3.1: Start the dev server and navigate to the Universe screen
  - [ ] Subtask 3.2: Sort the table by a column and edit a cell value that should move the row
  - [ ] Subtask 3.3: Confirm the row moves to the correct sorted position visually
  - [ ] Subtask 3.4: Scroll the table down partway, then edit a cell — confirm the scroll
        position is preserved after the re-sort
  - [ ] Subtask 3.5: Document the MCP verification in the Dev Agent Record

- [ ] Task 4: Remove `test.fail()` from Story 72.1 test and run full suite (AC: #3, #4)
  - [ ] Subtask 4.1: Remove the `test.fail()` annotation from the Story 72.1 e2e test
  - [ ] Subtask 4.2: Run `pnpm all` and confirm all tests pass
  - [ ] Subtask 4.3: Confirm no existing universe unit or e2e tests regressed

## Dev Notes

### Key Files

| File | Purpose |
|------|---------|
| `apps/dms-material/src/app/global/global-universe/global-universe.component.ts` | Fix target — `onCellEdit` method (line ~292), `sortColumns$` signal (line ~104), `filteredData$` computed (line ~166) |
| `apps/dms-material/src/app/global/global-universe/handle-cell-edit.function.ts` | Called by `onCellEdit` — mutates row in-place; do not change this function |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.spec.ts` | Unit tests — must stay green; update any tests asserting `onCellEdit` behaviour if needed |
| `apps/dms-material-e2e/src/universe-table-workflows.spec.ts` | Remove `test.fail()` from Story 72.1 test here (or from `universe-resort-on-edit.spec.ts`) |

### Architecture Context

**Why the bug occurs:**

`filteredData$` is a `computed()` signal that depends on `sortColumns$` and other signals in
`global-universe.component.ts`. When `handleCellEdit` mutates the row object in-place, the
object reference does not change, so Angular's reactive graph sees no dependency change and
does not re-run `filteredData$`. The table stays sorted in its previous order.

**The fix:**

Re-emitting `sortColumns$` with the same values but a new array reference causes Angular to
re-evaluate `filteredData$` with the now-mutated row data, producing the correct sort order.

```ts
// In global-universe.component.ts — onCellEdit method
onCellEdit(row: Universe, field: keyof Universe, value: unknown): void {
  const savedOffset = this.viewport()?.measureScrollOffset('top') ?? 0;
  handleCellEdit(row, field, value, {
    validationService: this.validationService,
    emitCellEdit: this.cellEdit.emit.bind(this.cellEdit),
  });
  // Force filteredData$ to recompute with updated row values
  this.sortColumns$.set([...this.sortColumns$()]);
  // Restore scroll position after sort settles
  setTimeout(function restoreScrollPosition() {
    this.viewport()?.scrollTo({ top: savedOffset });
  }.bind(this), 0);
}
```

Note: if `viewport()` is not available as a signal/ViewChild in the component, check how the
component accesses the CDK virtual scroll viewport element. It may be a `@ViewChild` query —
read the component template and class for the correct accessor.

**Scroll position notes:**
- Use `measureScrollOffset('top')` to get the current pixel offset before the edit
- Use `scrollTo({ top: ... })` to restore after the re-sort
- Wrap in `setTimeout(..., 0)` to yield to Angular's change detection cycle and let the DOM
  settle before restoring scroll — `afterNextRender` is an alternative for zoneless Angular 21

### Testing Standards

- Unit tests: Vitest in same directory as source file
- E2E tests: Playwright in `apps/dms-material-e2e/src/`
- `globals: true` is set — no `import { describe, it, expect }` needed
- Named functions required everywhere (ESLint `@smarttools/no-anonymous-functions`)
- `pnpm all` must pass
- Do not modify existing passing tests unless they assert behaviour that is explicitly changing

### Project Structure Notes

- Component: `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`
- `sortColumns$` signal: line ~104 — `readonly sortColumns$ = signal<SortColumn[]>(...)`
- `filteredData$` computed: line ~166 — `readonly filteredData$ = computed(() => { ... })`
- `onCellEdit` method: line ~292 — calls `handleCellEdit(row, field, value, { ... })`

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-13.md - Epic 72 Story 72.2]
- Reference: `_bmad-output/implementation-artifacts/72-1-write-failing-resort-on-edit-e2e-test.md`

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
