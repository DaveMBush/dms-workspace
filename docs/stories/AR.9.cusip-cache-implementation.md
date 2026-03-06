# Story AR.9: Implement CUSIP Lookup Caching

**Status:** Draft

## Story

**As a** user
**I want** CUSIP lookups to be cached in the database
**So that** repeated imports are faster and don't consume unnecessary API quota

## Context

**Current System:**

- Epic AR (AR.1–AR.7) completed with Fidelity CSV import
- AR.8 has comprehensive unit tests for caching behavior (disabled/failing)
- `resolveCusipSymbols()` currently makes API calls for every CUSIP, even previously resolved ones
- Users importing multiple files with overlapping securities face:
  - Slow import times due to repeated API lookups
  - Risk of hitting rate limits (OpenFIGI: 25 requests/min free tier)
  - Unnecessary external API dependencies

**Business Impact:**

- Large import files (100+ securities) can take minutes
- Users re-importing corrected files waste API quota
- Portfolio updates requiring re-imports are inefficient
- System reliability depends on external API availability

**Proposed Solution:**

- Add `cusip_cache` table to Prisma schema
- Create `CusipCacheService` for cache operations
- Modify `resolveCusipSymbols()` to check cache first
- Update cache after successful API resolutions
- Cache persists across application restarts

**Success Metrics:**

- Cache hit rate >70% for typical user workflows
- Import time reduced by 50%+ for files with previously seen securities
- OpenFIGI API calls reduced by 70%+

## Acceptance Criteria

### Database Schema

1. [ ] Prisma schema includes `cusip_cache` model with fields:
   - `id` (UUID primary key)
   - `cusip` (string, unique, indexed)
   - `symbol` (string, non-null)
   - `source` (enum: 'OPENFIGI' | 'YAHOO_FINANCE')
   - `resolvedAt` (DateTime, default now)
   - `createdAt` (DateTime, default now)
   - `updatedAt` (DateTime, auto-update)
2. [ ] Migration created and can run successfully
3. [ ] Prisma client regenerated with new model

### Cache Service

4. [ ] `CusipCacheService` created with methods:
   - `findByCusip(cusip: string): Promise<string | null>`
   - `findManyCusips(cusips: string[]): Promise<Map<string, string>>`
   - `upsertMapping(cusip: string, symbol: string, source: string): Promise<void>`
   - `upsertManyMappings(mappings: Array<{cusip, symbol, source}>): Promise<void>`
5. [ ] Service uses Prisma client for database operations
6. [ ] Service handles database errors gracefully
7. [ ] Service methods are properly typed with TypeScript

### Integration with resolve-cusip.function

8. [ ] `resolveCusipSymbols()` checks cache before API calls
9. [ ] Cache hits bypass both OpenFIGI and Yahoo Finance APIs
10. [ ] Cache misses proceed to existing API lookup flow
11. [ ] Successful OpenFIGI resolutions are cached with source='OPENFIGI'
12. [ ] Successful Yahoo Finance resolutions are cached with source='YAHOO_FINANCE'
13. [ ] Failed resolutions are not cached (allow retry on next import)
14. [ ] Mixed results (some cached, some API) are handled correctly

### Error Handling

15. [ ] Database connection errors don't break import flow
16. [ ] Cache lookup failures fall back to API lookup
17. [ ] Cache write failures don't affect import results
18. [ ] Errors are logged for monitoring

### Testing

19. [ ] All tests from AR.8 are re-enabled and passing
20. [ ] Integration tests verify end-to-end caching behavior
21. [ ] Manual testing with real CSV files confirms caching works
22. [ ] Second import of same file shows significant speedup

### Performance

23. [ ] Cache lookups are efficient (indexed queries)
24. [ ] Batch operations use efficient Prisma queries
25. [ ] No N+1 query problems
26. [ ] Import performance improved for files with repeated securities

## Tasks / Subtasks

- [ ] Add Prisma schema model (AC: 1-3)
  - [ ] Define `cusip_cache` model in `schema.prisma`
  - [ ] Create migration: `prisma migrate dev --name add-cusip-cache`
  - [ ] Regenerate Prisma client: `prisma generate`
  - [ ] Verify migration in both SQLite and PostgreSQL schemas
