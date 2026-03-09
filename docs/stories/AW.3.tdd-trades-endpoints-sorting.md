# Story AW.3: Write Unit Tests for Separate openTrades/closedTrades Endpoints with Sorting - TDD RED Phase

## Story

**As a** developer
**I want** to write comprehensive unit tests for separate openTrades and closedTrades endpoints with sort parameters
**So that** I have failing tests that define the expected behavior (TDD RED phase)

## Context

**Current System:**

- Trades endpoint returns mixed open and closed trades
- Filtering done client-side
- Need separate endpoints for better performance

**Implementation Approach:**

- Write unit tests for /api/trades/open endpoint with sorting
- Write unit tests for /api/trades/closed endpoint with sorting
- Test sorting by different fields (symbol, date, profit, etc.)
- Disable tests after writing to allow CI to pass
- Tests will be re-enabled in Story AW.4

## Acceptance Criteria

### Functional Requirements

- [ ] Unit tests written for openTrades endpoint sorting
  - [ ] Test GET /api/trades/open with sort parameter
  - [ ] Test sorting by symbol, openDate, currentValue, unrealizedGain
  - [ ] Test ascending and descending order
- [ ] Unit tests written for closedTrades endpoint sorting
  - [ ] Test GET /api/trades/closed with sort parameter
  - [ ] Test sorting by symbol, closeDate, profit, percentGain
  - [ ] Test ascending and descending order
- [ ] Tests for default sorting behavior
- [ ] Tests for invalid sort field handling
- [ ] All tests initially fail (RED phase)
- [ ] Tests disabled with `.skip` to allow CI to pass

### Technical Requirements

- [ ] Tests follow existing testing patterns
- [ ] Database properly mocked/seeded with test data
- [ ] Test coverage includes edge cases
- [ ] Test descriptions are clear and specific

## Implementation Details

### Step 1: Write Open Trades Endpoint Tests

```typescript
describe('Open Trades Endpoint - Sorting', () => {
  describe.skip('GET /api/trades/open with sort parameters', () => {
    it('should return only open trades');
    it('should sort by symbol ascending');
    it('should sort by symbol descending');
    it('should sort by openDate ascending');
    it('should sort by openDate descending');
    it('should sort by currentValue ascending');
    it('should sort by currentValue descending');
    it('should sort by unrealizedGain ascending');
    it('should sort by unrealizedGain descending');
    it('should handle invalid sort field gracefully');
  });
});
```

### Step 2: Write Closed Trades Endpoint Tests

```typescript
describe('Closed Trades Endpoint - Sorting', () => {
  describe.skip('GET /api/trades/closed with sort parameters', () => {
    it('should return only closed trades');
    it('should sort by symbol ascending');
    it('should sort by symbol descending');
    it('should sort by closeDate ascending');
    it('should sort by closeDate descending');
    it('should sort by profit ascending');
    it('should sort by profit descending');
    it('should sort by percentGain ascending');
    it('should sort by percentGain descending');
    it('should handle invalid sort field gracefully');
  });
});
```

### Step 3: Run Tests and Verify RED Phase

```bash
pnpm test:server
```

## Definition of Done

- [ ] All unit tests written and disabled (RED phase)
- [ ] Tests cover all acceptance criteria scenarios
- [ ] Tests disabled to allow CI to pass
- [ ] Test code follows project conventions
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD RED phase
- Tests should fail because implementation doesn't exist yet
- Story AW.4 will implement the functionality and re-enable tests

## Related Stories

- **Previous**: Story AW.2 (Universe implementation)
- **Next**: Story AW.4 (Implementation)
- **Epic**: Epic AW

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (copilot)

### Status

Ready for Review

### Tasks / Subtasks

- [x] Write open trades endpoint sorting tests (describe.skip)
- [x] Write closed trades endpoint sorting tests (describe.skip)
- [x] Include default sorting tests
- [x] Include invalid sort field handling tests
- [x] All validation commands pass

### File List

- apps/server/src/app/routes/trades/trades-sorting.spec.ts (new)

### Change Log

- Added trades-sorting.spec.ts with 24 tests covering open and closed trades endpoints sorting
- Tests use describe.skip to allow CI to pass (TDD RED phase)
- Covers sorting by symbol, openDate/closeDate, currentValue/profit, unrealizedGain/percentGain
- Includes invalid sort field and empty sortBy edge cases

### Debug Log References
