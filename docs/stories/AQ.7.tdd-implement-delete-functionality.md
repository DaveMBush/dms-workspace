# Story AQ.7: TDD - Implement Delete Functionality for Dividends

## Status

Ready for Review

## Story

**As a** frontend developer
**I want** comprehensive unit tests for dividend delete functionality
**So that** I can ensure deletion works correctly and safely before implementation

## Context

**Current System:**

- Dividend deposits table displays data (AQ.2)
- Add and edit functionality working (AQ.4, AQ.6)
- ConfirmDialogService available for confirmations

**Problem:**

- Need to enable deletion of dividend records
- Need confirmation to prevent accidental deletes
- Need tests before implementation (TDD RED phase)

## Acceptance Criteria

### Functional Requirements

1. [ ] Tests verify delete action triggers onDeleteDividend
2. [ ] Tests verify confirmation dialog shown before delete
3. [ ] Tests verify delete proceeds when user confirms
4. [ ] Tests verify delete cancelled when user declines
5. [ ] Tests verify SmartNgRX delete method called on confirm
6. [ ] Tests verify success notification shown after delete
7. [ ] Tests verify table updates after delete
8. [ ] Tests verify dividend ID passed correctly to delete method

### Technical Requirements

1. [ ] Unit tests created with >80% coverage
2. [ ] Tests follow AAA (Arrange-Act-Assert) pattern
3. [ ] Tests disabled with .skip after RED verification
4. [ ] Mock ConfirmDialogService properly
5. [ ] Mock NotificationService properly
6. [ ] Mock DivDepositsEffectsService delete method

## Tasks / Subtasks

- [x] Create comprehensive unit tests (AC: 1-8)
  - [x] Test onDeleteDividend calls confirmation dialog
  - [x] Test confirmation dialog configuration
  - [x] Test delete proceeds on confirmation
  - [x] Test delete cancelled on decline
  - [x] Test SmartNgRX delete called with correct ID
  - [x] Test success notification shown
  - [x] Test table refresh via SmartNgRX
  - [x] Test error handling
- [x] Run tests to verify RED state (AC: 9)
  - [x] Execute: `pnpm nx test dms-material --testFile=dividend-deposits.component.spec.ts`
  - [x] Verify all new tests fail
- [x] Disable tests with .skip for CI (AC: 10)
  - [x] Wrap test suite in describe.skip
  - [x] Add comment: "Disabled until implementation in AQ.8"
- [x] Commit RED tests (AC: 11)
  - [x] Stage test file
  - [x] Commit with message: "feat(AQ.7): Add RED unit tests for delete dividend functionality"

## Dev Notes

### Testing Standards

**Test File Location:**
`apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.spec.ts`

**Testing Frameworks:**

- Vitest for unit testing
- Mock ConfirmDialogService with observable return
- Mock NotificationService
- Test async operations properly

**Test Requirements:**

- Follow AAA pattern (Arrange-Act-Assert)
- Test confirmation flow thoroughly
- Test both confirm and cancel paths
- Verify SmartNgRX delete called correctly
- Test error scenarios
- Achieve >80% code coverage

**Confirmation Dialog Expected:**

```typescript
{
  title: 'Delete Dividend',
  message: 'Are you sure you want to delete this dividend?',
  confirmText: 'Delete'
}
```

**Services to Mock:**

- `ConfirmDialogService` - provides confirm() returning Observable<boolean>
- `NotificationService` - provides success() method
- `DivDepositsEffectsService` - provides delete() method

**DivDeposit Test Data:**

```typescript
const testDividend: DivDeposit = {
  id: '123',
  symbol: 'AAPL',
  date: '2024-01-15',
  amount: 100.5,
  type: 'Dividend',
  accountId: 'acc-1',
};
```

### Relevant Source Tree

**Component Under Test:**

- `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.ts`

**Dependencies:**

- `apps/dms-material/src/app/shared/services/confirm-dialog.service.ts`
- `apps/dms-material/src/app/shared/services/notification.service.ts`
- `apps/dms-material/src/app/store/div-deposits/div-deposits-effect.service.ts`

**Reference Implementation:**
Check existing onDeleteDividend in component (may already exist partially) or:

