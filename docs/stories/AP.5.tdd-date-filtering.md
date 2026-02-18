# Story AP.5: TDD - Date Range Filtering

## Story

**As a** frontend developer
**I want** comprehensive unit tests for date range filtering
**So that** I can ensure users can filter sold positions by date

## Context

**Current System:**

- Story AP.4 displays sold positions with capital gains
- All sold positions shown regardless of date
- No filtering UI exists

**Problem:**

- Users may have hundreds of sold positions
- Need ability to filter by date range
- Helpful for tax reporting and performance analysis

## Acceptance Criteria

### Functional Requirements

- [ ] Tests verify filtering by start date
- [ ] Tests verify filtering by end date
- [ ] Tests verify filtering by date range
- [ ] Tests verify clearing filters
- [ ] Tests verify invalid date handling

### Technical Requirements

- [ ] Unit tests created with >80% coverage
- [ ] Tests follow AAA pattern
- [ ] Tests are disabled after verification they run RED
- [ ] Edge cases covered (null dates, invalid dates, future dates)

## Definition of Done

- [ ] Comprehensive unit tests created
- [ ] Tests run and fail (RED state verified)
- [ ] Tests disabled with .skip for CI to pass
- [ ] All existing tests still pass
- [ ] Lint passes
- [ ] Tests follow AAA pattern
- [ ] Code reviewed
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- Tests must be disabled after verification to allow merge
- Implementation happens in Story AP.6
- Consider fiscal year filtering as future enhancement
- Filter should work on sell_date field

## Dependencies

- Story AP.4 completed
