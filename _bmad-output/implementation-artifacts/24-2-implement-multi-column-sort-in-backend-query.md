# Story 24.2: Implement Multi-Column Sort in Backend Query

Status: Review

## Story

As a developer,
I want the backend Universe query to accept an ordered array of sort columns,
so that the database returns rows sorted by multiple columns in the caller-specified priority order.

## Acceptance Criteria

1. **Given** a request with `x-table-state` header containing `sortColumns: [{ column: 'name', direction: 'asc' }, { column: 'price', direction: 'desc' }]`, **When** the Universe route handler processes the request, **Then** the Prisma `orderBy` clause is built as `[{ name: 'asc' }, { price: 'desc' }]`.
2. **Given** a request with no `sortColumns` (or an empty array), **When** the handler builds the query, **Then** a default sort order is applied (e.g., by primary key or `id asc`) so results are deterministic.
3. **Given** a `sortColumns` entry referencing a column not present in the Prisma model, **When** the handler processes the request, **Then** the invalid column is silently dropped (not causing a 500 error); an allowlist of valid sort columns must be checked.
4. **Given** the updated endpoint, **When** `pnpm all` runs all tests, **Then** all existing and new tests pass.

## Definition of Done

- [x] Backend Universe route updated to build `orderBy` array from `sortColumns`
- [x] Allowlist of valid sort column names enforced
- [x] Default sort applied when `sortColumns` is empty/absent
- [x] Unit tests for the `orderBy` builder cover all branches (valid columns, invalid column, empty array)
- [x] Run `pnpm all`
- [x] Run `pnpm format`
- [x] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [x] Locate Universe backend route (AC: #1)
  - [x] Find the route handler in `apps/server/src/routes/` that serves the universe table data
  - [x] Identify where `TableState` / sort state is currently read from the request header
- [x] Build `orderBy` array from `sortColumns` (AC: #1)
  - [x] Parse `sortColumns` from the `x-table-state` header (or the JSON body, whichever is used)
  - [x] Map each `{ column, direction }` to a Prisma `OrderByInput` object: `{ [column]: direction }`
  - [x] Pass the resulting array to `prisma.universe.findMany({ orderBy: [...] })`
- [x] Apply column allowlist validation (AC: #3)
  - [x] Define array of valid sortable column names (those present in the Prisma `Universe` model)
  - [x] Filter out any `sortColumns` entries whose `column` is not in the allowlist
- [x] Apply default sort fallback (AC: #2)
  - [x] When the resulting `orderBy` array is empty, use `[{ createdAt: 'asc' }]` (stable default)
- [x] Write/update unit tests (AC: #4)
  - [x] Test: valid multi-column input → correct `orderBy` array
  - [x] Test: empty `sortColumns` → default sort applied
  - [x] Test: unknown column in `sortColumns` → column dropped, rest preserved
  - [x] Achieve 100% branch coverage on the new logic

## Dev Notes

### Key Files

- `apps/server/src/routes/` — locate the universe route handler
- `prisma/schema.prisma` — reference for valid `Universe` model field names
- `apps/dms-material/src/app/auth/interceptors/sort.interceptor.ts` — frontend serialization (reference only)

### Prisma `orderBy` Array Pattern

```typescript
// Multi-column sort in Prisma:
prisma.universe.findMany({
  orderBy: [{ ticker: 'asc' }, { market_cap: 'desc' }],
});
```

### Column Allowlist Pattern

```typescript
const VALID_SORT_COLUMNS = new Set(['ticker', 'name', 'market_cap' /* ... */]);

const orderBy = sortColumns.filter((sc) => VALID_SORT_COLUMNS.has(sc.column)).map((sc) => ({ [sc.column]: sc.direction }));
```

### Dependencies

- Depends on Story 24.1 (new model must be merged before backend uses `sortColumns`)

### References

[Source: prisma/schema.prisma]
[Source: apps/server/src/routes/]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Lint: complexity 12 in isValidTableState → extracted isNonNullObject and hasOnlyAllowedKeys helpers
- Lint: max-depth 3 in findComputedSortColumn → flattened with early return pattern
- Lint: import sort → auto-fixed with eslint --fix
- Coverage: V8 cache artifact caused phantom 0% middleware entries → resolved by clearing .nx cache

### Completion Notes List

- Added `SortColumn` interface to server-side in its own file (one-export-per-file rule)
- Updated `TableState` to include `sortColumns?: SortColumn[]`
- Added `sortColumns` to `ALLOWED_TABLE_STATE_KEYS` whitelist with full validation
- Refactored `buildUniverseOrderBy` to return array, handle `sortColumns` → `sort` → default fallback
- Updated `getTopUniverses` with `findComputedSortColumn` to check `sortColumns` for computed fields
- Created comprehensive unit tests for `buildUniverseOrderBy` (16 tests) and `parseSortFilterHeader` (29 tests)
- Added integration tests for `sortColumns` path in `index.spec.ts` (2 new tests)
- All 100% coverage maintained across branches, functions, lines, statements

### File List

- `apps/server/src/app/routes/common/sort-column.interface.ts` (NEW)
- `apps/server/src/app/routes/common/table-state.interface.ts` (MODIFIED)
- `apps/server/src/app/routes/common/parse-sort-filter-header.function.ts` (MODIFIED)
- `apps/server/src/app/routes/common/parse-sort-filter-header.function.spec.ts` (NEW)
- `apps/server/src/app/routes/top/build-universe-order-by.function.ts` (MODIFIED)
- `apps/server/src/app/routes/top/build-universe-order-by.function.spec.ts` (NEW)
- `apps/server/src/app/routes/top/index.ts` (MODIFIED)
- `apps/server/src/app/routes/top/index.spec.ts` (MODIFIED)
