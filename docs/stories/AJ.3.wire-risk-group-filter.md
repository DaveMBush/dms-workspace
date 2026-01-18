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

- [ ] Dropdown displays three risk groups + "All" option
- [ ] Selecting risk group filters table data
- [ ] Selecting "All" shows all data
- [ ] Filter persists during editing
- [ ] Table refreshes correctly when filter changes

### Technical Requirements

- [ ] Use existing riskGroupFilter$ signal
- [ ] filteredData$ computed signal already implements filtering
- [ ] Ensure dropdown value binding works correctly
- [ ] Handle null case for "All" option

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

- [ ] Dropdown filters data correctly
- [ ] "All" option shows all data
- [ ] Filter persists during editing
- [ ] Table updates when filter changes
- [ ] All validation commands pass
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

### Status

Not Started

### File List

(To be filled during implementation)

### Completion Notes

(To be filled during implementation)

### Change Log

(To be filled during implementation)
