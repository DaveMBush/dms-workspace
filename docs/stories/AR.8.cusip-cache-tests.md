# Story AR.8: Unit Tests for CUSIP Lookup Caching

**Status:** Ready for Review

## Story

**As a** developer
**I want** comprehensive unit tests for CUSIP lookup caching functionality
**So that** I can verify the caching layer works correctly before implementation (TDD approach)

## Context

**Current System:**

- Epic AR (AR.1–AR.7) is complete with Fidelity CSV import
- `resolveCusipSymbols()` function currently calls OpenFIGI API and Yahoo Finance for every CUSIP lookup
- No caching mechanism exists, causing:
  - Repeated API calls for the same CUSIPs across imports
  - Slower import times for large files
  - Potential rate limiting issues with external APIs
  - Unnecessary network traffic and API quota consumption

**Proposed Solution:**

- Add database-backed caching for CUSIP→Symbol mappings
- Check cache before making API calls
- Update cache after successful API resolutions
- Cache should persist across application restarts

**Implementation Approach:**

- Write comprehensive unit tests for caching behavior
- Tests should cover cache hits, misses, and updates
- Mock Prisma client for database operations
- Follow TDD RED phase - tests will initially fail
- Tests will be enabled in AR.9 when implementation is complete

## Acceptance Criteria

### Cache Lookup Tests

1. [ ] Test that cached CUSIP lookups return cached ticker without API calls
2. [ ] Test that multiple CUSIPs can be looked up from cache in batch
3. [ ] Test that cache returns correct mappings for known CUSIPs
4. [ ] Test that uncached CUSIPs proceed to API lookup
5. [ ] Test that mixed cached/uncached CUSIPs are handled correctly

### Cache Update Tests

6. [ ] Test that successful OpenFIGI resolutions are cached
7. [ ] Test that successful Yahoo Finance fallback resolutions are cached
8. [ ] Test that failed resolutions are not cached
9. [ ] Test that partial batch results (some succeed, some fail) cache only successes
10. [ ] Test that cache updates use proper upsert logic (no duplicates)

### Integration Tests

11. [ ] Test that `resolveCusipSymbols()` checks cache before API calls
12. [ ] Test that cache miss triggers original API lookup flow
13. [ ] Test that cache hit bypasses both OpenFIGI and Yahoo Finance
14. [ ] Test that newly resolved symbols are immediately available in cache

### Error Handling Tests

15. [ ] Test that database errors don't prevent API lookup (graceful fallback)
16. [ ] Test that cache write failures don't affect resolution results
17. [ ] Test that invalid CUSIP formats are not cached
18. [ ] Test that empty or null symbols are not cached

### Data Integrity Tests

19. [ ] Test that cache stores timestamps for audit trail
20. [ ] Test that CUSIP and symbol fields have proper constraints
21. [ ] Test that cache entries can be queried by CUSIP
22. [ ] Test that cache entries have proper data types

## Tasks / Subtasks

- [x] Create test file `cusip-cache.service.spec.ts` (AC: 1-10)
  - [x] Write tests for cache lookup by single CUSIP
  - [x] Write tests for cache lookup by CUSIP array
  - [x] Write tests for cache update after resolution
  - [x] Write tests for upsert behavior
  - [x] Mock Prisma client operations
- [x] Update `resolve-cusip.function.spec.ts` (AC: 11-14)
  - [x] Add tests for cache integration
  - [x] Verify cache is checked before API calls
  - [x] Verify API calls happen only for cache misses
  - [x] Verify cache updates after successful resolutions
- [x] Add error handling tests (AC: 15-18)
  - [x] Test database connection failures
  - [x] Test cache write failures
  - [x] Test invalid data handling
- [x] Add data integrity tests (AC: 19-22)
  - [x] Test timestamp generation
  - [x] Test field constraints
  - [x] Test query operations

## Dependencies

- Epic AR (AR.1–AR.7) - completed
- Prisma schema (will be defined in AR.9)

## Technical Considerations

- Tests should be isolated and not depend on actual database
- Use Prisma mock library or manual mocks
- Tests should match future Prisma model structure
- Cache service should be mockable for testing `resolve-cusip.function`

## Definition of Done

