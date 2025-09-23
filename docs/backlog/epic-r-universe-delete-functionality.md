# Epic R: Universe Delete Functionality for Unused Rows

## Epic Goal

Add conditional delete functionality to the Universe screen that allows users to remove non-CEF universe entries that are not referenced by any trades, improving data hygiene and user control over their trading universe.

## Epic Description

**Existing System Context:**

- Current relevant functionality: Universe screen displays all tradable symbols with various management capabilities
- Technology stack: Angular 20 frontend with PrimeNG, Fastify backend with Prisma ORM, SQLite database
- Integration points: Universe table, Trades table (foreign key relationship), Universe screen UI

**Enhancement Details:**

- What's being added/changed: Add conditional delete button at the end of universe rows with business logic validation
- How it integrates: Extends existing Universe screen with new delete action that checks referential integrity
- Success criteria: Users can safely delete unused non-CEF symbols while preserving data integrity

## Stories

1. **Story 1:** Implement conditional delete button for unused non-CEF universe entries

## Compatibility Requirements

- [x] Existing Universe screen functionality remains unchanged
- [x] CEF symbols (is_closed_end_fund = true) cannot be deleted regardless of usage
- [x] Symbols with associated trades cannot be deleted (referential integrity)
- [x] Delete action includes confirmation dialog for safety
- [x] No breaking changes to universe or trades tables

## Technical Constraints

- Angular 20 with signals-based state management
- PrimeNG component library with TailwindCSS styling
- Prisma ORM with SQLite database
- Fastify backend API framework
- All changes must pass existing lint, format, and test requirements
- Must maintain referential integrity between universe and trades tables

## Success Metrics

- Delete button appears only for non-CEF symbols with no associated trades
- Delete operation successfully removes universe entries from database
- Confirmation dialog prevents accidental deletions
- No orphaned data or referential integrity violations
- UI updates immediately after successful deletion
- Error handling provides clear feedback for failed deletions

## Dependencies

- Builds on existing Universe screen infrastructure
- Requires backend API endpoint for delete operations with validation
- Integrates with existing universe management and display components

## Definition of Done

- [ ] Delete button appears conditionally based on business rules
- [ ] Backend API validates delete operations against business rules
- [ ] Confirmation dialog prevents accidental deletions
- [ ] Successful deletes update UI immediately
- [ ] Error cases are handled gracefully with user feedback
- [ ] All existing tests pass plus new test coverage for delete functionality
- [ ] Manual testing confirms proper business rule enforcement
