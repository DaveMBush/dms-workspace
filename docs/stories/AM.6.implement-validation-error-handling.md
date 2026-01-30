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

- [ ] Duplicate symbol prevented with clear message
- [ ] Invalid symbol format shows validation error
- [ ] 409 Conflict error displays user-friendly message
- [ ] Network errors show appropriate message
- [ ] Empty input prevented
- [ ] Dialog remains open on error for correction
- [ ] All unit tests from AM.5 re-enabled and passing

### Technical Requirements

- [ ] Form validators implemented
- [ ] HTTP error interceptor or handling
- [ ] NotificationService for error messages
- [ ] Proper error state management
- [ ] Accessible error announcements

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
<mat-error *ngIf="form.get('symbol')?.hasError('duplicate')">
  Symbol already in universe
</mat-error>
\`\`\`

### Step 5: Verify All Tests Pass

\`\`\`bash
pnpm test:dms-material
\`\`\`

## Definition of Done

- [ ] All unit tests from AM.5 re-enabled
- [ ] All unit tests passing
- [ ] All validation scenarios implemented
- [ ] All error scenarios handled
- [ ] Error messages user-friendly
- [ ] Manual testing completed
- [ ] All validation commands pass:
  - [ ] Run \`pnpm all\`
  - [ ] Run \`pnpm e2e:dms-material\`
  - [ ] Run \`pnpm dupcheck\`
  - [ ] Run \`pnpm format\`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD GREEN phase for AM.5 tests
- Completes core add symbol functionality
- Ready for E2E testing in AM.7

## Related Stories

- **Prerequisite**: Story AM.5
- **Next**: Story AM.7 (E2E tests)
- **Pattern Reference**: Story AM.2, AM.4
