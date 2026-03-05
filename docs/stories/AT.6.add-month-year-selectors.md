# Story AT.6: Add Month/Year Selectors Functionality

**Status:** Ready for Review

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

- [x] Re-enable tests from AT.5-TDD (AC: T1)
- [x] Add Material form modules to component (AC: T2)
  - [x] Import MatFormFieldModule
  - [x] Import MatSelectModule
  - [x] Import ReactiveFormsModule
- [x] Add form controls (AC: F1-F5)
  - [x] Create selectedMonth FormControl
  - [x] Create selectedYear FormControl
  - [x] Set default values to current month/year
  - [x] Disable controls during loading
- [x] Wire month selector (AC: F1, F3)
  - [x] Bind to monthOptions from service
  - [x] Add effect to watch for month changes
  - [x] Trigger graph data refresh on change
- [x] Wire year selector (AC: F2, F4)
  - [x] Bind to yearOptions from service
  - [x] Add effect to watch for year changes
  - [x] Trigger available months refresh on change
- [x] Update component template
  - [x] Add month select form field
  - [x] Add year select form field
  - [x] Style selectors in header area
- [x] Verify all tests pass (AC: T1)
- [x] Run validation commands

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

- [x] All tests from AT.5-TDD re-enabled and passing (GREEN phase)
- [x] Month and year selectors functional
- [x] Selectors update chart data appropriately
- [x] Default values set to current month/year
- [x] Selectors disabled during loading
- [x] Code follows project conventions
- [x] Unit test coverage >80%
- [x] All validation commands pass:
  - [x] Run `pnpm all`
  - [x] Run `pnpm e2e:dms-material`
  - [x] Run `pnpm dupcheck`
  - [x] Run `pnpm format`
  - [x] Repeat all of these if any fail until they all pass
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

| Date       | Version | Description                           | Author                |
| ---------- | ------- | ------------------------------------- | --------------------- |
| 2026-03-02 | 1.0     | Initial creation                      | PM                    |
| 2026-03-03 | 1.1     | Implementation complete - GREEN phase | Dev (Claude Opus 4.6) |

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Completion Notes

- Re-enabled 13 AT.5-TDD Month/Year Selector tests (describe.skip -> describe)
- Added MatFormFieldModule, MatSelectModule, MatOptionModule, ReactiveFormsModule imports
- Added selectedYear FormControl with current year default
- Added yearOptions$ computed signal from SummaryService.years()
- Renamed monthOptions/yearOptions to monthOptions$/yearOptions$ ($ suffix for template lint rule)
- Wired month valueChanges to fetchGraph with accountId
- Wired year valueChanges to fetchMonths with year parameter
- Added enableSelectors callback pattern (disable in ngOnInit, enable on fetchSummary complete)
- Updated SummaryService.fetchMonths to accept optional year parameter
- Updated flushPendingRequests test helper to handle /api/summary/years
- Added fetchYears() call in ngOnInit
- Added month/year selector HTML to template
- All 1301 unit tests passing, 422 e2e tests passing, 0 duplicates

### File List

- `apps/dms-material/src/app/accounts/account-summary/account-summary.ts` (modified)
- `apps/dms-material/src/app/accounts/account-summary/account-summary.html` (modified)
- `apps/dms-material/src/app/accounts/account-summary/account-summary.spec.ts` (modified)
- `apps/dms-material/src/app/global/services/summary.service.ts` (modified)
- `docs/stories/AT.6.add-month-year-selectors.md` (modified)
