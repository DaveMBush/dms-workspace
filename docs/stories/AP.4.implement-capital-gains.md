# Story AP.4: Implementation - Display Capital Gains Calculations

## Story

**As a** trader
**I want** to see capital gains calculations for my sold positions
**So that** I can track my investment performance

## Context

**Current System:**

- Story AP.3 created RED unit tests
- Sold positions table displays basic trade data
- Capital gains columns exist but show no data

**Problem:**

- Users cannot see profit/loss on sold positions
- No visibility into percentage returns
- Cannot see holding period

## Acceptance Criteria

### Functional Requirements

- [ ] Capital gains dollar amount displayed: (sell - buy) \* quantity
- [ ] Capital gains percentage displayed: ((sell - buy) / buy) \* 100
- [ ] Days held displayed: sell_date - buy_date
- [ ] Positive gains shown in green
- [ ] Negative gains (losses) shown in red
- [ ] Handles missing data gracefully

### Technical Requirements

- [ ] Re-enable tests from AP.3
- [ ] All unit tests pass (GREEN)
- [ ] Calculations performed in computed signal
- [ ] Proper number formatting (currency, percentage)
- [ ] Follow Angular best practices

## Definition of Done

- [ ] Capital gains calculations implemented
- [ ] All AP.3 tests re-enabled and passing
- [ ] All existing tests pass
- [ ] Lint passes
- [ ] Manual testing completed
- [ ] Visual verification (colors, formatting)
- [ ] No console errors
- [ ] Code reviewed
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- Reference DMS app for calculation formulas
- Use Material colors for gain/loss indicators
- Format currency to 2 decimal places
- Format percentage to 2 decimal places

## Dependencies

- Story AP.3 completed
