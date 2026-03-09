# Story AW.1: Write Unit Tests for Universe Endpoint Server-Side Sorting - TDD RED Phase

## Story

**As a** developer
**I want** to write comprehensive unit tests for the universe endpoint with sort parameters
**So that** I have failing tests that define the expected behavior (TDD RED phase)

## Context

**Current System:**

- Universe endpoint returns unsorted data
- Client-side sorting causes performance issues with large datasets
- Need server-side sorting for universe listings

**Implementation Approach:**

- Write unit tests for universe endpoint with sort parameters
- Test sorting by different fields (symbol, name, sector, etc.)
- Test ascending and descending order
- Disable tests after writing to allow CI to pass
- Tests will be re-enabled in Story AW.2

## Acceptance Criteria

### Functional Requirements

- [ ] Unit tests written for universe endpoint sorting
  - [ ] Test GET /api/universe with sort parameter
  - [ ] Test sorting by symbol (asc/desc)
  - [ ] Test sorting by name (asc/desc)
  - [ ] Test sorting by sector (asc/desc)
  - [ ] Test sorting by market cap (asc/desc)
  - [ ] Test default sorting behavior (no sort parameter)
  - [ ] Test invalid sort field handling
  - [ ] Test case-insensitive sorting for text fields
- [ ] All tests initially fail (RED phase)
- [ ] Tests disabled with `.skip` to allow CI to pass

### Technical Requirements

- [ ] Tests follow existing testing patterns
- [ ] Database properly mocked/seeded with test data
- [ ] Test coverage includes edge cases
- [ ] Test descriptions are clear and specific

## Implementation Details

### Step 1: Write Universe Endpoint Sort Tests

Create test file for the endpoint:

```typescript
describe('Universe Endpoint - Sorting', () => {
  describe.skip('GET /api/universe with sort parameters', () => {
    it('should sort by symbol ascending');
    it('should sort by symbol descending');
    it('should sort by name ascending');
    it('should sort by name descending');
    it('should sort by sector ascending');
    it('should sort by sector descending');
    it('should sort by marketCap ascending');
    it('should sort by marketCap descending');
    it('should apply default sorting when no parameter provided');
    it('should handle invalid sort field gracefully');
    it('should perform case-insensitive text sorting');
  });
});
```

### Step 2: Run Tests and Verify RED Phase

```bash
pnpm test:server
```

Verify all new tests are skipped.

### Step 3: Confirm Tests Would Fail

Temporarily remove `.skip` from one test to verify it fails, then re-add `.skip`.

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
- Tests must be disabled before merge to allow CI to pass
- Story AW.2 will implement the functionality and re-enable tests

## Related Stories

- **Next**: Story AW.2 (Implementation)
- **Epic**: Epic AW
- **Dependencies**: Epic AV

---

## Dev Agent Record

### Agent Model Used

### Status

Approved

### Tasks / Subtasks

### File List

### Change Log

### Debug Log References
