# Story AW.13: bug fix

## Story

**As a** developer
**I want** to run the debug workflow for this story
**So that** the human-in-the-loop process can define and fix the exact bug scope

## Context

This story is intentionally minimal. The detailed bug specification, reproduction steps, and fix scope will be provided by the human-in-the-loop mechanism defined in `debug.prompt.md` and its dependencies.

## Implementation Approach

- Execute `.github/prompts/debug.prompt.md` with `epic=AW story=AW.13`
- Use the prompt workflow to collect bug details from the human
- Implement, validate, review, and merge according to that workflow

## Acceptance Criteria

- [ ] `debug.prompt.md` workflow executed for `epic=AW story=AW.13`
- [ ] Bug details collected via the human-in-the-loop prompt mechanism
- [ ] Fix implemented and validated through the standard quality gates
- [ ] PR reviewed and merged through the workflow

## Definition of Done

- [ ] Story has been completed through the debug workflow
- [ ] Validation commands pass according to workflow requirements
- [ ] Code reviewed and approved

## Notes

- Story name is intentionally exactly: `bug fix`
- Requirements are intentionally deferred to the human-in-the-loop debug process

## Related Stories

- **Previous**: Story AW.12 (E2E Tests)
- **Epic**: Epic AW

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Status

Ready for Review

### Tasks / Subtasks

- [x] Fix most_recent_sell_price sorting - move from direct sort to computed sort
- [x] Add unit test for most_recent_sell_price sorting with account filter
- [x] Create E2E seed helper for Universe screen tests
- [x] Create comprehensive E2E test spec for Universe screen (filters, sorts, account filter computed fields)
- [x] Extract shared seed helpers (generateUniqueId, createTestDates, UniverseRecord) to eliminate code duplication
- [x] All lint, build, test, format, and dupcheck validations pass
- [x] Remove Start Date, End Date filters and Clear Date Filters button from Sold Positions
- [x] Add E2E tests for Sold Positions (filter by Symbol, sort by Sell Date)
- [x] Extract shared E2E seed helpers to eliminate code duplication (initializePrismaClient, fetchUniverseIds, createUniverseRecords, SeederResultBase)

### File List

- `apps/server/src/app/routes/top/is-universe-computed-sort.function.ts` — Added most_recent_sell_price to computed sort fields
- `apps/server/src/app/routes/top/universe-computed-sort.function.ts` — Added computeMostRecentSellPrice function and case
- `apps/server/src/app/routes/top/index.ts` — Removed most_recent_sell_price from UNIVERSE_DIRECT_SORT_FIELDS
- `apps/server/src/app/routes/top/index.spec.ts` — Added unit test for most_recent_sell_price accountId filtering
- `apps/dms-material-e2e/src/helpers/seed-universe-e2e-data.helper.ts` — Seeds universe + accounts + trades for E2E; refactored to use shared helpers
- `apps/dms-material-e2e/src/universe-screen-e2e.spec.ts` — NEW: Comprehensive E2E tests (17 tests: 4 filter, 7 sort, 6 account filter)
- `apps/dms-material-e2e/src/helpers/universe-record.types.ts` — NEW: Shared UniverseRecord interface
- `apps/dms-material-e2e/src/helpers/generate-unique-id.helper.ts` — NEW: Shared generateUniqueId function
- `apps/dms-material-e2e/src/helpers/create-test-dates.helper.ts` — NEW: Shared createTestDates function
- `apps/dms-material-e2e/src/helpers/seed-universe-data.helper.ts` — Refactored to import shared helpers
- `apps/dms-material-e2e/src/helpers/seed-screener-data.helper.ts` — Refactored to import shared generateUniqueId
- `apps/dms-material/src/app/account-panel/sold-positions/sold-positions.component.html` — Removed Start Date, End Date datepickers and Clear Date Filters button
- `apps/dms-material/src/app/account-panel/sold-positions/sold-positions.component.ts` — Removed date filter signals, computed signals, and date-related methods
- `apps/dms-material/src/app/account-panel/sold-positions/sold-positions.component.spec.ts` — Removed date range filtering tests and date-related assertions
- `apps/dms-material-e2e/src/helpers/seed-sold-positions-e2e-data.helper.ts` — NEW: Seeds sold trades for E2E tests
- `apps/dms-material-e2e/src/sold-positions-screen-e2e.spec.ts` — NEW: E2E tests (filter by Symbol, sort by Sell Date)
- `apps/dms-material-e2e/src/helpers/seeder-result-base.types.ts` — NEW: Shared SeederResultBase interface
- `apps/dms-material-e2e/src/helpers/shared-prisma-client.helper.ts` — NEW: Shared initializePrismaClient function
- `apps/dms-material-e2e/src/helpers/shared-fetch-universe-ids.helper.ts` — NEW: Shared fetchUniverseIds function
- `apps/dms-material-e2e/src/helpers/shared-create-universe-records.helper.ts` — NEW: Shared createUniverseRecords function
- `apps/dms-material-e2e/src/helpers/seed-open-positions-e2e-data.helper.ts` — Refactored to use shared seed helpers

### Change Log

- Fixed most_recent_sell_price sorting: moved from direct DB sort to computed sort (same pattern as most_recent_sell_date)
- Added computeMostRecentSellPrice that finds most recent sold trade by sell_date and returns sell price
- Created comprehensive E2E test suite: 4 filter tests, 7 sort tests, 6 account-filter computed field tests
- Extracted shared seed helper code into 3 single-export files to eliminate duplication between seed helpers
- Reduced dupcheck from 0.2% to 0.06% (below 0.1% threshold)
- Removed Start Date, End Date filters and Clear Date Filters button from Sold Positions screen
- Removed date-related imports, signals, computed signals, and methods from SoldPositionsComponent
- Removed date range filtering tests from sold-positions spec
- Created sold positions E2E seed helper and 2 E2E tests (filter by Symbol, sort by Sell Date)
- Extracted initializePrismaClient, fetchUniverseIds, createUniverseRecords, SeederResultBase into shared single-export files
- Refactored open-positions and universe seed helpers to use shared helpers

### Debug Log References

- Bug: most_recent_sell_price was in UNIVERSE_DIRECT_SORT_FIELDS, causing Prisma to sort by stale/null DB column instead of computing from trades
- Root cause: Same issue as most_recent_sell_date (fixed in earlier commit) — computed fields need in-memory sorting from trades data
- Fix: Move to UNIVERSE_COMPUTED_SORT_FIELDS + add compute function
