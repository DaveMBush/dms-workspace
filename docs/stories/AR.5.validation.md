# Story AR.5: Add Validation and Error Reporting

**Status:** Approved

## Story

**As a** user
**I want** comprehensive validation and clear error messages during import
**So that** I can understand and fix data issues in my CSV files

## Context

**Current System:**

- File upload and basic processing implemented in AR.4
- Tests written in Story AR.5-TDD define expected behavior
- Need production-ready validation and error reporting

**Implementation Approach:**

- Implement all validation rules following TDD tests
- Implement user-friendly error reporting
- Re-enable tests from AR.5-TDD
- Verify all tests pass (GREEN phase)

## Acceptance Criteria

### Functional Requirements

1. [ ] All data validation rules enforced
2. [ ] Account existence verified before processing
3. [ ] Symbol format validated
4. [ ] Numeric fields validated (quantity, price, amount)
5. [ ] Date fields validated
6. [ ] Duplicate transactions detected and warned
7. [ ] Error messages are clear and actionable
8. [ ] Partial success supported (some rows succeed, some fail)

### Technical Requirements

1. [ ] All tests from AR.5-TDD re-enabled and passing
2. [ ] Code follows project coding standards
3. [ ] Validation logic is testable and maintainable
4. [ ] Error messages include row number and field name
5. [ ] Unit test coverage >80%
6. [ ] Validation performance is adequate for large files

## Tasks / Subtasks

- [ ] Re-enable tests from AR.5-TDD (AC: 1)
- [ ] Implement validation framework (AC: 1)
  - [ ] Create validation result types
  - [ ] Create error/warning aggregation structure
  - [ ] Create validation helper functions
- [ ] Implement account validation (AC: 2)
  - [ ] Check account exists in database
  - [ ] Verify account belongs to current user
  - [ ] Implement case-insensitive name matching
  - [ ] Add error message for non-existent account
- [ ] Implement symbol validation (AC: 3)
  - [ ] Validate symbol format (1-5 chars, uppercase)
  - [ ] Handle empty symbol
  - [ ] Allow international symbols if needed
- [ ] Implement numeric validation (AC: 4)
  - [ ] Validate quantity is positive number
  - [ ] Validate price is positive number
  - [ ] Validate amount
  - [ ] Handle decimal precision
  - [ ] Check for negative values
  - [ ] Warn if amount != quantity \* price
- [ ] Implement date validation (AC: 5)
  - [ ] Parse various date formats
  - [ ] Validate date is not in future
  - [ ] Add error for invalid dates
- [ ] Implement duplicate detection (AC: 6)
  - [ ] Check for duplicates within file
  - [ ] Check for duplicates in database
  - [ ] Add warnings (not errors) for duplicates
- [ ] Implement error reporting (AC: 7, 8)
  - [ ] Format error messages with row number
  - [ ] Include field name in error message
  - [ ] Make messages user-friendly (not technical)
  - [ ] Aggregate multiple errors per row
  - [ ] Collect all errors (don't stop at first)
  - [ ] Report successful row count
  - [ ] Include warnings separately from errors
- [ ] Integrate validation into import service
  - [ ] Call validators before processing each row
  - [ ] Skip invalid rows
  - [ ] Continue processing valid rows
  - [ ] Return detailed results
- [ ] Verify all tests pass (AC: 1)
- [ ] Run validation commands

## Dev Notes

### Testing Standards

- **Test Location:** Server-side tests in `apps/server/src/**/*.spec.ts`
- **Testing Framework:** Vitest
- **Coverage:** Must achieve >80% coverage
- **Re-enable Tests:** Change `.skip` to active tests from AR.5-TDD

### Technical Context

- **Validation Architecture:**

  - Separate validation logic from business logic
  - Each validator returns success/error/warning
  - Collect all validation results before processing
  - Process only valid rows
  - Return comprehensive results

- **Validation Types:**

  ```typescript
  interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  }

  interface ValidationError {
    row: number;
    field: string;
    value: any;
    message: string;
  }

  interface ValidationWarning {
    row: number;
    message: string;
  }
  ```

### Validation Rules Implementation

```typescript
// Account validation
const validateAccount = async (accountName: string, userId: string) => {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      name: { equals: accountName, mode: 'insensitive' },
    },
  });
  return { valid: !!account, account };
};

// Numeric validation
const validatePositiveNumber = (value: string, fieldName: string) => {
  const num = parseFloat(value);
  if (isNaN(num)) return { valid: false, error: `${fieldName} must be a number` };
  if (num <= 0) return { valid: false, error: `${fieldName} must be positive` };
  return { valid: true, value: num };
};

// Date validation
const validateDate = (dateStr: string) => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return { valid: false, error: 'Invalid date format' };
  if (date > new Date()) return { valid: false, error: 'Date cannot be in future' };
  return { valid: true, value: date };
};
```

### Error Message Guidelines

- **Good:** "Account 'Roth IRA' not found. Please check the account name."
- **Bad:** "Account validation failed"
- **Good:** "Row 15: Quantity must be a positive number. Found: -10"
- **Bad:** "Invalid quantity"

### Response Format

```json
{
  "success": true,
  "imported": 42,
  "failed": 3,
  "errors": [
    {
      "row": 5,
      "field": "account",
      "message": "Account 'Roth 401k' not found. Please check the account name."
    },
    {
      "row": 15,
      "field": "quantity",
      "message": "Quantity must be a positive number. Found: -10"
    }
  ],
  "warnings": [
    {
      "row": 10,
      "message": "Possible duplicate: Same transaction found in database"
    }
  ]
}
```

## Definition of Done

- [ ] All tests from AR.5-TDD re-enabled and passing (GREEN phase)
- [ ] All validation rules implemented
- [ ] Account validation working
- [ ] Numeric and date validation working
- [ ] Duplicate detection working
- [ ] Error reporting comprehensive and user-friendly
- [ ] Partial success handling working
- [ ] Code follows project conventions
- [ ] Unit test coverage >80%
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD GREEN phase
- All tests from AR.5-TDD should pass after implementation
- Build incrementally, running tests frequently
- Focus on clear, actionable error messages
- Test with real CSV files containing various errors

## Related Stories

- **Previous:** Story AR.5-TDD (Tests)
- **Next:** Story AR.6 (E2E Tests)
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
