# Story 34.3: Wire New Service into Dividend Update Process

Status: Done

## Story

As Dave (the investor),
I want the application's dividend update process to use the new higher-precision source instead of Yahoo Finance for dividend amounts,
so that dividend data is stored with full precision (≥ 4 decimal places).

## Acceptance Criteria

1. **Given** the existing server route/process that calls Yahoo Finance to fetch dividend/distribution data for universe symbols, **When** Story 34.3 is complete, **Then** it calls the new `fetchDividendHistory` service instead of Yahoo Finance for dividend amounts.
2. **Given** the new service returns no data for a symbol (e.g. the source does not carry that ticker), **When** the update process runs for that symbol, **Then** it falls back to Yahoo Finance for dividend data and logs a structured warning indicating the fallback occurred.
3. **Given** a symbol whose dividend amount was previously stored at 3 decimal places, **When** the update process runs after this story, **Then** the new dividend amount is stored with the precision returned by the source (no artificial truncation).
4. **Given** all integration changes, **When** `pnpm all` runs, **Then** all tests pass.

## Definition of Done

- [x] Yahoo Finance dividend call replaced by new service in the update route/function
- [x] Fallback to Yahoo Finance implemented and logged
- [x] Integration test or updated unit test covering the fallback path
- [x] `pnpm all` passes
- [x] `pnpm format` passes

## Tasks / Subtasks

- [x] Locate the server update route/function that currently calls Yahoo Finance for dividends (AC: #1)
  - [x] Identify the exact call site in `distribution-api.function.ts` or related route handler
- [x] Replace the Yahoo Finance dividend call with `fetchDividendHistory` from Story 34.2 (AC: #1)
  - [x] Ensure the response is passed to the same database write logic
- [x] Implement fallback to Yahoo Finance when `fetchDividendHistory` returns an empty array (AC: #2)
  - [x] Log a structured warning with the ticker symbol that triggered the fallback
- [x] Verify no precision truncation occurs in the database write path (AC: #3)
  - [x] Check Prisma schema field types for dividend amount
- [x] Update or add unit/integration tests covering: primary source success, fallback path (AC: #4)
- [x] Run `pnpm all` and fix any failures
- [x] Run `pnpm format`

## Dev Notes

### Key Files

- `apps/server/src/app/routes/common/distribution-api.function.ts` — current Yahoo Finance dividend fetch; this is the main call site to replace
- `apps/server/src/app/routes/common/dividend-history.service.ts` — new service from Story 34.2
- `prisma/schema.prisma` — check `dividendAmount` field type for decimal precision support

### Approach

This story is a targeted surgical replacement of one call site. Do not restructure the update process — just swap the data source. The fallback pattern should be: call new service → if empty array → call Yahoo Finance → log warning. Ensure the database write receives the amount as a `number` with full precision (avoid `parseFloat(x.toFixed(3))` type truncation).

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4.6 (GitHub Copilot)

### Completion Notes
- Replaced `fetchDistributionData` with `fetchDividendHistory` as primary source in 2 files
- Fallback to Yahoo Finance when primary returns empty array, with structured warning log
- Prisma `Float` type preserves full IEEE 754 double precision (no truncation)
- Added 4 new tests (2 per file): primary path and fallback path
- 43 total tests passing across both spec files

## File List
- `apps/server/src/app/routes/settings/common/get-distributions.function.ts` (modified)
- `apps/server/src/app/routes/settings/common/get-distributions.function.spec.ts` (modified)
- `apps/server/src/app/routes/screener/get-consistent-distributions.function.ts` (modified)
- `apps/server/src/app/routes/screener/get-consistent-distributions.function.spec.ts` (modified)
