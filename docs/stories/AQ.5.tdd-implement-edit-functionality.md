# Story AQ.5: TDD - Implement Edit Functionality for Dividends

## Status

Draft

## Story

**As a** frontend developer
**I want** comprehensive unit tests for dividend edit functionality
**So that** I can ensure editing works correctly before implementation

## Context

**Current System:**

- Dividend deposits table displays data (AQ.2)
- Add dividend dialog functional (AQ.4)
- BaseTableComponent supports row actions

**Problem:**

- Need to enable editing of dividend records
- Need tests before implementation (TDD RED phase)

## Acceptance Criteria

### Functional Requirements

1. [ ] Tests verify row click/edit action triggers onEditDividend
2. [ ] Tests verify dialog opens with 'edit' mode
3. [ ] Tests verify existing dividend data passed to dialog
4. [ ] Tests verify dialog width is 500px
5. [ ] Tests verify successful edit shows notification
6. [ ] Tests verify table updates after edit
7. [ ] Tests verify cancel closes dialog without changes

### Technical Requirements

1. [ ] Unit tests created with >80% coverage
2. [ ] Tests follow AAA (Arrange-Act-Assert) pattern
3. [ ] Tests disabled with .skip after RED verification
4. [ ] Mock MatDialog service properly
5. [ ] Mock NotificationService properly
6. [ ] Test data integrity (dividend object passed correctly)

## Tasks / Subtasks

- [ ] Create comprehensive unit tests (AC: 1-7)
  - [ ] Test onEditDividend method with dividend parameter
  - [ ] Test dialog configuration (width, mode, data)
  - [ ] Test dialog receives complete dividend object
  - [ ] Test afterClosed with successful result
  - [ ] Test notification shown on success
  - [ ] Test table update via SmartNgRX
  - [ ] Test cancel scenario (no notification)
- [ ] Run tests to verify RED state (AC: 8)
  - [ ] Execute: `pnpm nx test dms-material --testFile=dividend-deposits.component.spec.ts`
  - [ ] Verify all new tests fail
- [ ] Disable tests with .skip for CI (AC: 9)
  - [ ] Wrap test suite in describe.skip
  - [ ] Add comment: "Disabled until implementation in AQ.6"
- [ ] Commit RED tests (AC: 10)
  - [ ] Stage test file
  - [ ] Commit with message: "feat(AQ.5): Add RED unit tests for edit dividend functionality"

## Dev Notes

### Testing Standards

**Test File Location:**
`apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.spec.ts`

**Testing Frameworks:**
- Vitest for unit testing
- Mock MatDialog and DialogRef
- Mock NotificationService
- Test dialog data passing

**Test Requirements:**
- Follow AAA pattern (Arrange-Act-Assert)
- Verify dividend object passed to dialog unchanged
- Test both success and cancel paths
- Verify SmartNgRX update called (via dialog)
- Achieve >80% code coverage

**Dialog Configuration Expected:**
```typescript
{
  width: '500px',
  data: {
    mode: 'edit',
    dividend: <complete DivDeposit object>
  }
}
```

**Services to Mock:**
- `MatDialog` - provides open() method
- `NotificationService` - provides success() method
- `DivDepositsEffectsService` - update handled by dialog

**DivDeposit Test Data:**
```typescript
const testDividend: DivDeposit = {
  id: '123',
  symbol: 'AAPL',
  date: '2024-01-15',
  amount: 100.50,
  type: 'Dividend',
  accountId: 'acc-1'
};
```

### Relevant Source Tree

**Component Under Test:**
- `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.ts`

**Dependencies:**
- `apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.ts`
- `apps/dms-material/src/app/shared/services/notification.service.ts`
- `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`
- `@angular/material/dialog` - MatDialog

**Reference Implementation:**
Look at similar edit patterns:
- Story AO.8 for edit patterns (if similar exists)
- Any component with edit dialog functionality
- BaseTableComponent row action patterns

### Important Testing Patterns

**Test Edit Method Call:**
```typescript
describe.skip('Edit Functionality', () => {
  it('should open dialog with edit mode and dividend data', () => {
    const dividend: DivDeposit = {
      id: '123',
      symbol: 'AAPL',
      date: '2024-01-15',
      amount: 100.50,
      type: 'Dividend',
      accountId: 'acc-1'
    };

    component.onEditDividend(dividend);

    expect(mockDialog.open).toHaveBeenCalledWith(
      DivDepModal,
      {
        width: '500px',
        data: { mode: 'edit', dividend }
      }
    );
  });

  it('should show success notification when edit completes', async () => {
    const dividend: DivDeposit = { /* ... */ };
    const updatedData = { ...dividend, amount: 150 };
    mockDialogRef.afterClosed.mockReturnValue(of(updatedData));

    component.onEditDividend(dividend);

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockNotification.success).toHaveBeenCalledWith('Dividend updated successfully');
  });

  it('should not show notification when edit is cancelled', async () => {
    const dividend: DivDeposit = { /* ... */ };
    mockDialogRef.afterClosed.mockReturnValue(of(null));

    component.onEditDividend(dividend);

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockNotification.success).not.toHaveBeenCalled();
  });

  it('should pass complete dividend object to dialog', () => {
    const dividend: DivDeposit = {
      id: '123',
      symbol: 'AAPL',
      date: '2024-01-15',
      amount: 100.50,
      type: 'Dividend',
      accountId: 'acc-1'
    };

    component.onEditDividend(dividend);

    const dialogData = mockDialog.open.mock.calls[0][1].data;
    expect(dialogData.dividend).toEqual(dividend);
    expect(dialogData.mode).toBe('edit');
  });
});
```

## Definition of Done

- [ ] Comprehensive unit tests created (>80% coverage)
- [ ] Tests run and fail (RED state verified)
- [ ] Tests disabled with .skip for CI
- [ ] All acceptance criteria have explicit tests
- [ ] Tests follow AAA pattern
- [ ] Dialog data passing tested thoroughly
- [ ] All existing tests still pass
- [ ] Lint passes
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material` (skipped - no implementation changes)
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- Implementation in Story AQ.6
- DivDepModal already supports edit mode (from AE.7)
- Follow TDD RED-GREEN-REFACTOR cycle
- Tests will be re-enabled in AQ.6

## Dependencies

- Story AQ.4 completed (add functionality working)
- DivDepModal supports edit mode
- BaseTableComponent available for row actions

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-02-22 | 1.0 | Initial story creation | PM Agent |

## Dev Agent Record

### Agent Model Used

_To be populated during implementation_

### Debug Log References

_To be populated during implementation_

### Completion Notes List

_To be populated during implementation_

### File List

_To be populated during implementation_

## QA Results

_To be populated by QA Agent after implementation_
