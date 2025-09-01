# Story I.3: Add optional toggle for "Show All Expired"

## Status

Draft

## Story

**As a** portfolio manager and advanced user,  
**I want** an optional toggle control to show all expired symbols regardless of position status,  
**so that** I can access complete historical data and perform comprehensive analysis when needed.

## Acceptance Criteria

1. Add checkbox/toggle "Show All Expired" to filter panel in universe component
2. Default state: unchecked (expired symbols hidden unless positions - maintaining I.2 behavior)
3. When checked: show all expired symbols regardless of positions (overrides default filtering)
4. State persistence using existing filter state management system
5. Clear labeling and tooltip to explain behavior to users
6. Only visible when there are expired symbols in the current dataset

## Tasks / Subtasks

- [ ] **Task 1: Add toggle UI control to filter panel** (AC: 1, 5)

  - [ ] Add "Show All Expired" checkbox to existing filter controls in `global-universe.component.html`
  - [ ] Position logically with other filter controls (near existing filters)
  - [ ] Add clear label and explanatory tooltip text
  - [ ] Style consistently with existing PrimeNG filter components

- [ ] **Task 2: Implement toggle state management** (AC: 2, 4)

  - [ ] Add `showAllExpired` signal to component state management
  - [ ] Initialize with default value of false (maintaining new default behavior from I.2)
  - [ ] Integrate with existing filter state persistence system
  - [ ] Ensure state survives component refreshes and navigation

- [ ] **Task 3: Connect toggle to filtering logic** (AC: 2, 3)

  - [ ] Update filter parameter mapping to handle showAllExpired toggle
  - [ ] When toggle is OFF: use expired-with-positions default behavior (from I.1/I.2)
  - [ ] When toggle is ON: set expiredFilter to true (show all expired symbols)
  - [ ] Ensure proper integration with existing filter precedence hierarchy

- [ ] **Task 4: Implement conditional visibility** (AC: 6)

  - [ ] Add logic to show/hide toggle based on presence of expired symbols in dataset
  - [ ] Calculate expired symbol count efficiently without impacting performance
  - [ ] Update visibility when dataset changes (account switching, other filters)
  - [ ] Ensure smooth UI transitions when toggle appears/disappears

- [ ] **Task 5: Add toggle interaction handling** (AC: 3)

  - [ ] Implement click/change event handler for toggle state
  - [ ] Trigger filter recalculation when toggle state changes
  - [ ] Ensure immediate UI update when toggle is activated/deactivated
  - [ ] Add proper TypeScript typing for toggle state and events

- [ ] **Task 6: Create comprehensive tests for toggle functionality** (AC: 1, 2, 3, 6)
  - [ ] Test toggle UI rendering and initial state
  - [ ] Test toggle state persistence across component lifecycle
  - [ ] Test filtering behavior when toggle is on/off
  - [ ] Test conditional visibility based on expired symbol presence
  - [ ] Test interaction with existing filter controls

## Dev Notes

### Previous Story Context

**Dependencies:** Stories I.1 and I.2 must be completed first, as this story provides user control over the filtering logic implemented in those stories.

### UI Component Architecture

**Source: [apps/rms/src/app/global/global-universe/global-universe.component.html]**

- Existing filter controls layout and styling patterns
- PrimeNG component usage (p-checkbox, tooltips, styling)
- Current filter panel structure and organization

**Source: [Story I.1 and I.2 Implementation]**

- Expired-with-positions filtering logic in `UniverseDataService`
- Filter parameter structure and precedence hierarchy
- Default filtering behavior and explicit override mechanisms

### File Locations

**Primary Files to Modify:**

1. `/apps/rms/src/app/global/global-universe/global-universe.component.html` - Add toggle UI
2. `/apps/rms/src/app/global/global-universe/global-universe.component.ts` - Add state management
3. `/apps/rms/src/app/global/global-universe/global-universe.component.scss` - Styling if needed
4. Filter state interfaces (if separate from component)

**Test Files to Create/Modify:**

1. `/apps/rms/src/app/global/global-universe/global-universe.component.spec.ts` - Test toggle functionality
2. Integration tests for complete filter interaction scenarios

### Technical Implementation Details

**Toggle UI Implementation:**

