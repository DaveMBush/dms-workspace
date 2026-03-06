# Story AR.8: Unit Tests for CUSIP Lookup Caching

**Status:** Draft

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

- [ ] Create test file `cusip-cache.service.spec.ts` (AC: 1-10)
  - [ ] Write tests for cache lookup by single CUSIP
  - [ ] Write tests for cache lookup by CUSIP array
  - [ ] Write tests for cache update after resolution
  - [ ] Write tests for upsert behavior
  - [ ] Mock Prisma client operations
- [ ] Update `resolve-cusip.function.spec.ts` (AC: 11-14)
  - [ ] Add tests for cache integration
  - [ ] Verify cache is checked before API calls
  - [ ] Verify API calls happen only for cache misses
  - [ ] Verify cache updates after successful resolutions
- [ ] Add error handling tests (AC: 15-18)
  - [ ] Test database connection failures
  - [ ] Test cache write failures
  - [ ] Test invalid data handling
- [ ] Add data integrity tests (AC: 19-22)
  - [ ] Test timestamp generation
  - [ ] Test field constraints
  - [ ] Test query operations

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
