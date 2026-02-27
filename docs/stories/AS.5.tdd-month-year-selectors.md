# Story AS.5: TDD - Unit Tests for Month/Year Selector Functionality

**Status:** Draft

## Story

**As a** frontend developer
**I want** comprehensive unit tests for month/year selector integration
**So that** I can ensure data filtering by time period works correctly before implementation

## Context

**Current System:**

- Global summary component has month selector UI (FormControl)
- Month/year selector currently not connected to backend
- Backend provides `/api/summary/months` endpoint (from old DMS app)
- Need to verify month selection updates displayed data
- A similar component is implemented in #file:./apps/dms/src/app/global/*.* using primeng instead of angular material


**Problem:**

- Selector exists but doesn't filter data
- Need tests for fetching available months
- Need tests for data refresh when month changes
- Must handle scenarios where no data exists for selected month

## Acceptance Criteria

### Functional Requirements

1. [ ] Tests verify component fetches available months on init
2. [ ] Tests verify month selector displays available months
3. [ ] Tests verify changing month triggers data refresh
4. [ ] Tests verify data updates when month changes
5. [ ] Tests verify handling of months with no data
6. [ ] Tests verify default month selection (current or most recent)

### Technical Requirements

1. [ ] Unit tests created with >80% coverage
2. [ ] Tests follow AAA pattern (Arrange-Act-Assert)
3. [ ] Tests are disabled after verification they run RED (use `.skip`)
4. [ ] Mock HTTP calls for months endpoint
5. [ ] Tests cover month change reactivity

## Test-Driven Development Approach

### Step 1: Create Comprehensive Unit Tests for Month/Year Selectors

Update `apps/dms-material/src/app/global/global-summary.spec.ts`:

