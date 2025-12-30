# Story H.3: Unit tests for yield calculations

## Status

Ready for Review

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
7. Ensure the following commands run without errors:

- `pnpm format`
- `pnpm dupcheck`
- `pnpm nx run dms:test --code-coverage`
- `pnpm nx run server:build:production`
- `pnpm nx run server:test --code-coverage`
- `pnpm nx run server:lint`
- `pnpm nx run dms:lint`
- `pnpm nx run dms:build:production`
- `pnpm nx run dms-e2e:lint`

## Tasks / Subtasks

- [x] **Task 1: Create unit tests for weighted average calculation** (AC: 1, 2)

  - [x] Test multiple trades at different buy prices with different quantities
  - [x] Test single trade scenario (weighted average should equal buy price)
  - [x] Test no open positions (should return 0 or appropriate default)
  - [x] Test all positions sold (open positions array is empty)
  - [x] Test zero quantity scenario (edge case protection)

- [x] **Task 2: Create unit tests for yield percentage calculation** (AC: 3, 5)

  - [x] Test yield calculation with various distribution amounts
  - [x] Test yield calculation with different distributions_per_year values
  - [x] Test divide-by-zero protection when average price is 0
  - [x] Test null/undefined handling for distribution fields
  - [x] Test formatting output (2 decimal places, percentage display)

- [x] **Task 3: Create tests for data service field handling** (AC: 4, 5)

  - [x] Test `getFieldValueFromDisplayData()` with 'avg_purchase_yield_percent' field
  - [x] Test default value returns when field is null/undefined
  - [x] Test field handling in sorting scenarios
  - [x] Test account-specific filtering behavior with new field

- [x] **Task 4: Create tests for sort functionality** (AC: 4)

  - [x] Test sorting by average purchase yield (ascending/descending)
  - [x] Test sort signal computations for new yield column
  - [x] Test multi-column sorting scenarios including both yield columns
  - [x] Test sort icon display logic for average purchase yield

- [x] **Task 5: Create integration tests for complete data flow** (AC: 1, 3)

  - [x] Test end-to-end calculation from trade data to display
  - [x] Test account filtering impact on yield calculations
  - [x] Test switching between accounts and recalculation behavior
  - [x] Test data transformation from selector to component

- [x] **Task 6: Ensure existing test coverage is maintained** (AC: 6)
  - [x] Verify no regression in existing yield calculation tests
  - [x] Update existing tests if interfaces have changed
  - [x] Ensure overall coverage thresholds are met (85% lines, 75% branches)
  - [x] Add missing tests for any uncovered scenarios

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
- Test command: `nx run dms:test` for frontend components
- Coverage output: `coverage/apps/dms` directory

### File Locations for Tests

**Test Files to Create/Modify:**

1. `/apps/dms/src/app/global/global-universe/universe.selector.spec.ts` - Test yield calculations
2. `/apps/dms/src/app/global/global-universe/universe-data.service.spec.ts` - Test field handling and sorting
3. `/apps/dms/src/app/global/global-universe/sort-computed-signals.function.spec.ts` - Test sort signals
4. `/apps/dms/src/app/global/global-universe/global-universe.component.spec.ts` - Test component integration

### Technical Implementation Details

**Mock Trade Data Scenarios:**

```typescript
// Multiple trades at different prices
const mockTrades = [
  { buy: 10.5, quantity: 100, sell_date: null, universeId: 'test-id' },
  { buy: 12.75, quantity: 50, sell_date: null, universeId: 'test-id' },
  { buy: 9.25, quantity: 200, sell_date: null, universeId: 'test-id' },
];
// Expected weighted average: (10.50*100 + 12.75*50 + 9.25*200) / 350 = 10.36

// Single trade scenario
const singleTrade = [{ buy: 15.0, quantity: 100, sell_date: null, universeId: 'test-id' }];
// Expected weighted average: 15.00

// No open positions (all sold)
const soldTrades = [{ buy: 10.0, quantity: 100, sell_date: '2024-01-01', universeId: 'test-id' }];
// Expected: No open positions, avg yield should handle gracefully
```

**Mock Universe Data for Yield Tests:**

```typescript
const mockUniverse = {
  distribution: 0.25,
  distributions_per_year: 4,
  last_price: 12.5,
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

| Date       | Version | Description            | Author           |
| ---------- | ------- | ---------------------- | ---------------- |
| 2024-08-30 | 1.0     | Initial story creation | Scrum Master Bob |

## Dev Agent Record

_This section will be populated by the development agent during implementation_

### Agent Model Used

Sonnet 4 (claude-sonnet-4-20250514)

### Debug Log References

N/A - No debug issues encountered during implementation

### Completion Notes List

- All 6 tasks completed successfully with comprehensive test coverage
- Created new test file: `sort-computed-signals.function.spec.ts` for sort functionality
- Created new test file: `global-universe.component.spec.ts` for integration tests
- Enhanced existing test file: `universe-data.service.spec.ts` with weighted average and yield calculation tests
- All acceptance criteria commands pass: format, dupcheck, lint, build, and test commands
- Fixed all ESLint violations including import sorting and duplicate string literals
- Tests cover edge cases: zero quantities, sold positions, null distributions, division by zero protection
- Integration tests verify complete data flow from trades through selectors to display
- Sort functionality tests ensure proper signal computation and icon display logic

### File List

**Files Modified:**

- `docs/stories/H.3.unit-tests-yield-calculations.md` - Updated story status and task completion
- `apps/dms/src/app/global/global-universe/universe-data.service.spec.ts` - Enhanced with weighted average and yield calculation tests

**Files Created:**

- `apps/dms/src/app/global/global-universe/sort-computed-signals.function.spec.ts` - Sort functionality tests
- `apps/dms/src/app/global/global-universe/global-universe.component.spec.ts` - Integration tests for complete data flow

## QA Results

_Results from QA Agent review will be populated here after implementation_