```html
<!-- Add to existing filter panel in global-universe.component.html -->
<div class="filter-control" *ngIf="hasExpiredSymbols()">
  <p-checkbox binary="true" [(ngModel)]="showAllExpired" (onChange)="onShowAllExpiredChange($event)" inputId="showAllExpired" [disabled]="isLoading()" />
  <label for="showAllExpired" class="filter-label">
    Show All Expired
    <i class="pi pi-info-circle" pTooltip="When checked, shows all expired symbols regardless of position status. Unchecked shows only expired symbols with open positions." tooltipPosition="top"> </i>
  </label>
</div>
```

**State Management:**

```typescript
// Add to GlobalUniverseComponent
showAllExpired = signal(false); // Default to false (maintain I.2 behavior)

// State persistence integration
private saveFilterState() {
  const filterState = {
    // Existing filter state properties
    showAllExpired: this.showAllExpired()
  };
  // Save to localStorage or state management system
}

private loadFilterState() {
  // Load from localStorage or state management system
  const savedState = this.getStoredFilterState();
  if (savedState?.showAllExpired !== undefined) {
    this.showAllExpired.set(savedState.showAllExpired);
  }
}
```

**Filter Integration Logic:**

```typescript
private getFilterParams(): FilterAndSortParams {
  return {
    rawData: this.rawUniverseData(),
    sortCriteria: this.sortCriteria(),
    minYield: this.minYield(),
    selectedAccount: this.selectedAccount(),
    symbolFilter: this.symbolFilter(),
    riskGroupFilter: this.riskGroupFilter(),
    // Toggle control: when ON, explicitly show all expired; when OFF, use default logic
    expiredFilter: this.showAllExpired() ? true : null
  };
}

onShowAllExpiredChange(event: any) {
  this.showAllExpired.set(event.checked);
  this.applyFilters();
  this.saveFilterState();
}
```

**Conditional Visibility Logic:**

```typescript
hasExpiredSymbols = computed(() => {
  const rawData = this.rawUniverseData();
  return rawData.some((item) => item.expired === true);
});
```

**Filter Precedence with Toggle:**

- Toggle OFF (`showAllExpired = false`): `expiredFilter = null` → Use expired-with-positions logic
- Toggle ON (`showAllExpired = true`): `expiredFilter = true` → Show all expired symbols
- Explicit URL/state override: Takes precedence over toggle setting

**Styling Considerations:**

```scss
.filter-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem 0;

  .filter-label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-weight: 500;
  }

  .pi-info-circle {
    color: var(--text-color-secondary);
    cursor: help;
  }
}
```

**Performance Considerations:**

- `hasExpiredSymbols()` computed signal updates efficiently when data changes
- Toggle visibility calculation should not impact main filtering performance
- Consider memoization if expired symbol check becomes expensive

**User Experience Design:**

- Clear, descriptive labeling explains what the toggle does
- Tooltip provides additional context for new users
- Toggle positioned logically with other filter controls
- Immediate feedback when toggle state changes
- State persistence reduces need to reconfigure on each visit

### Testing Standards

**Source: [architecture/ci-and-testing.md]**

**Testing Framework:** Vitest with TestBed for Angular components
**Test Location:** Test files collocated with source files using `.spec.ts` extension
**Coverage Requirements:** Lines: 85%, Branches: 75%, Functions: 85%

**Testing Strategy:**

- **Component Tests:** Test UI rendering, toggle interactions, state management
- **Integration Tests:** Test filtering behavior with toggle in various states
- **User Interaction Tests:** Test complete user workflows with toggle
- **State Persistence Tests:** Verify toggle state survives component lifecycle

**Key Test Scenarios:**

- Toggle renders only when expired symbols are present in dataset
- Toggle initializes with correct default state (unchecked)
- Toggle state changes correctly trigger filter recalculation
- Filtering behavior is correct when toggle is on/off
- Toggle state persists across component refresh and navigation
- Toggle integrates correctly with existing filter controls
- Tooltip displays helpful information
- Toggle handles loading/disabled states appropriately

**Test Data Requirements:**

- Datasets with expired symbols (for toggle visibility)
- Datasets without expired symbols (for toggle hiding)
- Mixed datasets with expired symbols having various position statuses
- Account scenarios for testing interaction with expired-with-positions logic

**Mock Scenarios:**

- Various expired symbol counts and position combinations
- State persistence service interactions
- Filter state management system integration
- User interaction events (click, change)

## Change Log

| Date       | Version | Description            | Author           |
| ---------- | ------- | ---------------------- | ---------------- |
| 2024-08-30 | 1.0     | Initial story creation | Scrum Master Bob |

## Dev Agent Record

_This section will be populated by the development agent during implementation_

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_

## QA Results

_Results from QA Agent review will be populated here after implementation_
