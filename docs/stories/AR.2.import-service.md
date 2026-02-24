# Story AR.2: Create Import Service and Backend Endpoint

**Status:** Approved

## Story

**As a** system
**I want** an import service and backend endpoint for Fidelity transactions
**So that** users can import CSV files via API

## Context

**Current System:**

- CSV parser and mapper implemented in AR.1
- Tests written in Story AR.2-TDD define expected behavior
- Need service layer and API endpoint

**Implementation Approach:**

- Implement import service following TDD tests
- Implement backend endpoint following TDD tests
- Re-enable tests from AR.2-TDD
- Verify all tests pass (GREEN phase)

## Acceptance Criteria

### Functional Requirements

1. [ ] Import service orchestrates full import process
2. [ ] Backend endpoint accepts file uploads
3. [ ] Service validates accounts before processing
4. [ ] Service creates appropriate database records for each transaction type
5. [ ] Detailed error reporting for validation failures
6. [ ] Idempotent import operation

### Technical Requirements

1. [ ] All tests from AR.2-TDD re-enabled and passing
2. [ ] Code follows project coding standards
3. [ ] Proper error handling and logging
4. [ ] Type-safe implementation with TypeScript
5. [ ] Unit and integration test coverage >80%
6. [ ] Authentication required for endpoint

## Tasks / Subtasks

- [ ] Re-enable tests from AR.2-TDD (AC: 1)
- [ ] Implement import service (AC: 1, 3, 4, 5, 6)
  - [ ] Create service class/module
  - [ ] Implement account validation
  - [ ] Implement purchase processing (create trades)
  - [ ] Implement sale processing (update trades, match positions)
  - [ ] Implement dividend processing (create dividend deposits)
  - [ ] Implement cash deposit processing (create dividend deposits)
  - [ ] Implement error collection and reporting
  - [ ] Add logging for audit trail
- [ ] Implement backend endpoint (AC: 2, 6)
  - [ ] Create POST /api/import/fidelity route
  - [ ] Add file upload handling (multipart/form-data)
  - [ ] Add authentication middleware
  - [ ] Call parser and service
  - [ ] Format success/error responses
- [ ] Verify all tests pass (AC: 1)
- [ ] Run validation commands

## Dev Notes

### Testing Standards

- **Test Location:** Server-side tests in `apps/server/src/**/*.spec.ts`
- **Testing Framework:** Vitest for unit, Supertest for integration
- **Coverage:** Must achieve >80% coverage
- **Re-enable Tests:** Change `.skip` to active tests from AR.2-TDD

### Technical Context

- **Service Layer:** Orchestrates parsing, validation, mapping, and database operations
- **Endpoint:** `/api/import/fidelity` (POST)
- **Request Format:** multipart/form-data with file field
- **Response Format:**
  ```json
  {
    "success": true,
    "imported": 45,
    "errors": [],
    "warnings": ["Unknown transaction type on row 12"]
  }
  ```

### Database Operations

- **Purchases:** Insert into `trades` table with purchase data
- **Sales:** Update existing `trades` records with sell data (match by account, symbol, quantity)
- **Dividends:** Insert into dividend deposits table
- **Cash Deposits:** Insert into dividend deposits table (same table as dividends)
- **Position Splitting:** If sale quantity doesn't match open position, split position records

### Error Handling

- Collect all errors rather than fail on first error
- Return detailed error messages with row numbers
- Log all import attempts (success and failure) for audit
- Handle partial failures gracefully

### Authentication

- Require user authentication (JWT or session)
- Associate imported records with authenticated user's accounts

## Definition of Done

- [ ] All tests from AR.2-TDD re-enabled and passing (GREEN phase)
- [ ] Import service implemented and working
- [ ] Backend endpoint implemented and working
- [ ] Error handling implemented with detailed messages
- [ ] Logging implemented
- [ ] Authentication enforced
- [ ] Code follows project conventions
- [ ] Unit and integration test coverage >80%
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD GREEN phase
- All tests from AR.2-TDD should pass after implementation
- Build incrementally, running tests frequently
- Consider transaction safety for database operations

## Related Stories

- **Previous:** Story AR.2-TDD (Tests)
- **Next:** Story AR.3-TDD (UI Tests)
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
