# Story 36.2: Fix Secondary Sort on Universe Screen

Status: Approved

## Story

As Dave (the investor),
I want multi-column sorting on the Universe Screen to fully apply all sort columns in order,
so that I can sort by (e.g.) Risk Group and then by Ticker within each group.

## Acceptance Criteria

1. **Given** the failing e2e tests from Story 36.1, **When** the fix is implemented, **Then** all multi-column sort e2e tests pass.
2. **Given** the Universe Screen with data that has duplicate values in the primary sort column, **When** the investor applies a secondary sort via shift-click on a column header, **Then** rows sharing the same primary sort value are ordered by the secondary sort column.
3. **Given** the `x-table-state` header carries `sortColumns: SortColumn[]` (from Epic 24), **When** the server route for the Universe table processes the sort, **Then** it applies all entries in `sortColumns` to the SQL/Prisma `orderBy` clause (not just the first entry).
4. **Given** all changes, **When** `pnpm all` runs, **Then** all tests (unit + e2e) pass.

## Definition of Done

- [ ] Root cause identified (frontend or backend or both) and documented in story notes
- [ ] Fix applied (server query AND/OR frontend sort state)
- [ ] All e2e tests from Story 36.1 pass
- [ ] Unit tests cover the multi-column `orderBy` logic
- [ ] `pnpm all` passes
- [ ] `pnpm format` passes

## Tasks / Subtasks

- [ ] Diagnose root cause: trace sort state from shift-click through frontend state and `x-table-state` header to server `orderBy` (AC: #3)
  - [ ] Check if `sortColumns` array is correctly populated with multiple entries after shift-click
  - [ ] Check if the server route reads `sortColumns` as an array and maps all entries to Prisma `orderBy`
- [ ] Document root cause in the Completion Notes section of this story file
- [ ] Apply fix to the root cause location(s) (AC: #2, #3)
  - [ ] If frontend: ensure shift-click appends to `sortColumns` array rather than replacing
  - [ ] If backend: ensure `orderBy` is built from all entries in `sortColumns`, not just `sortColumns[0]`
- [ ] Add/update unit tests for the multi-column `orderBy` construction (AC: #4)
- [ ] Verify all e2e tests from Story 36.1 now pass (AC: #1)
- [ ] Run `pnpm all` and fix any failures
- [ ] Run `pnpm format`

## Dev Notes

### Key Files

- `apps/dms-material/src/app/global/` — Universe Screen component and sort state logic
- `apps/server/src/app/routes/` — Universe table server route; look for `x-table-state` header parsing and `orderBy` construction
- `SortFilterStateService` — check how sort state is persisted and restored
- Epic 24 implementation — the multi-column sort feature was added here; review the PR/commits for context

### Approach

The likely root cause is in the server's `orderBy` construction — it probably only maps `sortColumns[0]`. The fix is to map the full array: `orderBy: tableState.sortColumns.map(sc => ({ [sc.field]: sc.direction }))`. Confirm by logging the `x-table-state` header in a dev session and verifying whether multiple sort columns are present in the request.

## Dev Agent Record

### Agent Model Used

### Completion Notes

## File List
