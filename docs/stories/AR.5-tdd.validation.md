# Story AR.5-TDD: Write Unit Tests for Validation and Error Reporting - TDD RED Phase

**Status:** Ready for Review

## Story

**As a** developer
**I want** to write comprehensive unit tests for validation and error reporting
**So that** I have failing tests that define the expected validation behavior (TDD RED phase)

## Context

**Current System:**

- File upload and basic processing implemented in AR.4
- Need comprehensive validation and user-friendly error reporting
- Must handle various data quality issues gracefully

**Implementation Approach:**

- Write unit tests for all validation scenarios
- Write tests for error reporting and aggregation
- Disable tests after writing to allow CI to pass
- Tests will be re-enabled in Story AR.5

## Acceptance Criteria

### Functional Requirements

1. [x] All unit tests written for data validation
2. [x] Tests verify account existence validation
3. [x] Tests verify symbol validation
4. [x] Tests verify numeric field validation (quantity, price, amount)
5. [x] Tests verify date validation
6. [x] Tests verify duplicate transaction detection
7. [x] Tests verify error message formatting
8. [x] Tests verify partial success handling
9. [x] All tests initially fail (RED phase)
10. [x] Tests disabled with `xit()` or `.skip` to allow CI to pass

### Technical Requirements

1. [x] Tests follow existing testing patterns
2. [x] Mock dependencies properly configured
3. [x] Test coverage includes edge cases
4. [x] Test descriptions are clear and specific
5. [x] Tests cover both validation logic and error reporting

## Tasks / Subtasks

- [x] Create tests for account validation (AC: 2)
  - [x] Test account exists in database
  - [x] Test account belongs to current user
  - [x] Test case-sensitive vs case-insensitive matching
  - [x] Test error message for non-existent account
- [x] Create tests for symbol validation (AC: 3)
  - [x] Test symbol format validation
  - [x] Test empty symbol handling
  - [x] Test symbol with special characters
- [x] Create tests for numeric validation (AC: 4)
  - [x] Test quantity is positive number
  - [x] Test price is positive number
  - [x] Test amount validation
  - [x] Test decimal precision handling
  - [x] Test zero values
  - [x] Test negative values (should fail or handle appropriately)
- [x] Create tests for date validation (AC: 5)
  - [x] Test valid date formats
  - [x] Test invalid date formats
  - [x] Test future dates
  - [x] Test very old dates
  - [x] Test date parsing from various formats
- [x] Create tests for duplicate detection (AC: 6)
  - [x] Test same transaction in file multiple times
  - [x] Test transaction already in database
  - [x] Test duplicate detection criteria
- [x] Create tests for error reporting (AC: 7, 8)
  - [x] Test error message includes row number
  - [x] Test error message includes field name
  - [x] Test error message is user-friendly
  - [x] Test multiple errors aggregated per row
  - [x] Test all errors collected (not just first error)
  - [x] Test successful rows reported separately
  - [x] Test warning messages for suspicious data
- [x] Write edge case tests (AC: 3, 4, 5)
  - [x] Test missing required fields
  - [x] Test extra/unknown columns
  - [x] Test inconsistent data (e.g., amount != quantity \* price)
  - [x] Test very large numbers
  - [x] Test very small numbers (precision)
- [x] Disable all tests using .skip (AC: 10)
- [x] Verify tests fail before disabling (AC: 9)
- [x] Run validation commands

## Dev Notes

### Testing Standards

- **Test Location:** Server-side tests in `apps/server/src/**/*.spec.ts`
- **Testing Framework:** Vitest
- **Patterns:** Use AAA (Arrange-Act-Assert) pattern
- **Coverage:** Target >80% coverage for validation code

### Technical Context

- **Validation Layers:**

  1. File format validation (already in AR.4)
  2. CSV structure validation (required columns present)
  3. Row-level data validation (each field valid)
  4. Business rule validation (account exists, no duplicates)
  5. Cross-field validation (amount matches quantity \* price)

- **Error Response Format:**
  ```json
  {
    "success": false,
    "imported": 12,
    "failed": 3,
    "errors": [
      { "row": 5, "field": "account", "message": "Account 'Roth 401k' not found" },
      { "row": 8, "field": "quantity", "message": "Quantity must be a positive number" },
      { "row": 15, "field": "date", "message": "Invalid date format" }
    ],
    "warnings": [{ "row": 10, "message": "Amount ($1506.00) doesn't match quantity * price ($1505.50)" }]
  }
  ```

### Validation Rules

- **Account:** Must exist in user's accounts (case-insensitive match on name)
- **Symbol:** Required, 1-5 uppercase letters (allow wider for international symbols)
- **Quantity:** Required for purchases/sales, positive decimal number
- **Price:** Required for purchases/sales, positive decimal number
- **Amount:** Total transaction amount, should match quantity \* price (warn if off)
- **Date:** Required, valid date, not future date
- **Action:** Must be recognized transaction type (purchase, sale, dividend, deposit)

### Duplicate Detection

- Check if same transaction already imported:
  - Same account, symbol, date, quantity, price
  - Allow same symbol/date if quantity/price differ (multiple trades same day)
- Report duplicates as warnings, not errors (user can decide)

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
- Story AR.5 will implement the functionality and re-enable tests
- Good validation is critical for data quality

## Related Stories

- **Previous:** Story AR.4 (Upload Implementation)
- **Next:** Story AR.5 (Validation Implementation)
- **Epic:** Epic AR - Fidelity Transaction Import

---

## Change Log

| Date       | Version | Description                                                        | Author    |
| ---------- | ------- | ------------------------------------------------------------------ | --------- |
| 2026-02-24 | 1.0     | Initial creation                                                   | SM        |
| 2026-02-25 | 1.1     | Implemented TDD RED phase tests for validation and error reporting | Dev Agent |

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None

### Completion Notes List

- Created comprehensive validation test file with 47 tests covering all acceptance criteria
- Tests organized into describe blocks: account validation, symbol validation, numeric validation, date validation, duplicate detection, error reporting, edge cases
- All test blocks disabled with `describe.skip()` to allow CI to pass
- Tests reference `validate-transaction.function.ts` which will be implemented in AR.5

### File List

- `apps/server/src/app/routes/import/validation.spec.ts` (new) - TDD RED phase validation tests

---

## QA Results

_To be populated after implementation_
