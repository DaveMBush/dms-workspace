# Story AR.11: CUSIP Cache Admin UI and E2E Tests

**Status:** Draft

## Story

**As a** system administrator
**I want** a user interface to view and manage the CUSIP cache
**So that** I can monitor cache health and troubleshoot issues without using API calls directly

## Context

**Current System:**

- AR.8 and AR.9 implemented CUSIP caching with database persistence
- AR.10 implemented backend API endpoints for cache management
- No user interface exists for administrators to interact with cache
- Administrators must use API tools (curl, Postman) to manage cache
- No visual way to monitor cache performance

**Business Need:**

- Administrators need easy access to cache statistics
- Support teams need to search cache to troubleshoot user issues
- Manual correction of incorrect mappings should be user-friendly
- E2E tests needed to verify complete admin workflow

**Proposed Implementation:**

- Admin dashboard page with cache statistics and visualizations
- Search interface for looking up cache entries by CUSIP or symbol
- Management forms for adding/editing/deleting cache entries
- Recent activity log display
- Complete E2E test coverage of all UI workflows

## Acceptance Criteria

### Cache Dashboard Page

1. [ ] Dashboard page accessible from admin menu
2. [ ] Dashboard displays cache statistics:
   - Total cache entries count
   - Entries by source (OpenFIGI vs Yahoo Finance) with breakdown/chart
   - Cache hit rate (if available)
   - Date range of cached entries (oldest/newest)
   - Last 10 recently added entries
3. [ ] Dashboard has "Refresh" button to reload statistics
4. [ ] Statistics display timestamp of last update
5. [ ] Dashboard is responsive and works on tablet/desktop

### Search Interface

6. [ ] Search form with options to search by:
   - CUSIP (exact match)
   - Symbol (exact match)
7. [ ] Search results display in table with columns:
   - CUSIP
   - Symbol
   - Source
   - Resolved Date
   - Last Used Date
   - Actions (Edit, Delete)
8. [ ] "Not found" message when search has no results
9. [ ] Search results limit to prevent performance issues
10. [ ] Clear search button to reset form

### Add/Edit Cache Entry Form

11. [ ] "Add New Mapping" button opens dialog/form
12. [ ] Form includes fields:
    - CUSIP (required, validated format)
    - Symbol (required, non-empty)
    - Source (dropdown: MANUAL, OPENFIGI, YAHOO_FINANCE)
    - Reason (optional text field for manual entries)
13. [ ] Form validates CUSIP format (9 characters, alphanumeric)
14. [ ] Form validates symbol is not empty
15. [ ] Success message after adding mapping
16. [ ] Edit button in search results opens form with pre-filled data
17. [ ] Form updates existing mapping on submit when editing

### Delete Cache Entry

18. [ ] Delete button in search results triggers confirmation dialog
19. [ ] Confirmation shows CUSIP and symbol being deleted
20. [ ] Success message after deletion
21. [ ] Search results refresh after deletion

### Recent Activity Display

22. [ ] Recent activity section shows last 20 cache operations
23. [ ] Each entry shows: timestamp, CUSIP, symbol, action, source
24. [ ] Activity refreshes automatically every 30 seconds (optional)
25. [ ] Manual refresh button for activity log

### Error Handling

26. [ ] API errors display user-friendly messages
27. [ ] Network errors show retry option
28. [ ] Form validation errors display inline
29. [ ] Loading states shown during API calls

### E2E Test Coverage

30. [ ] E2E test: Navigate to cache dashboard and verify statistics display
31. [ ] E2E test: Search for existing CUSIP and verify results
32. [ ] E2E test: Search for non-existent CUSIP and verify "not found"
33. [ ] E2E test: Add new manual cache mapping and verify success
34. [ ] E2E test: Edit existing cache mapping and verify update
35. [ ] E2E test: Delete cache mapping with confirmation
36. [ ] E2E test: Verify form validation (invalid CUSIP, empty symbol)
37. [ ] E2E test: Verify recent activity displays correctly
38. [ ] E2E test: Verify dashboard refresh updates statistics
39. [ ] E2E test: Verify error handling for API failures

