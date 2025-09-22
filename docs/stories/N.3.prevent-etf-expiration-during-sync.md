# Story N.3: Prevent ETF Expiration During Screener Sync

## Status

Approved

## Story

**As a** trader with manually-added ETF symbols in my universe,
**I want** the screener-to-universe sync process to preserve my manually-added symbols,
**so that** my ETF symbols are not incorrectly marked as expired when the system syncs CEF data from the screener.

## Acceptance Criteria

1. Update existing screener sync logic to check `is_closed_end_fund` flag before marking symbols as expired
2. Preserve symbols with `is_closed_end_fund = false` during sync operations regardless of screener status
3. Only mark CEF symbols (`is_closed_end_fund = true`) as expired if they're not found in screener results
4. Maintain existing sync functionality for CEF symbols from screener data
5. Update sync response to report preserved ETF count separately from CEF operations
6. Add comprehensive logging to track ETF preservation during sync operations
7. Ensure sync operation remains idempotent with ETF preservation logic
8. Ensure the following commands run without errors:
   - `pnpm format`
   - `pnpm dupcheck`
   - `pnpm nx run rms:test --code-coverage`
   - `pnpm nx run server:build:production`
   - `pnpm nx run server:test --code-coverage`
   - `pnpm nx run server:lint`
   - `pnpm nx run rms:lint`
   - `pnpm nx run rms:build:production`
   - `pnpm nx run rms-e2e:lint`

## Tasks / Subtasks

- [ ] **Task 1: Update screener sync logic to preserve ETFs** (AC: 1, 2, 3)

  - [ ] Modify expire logic to only target symbols with `is_closed_end_fund = true`
  - [ ] Add database query filtering to exclude ETFs from expiration candidates
  - [ ] Update SQL/Prisma queries to include `is_closed_end_fund` condition
  - [ ] Ensure ETF symbols remain `expired = false` regardless of screener status

- [ ] **Task 2: Update sync response format** (AC: 5)

  - [ ] Add `preservedEtfCount` field to sync response schema
  - [ ] Update response generation to count preserved ETF symbols
  - [ ] Maintain backward compatibility with existing response fields
  - [ ] Update API documentation for new response format

- [ ] **Task 3: Add comprehensive logging for ETF preservation** (AC: 6)

  - [ ] Log count of ETF symbols found during sync operation
  - [ ] Log preservation decisions for debugging purposes
  - [ ] Add correlation ID tracking for ETF-related operations
  - [ ] Include ETF preservation details in sync log files

- [ ] **Task 4: Ensure idempotency with ETF logic** (AC: 7)

  - [ ] Test multiple sync runs with mixed CEF/ETF universe
  - [ ] Verify ETF symbols maintain consistent state across syncs
  - [ ] Ensure CEF logic remains properly idempotent
  - [ ] Validate no side effects from ETF preservation logic

- [ ] **Task 5: Update existing sync tests** (AC: 4, 8)

  - [ ] Modify integration tests to include ETF symbols in test data
  - [ ] Add test cases for ETF preservation during sync
  - [ ] Test mixed universe scenarios (CEFs + ETFs)
  - [ ] Verify existing CEF sync functionality remains unchanged
  - [ ] Add boundary tests for edge cases

- [ ] **Task 6: Run all quality gates** (AC: 8)
  - [ ] Execute `pnpm format` and fix any formatting issues
  - [ ] Execute `pnpm dupcheck` and resolve duplicates
  - [ ] Execute all test suites and ensure 100% pass rate
  - [ ] Execute all lint commands and resolve issues
  - [ ] Execute all build commands and ensure successful compilation

## Dev Notes

### Previous Story Context

This story completes Epic N by ensuring the screener sync functionality (established in earlier epics) properly handles the new `is_closed_end_fund` flag from N.1 and works correctly with manually-added symbols from N.2.

### Data Models and Architecture

**Source: [docs/architecture/domain-model-prisma-snapshot.md]**

**Current Sync Logic (from architecture docs):**
The existing sync marks any `universe.symbol` not in the selected Screener set as `expired=true`. This needs modification to preserve ETF symbols.

**Modified Sync Logic (Target):**

1. Query all universe symbols with `is_closed_end_fund = true` (CEFs only)
2. Compare CEF universe symbols against screener results
3. Mark unmatched CEF symbols as `expired = true`
4. Preserve all symbols with `is_closed_end_fund = false` (ETFs) regardless of screener status

### API Specifications

**Source: [docs/architecture/proposed-change-tobe.md]**

**Updated Response Schema for POST `/api/universe/sync-from-screener`:**

