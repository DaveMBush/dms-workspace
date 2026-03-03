# Story AT.3: TDD - Unit Tests for Account-Specific Pie Chart

**Status:** Approved

## Story

**As a** frontend developer
**I want** comprehensive unit tests for account-specific pie chart display
**So that** I can ensure the visualization correctly displays risk group allocation before implementation

## Context

**Current System:**

- AccountSummary component wired to backend from AT.2
- Component displays basic data but needs enhanced pie chart visualization
- Global summary component has pie chart implementation to reference
- ng2-charts library available for chart rendering

**Problem:**

- Need interactive pie chart showing risk group allocation for specific account
- Must handle different data scenarios (empty accounts, single risk group, etc.)
- Need to verify chart configuration before implementation

## Acceptance Criteria

### Functional Requirements

1. [ ] Tests verify pie chart configuration for account data
2. [ ] Tests verify chart displays three risk group segments (Equities, Income, Tax Free)
3. [ ] Tests verify colors match global summary chart
4. [ ] Tests verify chart handles zero values
5. [ ] Tests verify chart handles empty data
6. [ ] Tests verify legend configuration

### Technical Requirements

1. [ ] Unit tests created with >80% coverage
2. [ ] Tests follow AAA pattern (Arrange-Act-Assert)
3. [ ] Tests are disabled after verification they run RED (use `.skip`)
4. [ ] Mock chart data properly
5. [ ] Tests cover all edge cases

## Test-Driven Development Approach

### Step 1: Create Comprehensive Unit Tests First

Update `apps/dms-material/src/app/accounts/account-summary/account-summary.spec.ts`:

```typescript
describe.skip('Account Pie Chart Display', () => {
  it('should configure pie chart with account allocation data', () => {
    component['accountId'] = '123';
    component.ngOnInit();

    const req = httpMock.expectOne('/api/summary?accountId=123');
    req.flush({
      deposits: 100000,
      dividends: 2500,
      capitalGains: 5000,
      equities: 50000,
      income: 30000,
      tax_free_income: 20000,
    });

    const chartData = component.allocationChartData();
    expect(chartData.labels).toEqual(['Equities', 'Income', 'Tax Free']);
    expect(chartData.datasets[0].data).toEqual([50000, 30000, 20000]);
  });

  it('should use correct colors for risk group segments', () => {
    component['accountId'] = '123';
    component.ngOnInit();

    const req = httpMock.expectOne('/api/summary?accountId=123');
    req.flush({
      deposits: 100000,
      dividends: 2500,
      capitalGains: 5000,
      equities: 50000,
      income: 30000,
      tax_free_income: 20000,
    });

    const chartData = component.allocationChartData();
    expect(chartData.datasets[0].backgroundColor).toEqual([
      '#3B82F6', // Blue for Equities
      '#10B981', // Green for Income
      '#F59E0B', // Orange for Tax Free
    ]);
  });

  it('should handle account with zero values', () => {
    component['accountId'] = '123';
    component.ngOnInit();

    const req = httpMock.expectOne('/api/summary?accountId=123');
    req.flush({
      deposits: 0,
      dividends: 0,
      capitalGains: 0,
      equities: 0,
      income: 0,
      tax_free_income: 0,
    });

    const chartData = component.allocationChartData();
    expect(chartData.datasets[0].data).toEqual([0, 0, 0]);
  });

  it('should configure pie chart options', () => {
    const options = component.allocationChartOptions;
    expect(options.responsive).toBe(true);
    expect(options.plugins?.legend?.display).toBe(true);
    expect(options.plugins?.legend?.position).toBe('bottom');
  });

  it('should format chart tooltip values as currency', () => {
    const options = component.allocationChartOptions;
    expect(options.plugins?.tooltip).toBeDefined();
  });

  it('should handle single risk group allocation', () => {
    component['accountId'] = '123';
    component.ngOnInit();

    const req = httpMock.expectOne('/api/summary?accountId=123');
    req.flush({
      deposits: 50000,
      dividends: 500,
      capitalGains: 1000,
      equities: 50000,
      income: 0,
      tax_free_income: 0,
    });

    const chartData = component.allocationChartData();
    expect(chartData.datasets[0].data).toEqual([50000, 0, 0]);
  });
});
```

### Step 2: Run Tests to Verify RED Phase

```bash
pnpm test:dms-material account-summary
```

Tests should FAIL since pie chart implementation doesn't exist yet.

### Step 3: Disable Tests

After verifying tests run and fail appropriately, all new test blocks should use `.skip`.

## Tasks / Subtasks

- [ ] Create pie chart configuration tests (AC: F1)
- [ ] Create tests for chart data mapping (AC: F2)
- [ ] Create tests for color scheme (AC: F3)
- [ ] Create tests for zero values (AC: F4)
- [ ] Create tests for empty data (AC: F5)
- [ ] Create tests for legend configuration (AC: F6)
- [ ] Create tests for chart options
- [ ] Create tests for tooltip formatting
- [ ] Run tests to verify they FAIL (RED phase)
- [ ] Disable all new tests with `.skip`

## Dev Notes

### Testing Standards

- **Test Location:** Frontend tests in `apps/dms-material/src/app/**/*.spec.ts`
- **Testing Framework:** Vitest
- **Coverage:** Must achieve >80% coverage
- **RED Phase:** Tests must fail before implementation

### Technical Context

- Account summary component: `apps/dms-material/src/app/accounts/account-summary/account-summary.ts`
- Reference: Global summary pie chart at `apps/dms-material/src/app/global/global-summary.ts`
- Chart library: ng2-charts (wrapper for Chart.js)
- Chart type: 'pie'

### Chart Configuration

```typescript
interface PieChartData {
  labels: string[];
  datasets: [
    {
      data: number[];
      backgroundColor: string[];
    }
  ];
}

interface ChartOptions {
  responsive: boolean;
  plugins: {
    legend: {
      display: boolean;
      position: 'bottom' | 'top' | 'left' | 'right';
    };
    tooltip: {
      // Currency formatting
    };
  };
}
```

## Definition of Done

- [ ] Comprehensive test suite created for pie chart display
- [ ] All edge cases covered (zero values, empty data, single risk group)
- [ ] Tests verified to run and FAIL (RED phase)
- [ ] All new tests disabled with `.skip`
- [ ] Existing tests still pass
- [ ] Code follows project conventions
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass

## Notes

- This is the TDD RED phase
- Tests should be comprehensive but should FAIL
- Implementation will happen in Story AT.4
- All tests must be disabled with `.skip` at end of this story
- Re-enable tests will be first task in AT.4
- Follow same color scheme as global summary

## Related Stories

- **Previous:** Story AT.2 (Initial Wiring)
- **Next:** Story AT.4 (Implementation)
- **Epic:** Epic AT - Wire Up Account/Summary Screen

---

## Change Log

| Date       | Version | Description      | Author |
| ---------- | ------- | ---------------- | ------ |
| 2026-03-02 | 1.0     | Initial creation | PM     |