```typescript
describe.skip('Month/Year Selector', () => {
  let component: GlobalSummary;
  let fixture: ComponentFixture<GlobalSummary>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [GlobalSummary],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    fixture = TestBed.createComponent(GlobalSummary);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch available months on init', () => {
    component.ngOnInit();

    const monthsReq = httpMock.expectOne('/api/summary/months');
    expect(monthsReq.request.method).toBe('GET');

    monthsReq.flush({
      months: [
        { label: '01/2025', value: '2025-01' },
        { label: '02/2025', value: '2025-02' },
        { label: '03/2025', value: '2025-03' },
      ],
      currentMonth: '2025-03',
    });

    const summaryReq = httpMock.expectOne(/\/api\/summary/);
    summaryReq.flush({
      riskGroups: [],
      basis: 0,
      capitalGains: 0,
      dividends: 0,
    });

    expect(component.monthOptions().length).toBe(3);
  });

  it('should display month options in selector', () => {
    component.ngOnInit();

    const monthsReq = httpMock.expectOne('/api/summary/months');
    monthsReq.flush({
      months: [
        { label: '01/2025', value: '2025-01' },
        { label: '02/2025', value: '2025-02' },
      ],
      currentMonth: '2025-02',
    });

    const summaryReq = httpMock.expectOne(/\/api\/summary/);
    summaryReq.flush({
      riskGroups: [],
      basis: 0,
      capitalGains: 0,
      dividends: 0,
    });

    fixture.detectChanges();

    const options = component.monthOptions();
    expect(options[0].label).toBe('01/2025');
    expect(options[0].value).toBe('2025-01');
    expect(options[1].label).toBe('02/2025');
    expect(options[1].value).toBe('2025-02');
  });

  it('should set default month to current month from API', () => {
    component.ngOnInit();

    const monthsReq = httpMock.expectOne('/api/summary/months');
    monthsReq.flush({
      months: [
        { label: '01/2025', value: '2025-01' },
        { label: '02/2025', value: '2025-02' },
        { label: '03/2025', value: '2025-03' },
      ],
      currentMonth: '2025-03',
    });

    const summaryReq = httpMock.expectOne(/\/api\/summary/);
    summaryReq.flush({
      riskGroups: [],
      basis: 0,
      capitalGains: 0,
      dividends: 0,
    });

    expect(component.selectedMonth.value).toBe('2025-03');
  });

  it('should refresh data when month selection changes', () => {
    component.ngOnInit();

    // Initial load
    let monthsReq = httpMock.expectOne('/api/summary/months');
    monthsReq.flush({
      months: [
        { label: '01/2025', value: '2025-01' },
        { label: '02/2025', value: '2025-02' },
      ],
      currentMonth: '2025-02',
    });

    let summaryReq = httpMock.expectOne('/api/summary?month=2025-02');
    summaryReq.flush({
      riskGroups: [{ name: 'Equities', amount: 50000, percentage: 100 }],
      basis: 50000,
      capitalGains: 0,
      dividends: 0,
    });

    // Change month
    component.selectedMonth.setValue('2025-01');

    summaryReq = httpMock.expectOne('/api/summary?month=2025-01');
    summaryReq.flush({
      riskGroups: [{ name: 'Equities', amount: 40000, percentage: 100 }],
      basis: 40000,
      capitalGains: 0,
      dividends: 0,
    });

    expect(component.basis$()).toBe(40000);
  });

  it('should include month parameter in summary API call', () => {
    component.ngOnInit();

    const monthsReq = httpMock.expectOne('/api/summary/months');
    monthsReq.flush({
      months: [{ label: '01/2025', value: '2025-01' }],
      currentMonth: '2025-01',
    });

    const summaryReq = httpMock.expectOne('/api/summary?month=2025-01');
    expect(summaryReq.request.params.get('month')).toBe('2025-01');

    summaryReq.flush({
      riskGroups: [],
      basis: 0,
      capitalGains: 0,
      dividends: 0,
    });
  });

  it('should handle month with no data gracefully', () => {
    component.ngOnInit();

    const monthsReq = httpMock.expectOne('/api/summary/months');
    monthsReq.flush({
      months: [
        { label: '01/2025', value: '2025-01' },
        { label: '02/2025', value: '2025-02' },
      ],
      currentMonth: '2025-02',
    });

    const summaryReq = httpMock.expectOne(/\/api\/summary/);
    summaryReq.flush({
      riskGroups: [],
      basis: 0,
      capitalGains: 0,
      dividends: 0,
    });

    fixture.detectChanges();

    expect(component.hasData()).toBe(false);
    const noDataMessage = fixture.nativeElement.querySelector('.no-data-message');
    expect(noDataMessage).toBeDefined();
  });

  it('should show loading spinner while fetching months', () => {
    expect(component.isLoadingMonths()).toBe(false);

    component.ngOnInit();

    expect(component.isLoadingMonths()).toBe(true);

    const monthsReq = httpMock.expectOne('/api/summary/months');
    monthsReq.flush({
      months: [{ label: '01/2025', value: '2025-01' }],
      currentMonth: '2025-01',
    });

    const summaryReq = httpMock.expectOne(/\/api\/summary/);
    summaryReq.flush({
      riskGroups: [],
      basis: 0,
      capitalGains: 0,
      dividends: 0,
    });

    expect(component.isLoadingMonths()).toBe(false);
  });

  it('should disable month selector while loading data', () => {
    component.ngOnInit();

    const monthsReq = httpMock.expectOne('/api/summary/months');
    monthsReq.flush({
      months: [
        { label: '01/2025', value: '2025-01' },
        { label: '02/2025', value: '2025-02' },
      ],
      currentMonth: '2025-02',
    });

    let summaryReq = httpMock.expectOne(/\/api\/summary/);
    summaryReq.flush({
      riskGroups: [],
      basis: 0,
      capitalGains: 0,
      dividends: 0,
    });

    fixture.detectChanges();

    // Change month - selector should be disabled while loading
    component.selectedMonth.setValue('2025-01');
    expect(component.selectedMonth.disabled).toBe(true);

    summaryReq = httpMock.expectOne(/\/api\/summary/);
    summaryReq.flush({
      riskGroups: [],
      basis: 0,
      capitalGains: 0,
      dividends: 0,
    });

    expect(component.selectedMonth.disabled).toBe(false);
  });

  it('should handle error fetching months', () => {
    component.ngOnInit();

    const monthsReq = httpMock.expectOne('/api/summary/months');
    monthsReq.error(new ProgressEvent('error'));

    expect(component.hasMonthsError()).toBe(true);
    expect(component.monthOptions().length).toBe(0);
  });

  it('should default to current month if API does not specify', () => {
    component.ngOnInit();

    const monthsReq = httpMock.expectOne('/api/summary/months');
    monthsReq.flush({
      months: [
        { label: '01/2025', value: '2025-01' },
        { label: '02/2025', value: '2025-02' },
        { label: '03/2025', value: '2025-03' },
      ],
      // No currentMonth specified
    });

    const summaryReq = httpMock.expectOne(/\/api\/summary/);
    summaryReq.flush({
      riskGroups: [],
      basis: 0,
      capitalGains: 0,
      dividends: 0,
    });

    // Should default to most recent month
    expect(component.selectedMonth.value).toBe('2025-03');
  });

  it('should persist selected month across data refreshes', () => {
    component.ngOnInit();

    const monthsReq = httpMock.expectOne('/api/summary/months');
    monthsReq.flush({
      months: [
        { label: '01/2025', value: '2025-01' },
        { label: '02/2025', value: '2025-02' },
      ],
      currentMonth: '2025-02',
    });

    let summaryReq = httpMock.expectOne(/\/api\/summary/);
    summaryReq.flush({
      riskGroups: [],
      basis: 0,
      capitalGains: 0,
      dividends: 0,
    });

    // Change to specific month
    component.selectedMonth.setValue('2025-01');
    summaryReq = httpMock.expectOne('/api/summary?month=2025-01');
    summaryReq.flush({
      riskGroups: [],
      basis: 0,
      capitalGains: 0,
      dividends: 0,
    });

    // Manual refresh
    component.refreshData();
    summaryReq = httpMock.expectOne('/api/summary?month=2025-01');
    summaryReq.flush({
      riskGroups: [],
      basis: 0,
      capitalGains: 0,
      dividends: 0,
    });

    // Should still be on 2025-01
    expect(component.selectedMonth.value).toBe('2025-01');
  });
});
```