## Tasks / Subtasks

- [ ] Create Angular component structure (AC: 1-5)
  - [ ] Create `CusipCacheDashboardComponent`
  - [ ] Add route to admin routing module
  - [ ] Create component template with statistics layout
  - [ ] Create component service for API calls
  - [ ] Add link to admin menu
  - [ ] Style with project CSS framework
- [ ] Implement statistics display (AC: 2-4)
  - [ ] Call stats API endpoint
  - [ ] Display all statistics fields
  - [ ] Add refresh functionality
  - [ ] Show timestamp of last update
  - [ ] Add loading spinner
- [ ] Implement search interface (AC: 6-10)
  - [ ] Create search form with CUSIP/symbol inputs
  - [ ] Call search API endpoint
  - [ ] Display results in PrimeNG table
  - [ ] Handle empty results
  - [ ] Add clear button
- [ ] Implement add/edit form (AC: 11-17)
  - [ ] Create dialog component for add/edit
  - [ ] Add form fields with validation
  - [ ] Implement CUSIP format validator
  - [ ] Call add/update API endpoints
  - [ ] Show success/error messages
  - [ ] Handle form submission
- [ ] Implement delete functionality (AC: 18-21)
  - [ ] Add delete button to table
  - [ ] Create confirmation dialog
  - [ ] Call delete API endpoint
  - [ ] Refresh results after deletion
  - [ ] Show success message
- [ ] Implement recent activity (AC: 22-25)
  - [ ] Create activity log section
  - [ ] Call audit log API endpoint
  - [ ] Display activity in list/table
  - [ ] Add auto-refresh (optional)
  - [ ] Add manual refresh button
- [ ] Add error handling (AC: 26-29)
  - [ ] Implement error interceptor
  - [ ] Add user-friendly error messages
  - [ ] Add loading states to all API calls
  - [ ] Add form validation messages
- [ ] Write E2E tests (AC: 30-39)
  - [ ] Set up E2E test file in `apps/dms-material-e2e/`
  - [ ] Create test data fixtures
  - [ ] Write navigation and display tests
  - [ ] Write search functionality tests
  - [ ] Write CRUD operation tests
  - [ ] Write validation tests
  - [ ] Write error handling tests
  - [ ] Add test cleanup logic
- [ ] Write unit tests
  - [ ] Component unit tests
  - [ ] Service unit tests
  - [ ] Form validation tests
- [ ] Manual testing and verification
  - [ ] Test all user workflows
  - [ ] Test responsive design
  - [ ] Test error scenarios
  - [ ] Test with real cache data

## Dependencies

- AR.10 must be complete (backend API endpoints)
- Admin authentication and routing in place
- PrimeNG components available
- Angular admin module structure

## Technical Considerations

### Component Architecture
```
CusipCacheDashboardComponent (parent)
├── CacheStatisticsComponent (statistics display)
├── CacheSearchComponent (search form and results)
├── CacheAddEditDialogComponent (add/edit form)
└── CacheActivityLogComponent (recent activity)
```

### API Service
```typescript
class CusipCacheAdminService {
  getStatistics(): Observable<CacheStatistics>
  searchByCusip(cusip: string): Observable<CacheEntry | null>
  searchBySymbol(symbol: string): Observable<CacheEntry[]>
  addMapping(data: AddMappingDto): Observable<void>
  updateMapping(id: string, data: UpdateMappingDto): Observable<void>
  deleteMapping(id: string): Observable<void>
  getRecentActivity(limit: number): Observable<AuditLogEntry[]>
}
```

### Routing
- Add route: `/admin/cusip-cache`
- Protect with admin auth guard
- Add menu item in admin navigation

### UI Framework
- Use PrimeNG components (Table, Dialog, Button, InputText, Dropdown)
- Follow project styling conventions
- Use Material icons
- Ensure accessibility (ARIA labels, keyboard navigation)

### E2E Testing
- Location: `apps/dms-material-e2e/src/cusip-cache-admin.spec.ts`
- Use Playwright for E2E tests
- Create test database fixtures
- Clean up test data after each test
- Use page object pattern for maintainability

