# Story I.5: Integration testing and validation

## Status

Draft

## Story

**As a** development team and quality assurance team,
**I want** comprehensive integration testing that validates the complete expired symbol filtering system works correctly across all user scenarios and data conditions,
**so that** I can confidently deploy the feature without risking data integrity or user experience issues.

## Acceptance Criteria

1. Verify default behavior hides expired symbols without positions across all data scenarios
2. Test account switching with mixed expired/active portfolios maintains correct filtering
3. Validate toggle functionality works correctly in different account contexts
4. Ensure no data loss or corruption of expired records during filtering operations
5. Test with realistic datasets including symbols with dividend history and complex trade patterns
6. Performance validation with large numbers of expired symbols (1000+ symbols)
7. Ensure the following commands run without errors:

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

- [ ] **Task 1: Create end-to-end integration tests for default filtering behavior** (AC: 1)

  - [ ] Test application startup with various expired symbol scenarios
  - [ ] Verify expired symbols without positions are hidden by default
  - [ ] Test filtering consistency across component refreshes and navigation
  - [ ] Validate data integrity: no symbols lost, no incorrect position calculations
  - [ ] Test with edge cases: all expired symbols, no expired symbols, mixed scenarios

- [ ] **Task 2: Create account switching integration tests** (AC: 2)

  - [ ] Test switching between accounts with different expired symbol portfolios
  - [ ] Verify position calculations update correctly for each account
  - [ ] Test "all accounts" view with expired symbols having positions in various accounts
  - [ ] Validate smooth UI transitions and data loading during account changes
  - [ ] Test account-specific filtering with complex multi-account trade scenarios

- [ ] **Task 3: Create toggle integration tests across account contexts** (AC: 3)

  - [ ] Test "Show All Expired" toggle behavior in single account view
  - [ ] Test toggle behavior in "all accounts" view
  - [ ] Verify toggle state persistence across account switching
  - [ ] Test toggle visibility updates when switching between accounts with/without expired symbols
  - [ ] Validate toggle interaction with URL parameters and deep linking

- [ ] **Task 4: Create data integrity validation tests** (AC: 4)

  - [ ] Verify no expired records are deleted or modified during filtering
  - [ ] Test database queries maintain proper indexing and performance
  - [ ] Validate position calculations don't mutate original trade data
  - [ ] Test concurrent user scenarios (if applicable) don't corrupt filtered results
  - [ ] Ensure historical dividend data remains accessible for expired symbols

- [ ] **Task 5: Create realistic dataset integration tests** (AC: 5)

  - [ ] Test with real-world dividend distribution patterns and frequencies
  - [ ] Validate complex trade scenarios: partial sells, multiple buy/sell cycles
  - [ ] Test symbols that expired while having active dividend payments
  - [ ] Verify correct handling of symbols with gaps in trade history
  - [ ] Test filtering with symbols having various ex-date patterns

- [ ] **Task 6: Create performance validation and load testing** (AC: 6)
  - [ ] Test filtering performance with 1000+ expired symbols
  - [ ] Validate UI responsiveness during large dataset filtering
  - [ ] Test memory usage patterns with repeated filtering operations
  - [ ] Benchmark filtering performance before/after implementation
  - [ ] Test concurrent filtering operations and user interactions

## Dev Notes

### Previous Story Context

**Dependencies:** Stories I.1, I.2, I.3, and I.4 must be completed first, as this story provides comprehensive validation of all implemented functionality.

### Integration Testing Architecture

**Source: [architecture/ci-and-testing.md]**

- **Framework:** Vitest with Angular TestBed for component integration testing
- **End-to-End:** Consider Playwright or Cypress for full application testing
- **Performance:** Use performance.now() and memory profiling tools
- **Database Testing:** Integration with actual database queries and indexing

**Source: [Epic I Technical Context]**

- Database: `universe.expired` boolean flag with existing index
- Performance: Leverage existing index, optimize position calculations
- Data integrity: Historical dividends and trade records must remain intact

### File Locations for Integration Tests

**Test Files to Create/Modify:**

1. `/apps/rms/src/app/global/global-universe/integration/universe-filtering.integration.spec.ts` - Main integration tests
2. `/apps/rms/src/app/global/global-universe/integration/performance.integration.spec.ts` - Performance testing
3. Integration test utilities and mock data generators
4. End-to-end test scenarios (if using Cypress/Playwright)

### Technical Implementation Details

**Integration Test Structure:**

