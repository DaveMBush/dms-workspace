# Story AQ.4: Implementation - Wire Add Dividend Dialog

## Status

Draft

## Story

**As a** user
**I want** to add new dividend and deposit transactions
**So that** I can record my account's income

## Context

**Current System:**

- Story AQ.3 created RED unit tests
- DivDepModal component exists (migrated in AE.7)
- Table displays dividends (AQ.2)
- Add button may exist but needs proper wiring

**Problem:**

- Dialog not properly wired to component
- Add functionality needs SmartNgRX integration

## Acceptance Criteria

### Functional Requirements

1. [ ] Add button (FAB) visible on dividend deposits screen
2. [ ] Clicking add button opens dialog
3. [ ] Dialog opens with 'add' mode
4. [ ] Dialog width is 500px
5. [ ] Successful add shows success notification
6. [ ] New dividend appears in table immediately
7. [ ] Cancel closes dialog without adding

### Technical Requirements

1. [ ] Re-enable tests from AQ.3
2. [ ] All unit tests pass (GREEN)
3. [ ] onAddDividend method implemented
4. [ ] MatDialog injected and used
5. [ ] NotificationService injected and used
6. [ ] Dialog result handled properly
7. [ ] Code coverage >80%

## Tasks / Subtasks

- [ ] Re-enable tests from AQ.3 (AC: 1)
  - [ ] Remove .skip from describe block
  - [ ] Run tests to verify failures
- [ ] Verify/add FAB button in template (AC: 1)
  - [ ] Check if button exists in HTML
  - [ ] Add button if missing with mat-icon-button
  - [ ] Wire to onAddDividend() method
- [ ] Implement onAddDividend method (AC: 2-5)
  - [ ] Open MatDialog with DivDepModal
  - [ ] Pass width: '500px'
  - [ ] Pass data: { mode: 'add' }
  - [ ] Subscribe to afterClosed()
  - [ ] Show success notification on result
- [ ] Test dialog integration (AC: 6, 7)
  - [ ] Verify table updates automatically via SmartNgRX
  - [ ] Test cancel behavior (no notification)
  - [ ] Test success behavior (notification shown)
- [ ] Run tests until GREEN (AC: 2)
  - [ ] Execute: `pnpm nx test dms-material --testFile=dividend-deposits.component.spec.ts`
  - [ ] Fix any failing tests
  - [ ] Verify coverage >80%
- [ ] Run all validation commands (AC: DOD)
  - [ ] `pnpm all`
  - [ ] `pnpm e2e:dms-material`
  - [ ] `pnpm dupcheck`
  - [ ] `pnpm format`

## Dev Notes

### Testing Standards

**Test File Location:**
`apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.spec.ts`

**Testing Frameworks:**
- Vitest for unit testing
- All tests from AQ.3 must pass
- Add additional tests if needed for edge cases

### Implementation Details

**Service Injection:**
```typescript
private dialog = inject(MatDialog);
private notification = inject(NotificationService);
```

**onAddDividend Method Implementation:**
```typescript
onAddDividend(): void {
  const context = this;
  const dialogRef = this.dialog.open(DivDepModal, {
    width: '500px',
    data: { mode: 'add' }
  });

  dialogRef.afterClosed().subscribe(function onClose(result: unknown) {
    if (result !== null && result !== undefined) {
      context.notification.success('Dividend added successfully');
    }
  });
}
```

**Template Button (if needed):**
```html
<button
  mat-icon-button
  (click)="onAddDividend()"
  aria-label="Add dividend or deposit">
  <mat-icon>add</mat-icon>
</button>
```

**Note on SmartNgRX:**
- DivDepModal already handles SmartNgRX add() call internally
- Table automatically refreshes via SmartNgRX signals
- No manual refresh needed in component

### Relevant Source Tree

**Files to Modify:**
- `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.ts` - Implement onAddDividend
- `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.html` - Verify/add button
- `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.spec.ts` - Re-enable tests

**Dependencies:**
- `apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.ts` (already exists)
- `apps/dms-material/src/app/shared/services/notification.service.ts`
- `@angular/material/dialog` - MatDialog

**Reference Implementation:**
Look at existing onAddDividend in component (may already exist) or similar patterns:
- Any component using MatDialog.open()
- Notification service usage patterns
- Dialog afterClosed subscription patterns

### Important Notes from Previous Stories

- Use function declarations (not arrow functions) in subscriptions for context binding
- DivDepModal was migrated in Story AE.7 and is ready to use
- Success notification text: "Dividend added successfully"
- Handle both result !== null AND result !== undefined
- SmartNgRX automatically updates table via signals

## Definition of Done

- [ ] Tests from AQ.3 re-enabled and passing
- [ ] All acceptance criteria implemented
- [ ] Unit tests pass (GREEN)
- [ ] Code coverage >80%
- [ ] No TypeScript errors
- [ ] Lint passes
- [ ] Build succeeds
- [ ] User can add dividends via dialog
- [ ] Success notification appears
- [ ] Table updates automatically
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- Previous story AQ.3 created RED tests
- This story completes TDD GREEN phase for add dialog
- Dialog component already exists (AE.7)
- Edit and delete in subsequent stories

## Dependencies

- Story AQ.3 completed (RED tests created)
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
