# Epic P: Capital Gains Calculations in Sold Tab

## Epic Goal

Implement comprehensive capital gains calculations in the Sold tab of the Account screen, displaying both dollar amounts and percentage returns for completed trades to provide traders with clear profit/loss visibility.

## Epic Description

**Existing System Context:**

- Current relevant functionality: Account screen with Sold tab that displays completed trades (sell price > 0 and sell_date populated)
- Technology stack: Angular 20 frontend with PrimeNG, Fastify backend with Prisma ORM, SQLite database
- Integration points: Trades table with buy/sell prices and dates, Account screen Sold tab display

**Enhancement Details:**

- What's being added/changed: Add Cap Gains$ and Cap Gains% columns to the Sold tab with accurate calculations
- How it integrates: Extends existing Sold tab functionality by adding computed columns based on existing buy/sell price data
- Success criteria: Traders can see both dollar and percentage capital gains for all completed trades

## Stories

1. **Story 1:** Implement capital gains calculations ($ and %) in the Sold tab display

## Compatibility Requirements

- [x] Existing Sold tab functionality remains unchanged for all other columns
- [x] Account screen navigation and tabs continue to work as expected
- [x] No breaking changes to trades table schema
- [x] Trading functionality remains unaffected

## Technical Constraints

- Angular 20 with signals-based state management
- PrimeNG component library with TailwindCSS styling
- Prisma ORM with SQLite database
- Fastify backend API framework
- All changes must pass existing lint, format, and test requirements

## Success Metrics

- Sold tab displays accurate capital gains calculations for all completed trades
- Cap Gains$ shows precise dollar amount profit/loss (sell*price * quantity - buy*price * quantity)
- Cap Gains% shows accurate percentage return ((sell_price - buy_price) / buy_price \* 100)
- Calculations handle edge cases (zero cost basis, negative returns) appropriately
- Performance remains acceptable with large numbers of sold positions

## Dependencies

- Builds on existing Account screen and trades management infrastructure
- Requires access to completed trades data (sell price > 0 and sell_date populated)
- Integrates with existing Sold tab display components

## Definition of Done

- [ ] Cap Gains$ column added to Sold tab with accurate dollar calculations
- [ ] Cap Gains% column added to Sold tab with accurate percentage calculations
- [ ] Both columns handle edge cases appropriately
- [ ] All existing tests pass plus new test coverage for capital gains calculations
- [ ] Manual testing confirms accurate calculations for various trade scenarios
- [ ] Performance testing ensures no degradation with large datasets
