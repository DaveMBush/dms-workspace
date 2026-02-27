# Story AS.6: Add Month/Year Selector Functionality

**Status:** Approved

## Story

**As a** user
**I want** to select different months to view historical summary data
**So that** I can track my portfolio performance over time

## Context

**Current System:**

- Month selector UI exists with FormControl
- Tests written in Story AS.5-TDD define expected behavior
- Backend provides `/api/summary/months` and `/api/summary?month=YYYY-MM` endpoints
- Need to wire selector to backend and handle month changes
- A similar component is implemented in #file:./apps/dms/src/app/global/*.* using primeng instead of angular material


**Implementation Approach:**

- Implement month fetching from backend
- Connect month selector to data refresh
- Re-enable tests from AS.5-TDD
- Verify all tests pass (GREEN phase)

## Acceptance Criteria

### Functional Requirements

1. [ ] Component fetches available months on init
2. [ ] Month selector populated with available months
3. [ ] Default month set to current/most recent
4. [ ] Changing month refreshes summary data
5. [ ] Month parameter included in summary API calls
6. [ ] Selected month persisted across data refreshes

### Technical Requirements

1. [ ] All tests from AS.5-TDD re-enabled and passing
2. [ ] `getAvailableMonths()` method added to SummaryService
3. [ ] Month selection triggers data refresh reactively
4. [ ] Loading state disables selector during fetch
5. [ ] Code follows project coding standards
6. [ ] Unit test coverage >80%

## Tasks / Subtasks

- [ ] Re-enable tests from AS.5-TDD (AC: 1)
- [ ] Update SummaryService (AC: 2)
  - [ ] Add `getAvailableMonths()` method
  - [ ] Add month parameter to `getSummary()` method
  - [ ] Implement caching for months (60 seconds)
- [ ] Update GlobalSummary component (AC: 1-6)
  - [ ] Add `isLoadingMonths` signal
  - [ ] Add `hasMonthsError` signal
  - [ ] Add `availableMonths$` signal
  - [ ] Fetch months in `ngOnInit()`
  - [ ] Set default month from API response
  - [ ] Subscribe to month selector changes
  - [ ] Refresh data when month changes
  - [ ] Disable selector while loading
- [ ] Update `monthOptionsSignal` computed (AC: 2)
  - [ ] Use `availableMonths$` instead of hardcoded data
- [ ] Update summary API calls (AC: 5)
  - [ ] Include month parameter from `selectedMonth.value`
- [ ] Verify all tests pass (AC: 1)
- [ ] Run validation commands

## Dev Notes

### Testing Standards

- **Test Location:** Frontend tests in `apps/dms-material/src/app/**/*.spec.ts`
- **Testing Framework:** Vitest
- **Coverage:** Must achieve >80% coverage
- **Re-enable Tests:** Change `.skip` to active tests from AS.5-TDD

### Technical Context

- Component: `apps/dms-material/src/app/global/global-summary.ts`
- Service: `apps/dms-material/src/app/global/services/summary.service.ts`
- Backend endpoints:
  - GET `/api/summary/months` - returns available months
  - GET `/api/summary?month=YYYY-MM` - returns summary for specific month

### Implementation Details

**SummaryService Updates:**

```typescript
export class SummaryService {
  private http = inject(HttpClient);
  private summaryCache$?: Observable<SummaryResponse>;
  private summaryCacheTime = 0;
  private monthsCache$?: Observable<MonthsResponse>;
  private monthsCacheTime = 0;
  private CACHE_DURATION = 30000; // 30 seconds
  private MONTHS_CACHE_DURATION = 60000; // 60 seconds

  getSummary(accountId?: string, month?: string): Observable<SummaryResponse> {
    const now = Date.now();

    // Cache key includes accountId and month
    const cacheKey = `${accountId || ''}-${month || ''}`;

    if (this.summaryCache$ && now - this.summaryCacheTime < this.CACHE_DURATION) {
      return this.summaryCache$;
    }

    const params: any = {};
    if (accountId) params.accountId = accountId;
    if (month) params.month = month;

    this.summaryCache$ = this.http.get<SummaryResponse>('/api/summary', { params })
      .pipe(
        retry(3),
        shareReplay(1)
      );

    this.summaryCacheTime = now;
    return this.summaryCache$;
  }

  getAvailableMonths(): Observable<MonthsResponse> {
    const now = Date.now();

    if (this.monthsCache$ && now - this.monthsCacheTime < this.MONTHS_CACHE_DURATION) {
      return this.monthsCache$;
    }

    this.monthsCache$ = this.http.get<MonthsResponse>('/api/summary/months')
      .pipe(
        retry(3),
        shareReplay(1)
      );

    this.monthsCacheTime = now;
    return this.monthsCache$;
  }
}
```

