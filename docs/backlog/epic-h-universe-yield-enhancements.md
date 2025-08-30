# Epic H: Universe Yield Enhancements

Goal: Add average purchase price yield calculation to provide better investment decision data alongside the existing last price yield.

## Context

The universe screen currently displays a Yield% column calculated using `last_price`: 
```
yield_percent = 100 * distributions_per_year * (distribution / last_price)
```

Users need to compare this market-based yield with their actual cost basis yield to make informed investment decisions about whether to hold or redeploy capital.

## Technical Context

**Current Implementation:** `/apps/rms/src/app/global/global-universe/universe.selector.ts:yield_percent`

**Data Model Dependencies:**
- `universe` table: `distribution`, `distributions_per_year`, `last_price`
- `trades` table: `buy`, `quantity`, `universeId`, `accountId`, `sell_date` (null for open positions)

**Display Location:** `/apps/rms/src/app/global/global-universe/global-universe.component.*`

## Story H1: Add average purchase price yield calculation

Description: Calculate and display yield based on weighted average purchase price for each symbol, considering only open positions for the selected account.

Acceptance Criteria:

- Add new computed field `avg_purchase_yield_percent` to universe display data
- Calculate weighted average purchase price using: `sum(buy * quantity) / sum(quantity)` for open positions only
- Apply same yield formula using average price: `100 * distributions_per_year * (distribution / avg_purchase_price)`
- Handle edge cases: no open positions (show 0 or N/A), divide by zero protection
- Maintain account-specific filtering compatibility
- Display alongside existing `yield_percent` column in universe table

Dependencies: Existing trade/position calculation logic in `UniverseDataService.getAccountSpecificData`

## Story H2: Add new column to universe table display

Description: Add "Avg Purchase Yield%" column to the universe data table with proper sorting and filtering support.

Acceptance Criteria:

- Add new column header "Avg Purchase Yield%" in universe table
- Display `avg_purchase_yield_percent` with same formatting as existing yield column (2 decimal places, % symbol)
- Implement sorting capability using existing sort infrastructure
- Add column to existing yield filter logic (if applicable)
- Ensure responsive design maintains table usability
- Column should be visible when account selection is not "all" (since it requires position data)

Dependencies: Story H1

## Story H3: Unit tests for yield calculations

Description: Comprehensive test coverage for average purchase price yield calculations and edge cases.

Acceptance Criteria:

- Test weighted average calculation with multiple trades at different prices
- Test edge cases: no open positions, single trade, all positions sold
- Test account-specific filtering behavior 
- Test sort functionality for new yield column
- Test display formatting and null handling
- Maintain existing test coverage for original yield calculations

Dependencies: Stories H1, H2

## Story H4: Integration testing and validation

Description: End-to-end testing to ensure yield calculations are accurate and display correctly across different scenarios.

Acceptance Criteria:

- Verify calculations match manual computation for sample data
- Test with different account selections
- Validate sorting behavior across both yield columns
- Test filter interactions (if yield filtering applies to new column)
- Ensure no regression in existing yield functionality
- Test performance with large datasets

Dependencies: Stories H1, H2, H3

## Technical Notes

**Architecture Dependencies:**
- Frontend: Angular signals, computed properties, PrimeNG table
- Data flow: Universe selector → Display data service → Component
- Testing: Vitest for unit tests, existing test patterns

**File Modification Scope (Minimal Changes):**
1. `universe.selector.ts` - Add avg_purchase_yield_percent calculation
2. `universe-data.service.ts` - Add field handling for sorting/filtering
3. `global-universe.component.*` - Add column to table
4. `sort-computed-signals.function.ts` - Add sorting support
5. Related test files

**Performance Considerations:**
- Calculation should leverage existing position data from `getAccountSpecificData`
- No additional database queries required
- Computed values cached per account selection change