# Story AS.3: TDD - Unit Tests for Pie Chart Display with Real Data

**Status:** Ready for Review

## Story

**As a** frontend developer
**I want** comprehensive unit tests for pie chart rendering with backend data
**So that** I can ensure charts display correctly before full implementation

## Context

**Current System:**

- Summary service wired in Story AS.2
- Component receives real data from backend
- Pie chart using `ng2-charts` via `SummaryDisplayComponent`
- Need to verify chart renders correctly with various data scenarios
- A similar component is implemented in #file:./apps/dms/src/app/global/_._ using primeng instead of angular material

**Problem:**

- Need tests for chart rendering with real API data
- Must handle edge cases (empty data, single risk group, many risk groups)
- Chart colors and labels need verification
- Responsive sizing needs testing

## Acceptance Criteria

### Functional Requirements

1. [ ] Tests verify pie chart renders with backend data
2. [ ] Tests verify chart labels match risk group names
3. [ ] Tests verify chart data matches risk group percentages
4. [ ] Tests verify chart colors are applied correctly
5. [ ] Tests verify chart handles empty data gracefully
6. [ ] Tests verify chart handles single risk group
7. [ ] Tests verify chart handles many risk groups

### Technical Requirements

1. [ ] Unit tests created with >80% coverage
2. [ ] Tests follow AAA pattern (Arrange-Act-Assert)
3. [ ] Tests are disabled after verification they run RED (use `.skip`)
4. [ ] Mock component interactions with `SummaryDisplayComponent`
5. [ ] Tests cover all chart configuration options

## Test-Driven Development Approach

### Step 1: Create Comprehensive Unit Tests for Chart Display

Update `apps/dms-material/src/app/global/global-summary.spec.ts`:

```typescript
describe.skip('Pie Chart Display', () => {
  let component: GlobalSummary;
  let fixture: ComponentFixture<GlobalSummary>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [GlobalSummary],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    fixture = TestBed.createComponent(GlobalSummary);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should render pie chart component', () => {
    component.ngOnInit();
    const req = httpMock.expectOne('/api/summary');
    req.flush({
      riskGroups: [
        { name: 'Equities', amount: 50000, percentage: 50 },
        { name: 'Income', amount: 30000, percentage: 30 },
        { name: 'Tax Free', amount: 20000, percentage: 20 },
      ],
      basis: 100000,
      capitalGains: 5000,
      dividends: 2500,
    });

    fixture.detectChanges();

    const pieChart = fixture.nativeElement.querySelector('dms-summary-display[chartType="pie"]');
    expect(pieChart).toBeDefined();
  });

  it('should pass correct data to pie chart', () => {
    component.ngOnInit();
    const req = httpMock.expectOne('/api/summary');
    req.flush({
      riskGroups: [
        { name: 'Equities', amount: 50000, percentage: 50 },
        { name: 'Income', amount: 30000, percentage: 30 },
        { name: 'Tax Free', amount: 20000, percentage: 20 },
      ],
      basis: 100000,
      capitalGains: 5000,
      dividends: 2500,
    });

    fixture.detectChanges();

    const chartData = component.allocationData;
    expect(chartData.labels).toEqual(['Equities', 'Income', 'Tax Free']);
    expect(chartData.datasets[0].data).toEqual([50, 30, 20]);
  });

  it('should apply correct colors to pie chart segments', () => {
    component.ngOnInit();
    const req = httpMock.expectOne('/api/summary');
    req.flush({
      riskGroups: [
        { name: 'Equities', amount: 50000, percentage: 50 },
        { name: 'Income', amount: 30000, percentage: 30 },
        { name: 'Tax Free', amount: 20000, percentage: 20 },
      ],
      basis: 100000,
      capitalGains: 5000,
      dividends: 2500,
    });

    fixture.detectChanges();

    const chartData = component.allocationData;
    expect(chartData.datasets[0].backgroundColor).toBeDefined();
    expect(chartData.datasets[0].backgroundColor.length).toBe(3);
  });

  it('should handle empty risk groups array', () => {
    component.ngOnInit();
    const req = httpMock.expectOne('/api/summary');
    req.flush({
      riskGroups: [],
      basis: 0,
      capitalGains: 0,
      dividends: 0,
    });

    fixture.detectChanges();

    const chartData = component.allocationData;
    expect(chartData.labels).toEqual([]);
    expect(chartData.datasets[0].data).toEqual([]);
  });

  it('should display message when no chart data available', () => {
    component.ngOnInit();
    const req = httpMock.expectOne('/api/summary');
    req.flush({
      riskGroups: [],
      basis: 0,
      capitalGains: 0,
      dividends: 0,
    });

    fixture.detectChanges();

    const noDataMessage = fixture.nativeElement.querySelector('.no-data-message');
    expect(noDataMessage).toBeDefined();
    expect(noDataMessage.textContent).toContain('No data available');
  });

  it('should handle single risk group', () => {
    component.ngOnInit();
    const req = httpMock.expectOne('/api/summary');
    req.flush({
      riskGroups: [{ name: 'Equities', amount: 100000, percentage: 100 }],
      basis: 100000,
      capitalGains: 0,
      dividends: 0,
    });

    fixture.detectChanges();

    const chartData = component.allocationData;
    expect(chartData.labels).toEqual(['Equities']);
    expect(chartData.datasets[0].data).toEqual([100]);
  });

  it('should handle many risk groups (more than 5)', () => {
    component.ngOnInit();
    const req = httpMock.expectOne('/api/summary');
    req.flush({
      riskGroups: [
        { name: 'Group1', amount: 10000, percentage: 16.67 },
        { name: 'Group2', amount: 10000, percentage: 16.67 },
        { name: 'Group3', amount: 10000, percentage: 16.67 },
        { name: 'Group4', amount: 10000, percentage: 16.67 },
        { name: 'Group5', amount: 10000, percentage: 16.67 },
        { name: 'Group6', amount: 10000, percentage: 16.65 },
      ],
      basis: 60000,
      capitalGains: 0,
      dividends: 0,
    });

    fixture.detectChanges();

    const chartData = component.allocationData;
    expect(chartData.labels.length).toBe(6);
    expect(chartData.datasets[0].data.length).toBe(6);
    expect(chartData.datasets[0].backgroundColor.length).toBe(6);
  });

  it('should use consistent colors for same risk groups across refreshes', () => {
    // First load
    component.ngOnInit();
    let req = httpMock.expectOne('/api/summary');
    req.flush({
      riskGroups: [
        { name: 'Equities', amount: 50000, percentage: 50 },
        { name: 'Income', amount: 50000, percentage: 50 },
      ],
      basis: 100000,
      capitalGains: 0,
      dividends: 0,
    });
    fixture.detectChanges();
    const colors1 = component.allocationData.datasets[0].backgroundColor;

    // Refresh data
    component.refreshData();
    req = httpMock.expectOne('/api/summary');
    req.flush({
      riskGroups: [
        { name: 'Equities', amount: 60000, percentage: 60 },
        { name: 'Income', amount: 40000, percentage: 40 },
      ],
      basis: 100000,
      capitalGains: 0,
      dividends: 0,
    });
    fixture.detectChanges();
    const colors2 = component.allocationData.datasets[0].backgroundColor;

    expect(colors1).toEqual(colors2);
  });

  it('should display pie chart title', () => {
    component.ngOnInit();
    const req = httpMock.expectOne('/api/summary');
    req.flush({
      riskGroups: [{ name: 'Equities', amount: 50000, percentage: 50 }],
      basis: 100000,
      capitalGains: 0,
      dividends: 0,
    });

    fixture.detectChanges();

    const title = fixture.nativeElement.querySelector('.chart-title');
    expect(title).toBeDefined();
    expect(title.textContent).toContain('Risk Group Allocation');
  });

  it('should pass chart options to summary display component', () => {
    component.ngOnInit();
    const req = httpMock.expectOne('/api/summary');
    req.flush({
      riskGroups: [{ name: 'Equities', amount: 50000, percentage: 50 }],
      basis: 100000,
      capitalGains: 0,
      dividends: 0,
    });

    fixture.detectChanges();

    expect(component.chartOptions).toBeDefined();
    expect(component.chartOptions.responsive).toBe(true);
    expect(component.chartOptions.maintainAspectRatio).toBe(true);
  });

  it('should show percentages in chart labels', () => {
    component.ngOnInit();
    const req = httpMock.expectOne('/api/summary');
    req.flush({
      riskGroups: [
        { name: 'Equities', amount: 50000, percentage: 50 },
        { name: 'Income', amount: 30000, percentage: 30 },
      ],
      basis: 80000,
      capitalGains: 0,
      dividends: 0,
    });

    fixture.detectChanges();

    const chartData = component.allocationData;
    expect(chartData.datasets[0].data).toEqual([50, 30]);
  });

  it('should format amounts with currency in tooltip', () => {
    component.ngOnInit();
    const req = httpMock.expectOne('/api/summary');
    req.flush({
      riskGroups: [{ name: 'Equities', amount: 50000, percentage: 50 }],
      basis: 100000,
      capitalGains: 0,
      dividends: 0,
    });

    fixture.detectChanges();

    const tooltipCallback = component.chartOptions.plugins.tooltip.callbacks.label;
    const tooltipItem = {
      label: 'Equities',
      raw: 50,
      parsed: 50,
      dataIndex: 0,
    };

    const result = tooltipCallback(tooltipItem);
    expect(result).toContain('$50,000');
    expect(result).toContain('50%');
  });
});
```

