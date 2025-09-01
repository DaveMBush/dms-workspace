# Story I.2: Update default filter behavior

## Status

Draft

## Story

**As a** portfolio manager,  
**I want** the universe display to automatically apply the expired-with-positions filter by default without requiring any user interaction,  
**so that** I see a clean, actionable view of my investments immediately upon loading the application.

## Acceptance Criteria

1. Default universe display automatically excludes expired symbols with no positions
2. No UI changes to existing filter controls (advanced users can still override)
3. Behavior applies consistently across all account selections
4. Performance optimization: avoid position calculations for non-expired symbols
5. Maintain backward compatibility with existing URL parameters and application state
6. Default behavior is immediately active on application load without user configuration

## Tasks / Subtasks

- [ ] **Task 1: Modify default filtering parameters** (AC: 1, 6)

  - [ ] Update default `FilterAndSortParams` to enable expired-with-positions filtering
  - [ ] Ensure `expiredFilter` remains null by default (allowing new logic to activate)
  - [ ] Verify default parameters are applied on component initialization
  - [ ] Test application startup behavior with various data scenarios

- [ ] **Task 2: Update component initialization logic** (AC: 1, 3, 6)

  - [ ] Modify `GlobalUniverseComponent` initialization to use new default behavior
  - [ ] Ensure filtering applies immediately on component load
  - [ ] Verify behavior is consistent across different account selections
  - [ ] Test account switching maintains correct filtering behavior

- [ ] **Task 3: Ensure no UI changes to filter controls** (AC: 2)

  - [ ] Verify existing expired filter toggle remains unchanged
  - [ ] Confirm advanced users can still explicitly set expired filter to true/false
  - [ ] Ensure filter control labels and behavior remain consistent
  - [ ] Document that default behavior can be overridden by explicit filtering

- [ ] **Task 4: Implement performance optimizations** (AC: 4)

  - [ ] Optimize filtering to skip position calculations for non-expired symbols
  - [ ] Add performance monitoring for filter execution time
  - [ ] Consider caching position data during filtering operations
  - [ ] Validate performance impact with realistic datasets

- [ ] **Task 5: Maintain backward compatibility** (AC: 5)

  - [ ] Ensure existing URL parameters for expired filtering continue to work
  - [ ] Verify application state management supports both explicit and default filtering
  - [ ] Test deep links and bookmarked URLs with explicit expired filter settings
  - [ ] Confirm no breaking changes to existing filter API

- [ ] **Task 6: Add comprehensive testing for default behavior** (AC: 1, 3, 6)
  - [ ] Test default filtering on application startup
  - [ ] Test consistency across different account selections
  - [ ] Test interaction between default behavior and explicit filter overrides
  - [ ] Test performance with large datasets containing many expired symbols

## Dev Notes

### Previous Story Context

**Dependencies:** Story I.1 must be completed first, as this story configures the default usage of the filtering logic implemented in I.1.

### Component Architecture and Initialization

**Source: [apps/rms/src/app/global/global-universe/global-universe.component.ts]**

- Component initialization and default parameter setup
- Current filter state management and default values
- Account selection handling and filtering integration

**Source: [Story I.1 Implementation]**

- New expired-with-positions filtering logic in `UniverseDataService.applyFilters()`
- Position calculation optimization for expired symbols only
- Filter precedence hierarchy with explicit override capability

### File Locations

**Primary Files to Modify:**

1. `/apps/rms/src/app/global/global-universe/global-universe.component.ts` - Update default filter parameters
2. `/apps/rms/src/app/global/global-universe/universe-data.service.ts` - Ensure default parameter handling
3. Filter state management files (if separate from component)

**Test Files to Create/Modify:**

1. `/apps/rms/src/app/global/global-universe/global-universe.component.spec.ts` - Test default initialization
2. Integration tests for complete filtering pipeline with defaults

### Technical Implementation Details

**Default Parameter Configuration:**

```typescript
// In GlobalUniverseComponent or similar initialization
private getDefaultFilterParams(): FilterAndSortParams {
  return {
    rawData: this.rawUniverseData(),
    sortCriteria: [],
    minYield: null,
    selectedAccount: this.selectedAccount(),
    symbolFilter: '',
    riskGroupFilter: null,
    expiredFilter: null // Key: null enables expired-with-positions logic
  };
}
```

**Component Initialization Pattern:**

```typescript
ngOnInit() {
  // Existing initialization logic

  // Ensure default filtering is applied immediately
  const defaultParams = this.getDefaultFilterParams();
  this.filteredData.set(this.universeDataService.filterAndSortUniverses(defaultParams));
}
```

**Account Selection Integration:**

```typescript
// When account changes, maintain expired-with-positions default behavior
private onAccountSelectionChange(newAccount: string) {
  const currentParams = this.getCurrentFilterParams();
  const updatedParams = {
    ...currentParams,
    selectedAccount: newAccount,
    // Preserve existing expiredFilter setting (null maintains default behavior)
  };

  this.updateFilteredData(updatedParams);
}
```

**Performance Optimization Strategy:**

- Position calculations only executed for expired symbols
- Early exit for non-expired symbols in filtering logic
- Consider memoization for frequently accessed position data
- Monitor and log performance metrics for large datasets

**Backward Compatibility Considerations:**

- URL parameters that explicitly set `expired=true` or `expired=false` should override defaults
- Saved filter preferences should be preserved and respected
- Existing API contracts maintained for any external filter consumers

**Filter State Management:**

```typescript
interface FilterState {
  // Existing filter properties
  minYield: number | null;
  symbolFilter: string;
  riskGroupFilter: string | null;

  // Expired filter with three states:
  // null = use expired-with-positions default behavior
  // true = show all expired symbols (explicit override)
  // false = hide all expired symbols (explicit override)
  expiredFilter: boolean | null;
}
```

### Testing Standards

**Source: [architecture/ci-and-testing.md]**

**Testing Framework:** Vitest with TestBed for Angular components
**Test Location:** Test files collocated with source files using `.spec.ts` extension
**Coverage Requirements:** Lines: 85%, Branches: 75%, Functions: 85%

**Testing Strategy:**

- **Component Tests:** Test default initialization and filter application
- **Integration Tests:** Test complete filtering pipeline with default behavior
- **Backward Compatibility Tests:** Verify existing URL parameters and state management
- **Performance Tests:** Validate optimization effectiveness with large datasets

**Key Test Scenarios:**

- Component initializes with expired-with-positions filtering active by default
- Account switching maintains correct default filtering behavior
- Explicit expired filter settings override default behavior correctly
- URL parameters with expired filter values work as expected
- Application state management preserves both explicit and default settings
- Performance optimization reduces execution time for large datasets
- Default behavior shows appropriate symbols based on position status

**Test Data Scenarios:**

- Mixed dataset with expired and non-expired symbols
- Expired symbols with positions in various accounts
- Account-specific position distributions
- Large datasets (1000+ symbols) for performance validation

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
