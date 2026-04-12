# Story 66.1: Refactor CEF Classification Logic into Reusable Functions

Status: Approved

## Story

As a developer,
I want the existing CefConnect.com lookup and CEF classification logic extracted into standalone,
reusable functions,
so that the same code can be called from the add-symbol paths without duplication.

## Acceptance Criteria

1. **Given** the screener pipeline currently contains inline code that queries CefConnect.com and
   classifies a symbol as Equity, Income, or Tax Free,
   **When** a developer reads the refactored code,
   **Then** the classification logic lives in one or more named functions (e.g.
   `lookupCefConnectSymbol()`, `classifySymbol()`) that can be imported and called independently of
   the screener.

2. **Given** the refactoring is complete,
   **When** the screener pipeline runs,
   **Then** it calls the same extracted functions and produces identical classification results to the
   pre-refactor version — no behaviour change.

3. **Given** unit tests exist for the extracted functions,
   **When** `pnpm all` runs,
   **Then** all unit tests pass and coverage is not reduced.

## Definition of Done

- [x] Existing CefConnect lookup code read and understood (server-side screener route)
- [x] Classification logic extracted into reusable functions in a shared location (e.g. `apps/server/src/app/routes/common/cef-classification.function.ts`)
- [x] Screener pipeline updated to call the extracted functions — no logic duplication
- [x] Unit tests written for the extracted functions covering: known CEF with Equity classification, known CEF with Income classification, known CEF with Tax Free classification, non-CEF symbol (returns null)
- [x] No behaviour change to the screener end-to-end
- [x] `pnpm all` passes

## Tasks / Subtasks

