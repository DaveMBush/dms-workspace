# Story 34.2: Implement Dividend Fetch Service for Selected Source

Status: Approved

## Story

As a developer,
I want a typed server service that fetches dividend history for a given ticker from the selected source,
so that the dividend data can be integrated into the update process.

## Acceptance Criteria

1. **Given** the source selected in Story 34.1, **When** `fetchDividendHistory(ticker: string): Promise<ProcessedRow[]>` is called with a valid CEF symbol, **Then** it returns an array of `{ amount: number; date: Date }` objects with `amount` having ≥ 4 decimal places of precision where the source provides it.
2. **Given** the ticker is unknown or the source returns no data, **When** `fetchDividendHistory` is called, **Then** it returns an empty array and logs a structured warning (does not throw).
3. **Given** the source enforces rate limiting, **When** multiple consecutive calls occur, **Then** the service respects the documented rate limit from the evaluation (Story 34.1) using a conservative delay (same pattern as `enforceYahooFinanceRateLimit` in `distribution-api.function.ts`).
4. **Given** the new service file, **When** unit tests run, **Then** all branches (success, empty response, error) are covered and the test passes.

## Definition of Done

- [ ] New service file created under `apps/server/src/app/routes/common/` following existing naming conventions (e.g. `dividend-history.service.ts`)
- [ ] `ProcessedRow[]` return type matches the existing interface in `distribution-api.function.ts`
- [ ] Rate-limit utility added/reused
- [ ] Unit tests with ≥ 100% branch coverage
- [ ] `pnpm all` passes
- [ ] `pnpm format` passes

## Tasks / Subtasks

- [ ] Read Story 34.1 output (`dividend-source-evaluation.md`) to confirm the selected source and its API shape (AC: #1)
  - [ ] Identify the URL pattern, response format, and any required parsing
- [ ] Create `dividend-history.service.ts` under `apps/server/src/app/routes/common/` (AC: #1)
  - [ ] Export `fetchDividendHistory(ticker: string): Promise<ProcessedRow[]>`
  - [ ] Parse response to extract `{ amount: number; date: Date }` pairs preserving full decimal precision
- [ ] Implement empty/error guard returning `[]` and logging a warning (AC: #2)
- [ ] Add rate-limit delay following the pattern in `distribution-api.function.ts` (AC: #3)
- [ ] Write unit tests covering success, empty response, and error branches (AC: #4)
- [ ] Run `pnpm all` and fix any failures
- [ ] Run `pnpm format`

## Dev Notes

### Key Files

- `apps/server/src/app/routes/common/distribution-api.function.ts` — existing Yahoo Finance dividend fetch; study `enforceYahooFinanceRateLimit` and `ProcessedRow` interface
- `_bmad-output/implementation-artifacts/dividend-source-evaluation.md` — produced by Story 34.1; contains selected source URL, response shape, and rate-limit constraints
- `apps/server/src/app/routes/common/` — target directory for the new service file

### Approach

Create a standalone service function (not a class) following the naming convention `<feature>.service.ts`. Reuse or extract a rate-limit utility if one doesn't already exist. The return type must exactly match the `ProcessedRow` interface used downstream in `distribution-api.function.ts`. Unit tests should mock the HTTP call (use `vi.fn()` or MSW) to cover all branches without making real network requests.

## Dev Agent Record

### Agent Model Used

### Completion Notes

## File List