### Step 2: Create Tests for Month Service

Create `apps/dms-material/src/app/global/services/summary.service.spec.ts` additions:

```typescript
describe.skip('SummaryService - Months', () => {
  let service: SummaryService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SummaryService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(SummaryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch available months from /api/summary/months', () => {
    const mockResponse = {
      months: [
        { label: '01/2025', value: '2025-01' },
        { label: '02/2025', value: '2025-02' },
      ],
      currentMonth: '2025-02',
    };

    service.getAvailableMonths().subscribe((data) => {
      expect(data).toEqual(mockResponse);
    });

    const req = httpMock.expectOne('/api/summary/months');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should include month parameter in getSummary when provided', () => {
    service.getSummary(undefined, '2025-01').subscribe();

    const req = httpMock.expectOne('/api/summary?month=2025-01');
    expect(req.request.params.get('month')).toBe('2025-01');
    req.flush({ riskGroups: [], basis: 0, capitalGains: 0, dividends: 0 });
  });

  it('should cache months data for 60 seconds', () => {
    const mockResponse = {
      months: [{ label: '01/2025', value: '2025-01' }],
      currentMonth: '2025-01',
    };

    // First call
    service.getAvailableMonths().subscribe();
    const req1 = httpMock.expectOne('/api/summary/months');
    req1.flush(mockResponse);

    // Second call within 60 seconds - should use cache
    service.getAvailableMonths().subscribe();
    httpMock.expectNone('/api/summary/months');
  });
});
```

### Step 3: Run Tests (RED Phase)

```bash
pnpm nx run dms-material:test
```

**Expected Result:** All `.skip` tests should be skipped. When you remove `.skip`, they should FAIL (RED) because the implementation doesn't exist yet.

### Step 4: Verify Tests Are Comprehensive

Before moving to Story AS.6, ensure tests cover:

- [ ] Fetching available months
- [ ] Displaying month options
- [ ] Month selection changes
- [ ] Data refresh on month change
- [ ] Month parameter in API calls
- [ ] Empty data handling
- [ ] Loading states
- [ ] Error handling

## Tasks / Subtasks

- [ ] Create month/year selector tests in global-summary.spec.ts (AC: 1-6)
  - [ ] Tests for fetching months
  - [ ] Tests for month selector display
  - [ ] Tests for month change handling
  - [ ] Tests for data refresh on month change
  - [ ] Tests for loading states
  - [ ] Tests for error handling
- [ ] Add month tests to summary.service.spec.ts (AC: 1-6)
  - [ ] Tests for months endpoint
  - [ ] Tests for month parameter
  - [ ] Tests for caching
- [ ] Run tests to verify they FAIL (RED phase) (AC: 2, 3)
- [ ] Disable all new tests with `.skip` (AC: 3)
- [ ] Document expected behavior in test descriptions (AC: 1)
- [ ] Run validation commands
  - [ ] Run `pnpm all` (should pass - tests are skipped)
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`

## Dev Notes

### Testing Standards

- **Test Location:** Frontend tests in `apps/dms-material/src/app/**/*.spec.ts`
- **Testing Framework:** Vitest with Angular Testing Library
- **Coverage:** Must achieve >80% coverage for test files
- **Test Pattern:** AAA (Arrange-Act-Assert)
- **HTTP Testing:** Use Angular's `HttpTestingController`

### Technical Context

- Component: `apps/dms-material/src/app/global/global-summary.ts`
- Month selector: Material `mat-select` with `FormControl`
- Backend endpoints:
  - `/api/summary/months` - returns available months
  - `/api/summary?month=YYYY-MM` - returns summary for specific month
- Month format: `YYYY-MM` (e.g., `2025-03`)
- Display format: `MM/YYYY` (e.g., `03/2025`)

### Expected API Response Format

```typescript
// /api/summary/months
interface MonthsResponse {
  months: Array<{
    label: string;  // Display format: "03/2025"
    value: string;  // API format: "2025-03"
  }>;
  currentMonth?: string; // API format: "2025-03"
}
```

### TDD Workflow

1. Write comprehensive tests first (this story)
2. Verify tests run and FAIL (RED)
3. Disable tests with `.skip`
4. Implementation in Story AS.6 will re-enable and make tests pass (GREEN)
5. Refactor as needed while keeping tests passing

## Definition of Done

- [ ] All test files created and comprehensive
- [ ] Tests cover all functional requirements
- [ ] Tests follow AAA pattern
- [ ] Tests verified to FAIL (RED phase)
- [ ] All tests disabled with `.skip`
- [ ] Code follows project conventions
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Changes reviewed and approved

## Notes

- This is the TDD RED phase
- Tests should be comprehensive but should FAIL
- Implementation will happen in Story AS.6
- All tests must be disabled with `.skip` at end of this story
- Re-enable tests will be first task in AS.6
- Month selector UI already exists but not functional

## Related Stories

- **Previous:** Story AS.4 (Pie Chart Implementation)
- **Next:** Story AS.6 (Month/Year Selector Implementation)
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
