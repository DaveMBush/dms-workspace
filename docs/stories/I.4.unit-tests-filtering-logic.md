# Story I.4: Unit tests for filtering logic

## Status

Draft

## Story

**As a** development team,
**I want** comprehensive unit tests for the expired-with-positions filtering logic and toggle functionality,
**so that** I can ensure the filtering behaves correctly in all scenarios and regressions are prevented.

## Acceptance Criteria

1. Test expired symbols with open positions (should show by default)
2. Test expired symbols without positions (should hide by default)
3. Test account-specific filtering behavior with mixed portfolios
4. Test performance with large datasets containing many expired symbols
5. Maintain existing test coverage for other filtering functionality
6. Ensure the following commands run without errors:

- `pnpm format`
- `pnpm dupcheck`
- `pnpm nx run rms:test --code-coverage`
- `pnpm nx run server:build:production`
- `pnpm nx run server:test --code-coverage`
- `pnpm nx run server:lint`
- `pnpm nx run rms:lint`
- `pnpm nx run rms:build:production`
- `pnpm nx run rms-e2e:lint`

## Tasks / Subtasks

- [ ] **Task 1: Create unit tests for expired-with-positions filtering core logic** (AC: 1, 2)

  - [ ] Test expired symbols with positions in selected account (should show)
  - [ ] Test expired symbols without positions in selected account (should hide)
  - [ ] Test non-expired symbols (should show regardless of position)
  - [ ] Test edge cases: null expired flag, undefined positions, zero positions
  - [ ] Test filter precedence when explicit expired filter is set

- [ ] **Task 2: Create unit tests for account-specific filtering scenarios** (AC: 3)

  - [ ] Test expired symbols with positions in specific account only
  - [ ] Test expired symbols with positions in different account (should hide for specific selection)
  - [ ] Test "all accounts" scenario with mixed portfolios
  - [ ] Test account switching behavior with cached vs recalculated data
  - [ ] Test multiple accounts with varying position distributions

- [ ] **Task 3: Create performance tests for filtering optimization** (AC: 5)

  - [ ] Test filtering performance with large datasets (1000+ symbols)
  - [ ] Test that position calculations only run for expired symbols
  - [ ] Test memory usage with repeated filtering operations
  - [ ] Compare performance before/after optimization implementation
  - [ ] Test concurrent filtering operations (if applicable)

- [ ] **Task 4: Create integration tests for complete filtering pipeline** (AC: 1, 2, 3, 4)

  - [ ] Test end-to-end filtering from raw data to display
  - [ ] Test filter parameter mapping and precedence hierarchy
  - [ ] Test interaction between expired filtering and other filters (yield, symbol, risk)
  - [ ] Test data flow through service methods to component display
  - [ ] Test error handling and graceful degradation scenarios

- [ ] **Task 6: Maintain and extend existing test coverage** (AC: 6)
  - [ ] Verify no regression in existing filtering tests
  - [ ] Update existing tests affected by new filtering logic
  - [ ] Ensure overall coverage thresholds are maintained (85% lines, 75% branches)
  - [ ] Add missing tests for any uncovered edge cases
  - [ ] Update test data and mocks to include expired symbol scenarios

## Dev Notes

### Previous Story Context

**Dependencies:** Stories I.1, I.2, and I.3 must be completed first, as this story tests all functionality implemented in those stories.

### Testing Architecture and Framework

**Source: [architecture/ci-and-testing.md]**

- **Framework:** Vitest for unit testing with Angular TestBed integration
- **Coverage Thresholds:** Lines: 85%, Branches: 75%, Functions: 85%
- **Test Pattern:** Collocated test files with `.spec.ts` extension
- **Test Data:** Use controlled mock scenarios with consistent test data

**Source: [nx.json - test configuration]**

- Test target: `@nx/vite:test` with coverage reporting
- Test command: `nx run rms:test` for frontend components
- Coverage output: `coverage/apps/rms` directory

### File Locations for Tests

**Test Files to Create/Modify:**

1. `/apps/rms/src/app/global/global-universe/universe-data.service.spec.ts` - Core filtering logic tests
2. `/apps/rms/src/app/global/global-universe/global-universe.component.spec.ts` - Toggle and UI integration tests
3. Performance test utilities (if needed for large dataset testing)

### Technical Implementation Details

**Core Filtering Logic Test Structure:**

```typescript
describe('UniverseDataService - Expired With Positions Filtering', () => {
  let service: UniverseDataService;
  let mockTradeData: Trade[];
  let mockUniverseData: UniverseDisplayData[];

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UniverseDataService);

    // Setup comprehensive mock data
    mockTradeData = createMockTradeData();
    mockUniverseData = createMockUniverseData();
  });

  describe('expired symbols with positions', () => {
    it('should show expired symbols that have open positions', () => {
      // Test implementation
    });

    it('should hide expired symbols without positions', () => {
      // Test implementation
    });

    it('should handle zero position edge case', () => {
      // Test implementation
    });
  });

  describe('account-specific filtering', () => {
    it('should show expired symbols with positions in selected account', () => {
      // Test implementation
    });

    it('should hide expired symbols with positions only in other accounts', () => {
      // Test implementation
    });

    it('should handle "all accounts" scenario correctly', () => {
      // Test implementation
    });
  });
});
```

**Mock Data Creation Utilities:**