```typescript
describe('Epic I Integration: Universe Display Filtering', () => {
  let component: GlobalUniverseComponent;
  let fixture: ComponentFixture<GlobalUniverseComponent>;
  let universeDataService: UniverseDataService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // Full component setup with real dependencies
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalUniverseComponent);
    component = fixture.componentInstance;
    universeDataService = TestBed.inject(UniverseDataService);
  });

  describe('Default Filtering Behavior Integration', () => {
    it('should hide expired symbols without positions on application startup', async () => {
      // Setup realistic data scenario
      const mockData = createRealisticDataset();
      component.rawUniverseData.set(mockData);

      // Trigger component initialization
      fixture.detectChanges();
      await fixture.whenStable();

      // Verify filtering results
      const displayedData = component.filteredData();
      const expiredWithoutPositions = mockData.filter((item) => item.expired && item.position <= 0);

      expiredWithoutPositions.forEach((item) => {
        expect(displayedData.find((d) => d.symbol === item.symbol)).toBeUndefined();
      });
    });

    it('should maintain filtering consistency across component lifecycle', async () => {
      // Test component refresh, navigation, data updates
    });
  });

  describe('Account Switching Integration', () => {
    it('should update filtering correctly when switching accounts', async () => {
      const multiAccountData = createMultiAccountDataset();
      component.rawUniverseData.set(multiAccountData);

      // Test account 1
      component.selectedAccount.set('account1');
      fixture.detectChanges();
      await fixture.whenStable();

      const account1Results = [...component.filteredData()];

      // Test account 2
      component.selectedAccount.set('account2');
      fixture.detectChanges();
      await fixture.whenStable();

      const account2Results = [...component.filteredData()];

      // Verify results are different and account-specific
      expect(account1Results).not.toEqual(account2Results);
      // Add specific validation for expired symbol visibility per account
    });

    it('should handle "all accounts" view correctly', async () => {
      // Test comprehensive multi-account filtering
    });
  });

  describe('Toggle Integration Across Contexts', () => {
    it('should work correctly in single account context', async () => {
      // Setup and test toggle functionality
    });

    it('should persist state across account changes', async () => {
      // Test state persistence during account switching
    });
  });
});
```

**Realistic Data Generation:**

```typescript
function createRealisticDataset(): UniverseDisplayData[] {
  return [
    // Active dividend-paying stocks
    {
      symbol: 'AAPL',
      expired: false,
      position: 1000,
      distribution: 0.25,
      distributions_per_year: 4,
      last_price: 150,
      yield_percent: 0.67,
      ex_date: new Date('2024-12-15'),
      riskGroup: 'Large Cap',
    },

    // Expired symbol with positions (should show)
    {
      symbol: 'OLD_REIT',
      expired: true,
      position: 500,
      distribution: 0.15,
      distributions_per_year: 12,
      last_price: 25,
      yield_percent: 7.2,
      ex_date: new Date('2024-06-15'),
      riskGroup: 'REIT',
    },

    // Expired symbol without positions (should hide by default)
    {
      symbol: 'CLOSED_FUND',
      expired: true,
      position: 0,
      distribution: 0.08,
      distributions_per_year: 4,
      last_price: 12,
      yield_percent: 2.67,
      ex_date: new Date('2024-03-15'),
      riskGroup: 'Closed Fund',
    },

    // Complex scenario: expired symbol with historical dividends
    {
      symbol: 'HISTORICAL_DIVIDEND',
      expired: true,
      position: 0,
      distribution: 0.2,
      distributions_per_year: 6,
      last_price: 18,
      yield_percent: 6.67,
      ex_date: new Date('2024-01-15'),
      riskGroup: 'BDC',
    },
  ];
}

function createMultiAccountDataset(): {
  universeData: UniverseDisplayData[];
  tradeData: Trade[];
} {
  const universeData = createRealisticDataset();
  const tradeData = [
    // Account 1 trades
    { universeId: 'AAPL', buy: 150, quantity: 10, sell_date: null, accountId: 'account1' },
    { universeId: 'OLD_REIT', buy: 30, quantity: 20, sell_date: null, accountId: 'account1' },

    // Account 2 trades
    { universeId: 'AAPL', buy: 145, quantity: 5, sell_date: null, accountId: 'account2' },
    { universeId: 'CLOSED_FUND', buy: 15, quantity: 100, sell_date: null, accountId: 'account2' },

    // Historical trades (closed positions)
    { universeId: 'HISTORICAL_DIVIDEND', buy: 20, quantity: 50, sell_date: '2024-02-01', accountId: 'account1' },
  ];

  return { universeData, tradeData };
}
```

**Performance Testing Implementation:**