### Performance
- Lazy load dashboard data
- Debounce search inputs
- Paginate search results if needed
- Cache statistics for 30 seconds client-side

## Definition of Done

- [ ] All acceptance criteria met
- [ ] UI components implemented and styled
- [ ] All E2E tests passing
- [ ] All unit tests passing
- [ ] Manual testing completed
- [ ] Responsive design verified
- [ ] Accessibility requirements met (basic keyboard navigation, ARIA labels)
- [ ] Code reviewed and approved
- [ ] Documentation updated:
  - Admin user guide with screenshots
  - Component documentation
- [ ] E2E tests run successfully in CI/CD

## Related Files

**New Files:**
- `apps/dms/src/app/admin/cusip-cache-dashboard/cusip-cache-dashboard.component.ts`
- `apps/dms/src/app/admin/cusip-cache-dashboard/cusip-cache-dashboard.component.html`
- `apps/dms/src/app/admin/cusip-cache-dashboard/cusip-cache-dashboard.component.scss`
- `apps/dms/src/app/admin/cusip-cache-dashboard/cusip-cache-dashboard.component.spec.ts`
- `apps/dms/src/app/admin/cusip-cache-dashboard/cache-statistics/cache-statistics.component.ts`
- `apps/dms/src/app/admin/cusip-cache-dashboard/cache-search/cache-search.component.ts`
- `apps/dms/src/app/admin/cusip-cache-dashboard/cache-add-edit-dialog/cache-add-edit-dialog.component.ts`
- `apps/dms/src/app/admin/cusip-cache-dashboard/cache-activity-log/cache-activity-log.component.ts`
- `apps/dms/src/app/admin/services/cusip-cache-admin.service.ts`
- `apps/dms/src/app/admin/services/cusip-cache-admin.service.spec.ts`
- `apps/dms-material-e2e/src/cusip-cache-admin.spec.ts`

**Modified Files:**
- Admin routing module (add new route)
- Admin navigation menu (add menu item)

## Example UI Mockup

### Dashboard Statistics Section
```
CUSIP Cache Dashboard                   [Refresh] [Last updated: 2026-03-06 09:15 AM]

┌─────────────────────────────────────────────────────────────┐
│ Cache Statistics                                             │
├─────────────────────────────────────────────────────────────┤
│ Total Entries: 1,247                                        │
│ Cache Hit Rate: 73.5%                                       │
│                                                             │
│ Entries by Source:                                          │
│   • OpenFIGI: 892 (71.5%)                                  │
│   • Yahoo Finance: 355 (28.5%)                             │
│                                                             │
│ Date Range:                                                 │
│   • Oldest: Jan 15, 2024                                   │
│   • Newest: Mar 5, 2026                                    │
└─────────────────────────────────────────────────────────────┘
```

### Search Interface
```
┌─────────────────────────────────────────────────────────────┐
│ Search Cache                                    [Add New Mapping] │
├─────────────────────────────────────────────────────────────┤
│ Search by:                                                  │
│ ( ) CUSIP [_____________]  (•) Symbol [_________] [Search] [Clear] │
│                                                             │
│ Results:                                                    │
│ ┌──────────────┬────────┬─────────┬────────────┬──────────┐ │
│ │ CUSIP        │ Symbol │ Source  │ Resolved   │ Actions  │ │
│ ├──────────────┼────────┼─────────┼────────────┼──────────┤ │
│ │ 037833100    │ AAPL   │ OPENFIGI│ 2025-11-20 │ Edit Del │ │
│ │ 00206R102    │ T      │ OPENFIGI│ 2026-03-05 │ Edit Del │ │
│ └──────────────┴────────┴─────────┴────────────┴──────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Notes

- This story completes the CUSIP caching feature with user-facing admin tools
- E2E tests ensure the complete workflow from UI to database works correctly
- Admin UI should be intuitive for support staff with minimal training
- Consider adding export functionality in future (export cache to CSV)
- Monitor usage to determine if additional visualization (charts) would be valuable
