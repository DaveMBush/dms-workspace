# Story C2: Integration tests (server)

## Story
**As a** developer,
**I want** comprehensive integration tests for the Universe sync from Screener functionality,
**so that** I can verify the end-to-end database operations work correctly and ensure idempotency.

## Acceptance Criteria
1. Seed `risk_group`, `screener`, `universe`; run sync; assert upserts and expirations; re-run to assert idempotency
2. Executable locally and in CI

## Tasks / Subtasks
- [x] Create comprehensive database integration tests
- [x] Test data seeding with risk groups, screener, and universe records
- [x] Test screener selection criteria (three boolean flags)
- [x] Test universe upsert operations (insert new, update existing)
- [x] Test expire operations on non-selected universe records
- [x] Test idempotency through repeated operations
- [x] Test trading history preservation during updates
- [x] Test concurrent database operations
- [x] Test database constraints and foreign key relationships
- [x] Ensure tests are executable locally and in CI environment

## Dependencies
- Story A1 (Backend sync endpoint implementation)

## Dev Notes

### Testing Standards
- **Framework**: Vitest with real Prisma + SQLite integration
- **Test file location**: `apps/server/src/app/routes/universe/sync-from-screener/sync.integration.spec.ts`
- **Database**: Isolated temporary SQLite files per test suite
- **Coverage**: Database operations, business logic, idempotency, error handling
- **Focus**: Integration testing without external API dependencies

### Database Schema Context
- **risk_group**: Contains risk categorization (Conservative, Aggressive, etc.)
- **screener**: Contains symbols with eligibility criteria (has_volitility, objectives_understood, graph_higher_before_2008)
- **universe**: Contains tradable symbols with pricing and distribution data
- **Selection criteria**: All three boolean flags must be true for eligibility

### Integration Test Requirements
- Use real Prisma client with temporary SQLite database
- Test foreign key constraints and relationships
- Verify concurrent operation handling
- Validate business logic for sync operations
- Test idempotency by running operations multiple times
- Preserve trading history during universe updates
- Clean database state between tests

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4 (claude-sonnet-4-20250514)

### File List
- apps/server/src/app/routes/universe/sync-from-screener/sync.integration.spec.ts (created - comprehensive database integration tests)

### Change Log
- Created comprehensive database integration tests covering all acceptance criteria
- Implemented tests for data seeding with risk groups, screener, and universe records
- Added tests for screener selection criteria validation (three boolean flags)
- Created tests for universe upsert operations (insert new, update existing)
- Implemented tests for expire operations on non-selected universe records
- Added idempotency testing through repeated operations
- Created tests for trading history preservation during updates
- Implemented concurrent database operations testing
- Added database constraints and foreign key relationship validation
- Ensured tests are executable locally and in CI environment
- Used isolated temporary SQLite databases for test isolation
- Integrated with existing Vitest testing framework

### Completion Notes
- All acceptance criteria met with comprehensive database integration testing
- Tests cover seeding of risk_group, screener, universe data
- Tests verify sync operations with proper upserts and expirations
- Tests validate idempotency through repeated operation execution
- Tests execute successfully both locally and in CI environment
- Used real Prisma client with temporary SQLite databases for true integration testing
- Avoided external API dependencies by focusing on database operations
- Comprehensive coverage of business logic, constraints, and error handling scenarios

### Status
Completed
