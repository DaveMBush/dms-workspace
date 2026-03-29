# Story 24.1: Extend Sort State Model for Multi-Column Sort

Status: Review

## Story

As a developer,
I want the `SortConfig` and `TableState` interfaces to support multi-column sorting,
so that the sort state can represent an ordered list of sort columns rather than a single field.

## Acceptance Criteria

1. **Given** the current `SortConfig { field: string; order: 'asc' | 'desc' }` interface, **When** Story 24.1 is complete, **Then** a new `SortColumn { column: string; direction: 'asc' | 'desc' }` type exists and `TableState` has a `sortColumns: SortColumn[]` property in addition to (or replacing) the existing `sort` property.
2. **Given** a legacy `TableState` with only `{ sort: { field, order } }` (no `sortColumns`), **When** the migration utility is called, **Then** it returns a `TableState` with `sortColumns: [{ column: field, direction: order }]`.
3. **Given** a state with both `sort` and `sortColumns`, **When** the migration utility is called, **Then** `sortColumns` takes precedence and `sort` is ignored.
4. **Given** `sortColumns` is empty or undefined, **When** the sort interceptor serializes `TableState` to the `x-table-state` header, **Then** the header is either omitted or serialized correctly without throwing.
5. **Given** all changes to the model, **When** `pnpm all` is run, **Then** no TypeScript errors or test failures occur.

## Definition of Done

- [x] `SortColumn` type added (with `column: string; direction: 'asc' | 'desc'`)
- [x] `TableState.sortColumns?: SortColumn[]` field added
- [x] Legacy migration utility function written and tested
- [x] Sort interceptor updated to use `sortColumns` when present
- [x] All TypeScript compilation errors resolved
- [x] Unit tests for migration logic achieve 100% branch coverage
- [x] Run `pnpm all`
- [x] Run `pnpm format`
- [x] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [x] Add `SortColumn` interface (AC: #1)
  - [x] Create or update `apps/dms-material/src/app/shared/services/sort-config.interface.ts`
  - [x] Export `SortColumn { column: string; direction: 'asc' | 'desc' }`
  - [x] Keep existing `SortConfig` export for backward compatibility (or alias it)
- [x] Update `TableState` interface (AC: #1)
  - [x] Add `sortColumns?: SortColumn[]` to `apps/dms-material/src/app/shared/services/table-state.interface.ts`
  - [x] Keep existing `sort?: SortConfig` property (for migration compatibility)
- [x] Write legacy migration utility (AC: #2, #3)
  - [x] Create `apps/dms-material/src/app/shared/utils/migrate-table-state.ts`
  - [x] Function `migrateTableState(state: TableState): TableState`:
    - If `sortColumns` is present, return state as-is
    - If only `sort` is present, convert to `sortColumns: [{ column: state.sort.field, direction: state.sort.order }]`
    - If neither is present, return state unchanged
- [x] Update sort interceptor (AC: #4)
  - [x] Open `apps/dms-material/src/app/auth/interceptors/sort.interceptor.ts`
  - [x] When reading sort state, prefer `sortColumns` over legacy `sort`
  - [x] Ensure serialization handles empty `sortColumns` array gracefully
- [x] Write unit tests (AC: #5)
  - [x] Create `apps/dms-material/src/app/shared/utils/migrate-table-state.spec.ts`
  - [x] Cover all 3 branches: `sortColumns` present, only `sort` present, neither present
  - [x] Cover sort interceptor changes if logic is non-trivial

## Dev Notes

### Key Files

- `apps/dms-material/src/app/shared/services/sort-config.interface.ts` — add `SortColumn` type
- `apps/dms-material/src/app/shared/services/table-state.interface.ts` — add `sortColumns` field
- `apps/dms-material/src/app/auth/interceptors/sort.interceptor.ts` — update to use `sortColumns`
- `apps/dms-material/src/app/shared/services/sort-filter-state.service.ts` — may need updates
- `apps/dms-material/src/app/shared/utils/migrate-table-state.ts` — NEW file

### Current Interface Shape (at time of story creation)

```typescript
// sort-config.interface.ts
export interface SortConfig {
  field: string;
  order: 'asc' | 'desc';
}

// table-state.interface.ts
export interface TableState {
  sort?: SortConfig;
  filters?: FilterConfig;
}
```

### Target Shape

```typescript
export interface SortColumn {
  column: string;
  direction: 'asc' | 'desc';
}

export interface TableState {
  sort?: SortConfig; // kept for migration compatibility
  sortColumns?: SortColumn[]; // new canonical field
  filters?: FilterConfig;
}
```

### Angular Patterns

- Use `inject()` for DI, not constructor injection
- Keep all utilities as pure functions (no side effects) where possible
- Migration utility should be a plain TypeScript function, not a service (no Angular DI needed)

### Dependencies

- This story has no upstream dependencies
- Stories 24.2, 24.3, 25.1 all depend on this story

### References

[Source: apps/dms-material/src/app/shared/services/sort-config.interface.ts]
[Source: apps/dms-material/src/app/shared/services/table-state.interface.ts]
[Source: apps/dms-material/src/app/auth/interceptors/sort.interceptor.ts]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None.

### Completion Notes List

- Created `SortColumn` interface in its own file (`sort-column.interface.ts`) per `@smarttools/one-exported-item-per-file` rule
- Added `sortColumns?: SortColumn[]` to `TableState` interface alongside existing `sort?: SortConfig`
- Created `migrateTableState` function in `shared/utils/migrate-table-state.function.ts` with 3 branches:
  1. `sortColumns` present → return as-is (sortColumns takes precedence)
  2. Only `sort` present → convert to `sortColumns` array
  3. Neither → return unchanged
- Updated sort interceptor to run migration on each table state, then prefer `sortColumns` for output
- Edge case: empty `sortColumns[]` with `sort` present falls back to legacy `sort` output
- Fixed `@smarttools/no-anonymous-functions` lint error in `.map()` callback
- All 100% coverage maintained across branches, functions, lines, statements
- `pnpm dupcheck`: 0.08% (1 clone, under 0.1% threshold)

### File List

- `apps/dms-material/src/app/shared/services/sort-column.interface.ts` — new
- `apps/dms-material/src/app/shared/services/table-state.interface.ts` — added `sortColumns` field
- `apps/dms-material/src/app/shared/utils/migrate-table-state.function.ts` — new
- `apps/dms-material/src/app/shared/utils/migrate-table-state.function.spec.ts` — new
- `apps/dms-material/src/app/auth/interceptors/sort.interceptor.ts` — updated to use `sortColumns`
- `apps/dms-material/src/app/auth/interceptors/sort.interceptor.spec.ts` — updated tests for `sortColumns`
