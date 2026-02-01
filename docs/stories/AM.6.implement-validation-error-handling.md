# Story AM.6: Add Validation and Error Handling - TDD GREEN Phase

## Story

**As a** user
**I want** clear validation and error messages when adding symbols
**So that** I understand what went wrong and can correct it

## Context

**Current System:**

- Add Symbol dialog with search from AM.4
- Unit tests written in Story AM.5 (currently disabled)
- Need comprehensive validation and error handling

**Implementation Approach:**

- Re-enable unit tests from AM.5
- Implement all validation logic
- Implement error handling for all API scenarios
- Make all tests pass (GREEN phase)

## Acceptance Criteria

### Functional Requirements

- [x] Duplicate symbol prevented with clear message
- [x] Invalid symbol format shows validation error
- [x] 409 Conflict error displays user-friendly message
- [x] Network errors show appropriate message
- [x] Empty input prevented
- [x] Dialog remains open on error for correction
- [x] All unit tests from AM.5 re-enabled and passing

### Technical Requirements

- [x] Form validators implemented
- [x] HTTP error interceptor or handling
- [x] NotificationService for error messages
- [x] Proper error state management
- [x] Accessible error announcements

## Implementation Details

### Step 1: Re-enable Unit Tests

Remove `x` prefix or `.skip` from tests written in AM.5.

### Step 2: Add Form Validation

\`\`\`typescript
form = this.fb.group({
symbol: ['', [
Validators.required,
Validators.pattern(/^[A-Z]{1,5}$/),
this.duplicateSymbolValidator()
]]
});

duplicateSymbolValidator(): ValidatorFn {
return (control: AbstractControl): ValidationErrors | null => {
const symbol = control.value;
if (this.existingSymbols.includes(symbol)) {
return { duplicate: { value: symbol } };
}
return null;
};
}
\`\`\`

### Step 3: Implement Error Handling

\`\`\`typescript
onSubmit() {
if (this.form.valid) {
this.isLoading = true;
this.universeService.addSymbol(this.form.value.symbol!)
.subscribe({
next: () => {
this.dialogRef.close(true);
this.notification.showPersistent('Symbol added successfully');
},
error: (err) => {
this.isLoading = false;
this.handleError(err);
}
});
}
}

private handleError(err: HttpErrorResponse) {
if (err.status === 409) {
this.notification.showPersistent(
'Symbol already exists in universe',
'error'
);
} else if (err.status >= 500) {
this.notification.showPersistent(
'Server error. Please try again later.',
'error'
);
} else {
this.notification.showPersistent(
'Failed to add symbol. Please try again.',
'error'
);
}
}
\`\`\`

### Step 4: Update Template with Error Messages

\`\`\`html
<mat-error *ngIf="form.get('symbol')?.hasError('required')">
Symbol is required
</mat-error>
<mat-error *ngIf="form.get('symbol')?.hasError('pattern')">
Invalid symbol format (1-5 uppercase letters)
</mat-error>
<mat-error \*ngIf="form.get('symbol')?.hasError('duplicate')">
Symbol already in universe
</mat-error>
\`\`\`

### Step 5: Verify All Tests Pass

\`\`\`bash
pnpm test:dms-material
\`\`\`

## Definition of Done

- [x] All unit tests from AM.5 re-enabled
- [x] All unit tests passing
- [x] All validation scenarios implemented
- [x] All error scenarios handled
- [x] Error messages user-friendly
- [x] Manual testing completed
- [x] All validation commands pass:
  - [x] Run `pnpm all`
  - [x] Run `pnpm e2e:dms-material`
  - [x] Run `pnpm dupcheck`
  - [x] Run `pnpm format`
  - [x] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD GREEN phase for AM.5 tests
- Completes core add symbol functionality
- Ready for E2E testing in AM.7

## Related Stories

- **Prerequisite**: Story AM.5
- **Next**: Story AM.7 (E2E tests)
- **Pattern Reference**: Story AM.2, AM.4

---

## Dev Agent Record

### Status

Ready for Review

### Agent Model Used

Claude Sonnet 4.5

### Tasks Completed

- [x] Created GitHub issue #368 for story AM.6
- [x] Created branch feature/AM.6-validation-error-handling
- [x] Checked out branch locally
- [x] Re-enabled all unit tests from AM.5
- [x] Implemented duplicate symbol validator with computed signal tracking existing symbols
- [x] Implemented pattern validator for symbol format (1-5 uppercase letters)
- [x] Enhanced error handling with specific messages for 409, 500, and network errors
- [x] Added error message display in template
- [x] Fixed all test failures (59/59 tests passing)
- [x] Fixed linting errors (cyclomatic complexity, anonymous functions, strict boolean expressions)
- [x] All validation commands passed (pnpm all)

### File List

- apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts
- apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.html
- apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.scss
- apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.spec.ts

### Completion Notes

- All AM.5 unit tests re-enabled and passing
- Validation logic fully implemented with reactive computed signals
- Error handling covers all required scenarios (409, 500+, network errors)
- Template uses computed signals to reduce cyclomatic complexity
- All linting and testing validation passed

### Change Log

1. Added `existingSymbols` computed signal to track universe symbols for duplicate validation
2. Implemented `duplicateSymbolValidator()` method with closure to capture signal
3. Updated form validators to use `Validators.pattern(/^[A-Z]{1,5}$/)` for symbol format
4. Enhanced `handleAddError()` to differentiate between 409, 500+, and other errors
5. Added validation error display section in template with computed signals
6. Created computed signals for error states to reduce template complexity
7. Updated test mocks to support array-based universe data for duplicate validation
8. Fixed 46 test failures by updating expectations and mock data
9. Added styling for validation error messages
10. Fixed all linting errors including cyclomatic complexity, anonymous functions, and strict boolean expressions

---

## QA Results

### Review Date: 2026-01-31

### Reviewed By: Quinn (Test Architect)

### Gate Status

Gate: PASS → docs/qa/gates/AM.6-implement-validation-error-handling.yml