```typescript
{
  inserted: number; // New CEF universe records created
  updated: number; // Existing CEF universe records updated
  markedExpired: number; // CEF records marked as expired
  preservedEtfCount: number; // NEW: ETF symbols preserved during sync
  selectedCount: number; // Total screener records meeting criteria
  correlationId: string;
  logFilePath: string;
}
```

### File Locations

**Source: [docs/architecture/references-source-of-truth.md]**

**Primary Files to Modify:**

1. `/apps/server/src/app/routes/universe/sync-from-screener/index.ts` - Main sync endpoint
2. `/apps/server/src/app/routes/universe/sync-from-screener/sync-universe-from-screener.function.ts` - Core sync logic
3. Existing sync utility functions that handle expiration logic
4. Response generation functions for sync endpoint

**Testing Files to Update:**

1. Sync integration tests in server test directory
2. Universe sync unit tests
3. Add new test files for ETF preservation scenarios

### Technical Implementation Details

**Database Query Modifications:**

Current expiration logic (conceptual):

```sql
UPDATE universe
SET expired = true
WHERE symbol NOT IN (selected_screener_symbols)
```

Updated expiration logic (target):

```sql
UPDATE universe
SET expired = true
WHERE symbol NOT IN (selected_screener_symbols)
  AND is_closed_end_fund = true
```

**Prisma Query Modifications:**

```typescript
// Current logic (needs update)
await prisma.universe.updateMany({
  where: {
    symbol: { notIn: selectedSymbols },
  },
  data: { expired: true },
});

// Updated logic (target)
await prisma.universe.updateMany({
  where: {
    symbol: { notIn: selectedSymbols },
    is_closed_end_fund: true,
  },
  data: { expired: true },
});
```

**Logging Enhancements:**

```typescript
// Add to sync logging
const etfSymbols = await prisma.universe.findMany({
  where: { is_closed_end_fund: false },
  select: { symbol: true },
});

logger.info(`Preserving ${etfSymbols.length} ETF symbols during sync`, {
  correlationId,
  etfSymbols: etfSymbols.map((e) => e.symbol),
});
```

### Error Handling & Edge Cases

**Source: [docs/architecture/error-handling-edge-cases.md]**

**ETF Preservation Edge Cases:**

- Empty universe (no ETFs to preserve)
- Universe with only ETFs (no CEFs to sync)
- Mixed universe with overlapping symbols (shouldn't happen with proper data integrity)
- Database transaction failures during sync

**Error Handling Strategy:**

- Wrap ETF preservation logic in same transaction as CEF sync
- Log errors specifically related to ETF preservation
- Ensure partial failures don't corrupt universe state
- Maintain existing error handling for CEF sync operations

### Testing Standards

**Source: [docs/architecture/ci-and-testing.md]**

**Testing Strategy:**

- **Unit Tests:** ETF preservation logic in isolation
- **Integration Tests:** Full sync operation with mixed CEF/ETF data
- **Regression Tests:** Verify existing CEF sync functionality unchanged

**Key Test Scenarios:**

**ETF Preservation Tests:**

- Sync with only ETF symbols (all preserved)
- Sync with only CEF symbols (existing behavior)
- Sync with mixed CEF/ETF universe
- ETF symbols remain unexpired after multiple sync operations
- CEF symbols properly expire when not in screener results

**Integration Test Data:**

```typescript
// Test universe setup
const testUniverse = [
  { symbol: 'SPY', is_closed_end_fund: false }, // ETF - should preserve
  { symbol: 'QQQ', is_closed_end_fund: false }, // ETF - should preserve
  { symbol: 'CEF1', is_closed_end_fund: true }, // CEF - sync behavior
  { symbol: 'CEF2', is_closed_end_fund: true }, // CEF - sync behavior
];
```

**Boundary Tests:**

- Universe with thousands of ETF symbols
- Sync operation performance with large ETF count
- Database transaction handling with mixed operations
- Concurrent sync operations (if applicable)

### Performance Considerations

**Database Query Optimization:**

- Ensure indexes exist on `is_closed_end_fund` field
- Optimize queries to minimize database load during sync
- Consider batch operations for large universe datasets

**Logging Performance:**

- Avoid excessive logging that could impact sync performance
- Use appropriate log levels for production vs development
- Consider log volume impact with large ETF counts

## Change Log

| Date       | Version | Description                         | Author            |
| ---------- | ------- | ----------------------------------- | ----------------- |
| 2024-09-20 | 1.0     | Initial story creation for Epic N.3 | BMad Orchestrator |

## Dev Agent Record

_This section will be populated by the development agent during implementation_

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_

## QA Results

_Results from QA Agent review will be populated here after implementation_
