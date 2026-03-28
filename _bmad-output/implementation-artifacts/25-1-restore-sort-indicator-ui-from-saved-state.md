# Story 25.1: Restore Sort Indicator UI from Saved State

Status: Approved

## Story

As a user,
I want the sort column header indicators on the Universe table to reflect my previously saved sort state when the page loads,
so that I immediately see which columns are sorted and in what direction without having to re-sort.

## Acceptance Criteria

1. **Given** a saved `TableState` with `sortColumns: [{ column: 'ticker', direction: 'asc' }]` in local/session storage or persisted state, **When** the Universe screen initializes, **Then** the `BaseTableComponent.sortState` signal is populated with the matching `{ active: 'ticker', direction: 'asc' }` value.
2. **Given** a saved `TableState` with multiple `sortColumns`, **When** the Universe screen initializes, **Then** all active sort columns show their rank superscript indicators (as implemented in Story 24.3) immediately on render.
3. **Given** no saved sort state (first visit or cleared state), **When** the Universe screen initializes, **Then** no sort indicators are shown (default unsorted appearance).
4. **Given** the UI is fully initialized with restored sort state, **When** the user inspects the table, **Then** the visual sort indicators precisely match the current `sortColumns` array (no ghost indicators from stale state).
5. **Given** the restore logic, **When** `pnpm all` is run, **Then** all tests pass.

## Definition of Done

- [ ] Sort indicators restored from `sortColumns` on Universe screen init
- [ ] `BaseTableComponent.sortState` signal updated from persisted state
- [ ] Multi-column rank superscripts rendered correctly on init
- [ ] No stale/ghost indicators when state is absent
- [ ] Unit test covers all 3 branches: multi-column, single-column, no state
- [ ] Playwright E2E test: navigate away, navigate back → sort indicators match saved state
- [ ] Run `pnpm all`
- [ ] Run `pnpm e2e:dms-material:chromium`
- [ ] Run `pnpm e2e:dms-material:firefox`
- [ ] Run `pnpm format`
- [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Read saved sort state on init (AC: #1, #3)
  - [ ] In `global-universe.component.ts` `ngOnInit` or constructor effect, inject `sort-filter-state.service`
  - [ ] Read current `TableState` from the service
  - [ ] Run `migrateTableState()` on it (from Story 24.1) to normalize to `sortColumns`
- [ ] Push state into BaseTableComponent (AC: #1, #2)
  - [ ] Identify the signal or input that `BaseTableComponent` uses to display `sortState`
  - [ ] Set it from the restored `sortColumns` (first column → primary `sortState`, additional columns → rank signals)
- [ ] Handle absent state gracefully (AC: #3, #4)
  - [ ] If `sortColumns` is empty or undefined, leave `sortState` at `null`
  - [ ] Confirm no stale template artifact renders
- [ ] Write unit tests (AC: #5)
  - [ ] Add tests to `global-universe.component.spec.ts` for the restore logic
  - [ ] Three branches: restored multi-column, restored single-column, no state
- [ ] Write Playwright E2E test (AC: test restoration across navigation)
  - [ ] Test flow: sort by column A, navigate to another page, navigate back → column A still shows sorted indicator

## Dev Notes

### Key Files

- `apps/dms-material/src/app/global/global-universe/global-universe.component.ts` — add init restore logic
- `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts` — `sortState = signal<Sort | null>(null)` (the signal to populate)
- `apps/dms-material/src/app/shared/services/sort-filter-state.service.ts` — read persisted state
- `apps/dms-material/src/app/shared/utils/migrate-table-state.ts` — normalization (from Story 24.1)
- `apps/dms-material-e2e/` — Playwright test directory

### How sortState Works (BaseTableComponent)

```typescript
// BaseTableComponent
sortState = signal<Sort | null>(null); // Sort = { active: string; direction: 'asc' | 'desc' | '' }
```

For multi-column, the component may need a new `sortColumns` input signal after Story 24.3 changes — verify the actual API after that story is merged.

### Dependencies

- Depends on Story 24.1 (new `sortColumns` model)
- Depends on Story 24.3 (rank superscript rendering implemented in BaseTable)

### References

[Source: apps/dms-material/src/app/global/global-universe/global-universe.component.ts]
[Source: apps/dms-material/src/app/shared/components/base-table/base-table.component.ts]
[Source: apps/dms-material/src/app/shared/services/sort-filter-state.service.ts]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