### Step 2: Run Tests (RED Phase)

```bash
pnpm nx run dms-material:test
```

**Expected Result:** All `.skip` tests should be skipped. When you remove `.skip`, they should FAIL (RED) because the full implementation doesn't exist yet.

### Step 3: Verify Tests Are Comprehensive

Before moving to Story AS.4, ensure tests cover:

- [ ] Chart component rendering
- [ ] Data binding to chart
- [ ] Color assignment
- [ ] Empty state handling
- [ ] Single item handling
- [ ] Many items handling
- [ ] Chart configuration
- [ ] Tooltip formatting

## Tasks / Subtasks

- [x] Create pie chart display tests in global-summary.spec.ts (AC: 1-7)
  - [x] Tests for chart rendering
  - [x] Tests for data binding
  - [x] Tests for color application
  - [x] Tests for empty data handling
  - [x] Tests for edge cases (single, many groups)
  - [x] Tests for chart configuration
  - [x] Tests for tooltip formatting
- [x] Run tests to verify they FAIL (RED phase) (AC: 2, 3)
- [x] Disable all new tests with `.skip` (AC: 3)
- [x] Document expected behavior in test descriptions (AC: 1)
- [x] Run validation commands
  - [x] Run `pnpm all` (should pass - tests are skipped)
  - [x] Run `pnpm dupcheck`
  - [x] Run `pnpm format`

## Dev Notes

### Testing Standards

- **Test Location:** Frontend tests in `apps/dms-material/src/app/**/*.spec.ts`
- **Testing Framework:** Vitest with Angular Testing Library
- **Coverage:** Must achieve >80% coverage for test files
- **Test Pattern:** AAA (Arrange-Act-Assert)

### Technical Context

- Component uses `SummaryDisplayComponent` from `apps/dms-material/src/app/shared/components/summary-display/`
- Chart library: ng2-charts (wrapper around Chart.js)
- Chart type: pie
- Data comes from `/api/summary` endpoint via SummaryService
- Risk groups may vary in number (0 to many)

### Chart Configuration

Expected chart options:

```typescript
{
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      position: 'bottom',
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const label = context.label || '';
          const value = context.raw;
          const amount = riskGroups[context.dataIndex].amount;
          return `${label}: $${amount.toLocaleString()} (${value}%)`;
        },
      },
    },
  },
}
```

### Color Palette

Consistent colors for risk groups:

```typescript
const CHART_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
];
```

### TDD Workflow

1. Write comprehensive tests first (this story)
2. Verify tests run and FAIL (RED)
3. Disable tests with `.skip`
4. Implementation in Story AS.4 will re-enable and make tests pass (GREEN)
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
- Implementation will happen in Story AS.4
- All tests must be disabled with `.skip` at end of this story
- Re-enable tests will be first task in AS.4
- Focus on chart display; service integration already tested in AS.1

## Related Stories

- **Previous:** Story AS.2 (Service Implementation)
- **Next:** Story AS.4 (Pie Chart Implementation)
- **Epic:** Epic AS - Wire Up Global/Summary Screen

---

## Change Log

| Date       | Version | Description      | Author |
| ---------- | ------- | ---------------- | ------ |
| 2026-02-27 | 1.0     | Initial creation | QA     |

---

## QA Results

_QA assessment will be recorded here after story review_

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None - clean TDD RED phase implementation.

### Completion Notes

- 12 tests written in `describe.skip('Pie Chart Display')` block
- Tests adapted to real API format (equities/income/tax_free_income, not riskGroups)
- 7 of 12 tests confirmed failing (RED) — tests for pieChartOptions, .no-data-message, .chart-title, tooltip formatting, legend config
- 5 tests pass with existing implementation — basic rendering, labels, data values, colors, data sum
- All tests disabled with `.skip`, pnpm all 4/4 passed, dupcheck 0 clones

### File List

| File                                                      | Status   |
| --------------------------------------------------------- | -------- |
| `apps/dms-material/src/app/global/global-summary.spec.ts` | Modified |

### Change Log

| Date       | Change                                                              |
| ---------- | ------------------------------------------------------------------- |
| 2026-02-27 | Added 12 TDD RED tests for pie chart display in describe.skip block |
