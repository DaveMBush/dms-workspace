# Story AR.5-TDD: Write Unit Tests for Validation and Error Reporting - TDD RED Phase

**Status:** Draft

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

1. [ ] All unit tests written for data validation
2. [ ] Tests verify account existence validation
3. [ ] Tests verify symbol validation
4. [ ] Tests verify numeric field validation (quantity, price, amount)
5. [ ] Tests verify date validation
6. [ ] Tests verify duplicate transaction detection
7. [ ] Tests verify error message formatting
8. [ ] Tests verify partial success handling
9. [ ] All tests initially fail (RED phase)
10. [ ] Tests disabled with `xit()` or `.skip` to allow CI to pass

### Technical Requirements

1. [ ] Tests follow existing testing patterns
2. [ ] Mock dependencies properly configured
3. [ ] Test coverage includes edge cases
4. [ ] Test descriptions are clear and specific
5. [ ] Tests cover both validation logic and error reporting

## Tasks / Subtasks

- [ ] Create tests for account validation (AC: 2)
  - [ ] Test account exists in database
  - [ ] Test account belongs to current user
  - [ ] Test case-sensitive vs case-insensitive matching
  - [ ] Test error message for non-existent account
- [ ] Create tests for symbol validation (AC: 3)
  - [ ] Test symbol format validation
  - [ ] Test empty symbol handling
  - [ ] Test symbol with special characters
- [ ] Create tests for numeric validation (AC: 4)
  - [ ] Test quantity is positive number
  - [ ] Test price is positive number
  - [ ] Test amount validation
  - [ ] Test decimal precision handling
  - [ ] Test zero values
  - [ ] Test negative values (should fail or handle appropriately)
- [ ] Create tests for date validation (AC: 5)
  - [ ] Test valid date formats
  - [ ] Test invalid date formats
  - [ ] Test future dates
  - [ ] Test very old dates
  - [ ] Test date parsing from various formats
- [ ] Create tests for duplicate detection (AC: 6)
  - [ ] Test same transaction in file multiple times
  - [ ] Test transaction already in database
  - [ ] Test duplicate detection criteria
- [ ] Create tests for error reporting (AC: 7, 8)
  - [ ] Test error message includes row number
  - [ ] Test error message includes field name
  - [ ] Test error message is user-friendly
  - [ ] Test multiple errors aggregated per row
  - [ ] Test all errors collected (not just first error)
  - [ ] Test successful rows reported separately
  - [ ] Test warning messages for suspicious data
- [ ] Write edge case tests (AC: 3, 4, 5)
  - [ ] Test missing required fields
  - [ ] Test extra/unknown columns
  - [ ] Test inconsistent data (e.g., amount != quantity \* price)
  - [ ] Test very large numbers
  - [ ] Test very small numbers (precision)
- [ ] Disable all tests using .skip (AC: 10)
- [ ] Verify tests fail before disabling (AC: 9)
- [ ] Run validation commands

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
- Story AR.5 will implement the functionality and re-enable tests
- Good validation is critical for data quality

## Related Stories

- **Previous:** Story AR.4 (Upload Implementation)
- **Next:** Story AR.5 (Validation Implementation)
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
