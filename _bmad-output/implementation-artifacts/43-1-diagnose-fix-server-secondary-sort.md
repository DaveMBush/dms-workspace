# Story 43.1: Diagnose and Fix Server-Side Secondary Sort

Status: Complete

## Story

As a trader,
I want the Universe screen results to be correctly ordered by the secondary sort column when primary-sort values are tied,
so that I can meaningfully compare securities with equal primary-sort values.

## Acceptance Criteria

1. **Given** the Universe screen has rows with identical "Avg Purch Yield%" values, **When** the user clicks "Avg Purch Yield%" to set it as the primary sort and Shift+clicks "Yield%" to add it as a secondary sort (both descending), **Then** rows with equal "Avg Purch Yield%" are sub-ordered in descending "Yield%" order.
2. **Given** the server receives a multi-column sort request with primary and secondary columns, **When** the sort query is constructed, **Then** all requested sort columns are included in the ORDER BY clause in priority order.
3. **Given** only a primary sort column is selected (no secondary), **When** the sort query is constructed, **Then** the single-column sort behaviour is unchanged.
4. **Given** all changes are applied, **When** `pnpm all` runs, **Then** all unit tests pass with no regressions.

## Tasks / Subtasks

- [x] Inspect the server-side query builder to identify how the ORDER BY clause is constructed from incoming sort params (AC: #2)
  - [x] Locate the endpoint/service that handles Universe screen data requests
  - [x] Trace how client-sent multi-column sort params are converted into SQL ORDER BY expressions
  - [x] Identify why only the first sort column is being applied
- [x] Fix the ORDER BY construction to include all sort columns in priority order (AC: #2)
  - [x] Ensure each sort column and direction from the request is mapped to an ORDER BY term
  - [x] Preserve existing single-column sort behaviour (AC: #3)
- [x] Verify fix manually on Universe screen (AC: #1)
  - [x] Use Playwright MCP server to confirm secondary sort is visually applied when primary values are tied
- [x] Run `pnpm all` and confirm no regressions (AC: #4)

## Dev Notes

### Background

The client already sends the correct multi-column sort parameters to the server. The issue is entirely server-side: the ORDER BY clause is not including the secondary (and further) sort columns. This was confirmed by inspecting network traffic — the request is correct but the response order only reflects the primary sort, with secondary-sort ties resolved by database insertion order.

### Key Commands

- Run all tests: `pnpm all`
- Run unit tests only: `pnpm test`
- Run e2e chromium: `pnpm run e2e:dms-material:chromium`

### Key File Locations

- Server source: `apps/server/src/`
- Universe data endpoint: look for routes/controllers handling `/universe` or similar data fetch paths
- Sort query logic: likely in a query builder or repository class

### Tech Stack

- Backend: Fastify + Prisma (better-sqlite3)
- Sort params from client are multi-column — inspect the existing `orderBy` handling in Prisma queries
- Prisma supports array ORDER BY: `orderBy: [{ col1: 'desc' }, { col2: 'desc' }]`

### Rules

- Do not modify test files — tests are the source of truth
- Single-column sort must continue to work exactly as before
- Fix must handle any number of sort columns, not just two

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-03.md]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

N/A

### Completion Notes List

- Root cause identified: `sortUniversesByComputedField` in `universe-computed-sort.function.ts` only accepted a single `field`/`order` and was called with only the first computed sort column from `getTopUniversesComputedSort`.
- Fix: Changed `sortUniversesByComputedField` to accept `SortColumn[]` and compare by each column in order (tiebreaker chain). Updated `getTopUniversesComputedSort` to pass all sort columns from `state.sortColumns` (falling back to the detected computedSort for legacy single-sort path).
- All 41 existing tests in the top route pass unchanged.

### File List

- `apps/server/src/app/routes/top/universe-computed-sort.function.ts`
- `apps/server/src/app/routes/top/get-top-universes-computed-sort.function.ts`

### Change Log

- **Fix**: `sortUniversesByComputedField` now accepts `SortColumn[]` instead of a single field/direction, enabling multi-column in-memory sort with tiebreakers.
- **Fix**: `getTopUniversesComputedSort` now passes all `state.sortColumns` to `sortUniversesByComputedField`, so secondary (and tertiary, etc.) sort columns are honoured when primary values are tied.