- [ ] Implement CusipCacheService (AC: 4-7)
  - [ ] Create `apps/server/src/app/routes/import/cusip-cache.service.ts`
  - [ ] Implement `findByCusip()` method
  - [ ] Implement `findManyCusips()` method for batch lookups
  - [ ] Implement `upsertMapping()` method
  - [ ] Implement `upsertManyMappings()` for batch updates
  - [ ] Add error handling and logging
  - [ ] Add JSDoc comments
- [ ] Integrate with resolve-cusip.function (AC: 8-14)
  - [ ] Import CusipCacheService
  - [ ] Add cache lookup before `batchLookupCusips()`
  - [ ] Filter out cached CUSIPs from API calls
  - [ ] Merge cached results with API results
  - [ ] Add cache updates after successful OpenFIGI lookups
  - [ ] Add cache updates after successful Yahoo Finance lookups
  - [ ] Ensure proper source tracking
- [ ] Add error handling (AC: 15-18)
  - [ ] Wrap cache operations in try-catch
  - [ ] Log cache errors without failing import
  - [ ] Ensure graceful degradation to API-only mode
- [ ] Enable and verify tests (AC: 19-22)
  - [ ] Re-enable all tests from AR.8
  - [ ] Fix any failing tests
  - [ ] Add integration tests for full flow
  - [ ] Run manual import tests with CSV files
- [ ] Performance verification (AC: 23-26)
  - [ ] Review generated SQL queries
  - [ ] Test with large import files (100+ rows)
  - [ ] Measure import time before/after caching
  - [ ] Verify cache hit rates

## Dependencies

- AR.8 (unit tests must be written first)
- Prisma installed and configured
- Database migrations working

## Technical Considerations

### Prisma Schema Location
- Primary schema: `prisma/schema.prisma` (SQLite for dev)
- Also maintain: `prisma/schema.postgresql.prisma` (production)
- Migration files in: `prisma/migrations/` and `prisma/migrations-postgresql/`

### Cache Invalidation Strategy
- Current implementation: no expiration (permanent cache)
- Rationale: CUSIP→Symbol mappings rarely change
- Future enhancement (AR.10): Add expiration/cleanup for delisted securities

### Concurrency
- Upsert operations prevent duplicate key errors
- Last-write-wins for concurrent updates (acceptable for this use case)

### Testing Strategy
- Unit tests with mocked Prisma client (AR.8)
- Integration tests with test database
- Manual testing with real Fidelity CSV files

## Definition of Done

- [ ] Prisma schema updated and migration applied
- [ ] CusipCacheService implemented and tested
- [ ] resolve-cusip.function modified to use cache
- [ ] All AR.8 tests passing
- [ ] Integration tests passing
- [ ] Manual testing confirms faster imports
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] No new errors in logs during testing

## Related Files

**New Files:**
- `apps/server/src/app/routes/import/cusip-cache.service.ts` (cache service)
- `apps/server/src/app/routes/import/cusip-cache.service.spec.ts` (created in AR.8)
- Migration file: `prisma/migrations/YYYYMMDDHHMMSS_add_cusip_cache/migration.sql`

**Modified Files:**
- `prisma/schema.prisma` (add cusip_cache model)
- `prisma/schema.postgresql.prisma` (add cusip_cache model)
- `apps/server/src/app/routes/import/resolve-cusip.function.ts` (integrate caching)
- `apps/server/src/app/routes/import/resolve-cusip.function.spec.ts` (update tests)

## Example Schema Model

```prisma
model cusip_cache {
  id         String   @id @default(uuid())
  cusip      String   @unique
  symbol     String
  source     String   // 'OPENFIGI' or 'YAHOO_FINANCE'
  resolvedAt DateTime @default(now())
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([cusip])
  @@index([resolvedAt])
}
```

## Example Usage Flow

```typescript
// Before API lookup
const cached = await cusipCacheService.findManyCusips(allCusips);
const uncachedCusips = allCusips.filter(c => !cached.has(c));

// After API lookup
const newMappings = resolvedFromApi.map(({cusip, symbol}) => ({
  cusip,
  symbol,
  source: 'OPENFIGI'
}));
await cusipCacheService.upsertManyMappings(newMappings);
```

## Notes

- This story follows TDD GREEN phase pattern from AR.1, AR.2, etc.
- Cache is append-only (no deletion) in this version
- Cache cleanup/expiration deferred to AR.10
- Performance improvements should be measurable and significant