- [ ] All unit tests written and documented
- [ ] Tests follow existing project testing patterns
- [ ] Tests initially fail (no implementation yet)
- [ ] Tests disabled with `xit()` or `.skip` to allow CI to pass
- [ ] Test file reviewed and approved
- [ ] Clear test descriptions explain expected behavior
- [ ] Edge cases and error conditions covered

## Related Files

**New Files:**

- `apps/server/src/app/routes/import/cusip-cache.service.spec.ts` (tests for cache service)

**Modified Files:**

- `apps/server/src/app/routes/import/resolve-cusip.function.spec.ts` (add cache integration tests)

## Notes

- This story follows TDD RED phase pattern from AR.1-TDD, AR.2-TDD, etc.
- Implementation will come in AR.9
- Tests should be comprehensive enough to drive implementation design
- Consider cache expiration strategy (may be in AR.10)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Completion Notes

- Created `cusip-cache.service.spec.ts` with 18 skipped tests covering AC 1-10, 15-22
- Added 4 skipped cache integration tests to `resolve-cusip.function.spec.ts` covering AC 11-14
- All 22 existing tests pass; all 22 new tests are properly skipped (RED phase)
- Tests use mock Prisma client with `CusipCacheEntry` interface matching expected schema
- Used `test.skip` for all new tests to ensure CI passes

### File List

- `apps/server/src/app/routes/import/cusip-cache.service.spec.ts` (NEW)
- `apps/server/src/app/routes/import/resolve-cusip.function.spec.ts` (MODIFIED)
- `docs/stories/AR.8.cusip-cache-tests.md` (MODIFIED)

### Change Log

- Created cusip-cache.service.spec.ts with 18 test.skip tests for cache CRUD, error handling, and data integrity
- Added cache integration describe block with 4 test.skip tests to resolve-cusip.function.spec.ts
- Updated story task checkboxes and status

## QA Results

### Review Date: 2026-03-06

### Reviewed By: Quinn (Test Architect)

### Code Quality Assessment

Solid TDD RED phase implementation. All 22 acceptance criteria are mapped to 22 skipped tests (18 in cusip-cache.service.spec.ts, 4 in resolve-cusip.function.spec.ts). Test structure is clean with proper describe blocks organized by AC groupings. Uses `function` keywords per project conventions, proper vitest imports, and `beforeEach` cleanup. Helper functions (`createMockPrismaClient`, `createCacheEntry`) reduce duplication. The integration tests in resolve-cusip.function.spec.ts are particularly well-done with clear future-state comments showing exactly what will change when the cache is wired.

Two medium-severity concerns warrant attention before or during AR.9 implementation.

### Refactoring Performed

None — no refactoring performed for this RED phase story.

### Compliance Check

- Coding Standards: ✓ Uses `function` keywords, vitest patterns, consistent naming
- Project Structure: ✓ Test file co-located with source in import directory
- Testing Strategy: ✓ Follows TDD RED pattern from prior AR stories, all tests use `test.skip`
- All ACs Met: ✓ All 22 ACs have corresponding skipped tests

### Improvements Checklist

- [x] All 22 ACs mapped to test cases
- [x] All tests properly skipped with `test.skip()` — CI green (459 passed, 61 skipped)
- [x] E2E unaffected (chromium: 481 passed, firefox: 491 passed)
- [x] Zero duplicates (dupcheck clean)
- [ ] **TEST-001** (medium): Cache service tests call Prisma mocks directly instead of through a `CusipCacheService` abstraction. When AR.9 creates the service, tests should be refactored to call service methods (`lookup`, `lookupMany`, `cache`) so they validate service behavior, not mock plumbing.
- [ ] **TEST-002** (medium): AC 15 test asserts database error IS thrown (`expect(caughtError).toBeDefined()`), but AC requires graceful fallback where DB errors don't prevent API lookup. Test should verify the service catches the error and returns null.
- [ ] **TEST-003** (low): AC 16 test similarly asserts write error is thrown rather than testing that resolution result is returned despite cache write failure.

### Security Review

No security concerns — test-only changes with no production code modifications.

### Performance Considerations

No performance concerns — all tests are skipped and add negligible CI overhead.

### Files Modified During Review

None.

### Gate Status

Gate: CONCERNS → docs/qa/gates/AR.8-cusip-cache-tests.yml

### Recommended Status

✓ Ready for Done — concerns are non-blocking for RED phase and should be addressed during AR.9 GREEN phase when tests are enabled and service is implemented.