```typescript
function createMockUniverseData(): UniverseDisplayData[] {
  return [
    // Non-expired symbols (should always show)
    { symbol: 'AAPL', expired: false, position: 1000 /* other fields */ },
    { symbol: 'MSFT', expired: false, position: 0 /* other fields */ },

    // Expired symbols with positions (should show by default)
    { symbol: 'EXPIRED_WITH_POS', expired: true, position: 500 /* other fields */ },

    // Expired symbols without positions (should hide by default)
    { symbol: 'EXPIRED_NO_POS', expired: true, position: 0 /* other fields */ },

    // Edge cases
    { symbol: 'EXPIRED_NULL', expired: true, position: null /* other fields */ },
    { symbol: 'NULL_EXPIRED', expired: null, position: 1000 /* other fields */ },
  ];
}

function createMockTradeData(): Trade[] {
  return [
    // Open positions (sell_date is null)
    { universeId: 'AAPL', buy: 150, quantity: 10, sell_date: null, accountId: 'account1' },
    { universeId: 'EXPIRED_WITH_POS', buy: 100, quantity: 5, sell_date: null, accountId: 'account1' },

    // Closed positions (sell_date exists)
    { universeId: 'EXPIRED_NO_POS', buy: 50, quantity: 10, sell_date: '2024-01-01', accountId: 'account1' },
  ];
}
```

**Toggle Functionality Test Structure:**

```typescript
describe('GlobalUniverseComponent - Show All Expired Toggle', () => {
  let component: GlobalUniverseComponent;
  let fixture: ComponentFixture<GlobalUniverseComponent>;

  describe('toggle state management', () => {
    it('should initialize with toggle OFF (default behavior)', () => {
      expect(component.showAllExpired()).toBe(false);
    });

    it('should persist toggle state across component lifecycle', () => {
      // Test state persistence
    });

    it('should trigger filter recalculation when toggle changes', () => {
      // Test filter integration
    });
  });

  describe('toggle visibility', () => {
    it('should show toggle when expired symbols exist in dataset', () => {
      // Test conditional visibility
    });

    it('should hide toggle when no expired symbols exist', () => {
      // Test conditional hiding
    });
  });

  describe('filtering behavior', () => {
    it('should use default expired-with-positions logic when toggle OFF', () => {
      component.showAllExpired.set(false);
      // Verify filtering behavior
    });

    it('should show all expired symbols when toggle ON', () => {
      component.showAllExpired.set(true);
      // Verify all expired symbols shown
    });
  });
});
```

**Performance Test Implementation:**

```typescript
describe('Expired Filtering Performance', () => {
  it('should handle large datasets efficiently', () => {
    const largeDataset = createLargeDataset(5000); // 5000 symbols
    const startTime = performance.now();

    const result = service.applyFilters(largeDataset, filterParams);

    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(100); // Should complete in <100ms
    expect(result).toBeDefined();
  });

  it('should only calculate positions for expired symbols', () => {
    const spy = spyOn(service, 'getAccountSpecificData');
    const mixedDataset = createMixedDataset(); // Mix of expired and non-expired

    service.applyFilters(mixedDataset, filterParams);

    // Verify getAccountSpecificData only called for expired symbols
    const expiredSymbols = mixedDataset.filter((item) => item.expired);
    expect(spy).toHaveBeenCalledTimes(expiredSymbols.length);
  });
});
```

**Filter Integration Test Pattern:**

```typescript
describe('Filter Integration and Precedence', () => {
  it('should respect explicit expired filter over default behavior', () => {
    const params = {
      ...defaultParams,
      expiredFilter: true, // Explicit override
    };

    const result = service.applyFilters(mockData, params);

    // Should show all expired symbols regardless of positions
    const expiredSymbols = result.filter((item) => item.expired);
    expect(expiredSymbols.length).toBeGreaterThan(0);
  });

  it('should combine expired filtering with other filters correctly', () => {
    const params = {
      ...defaultParams,
      minYield: 5.0,
      symbolFilter: 'A',
    };

    const result = service.applyFilters(mockData, params);

    // Should apply all filters consistently
    result.forEach((item) => {
      expect(item.yield_percent).toBeGreaterThanOrEqual(5.0);
      expect(item.symbol.toLowerCase()).toContain('a');
      // Plus expired filtering logic
    });
  });
});
```

### Testing Standards

**Source: [architecture/ci-and-testing.md]**

**Testing Framework:** Vitest with TestBed for Angular services and components
**Test Location:** Test files collocated with source files using `.spec.ts` extension
**Coverage Requirements:** Lines: 85%, Branches: 75%, Functions: 85%

**Testing Strategy:**

- **Unit Tests:** Test individual methods and functions with controlled inputs
- **Integration Tests:** Test complete filtering pipeline from data to display
- **Performance Tests:** Validate optimization effectiveness and scalability
- **Edge Case Testing:** Focus on boundary conditions, null values, and error scenarios

**Test Data Management:**

- Create comprehensive mock datasets covering all scenarios
- Use factory functions for consistent test data generation
- Include edge cases: null values, empty arrays, invalid data
- Performance test datasets: large (1000+), medium (100-500), small (10-50)

**Test Coverage Requirements:**

- All new filtering methods must have 85%+ line coverage
- All conditional branches in filtering logic must be tested
- All user interaction scenarios with toggle must be covered
- Performance test execution time limits must be validated

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
