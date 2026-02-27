# Story AS.4: Implement Pie Chart Display with ng2-charts

**Status:** Draft

## Story

**As a** user
**I want** to see my risk group allocation displayed as a pie chart
**So that** I can quickly understand my portfolio distribution

## Context

**Current System:**

- Summary service provides risk group data (from AS.2)
- Component receives real data from backend
- Tests written in Story AS.3-TDD define expected behavior
- `SummaryDisplayComponent` already exists for chart rendering
- A similar component is implemented in #file:./apps/dms/src/app/global/*.* using primeng instead of angular material


**Implementation Approach:**

- Enhance chart data transformation following TDD tests
- Implement color scheme for pie chart
- Add chart configuration options
- Re-enable tests from AS.3-TDD
- Verify all tests pass (GREEN phase)

## Acceptance Criteria

### Functional Requirements

1. [ ] Pie chart displays risk group allocation correctly
2. [ ] Chart labels show risk group names
3. [ ] Chart segments sized by percentage
4. [ ] Colors consistently applied to risk groups
5. [ ] Empty state handled gracefully (shows message)
6. [ ] Chart responsive to container size
7. [ ] Tooltips show amount and percentage

### Technical Requirements

1. [ ] All tests from AS.3-TDD re-enabled and passing
2. [ ] Chart options properly configured
3. [ ] Color palette defined and applied
4. [ ] Tooltip formatting includes currency
5. [ ] Code follows project coding standards
6. [ ] Unit test coverage >80%

## Tasks / Subtasks

- [ ] Re-enable tests from AS.3-TDD (AC: 1)
- [ ] Implement chart data transformation (AC: 1-4)
  - [ ] Update `allocationChartData` computed property
  - [ ] Transform risk groups to chart format
  - [ ] Apply color palette
  - [ ] Handle empty risk groups
- [ ] Define color palette constant (AC: 4)
  - [ ] Create `CHART_COLORS` array
  - [ ] Map colors to risk groups consistently
- [ ] Configure chart options (AC: 6, 7)
  - [ ] Set responsive options
  - [ ] Configure legend position
  - [ ] Implement tooltip callbacks
  - [ ] Format currency in tooltips
- [ ] Update component template (AC: 5, 6)
  - [ ] Pass chart data to `dms-summary-display`
  - [ ] Add chart title
  - [ ] Add "No data" message for empty state
  - [ ] Ensure responsive container
- [ ] Verify all tests pass (AC: 1)
- [ ] Run validation commands

## Dev Notes

### Testing Standards

- **Test Location:** Frontend tests in `apps/dms-material/src/app/**/*.spec.ts`
- **Testing Framework:** Vitest
- **Coverage:** Must achieve >80% coverage
- **Re-enable Tests:** Change `.skip` to active tests from AS.3-TDD

### Technical Context

- Component: `apps/dms-material/src/app/global/global-summary.ts`
- Template: `apps/dms-material/src/app/global/global-summary.html`
- Summary display component: `apps/dms-material/src/app/shared/components/summary-display/`
- Chart library: ng2-charts

### Implementation Details

**Color Palette:**

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

**Chart Data Transformation:**

```typescript
readonly allocationChartData = computed(() => {
  const riskGroups = this.riskGroups$();

  if (!riskGroups || riskGroups.length === 0) {
    return { labels: [], datasets: [{ data: [], backgroundColor: [] }] };
  }

  return {
    labels: riskGroups.map(rg => rg.name),
    datasets: [{
      data: riskGroups.map(rg => rg.percentage),
      backgroundColor: riskGroups.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
    }],
  };
});
```

**Chart Options:**

```typescript
readonly chartOptions: ChartOptions<'pie'> = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      position: 'bottom',
    },
    tooltip: {
      callbacks: {
        label: (context: TooltipItem<'pie'>) => {
          const riskGroups = this.riskGroups$();
          const riskGroup = riskGroups[context.dataIndex];
          const amount = riskGroup.amount.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          });
          return `${context.label}: ${amount} (${riskGroup.percentage}%)`;
        },
      },
    },
  },
};
```

**Template Updates:**

```html
<mat-card class="chart-card">
  <mat-card-header>
    <mat-card-title class="chart-title">Risk Group Allocation</mat-card-title>
  </mat-card-header>
  <mat-card-content>
    @if (isLoading()) {
      <mat-spinner></mat-spinner>
    } @else if (hasError()) {
      <p class="error-message">{{ errorMessage() }}</p>
    } @else if (allocationData.labels.length === 0) {
      <p class="no-data-message">No data available</p>
    } @else {
      <dms-summary-display
        [chartData]="allocationData"
        [chartOptions]="chartOptions"
        chartType="pie"
      />
    }
  </mat-card-content>
</mat-card>
```

**Component Updates:**

- Add `riskGroups$` signal to store risk group array
- Update `allocationChartData` to use `riskGroups$` signal
- Add `chartOptions` property
- Populate `riskGroups$` from API response in service subscription

## Definition of Done

- [ ] All tests from AS.3-TDD re-enabled and passing (GREEN phase)
- [ ] Pie chart displays correctly with real data
- [ ] Colors applied consistently
- [ ] Tooltips formatted with currency
- [ ] Empty state handled gracefully
- [ ] Chart responsive to container size
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
- All tests from AS.3-TDD should pass after implementation
- Build incrementally, running tests frequently
- Focus on making tests green first, then refactor
- Ensure chart is accessible (ARIA labels, keyboard navigation)

## Related Stories

- **Previous:** Story AS.3-TDD (Pie Chart Tests)
- **Next:** Story AS.5-TDD (Month/Year Selector Tests)
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
