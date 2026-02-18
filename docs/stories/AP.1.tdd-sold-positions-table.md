# Story AP.1: TDD - Unit Tests for Wiring Sold Positions Table

## Story

**As a** frontend developer
**I want** comprehensive unit tests for sold positions table integration
**So that** I can ensure the component correctly connects to SmartNgRX before implementation

## Context

**Current System:**

- Sold positions component migrated from Epic AE
- Trades SmartNgRX entity already exists (used by open positions)
- Component shows empty data with FUTURE comment for SmartNgRX wiring

**Problem:**

- Component currently displays no data (empty signal)
- Need to verify proper integration with SmartNgRX before implementation
- Must filter for closed positions (sell_date is not null)

## Acceptance Criteria

### Functional Requirements

- [ ] Tests verify component subscribes to trades entity
- [ ] Tests verify filtering for sold positions (sell_date is not null)
- [ ] Tests verify filtering by selected account
- [ ] Tests verify data transformation for display
- [ ] Tests verify capital gains calculations

### Technical Requirements

- [ ] Unit tests created with >80% coverage
- [ ] Tests follow AAA pattern (Arrange-Act-Assert)
- [ ] Tests are disabled after verification they run RED
- [ ] Mock SmartNgRX effects and selectors properly

## Definition of Done

- [ ] Comprehensive unit tests created (>80% coverage)
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
- Implementation happens in Story AP.2
- Follow SmartNgRX patterns from open positions component (AO.2)
- Capital gains calculations are critical business logic

## Dependencies

- Epic AO completed (Open positions working)
- TradesEffects entity exists
- AccountsEffects entity exists
