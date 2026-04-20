# Story 78.2: Fix Dist/Year Validation for Weekly Frequency

Status: Approved

## Story

As Dave,
I want the Dist/Year field to accept the value `52` when the symbol's distribution frequency is weekly and to continue rejecting values above `12` for all other frequencies,
so that I can correctly record 52 distributions per year for weekly symbols.

## Acceptance Criteria

1. **Given** the symbol edit form is open for a weekly-frequency symbol,
   **When** Dave enters `52` in the Dist/Year field,
   **Then** no validation error is displayed and the form is submittable.

2. **Given** the form is submitted with Dist/Year = 52 for a weekly symbol,
   **When** the backend processes the save,
   **Then** the value `52` is persisted and the symbol detail shows `52` in Dist/Year.

3. **Given** the symbol edit form is open for a monthly-frequency symbol,
   **When** Dave enters `52` in the Dist/Year field,
   **Then** the "Value must be at most 12" error still appears.

4. **Given** the fix is applied,
   **When** the Story 78.1 E2E test runs,
   **Then** the previously failing test now passes.

5. **Given** `pnpm all` runs after the fix,
   **Then** all tests pass.

## Tasks / Subtasks

- [ ] Read Story 78.1 Dev Agent Record and locate the edit form component (AC: #1)
  - [ ] Open `_bmad-output/implementation-artifacts/78-1-failing-e2e-distperyear-weekly.md`
  - [ ] Read the Completion Notes for the exact component file path and field selector
  - [ ] Navigate to the component in `apps/dms-material/src/`

- [ ] Locate the Validators.max(12) call (AC: #1, #3)
  - [ ] Search for `Validators.max(12)` or `max: 12` or `"Value must be at most 12"` in the
        component TypeScript and template files
  - [ ] Identify whether the validator is on a `FormControl`, a reactive form `FormGroup`, or a
        template-driven form attribute
  - [ ] Identify where the `frequency` value is available in the same component or form group

- [ ] Use Playwright MCP server to visually verify the current bug (AC: #1)
  - [ ] Launch the app in the browser using Playwright MCP
  - [ ] Navigate to the symbol edit form for a weekly symbol
  - [ ] Enter `52` in Dist/Year and confirm "Value must be at most 12" error is displayed
  - [ ] Screenshot the failure for Dev Agent Record reference

- [ ] Implement frequency-aware max validator (AC: #1, #3)
  - [ ] Replace the static `Validators.max(12)` with a dynamic validator that reads the
        `frequency` signal/control value:
    ```typescript
    function distPerYearMaxValidator(frequencyControl: AbstractControl): ValidatorFn {
      return (control: AbstractControl): ValidationErrors | null => {
        const frequency = frequencyControl.value as string;
        const max = frequency?.toLowerCase() === 'weekly' ? 52 : 12;
        return control.value > max
          ? { max: { max, actual: control.value } }
          : null;
      };
    }
    ```
  - [ ] Wire the new validator: set it on the `distPerYear` FormControl using `setValidators()`
        or by constructing the form with the dynamic validator
  - [ ] When the `frequency` control value changes, call `distPerYearControl.updateValueAndValidity()`
        to re-evaluate the validator
  - [ ] Follow Angular 21 conventions: use signals if the component is signal-based; use
        `valueChanges` observable with a named subscriber function if it is reactive-forms-based

- [ ] Verify the "at most 12" error still shows for monthly symbols (AC: #3)
  - [ ] Use Playwright MCP server to open the edit form for a monthly-frequency symbol
  - [ ] Enter `52` and confirm "Value must be at most 12" still appears
  - [ ] Screenshot confirmation for Dev Agent Record

- [ ] Run Story 78.1 E2E tests to confirm they now pass (AC: #4)
  - [ ] Run: `pnpm e2e:dms-material:chromium --grep "dist per year weekly\|distPerYear"`
  - [ ] Confirm both AC#1 and AC#2 tests from Story 78.1 now pass
  - [ ] Run: `pnpm e2e:dms-material:firefox --grep "dist per year weekly\|distPerYear"`
  - [ ] Confirm tests also pass on Firefox
  - [ ] Record results in Dev Agent Record

- [ ] Write unit tests for the new validator logic (AC: #1, #3)
  - [ ] Add unit tests in the component's `.spec.ts` file
  - [ ] Test: weekly frequency + value 52 → no error
  - [ ] Test: weekly frequency + value 53 → max error
  - [ ] Test: monthly frequency + value 12 → no error
  - [ ] Test: monthly frequency + value 13 → max error
  - [ ] Test: frequency changes from weekly to monthly → validator re-evaluates

- [ ] Run `pnpm all` (AC: #5)
  - [ ] Confirm all unit tests pass
  - [ ] Confirm all Chromium and Firefox E2E tests pass
  - [ ] Record outcome in Dev Agent Record

## Dev Notes

### Root Cause

The Dist/Year field uses `Validators.max(12)` unconditionally. The correct maximum depends on
the symbol's distribution frequency:
- **Weekly** → max 52 (52 weeks per year)
- **Monthly** → max 12 (12 months per year)
- **Quarterly** → max 4 (or leave as 12 — confirm with Dave if needed)
- **All others** → max 12

The backend already stores `distPerYear = 52` correctly for weekly symbols. The bug is
**frontend-only**.

---

### Finding the Validation Code

```bash
grep -r "Validators.max\|max: 12\|Value must be at most" apps/dms-material/src/
```

Also check template-driven validation attributes:
```bash
grep -r "max=\"12\"\|[max]=\"12\"" apps/dms-material/src/ --include="*.html"
```

---

### Frequency-Aware Validator — Reactive Forms Pattern

If the edit form is a `FormGroup` with both `frequency` and `distPerYear` controls:

```typescript
// In the component class
private buildForm(): void {
  this.editForm = this.fb.group({
    frequency: [this.symbol().frequency],
    distPerYear: [
      this.symbol().distPerYear,
      [Validators.required, Validators.min(1)],
      // Note: dynamic max validator added separately
    ],
    // ... other fields
  });

  this.setDistPerYearMaxValidator();

  // Re-run when frequency changes
  this.editForm.get('frequency')!.valueChanges
    .subscribe(this.onFrequencyChange.bind(this));
}

private setDistPerYearMaxValidator(): void {
  const frequencyControl = this.editForm.get('frequency')!;
  const distControl = this.editForm.get('distPerYear')!;
  const max = this.getMaxDistPerYear(frequencyControl.value as string);
  distControl.setValidators([Validators.required, Validators.min(1), Validators.max(max)]);
  distControl.updateValueAndValidity({ emitEvent: false });
}

private onFrequencyChange(_value: string): void {
  this.setDistPerYearMaxValidator();
}

private getMaxDistPerYear(frequency: string): number {
  return frequency?.toLowerCase() === 'weekly' ? 52 : 12;
}
```

> **Angular 21 conventions:**
> - Named function for the `valueChanges` subscriber: `this.onFrequencyChange.bind(this)` — not an anonymous arrow function
> - No constructor injection — use `inject()` for `FormBuilder` if needed
> - If the component uses signals for state, read the frequency from the signal instead of the form control

---

### Frequency-Aware Validator — Signal-Based Pattern

If the component uses `@smarttools/smart-signals` or Angular signals for form state:

```typescript
// In the component class (standalone, OnPush, inject() pattern)
protected readonly frequency = signal<string>('');
protected readonly distPerYearMax = computed(() =>
  this.frequency().toLowerCase() === 'weekly' ? 52 : 12
);

// In template:
// <input [attr.max]="distPerYearMax()" ...>
// Or wire into FormControl validators via effect():
private readonly validatorEffect = effect(() => {
  const max = this.distPerYearMax();
  const control = this.editForm?.get('distPerYear');
  if (control) {
    control.setValidators([Validators.required, Validators.min(1), Validators.max(max)]);
    control.updateValueAndValidity({ emitEvent: false });
  }
});
```

---

### Confirming Weekly Frequency String Value

Before writing the fix, confirm the exact string used for weekly frequency in the database and
form. Check:

```bash
grep -r "weekly\|Weekly\|WEEKLY" apps/dms-material/src/ --include="*.ts"
grep -r "weekly\|Weekly\|WEEKLY" prisma/schema.prisma
```

Common values: `"Weekly"`, `"weekly"`, `"W"`, `"WEEKLY"`. Use a case-insensitive comparison in
the validator to be safe: `frequency?.toLowerCase() === 'weekly'`.

---

### Playwright MCP Verification

Use the Playwright MCP server to:
1. Open the app in a real browser
2. Navigate to the Universe screen
3. Find a weekly symbol (or use the seeded test symbol from Story 78.1)
4. Open the edit form
5. Clear Dist/Year, type `52`, blur the field
6. **Before fix**: confirm the error is visible
7. **After fix**: confirm the error is NOT visible and the form is submittable

This visual verification is required — do not skip it.

---

### Key Commands

| Purpose | Command |
|---------|---------|
| Search for Validators.max | `grep -r "Validators.max\|max: 12" apps/dms-material/src/` |
| Search for validation message | `grep -r "Value must be at most" apps/dms-material/src/` |
| Run Story 78.1 tests only (Chromium) | `pnpm e2e:dms-material:chromium --grep "distPerYear\|dist per year"` |
| Run Story 78.1 tests only (Firefox) | `pnpm e2e:dms-material:firefox --grep "distPerYear\|dist per year"` |
| Run all unit tests | `pnpm test` |
| Run all tests | `pnpm all` |

### Key Files

| File | Purpose |
|------|---------|
| `apps/dms-material/src/` | Symbol edit form component — find via grep for `distPerYear` |
| `apps/dms-material-e2e/src/dist-per-year-weekly.spec.ts` | Story 78.1 failing E2E tests — must pass after this fix |
| `prisma/schema.prisma` | Confirm `frequency` field name and weekly value |
| `apps/dms-material/src/environments/` | Check if frequency enum/constants are defined here |

## Dev Agent Record

### Agent Model Used

_TBD_

### Debug Log References

### Completion Notes List

### File List
