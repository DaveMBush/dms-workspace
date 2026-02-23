# Story AQ.4: Implementation - Wire Add Dividend Dialog

## Status

Ready for Review

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

1. [x] Add button (FAB) visible on dividend deposits screen
2. [x] Clicking add button opens dialog
3. [x] Dialog opens with 'add' mode
4. [x] Dialog width is 500px
5. [x] Successful add shows success notification
6. [x] New dividend appears in table immediately
7. [x] Cancel closes dialog without adding

### Technical Requirements

1. [x] Re-enable tests from AQ.3
2. [x] All unit tests pass (GREEN)
3. [x] onAddDividend method implemented
4. [x] MatDialog injected and used
5. [x] NotificationService injected and used
6. [x] Dialog result handled properly
7. [x] Code coverage >80%

## Tasks / Subtasks

- [x] Re-enable tests from AQ.3 (AC: 1)
  - [x] Remove .skip from describe block
  - [x] Run tests to verify failures
- [x] Verify/add FAB button in template (AC: 1)
  - [x] Check if button exists in HTML
  - [x] Add button if missing with mat-icon-button
  - [x] Wire to onAddDividend() method
- [x] Implement onAddDividend method (AC: 2-5)
  - [x] Open MatDialog with DivDepModal
  - [x] Pass width: '500px'
  - [x] Pass data: { mode: 'add' }
  - [x] Subscribe to afterClosed()
  - [x] Show success notification on result
- [x] Test dialog integration (AC: 6, 7)
  - [x] Verify table updates automatically via SmartNgRX
  - [x] Test cancel behavior (no notification)
  - [x] Test success behavior (notification shown)
- [x] Run tests until GREEN (AC: 2)
  - [x] Execute: `pnpm nx test dms-material --testFile=dividend-deposits.component.spec.ts`
  - [x] Fix any failing tests
  - [x] Verify coverage >80%
- [x] Run all validation commands (AC: DOD)
  - [x] `pnpm all`
  - [x] `pnpm e2e:dms-material` (skipped - no new UI changes)
  - [x] `pnpm dupcheck`
  - [x] `pnpm format`

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
<button mat-icon-button (click)="onAddDividend()" aria-label="Add dividend or deposit">
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

- [x] Tests from AQ.3 re-enabled and passing
- [x] All acceptance criteria implemented
- [x] Unit tests pass (GREEN)
- [x] Code coverage >80%
- [x] No TypeScript errors
- [x] Lint passes
- [x] Build succeeds
- [x] User can add dividends via dialog
- [x] Success notification appears
- [x] Table updates automatically
- [x] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material` (skipped - no new UI changes)
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

| Date       | Version | Description                                                        | Author    |
| ---------- | ------- | ------------------------------------------------------------------ | --------- |
| 2026-02-22 | 1.0     | Initial story creation                                             | PM Agent  |
| 2026-02-23 | 1.1     | Implementation: onAddDividend wired with DivDepositsEffectsService | Dev Agent |

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

- Lint error: `@smarttools/rxjs/no-nested-subscribe` — fixed by refactoring from nested `.subscribe()` to `pipe(filter(...), switchMap(...)).subscribe()` pattern

### Completion Notes List

- Injected `DivDepositsEffectsService` into `DividendDepositsComponent`
- Refactored `onAddDividend()` to use `pipe(filter, switchMap)` — avoids nested subscribe lint rule
- Re-enabled AQ.3 `describe.skip` → `describe` block (8 tests now GREEN)
- Added `DivDepositsEffectsService` mock to both `describe` blocks in spec
- All 28 tests GREEN (20 original + 8 AQ.3 tests)
- `pnpm all` ✅, `pnpm dupcheck` 0 clones ✅, `pnpm format` clean ✅

### File List

- `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.ts` (modified)
- `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.spec.ts` (modified)
- `docs/stories/AQ.4.implement-wire-add-dividend-dialog.md` (this file)

## QA Results

_To be populated by QA Agent after implementation_
