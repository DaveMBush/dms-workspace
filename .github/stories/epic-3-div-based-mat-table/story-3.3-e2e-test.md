# Story 3.3: E2E test for the div-based mat-table layout

**Status:** review
**Epic:** Epic 3 — Convert DMS BaseTable to a div-based mat-table
**Depends on:** Story 3.1 (unit tests), Story 3.2 (div-based conversion)

## Description

Add an end-to-end Playwright test that verifies the converted DMS BaseTable
renders correctly in a real browser: it must render as `div` elements (no native
`<table>`/`<tr>`/`<td>`) and lay its row cells out horizontally with equal widths,
confirming the visual layout is preserved after the div-based conversion.

## Acceptance Criteria

- [x] A new spec exists at `apps/dms-material-e2e/src/mat-table-layout.spec.ts`.
- [x] It asserts the table renders as `div`s and that no native `<table>` element is present.
- [x] It asserts row cells are laid out left-to-right in a horizontal flex row with equal widths.
- [x] The spec runs against the running app (dev server) via the existing Playwright setup.
- [x] `npx nx e2e dms-material-e2e` passes, including the new test.

## Implementation Notes

- Uses the stable `data-testid="dms-base-table-row"` / `dms-base-table-cell` hooks added in Story 3.2.
- Targets the account panel table (first table on the dashboard) as the concrete instance.
- Layout assertions use `getBoundingClientRect()` to verify left-to-right ordering, a shared row top edge, and equal column widths — robust against exact pixel values.

## Verification

Ran `npx nx e2e dms-material-e2e` (dev server on :4301): **10 passed** in ~5s,
including the two new tests:

- `renders as divs, not a native <table>` ✓
- `lays out row cells horizontally with equal widths` ✓
