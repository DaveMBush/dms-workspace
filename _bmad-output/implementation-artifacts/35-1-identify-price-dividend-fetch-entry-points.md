# Story 35.1: Identify and Document Price/Dividend Fetch Entry Points

Status: Approved

## Story

As a developer,
I want to understand exactly how the "Update Fields" process fetches and stores price and dividend data,
so that I can call the same code path from the symbol-add and CUSIP-resolution flows without duplicating logic.

## Acceptance Criteria

1. **Given** the existing server codebase, **When** Story 35.1 is complete, **Then** `_bmad-output/implementation-artifacts/price-dividend-fetch-analysis.md` documents: the exact function(s) and file(s) responsible for fetching price and dividend in the "Update Fields" flow; the data shape written to the database (which Prisma model fields are updated); the current call sites for symbol add (manual) and CUSIP resolution; a recommended integration approach (e.g. call existing fetch function after save).
2. **Given** the analysis document is produced, **When** it is reviewed, **Then** it contains no assumptions — all facts reference actual file paths and function names from the repository.

## Definition of Done

- [x] `price-dividend-fetch-analysis.md` created
- [x] All referenced file paths and function names verified against the actual source
- [x] `pnpm format` passes

## Tasks / Subtasks

- [x] Trace the "Update Fields" server flow end-to-end (AC: #1)
  - [x] Find the route handler that processes the "Update Fields" action
  - [x] Identify which function(s) fetch price and which fetch dividend
  - [x] Note the exact function signatures and file paths
- [x] Identify the Prisma model fields updated by the fetch (AC: #1)
  - [x] Record field names from `prisma/schema.prisma`
- [x] Find the manual symbol-add call site (AC: #1)
  - [x] Trace from the Angular Add Symbol UI to the server route handler
- [x] Find the CUSIP resolution call site (AC: #1)
  - [x] Trace the CUSIP resolution chain (OpenFIGI → massive.com → Yahoo Finance) to where the symbol is saved
- [x] Draft recommended integration approach (AC: #1)
  - [x] Describe how to call the existing price/dividend fetch after each save without duplicating logic
- [x] Produce `price-dividend-fetch-analysis.md` with all findings (AC: #2)
- [x] Run `pnpm format`

## Dev Notes

### Key Files

- `apps/server/src/app/routes/` — look for routes related to "update fields", symbol add, and CUSIP resolution
- `prisma/schema.prisma` — Universe model with price/dividend fields
- This is a research/documentation story — no production code changes

### Approach

Use grep/search to follow the call chain from the API route for "Update Fields" inward to the data-access functions. Document exact file paths and function names. The output document is consumed by Stories 35.2 and 35.3, so it must be precise and complete.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Completion Notes

Research-only story. Created `_bmad-output/implementation-artifacts/price-dividend-fetch-analysis.md` documenting the full price/dividend fetch chain. Key finding: the Fidelity CSV import auto-create path (`fidelity-data-mapper.function.ts → resolveSymbol`) does NOT call `getLastPrice` or `getDistributions` — it creates bare zero-filled universe records. All other entry points (manual add-symbol, bulk settings save, sync-from-screener) already call both canonical fetch functions.

## File List

- `_bmad-output/implementation-artifacts/price-dividend-fetch-analysis.md` (created)
