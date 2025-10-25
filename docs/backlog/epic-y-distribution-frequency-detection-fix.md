# Epic Y: Distribution Frequency Detection Bug Fix

## Epic Goal

Fix the distribution frequency detection algorithm to use a 2-distribution comparison approach instead of 4-distribution averaging, enabling accurate and responsive detection of frequency changes.

## Epic Description

**Existing System Context:**

- Current relevant functionality: `getDistributions` function in settings routes calculates `distributions_per_year` by averaging intervals across last 4 distributions
- Technology stack: Fastify backend with TypeScript, Yahoo Finance data integration
- Integration points: Universe updates, settings routes, yield calculations
- Problem: Averaging approach masks frequency changes, causing incorrect `distributions_per_year` values during daily field updates

**Enhancement Details:**

- What's being changed: Replace 4-distribution averaging with 2-distribution direct comparison
- How it improves: Frequency changes detected immediately (within 2 distributions instead of requiring 4+ to overcome averaging)
- Success criteria: Field updates no longer cause frequency fluctuations; frequency changes detected accurately within 2 distributions

## Stories

1. **Story Y.1:** Update distribution frequency detection algorithm to use 2-distribution comparison with adjusted thresholds

## Compatibility Requirements

- [x] `DistributionResult` interface remains unchanged (no breaking changes)
- [x] API contract preserved (`distribution`, `ex_date`, `distributions_per_year` fields)
- [x] Existing consumers (frontend, universe sync) unaffected by implementation change
- [x] All existing tests updated/pass with new logic

## Technical Constraints

- Node.js/TypeScript backend
- Existing test infrastructure (Vitest)
- Must pass all lint, format, and coverage requirements
- Single file modification scope (isolated change)

## Success Metrics

- Distribution frequency no longer changes during daily field updates
- Frequency changes (e.g., monthly → weekly) detected within 2 distributions
- All test suites pass (existing + new tests)
- Weekly detection accounts for holidays/weekends (≤7 days)
- Code coverage maintained or improved

## Dependencies

- None - isolated change to single function

## Risk Assessment

**Risk Level:** Low

**Risks:**

1. Existing tests may need mock data adjustments
   - Mitigation: Review and update test data patterns
2. New logic could misclassify edge cases
   - Mitigation: Comprehensive boundary testing

## Impact Analysis

**Files Modified:**

- `apps/server/src/app/routes/settings/common/get-distributions.function.ts`
- `apps/server/src/app/routes/settings/common/get-distributions.function.spec.ts`

**Documentation:**

- No PRD updates needed (implementation detail)
- No architecture updates needed (interface unchanged)

## Priority

**High** - Causes daily workflow issues for user

## Estimated Effort

30-45 minutes total implementation and validation
