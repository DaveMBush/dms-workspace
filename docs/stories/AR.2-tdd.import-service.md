# Story AR.2-TDD: Write Unit Tests for Import Service and Backend Endpoint - TDD RED Phase

**Status:** Draft

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

- [ ] Create test file for import service (AC: 1)
  - [ ] Test importing purchases (creates trades)
  - [ ] Test importing sales (updates trades)
  - [ ] Test importing dividends (creates dividend deposits)
  - [ ] Test importing cash deposits (creates dividend deposits)
  - [ ] Test account validation
  - [ ] Test transaction validation
  - [ ] Test error aggregation
- [ ] Create integration tests for endpoint (AC: 2)
  - [ ] Test POST /api/import/fidelity endpoint
  - [ ] Test file upload handling
  - [ ] Test success response format
  - [ ] Test error response format
  - [ ] Test authentication/authorization
- [ ] Write edge case tests (AC: 3)
  - [ ] Test empty file
  - [ ] Test invalid CSV format
  - [ ] Test non-existent account
  - [ ] Test duplicate transactions
  - [ ] Test partial success scenarios
- [ ] Disable all tests using .skip (AC: 5)
- [ ] Verify tests fail before disabling (AC: 4)
- [ ] Run validation commands

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

- [ ] All tests written and disabled (RED phase)
- [ ] Tests cover all acceptance criteria scenarios
- [ ] Tests disabled to allow CI to pass
- [ ] Test code follows project conventions
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
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

| Date       | Version | Description      | Author |
| ---------- | ------- | ---------------- | ------ |
| 2026-02-24 | 1.0     | Initial creation | SM     |

---

## Dev Agent Record

### Agent Model Used

_To be populated during implementation_

### Debug Log References

_To be populated during implementation_

### Completion Notes List

_To be populated during implementation_

### File List

_To be populated during implementation_

---

## QA Results

_To be populated after implementation_
