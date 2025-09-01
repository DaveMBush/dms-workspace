# Story I.1: Implement expired-with-positions filter logic

## Status

Draft

## Story

**As a** portfolio manager,  
**I want** expired symbols to be automatically excluded from the universe display unless they have open positions in my selected account,  
**so that** I can focus on actionable investments while preserving access to positions I still hold in expired securities.

## Acceptance Criteria

1. Extend `UniverseDataService.applyFilters()` to implement expired-with-positions filtering logic
2. For expired symbols: show only if position > 0 for the selected account
3. For non-expired symbols: show regardless of position (maintain existing behavior)
4. When account = "all": show expired symbols if ANY account has open positions
5. Maintain existing explicit expired filter functionality for advanced users
6. No database schema changes required (leverage existing universe.expired field and index)

## Tasks / Subtasks

- [ ] **Task 1: Analyze existing position calculation logic** (AC: 1, 2)

  - [ ] Review `getAccountSpecificData()` method for position calculation pattern
  - [ ] Understand how open positions are determined (`sell_date IS NULL`)
  - [ ] Document current filtering flow in `applyFilters()` method
  - [ ] Identify integration point for new expired-with-positions logic

- [ ] **Task 2: Implement expired-with-positions filter logic** (AC: 1, 2, 3)

  - [ ] Add new filtering step in `applyFilters()` after existing expired filter
  - [ ] Implement conditional logic: if expired AND position <= 0, exclude from results
  - [ ] Ensure non-expired symbols maintain existing behavior (no position check)
  - [ ] Add proper handling for edge cases (null positions, undefined expired flag)

- [ ] **Task 3: Handle "all accounts" scenario** (AC: 4)

  - [ ] When selectedAccount = "all", check positions across all accounts
  - [ ] Implement logic to show expired symbols if ANY account has positions
  - [ ] Optimize to avoid unnecessary position calculations for non-expired symbols
  - [ ] Ensure proper data aggregation when checking multiple accounts

- [ ] **Task 4: Preserve explicit expired filter functionality** (AC: 5)

  - [ ] Maintain existing `expiredFilter` parameter behavior for advanced users
  - [ ] Ensure explicit expired filter overrides expired-with-positions logic
  - [ ] Document precedence: explicit filter > expired-with-positions > default behavior
  - [ ] Add appropriate comments and documentation for filter hierarchy

- [ ] **Task 5: Add unit tests for new filtering logic** (AC: 1, 2, 3, 4)

  - [ ] Test expired symbols with positions (should show)
  - [ ] Test expired symbols without positions (should hide)
  - [ ] Test non-expired symbols (should show regardless of position)
  - [ ] Test "all accounts" scenario with mixed portfolios
  - [ ] Test explicit expired filter override scenarios

- [ ] **Task 6: Performance optimization and validation** (AC: 6)
  - [ ] Ensure position calculations only run for expired symbols when needed
  - [ ] Validate performance impact with large datasets containing many expired symbols
  - [ ] Confirm existing database index on universe.expired is utilized
  - [ ] Add performance monitoring/logging if needed for optimization

## Dev Notes

### Previous Story Context

This is the first story in Epic I, implementing the core filtering logic that other stories will build upon.

### Data Models and Architecture

**Source: [architecture/domain-model-prisma-snapshot.md]**

- `universe` table: Contains `expired` boolean field with existing index for performance
- `trades` table: Contains `buy`, `quantity`, `universeId`, `accountId`, `sell_date` fields
- Open positions identified by `sell_date IS NULL`
- Position value calculated as `sum(buy * quantity)` for open positions

**Source: [apps/rms/src/app/global/global-universe/universe-data.service.ts]**

- Current filtering in `applyFilters()` method (lines 194-242)
- Existing `expiredFilter` parameter handles explicit expired filtering
- `getAccountSpecificData()` method calculates positions (lines 134-189)
- Account-specific filtering applied after other filters (lines 226-240)

**Source: [Epic I Technical Context]**

- Database: `universe.expired` boolean flag with index
- Business rule: Keep expired entries in database for historical data integrity
- Filter rule: Show expired entries ONLY if they have open positions

### File Locations

**Primary Files to Modify:**

1. `/apps/rms/src/app/global/global-universe/universe-data.service.ts` - Add expired-with-positions logic to `applyFilters()`
2. `/apps/rms/src/app/global/global-universe/universe-data.service.ts` (interfaces) - Update FilterAndSortParams if needed

**Test Files to Create/Modify:**

1. `/apps/rms/src/app/global/global-universe/universe-data.service.spec.ts` - Test new filtering logic
2. Create comprehensive test scenarios for all filtering combinations

### Technical Implementation Details

**Integration Point:**

```typescript
// Current applyFilters method structure (line ~194)
applyFilters(data: UniverseDisplayData[], params: FilterAndSortParams): UniverseDisplayData[] {
  const { minYield, selectedAccount, symbolFilter, riskGroupFilter, expiredFilter } = params;
  let filteredData = data;

  // Existing filters: symbol, yield, risk group, expired
  // NEW: Add expired-with-positions logic here
  // Account-specific filtering (existing - reuse position calculation)
}
```

**New Filtering Logic:**

```typescript
// Add after existing expired filter (around line 225)
// Apply expired-with-positions filter (unless explicit expired filter is set)
if (expiredFilter === null) {
  // Only apply if no explicit expired filter
  const self = this;
  filteredData = filteredData.filter(function filterExpiredWithPositions(item: UniverseDisplayData) {
    if (!item.expired) return true; // Show all non-expired symbols

    // For expired symbols, check if they have positions
    if (selectedAccount === 'all') {
      // Check if ANY account has positions for this symbol
      return self.hasPositionsInAnyAccount(item.symbol);
    } else {
      // Check specific account position
      const accountData = self.getAccountSpecificData(item.symbol, selectedAccount);
      return accountData.position > 0;
    }
  });
}
```

**New Helper Method Needed:**

```typescript
private hasPositionsInAnyAccount(symbol: string): boolean {
  const universes = selectUniverses();
  const universe = universes.find(u => u.symbol === symbol);
  if (!universe) return false;

  const accountsWithTrades = selectAccountChildren();
  return accountsWithTrades.some(account => {
    const accountData = this.getAccountSpecificData(symbol, account.account);
    return accountData.position > 0;
  });
}
```

**Edge Cases to Handle:**

- Null or undefined expired flag (treat as non-expired)
- Zero or negative positions (exclude expired symbols)
- Missing trade data or account data
- Performance optimization for large datasets

**Filter Precedence Hierarchy:**

1. Explicit `expiredFilter` (when set by advanced users)
2. Expired-with-positions filter (new default behavior)
3. Show all symbols (fallback)

### Testing Standards

**Source: [architecture/ci-and-testing.md]**

**Testing Framework:** Vitest with TestBed for Angular services
**Test Location:** Test files collocated with source files using `.spec.ts` extension
**Coverage Requirements:** Lines: 85%, Branches: 75%, Functions: 85%

**Testing Strategy:**

- **Unit Tests:** Test filtering logic with controlled data scenarios
- **Integration Tests:** Test data flow through complete filtering pipeline
- **Edge Case Testing:** Focus on boundary conditions and null values
- **Performance Tests:** Validate behavior with large expired datasets

**Key Test Scenarios:**

- Expired symbol with open positions in selected account (should show)
- Expired symbol with no positions in selected account (should hide)
- Expired symbol with positions in different account (should hide for specific account)
- Non-expired symbol with/without positions (should always show)
- Account = "all" with expired symbols having positions in various accounts
- Explicit expired filter overrides new logic
- Performance with 1000+ expired symbols

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
