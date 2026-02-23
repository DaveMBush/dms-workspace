# Story AQ.8: Implementation - Implement Delete Functionality for Dividends

## Status

Ready for Review

## Story

**As a** user
**I want** to delete dividend and deposit transactions
**So that** I can remove incorrect or unwanted records

## Context

**Current System:**

- Story AQ.7 created RED unit tests
- Table displays dividends (AQ.2)
- Add and edit functionality working (AQ.4, AQ.6)
- ConfirmDialogService available

**Problem:**

- No way to delete dividend records
- Delete functionality needs confirmation and SmartNgRX integration

## Acceptance Criteria

### Functional Requirements

1. [ ] Delete action available for each row
2. [ ] Confirmation dialog appears before delete
3. [ ] Delete proceeds only when user confirms
4. [ ] Delete cancelled when user declines
5. [ ] Success notification shown after delete
6. [ ] Table updates immediately after delete
7. [ ] Error notification shown if delete fails

### Technical Requirements

1. [ ] Re-enable tests from AQ.7
2. [ ] All unit tests pass (GREEN)
3. [ ] onDeleteDividend method implemented
4. [ ] Delete action configured in table
5. [ ] ConfirmDialogService integration complete
6. [ ] SmartNgRX delete method called
7. [ ] Error handling implemented
8. [ ] Code coverage >80%

## Tasks / Subtasks

- [x] Re-enable tests from AQ.7 (AC: 1)
  - [x] Remove .skip from describe block
  - [x] Run tests to verify failures
- [x] Implement onDeleteDividend method (AC: 2-5, 7)
  - [x] Accept dividend parameter
  - [x] Call confirmDialog.confirm() with proper config
  - [x] Subscribe to confirmation observable
  - [x] Call divDepositsEffects.delete() on confirm
  - [x] Show success notification after delete
  - [x] Handle errors with error notification
- [x] Configure delete action in table (AC: 1)
  - [x] Add delete action/button to BaseTableComponent
  - [x] Wire to onDeleteDividend method
  - [x] Pass dividend object to handler
- [x] Test delete integration (AC: 6)
  - [x] Verify table updates automatically via SmartNgRX
  - [x] Test cancel behavior
  - [x] Test successful delete
  - [x] Test error scenario
- [x] Run tests until GREEN (AC: 2)
  - [x] Execute: `pnpm nx test dms-material --testFile=dividend-deposits.component.spec.ts`
  - [x] Fix any failing tests
  - [x] Verify coverage >80%
- [x] Run all validation commands (AC: DOD)
  - [x] `pnpm all`
  - [x] `pnpm e2e:dms-material`
  - [x] `pnpm dupcheck`
  - [x] `pnpm format`

## Dev Notes

### Testing Standards

**Test File Location:**
`apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.spec.ts`

**Testing Frameworks:**

- Vitest for unit testing
- All tests from AQ.7 must pass
- Add additional tests if needed for edge cases

### Implementation Details

**Service Injection:**

```typescript
private confirmDialog = inject(ConfirmDialogService);
private divDepositsEffects = inject(divDepositsEffectsServiceToken);
private notification = inject(NotificationService);
```

**onDeleteDividend Method Implementation:**

```typescript
onDeleteDividend(dividend: DivDeposit): void {
  const context = this;
  this.confirmDialog
    .confirm({
      title: 'Delete Dividend',
      message: `Are you sure you want to delete this dividend?`,
      confirmText: 'Delete'
    })
    .subscribe(function onConfirm(confirmed) {
      if (confirmed) {
        // Delete via SmartNgRX
        context.divDepositsEffects
          .delete(dividend.id)
          .subscribe({
            next: function onSuccess() {
              context.notification.success('Dividend deleted');
            },
            error: function onError(err) {
              context.notification.error(`Delete failed: ${err.message}`);
            }
          });
      }
    });
}
```

**Note:** Check existing component code - onDeleteDividend may already exist partially.

**BaseTableComponent Delete Action:**

Configure delete action via:

1. Column definition with action type
2. Action button column
3. Row action menu

Refer to BaseTableComponent documentation or similar usage patterns.

**Template Example (if using actions column):**

```html
<!-- May need to add actions column configuration -->
```

### Relevant Source Tree

**Files to Modify:**

- `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.ts` - Implement onDeleteDividend
- `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.html` - Configure delete action
- `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.spec.ts` - Re-enable tests

**Dependencies:**

- `apps/dms-material/src/app/shared/services/confirm-dialog.service.ts`
- `apps/dms-material/src/app/shared/services/notification.service.ts`
- `apps/dms-material/src/app/store/div-deposits/div-deposits-effect.service.ts`
- `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`

**Reference Implementation:**
Check existing onDeleteDividend in component (may already exist partially) or:

- Similar delete patterns in other components
- BaseTableComponent action configuration
- ConfirmDialogService usage examples

### Important Notes from Previous Stories

- Use function declarations (not arrow functions) in subscriptions
- ConfirmDialogService.confirm() returns Observable<boolean>
- Success notification text: "Dividend deleted"
- Handle both confirm and cancel cases
- DivDepositsEffectsService.delete() returns Observable<void>
- SmartNgRX automatically updates table via signals
- Error handling important for user feedback

## Definition of Done

- [ ] Tests from AQ.7 re-enabled and passing
- [ ] All acceptance criteria implemented
- [ ] Unit tests pass (GREEN)
- [ ] Code coverage >80%
- [ ] No TypeScript errors
- [ ] Lint passes
- [ ] Build succeeds
- [ ] User can delete dividends with confirmation
- [ ] Success notification appears
- [ ] Error notification on failure
- [ ] Table updates automatically
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- Previous story AQ.7 created RED tests
- This story completes TDD GREEN phase for delete
- E2E tests in next story
- Check existing component code - onDeleteDividend may already exist

## Dependencies

- Story AQ.7 completed (RED tests created)
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

None - implementation straightforward using established `pipe(filter, switchMap)` pattern.

### Completion Notes List

- Refactored `onDeleteDividend()` to use `pipe(filter, switchMap)` with `effectsService.delete(dividend.id)`
- Removed `.skip` from AQ.7 `describe` block — all 7 tests now active and GREEN
- 44/44 tests GREEN across all 4 describe blocks

### File List

- `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.ts`
- `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.spec.ts`
- `docs/stories/AQ.8.implement-delete-functionality.md`

## QA Results

_To be populated by QA Agent after implementation_
