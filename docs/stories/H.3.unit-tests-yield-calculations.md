# Story H.3: Unit tests for yield calculations

## Status
Draft

## Story
**As a** development team,  
**I want** comprehensive unit tests for the average purchase price yield calculations,  
**so that** I can ensure the calculations are accurate and handle edge cases properly.

## Acceptance Criteria

1. Test weighted average calculation with multiple trades at different prices
2. Test edge cases: no open positions, single trade, all positions sold
3. Test yield calculation with various distribution scenarios  
4. Test sort functionality for new yield column
5. Test display formatting and null handling
6. Maintain existing test coverage for original yield calculations

## Tasks / Subtasks

- [ ] **Task 1: Create unit tests for weighted average calculation** (AC: 1, 2)
  - [ ] Test multiple trades at different buy prices with different quantities
  - [ ] Test single trade scenario (weighted average should equal buy price)
  - [ ] Test no open positions (should return 0 or appropriate default)
  - [ ] Test all positions sold (open positions array is empty)
  - [ ] Test zero quantity scenario (edge case protection)

- [ ] **Task 2: Create unit tests for yield percentage calculation** (AC: 3, 5)
  - [ ] Test yield calculation with various distribution amounts
  - [ ] Test yield calculation with different distributions_per_year values
  - [ ] Test divide-by-zero protection when average price is 0
  - [ ] Test null/undefined handling for distribution fields
  - [ ] Test formatting output (2 decimal places, percentage display)

- [ ] **Task 3: Create tests for data service field handling** (AC: 4, 5)
  - [ ] Test `getFieldValueFromDisplayData()` with 'avg_purchase_yield_percent' field
  - [ ] Test default value returns when field is null/undefined
  - [ ] Test field handling in sorting scenarios
  - [ ] Test account-specific filtering behavior with new field

- [ ] **Task 4: Create tests for sort functionality** (AC: 4)
  - [ ] Test sorting by average purchase yield (ascending/descending)
  - [ ] Test sort signal computations for new yield column
  - [ ] Test multi-column sorting scenarios including both yield columns
  - [ ] Test sort icon display logic for average purchase yield

- [ ] **Task 5: Create integration tests for complete data flow** (AC: 1, 3)
  - [ ] Test end-to-end calculation from trade data to display
  - [ ] Test account filtering impact on yield calculations
  - [ ] Test switching between accounts and recalculation behavior
  - [ ] Test data transformation from selector to component

- [ ] **Task 6: Ensure existing test coverage is maintained** (AC: 6)
  - [ ] Verify no regression in existing yield calculation tests
  - [ ] Update existing tests if interfaces have changed
  - [ ] Ensure overall coverage thresholds are met (85% lines, 75% branches)
  - [ ] Add missing tests for any uncovered scenarios

## Dev Notes

### Previous Story Context
**Dependencies:** Stories H.1 and H.2 must be completed first, as this story tests the functionality implemented in those stories.

### Testing Architecture and Framework
**Source: [architecture/ci-and-testing.md]**
- **Framework:** Vitest for unit testing with Angular/TestBed integration
- **Coverage Thresholds:** Lines: 85%, Branches: 75%, Functions: 85%
- **Test Pattern:** Collocated test files with `.spec.ts` extension
- **Test Data:** Use per-test scenarios with consistent mock data

**Source: [nx.json - test configuration]**
- Test target: `@nx/vite:test` with coverage reporting
- Test command: `nx run rms:test` for frontend components
- Coverage output: `coverage/apps/rms` directory

### File Locations for Tests
**Test Files to Create/Modify:**
1. `/apps/rms/src/app/global/global-universe/universe.selector.spec.ts` - Test yield calculations
2. `/apps/rms/src/app/global/global-universe/universe-data.service.spec.ts` - Test field handling and sorting
3. `/apps/rms/src/app/global/global-universe/sort-computed-signals.function.spec.ts` - Test sort signals
4. `/apps/rms/src/app/global/global-universe/global-universe.component.spec.ts` - Test component integration

### Technical Implementation Details

**Mock Trade Data Scenarios:**
```typescript
// Multiple trades at different prices
const mockTrades = [
  { buy: 10.50, quantity: 100, sell_date: null, universeId: 'test-id' },
  { buy: 12.75, quantity: 50, sell_date: null, universeId: 'test-id' },
  { buy: 9.25, quantity: 200, sell_date: null, universeId: 'test-id' }
];
// Expected weighted average: (10.50*100 + 12.75*50 + 9.25*200) / 350 = 10.36

// Single trade scenario
const singleTrade = [
  { buy: 15.00, quantity: 100, sell_date: null, universeId: 'test-id' }
];
// Expected weighted average: 15.00

// No open positions (all sold)
const soldTrades = [
  { buy: 10.00, quantity: 100, sell_date: '2024-01-01', universeId: 'test-id' }
];
// Expected: No open positions, avg yield should handle gracefully
```

**Mock Universe Data for Yield Tests:**
```typescript
const mockUniverse = {
  distribution: 0.25,
  distributions_per_year: 4,
  last_price: 12.50,
  // ... other fields
};
// Expected market yield: 100 * 4 * (0.25 / 12.50) = 8.00%
// Expected avg purchase yield (price 10.36): 100 * 4 * (0.25 / 10.36) = 9.65%
```

**Test Patterns to Follow:**
- Use `describe()` blocks to group related tests
- Use `beforeEach()` to set up consistent test data
- Use `it()` with descriptive test names
- Mock external dependencies (services, HTTP calls)
- Test both success and error scenarios

**Edge Cases to Test:**
- Division by zero protection
- Null/undefined field handling
- Empty arrays and collections
- Invalid or negative values
- Account switching scenarios
- Large numbers and precision handling

### Testing Standards
**Source: [architecture/ci-and-testing.md]**

**Unit Test Focus Areas:**
- Pure calculation logic (weighted averages, yield percentages)
- Data transformation and formatting
- Edge case handling and error scenarios
- Service method behavior and return values

**Integration Test Focus Areas:**
- Complete data flow from trades to display
- Account filtering impact on calculations
- Component-service interactions
- Sort functionality end-to-end

**Test Data Management:**
- Use factory functions for creating consistent test data
- Maintain separation between unit and integration test data
- Keep test data minimal but representative
- Use realistic financial values for accuracy validation

**Performance Considerations:**
- Test with large datasets to ensure calculation performance
- Validate memory usage with extensive trade histories
- Test concurrent calculation scenarios if applicable

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2024-08-30 | 1.0 | Initial story creation | Scrum Master Bob |

## Dev Agent Record
*This section will be populated by the development agent during implementation*

### Agent Model Used
*To be filled by dev agent*

### Debug Log References  
*To be filled by dev agent*

### Completion Notes List
*To be filled by dev agent*

### File List
*To be filled by dev agent*

## QA Results
*Results from QA Agent review will be populated here after implementation*