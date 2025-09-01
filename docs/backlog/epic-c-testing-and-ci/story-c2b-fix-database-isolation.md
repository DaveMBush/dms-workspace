# Story C2b: Fix database isolation for integration tests

## Status

Draft

## Story

**As a** developer,
**I want** integration tests to use a dedicated test database (test.db) that is properly isolated from the main database.db,
**so that** I can run tests without affecting the production database and ensure clean test environments.

## Acceptance Criteria

1. Integration tests must create and use a dedicated `test.db` file
2. If `test.db` already exists, it must be deleted before creating a fresh instance
3. `test.db` must be completely removed after test execution completes
4. Tests must not modify or interfere with the main `database.db` file
5. All existing integration test functionality must continue to work with the new database isolation

## Tasks / Subtasks

- [ ] Modify integration test setup to use dedicated test.db database (AC: 1)
  - [ ] Update beforeAll to create test.db with proper DATABASE_URL configuration
  - [ ] Ensure Prisma migrations are applied to test.db only
- [ ] Implement test.db cleanup logic (AC: 2, 3)
  - [ ] Check for existing test.db and delete it before test execution
  - [ ] Add afterAll cleanup to remove test.db file completely
  - [ ] Add error handling to ensure cleanup happens even if tests fail
- [ ] Verify database isolation (AC: 4)
  - [ ] Confirm tests do not affect main database.db
  - [ ] Test that concurrent test runs use separate database files
- [ ] Validate existing test functionality (AC: 5)
  - [ ] Run all existing integration tests to ensure they pass
  - [ ] Verify test data seeding works correctly with test.db
  - [ ] Confirm idempotency testing still functions properly

## Dependencies

- Story C2 (Integration tests server)

## Dev Notes

### Previous Story Insights

From Story C2 completion, the current implementation uses a random UUID for the database filename (`test-db-integration-${randomUUID()}.db`) created in the project root. The issue is that the migration deployment uses the system DATABASE_URL which may affect the main database.db file.

### Database Configuration Context

- **Main Database**: `database.db` used by the application
- **Test Database**: Should be `test.db` (dedicated test database file)
- **Migration Strategy**: Use explicit DATABASE_URL override for test database only
- **Cleanup Strategy**: Ensure test.db is deleted before and after test execution

### Testing Standards

- **Framework**: Vitest with real Prisma + SQLite integration [Source: architecture/ci-and-testing.md#frameworks]
- **Test file location**: `apps/server/src/app/routes/universe/sync-from-screener/sync.integration.spec.ts` [Source: Story C2 completion]
- **Database Strategy**: Use per-test SQLite file via `DATABASE_URL=file:./test.db` [Source: architecture/ci-and-testing.md#test-data-and-db]
- **Migration Requirements**: Migrate before tests, wipe file after suite [Source: architecture/ci-and-testing.md#test-data-and-db]
- **Coverage**: Database operations, business logic, idempotency, error handling [Source: Story C2 completion]

### Database Isolation Requirements

- **File Location**: `test.db` in project root (not random UUID filename)
- **Cleanup Order**: Delete existing test.db → Create fresh test.db → Run tests → Delete test.db
- **Migration Isolation**: Ensure `npx prisma migrate deploy` only affects test.db
- **Error Handling**: Cleanup must occur even if tests fail or throw exceptions

### File Modifications Required

- **Primary File**: `apps/server/src/app/routes/universe/sync-from-screener/sync.integration.spec.ts`
  - Update beforeAll to use dedicated test.db filename
  - Add pre-test cleanup to remove existing test.db
  - Update DATABASE_URL configuration to point to test.db
  - Enhance afterAll cleanup with error handling
  - Ensure migration deployment uses correct DATABASE_URL

### Project Structure Notes

No structural conflicts identified. The test file location aligns with the existing project structure from Story C2.
