# Story AV.7: Write Unit Tests for Account Tab Selection Persistence - TDD RED Phase

## Story

**As a** developer
**I want** to write unit tests for account tab selection persistence
**So that** I have failing tests that define the expected behavior (TDD RED phase)

## Context

**Current System:**

- Account tabs (Summary/Activity/Distributions/Holdings) not persisted
- StatePersistenceService available
- Need test-first approach for account tab persistence

**Implementation Approach:**

- Write unit tests for account tab selection persistence
- Test tab index saving per account
- Test tab index restoration on account selection
- Disable tests after writing to allow CI to pass
- Tests will be re-enabled in Story AV.8

## Acceptance Criteria

### Functional Requirements

- [ ] Unit tests written for account tab selection persistence
  - [ ] Test tab selection saves per account ID
  - [ ] Test tab selection loads for selected account
  - [ ] Test default tab when no saved selection
  - [ ] Test independent tab state per account
  - [ ] Test tab selection updates UI correctly
- [ ] All tests initially fail (RED phase)
- [ ] Tests disabled with `xit()` or `.skip` to allow CI to pass

### Technical Requirements

- [ ] Tests follow existing testing patterns
- [ ] StatePersistenceService properly mocked
- [ ] Test coverage includes edge cases
- [ ] Test descriptions are clear and specific

## Implementation Details

### Step 1: Write Account Tab Selection Tests

```typescript
describe('AccountDetailComponent - Tab Selection Persistence', () => {
  xit('should save selected tab index per account ID');
  xit('should load saved tab for selected account');
  xit('should default to first tab when no saved selection');
  xit('should maintain independent tab state per account');
  xit('should update UI when tab selection restored');
  xit('should handle account switch correctly');
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

- **Previous**: Story AV.6 (Account Selection Implementation)
- **Next**: Story AV.8 (Implementation)
- **Epic**: Epic AV

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Status

Ready for Review

### Tasks / Subtasks

- [x] Write skipped tests for saving tab route per account
- [x] Write skipped tests for loading saved tab on init
- [x] Write skipped tests for default tab behavior
- [x] Write skipped tests for independent state per account
- [x] Write skipped tests for tab navigation on account switch
- [x] Write skipped tests for invalid tab handling
- [x] Verify RED phase (test fails when unskipped)
- [x] All validation passes

### File List

- apps/dms-material/src/app/account-panel/account-panel.component.spec.ts (modified - 6 skipped tests)
- docs/stories/AV.7.tdd-account-tab-selection-persistence.md (modified - dev record)

### Change Log

- Added 6 skipped tests in Tab Selection Persistence describe block
- Tests cover: save per account, load on init, default tab, independent state, navigate on switch, invalid tab
- Verified RED phase: unskipped test fails (onTabChange doesn't exist)

### Debug Log References

### Completion Notes
