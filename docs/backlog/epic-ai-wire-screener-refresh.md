# Epic AI: Wire Up Global/Screener Refresh Button

## Epic Goal

Enable the screener refresh functionality in DMS-MATERIAL to populate universe data from external CEF sources.

## Epic Description

**Existing System Context:**

- DMS app has working screener refresh that calls GET `/api/screener`
- Screener scrapes CEF data and populates screener table
- This is critical for getting bulk symbol data

**Enhancement Details:**

- Wire refresh button to screener service
- Show loading indicator during refresh
- Handle success/error states
- Update table after refresh completes

**Success Criteria:**

- Refresh button triggers backend screener scraping
- Loading indicator shows during operation
- Table updates with new data
- Error handling works properly

## Stories

1. **Story AI.1:** TDD - Write unit tests for screener service
2. **Story AI.2:** Implement screener service in DMS-MATERIAL
3. **Story AI.3:** TDD - Write tests for refresh button integration
4. **Story AI.4:** Wire refresh button to service
5. **Story AI.5:** TDD - Write tests for loading and error handling
6. **Story AI.6:** Add loading and error handling
7. **Story AI.7:** Add e2e tests for screener refresh

## Dependencies

- Epic AG (Risk groups must exist)

## Priority

**Critical** - Required for universe data population

## Estimated Effort

2-3 days

## Definition of Done

- [ ] Refresh button functional
- [ ] Loading states work
- [ ] Error handling implemented
- [ ] Unit tests pass
- [ ] E2E tests pass
