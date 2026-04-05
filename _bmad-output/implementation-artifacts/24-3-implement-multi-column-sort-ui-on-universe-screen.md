# Story 24.3: Implement Multi-Column Sort UI on Universe Screen

Status: Approved

## Story

As a user,
I want to sort the Universe table by multiple columns using Shift+click,
so that I can organize portfolio data by a primary field and then break ties with secondary sort criteria.

## Acceptance Criteria

1. **Given** the Universe table is displayed, **When** the user clicks a column header, **Then** that column becomes the sole sort column (replacing any prior sort state), matching existing single-sort behavior.
2. **Given** the Universe table has an active sort on column A, **When** the user Shift+clicks column B's header, **Then** column B is appended as a secondary sort and column A remains the primary sort.
3. **Given** multiple sort columns are active, **When** sort indicators are rendered, **Then** each active sort column header displays a rank superscript (e.g., "¹" for primary, "²" for secondary) alongside the asc/desc arrow.
4. **Given** a Shift+click on a column already in the sort list, **When** the column is in `asc` order, **Then** its direction toggles to `desc`; if it is already `desc`, it is removed from the sort list.
5. **Given** any sort state change, **When** the frontend dispatches the updated `sortColumns` array, **Then** the updated state is persisted via the `sort-filter-state.service` and the `x-table-state` header is sent on the next request.
6. **Given** the implementation, **When** Playwright E2E tests run, **Then** a test verifies: single-column sort works, Shift+click appends a sort column, and rank indicators are visible.

## Definition of Done

- [ ] Single-click sort replaces sort state (existing behavior preserved)
- [ ] Shift+click appends or toggles a sort column
- [ ] Rank superscript indicators render on active sort column headers
- [ ] State is persisted through `sort-filter-state.service` with new `sortColumns` shape
- [ ] Playwright E2E test covers all AC scenarios
- [ ] Run `pnpm all`
- [ ] Run `pnpm e2e:dms-material:chromium`
- [ ] Run `pnpm e2e:dms-material:firefox`
- [ ] Run `pnpm format`
- [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Update Universe table sort event handler (AC: #1, #2, #4)
  - [ ] Open `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`
  - [ ] Wire `sortChange` event from `BaseTableComponent` to a new `onSortChange(event, isShift: boolean)` handler
  - [ ] Implement sort accumulation logic:
    - Non-shift click: `sortColumns = [{ column: event.active, direction: event.direction }]`
    - Shift click: find if column already in list; if not, append; if yes, toggle direction or remove if `desc`
- [ ] Add rank superscript indicators to column headers (AC: #3)
  - [ ] Determine the best approach: custom `MatSortHeader` wrapper or template-level rank label
  - [ ] For each column in `sortColumns`, render its 1-based rank as a superscript in the header cell
  - [ ] Use `¹²³` Unicode superscripts (or equivalent accessible markup) — do not use a tooltip
- [ ] Persist updated sort state (AC: #5)
  - [ ] Inject `sort-filter-state.service` and call its update method with the new `sortColumns` array
  - [ ] Confirm the interceptor reads `sortColumns` (completed in Story 24.1)
- [ ] Write Playwright E2E test (AC: #6)
  - [ ] Add test to `apps/dms-material-e2e/` for Universe screen
  - [ ] Test scenario 1: click column A → table sorted by A
  - [ ] Test scenario 2: Shift+click column B → table sorted by A then B; both headers show rank indicators
  - [ ] Test scenario 3: click column A (no shift) → secondary sort cleared, only A active

## Dev Notes

### Key Files

- `apps/dms-material/src/app/global/global-universe/global-universe.component.ts` — main component to update
- `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts` — sort event source
- `apps/dms-material/src/app/shared/services/sort-filter-state.service.ts` — persistence layer
- `apps/dms-material/src/app/auth/interceptors/sort.interceptor.ts` — serializes to header
- `apps/dms-material-e2e/` — Playwright test directory

### Rank Superscript Unicode Reference

| Rank | Superscript       |
| ---- | ----------------- |
| 1    | `¹` (U+00B9)      |
| 2    | `²` (U+00B2)      |
| 3    | `³` (U+00B3)      |
| 4+   | `⁴` (U+2074) etc. |

### Angular Patterns

- Use `input()` signals and `output()` for component I/O
- Use `signal<SortColumn[]>([])` for `sortColumns` reactive state
- Use `computed()` to derive header rank from sort state
- `OnPush` change detection — ensure signal reads trigger re-renders

### Dependencies

- Depends on Story 24.1 (new model) and Story 24.2 (backend multi-sort)

### References

[Source: apps/dms-material/src/app/global/global-universe/global-universe.component.ts]
[Source: apps/dms-material/src/app/shared/components/base-table/base-table.component.ts]
[Source: apps/dms-material/src/app/shared/services/sort-filter-state.service.ts]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
