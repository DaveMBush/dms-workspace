# Story AT.5: TDD - Unit Tests for Month/Year Selectors

**Status:** Done

## Story

**As a** frontend developer
**I want** comprehensive unit tests for month/year selector functionality
**So that** I can ensure users can filter account performance data by time period before implementation

## Context

**Current System:**

- AccountSummary component displays pie chart from AT.4
- Need to add month/year selection to view historical data
- Global summary has month/year selectors to reference
- Backend supports time-based filtering

**Problem:**

- Need selectors to filter performance data by month and year
- Must handle selector changes and update charts accordingly
- Need to verify selector behavior before implementation

## Acceptance Criteria

### Functional Requirements

1. [ ] Tests verify month selector populated from available months
2. [ ] Tests verify year selector populated from available years
3. [ ] Tests verify month selection triggers graph data refresh
4. [ ] Tests verify year selection triggers available months refresh
5. [ ] Tests verify default selection is current month/year
6. [ ] Tests verify selectors are disabled during loading

### Technical Requirements

1. [ ] Unit tests created with >80% coverage
2. [ ] Tests follow AAA pattern (Arrange-Act-Assert)
3. [ ] Tests are disabled after verification they run RED (use `.skip`)
4. [ ] Mock HTTP calls for different time periods
5. [ ] Tests cover all selector interactions

## Test-Driven Development Approach

### Step 1: Create Comprehensive Unit Tests First

Update `apps/dms-material/src/app/accounts/account-summary/account-summary.spec.ts`:

```typescript
describe.skip('Month/Year Selectors', () => {
  it('should populate month selector from available months', () => {
    component['accountId'] = '123';
    component.ngOnInit();

    const req = httpMock.expectOne('/api/summary/months?accountId=123');
    req.flush([
      { month: '2025-01', label: 'January 2025' },
      { month: '2025-02', label: 'February 2025' },
      { month: '2025-03', label: 'March 2025' },
    ]);

    const options = component.monthOptions();
    expect(options).toHaveLength(3);
    expect(options[0].month).toBe('2025-01');
  });

  it('should populate year selector from service', () => {
    const years = component.yearOptions;
    expect(years).toContain(2025);
    expect(years).toContain(2024);
  });

  it('should default to current month', () => {
    component.ngOnInit();
    expect(component.selectedMonth.value).toBe('2025-03');
  });

  it('should default to current year', () => {
    component.ngOnInit();
    expect(component.selectedYear.value).toBe(2025);
  });

  it('should fetch graph data when month changes', () => {
    component['accountId'] = '123';
    component.ngOnInit();

    // Clear initial requests
    httpMock.match(() => true).forEach((req) => req.flush({}));

    component.selectedMonth.setValue('2025-02');

    const req = httpMock.expectOne('/api/summary/graph?month=2025-02&accountId=123');
    expect(req.request.method).toBe('GET');
  });

  it('should fetch available months when year changes', () => {
    component['accountId'] = '123';
    component.ngOnInit();

    // Clear initial requests
    httpMock.match(() => true).forEach((req) => req.flush({}));

    component.selectedYear.setValue(2024);

    const req = httpMock.expectOne('/api/summary/months?accountId=123&year=2024');
    expect(req.request.method).toBe('GET');
  });

  it('should disable selectors during loading', () => {
    component['accountId'] = '123';
    component.ngOnInit();

    expect(component.selectedMonth.disabled).toBe(true);
    expect(component.selectedYear.disabled).toBe(true);

    httpMock.match(() => true).forEach((req) => req.flush({}));

    expect(component.selectedMonth.disabled).toBe(false);
    expect(component.selectedYear.disabled).toBe(false);
  });

  it('should update performance chart when month selection changes', () => {
    component['accountId'] = '123';
    component.ngOnInit();

    httpMock.match(() => true).forEach((req) => req.flush([]));

    const initialChart = component.performanceChartData();

    component.selectedMonth.setValue('2025-02');

    const req = httpMock.expectOne('/api/summary/graph?month=2025-02&accountId=123');
    req.flush([
      { month: '2025-01', deposits: 10000, dividends: 100, capitalGains: 200 },
      { month: '2025-02', deposits: 20000, dividends: 150, capitalGains: 300 },
    ]);

    const updatedChart = component.performanceChartData();
    expect(updatedChart).not.toEqual(initialChart);
  });
});
```

### Step 2: Run Tests to Verify RED Phase

```bash
pnpm test:dms-material account-summary
```

Tests should FAIL since selector implementation doesn't exist yet.

### Step 3: Disable Tests

After verifying tests run and fail appropriately, all new test blocks should use `.skip`.

## Tasks / Subtasks

- [x] Create month selector population tests (AC: F1)
- [x] Create year selector population tests (AC: F2)
- [x] Create month selection change tests (AC: F3)
- [x] Create year selection change tests (AC: F4)
- [x] Create default selection tests (AC: F5)
- [x] Create selector disabled state tests (AC: F6)
- [x] Create chart update on selection tests
- [x] Run tests to verify they FAIL (RED phase)
- [x] Disable all new tests with `.skip`

## Dev Notes

### Testing Standards

- **Test Location:** Frontend tests in `apps/dms-material/src/app/**/*.spec.ts`
- **Testing Framework:** Vitest
- **Coverage:** Must achieve >80% coverage
- **RED Phase:** Tests must fail before implementation

### Technical Context

- Account summary component: `apps/dms-material/src/app/accounts/account-summary/account-summary.ts`
- Reference: Global summary at `apps/dms-material/src/app/global/global-summary.ts`
- Months endpoint: `/api/summary/months?accountId=xxx&year=yyy`
- Graph endpoint: `/api/summary/graph?month=xxx&accountId=yyy`

### Selector Configuration

```typescript
import { FormControl } from '@angular/forms';

// In component:
readonly selectedMonth = new FormControl('2025-03');
readonly selectedYear = new FormControl(2025);

// Watch for changes:
effect(() => {
  const month = this.selectedMonth.value;
  if (month) {
    this.summaryService.fetchGraph(month, this.accountId);
  }
});
```

## Definition of Done

- [ ] Comprehensive test suite created for month/year selectors
- [ ] All selector interactions covered
- [ ] Tests verified to run and FAIL (RED phase)
- [ ] All new tests disabled with `.skip`
- [ ] Existing tests still pass
- [ ] Code follows project conventions
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass

## Notes

- This is the TDD RED phase
- Tests should be comprehensive but should FAIL
- Implementation will happen in Story AT.6
- All tests must be disabled with `.skip` at end of this story
- Re-enable tests will be first task in AT.6

## Related Stories

- **Previous:** Story AT.4 (Pie Chart Implementation)
- **Next:** Story AT.6 (Implementation)
- **Epic:** Epic AT - Wire Up Account/Summary Screen

---

## Change Log

| Date       | Version | Description                                                       | Author    |
| ---------- | ------- | ----------------------------------------------------------------- | --------- |
| 2026-03-02 | 1.0     | Initial creation                                                  | PM        |
| 2026-03-03 | 1.1     | Implemented 13 skipped tests for month/year selectors (RED phase) | Dev Agent |
