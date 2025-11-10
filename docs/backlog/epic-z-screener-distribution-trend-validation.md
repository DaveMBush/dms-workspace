# Epic Z: Screener Distribution Trend Validation Bug Fix

## Epic Goal

Fix the screener distribution trend detection logic to properly validate distribution dates and exclude future dividends, ensuring accurate identification of declining distribution trends for fund filtering.

## Epic Description

**Existing System Context:**

- Current relevant functionality: Screener refresh process (`/api/screener`) that evaluates CEF symbols for inclusion based on distribution consistency criteria
- Technology stack: Fastify backend with TypeScript, Yahoo Finance data integration, Prisma ORM with SQLite database
- Integration points: `get-consistent-distributions.function.ts`, `distribution-api.function.ts`, screener database table, CEFConnect data scraping
- Problem: Symbols with declining distributions incorrectly pass the "consistent distributions" filter because future scheduled dividends are included in trend analysis and date validation is missing

**Enhancement Details:**

- What's being changed: Add date validation to ensure only past distributions are analyzed, verify distinct dates, and confirm proper date ordering before trend comparison
- How it improves: Prevents false positives by excluding future dividends and validating data integrity before determining if a distribution trend is declining
- Success criteria: Symbols with declining distributions over the last three actual (past) distributions are correctly identified and excluded from the screener results

## Stories

1. **Story Z.1:** Add distribution date validation to screener trend detection logic

## Compatibility Requirements

- [x] `ProcessedRow` interface remains unchanged (no breaking changes)
- [x] `getConsistentDistributions` function signature preserved
- [x] Screener endpoint behavior unchanged for valid distribution sequences
- [x] All existing consumers (screener refresh process) unaffected by implementation change
- [x] All existing tests pass with new logic

## Technical Constraints

- Node.js/TypeScript backend
- Existing test infrastructure (Vitest)
- Must pass all lint, format, and coverage requirements
- Single file modification scope (isolated change)
- Must maintain backward compatibility with existing screener workflow

## Success Metrics

- Symbols with declining distributions (over last 3 actual distributions) are correctly excluded from screener
- Future scheduled dividends no longer affect trend analysis
- Distribution dates are validated for distinctness before comparison
- Date ordering is verified before trend calculation
- All test suites pass (existing tests continue to work)
- No false positives in screener results

## Dependencies

- None - isolated change to single function
- Leverages existing `fetchDistributionData` function that returns both historical and future dividends

## Risk Assessment

**Risk Level:** Low

**Risks:**

1. Existing screener results may change (some symbols previously passing may now be excluded)
   - Mitigation: This is the desired outcome - fixing incorrect filtering
2. New logic could be too strict and exclude valid symbols
   - Mitigation: Logic only requires 3 distinct past distributions in proper order
3. Edge cases with exactly 3 distributions
   - Mitigation: Comprehensive validation logic handles this case

## Impact Analysis

**Files Modified:**

- `apps/server/src/app/routes/screener/get-consistent-distributions.function.ts`

**Files Referenced (no changes):**

- `apps/server/src/app/routes/screener/index.ts` (consumer)
- `apps/server/src/app/routes/common/distribution-api.function.ts` (data source)

**Documentation:**

- No PRD updates needed (bug fix to existing functionality)
- No architecture updates needed (implementation detail)

## Priority

**High** - Causes incorrect data quality in screener results, potentially leading to poor investment decisions

## Estimated Effort

30-45 minutes total implementation and validation

## Definition of Done

- [ ] Distribution trend detection filters to only past distributions
- [ ] Date distinctness validation implemented
- [ ] Date ordering validation implemented
- [ ] Declining trend logic only executes after all validations pass
- [ ] All existing validation commands pass (format, dupcheck, lint, build, tests)
- [ ] Screener correctly excludes symbols with declining distributions
- [ ] Manual verification confirms fix resolves reported issue
