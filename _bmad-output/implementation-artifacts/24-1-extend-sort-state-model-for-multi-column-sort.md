# Story 24.1: Extend Sort State Model for Multi-Column Sort

Status: Approved

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

- [ ] `SortColumn` type added (with `column: string; direction: 'asc' | 'desc'`)
- [ ] `TableState.sortColumns?: SortColumn[]` field added
- [ ] Legacy migration utility function written and tested
- [ ] Sort interceptor updated to use `sortColumns` when present
- [ ] All TypeScript compilation errors resolved
- [ ] Unit tests for migration logic achieve 100% branch coverage
- [ ] Run `pnpm all`
- [ ] Run `pnpm format`
- [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Add `SortColumn` interface (AC: #1)
  - [ ] Create or update `apps/dms-material/src/app/shared/services/sort-config.interface.ts`
  - [ ] Export `SortColumn { column: string; direction: 'asc' | 'desc' }`
  - [ ] Keep existing `SortConfig` export for backward compatibility (or alias it)
- [ ] Update `TableState` interface (AC: #1)
  - [ ] Add `sortColumns?: SortColumn[]` to `apps/dms-material/src/app/shared/services/table-state.interface.ts`
  - [ ] Keep existing `sort?: SortConfig` property (for migration compatibility)
- [ ] Write legacy migration utility (AC: #2, #3)
  - [ ] Create `apps/dms-material/src/app/shared/utils/migrate-table-state.ts`
  - [ ] Function `migrateTableState(state: TableState): TableState`:
    - If `sortColumns` is present, return state as-is
    - If only `sort` is present, convert to `sortColumns: [{ column: state.sort.field, direction: state.sort.order }]`
    - If neither is present, return state unchanged
- [ ] Update sort interceptor (AC: #4)
  - [ ] Open `apps/dms-material/src/app/auth/interceptors/sort.interceptor.ts`
  - [ ] When reading sort state, prefer `sortColumns` over legacy `sort`
  - [ ] Ensure serialization handles empty `sortColumns` array gracefully
- [ ] Write unit tests (AC: #5)
  - [ ] Create `apps/dms-material/src/app/shared/utils/migrate-table-state.spec.ts`
  - [ ] Cover all 3 branches: `sortColumns` present, only `sort` present, neither present
  - [ ] Cover sort interceptor changes if logic is non-trivial

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
  sort?: SortConfig;         // kept for migration compatibility
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

### Debug Log References

### Completion Notes List

### File List
