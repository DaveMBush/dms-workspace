# Story 55.2: Fix Duplicate Symbols in Universe Query

Status: Approved

## Story

As a trader,
I want each symbol to appear exactly once in the Universe list regardless of the sort order
applied,
so that I have an accurate view of my portfolio without confusion from phantom duplicates.

## Acceptance Criteria

1. **Given** the Universe screen is sorted by "Avg Purch Yield % descending",
   **When** all rows are visible,
   **Then** every symbol in the list appears exactly once.

2. **Given** the Universe screen is sorted by Symbol ascending and by any other sort column,
   **When** all rows are visible,
   **Then** no duplicate symbols are present.

3. **Given** the fix is applied,
   **When** the e2e test from Story 55.1 runs,
   **Then** it passes green.

4. **Given** all changes are applied,
   **When** `pnpm all` runs,
   **Then** all tests pass with no regressions.

## Definition of Done

- [ ] Root cause identified and documented in Dev Agent Record
- [ ] Backend query in `apps/server/src/app/routes/universe/` corrected to deduplicate rows
- [ ] Fix verified for Avg Purch Yield % descending, Symbol ascending, and at least one additional sort order via Playwright MCP server
- [ ] E2E test from Story 55.1 is now green
- [ ] `pnpm all` passes

## Tasks / Subtasks

- [ ] **Task 1: Identify root cause in backend query**
  - [ ] Read `apps/server/src/app/routes/universe/index.ts` — find the Prisma query that returns universe rows
  - [ ] Identify why the query returns multiple rows per symbol (likely a missing groupBy/DISTINCT or a `trades` relation include that fans out)
  - [ ] Check whether the computed fields (`avg_purchase_yield_percent`, `position`, etc.) are computed per-universe-row or per-trade-row
  - [ ] Document root cause in Dev Agent Record

- [ ] **Task 2: Fix the backend query**
  - [ ] Apply `distinct` or restructure the Prisma query to ensure one row per universe symbol
  - [ ] Ensure computed fields are still calculated correctly after the deduplication fix
  - [ ] If `parseSortFilterHeader` applies account filtering via `trades` include, verify filtering still works after the fix

- [ ] **Task 3: Verify fix via Playwright MCP server**
  - [ ] Sort by Avg Purch Yield % descending → no duplicate symbols ✅
  - [ ] Sort by Symbol ascending → no duplicate symbols ✅
  - [ ] Sort by at least one more column → no duplicate symbols ✅

- [ ] **Task 4: Run `pnpm all`**
  - [ ] All unit tests pass
  - [ ] E2E test from Story 55.1 is now green
  - [ ] All other e2e tests pass

## Dev Notes

### Key Files

| File | Purpose |
|------|---------|
| `apps/server/src/app/routes/universe/index.ts` | Main universe POST endpoint — Prisma query lives here |
| `apps/server/src/app/routes/universe/parse-sort-filter-header.function.ts` (likely path) | Parses sort/filter from request headers |
| `apps/server/src/app/routes/universe/*.spec.ts` | Unit tests for universe route |

### Prisma query pattern to watch for

If the query does an `include: { trades: true }` or similar join, Prisma returns one `universe`
record per matching `trade` row. Fix options:
1. Add `distinct: ['id']` to the `findMany` call
2. Aggregate trades data in a sub-query rather than an include
3. Remove the trades join and compute fields separately

### Related: Epics 43, 55 context

Epic 43 added secondary-sort logic to the server query. Verify that `DISTINCT` or grouping does
not conflict with the `ORDER BY` clause for computed columns.

## Dev Agent Record

> _(To be filled in by the implementing dev agent.)_

### Root Cause

_(Document why duplicates appear.)_

### Fix Applied

_(Describe the Prisma query change.)_