- [x] Task 1: Read and fully understand the current screener classification flow (AC: #1)
  - [x] Subtask 1.1: Read `apps/server/src/app/routes/screener/index.ts` — understand `determineRiskGroupId()`, `loadRiskGroups()`, `fetchScreeningData()`
  - [x] Subtask 1.2: Read `apps/server/src/app/routes/screener/cef-page-scraping.function.ts` — understand `fetchCefPage()`, `extractHoldingsCount()`, `extractTopHoldingsPercent()`
  - [x] Subtask 1.3: Read `apps/server/src/app/routes/screener/screening-requirements.function.ts` — note the already-extracted `isEquityCategory()`, `isFixedIncomeCategory()`, `isTaxFreeCategory()` functions
  - [x] Subtask 1.4: Read `apps/server/src/app/routes/screener/screening-data.interface.ts` — note `ScreeningData` interface shape (especially `CategoryId` and `Ticker` fields)

- [x] Task 2: Create `cef-classification.function.ts` in the shared common directory (AC: #1)
  - [x] Subtask 2.1: Create `apps/server/src/app/routes/common/cef-classification.function.ts`
  - [x] Subtask 2.2: Implement `lookupCefConnectSymbol(symbol: string): Promise<ScreeningData | null>` — queries `https://www.cefconnect.com/api/v3/dailypricing`, searches the returned array for an entry where `Ticker === symbol.toUpperCase()`, returns the `ScreeningData` entry or `null` if not found
  - [x] Subtask 2.3: Implement `classifySymbolRiskGroupId(data: ScreeningData, riskGroups: RiskGroupMap): string | null` — maps `CategoryId` to a risk_group_id using the `isEquityCategory()`, `isFixedIncomeCategory()`, `isTaxFreeCategory()` functions from `screening-requirements.function.ts`; returns `null` if no category matches
  - [x] Subtask 2.4: Export a `RiskGroupMap` interface (or re-export from screener) so callers can pass in pre-loaded risk groups
  - [x] Subtask 2.5: Use `axiosGetWithBackoff` from `apps/server/src/app/routes/common/axios-get-with-backoff.function.ts` for the HTTP request — same headers pattern as the screener's `createRequestHeaders()` function

- [x] Task 3: Update the screener to call the extracted functions (AC: #2)
  - [x] Subtask 3.1: Replace the inline `determineRiskGroupId()` implementation in `apps/server/src/app/routes/screener/index.ts` with a call to `classifySymbolRiskGroupId()` from the common module
  - [x] Subtask 3.2: Verify that `fetchScreeningData()` in the screener still calls the bulk dailypricing endpoint directly (it can retain its own fetch since it already has all symbols loaded) — only the per-symbol classification logic delegates to the shared function
  - [x] Subtask 3.3: Ensure no logic duplication remains between `index.ts` and `cef-classification.function.ts`

- [x] Task 4: Write unit tests for the extracted functions (AC: #3)
  - [x] Subtask 4.1: Create `apps/server/src/app/routes/common/cef-classification.function.spec.ts`
  - [x] Subtask 4.2: Mock `axiosGetWithBackoff` in tests
  - [x] Subtask 4.3: Test `lookupCefConnectSymbol()`: CEF symbol found (returns ScreeningData), symbol not in API response (returns null), API throws error (propagates or returns null — decide and document)
  - [x] Subtask 4.4: Test `classifySymbolRiskGroupId()`: CategoryId ≤ 10 → equities risk_group_id, CategoryId 11–20 → income risk_group_id, CategoryId 21–24 → taxFree risk_group_id, CategoryId = 27 (out of range) → null
  - [x] Subtask 4.5: Run `pnpm all` and confirm all tests pass

## Dev Notes

### Key Files

| File | Purpose |
|------|---------|
| `apps/server/src/app/routes/screener/index.ts` | Current home of `determineRiskGroupId()`, `loadRiskGroups()`, `fetchScreeningData()`, `processSymbol()` — read before extracting |
| `apps/server/src/app/routes/screener/cef-page-scraping.function.ts` | `fetchCefPage()`, `extractHoldingsCount()`, `extractTopHoldingsPercent()` — used for page-level screening only, NOT for CategoryId classification |
| `apps/server/src/app/routes/screener/screening-requirements.function.ts` | Already has `isEquityCategory()`, `isFixedIncomeCategory()`, `isTaxFreeCategory()` — import these in the new function rather than duplicating |
| `apps/server/src/app/routes/screener/screening-data.interface.ts` | `ScreeningData` interface — `CategoryId: number`, `Ticker: string`, `DistributionFrequency`, `Price`, etc. |
| `apps/server/src/app/routes/common/axios-get-with-backoff.function.ts` | Use this for all HTTP calls — same pattern as the screener |
| `apps/server/src/app/routes/common/cef-classification.function.ts` | **NEW FILE** — target location for extracted functions |
| `apps/server/src/app/routes/common/cef-classification.function.spec.ts` | **NEW FILE** — unit tests |

### Architecture Context

The screener (`screener/index.ts`) currently:
1. Calls `loadRiskGroups()` to fetch all risk group IDs from the database
2. Calls `fetchScreeningData()` — hits `https://www.cefconnect.com/api/v3/dailypricing` — returns all CEF records
3. For each symbol in the results, calls `determineRiskGroupId(symbol, riskGroups)` — maps `CategoryId` → risk_group_id

The classification rules, from `determineRiskGroupId()` in `screener/index.ts`:
- `CategoryId <= 10` OR `CategoryId === 25` OR `CategoryId === 26` → Equities
- `CategoryId >= 11 && CategoryId <= 24` breaks down — income is 11–20, taxFree is 21–24
  - Actually `CategoryId >= 11 && CategoryId <= 20` → Income
  - `CategoryId >= 21 && CategoryId <= 24` → Tax Free
- These mirror the already-extracted functions in `screening-requirements.function.ts`:
  - `isEquityCategory(categoryId)`, `isFixedIncomeCategory(categoryId)`, `isTaxFreeCategory(categoryId)`

**Critical observation:** `determineRiskGroupId()` in the screener partially duplicates the logic in `screening-requirements.function.ts`. Story 66.1 should unify them. The `classifySymbolRiskGroupId()` function should call the already-extracted `isEquityCategory()` etc. functions.

For `lookupCefConnectSymbol()`: the add-symbol paths need to check a single ticker against the dailypricing endpoint. The simplest correct approach: fetch all from the endpoint and `.find()` the matching ticker. This is the same network call the screener already makes; the difference is the caller only needs one result.

**The `RiskGroupMap` type** is currently defined inline in `screener/index.ts` — it needs to be exported from the common module or from the screener (preferred: move it to common so add-symbol callers can use it without importing from screener).

### Technical Guidance

- Do NOT move `fetchCefPage()`, `extractHoldingsCount()`, `extractTopHoldingsPercent()` — these are used for per-symbol page-scraping in the screener screening loop and are not relevant to the add-symbol CEF classification use case (which only needs the bulk pricing data + CategoryId).
- The `lookupCefConnectSymbol()` function should use the same request headers as the screener's `createRequestHeaders()` — move or duplicate the header map into the common module (or extract it to `cef-classification.function.ts`).
- Error handling for `lookupCefConnectSymbol()`: if `axiosGetWithBackoff` throws (network error / non-2xx), let the error propagate — callers in Stories 66.2 and 66.3 will catch it and apply a fallback.
- Vitest file-level mock pattern for `axiosGetWithBackoff`:
  ```ts
  vi.mock('../common/axios-get-with-backoff.function', () => ({
    axiosGetWithBackoff: vi.fn(),
  }));
  ```

### Testing Standards
- Unit tests: Vitest in same directory as source file (`apps/server/src/app/routes/common/`)
- Test file name: `cef-classification.function.spec.ts`
- `pnpm all` must pass

### Project Structure Notes
- All server-side functions follow the `*.function.ts` naming convention
- One exported item per file is enforced by ESLint (`@smarttools/one-exported-item-per-file`) — if multiple functions are exported from `cef-classification.function.ts`, add the `/* eslint-disable @smarttools/one-exported-item-per-file -- Utility file */` comment at the top (see `cef-page-scraping.function.ts` for precedent)
- Use named functions throughout — no anonymous arrow functions in subscriptions or effect callbacks (ESLint `@smarttools/no-anonymous-functions`)

### References
- [Source: `_bmad-output/planning-artifacts/epics-2026-04-10.md`#Epic 66]
- [Screener classification: `apps/server/src/app/routes/screener/index.ts`]
- [Category helpers: `apps/server/src/app/routes/screener/screening-requirements.function.ts`]
- [HTTP util: `apps/server/src/app/routes/common/axios-get-with-backoff.function.ts`]

## Dev Agent Record

### Agent Model Used

_[to be filled by dev agent]_

### Debug Log References

### Completion Notes List

### File List
