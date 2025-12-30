# Epic N: ETF Universe Management - Brownfield Enhancement

## Epic Goal

Extend the symbol universe management capabilities to support trading symbols beyond the screener-driven CEF universe, specifically ETFs, with proper flagging to distinguish between closed-end funds and other symbol types during synchronization operations.

## Epic Description

**Existing System Context:**

- Current relevant functionality: DMS application manages a universe of tradable symbols derived from screener results where three boolean criteria are met (CEFs only)
- Technology stack: Angular 20 frontend with PrimeNG, Fastify backend with Prisma ORM, SQLite database
- Integration points: Screener table for CEF discovery, Universe table for tradable symbols, Settings dialog for universe updates

**Enhancement Details:**

- What's being added/changed: Ability to manually add symbols (primarily ETFs) to the universe via UI, with database flag to distinguish between screener-driven CEFs and manually-added symbols
- How it integrates: Extends existing universe management without affecting screener-to-universe synchronization, prevents manual symbols from being marked as expired during sync operations
- Success criteria: Users can trade symbols not available through the screener (ETFs) while maintaining the automated CEF universe updates from screener data

## Stories

1. **Story 1:** Add `is_closed_end_fund` boolean flag to universe table schema with proper migration and default values
2. **Story 2:** Implement universe screen functionality to manually add symbols with appropriate UI controls and validation
3. **Story 3:** Update screener sync logic to preserve manually-added symbols (non-CEFs) during universe updates to prevent incorrect expiration

## Compatibility Requirements

- [x] Existing APIs remain unchanged for current universe operations
- [x] Database schema changes are backward compatible with migration strategy
- [x] Screener-to-universe sync functionality preserved for CEFs
- [x] Trading screen and position management remain unchanged
- [x] Manual universe entry fallback functionality maintained

## Technical Constraints

- Angular 20 with signals-based state management
- PrimeNG component library with TailwindCSS styling
- Prisma ORM with SQLite database
- Fastify backend API framework
- All changes must pass existing lint, format, and test requirements

## Success Metrics

- Users can successfully add ETF symbols to universe via UI
- Manually-added symbols persist through screener synchronization operations
- No regression in existing CEF universe management functionality
- Database maintains referential integrity with new schema changes

## Dependencies

- Builds on existing universe management infrastructure (Epics A-E)
- Requires completion of universe sync from screener functionality
- Integrates with existing settings and universe display screens

## Definition of Done

- [ ] Database schema updated with migration scripts
- [ ] Universe screen has add symbol functionality with proper validation
- [ ] Screener sync preserves manually-added symbols
- [ ] All existing tests pass plus new test coverage for ETF features
- [ ] Documentation updated for new universe management capabilities
- [ ] Manual testing confirms ETF symbols can be added and persist through sync operations
