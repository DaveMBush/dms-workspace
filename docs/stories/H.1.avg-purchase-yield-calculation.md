# Story H.1: Add average purchase price yield calculation

## Status

Completed

## Story

**As a** portfolio manager,
**I want** to see yield calculations based on my average purchase price alongside current market price yields,
**so that** I can make informed decisions about whether to hold or redeploy my capital.

## Acceptance Criteria

1. Add new computed field `avg_purchase_yield_percent` to universe display data
2. Calculate weighted average purchase price using: `sum(buy * quantity) / sum(quantity)` for open positions only
3. Apply same yield formula using average price: `100 * distributions_per_year * (distribution / avg_purchase_price)`
4. Handle edge cases: no open positions (show 0 or N/A), divide by zero protection
5. Maintain account-specific filtering compatibility
6. Display alongside existing `yield_percent` column in universe table

## Tasks / Subtasks

- [x] **Task 1: Add average purchase price calculation to universe selector** (AC: 1, 2)

  - [x] Extend `universe.selector.ts` to calculate weighted average purchase price
  - [x] Add position data dependency from existing trade calculations
  - [x] Add `avg_purchase_price` field to universe display data interface
  - [x] Implement edge case handling for no positions or zero quantity

- [x] **Task 2: Calculate average purchase price yield** (AC: 1, 3)

  - [x] Add `avg_purchase_yield_percent` calculation using same formula as existing yield
  - [x] Implement divide-by-zero protection for average price calculation
  - [x] Add conditional logic to handle when no average price exists

- [x] **Task 3: Update display data interfaces and types** (AC: 1, 6)

  - [x] Add `avg_purchase_yield_percent` to `UniverseDisplayData` interface
  - [x] Update related TypeScript interfaces for type safety
  - [x] Ensure field is included in data flow from selector to component

- [x] **Task 4: Add field handling in data service** (AC: 4, 5)

  - [x] Update `UniverseDataService.getFieldValueFromDisplayData()` to handle new field
  - [x] Add support for sorting by average purchase yield
  - [x] Ensure account-specific filtering works with new calculation
  - [x] Add appropriate default values and null handling

- [x] **Task 5: Write unit tests for calculations** (AC: 1, 2, 3, 4)
  - [x] Test weighted average calculation with multiple trades at different prices
  - [x] Test edge cases: no open positions, single trade, all positions sold
  - [x] Test yield calculation with various distribution scenarios
  - [x] Test divide-by-zero protection and null handling

## Dev Notes

### Previous Story Context

This is the first story in Epic H, starting from a clean state.

### Data Models and Architecture

**Source: [architecture/domain-model-prisma-snapshot.md]**

- `trades` table: Contains `buy`, `quantity`, `universeId`, `accountId`, `sell_date` fields
- Open positions identified by `sell_date IS NULL`
- Position calculations already implemented in `UniverseDataService.getAccountSpecificData()`

**Source: [apps/dms/src/app/global/global-universe/universe.selector.ts]**

- Current yield calculation: `100 * universe.distributions_per_year * (universe.distribution / universe.last_price)`
- Display data interface: `UniverseDisplayData` with existing `yield_percent` field
- Existing position calculation available from trade data

**Source: [apps/dms/src/app/global/global-universe/universe-data.service.ts]**

- `getAccountSpecificData()` method already calculates position as `sum(buy * quantity)` for open positions
- Pattern to follow for implementing account-specific data calculations
- Field handling in `getFieldValueFromDisplayData()` method needs extension

### File Locations

**Primary Files to Modify:**

1. `/apps/dms/src/app/global/global-universe/universe.selector.ts` - Add avg_purchase_yield_percent calculation
2. `/apps/dms/src/app/global/global-universe/universe-data.service.ts` - Add field handling for new column
3. `/apps/dms/src/app/global/global-universe/universe-data.service.ts` (interfaces) - Update UniverseDisplayData interface

**Test Files to Create/Modify:**

1. `/apps/dms/src/app/global/global-universe/universe.selector.spec.ts` - Test new calculation logic
2. `/apps/dms/src/app/global/global-universe/universe-data.service.spec.ts` - Test field handling

### Technical Implementation Details

**Calculation Logic:**

```typescript
// Weighted average purchase price
const totalCost = openTrades.reduce((sum, trade) => sum + trade.buy * trade.quantity, 0);
const totalQuantity = openTrades.reduce((sum, trade) => sum + trade.quantity, 0);
const avgPurchasePrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;

// Average purchase yield
const avgPurchaseYield = avgPurchasePrice > 0 ? 100 * universe.distributions_per_year * (universe.distribution / avgPurchasePrice) : 0;
```

**Edge Cases to Handle:**

- No open positions: Return 0 or N/A
- Zero total quantity: Prevent division by zero
- Zero average purchase price: Prevent division by zero
- Null/undefined distribution or distributions_per_year values

**Data Flow Integration:**

- Leverage existing position calculation from `getAccountSpecificData()`
- Follow same pattern as existing `yield_percent` calculation
- Maintain compatibility with account filtering logic

### Testing Standards

**Source: [architecture/ci-and-testing.md]**

**Testing Framework:** Vitest (as configured in project)
**Test Location:** Test files should be collocated with source files using `.spec.ts` extension
**Coverage Requirements:**

- Lines: 85%
- Branches: 75%
- Functions: 85%

**Testing Strategy:**

- **Unit Tests:** Test pure calculation logic with various input scenarios
- **Integration Tests:** Test data flow from trades to display through account filtering
- **Edge Case Testing:** Focus on divide-by-zero, null values, and empty datasets

**Test Patterns to Follow:**

- Use TestBed for Angular service testing
- Mock trade data for consistent test scenarios
- Test both positive and negative cases for all calculations
- Verify type safety and interface compliance

## Change Log

| Date       | Version | Description            | Author           |
| ---------- | ------- | ---------------------- | ---------------- |
| 2024-08-30 | 1.0     | Initial story creation | Scrum Master Bob |

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4 (claude-sonnet-4-20250514)

### Debug Log References

- GitHub Issue #91: https://github.com/DaveMBush/dms-workspace/issues/91
- Branch: story-h1-avg-purchase-yield

### Completion Notes List

- ✅ Successfully implemented weighted average purchase price calculation
- ✅ Added avg_purchase_yield_percent field to UniverseDisplayData interface
- ✅ Enhanced getFieldValueFromDisplayData() to support new field for sorting
- ✅ All linting rules pass (sonarjs, typescript-eslint)
- ✅ All unit tests pass (22 tests)
- ✅ Core functionality implemented and ready for integration testing

### File List

**Modified Files:**

- `/apps/dms/src/app/global/global-universe/universe.selector.ts` - Added calculateAveragePurchaseData() function and avg_purchase_yield_percent calculation
- `/apps/dms/src/app/global/global-universe/universe-data.service.ts` - Added avg_purchase_yield_percent to UniverseDisplayData interface and getFieldValueFromDisplayData() method

**New Files:**

- `/apps/dms/src/app/global/global-universe/universe.selector.spec.ts` - Comprehensive unit tests for selector logic
- `/apps/dms/src/app/global/global-universe/universe-data.service.spec.ts` - Unit tests for data service field handling

## QA Results

_Results from QA Agent review will be populated here after implementation_