```typescript
describe('Performance Integration Tests', () => {
  it('should handle 1000+ expired symbols efficiently', async () => {
    const largeDataset = createLargeRealisticDataset(2000); // 2000 symbols, 60% expired

    component.rawUniverseData.set(largeDataset);

    const startTime = performance.now();

    // Trigger filtering
    component.selectedAccount.set('account1');
    fixture.detectChanges();
    await fixture.whenStable();

    const endTime = performance.now();
    const filteringTime = endTime - startTime;

    expect(filteringTime).toBeLessThan(500); // Should complete in <500ms
    expect(component.filteredData().length).toBeGreaterThan(0);

    // Verify memory usage hasn't grown excessively
    const memoryUsage = performance.memory?.usedJSHeapSize;
    expect(memoryUsage).toBeLessThan(50 * 1024 * 1024); // <50MB
  });

  it('should maintain UI responsiveness during filtering', async () => {
    // Test UI interaction responsiveness during large dataset processing
    const largeDataset = createLargeRealisticDataset(1500);
    component.rawUniverseData.set(largeDataset);

    // Measure time for UI to become interactive
    const startTime = performance.now();

    fixture.detectChanges();
    await fixture.whenStable();

    const interactiveTime = performance.now() - startTime;
    expect(interactiveTime).toBeLessThan(200); // UI responsive in <200ms
  });

  it('should optimize position calculations for expired symbols only', async () => {
    const spy = spyOn(universeDataService, 'getAccountSpecificData').and.callThrough();
    const mixedDataset = createMixedDataset(1000); // 1000 symbols, 30% expired

    component.rawUniverseData.set(mixedDataset);
    component.selectedAccount.set('account1');
    fixture.detectChanges();
    await fixture.whenStable();

    const expiredSymbolCount = mixedDataset.filter((item) => item.expired).length;

    // Verify position calculations only called for expired symbols
    expect(spy.calls.count()).toBeLessThanOrEqual(expiredSymbolCount);
  });
});
```

**Data Integrity Testing:**

```typescript
describe('Data Integrity Integration Tests', () => {
  it('should never modify original database records during filtering', async () => {
    const originalData = createRealisticDataset();
    const originalDataCopy = JSON.parse(JSON.stringify(originalData));

    component.rawUniverseData.set(originalData);

    // Perform various filtering operations
    component.selectedAccount.set('account1');
    fixture.detectChanges();
    await fixture.whenStable();

    component.showAllExpired.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    component.showAllExpired.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    // Verify original data unchanged
    expect(originalData).toEqual(originalDataCopy);
  });

  it('should preserve historical dividend data accessibility', async () => {
    // Test that expired symbols with dividend history remain queryable
    const dataWithDividends = createDividendHistoryDataset();

    // Verify historical data remains accessible even when filtered from display
    // This may require testing data service methods directly
  });
});
```

**End-to-End Test Scenarios:**

```typescript
// If using Cypress or Playwright
describe('E2E: Universe Filtering User Workflows', () => {
  it('should provide complete user workflow for portfolio manager', () => {
    // 1. User logs in and sees default filtered view
    // 2. User switches between accounts
    // 3. User toggles "Show All Expired" to see historical data
    // 4. User applies additional filters (yield, symbol search)
    // 5. User navigates away and returns - state is preserved
  });

  it('should handle advanced user scenarios', () => {
    // 1. Advanced user uses URL parameters to override filters
    // 2. User bookmarks specific filter configurations
    // 3. User analyzes historical performance of expired holdings
  });
});
```

### Testing Standards

**Source: [architecture/ci-and-testing.md]**

**Testing Framework:** Vitest with Angular TestBed for integration testing, optional Cypress/Playwright for E2E
**Test Location:** Integration tests in dedicated `/integration/` subdirectory
**Coverage Requirements:** Overall Epic coverage: 85% lines, 75% branches, 85% functions

**Testing Strategy:**

- **Integration Tests:** Test complete workflows and component interactions
- **Performance Tests:** Validate scalability and optimization effectiveness
- **Data Integrity Tests:** Ensure no data corruption or loss during filtering
- **User Workflow Tests:** Validate complete user scenarios work end-to-end

**Test Data Requirements:**

- Realistic datasets based on actual portfolio scenarios
- Large datasets for performance validation (1000+ symbols)
- Multi-account scenarios with varied position distributions
- Historical data patterns matching real dividend payment schedules

**Success Criteria:**

- All integration tests pass consistently
- Performance benchmarks meet or exceed requirements
- No data integrity issues detected
- User workflows complete successfully without errors
- Memory usage remains within acceptable bounds
- UI responsiveness maintained during filtering operations

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
