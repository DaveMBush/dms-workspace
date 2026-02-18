# Story AP.3: TDD - Capital Gains Calculations

## Story

**As a** frontend developer
**I want** comprehensive unit tests for capital gains calculations
**So that** I can ensure accurate display of investment performance

## Context

**Current System:**

- Story AP.2 displays sold positions
- Column definitions exist for capital gains fields
- Calculations not yet implemented

**Problem:**

- No capital gains amount shown (sell - buy) * quantity
- No capital gains percentage shown ((sell - buy) / buy) * 100
- No days held calculation (sell_date - buy_date)

## Acceptance Criteria

### Functional Requirements

- [ ] Tests verify capital gains dollar amount calculation
- [ ] Tests verify capital gains percentage calculation
- [ ] Tests verify days held calculation
- [ ] Tests handle missing price data gracefully
- [ ] Tests verify negative gains (losses) display correctly

### Technical Requirements

- [ ] Unit tests created with >80% coverage
- [ ] Tests follow AAA pattern
- [ ] Tests are disabled after verification they run RED
- [ ] Edge cases covered (null prices, zero prices, same day trades)

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
- Implementation happens in Story AP.4
- Capital gains are critical financial calculations - accuracy is paramount
- Reference DMS app for correct formulas

## Dependencies

- Story AP.2 completed
