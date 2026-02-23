# Story AQ.6: Implementation - Implement Edit Functionality for Dividends

## Status

Draft

## Story

**As a** user
**I want** to edit existing dividend and deposit transactions
**So that** I can correct or update transaction details

## Context

**Current System:**

- Story AQ.5 created RED unit tests
- Table displays dividends (AQ.2)
- Add functionality works (AQ.4)
- DivDepModal supports edit mode (AE.7)

**Problem:**

- No way to edit existing dividend records
- Edit functionality needs to be wired

## Acceptance Criteria

### Functional Requirements

1. [ ] Clicking row in table triggers edit
2. [ ] Dialog opens with 'edit' mode
3. [ ] Dialog pre-populated with existing dividend data
4. [ ] Dialog width is 500px
5. [ ] Successful edit shows success notification
6. [ ] Table updates immediately after edit
7. [ ] Cancel closes dialog without changes

### Technical Requirements

1. [ ] Re-enable tests from AQ.5
2. [ ] All unit tests pass (GREEN)
3. [ ] onEditDividend method implemented
4. [ ] Row click handler configured in template/BaseTableComponent
5. [ ] Complete dividend object passed to dialog
6. [ ] Code coverage >80%

## Tasks / Subtasks

- [ ] Re-enable tests from AQ.5 (AC: 1)
  - [ ] Remove .skip from describe block
  - [ ] Run tests to verify failures
- [ ] Implement onEditDividend method (AC: 2-5)
  - [ ] Accept dividend parameter
  - [ ] Open MatDialog with DivDepModal
  - [ ] Pass width: '500px'
  - [ ] Pass data: { mode: 'edit', dividend }
  - [ ] Subscribe to afterClosed()
  - [ ] Show success notification on result
- [ ] Configure row action in template/table (AC: 1)
  - [ ] Add row click handler to BaseTableComponent
  - [ ] Wire to onEditDividend method
  - [ ] Pass dividend object to handler
- [ ] Test edit integration (AC: 6, 7)
  - [ ] Verify table updates automatically via SmartNgRX
  - [ ] Test cancel behavior
  - [ ] Test successful update
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
- All tests from AQ.5 must pass
- Add additional tests if needed for edge cases

### Implementation Details

**onEditDividend Method Implementation:**
```typescript
onEditDividend(dividend: DivDeposit): void {
  const context = this;
  const dialogRef = this.dialog.open(DivDepModal, {
    width: '500px',
    data: { mode: 'edit', dividend }
  });

  dialogRef.afterClosed().subscribe(function onClose(result: unknown) {
    if (result !== null && result !== undefined) {
      context.notification.success('Dividend updated successfully');
    }
  });
}
```

**BaseTableComponent Row Action Configuration:**

Check if BaseTableComponent supports row click via:
1. `(rowClick)` output binding
2. Configuration in column definitions
3. Action button column

Refer to BaseTableComponent documentation or similar usage.

**Template Example (if using rowClick):**
```html
<dms-base-table
  [data]="dividends()"
  [columns]="columns"
  (rowClick)="onEditDividend($event)">
</dms-base-table>
```

**Note on SmartNgRX:**
- DivDepModal already handles SmartNgRX update() call internally
- Table automatically refreshes via SmartNgRX signals
- No manual refresh needed in component

### Relevant Source Tree

**Files to Modify:**
- `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.ts` - Implement onEditDividend
- `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.html` - Configure row action
- `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.spec.ts` - Re-enable tests

**Dependencies:**
- `apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.ts` (already exists)
- `apps/dms-material/src/app/shared/services/notification.service.ts`
- `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`

**Reference Implementation:**
Check existing onEditDividend in component (may already exist partially) or:
- Similar edit patterns in other components
- BaseTableComponent usage examples
- Row action handler patterns

### Important Notes from Previous Stories

- Use function declarations (not arrow functions) in subscriptions
- DivDepModal handles both add and edit modes (from AE.7)
- Success notification text: "Dividend updated successfully"
- Handle both result !== null AND result !== undefined
- Pass complete dividend object to dialog
- SmartNgRX automatically updates table

## Definition of Done

- [ ] Tests from AQ.5 re-enabled and passing
- [ ] All acceptance criteria implemented
- [ ] Unit tests pass (GREEN)
- [ ] Code coverage >80%
- [ ] No TypeScript errors
- [ ] Lint passes
- [ ] Build succeeds
- [ ] User can edit dividends via row click
- [ ] Success notification appears
- [ ] Table updates automatically
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- Previous story AQ.5 created RED tests
- This story completes TDD GREEN phase for edit
- Delete functionality in next stories
- Check existing component code - onEditDividend may already exist

## Dependencies

- Story AQ.5 completed (RED tests created)
- Story AE.7 completed (DivDepModal supports edit)
- BaseTableComponent available
- MatDialog and NotificationService available

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
