# Story AT.4: Implement Account-Specific Pie Chart

**Status:** Approved

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

1. [ ] Pie chart displays risk group allocation for specific account
2. [ ] Chart shows three segments: Equities, Income, Tax Free
3. [ ] Colors match global summary (blue, green, orange)
4. [ ] Chart handles zero values gracefully
5. [ ] Chart handles empty data appropriately
6. [ ] Legend displays below chart
7. [ ] Tooltips show currency-formatted values

### Technical Requirements

1. [ ] All tests from AT.3-TDD re-enabled and passing
2. [ ] ng2-charts BaseChartDirective properly integrated
3. [ ] Chart configuration follows Chart.js best practices
4. [ ] Responsive design works on different screen sizes
5. [ ] Code follows project coding standards
6. [ ] Unit test coverage >80%

## Tasks / Subtasks

- [ ] Re-enable tests from AT.3-TDD (AC: T1)
- [ ] Add ng2-charts imports to component (AC: T2)
  - [ ] Import BaseChartDirective
  - [ ] Add to component imports array
- [ ] Configure pie chart data (AC: F1-F5)
  - [ ] Create allocationChartData computed signal
  - [ ] Map equities, income, tax_free_income to chart data
  - [ ] Set labels ['Equities', 'Income', 'Tax Free']
  - [ ] Set colors ['#3B82F6', '#10B981', '#F59E0B']
- [ ] Configure chart options (AC: F6-F7)
  - [ ] Set responsive: true
  - [ ] Configure legend position: 'bottom'
  - [ ] Add currency formatting to tooltips
- [ ] Update component template
  - [ ] Add canvas element with chart directive
  - [ ] Bind chart data and options
  - [ ] Wrap in mat-card for styling
- [ ] Verify all tests pass (AC: T1)
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

- [ ] All tests from AT.3-TDD re-enabled and passing (GREEN phase)
- [ ] Pie chart displays account-specific risk group allocation
- [ ] Chart colors and legend configured correctly
- [ ] Tooltips show currency-formatted values
- [ ] Chart handles edge cases (zero values, empty data)
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

| Date       | Version | Description      | Author |
| ---------- | ------- | ---------------- | ------ |
| 2026-03-02 | 1.0     | Initial creation | PM     |
