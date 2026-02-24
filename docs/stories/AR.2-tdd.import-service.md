# Story AR.2-TDD: Write Unit Tests for Import Service and Backend Endpoint - TDD RED Phase

**Status:** Approved

## Story

**As a** developer
**I want** to write comprehensive unit tests for the import service and backend endpoint
**So that** I have failing tests that define the expected service behavior (TDD RED phase)

## Context

**Current System:**

- CSV parser and mapper implemented in AR.1
- Need service layer to orchestrate import process
- Need backend endpoint to expose import functionality

**Implementation Approach:**

- Write unit tests for import service
- Write integration tests for backend endpoint
- Disable tests after writing to allow CI to pass
- Tests will be re-enabled in Story AR.2

## Acceptance Criteria

### Functional Requirements

1. [ ] All unit tests written for import service
2. [ ] All integration tests written for backend endpoint
3. [ ] Tests cover all expected behaviors
4. [ ] All tests initially fail (RED phase)
5. [ ] Tests disabled with `xit()` or `.skip` to allow CI to pass

### Technical Requirements

1. [ ] Tests follow existing testing patterns
2. [ ] Mock dependencies properly configured (parser, mapper, Prisma)
3. [ ] Test coverage includes edge cases
4. [ ] Test descriptions are clear and specific
5. [ ] Integration tests use test database

## Tasks / Subtasks

- [x] Create test file for import service (AC: 1)
  - [x] Test importing purchases (creates trades)
  - [x] Test importing sales (updates trades)
  - [x] Test importing dividends (creates dividend deposits)
  - [x] Test importing cash deposits (creates dividend deposits)
  - [x] Test account validation
  - [x] Test transaction validation
  - [x] Test error aggregation
- [x] Create integration tests for endpoint (AC: 2)
  - [x] Test POST /api/import/fidelity endpoint
  - [x] Test file upload handling
  - [x] Test success response format
  - [x] Test error response format
  - [x] Test authentication/authorization
- [x] Write edge case tests (AC: 3)
  - [x] Test empty file
  - [x] Test invalid CSV format
  - [x] Test non-existent account
  - [x] Test duplicate transactions
  - [x] Test partial success scenarios
- [x] Disable all tests using .skip (AC: 5)
- [x] Verify tests fail before disabling (AC: 4)
- [x] Run validation commands

## Dev Notes

### Testing Standards

- **Test Location:** Server-side tests in `apps/server/src/**/*.spec.ts`
- **Testing Framework:** Vitest for unit, Supertest for integration
- **Patterns:** Use AAA (Arrange-Act-Assert) pattern
- **Coverage:** Target >80% coverage for service and endpoint
- **Database:** Use test SQLite database for integration tests

### Technical Context

- Import service orchestrates: parse CSV → validate data → map transactions → save to database
- Endpoint accepts multipart/form-data file upload
- Must validate account exists before processing transactions
- Should provide detailed error messages for each validation failure
- Should handle partial failures gracefully (report which rows failed)
- Must be idempotent (safe to re-run same import)

### Service Responsibilities

- Accept parsed CSV data
- Validate account exists for each transaction
- Call appropriate mapper for each transaction type
- Save mapped transactions to database via Prisma
- Track successes and failures
- Return detailed results

### Endpoint Responsibilities

- Accept file upload
- Call CSV parser
- Call import service
- Return JSON response with success/error details
- Handle authentication (user must be logged in)

## Definition of Done

- [x] All tests written and disabled (RED phase)
- [x] Tests cover all acceptance criteria scenarios
- [x] Tests disabled to allow CI to pass
- [x] Test code follows project conventions
- [x] All validation commands pass:
  - [x] Run `pnpm all`
  - [x] Run `pnpm e2e:dms-material`
  - [x] Run `pnpm dupcheck`
  - [x] Run `pnpm format`
  - [x] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD RED phase
- Tests should fail because implementation doesn't exist yet
- Tests must be disabled before merge to allow CI to pass
- Story AR.2 will implement the functionality and re-enable tests

## Related Stories

- **Previous:** Story AR.1 (Parser Implementation)
- **Next:** Story AR.2 (Service Implementation)
- **Epic:** Epic AR - Fidelity Transaction Import

---

## Change Log

| Date       | Version | Description                                                                                                                               | Author    |
| ---------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 2026-02-24 | 1.0     | Initial creation                                                                                                                          | SM        |
| 2026-02-24 | 1.1     | Implemented TDD RED phase tests for import service (15 unit tests) and endpoint (13 integration tests), all disabled with describe.skip() | Dev Agent |

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (copilot)

### Debug Log References

None - all tests created successfully on first attempt.

### Completion Notes List

- Created import service unit test file with 15 tests covering purchases, sales, dividends, cash deposits, account validation, transaction validation, error aggregation, mixed transactions, and idempotency
- Created endpoint integration test file with 13 tests covering file upload handling, success/error response formats, authentication, and edge cases
- All tests wrapped in `describe.skip()` to allow CI to pass (TDD RED phase)
- Tests reference `importFidelityTransactions` function and import route handler that do not exist yet

### File List

- `apps/server/src/app/routes/import/fidelity-import-service.function.spec.ts` - Created (import service unit tests)
- `apps/server/src/app/routes/import/fidelity-import.endpoint.spec.ts` - Created (endpoint integration tests)
- `docs/stories/AR.2-tdd.import-service.md` - Modified (story updates)

---

## QA Results

_To be populated after implementation_
