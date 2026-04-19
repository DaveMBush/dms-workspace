# Story 67.2: Fix Row Height CSS and Update All Height Constants

Status: Approved

## Story

As a user,
I want all table rows to be the same height,
so that virtual scrolling works correctly and the table looks consistent.

## Acceptance Criteria

1. **Given** the discrepancy measured in Story 67.1,
   **When** the developer adds a SCSS rule in `base-table.component.scss` that pins
   `--mat-table-row-item-container-height` to the chosen consistent height for all rows (and ensures
   `mat-icon-button` cells within rows do not overflow that height),
   **Then** the Playwright MCP server confirms that all rows — with and without icon buttons — now
   measure the same height.

2. **Given** the production CSS fix is applied,
   **When** all occurrences of the old pixel constant in e2e specs (e.g. `ROW_HEIGHT_PX = 52` in
   `apps/dms-material-e2e/src/universe-lazy-load-deep-scroll.spec.ts`) are updated to the new
   value,
   **Then** those specs continue to pass.

3. **Given** the `BaseTableComponent.rowHeight` input default (currently `52`) may need updating,
   **When** the developer confirms the default matches the new CSS height,
   **Then** the default is updated in `base-table.component.ts` if the chosen height differs from
   52.

4. **Given** the failing test added in Story 67.1,
   **When** the SCSS fix is applied and the `test.fail()` marker is removed,
   **Then** the height-consistency test now passes.

5. **Given** all changes are applied,
   **When** `pnpm all` runs,
   **Then** all tests pass with no new failures or regressions.

## Tasks / Subtasks

- [ ] Task 1: Pin row height in SCSS (AC: #1)
  - [ ] Subtask 1.1: Open
        `apps/dms-material/src/app/shared/components/base-table/base-table.component.scss` and add
        a CSS custom property rule on `tr.mat-mdc-row` (or `:host`) that pins
        `--mat-table-row-item-container-height` to the target height (e.g. `52px` or `57px` — use
        the value determined in Story 67.1)
  - [ ] Subtask 1.2: Add a rule that constrains `button[mat-icon-button]` (or
        `.mat-mdc-icon-button`) inside a table cell so its height cannot exceed the pinned row
        height — e.g. `max-height: var(--mat-table-row-item-container-height)` or explicit
        `height` / `line-height` override
  - [ ] Subtask 1.3: Start the dev server; use Playwright MCP server to measure `offsetHeight` of
        all `tr.mat-mdc-row` elements; confirm all values are equal and match the target height

- [ ] Task 2: Update `BaseTableComponent.rowHeight` default if needed (AC: #3)
  - [ ] Subtask 2.1: Read `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`
        — locate `rowHeight = input<number>(52)`
  - [ ] Subtask 2.2: If the chosen height from Story 67.1 differs from 52, update the default to
        match; if 52 is still correct, leave unchanged and note that in the Dev Agent Record

- [ ] Task 3: Update hardcoded pixel constants in e2e specs (AC: #2)
  - [ ] Subtask 3.1: Update `const ROW_HEIGHT_PX = 52` at line 98 of
        `apps/dms-material-e2e/src/universe-lazy-load-deep-scroll.spec.ts` to the new target
        height value
  - [ ] Subtask 3.2: Search for any other hardcoded row height values in e2e specs with
        `grep -r "ROW_HEIGHT_PX\|= 52\|= 57" apps/dms-material-e2e/src/` and update any
        occurrences that refer to a table row height (be careful not to change unrelated `52`
        literals)
  - [ ] Subtask 3.3: Verify no other unit or e2e files assert a specific `rowHeight` pixel value
        that would need updating

- [ ] Task 4: Remove `test.fail()` from the Story 67.1 test and confirm it now passes (AC: #4)
  - [ ] Subtask 4.1: Find the height-consistency test added in Story 67.1 (in
        `universe-lazy-load-deep-scroll.spec.ts` or `universe-row-heights.spec.ts`)
  - [ ] Subtask 4.2: Remove the `test.fail()` / `it.fails()` marker so the test is now expected
        to pass
  - [ ] Subtask 4.3: Run the test in isolation to confirm it is green

- [ ] Task 5: Run full test suite (AC: #5)
  - [ ] Subtask 5.1: Run `pnpm all` and confirm all tests pass
  - [ ] Subtask 5.2: If any scroll-boundary assertion fails due to the updated `ROW_HEIGHT_PX`,
        re-examine the assertion and fix the expected value (the assertion logic is correct; only
        the pixel constant changes)

## Dev Notes

This story applies the production CSS fix identified in Story 67.1 and aligns all test constants.

### Key Files

| File | Purpose |
|------|---------|
| `apps/dms-material/src/app/shared/components/base-table/base-table.component.scss` | Pin `--mat-table-row-item-container-height`; constrain icon-button height |
| `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts` | `rowHeight = input<number>(52)` — update if chosen height ≠ 52 |
| `apps/dms-material-e2e/src/universe-lazy-load-deep-scroll.spec.ts` | Line 98: `const ROW_HEIGHT_PX = 52` — update to new height |

### SCSS Fix Pattern

Angular Material exposes `--mat-table-row-item-container-height` as a CSS custom property (set
via `MAT_FORM_FIELD_DEFAULT_OPTIONS` or global theme). To override at component level, add to
`base-table.component.scss`:

```scss
// Pin all data rows to a single consistent height so CDK virtual scroll
// receives a stable itemSize regardless of cell content.
:host {
  --mat-table-row-item-container-height: 52px; // or new target height
}

// Prevent mat-icon-button from inflating cell height beyond the row height.
td.mat-mdc-cell button.mat-mdc-icon-button {
  height: var(--mat-table-row-item-container-height);
  width: var(--mat-table-row-item-container-height);
}
```

Adjust `52px` to the target height determined in Story 67.1.

### Scroll Boundary Assertions

`universe-lazy-load-deep-scroll.spec.ts` has these calculations anchored to `ROW_HEIGHT_PX`:

- Line 198: `expect(top).toBeGreaterThan(60 * ROW_HEIGHT_PX)` — scroll position check
- Line 249: `const page1Boundary = 50 * ROW_HEIGHT_PX`
- Line 259: `const page2Boundary = 100 * ROW_HEIGHT_PX`
- Lines 373–443, 511–518: `scrollViewportTo(viewport, N * ROW_HEIGHT_PX)` calls

Updating the single `ROW_HEIGHT_PX` constant at line 98 propagates to all of them.

### Project Structure Notes

- Do NOT change any production component logic — only SCSS, the `rowHeight` default, and test
  constants change in this story
- `pnpm all` must pass after every subtask group before proceeding

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-13.md - Epic 67 Story 67.2]
- [Story 67.1: _bmad-output/implementation-artifacts/67-1-measure-row-height-inconsistency.md]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
