# Story AV.3: Write Unit Tests for Global Tab Selection Persistence - TDD RED Phase

## Story

**As a** developer
**I want** to write unit tests for global tab selection persistence
**So that** I have failing tests that define the expected behavior (TDD RED phase)

## Context

**Current System:**

- Global tab selection (Sell/Account/Global) is not persisted
- StatePersistenceService implemented in AV.2
- Need test-first approach for tab persistence

**Implementation Approach:**

- Write unit tests for global tab selection persistence
- Test tab selection saving on tab change
- Test tab selection restoration on component init
- Disable tests after writing to allow CI to pass
- Tests will be re-enabled in Story AV.4

## Acceptance Criteria

### Functional Requirements

- [ ] Unit tests written for global tab selection persistence
  - [ ] Test tab selection saves to state service on change
  - [ ] Test tab selection loads from state service on init
  - [ ] Test default tab when no saved selection
  - [ ] Test tab selection updates UI correctly
- [ ] All tests initially fail (RED phase)
- [ ] Tests disabled with `xit()` or `.skip` to allow CI to pass

### Technical Requirements

- [ ] Tests follow existing testing patterns
- [ ] StatePersistenceService properly mocked
- [ ] Test coverage includes edge cases
- [ ] Test descriptions are clear and specific

## Implementation Details

### Step 1: Write GlobalTabSelection Tests

```typescript
describe('GlobalTabComponent - Tab Selection Persistence', () => {
  xit('should save selected tab to state service on tab change');
  xit('should load saved tab selection on component init');
  xit('should default to first tab when no saved selection');
  xit('should update active tab indicator when selection restored');
  xit('should handle invalid saved tab gracefully');
});
```

### Step 2: Run Tests and Verify RED Phase

```bash
pnpm test:dms-material
```

Verify all new tests are skipped.

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
- Story AV.4 will implement the functionality

## Related Stories

- **Previous**: Story AV.2 (Service Implementation)
- **Next**: Story AV.4 (Implementation)
- **Epic**: Epic AV

---

## Dev Agent Record

### Status

Approved
