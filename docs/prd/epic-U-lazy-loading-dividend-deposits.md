# Epic U: Lazy Loading for Dividend Deposits Table - Brownfield Enhancement

## Epic Goal

Implement PrimeNG p-table lazy loading with virtual scrolling for the Dividend Deposits table to improve performance when displaying large numbers of dividend and deposit records.

## Epic Description

### Existing System Context

**Current relevant functionality:**
- Dividend Deposits component displays all dividends/deposits for selected account
- Loads all records at once via computed signal
- Supports sorting by date (default descending) - **CLIENT-SIDE SORTING**
- Allows inline deletion of records
- Uses SmartNgRX Signals for state management

**Technology stack:**
- Angular 20 with standalone components
- PrimeNG 20 Table module
- SmartNgRX Signals for entity state
- Vitest for testing

**Integration points:**
- `apps/rms/src/app/account-panel/dividend-deposits/` component files
- SmartNgRX Signals: `selectCurrentAccountSignal`, `selectUniverses`, `selectDivDepositTypes`
- Computed signal transforms data for display
- Delete functionality uses SmartArray proxy methods

### Enhancement Details

**What's being added/changed:**
- Add lazy loading attributes to p-table (`[lazy]="true"`, `[virtualScroll]="true"`)
- Implement `(onLazyLoad)` event handler
- Configure 10-row buffer with virtual scrolling
- **Move sorting from client-side to server-side** - Backend API will return sorted entity IDs
- Update backend `/api/div-deposits` endpoint to accept sort parameters (sortField, sortOrder)
- Update DivDepositEffectsService to pass sort parameters to backend API
- Maintain date sorting functionality (default descending)
- Preserve delete operations

**How it integrates:**
- Works with existing computed signals
- Maintains SmartNgRX state management
- Uses `[dataKey]="'id'"` for row tracking
- Preserves existing `trackById` function

**Success criteria:**
- Table loads only visible rows plus 10-row buffer
- Scrolling is smooth without lag
- Delete functionality continues to work
- Default sort by date (descending) preserved
- All unit tests pass

## Stories

1. **Story U.1:** Implement Lazy Loading for Dividend Deposits Table
   - **Backend API Changes:**
     - Update `/api/div-deposits` endpoint to accept query params object with sort fields
     - Implement server-side sorting with Prisma orderBy clauses
     - Add database indexes for sortable fields (date, amount)
     - Maintain backward compatibility with old API format (string[])
     - Write backend tests for sorting functionality
   - **Frontend Changes:**
     - Add lazy loading and virtual scroll attributes to p-table template
     - Implement onLazyLoad event handler in component
     - Configure 10-row buffer with existing scroll height
     - Update DivDepositEffectsService to pass sort params to backend
     - Remove client-side sorting logic from computed signals
     - Update computed signal to use server-sorted data
     - Verify delete functionality works with lazy-loaded rows
     - Add dataKey attribute for proper row identification
   - **Testing:**
     - Update backend tests for new API signature
     - Update frontend unit tests to cover lazy loading behavior
     - Integration tests for server-side sorting
     - Test with small and large datasets

## Compatibility Requirements

- [x] Existing SmartNgRX Signals structure remains unchanged (EffectsService extended)
- [x] Delete operations function correctly
- [x] Date sorting preserved (moved to server-side)
- [x] UI styling and layout unchanged
- [x] Backend API maintains backward compatibility with old format
- [x] Database schema unchanged (only indexes added)
- [x] Performance improves without breaking changes

## Risk Mitigation

**Primary Risk:** Server-side sorting adds complexity and potential performance issues

**Mitigation:**
- Add database indexes for all sortable fields before deployment
- Implement backward-compatible API (accepts old and new formats)
- Monitor database query performance with CloudWatch
- Test with large datasets (1000+ records)
- Use dataKey attribute for proper row identification
- Test delete operations on lazy-loaded rows thoroughly
- Verify computed signals update correctly with partial data
- Implement comprehensive unit tests for both backend and frontend

**Rollback Plan:**
- **Backend Rollback**: API continues accepting new params but ignores sort, returns unsorted (backward compatible)
- **Frontend Rollback**: Revert EffectsService changes, restore client-side sorting in computed signals
- **Full Rollback**: Git revert both backend and frontend changes
- **Database Rollback**: Drop indexes if they cause performance issues (unlikely)

## Definition of Done

- [x] Backend API updated to accept sort parameters with backward compatibility
- [x] Database indexes added for sortable fields (date, amount)
- [x] Backend tests written and passing for new API signature
- [x] DivDepositEffectsService updated to pass sort params to backend
- [x] Dividend Deposits table implements lazy loading with virtual scrolling
- [x] 10-row buffer configured correctly
- [x] Server-side sorting working correctly (date desc by default)
- [x] Client-side sorting logic removed from computed signals
- [x] Delete functionality verified working
- [x] Frontend unit tests updated and passing
- [x] Integration tests passing for server-side sorting
- [x] No regression in existing functionality
- [x] Performance improvement measured and documented
