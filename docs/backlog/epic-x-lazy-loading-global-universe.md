# Epic X: Lazy Loading for Global Universe Table - Brownfield Enhancement

## Epic Goal

Implement PrimeNG p-table lazy loading with virtual scrolling for the Global Universe table to improve performance when displaying the universe of stocks with complex filtering, multi-column sorting, and inline editing.

## Epic Description

### Existing System Context

**Current relevant functionality:**

- Global Universe component displays all universe stocks across accounts
- Loads all records at once via computed signal with complex filtering
- Supports multiple filters:
  - Symbol search filter
  - Risk group filter (Equities, Income, Tax Free)
  - Minimum yield percentage filter - **CLIENT-SIDE FILTER** (calculated field)
  - Expired filter (Yes/No)
  - Account selection filter - **CLIENT-SIDE FILTER** (requires join with trades)
- Multi-column sorting - **CLIENT-SIDE SORTING**:
  - yield_percent (calculated field)
  - avg_purchase_yield_percent (calculated field)
  - ex_date
  - most_recent_sell_date
  - most_recent_sell_price
- Inline editing for: distribution, distributions_per_year, ex_date
- Row dimming logic based on expired status
- Delete functionality (conditional based on position)
- Sync and update operations

**Technology stack:**

- Angular 20 with standalone components
- PrimeNG 20 Table module with CellEditor
- SmartNgRX Signals for entity state
- Multiple handler services (edit, filter, sort)
- UniverseDataService for data transformation
- Vitest for testing

**Integration points:**

- `apps/dms/src/app/global/global-universe/` component files
- `createFilterHandlers` function for filter logic
- `createEditHandlers` function for edit logic
- `createSortingHandlers` function for sort logic
- `createSortComputedSignals` for sort UI state
- `UniverseDataService.filterAndSortUniverses` for data processing
- Editable date cell component integration

### Enhancement Details

**What's being added/changed:**

- Add lazy loading attributes to p-table (`[lazy]="true"`, `[virtualScroll]="true"`)
- Implement `(onLazyLoad)` event handler
- Configure 10-row buffer with virtual scrolling
- **Hybrid server/client filtering and sorting approach**:
  - **Server-side filters**: symbol (text search), riskGroupId, expired
  - **Client-side filters**: minYield (calculated), accountId (requires trades join calculation)
  - **Server-side sorting**: ex_date, most_recent_sell_date, most_recent_sell_price, distribution
  - **Client-side sorting**: yield_percent, avg_purchase_yield_percent (calculated fields)
- Update backend `/api/universe` endpoint to accept filter and sort parameters
- Update UniverseEffectsService to pass filter/sort params to backend
- Preserve all inline editing capabilities
- Ensure row dimming logic continues to work
- Preserve delete functionality with conditional display

**How it integrates:**

- Works with existing computed signals and complex filtering logic
- Maintains SmartNgRX state management
- Preserves all handler functions (edit, filter, sort)
- Uses `[dataKey]="'id'"` for row tracking with inline editing
- Maintains existing `trackById` function
- Ensures UniverseDataService works with lazy-loaded data
- Preserves sync and update operations

**Success criteria:**

- Table loads only visible rows plus 10-row buffer
- Scrolling is smooth without lag
- All filters work correctly with lazy loading:
  - Symbol search filter
  - Risk group dropdown filter
  - Minimum yield number filter
  - Expired boolean filter
  - Account selection filter
- All inline editing fields function properly
- Multi-column sorting preserved across all sortable columns
- Row dimming logic works on lazy-loaded rows
- Delete button conditional display works correctly
- Sync and update operations function normally
- All unit tests pass

## Stories

