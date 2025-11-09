# Epic W: Lazy Loading for Sold Positions Table - Brownfield Enhancement

## Epic Goal

Implement PrimeNG p-table lazy loading with virtual scrolling for the Sold Positions table to improve performance when displaying large numbers of closed positions with capital gains calculations and inline editing.

## Epic Description

### Existing System Context

**Current relevant functionality:**

- Sold Positions component displays all closed positions for selected account
- Loads all records at once via computed signal with filtering
- Supports symbol filtering
- Sorting by sellDate - **CLIENT-SIDE SORTING**
- Inline editing for: buy price, buyDate, quantity, sell price, sellDate
- Real-time capital gains calculations (capitalGain, capitalGainPercentage) - **CLIENT-SIDE CALCULATION**
- Date validation logic for buy/sell date ranges
- Delete functionality for positions

**Technology stack:**

- Angular 20 with standalone components
- PrimeNG 20 Table module with CellEditor
- SmartNgRX Signals for entity state
- BasePositionsComponent for shared logic
- Capital gains calculator function
- Vitest for testing

**Integration points:**

- `apps/rms/src/app/account-panel/sold-positions/` component files
- Extends `BasePositionsComponent<SoldPosition, SoldPositionsStorageService>`
- `SoldPositionsComponentService` for business logic
- `calculateCapitalGains` function for real-time calculations
- Symbol filter integration

### Enhancement Details

**What's being added/changed:**

- Add lazy loading attributes to p-table (`[lazy]="true"`, `[virtualScroll]="true"`)
- Implement `(onLazyLoad)` event handler
- Configure 10-row buffer with virtual scrolling
- **Move sorting from client-side to server-side** for sellDate field
- Update backend `/api/trades` endpoint to accept sort parameters (sortField, sortOrder, closed filter)
- Update TradeEffectsService to pass sort parameters to backend API
- **Keep capital gains calculations client-side** - calculations remain in computed signal after data fetch
- Maintain symbol filtering functionality
- Preserve all inline editing capabilities
- Preserve date validation logic

**How it integrates:**

- Works with existing computed signals that transform and calculate data
- Maintains SmartNgRX state management
- Preserves BasePositionsComponent inheritance
- Uses `[dataKey]="'id'"` for row tracking with inline editing
- Maintains existing `trackById` function
- Ensures `calculateCapitalGains` function works on lazy-loaded data

**Success criteria:**

- Table loads only visible rows plus 10-row buffer
- Scrolling is smooth without lag
- Symbol filtering works correctly with lazy loading
- All inline editing fields function properly
- Capital gains calculations update correctly when values change
- Date validation continues to work (buy date vs sell date)
- SellDate sorting preserved
- Delete functionality works
- All unit tests pass

## Stories

1. **Story W.1:** Implement Lazy Loading for Sold Positions Table
   - **Backend API Changes:**
     - Update `/api/trades` endpoint to accept query params object with sort fields
     - Implement server-side sorting with Prisma orderBy for sellDate and buyDate fields
     - Add closed filter parameter (true for sold positions)
     - Add database indexes for sortable fields (buy_date, sell_date)
     - Maintain backward compatibility with old API format (string[])
     - Write backend tests for sorting functionality
   - **Frontend Changes:**
     - Add lazy loading and virtual scroll attributes to p-table template
     - Implement onLazyLoad event handler with filtering support
     - Configure 10-row buffer with existing scroll height
     - Update TradeEffectsService to pass sort params to backend
     - Update computed signal to apply capital gains calculations to server-sorted data
     - Ensure capital gains calculations work on lazy-loaded rows
     - Verify inline editing works on lazy-loaded rows
     - Test all editable fields (buy, buyDate, quantity, sell, sellDate)
     - Verify date validation logic with lazy-loaded data
     - Ensure capital gains recalculate when buy/sell/quantity changes
     - Add dataKey attribute for proper row identification during editing
   - **Testing:**
     - Update backend tests for new API signature with closed filter
     - Update frontend unit tests to cover lazy loading with capital gains calculations
     - Integration tests for server-side sorting with client-side calculations
     - Test with various filter and sort combinations

## Compatibility Requirements

- [x] Existing SmartNgRX Signals structure remains unchanged (EffectsService extended)
- [x] BasePositionsComponent inheritance preserved
- [x] Capital gains calculations function correctly (client-side after data fetch)
- [x] All inline editing fields work correctly
- [x] Date validation logic functions properly
- [x] Symbol filtering preserved
- [x] SellDate sorting maintained (moved to server-side)
- [x] Delete operations function correctly
- [x] UI styling and layout unchanged
- [x] Backend API maintains backward compatibility with old format
- [x] Database schema unchanged (only indexes added)
- [x] Performance improves without breaking changes

## Risk Mitigation

**Primary Risk:** Server-side sorting with client-side calculations adds complexity

**Mitigation:**

- Add database indexes for sortable fields before deployment
- Implement backward-compatible API (accepts old and new formats)
- Monitor database query performance with CloudWatch
- Test with large datasets (1000+ records)
- Use dataKey attribute for proper row identification during editing
- Test capital gains recalculation on lazy-loaded rows thoroughly
- Verify all inline editable fields work correctly with partial data
- Verify date validation works correctly with lazy-loaded data
- Test symbol filter with lazy loading
- Implement comprehensive unit tests covering calculation scenarios
- Test that calculations update immediately when values change

**Rollback Plan:**

- **Backend Rollback**: API continues accepting new params but ignores sort, returns unsorted (backward compatible)
- **Frontend Rollback**: Revert EffectsService changes, restore client-side sorting in computed signals
- **Full Rollback**: Git revert both backend and frontend changes
- **Database Rollback**: Drop indexes if they cause performance issues (unlikely)
- BasePositionsComponent remains unchanged (shared by other components)
- Capital gains calculator function unchanged

## Definition of Done

- [x] Backend API updated to accept sort parameters with backward compatibility
- [x] Database indexes added for sortable fields (buy_date, sell_date)
- [x] Backend tests written and passing for new API signature with closed filter
- [x] TradeEffectsService updated to pass sort params to backend
- [x] Sold Positions table implements lazy loading with virtual scrolling
- [x] 10-row buffer configured correctly
- [x] Server-side sorting working for sellDate field
- [x] Symbol filtering verified working with lazy loading
- [x] All inline editing fields tested and working:
  - Buy price editing
  - Buy date editing with validation
  - Quantity editing
  - Sell price editing
  - Sell date editing with validation
- [x] Capital gains calculations verified (client-side after server-sorted data fetched):
  - capitalGain displays correctly
  - capitalGainPercentage displays correctly
  - Values recalculate when buy/sell/quantity changes
- [x] Date range validation preserved (buy date < sell date)
- [x] Delete functionality verified working
- [x] Frontend unit tests updated and passing
- [x] Integration tests passing for server-side sorting with client-side calculations
- [x] No regression in existing functionality
- [x] Performance improvement measured and documented
