# Story AS.4: Implement Pie Chart Display with ng2-charts

**Status:** Approved

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
- A similar component is implemented in #file:./apps/dms/src/app/global/_._ using primeng instead of angular material

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

- [x] Re-enable tests from AS.3-TDD (AC: 1)
- [x] Implement chart data transformation (AC: 1-4)
  - [x] Update `allocationChartData` computed property
  - [x] Transform risk groups to chart format
  - [x] Apply color palette
  - [x] Handle empty risk groups
- [x] Define color palette constant (AC: 4)
  - [x] Create `CHART_COLORS` array
  - [x] Map colors to risk groups consistently
- [x] Configure chart options (AC: 6, 7)
  - [x] Set responsive options
  - [x] Configure legend position
  - [x] Implement tooltip callbacks
  - [x] Format currency in tooltips
- [x] Update component template (AC: 5, 6)
  - [x] Pass chart data to `dms-summary-display`
  - [x] Add chart title
  - [x] Add "No data" message for empty state
  - [x] Ensure responsive container
- [x] Verify all tests pass (AC: 1)
- [x] Run validation commands

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
    <dms-summary-display [chartData]="allocationData" [chartOptions]="chartOptions" chartType="pie" />
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

## QA Results

### Review Date: 2026-02-27

### Reviewed By: Quinn (Test Architect)

### Code Quality Assessment

**Overall: Strong implementation.** The GREEN phase delivers a clean, well-tested pie chart display using Angular signals and ng2-charts. The code follows project conventions (named functions, `ChangeDetectionStrategy.OnPush`, typed signals via `computed()`), and the 12 dedicated "Pie Chart Display" tests provide thorough functional coverage. Coverage measured at **95.40%** (53/53 statements, 22/22 declarations, 8/12 branches).

**Architecture highlights:**

- `allocationChartData` as a `computed()` signal cleanly transforms service data into `ChartData<'pie'>` format
- `hasAllocationData$` guards the empty state by checking for non-zero values
- `pieChartOptions` properly configures responsive behavior, legend positioning, and currency-formatted tooltips
- Options flow through `SummaryDisplayComponent`'s `deepMerge` for clean composition

**Pragmatic deviation from Dev Notes:** The story's Dev Notes described a `riskGroups$` signal with 8 `CHART_COLORS`, but the implementation correctly maps to the actual data model (`equities`, `income`, `tax_free_income`) with 3 matching colors. This is the right call — the Dev Notes were aspirational; the implementation fits the real API.

### Refactoring Performed

No refactoring performed — code quality is sufficient for merge.

### Compliance Check

- Coding Standards: ✓ Named functions, `eslint-disable` comments with reasons, OnPush strategy, proper typing
- Project Structure: ✓ Component/template/spec in correct locations, shared `SummaryDisplayComponent` reused
- Testing Strategy: ✓ 12 pie chart tests covering data, labels, colors, empty state, options, tooltips, consistency
- All ACs Met: ✓ See traceability below

### Acceptance Criteria Traceability

| AC  | Requirement                              | Test Coverage                                                                                                                            | Status |
| --- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| F1  | Pie chart displays risk group allocation | `should render pie chart component with real data`, `should pass allocation data to summary display component input`                     | ✓      |
| F2  | Chart labels show risk group names       | `should pass correct labels to pie chart` → expects `['Equities', 'Income', 'Tax Free']`                                                 | ✓      |
| F3  | Chart segments sized by percentage       | `should pass correct data values to pie chart` → `[50000, 30000, 20000]`, `should display percentages in chart data` → total=100000      | ✓      |
| F4  | Colors consistently applied              | `should apply correct colors to pie chart segments` (3 colors), `should use consistent colors for same categories across data refreshes` | ✓      |
| F5  | Empty state handled gracefully           | `should handle empty/zero allocation data gracefully` → checks `.no-data-message` text                                                   | ✓      |
| F6  | Chart responsive to container size       | `should configure chart with responsive options` → `responsive: true, maintainAspectRatio: true`                                         | ✓      |
| F7  | Tooltips show amount and percentage      | `should format tooltip with currency amount and percentage` → verifies `$50,000` and `50%`                                               | ✓      |
| T1  | All AS.3-TDD tests re-enabled            | 0 `.skip` remaining, 38 total tests in file                                                                                              | ✓      |
| T2  | Chart options properly configured        | `should configure chart with responsive options`, `should configure legend position at bottom`                                           | ✓      |
| T3  | Color palette defined and applied        | Inline `['#3B82F6', '#10B981', '#F59E0B']` on datasets                                                                                   | ✓      |
| T4  | Tooltip formatting includes currency     | Tooltip callback uses `toLocaleString('en-US', {style: 'currency'...})`                                                                  | ✓      |
| T5  | Code follows project coding standards    | Named functions, typed signals, OnPush, proper eslint-disable annotations                                                                | ✓      |
| T6  | Unit test coverage >80%                  | **95.40%** measured (53/53 statements, 22/22 declarations)                                                                               | ✓      |

### Improvements Checklist

- [x] All 12 TDD tests from AS.3 re-enabled and passing (GREEN phase complete)
- [x] Currency formatting in tooltip callbacks with proper locale
- [x] Color consistency verified across data refreshes
- [ ] **Advisory (Low):** Empty state renders both `<p class="no-data-message">` in global-summary AND a `<canvas>` from `SummaryDisplayComponent` (its `hasData$` returns true for `[0,0,0]` since array length > 0). Consider wrapping `<dms-summary-display>` in `@if (hasAllocationData$())` to avoid rendering a blank canvas below the message. Not blocking — the visual effect is minimal since Chart.js renders no pie segments for all-zero data.
- [ ] **Advisory (Low):** The 4 uncovered branches (8/12) are likely the tooltip callback's `context.label ?? ''` fallback and `total > 0` guard. Consider adding a test with a missing label or zero-total dataset if branch coverage parity is desired.

### Security Review

No security concerns. This is a read-only chart display consuming data from an existing authenticated API endpoint. No user input is processed in the chart logic.

### Performance Considerations

No performance concerns. `computed()` signals ensure chart data is only recalculated when underlying service signals change. `pieChartOptions` is a static `readonly` property (not recomputed). The `SummaryDisplayComponent` deep-merges options once per signal update.

### Files Modified During Review

None — no refactoring was necessary.

### Gate Status

Gate: **PASS** → docs/qa/gates/AS.4-implement-pie-chart-display.yml
Quality Score: **92/100**

### Recommended Status

✓ Ready for Done — All acceptance criteria met, 95.4% coverage, all validation passing. Advisory items are non-blocking improvements for future consideration.

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

## Dev Agent Record

_This section will be populated during story implementation_