1. **Story X.1:** Implement Lazy Loading for Global Universe Table
   - **Backend API Changes:**
     - Update `/api/universe` endpoint to accept query params object with filters and sort fields
     - Implement server-side filtering for symbol (text search), riskGroupId, expired
     - Implement server-side sorting for ex_date, most_recent_sell_date, most_recent_sell_price, distribution
     - Add database indexes for filterable and sortable fields
     - Maintain backward compatibility with old API format (string[])
     - Write backend tests for filtering and sorting functionality
   - **Frontend Changes:**
     - Add lazy loading and virtual scroll attributes to p-table template
     - Implement onLazyLoad event handler with hybrid filtering support
     - Configure 10-row buffer with existing scroll height
     - Update UniverseEffectsService to pass filter/sort params to backend
     - Update UniverseDataService to handle hybrid filtering (server + client)
     - Update computed signals for server filters (symbol, riskGroup, expired) and client filters (minYield, accountId)
     - Update computed signals for server sorting (ex_date, sell fields, distribution) and client sorting (calculated yields)
     - Ensure inline editing works on lazy-loaded rows
     - Verify all editable fields function correctly (distribution, distributions_per_year, ex_date)
     - Test all filter types with lazy loading (5 filters with hybrid approach)
     - Test all sorting columns with lazy loading (5 columns with hybrid approach)
     - Ensure row dimming logic works on lazy-loaded data
     - Verify delete button conditional display logic
     - Test sync universe and update fields operations
     - Add dataKey attribute for proper row identification during editing
   - **Testing:**
     - Update backend tests for new API signature with filters and sorting
     - Update frontend unit tests to cover lazy loading with complex features
     - Integration tests for hybrid filtering and sorting patterns
     - Test with various filter, sort, and edit combinations

## Compatibility Requirements

- [x] Existing SmartNgRX Signals structure remains unchanged (EffectsService extended)
- [x] All filter handlers function correctly (hybrid server/client filtering)
- [x] All edit handlers work properly
- [x] All sorting handlers preserved (hybrid server/client sorting)
- [x] UniverseDataService integration maintained (updated for hybrid approach)
- [x] All inline editing fields work correctly
- [x] Multi-column sorting maintained (3 server-side, 2 client-side)
- [x] Row dimming logic functions properly
- [x] Delete conditional logic preserved
- [x] Sync and update operations work correctly
- [x] UI styling and layout unchanged
- [x] Backend API maintains backward compatibility with old format
- [x] Database schema unchanged (only indexes added)
- [x] Performance improves without breaking changes

## Risk Mitigation

**Primary Risk:** Most complex hybrid filtering/sorting pattern - server and client filters/sorts combined

**Mitigation:**

- Add database indexes for all server-filterable and sortable fields before deployment
- Implement backward-compatible API (accepts old and new formats)
- Monitor database query performance with CloudWatch
- Test with large datasets (1000+ records)
- Use dataKey attribute for proper row identification during editing
- Test all filter combinations thoroughly (server + client) with lazy loading
- Verify all inline editable fields work correctly with partial data
- Test hybrid multi-column sorting with lazy-loaded data
- Verify row dimming logic evaluates correctly
- Test conditional delete button display logic
- Implement comprehensive unit tests covering all feature combinations
- Test sync and update operations with lazy-loaded data
- Integration tests for complex server/client filter and sort combinations

**Rollback Plan:**

- **Backend Rollback**: API continues accepting new params but ignores filters/sort, returns all data unsorted (backward compatible)
- **Frontend Rollback**: Revert EffectsService and UniverseDataService changes, restore full client-side filtering and sorting
- **Full Rollback**: Git revert both backend and frontend changes
- **Database Rollback**: Drop indexes if they cause performance issues (unlikely)
- Handler functions remain unchanged
- Component structure preserved

## Definition of Done

- [x] Backend API updated to accept filter and sort parameters with backward compatibility
- [x] Database indexes added for filterable and sortable fields (symbol, ex_date, sell fields, distribution, expired)
- [x] Backend tests written and passing for new API signature with filters and sorting
- [x] UniverseEffectsService updated to pass filter/sort params to backend
- [x] UniverseDataService updated for hybrid filtering and sorting approach
- [x] Global Universe table implements lazy loading with virtual scrolling
- [x] 10-row buffer configured correctly
- [x] Hybrid filtering verified working:
  - **Server-side filters**: Symbol text filter, Risk group dropdown filter, Expired boolean filter
  - **Client-side filters**: Minimum yield number filter (calculated), Account selection filter (requires trades)
- [x] Hybrid sorting verified working:
  - **Server-side sorting**: ex_date, most_recent_sell_date, most_recent_sell_price, distribution
  - **Client-side sorting**: yield_percent (calculated), avg_purchase_yield_percent (calculated)
- [x] All inline editing fields tested and working:
  - Distribution editing
  - Distributions per year editing
  - Ex-date editing
- [x] Row dimming logic verified (expired rows display dimmed)
- [x] Delete button conditional display verified (only for non-CEF with position=0)
- [x] Sync universe operation verified working
- [x] Update fields operation verified working
- [x] Frontend unit tests updated and passing
- [x] Integration tests passing for hybrid filtering and sorting patterns
- [x] No regression in existing functionality
- [x] Performance improvement measured and documented
