# Story 24.2: Implement Multi-Column Sort in Backend Query

Status: Approved

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

- [ ] Backend Universe route updated to build `orderBy` array from `sortColumns`
- [ ] Allowlist of valid sort column names enforced
- [ ] Default sort applied when `sortColumns` is empty/absent
- [ ] Unit tests for the `orderBy` builder cover all branches (valid columns, invalid column, empty array)
- [ ] Run `pnpm all`
- [ ] Run `pnpm format`
- [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Locate Universe backend route (AC: #1)
  - [ ] Find the route handler in `apps/server/src/routes/` that serves the universe table data
  - [ ] Identify where `TableState` / sort state is currently read from the request header
- [ ] Build `orderBy` array from `sortColumns` (AC: #1)
  - [ ] Parse `sortColumns` from the `x-table-state` header (or the JSON body, whichever is used)
  - [ ] Map each `{ column, direction }` to a Prisma `OrderByInput` object: `{ [column]: direction }`
  - [ ] Pass the resulting array to `prisma.universe.findMany({ orderBy: [...] })`
- [ ] Apply column allowlist validation (AC: #3)
  - [ ] Define array of valid sortable column names (those present in the Prisma `Universe` model)
  - [ ] Filter out any `sortColumns` entries whose `column` is not in the allowlist
- [ ] Apply default sort fallback (AC: #2)
  - [ ] When the resulting `orderBy` array is empty, use `[{ id: 'asc' }]` (or equivalent stable default)
- [ ] Write/update unit tests (AC: #4)
  - [ ] Test: valid multi-column input → correct `orderBy` array
  - [ ] Test: empty `sortColumns` → default sort applied
  - [ ] Test: unknown column in `sortColumns` → column dropped, rest preserved
  - [ ] Achieve 100% branch coverage on the new logic

## Dev Notes

### Key Files

- `apps/server/src/routes/` — locate the universe route handler
- `prisma/schema.prisma` — reference for valid `Universe` model field names
- `apps/dms-material/src/app/auth/interceptors/sort.interceptor.ts` — frontend serialization (reference only)

### Prisma `orderBy` Array Pattern

```typescript
// Multi-column sort in Prisma:
prisma.universe.findMany({
  orderBy: [
    { ticker: 'asc' },
    { market_cap: 'desc' },
  ],
});
```

### Column Allowlist Pattern

```typescript
const VALID_SORT_COLUMNS = new Set(['ticker', 'name', 'market_cap', /* ... */]);

const orderBy = sortColumns
  .filter(sc => VALID_SORT_COLUMNS.has(sc.column))
  .map(sc => ({ [sc.column]: sc.direction }));
```

### Dependencies

- Depends on Story 24.1 (new model must be merged before backend uses `sortColumns`)

### References

[Source: prisma/schema.prisma]
[Source: apps/server/src/routes/]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
