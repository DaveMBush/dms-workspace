# Story AV.1: Write Unit Tests for State Persistence Service - TDD RED Phase

## Story

**As a** developer
**I want** to write comprehensive unit tests for the state persistence service
**So that** I have failing tests that define the expected behavior (TDD RED phase)

## Context

**Current System:**

- Need to persist UI state across page refreshes
- Requires service to manage localStorage interactions
- Need test-first approach for state persistence logic

**Implementation Approach:**

- Write unit tests for state persistence service
- Test localStorage read/write operations
- Test state serialization/deserialization
- Disable tests after writing to allow CI to pass
- Tests will be re-enabled in Story AV.2

## Acceptance Criteria

### Functional Requirements

- [ ] Unit tests written for StatePersistenceService
  - [ ] Test saveState() stores data in localStorage
  - [ ] Test loadState() retrieves data from localStorage
  - [ ] Test clearState() removes data from localStorage
  - [ ] Test state serialization to JSON
  - [ ] Test state deserialization from JSON
  - [ ] Test handling of missing/corrupted data
  - [ ] Test handling of invalid JSON
- [ ] All tests initially fail (RED phase)
- [ ] Tests disabled with `xit()` or `.skip` to allow CI to pass

### Technical Requirements

- [ ] Tests follow existing testing patterns
- [ ] localStorage properly mocked
- [ ] Test coverage includes edge cases
- [ ] Test descriptions are clear and specific

## Implementation Details

### Step 1: Write StatePersistenceService Tests

Create test file for the service:

```typescript
describe('StatePersistenceService', () => {
  // Basic operations
  xit('should save state to localStorage');
  xit('should load state from localStorage');
  xit('should clear state from localStorage');

  // Serialization
  xit('should serialize state to JSON');
  xit('should deserialize state from JSON');

  // Error handling
  xit('should handle missing localStorage data');
  xit('should handle corrupted data gracefully');
  xit('should handle invalid JSON');
  xit('should return default state when no saved state exists');
});
```

### Step 2: Run Tests and Verify RED Phase

```bash
pnpm test:dms-material
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
- Story AV.2 will implement the functionality and re-enable tests

## Related Stories

- **Next**: Story AV.2 (Implementation)
- **Epic**: Epic AV
- **Dependencies**: Epic AU

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Status

Ready for Review

### Tasks / Subtasks

- [x] Create skeleton StatePersistenceService stub for compilation
- [x] Write unit tests for saveState() with .skip
- [x] Write unit tests for loadState() with .skip
- [x] Write unit tests for clearState() with .skip
- [x] Write tests for serialization/deserialization with .skip
- [x] Write tests for error handling (corrupted/invalid data) with .skip
- [x] Verify all tests are skipped and CI passes
- [x] Confirm a test would fail if unskipped

### File List

- apps/dms-material/src/app/shared/services/state-persistence.service.ts (new - skeleton stub)
- apps/dms-material/src/app/shared/services/state-persistence.service.spec.ts (new - TDD RED tests)
- docs/stories/AV.1.tdd-state-persistence-service.md (modified - dev record)

### Change Log

- Created StatePersistenceService skeleton stub with empty method signatures
- Created comprehensive test file with 20 skipped tests covering saveState, loadState, clearState, serialization, and error handling
- Fixed test mocking: replaced Storage.prototype spies with globalThis.localStorage mock for jsdom compatibility
- Verified all 19 skipped tests + 4 passing tests work correctly
- Confirmed RED phase: unskipped test fails as expected (no implementation)

### Debug Log References

### Completion Notes
