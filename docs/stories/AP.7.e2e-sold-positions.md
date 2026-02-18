# Story AP.7: E2E Tests for Sold Positions Screen

## Story

**As a** QA engineer
**I want** comprehensive E2E tests for the sold positions screen
**So that** we can ensure the entire user workflow functions correctly

## Context

**Current System:**

- Stories AP.1-AP.6 completed
- Sold positions screen fully functional
- Need E2E tests to verify complete user flows

**Problem:**

- No E2E coverage for sold positions
- Need to verify integration across all features

## Acceptance Criteria

### Functional Requirements

- [ ] Test: Load sold positions for account
- [ ] Test: Verify capital gains calculations displayed
- [ ] Test: Filter by date range
- [ ] Test: Clear date filters
- [ ] Test: Sort by columns
- [ ] Test: Switch accounts updates positions
- [ ] Test: Verify only closed positions shown (sell_date not null)

### Technical Requirements

- [ ] E2E tests using Playwright
- [ ] Tests use proper data setup/teardown
- [ ] Tests verify no console errors
- [ ] Tests cover edge cases

## Definition of Done

- [ ] E2E tests created for all user flows
- [ ] All E2E tests passing
- [ ] No console errors during tests
- [ ] Visual appearance verified
- [ ] Edge cases covered
- [ ] All existing E2E tests still pass
- [ ] Lint passes
- [ ] Code reviewed
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- Follow existing E2E test patterns from open positions (AO.10)
- Use data-testid attributes for stable selectors
- Consider adding visual regression tests
- Document any flaky tests and solutions

## Dependencies

- Stories AP.1-AP.6 completed
- Playwright configured
- Test data available