**Component Updates:**

```typescript
export class GlobalSummary implements OnInit {
  private summaryService = inject(SummaryService);

  readonly selectedMonth = new FormControl<string>('');
  readonly isLoadingMonths = signal(false);
  readonly hasMonthsError = signal(false);
  readonly availableMonths$ = signal<MonthOption[]>([]);

  readonly monthOptionsSignal = computed(() => this.availableMonths$());

  ngOnInit(): void {
    this.loadAvailableMonths();
    this.setupMonthChangeListener();
  }

  private loadAvailableMonths(): void {
    this.isLoadingMonths.set(true);

    this.summaryService.getAvailableMonths().subscribe({
      next: (response) => {
        this.availableMonths$.set(response.months);
        const defaultMonth = response.currentMonth || response.months[response.months.length - 1]?.value;
        if (defaultMonth) {
          this.selectedMonth.setValue(defaultMonth);
        }
        this.isLoadingMonths.set(false);
        this.loadSummaryData();
      },
      error: (error) => {
        console.error('Error loading months:', error);
        this.hasMonthsError.set(true);
        this.isLoadingMonths.set(false);
      },
    });
  }

  private setupMonthChangeListener(): void {
    this.selectedMonth.valueChanges.subscribe((month) => {
      if (month) {
        this.loadSummaryData();
      }
    });
  }

  private loadSummaryData(): void {
    const month = this.selectedMonth.value;
    if (!month) return;

    this.isLoading.set(true);
    this.selectedMonth.disable();

    this.summaryService.getSummary(undefined, month).subscribe({
      next: (data) => {
        this.riskGroups$.set(data.riskGroups);
        this.basis$.set(data.basis);
        this.capitalGain$.set(data.capitalGains);
        this.dividends$.set(data.dividends);
        this.isLoading.set(false);
        this.selectedMonth.enable();
      },
      error: (error) => {
        console.error('Error loading summary:', error);
        this.hasError.set(true);
        this.errorMessage.set('Failed to load summary data');
        this.isLoading.set(false);
        this.selectedMonth.enable();
      },
    });
  }

  refreshData(): void {
    this.loadSummaryData();
  }
}
```

**Template Updates:**

```html
<mat-form-field>
  <mat-label>Month</mat-label>
  <mat-select [formControl]="selectedMonth">
    @if (isLoadingMonths()) {
      <mat-option disabled>Loading months...</mat-option>
    } @else if (hasMonthsError()) {
      <mat-option disabled>Error loading months</mat-option>
    } @else {
      @for (option of monthOptions; track option.value) {
        <mat-option [value]="option.value">{{ option.label }}</mat-option>
      }
    }
  </mat-select>
</mat-form-field>
```

**Interface Definitions:**

```typescript
interface MonthOption {
  label: string;  // "03/2025"
  value: string;  // "2025-03"
}

interface MonthsResponse {
  months: MonthOption[];
  currentMonth?: string;
}
```

## Definition of Done

- [ ] All tests from AS.5-TDD re-enabled and passing (GREEN phase)
- [ ] Month selector fetches and displays available months
- [ ] Default month set correctly
- [ ] Changing month refreshes data
- [ ] Loading state handled correctly
- [ ] Selector disabled during data fetch
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
- All tests from AS.5-TDD should pass after implementation
- Build incrementally, running tests frequently
- Ensure month changes don't cause unnecessary API calls (use caching)
- Handle edge case where no months are available

## Related Stories

- **Previous:** Story AS.5-TDD (Month/Year Selector Tests)
- **Next:** Story AS.7 (Add Unit Tests)
- **Epic:** Epic AS - Wire Up Global/Summary Screen

---

## Change Log

| Date       | Version | Description      | Author |
| ---------- | ------- | ---------------- | ------ |
| 2026-02-27 | 1.0     | Initial creation | QA     |

---

## QA Results

*QA assessment will be recorded here after story review*

---

## Dev Agent Record

*This section will be populated during story implementation*
