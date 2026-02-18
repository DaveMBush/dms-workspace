# Story AP.2: Implementation - Wire Sold Positions Table to Trades SmartNgRX

## Story

**As a** frontend developer
**I want** to wire the sold positions table to the trades SmartNgRX entity
**So that** users can see their actual closed trading positions from the database

## Context

**Current System:**

- Story AP.1 created RED unit tests
- Sold positions component exists but shows no data
- TradesEffects SmartNgRX entity configured

**Problem:**

- Component not connected to real data
- Users cannot see their sold positions

## Acceptance Criteria

### Functional Requirements

- [ ] Component loads trades from SmartNgRX
- [ ] Only displays trades where sell_date is not null (sold positions)
- [ ] Filters by currently selected account
- [ ] Table updates when account changes
- [ ] Loading states displayed during data fetch
- [ ] Sorted by sell_date descending by default

### Technical Requirements

- [ ] Re-enable tests from AP.1
- [ ] All unit tests pass (GREEN)
- [ ] Inject TradesEffects properly
- [ ] Use computed signals for filtering
- [ ] Follow SmartNgRX patterns

## Definition of Done

- [ ] Component wired to SmartNgRX
- [ ] All AP.1 tests re-enabled and passing
- [ ] All existing tests pass
- [ ] Lint passes
- [ ] Manual testing completed
- [ ] No console errors
- [ ] Code reviewed
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- Follow patterns from open positions component (AO.2)
- Reference DMS app for expected behavior
- Ensure proper TypeScript typing
- Use Angular 18 signal syntax

## Dependencies

- Story AP.1 completed
- TradesEffects configured
- AccountsEffects configured
