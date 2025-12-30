# Epic V: Lazy Loading for Open Positions Table - Brownfield Enhancement

## Epic Goal

Implement PrimeNG p-table lazy loading with virtual scrolling for the Open Positions table to improve performance when displaying large numbers of open positions with inline editing capabilities.

## Epic Description

### Existing System Context

**Current relevant functionality:**

- Open Positions component displays all open positions for selected account
- Loads all records at once via computed signal with filtering
- Supports symbol filtering
- Multi-column sorting (buyDate, unrealizedGainPercent, unrealizedGain) - **CLIENT-SIDE SORTING**
- Inline editing for: buy price, buyDate, quantity, sell price, sellDate
- Complex validation logic for date ranges and calculations
- Delete functionality for positions

**Technology stack:**

- Angular 20 with standalone components
- PrimeNG 20 Table module with CellEditor
- SmartNgRX Signals for entity state
- BasePositionsComponent for shared logic
- Vitest for testing

**Integration points:**

- `apps/dms/src/app/account-panel/open-positions/` component files
- Extends `BasePositionsComponent<OpenPosition, OpenPositionsStorageService>`
- `OpenPositionsComponentService` for business logic
- Symbol filter header component integration
- Sortable header components for multi-column sorting

### Enhancement Details

**What's being added/changed:**

- Add lazy loading attributes to p-table (`[lazy]="true"`, `[virtualScroll]="true"`)
- Implement `(onLazyLoad)` event handler
- Configure 10-row buffer with virtual scrolling
- **Move sorting from client-side to server-side** for buyDate field (partial server sorting)
- Update backend `/api/trades` endpoint to accept sort parameters (sortField, sortOrder, closed filter)
- Update TradeEffectsService to pass sort parameters to backend API
- **Keep client-side sorting** for calculated fields (unrealizedGainPercent, unrealizedGain) - requires all position data
- Maintain symbol filtering functionality
- Preserve all inline editing capabilities
- Ensure validation logic continues to work

**How it integrates:**

- Works with existing computed signals and filtering logic
- Maintains SmartNgRX state management
- Preserves BasePositionsComponent inheritance
- Uses `[dataKey]="'id'"` for row tracking with inline editing
- Maintains existing `trackById` function

**Success criteria:**

- Table loads only visible rows plus 10-row buffer
- Scrolling is smooth without lag
- Symbol filtering works correctly with lazy loading
- All inline editing fields function properly
- Date validation continues to work (buy date vs sell date)
- Multi-column sorting preserved
- Delete functionality works
- All unit tests pass

## Stories

1. **Story V.1:** Implement Lazy Loading for Open Positions Table
   - **Backend API Changes:**
     - Update `/api/trades` endpoint to accept query params object with sort fields
     - Implement server-side sorting with Prisma orderBy for buyDate field
     - Add closed filter parameter (false for open positions)
     - Add database indexes for sortable fields (buy_date, sell_date)
     - Maintain backward compatibility with old API format (string[])
     - Write backend tests for sorting functionality
   - **Frontend Changes:**
     - Add lazy loading and virtual scroll attributes to p-table template
     - Implement onLazyLoad event handler with filtering support
     - Configure 10-row buffer with existing scroll height
     - Update TradeEffectsService to pass sort params to backend
     - Update computed signal for server-sorted buyDate, client-sorted unrealizedGain fields
     - Maintain symbol filtering functionality
     - Ensure inline editing works on lazy-loaded rows
     - Verify all editable fields function correctly (buy, buyDate, quantity, sell, sellDate)
     - Test date validation logic with lazy-loaded data
     - Add dataKey attribute for proper row identification during editing
   - **Testing:**
     - Update backend tests for new API signature
     - Update frontend unit tests to cover lazy loading with inline editing
     - Integration tests for server-side and client-side sorting
     - Test with various filter and sort combinations

## Compatibility Requirements

- [x] Existing SmartNgRX Signals structure remains unchanged (EffectsService extended)
- [x] BasePositionsComponent inheritance preserved
- [x] All inline editing fields work correctly
- [x] Date validation logic functions properly
- [x] Symbol filtering preserved
- [x] Multi-column sorting maintained (buyDate server-side, unrealizedGain client-side)
- [x] Delete operations function correctly
- [x] UI styling and layout unchanged
- [x] Backend API maintains backward compatibility with old format
- [x] Database schema unchanged (only indexes added)
- [x] Performance improves without breaking changes

## Risk Mitigation

**Primary Risk:** Hybrid sorting (server for buyDate, client for unrealizedGain) adds complexity

**Mitigation:**

- Add database indexes for sortable fields before deployment
- Implement backward-compatible API (accepts old and new formats)
- Monitor database query performance with CloudWatch
- Test with large datasets (1000+ records)
- Use dataKey attribute for proper row identification during editing
- Test all inline editable fields thoroughly on lazy-loaded rows
- Verify date validation works correctly with partial data
- Test symbol filter with lazy loading
- Implement comprehensive unit tests covering all edit scenarios
- Test hybrid sorting (server + client) with lazy-loaded data

**Rollback Plan:**

- **Backend Rollback**: API continues accepting new params but ignores sort, returns unsorted (backward compatible)
- **Frontend Rollback**: Revert EffectsService changes, restore full client-side sorting in computed signals
- **Full Rollback**: Git revert both backend and frontend changes
- **Database Rollback**: Drop indexes if they cause performance issues (unlikely)
- BasePositionsComponent remains unchanged (shared by other components)

## Definition of Done

- [x] Backend API updated to accept sort parameters with backward compatibility
- [x] Database indexes added for sortable fields (buy_date, sell_date)
- [x] Backend tests written and passing for new API signature with closed filter
- [x] TradeEffectsService updated to pass sort params to backend
- [x] Open Positions table implements lazy loading with virtual scrolling
- [x] 10-row buffer configured correctly
- [x] Server-side sorting working for buyDate field
- [x] Client-side sorting preserved for unrealizedGain fields (requires all data)
- [x] Symbol filtering verified working with lazy loading
- [x] All inline editing fields tested and working:
  - Buy price editing
  - Buy date editing with validation
  - Quantity editing
  - Sell price editing
  - Sell date editing with validation
- [x] Date range validation preserved (buy date < sell date)
- [x] Delete functionality verified working
- [x] Frontend unit tests updated and passing
- [x] Integration tests passing for hybrid sorting pattern
- [x] No regression in existing functionality
- [x] Performance improvement measured and documented
