# Story AQ.3: TDD - Wire Add Dividend Dialog

## Status

Approved

## Story

**As a** frontend developer
**I want** comprehensive unit tests for add dividend dialog integration
**So that** I can ensure the dialog opens correctly and integrates with SmartNgRX before implementation

## Context

**Current System:**

- Dividend deposits table wired (AQ.2)
- DivDepModal component already migrated (Story AE.7)
- Add button exists but may need wiring validation

**Problem:**

- Need to test dialog opening flow
- Need to test SmartNgRX integration for add operation
- Need tests before implementation (TDD RED phase)

## Acceptance Criteria

### Functional Requirements

1. [ ] Tests verify Add button triggers dialog open
2. [ ] Tests verify dialog opens with 'add' mode
3. [ ] Tests verify dialog receives correct width (500px)
4. [ ] Tests verify successful add shows notification
5. [ ] Tests verify data passed to SmartNgRX add method
6. [ ] Tests verify table refreshes after add

### Technical Requirements

1. [ ] Unit tests created with >80% coverage
2. [ ] Tests follow AAA (Arrange-Act-Assert) pattern
3. [ ] Tests disabled with .skip after RED verification
4. [ ] Mock MatDialog service properly
5. [ ] Mock NotificationService properly
6. [ ] Mock DivDepositsEffectsService add method

## Tasks / Subtasks

- [ ] Create comprehensive unit tests (AC: 1-6)
  - [ ] Test onAddDividend method opens dialog
  - [ ] Test dialog configuration (width, data mode)
  - [ ] Test dialog afterClosed with successful result
  - [ ] Test notification service called on success
  - [ ] Test SmartNgRX add method integration
  - [ ] Test table data refreshes automatically
- [ ] Run tests to verify RED state (AC: 7)
  - [ ] Execute: `pnpm nx test dms-material --testFile=dividend-deposits.component.spec.ts`
  - [ ] Verify all new tests fail
- [ ] Disable tests with .skip for CI (AC: 8)
  - [ ] Wrap test suite in describe.skip
  - [ ] Add comment: "Disabled until implementation in AQ.4"
- [ ] Commit RED tests (AC: 9)
  - [ ] Stage test file
  - [ ] Commit with message: "feat(AQ.3): Add RED unit tests for add dividend dialog"

## Dev Notes

### Testing Standards

**Test File Location:**
`apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.spec.ts`

**Testing Frameworks:**
- Vitest for unit testing
- Mock MatDialog and its return value
- Mock NotificationService
- Test dialog lifecycle (open, afterClosed)

**Test Requirements:**
- Follow AAA pattern (Arrange-Act-Assert)
- Mock dialog reference with afterClosed observable
- Test both success and cancel scenarios
- Verify SmartNgRX effects called correctly
- Achieve >80% code coverage

**Dialog Configuration Expected:**
```typescript
{
  width: '500px',
  data: { mode: 'add' }
}
```

**Services to Mock:**
- `MatDialog` - provides open() method returning DialogRef
- `NotificationService` - provides success() method
- `DivDepositsEffectsService` - provides add() method

**DivDepModal Data Interface:**
```typescript
interface DialogData {
  mode: 'add' | 'edit';
  dividend?: DivDeposit;
}
```

### Relevant Source Tree

**Component Under Test:**
- `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.ts`

**Dependencies:**
- `apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.ts` (already migrated)
- `apps/dms-material/src/app/shared/services/notification.service.ts`
- `apps/dms-material/src/app/store/div-deposits/div-deposits-effect.service.ts`
- `@angular/material/dialog` - MatDialog

**Reference Implementation:**
Look at similar dialog tests in:
- `open-positions.component.spec.ts` for dialog patterns
- Any component that uses MatDialog.open()
- Story AE.7 implementation for DivDepModal expected behavior

### Important Testing Patterns

**Mock Dialog Setup:**
```typescript
const mockDialogRef = {
  afterClosed: vi.fn().mockReturnValue(of(resultData))
};

const mockDialog = {
  open: vi.fn().mockReturnValue(mockDialogRef)
};
```

**Test Dialog Configuration:**
```typescript
it('should open dialog with correct configuration', () => {
  component.onAddDividend();

  expect(mockDialog.open).toHaveBeenCalledWith(
    DivDepModal,
    {
      width: '500px',
      data: { mode: 'add' }
    }
  );
});
```

**Test Success Flow:**
```typescript
it('should show success notification when dialog returns data', async () => {
  const mockData = { symbol: 'AAPL', amount: 100, date: '2024-01-01', type: 'Dividend' };
  mockDialogRef.afterClosed.mockReturnValue(of(mockData));

  component.onAddDividend();

  await new Promise(resolve => setTimeout(resolve, 100));

  expect(mockNotification.success).toHaveBeenCalledWith('Dividend added successfully');
});
```

## Definition of Done

- [ ] Comprehensive unit tests created (>80% coverage)
- [ ] Tests run and fail (RED state verified)
- [ ] Tests disabled with .skip for CI
- [ ] All acceptance criteria have explicit tests
- [ ] Tests follow AAA pattern
- [ ] Dialog and notification mocks properly configured
- [ ] All existing tests still pass
- [ ] Lint passes
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material` (skipped - no implementation changes)
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- Implementation in Story AQ.4
- DivDepModal already exists from AE.7 migration
- Follow TDD RED-GREEN-REFACTOR cycle
- Tests will be re-enabled in AQ.4

## Dependencies

- Story AQ.2 completed (table wired)
- Story AE.7 completed (DivDepModal migrated)
- MatDialog service available
- NotificationService available

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
