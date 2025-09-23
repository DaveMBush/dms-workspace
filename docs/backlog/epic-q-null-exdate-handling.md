# Epic Q: Null Ex-Date Handling in Open Positions

## Epic Goal

Ensure the Open Positions tab on the Account screen properly handles universe entries with null ex-dates and computes all dependent columns correctly without errors or missing data.

## Epic Description

**Existing System Context:**

- Current relevant functionality: Account screen with Open Positions tab that displays trading positions with calculations based on ex-date values
- Technology stack: Angular 20 frontend with PrimeNG, Fastify backend with Prisma ORM, SQLite database
- Integration points: Universe table with ex-date field, Account screen Open Positions tab, column calculations dependent on ex-date

**Enhancement Details:**

- What's being added/changed: Handle null ex-date values gracefully in the Open Positions tab calculations and display
- How it integrates: Updates existing Open Positions tab logic to detect null ex-dates and either provide default behavior or appropriate messaging
- Success criteria: All columns in Open Positions tab display correctly even when ex-date is null, no calculation errors occur

## Stories

1. **Story 1:** Analyze and fix null ex-date handling in Open Positions tab calculations

## Compatibility Requirements

- [x] Existing Account screen functionality remains unchanged for positions with valid ex-dates
- [x] Open Positions tab continues to display all existing columns
- [x] No breaking changes to universe table schema
- [x] Trading functionality remains unaffected

## Technical Constraints

- Angular 20 with signals-based state management
- PrimeNG component library with TailwindCSS styling
- Prisma ORM with SQLite database
- Fastify backend API framework
- All changes must pass existing lint, format, and test requirements

## Success Metrics

- Open Positions tab displays without errors when universe entries have null ex-dates
- All calculated columns show appropriate values or clear messaging for null ex-date cases
- No JavaScript errors in browser console related to ex-date calculations
- Existing functionality with valid ex-dates remains unchanged

## Dependencies

- Builds on existing Account screen and universe management infrastructure
- Requires understanding of current ex-date calculation logic
- Integrates with existing Open Positions display components

## Definition of Done

- [ ] Open Positions tab handles null ex-dates without errors
- [ ] All calculated columns display appropriate values for null ex-date cases
- [ ] Existing functionality with valid ex-dates remains unchanged
- [ ] All existing tests pass plus new test coverage for null ex-date scenarios
- [ ] Manual testing confirms proper behavior with both null and valid ex-dates
