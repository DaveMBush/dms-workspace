# Story AT.6: Add Month/Year Selectors Functionality

**Status:** Ready

## Story

**As a** user
**I want** to select different months and years
**So that** I can view my account's historical performance data

## Context

**Current System:**

- AccountSummary component displays current period data
- Tests written in Story AT.5-TDD define expected behavior
- Global summary has working month/year selectors
- Backend supports time-based filtering

**Implementation Approach:**

- Add Material form controls for month and year selection
- Wire selectors to backend API calls
- Update charts when selections change
- Re-enable tests from AT.5-TDD
- Verify all tests pass (GREEN phase)

## Acceptance Criteria

### Functional Requirements

1. [ ] Month dropdown populated from available months API
2. [ ] Year dropdown populated from service years
3. [ ] Month selection updates performance chart data
4. [ ] Year selection updates available months
5. [ ] Default selection shows current month/year
6. [ ] Selectors disabled during data loading
7. [ ] Chart smoothly updates when selection changes

### Technical Requirements

1. [ ] All tests from AT.5-TDD re-enabled and passing
2. [ ] Material form field components properly integrated
3. [ ] Reactive forms with FormControl
4. [ ] Effect hooks for reactive updates
5. [ ] Code follows project coding standards
6. [ ] Unit test coverage >80%

## Tasks / Subtasks

- [ ] Re-enable tests from AT.5-TDD (AC: T1)
- [ ] Add Material form modules to component (AC: T2)
  - [ ] Import MatFormFieldModule
  - [ ] Import MatSelectModule
  - [ ] Import ReactiveFormsModule
- [ ] Add form controls (AC: F1-F5)
  - [ ] Create selectedMonth FormControl
  - [ ] Create selectedYear FormControl
  - [ ] Set default values to current month/year
  - [ ] Disable controls during loading
- [ ] Wire month selector (AC: F1, F3)
  - [ ] Bind to monthOptions from service
  - [ ] Add effect to watch for month changes
  - [ ] Trigger graph data refresh on change
- [ ] Wire year selector (AC: F2, F4)
  - [ ] Bind to yearOptions from service
  - [ ] Add effect to watch for year changes
  - [ ] Trigger available months refresh on change
- [ ] Update component template
  - [ ] Add month select form field
  - [ ] Add year select form field
  - [ ] Style selectors in header area
- [ ] Verify all tests pass (AC: T1)
- [ ] Run validation commands

## Dev Notes

### Testing Standards

- **Test Location:** Frontend tests in `apps/dms-material/src/app/**/*.spec.ts`
- **Testing Framework:** Vitest
- **Coverage:** Must achieve >80% coverage
- **Re-enable Tests:** Change `.skip` to active tests from AT.5-TDD

### Technical Context

- Account summary component: `apps/dms-material/src/app/accounts/account-summary/account-summary.ts`
- Reference: Global summary at `apps/dms-material/src/app/global/global-summary.ts`
- Summary service: `apps/dms-material/src/app/global/services/summary.service.ts`

### Implementation

```typescript
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { effect } from '@angular/core';

// In component:
readonly selectedMonth = new FormControl('2025-03');
readonly selectedYear = new FormControl(2025);

get yearOptions(): number[] {
  return this.summaryService.years();
}

// eslint-disable-next-line @smarttools/no-anonymous-functions
readonly monthOptions = computed(() => this.summaryService.monthOptions());

// Watch for month changes
private readonly monthChangeEffect = effect(() => {
  const month = this.selectedMonth.value;
  if (month && this.accountId) {
    this.summaryService.fetchGraph(month, this.accountId);
  }
});

// Watch for year changes
private readonly yearChangeEffect = effect(() => {
  const year = this.selectedYear.value;
  if (year && this.accountId) {
    this.summaryService.fetchMonths(this.accountId, year);
  }
});

// Enable selectors after initial load
private readonly enableSelectorsEffect = effect(() => {
  if (!this.summaryService.loading()) {
    this.selectedMonth.enable({ emitEvent: false });
    this.selectedYear.enable({ emitEvent: false });
  }
});
```

### Template

```html
<mat-form-field>
  <mat-label>Month</mat-label>
  <mat-select [formControl]="selectedMonth">
    @for (option of monthOptions(); track option.month) {
    <mat-option [value]="option.month"> {{ option.label }} </mat-option>
    }
  </mat-select>
</mat-form-field>

<mat-form-field>
  <mat-label>Year</mat-label>
  <mat-select [formControl]="selectedYear">
    @for (year of yearOptions; track year) {
    <mat-option [value]="year"> {{ year }} </mat-option>
    }
  </mat-select>
</mat-form-field>
```

## Definition of Done

- [ ] All tests from AT.5-TDD re-enabled and passing (GREEN phase)
- [ ] Month and year selectors functional
- [ ] Selectors update chart data appropriately
- [ ] Default values set to current month/year
- [ ] Selectors disabled during loading
- [ ] Code follows project conventions
- [ ] Unit test coverage >80%
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD GREEN phase
- All tests from AT.5-TDD should pass after implementation
- Build incrementally, running tests frequently
- Follow pattern from GlobalSummary component
- Ensure selectors are accessible

## Related Stories

- **Previous:** Story AT.5-TDD (Tests)
- **Next:** Story AT.7 (Unit Tests)
- **Epic:** Epic AT - Wire Up Account/Summary Screen

---

## Change Log

| Date       | Version | Description      | Author |
| ---------- | ------- | ---------------- | ------ |
| 2026-03-02 | 1.0     | Initial creation | PM     |
