# Story AP.6: Implementation - Add Date Range Filtering

## Story

**As a** trader
**I want** to filter sold positions by date range
**So that** I can analyze performance for specific time periods

## Context

**Current System:**

- Story AP.5 created RED unit tests
- Sold positions table shows all sold positions
- No filtering UI available

**Problem:**

- Users with many trades cannot easily view specific time periods
- Difficult to generate reports for tax purposes
- No way to analyze quarterly or annual performance

## Acceptance Criteria

### Functional Requirements

- [ ] Start date filter input added
- [ ] End date filter input added
- [ ] Filters applied to sell_date field
- [ ] Clear filter button available
- [ ] Filter state persists during session
- [ ] Table updates reactively when filters change

### Technical Requirements

- [ ] Re-enable tests from AP.5
- [ ] All unit tests pass (GREEN)
- [ ] Use Material date picker components
- [ ] Filtering in computed signal
- [ ] Proper date comparison logic

## Definition of Done

- [ ] Date range filtering implemented
- [ ] All AP.5 tests re-enabled and passing
- [ ] All existing tests pass
- [ ] Lint passes
- [ ] Manual testing completed
- [ ] Visual verification (date pickers work)
- [ ] No console errors
- [ ] Code reviewed
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- Use Material date picker for consistent UX
- Consider adding preset ranges (Last 30 days, Last quarter, etc.)
- Store filter state in component signal
- Ensure proper timezone handling

## Dependencies

- Story AP.5 completed