- Similar delete patterns in other components
- ConfirmDialogService usage examples
- SmartNgRX delete patterns

### Important Testing Patterns

**Test Delete Flow:**

```typescript
describe.skip('Delete Functionality', () => {
  it('should open confirmation dialog when delete clicked', () => {
    const dividend: DivDeposit = {
      id: '123',
      symbol: 'AAPL',
      date: '2024-01-15',
      amount: 100.5,
      type: 'Dividend',
      accountId: 'acc-1',
    };

    component.onDeleteDividend(dividend);

    expect(mockConfirmDialog.confirm).toHaveBeenCalledWith({
      title: 'Delete Dividend',
      message: 'Are you sure you want to delete this dividend?',
      confirmText: 'Delete',
    });
  });

  it('should call delete and show notification when confirmed', async () => {
    const dividend: DivDeposit = { id: '123' /* ... */ };
    mockConfirmDialog.confirm.mockReturnValue(of(true));
    mockDivDepositsEffects.delete.mockReturnValue(of(undefined));

    component.onDeleteDividend(dividend);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockDivDepositsEffects.delete).toHaveBeenCalledWith('123');
    expect(mockNotification.success).toHaveBeenCalledWith('Dividend deleted');
  });

  it('should not delete when user cancels confirmation', async () => {
    const dividend: DivDeposit = { id: '123' /* ... */ };
    mockConfirmDialog.confirm.mockReturnValue(of(false));

    component.onDeleteDividend(dividend);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockDivDepositsEffects.delete).not.toHaveBeenCalled();
    expect(mockNotification.success).not.toHaveBeenCalled();
  });

  it('should handle delete errors gracefully', async () => {
    const dividend: DivDeposit = { id: '123' /* ... */ };
    mockConfirmDialog.confirm.mockReturnValue(of(true));
    mockDivDepositsEffects.delete.mockReturnValue(throwError(() => new Error('Delete failed')));

    component.onDeleteDividend(dividend);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockNotification.error).toHaveBeenCalled();
  });

  it('should pass correct dividend ID to delete method', async () => {
    const dividend: DivDeposit = {
      id: 'unique-id-789',
      symbol: 'AAPL',
      date: '2024-01-15',
      amount: 100.5,
      type: 'Dividend',
      accountId: 'acc-1',
    };
    mockConfirmDialog.confirm.mockReturnValue(of(true));
    mockDivDepositsEffects.delete.mockReturnValue(of(undefined));

    component.onDeleteDividend(dividend);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockDivDepositsEffects.delete).toHaveBeenCalledWith('unique-id-789');
  });
});
```

## Definition of Done

- [ ] Comprehensive unit tests created (>80% coverage)
- [ ] Tests run and fail (RED state verified)
- [ ] Tests disabled with .skip for CI
- [ ] All acceptance criteria have explicit tests
- [ ] Tests follow AAA pattern
- [ ] Confirmation flow tested thoroughly
- [ ] Error handling tested
- [ ] All existing tests still pass
- [ ] Lint passes
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material` (skipped - no implementation changes)
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- Implementation in Story AQ.8
- ConfirmDialogService already available
- Follow TDD RED-GREEN-REFACTOR cycle
- Tests will be re-enabled in AQ.8

## Dependencies

- Story AQ.6 completed (edit functionality working)
- ConfirmDialogService available
- NotificationService available
- DivDepositsEffectsService.delete() available

## Change Log

| Date       | Version | Description            | Author   |
| ---------- | ------- | ---------------------- | -------- |
| 2026-02-22 | 1.0     | Initial story creation | PM Agent |

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

None - RED verification showed 3 tests failing (those calling `effectsService.delete`) as expected.

### Completion Notes List

- Added 7 tests in `describe.skip` block for delete functionality
- RED verification: 3 tests fail (`effectsService.delete` not yet called)
- 41 existing tests remain GREEN with `.skip` in place
- Added `delete` mock to first describe block's `mockEffectsService`

### File List

- `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.spec.ts`
- `docs/stories/AQ.7.tdd-implement-delete-functionality.md`

## QA Results

_To be populated by QA Agent after implementation_
