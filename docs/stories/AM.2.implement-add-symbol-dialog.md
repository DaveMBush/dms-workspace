# Story AM.2: Wire Add Symbol Dialog to Universe Service - TDD GREEN Phase

## Story

**As a** user
**I want** to add new symbols to my universe tracking list
**So that** I can manually expand my portfolio coverage

## Context

**Current System:**

- Global/Universe screen displays existing symbols
- Add Symbol button exists in UI
- Unit tests written in Story AM.1 (currently disabled)

**Implementation Approach:**

- Re-enable unit tests from AM.1
- Implement AddSymbolDialogComponent with form
- Wire dialog to UniverseService.addSymbol()
- Connect to backend API
- Make all tests pass (GREEN phase)

## Acceptance Criteria

### Functional Requirements

- [ ] Add Symbol button opens dialog
- [ ] Dialog contains symbol input field
- [ ] Symbol field validates format (uppercase, valid ticker)
- [ ] Submit button calls UniverseService.addSymbol()
- [ ] Success adds symbol to table and closes dialog
- [ ] Error displays appropriate message
- [ ] Cancel button closes dialog without action
- [ ] All unit tests from AM.1 re-enabled and passing

### Technical Requirements

- [ ] Dialog uses Material Dialog
- [ ] Form uses Reactive Forms with validation
- [ ] Service calls POST /api/universe
- [ ] Proper error handling and user feedback
- [ ] Loading state during API call

## Implementation Details

### Step 1: Re-enable Unit Tests

Remove `x` prefix or `.skip` from tests written in AM.1:

\`\`\`typescript
it('should create dialog with correct configuration', () => {
// test code
});
\`\`\`

### Step 2: Create/Update AddSymbolDialogComponent

\`\`\`typescript
@Component({
selector: 'app-add-symbol-dialog',
template: \`

<h2 mat-dialog-title>Add Symbol</h2>
<mat-dialog-content>
<form [formGroup]="form">
<mat-form-field>
<mat-label>Symbol</mat-label>
<input matInput formControlName="symbol" />
<mat-error \*ngIf="form.get('symbol')?.hasError('required')">
Symbol is required
</mat-error>
</mat-form-field>
</form>
</mat-dialog-content>
<mat-dialog-actions>
<button mat-button (click)="onCancel()">Cancel</button>
<button mat-raised-button color="primary"
[disabled]="form.invalid || isLoading"
(click)="onSubmit()">
Add
</button>
</mat-dialog-actions>
\`
})
export class AddSymbolDialogComponent {
form = this.fb.group({
symbol: ['', [Validators.required, Validators.pattern(/^[A-Z]+$/)]]
});
isLoading = false;

constructor(
private fb: FormBuilder,
private dialogRef: MatDialogRef<AddSymbolDialogComponent>,
private universeService: UniverseService
) {}

onSubmit() {
if (this.form.valid) {
this.isLoading = true;
this.universeService.addSymbol(this.form.value.symbol!)
.subscribe({
next: () => this.dialogRef.close(true),
error: (err) => {
this.isLoading = false;
// Handle error
}
});
}
}

onCancel() {
this.dialogRef.close(false);
}
}
\`\`\`

### Step 3: Implement UniverseService.addSymbol()

\`\`\`typescript
addSymbol(symbol: string): Observable<UniverseEntry> {
return this.http.post<UniverseEntry>('/api/universe', { symbol });
}
\`\`\`

### Step 4: Wire Button to Open Dialog

In GlobalUniverseComponent:

\`\`\`typescript
openAddSymbolDialog() {
this.dialog.open(AddSymbolDialogComponent, {
width: '400px'
}).afterClosed().subscribe(result => {
if (result) {
// Refresh table or handle success
this.notification.showPersistent('Symbol added successfully');
}
});
}
\`\`\`

### Step 5: Verify All Tests Pass

\`\`\`bash
pnpm test:dms-material
\`\`\`

## Definition of Done

- [ ] All unit tests from AM.1 re-enabled
- [ ] All unit tests passing
- [ ] Add symbol dialog functional
- [ ] Symbol validation working
- [ ] API integration complete
- [ ] Error handling implemented
- [ ] Manual testing completed
- [ ] All validation commands pass:
  - [ ] Run \`pnpm all\`
  - [ ] Run \`pnpm e2e:dms-material\`
  - [ ] Run \`pnpm dupcheck\`
  - [ ] Run \`pnpm format\`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD GREEN phase for AM.1 tests
- Makes the RED unit tests turn GREEN
- Backend API endpoint must exist or be created

## Related Stories

- **Prerequisite**: Story AM.1
- **Next**: Story AM.3 (TDD for search/autocomplete)
- **Pattern Reference**: Story AK.4, AL.2
