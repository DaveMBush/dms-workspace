# Story AT.4: Implement Account-Specific Pie Chart

**Status:** Dev Complete

## Story

**As a** user
**I want** an interactive pie chart showing risk group allocation for my account
**So that** I can visualize how my investments are distributed across risk groups

## Context

**Current System:**

- AccountSummary component wired to backend from AT.2
- Tests written in Story AT.3-TDD define expected behavior
- Global summary has working pie chart implementation
- ng2-charts library available

**Implementation Approach:**

- Add ng2-charts BaseChartDirective to component
- Configure pie chart with account-specific data
- Re-enable tests from AT.3-TDD
- Verify all tests pass (GREEN phase)

## Acceptance Criteria

### Functional Requirements

1. [x] Pie chart displays risk group allocation for specific account
2. [x] Chart shows three segments: Equities, Income, Tax Free
3. [x] Colors match global summary (blue, green, orange)
4. [x] Chart handles zero values gracefully
5. [x] Chart handles empty data appropriately
6. [x] Legend displays below chart
7. [x] Tooltips show currency-formatted values

### Technical Requirements

1. [x] All tests from AT.3-TDD re-enabled and passing
2. [x] ng2-charts BaseChartDirective properly integrated
3. [x] Chart configuration follows Chart.js best practices
4. [x] Responsive design works on different screen sizes
5. [x] Code follows project coding standards
6. [x] Unit test coverage >80%

## Tasks / Subtasks

- [x] Re-enable tests from AT.3-TDD (AC: T1)
- [x] Add ng2-charts imports to component (AC: T2)
  - [x] Import BaseChartDirective
  - [x] Add to component imports array
- [x] Configure pie chart data (AC: F1-F5)
  - [x] Create allocationChartData computed signal
  - [x] Map equities, income, tax_free_income to chart data
  - [x] Set labels ['Equities', 'Income', 'Tax Free']
  - [x] Set colors ['#3B82F6', '#10B981', '#F59E0B']
- [x] Configure chart options (AC: F6-F7)
  - [x] Set responsive: true
  - [x] Configure legend position: 'bottom'
  - [x] Add currency formatting to tooltips
- [x] Update component template
  - [x] Add canvas element with chart directive
  - [x] Bind chart data and options
  - [x] Wrap in mat-card for styling
- [x] Verify all tests pass (AC: T1)
- [ ] Run validation commands

## Dev Notes

### Testing Standards

- **Test Location:** Frontend tests in `apps/dms-material/src/app/**/*.spec.ts`
- **Testing Framework:** Vitest
- **Coverage:** Must achieve >80% coverage
- **Re-enable Tests:** Change `.skip` to active tests from AT.3-TDD

### Technical Context

- Account summary component: `apps/dms-material/src/app/accounts/account-summary/account-summary.ts`
- Reference: Global summary at `apps/dms-material/src/app/global/global-summary.ts`
- Chart library: ng2-charts
- Chart type: 'pie'

### Chart Implementation

```typescript
import { BaseChartDirective } from 'ng2-charts';

// In component:
readonly allocationChartData = computed((): ChartData<'pie'> => {
  const summary = this.summaryService.summary();
  return {
    labels: ['Equities', 'Income', 'Tax Free'],
    datasets: [{
      data: [summary.equities, summary.income, summary.tax_free_income],
      backgroundColor: [ '#3B82F6', '#10B981', '#F59E0B'],
    }],
  };
});

readonly allocationChartOptions: ChartConfiguration<'pie'>['options'] = {
  responsive: true,
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const label = context.label || '';
          const value = context.parsed || 0;
          return `${label}: ${new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(value)}`;
        },
      },
    },
  },
};
```

### Template

```html
<canvas baseChart [data]="allocationChartData()" [options]="allocationChartOptions" [type]="'pie'"> </canvas>
```

## Definition of Done

- [x] All tests from AT.3-TDD re-enabled and passing (GREEN phase)
- [x] Pie chart displays account-specific risk group allocation
- [x] Chart colors and legend configured correctly
- [x] Tooltips show currency-formatted values
- [x] Chart handles edge cases (zero values, empty data)
- [x] Code follows project conventions
- [x] Unit test coverage >80%
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD GREEN phase
- All tests from AT.3-TDD should pass after implementation
- Build incrementally, running tests frequently
- Follow pattern from GlobalSummary component
- Ensure chart is responsive

## Related Stories

- **Previous:** Story AT.3-TDD (Tests)
- **Next:** Story AT.5-TDD (Month/Year Selectors Tests)
- **Epic:** Epic AT - Wire Up Account/Summary Screen

---

## Change Log

| Date       | Version | Description                                                                                                                                     | Author    |
| ---------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 2026-03-02 | 1.0     | Initial creation                                                                                                                                | PM        |
| 2026-03-03 | 1.1     | Implementation complete - enhanced pieChartOptions with legend display and tooltip currency+percentage formatting, re-enabled 15 AT.3-TDD tests | Dev Agent |
