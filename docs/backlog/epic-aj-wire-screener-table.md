# Epic AJ: Wire Up Global/Screener Table Display and Editing

## Epic Goal

Connect the screener table in RMS-MATERIAL to backend data with full edit capabilities.

## Epic Description

**Existing System Context:**
- RMS app displays screener data with editable checkboxes
- Screen effect service handles backend communication  
- Three boolean fields: has_volatility, objectives_understood, graph_higher_before_2008

**Enhancement Details:**
- Load screener data via SmartNgRX
- Enable checkbox editing
- Persist edits to backend
- Apply risk group filtering

**Success Criteria:**
- Table displays screener data
- Checkboxes are editable
- Changes persist to backend
- Filtering by risk group works

## Stories

1. **Story AJ.1:** Wire screener table to SmartNgRX screen entities
2. **Story AJ.2:** Implement checkbox editing with backend updates
3. **Story AJ.3:** Wire up risk group filter dropdown  
4. **Story AJ.4:** Add unit tests for table operations
5. **Story AJ.5:** Add e2e tests for screener table

## Dependencies

- Epic AI (Screener refresh must work)

## Priority

**High** - Core screener functionality

## Estimated Effort

2-3 days

## Definition of Done

- [ ] Table displays and filters correctly
- [ ] Editing works and persists
- [ ] Unit tests pass
- [ ] E2E tests pass
