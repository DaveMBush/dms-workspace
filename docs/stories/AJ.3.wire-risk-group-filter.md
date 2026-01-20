# Story AJ.3: Wire Up Risk Group Filter Dropdown

## Story

**As a** user
**I want** to filter screener data by risk group
**So that** I can focus on specific categories of securities

## Context

**Current State:**

- Table displays and edits screen data (Stories AJ.1, AJ.2 complete)
- Risk group dropdown exists in UI but not fully wired
- Filter is managed by riskGroupFilter$ signal

**Enhancement Goal:**

- Wire dropdown to filter displayed data
- Maintain filter state while editing
- Clear filter when "All" is selected
- Match DMS app implementation pattern

**Reference Implementation:**

- DMS app: apps/dms/src/app/global/screener/screener.ts (selectedRiskGroup and filteredScreenerData$)

## Acceptance Criteria

### Functional Requirements

- [x] Dropdown displays three risk groups + "All" option
- [x] Selecting risk group filters table data
- [x] Selecting "All" shows all data
- [x] Filter persists during editing
- [x] Table refreshes correctly when filter changes

### Technical Requirements

- [x] Use existing riskGroupFilter$ signal
- [x] filteredData$ computed signal already implements filtering
- [x] Ensure dropdown value binding works correctly
- [x] Handle null case for "All" option

## Implementation Details

### Risk Group Data

Risk groups are already defined in component:

```typescript
readonly riskGroups = [
  { label: 'Equities', value: 'Equities' },
  { label: 'Income', value: 'Income' },
  { label: 'Tax Free Income', value: 'Tax Free Income' },
];
```

### Filter Logic

The filteredData$ computed signal already implements filtering:

```typescript
readonly filteredData$ = computed(() => {
  const screens = this.screenerService.screens();
  const riskGroupFilter = this.riskGroupFilter$();

  if (riskGroupFilter === null) {
    return screens;
  }

  return screens.filter(function filterByRiskGroup(row) {
    return row.risk_group === riskGroupFilter;
  });
});
```

### Dropdown Event Handler

Ensure `onRiskGroupFilterChange` method works correctly:

```typescript
onRiskGroupFilterChange(value: string | null): void {
  this.riskGroupFilter$.set(value);
  this.refreshTable();
}
```

### Template Binding

Verify dropdown in template is properly bound:

```html
<mat-form-field>
  <mat-label>Risk Group</mat-label>
  <mat-select [value]="riskGroupFilter$()" (selectionChange)="onRiskGroupFilterChange($event.value)">
    <mat-option [value]="null">All</mat-option>
    <mat-option *ngFor="let group of riskGroups" [value]="group.value"> {{ group.label }} </mat-option>
  </mat-select>
</mat-form-field>
```

## Definition of Done

- [x] Dropdown filters data correctly
- [x] "All" option shows all data
- [x] Filter persists during editing
- [x] Table updates when filter changes
- [x] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Testing Strategy

- Manual testing: Select each risk group, verify filtering
- Manual testing: Select "All", verify all data shows
- Manual testing: Edit while filtered, verify filter persists
- Visual comparison: Compare with DMS app behavior

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Status

Ready for Review

### File List

- apps/dms-material/src/app/global/global-screener/global-screener.component.ts
- apps/dms-material/src/app/global/global-screener/global-screener.component.html

### Completion Notes

- Story was already fully implemented prior to gate review
- Risk group filter dropdown is properly wired with riskGroupFilter$ signal
- filteredData$ computed signal handles filtering logic correctly
- All acceptance criteria verified and passing
- All validation commands passed successfully (pnpm all, e2e tests, dupcheck, format)
- QA gate review: PASS

### Change Log

- 2026-01-19: Verified existing implementation meets all requirements
- 2026-01-19: All validation tests passed
- 2026-01-19: QA gate created and marked as PASS
- 2026-01-19: Story marked Ready for Review

## QA Results

### Review Date: 2026-01-19

### Reviewed By: Quinn (Test Architect)

### Gate Status

Gate: PASS → docs/qa/gates/AJ.3-wire-risk-group-filter.yml
