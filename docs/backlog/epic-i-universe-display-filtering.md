# Epic I: Universe Display Filtering

Goal: Filter out expired universe entries that have no open positions from the display while preserving historical data integrity.

## Context

The universe table currently shows all symbols including those marked as `expired=true`. When symbols expire but still have historical dividend data or trade history, these rows should remain in the database for data integrity but should not clutter the main universe display unless they have active positions.

## Technical Context

**Current Implementation:**

- Database: `universe.expired` boolean flag with index
- Filtering: `UniverseDataService.applyFilters()` with `expiredFilter` parameter
- Display: Universe table shows all records regardless of expired status

**Data Model Dependencies:**

- `universe` table: `expired` field, existing index
- `trades` table: open positions determined by `sell_date IS NULL`
- Account relationship: `trades.accountId` and `trades.universeId`

**Business Rules:**

- Keep expired entries in database (historical dividends, trade records)
- Show expired entries ONLY if they have open positions in selected account
- Default behavior: hide expired entries with no positions

## Story I1: Implement expired-with-positions filter logic

Description: Modify filtering logic to automatically exclude expired symbols unless they have open positions in the selected account.

Acceptance Criteria:

- Extend `UniverseDataService.applyFilters()` to check for open positions on expired symbols
- For expired symbols: show only if `position > 0` for selected account
- For non-expired symbols: show regardless of position (existing behavior)
- When account = "all": show expired symbols if ANY account has open positions
- Maintain existing explicit expired filter functionality for advanced users
- No database schema changes required

Dependencies: Existing position calculation logic in `getAccountSpecificData`

## Story I2: Update default filter behavior

Description: Modify default filtering to automatically apply the expired-with-positions rule without requiring user interaction.

Acceptance Criteria:

- Default universe display automatically excludes expired symbols with no positions
- No UI changes to filter controls (advanced users can still override)
- Behavior applies consistently across account selections
- Performance optimization: avoid position calculations for non-expired symbols
- Maintain backward compatibility with existing URL parameters/state

Dependencies: Story I1

## Story I3: Add optional toggle for "Show All Expired"

Description: Provide advanced users the option to see all expired symbols when needed for analysis.

Acceptance Criteria:

- Add checkbox/toggle "Show All Expired" to filter panel
- Default state: unchecked (expired symbols hidden unless positions)
- When checked: show all expired symbols regardless of positions
- State persistence using existing filter state management
- Clear labeling to explain behavior
- Only visible when there are expired symbols in the dataset

Dependencies: Stories I1, I2

## Story I4: Unit tests for filtering logic

Description: Comprehensive test coverage for new filtering behavior and edge cases.

Acceptance Criteria:

- Test expired symbols with open positions (should show)
- Test expired symbols without positions (should hide by default)
- Test account-specific filtering behavior
- Test "Show All Expired" toggle functionality
- Test performance with large datasets containing many expired symbols
- Maintain existing test coverage for other filtering functionality

Dependencies: Stories I1, I2, I3

## Story I5: Integration testing and validation

Description: End-to-end testing to ensure filtering works correctly across all user scenarios.

Acceptance Criteria:

- Verify default behavior hides expired symbols without positions
- Test account switching with mixed expired/active portfolios
- Validate toggle functionality in different account contexts
- Ensure no data loss or corruption of expired records
- Test with realistic datasets (symbols with dividend history)
- Performance validation with large numbers of expired symbols

Dependencies: Stories I1, I2, I3, I4

## Technical Notes

**Architecture Dependencies:**

- Frontend: Existing filter system in `UniverseDataService`
- No database changes required (leveraging existing `expired` index)
- Position calculation: Reuse existing `getAccountSpecificData` logic

**File Modification Scope (Minimal Changes):**

1. `universe-data.service.ts` - Modify `applyFilters()` method
2. `global-universe.component.*` - Add optional "Show All Expired" toggle
3. Filter state management (if toggle is implemented)
4. Related test files

**Performance Considerations:**

- Leverage existing `universe.expired` index
- Optimize position calculations to run only for expired symbols
- Consider caching position data during filtering operations
- Monitor performance impact with large expired datasets

**Business Impact:**

- Cleaner default view focusing on actionable investments
- Preserves all historical data integrity
- Reduces cognitive load for daily investment decisions
- Maintains advanced functionality for power users
