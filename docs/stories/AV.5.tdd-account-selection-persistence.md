# Story AV.5: Write Unit Tests for Account Selection Persistence - TDD RED Phase

## Story

**As a** developer
**I want** to write unit tests for account selection persistence
**So that** I have failing tests that define the expected behavior (TDD RED phase)

## Context

**Current System:**

- Account selection is not persisted across refreshes
- StatePersistenceService available
- Need test-first approach for account persistence

**Implementation Approach:**

- Write unit tests for account selection persistence
- Test account ID saving on selection change
- Test account ID restoration on component init
- Disable tests after writing to allow CI to pass
- Tests will be re-enabled in Story AV.6

## Acceptance Criteria

### Functional Requirements

- [ ] Unit tests written for account selection persistence
  - [ ] Test account selection saves to state service
  - [ ] Test account selection loads from state service
  - [ ] Test default behavior when no saved account
  - [ ] Test account selection updates UI correctly
  - [ ] Test handling of deleted/invalid account ID
- [ ] All tests initially fail (RED phase)
- [ ] Tests disabled with `xit()` or `.skip` to allow CI to pass

### Technical Requirements

- [ ] Tests follow existing testing patterns
- [ ] StatePersistenceService properly mocked
- [ ] Test coverage includes edge cases
- [ ] Test descriptions are clear and specific

## Implementation Details

### Step 1: Write Account Selection Tests

```typescript
describe('AccountComponent - Account Selection Persistence', () => {
  xit('should save selected account ID to state service');
  xit('should load saved account ID on component init');
  xit('should handle no saved account gracefully');
  xit('should update UI when account selection restored');
  xit('should handle invalid/deleted account ID');
  xit('should clear saved account when account deleted');
});
```

### Step 2: Run Tests and Verify RED Phase

```bash
pnpm test:dms-material
```

## Definition of Done

- [ ] All unit tests written and disabled (RED phase)
- [ ] Tests cover all acceptance criteria scenarios
- [ ] Tests disabled to allow CI to pass
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Related Stories

- **Previous**: Story AV.4 (Global Tab Implementation)
- **Next**: Story AV.6 (Implementation)
- **Epic**: Epic AV

---

## Dev Agent Record

### Status

Approved
