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

- [x] Re-enable tests from AR.5-TDD (AC: 1)
- [x] Implement validation framework (AC: 1)
  - [x] Create validation result types
  - [x] Create error/warning aggregation structure
  - [x] Create validation helper functions
- [x] Implement account validation (AC: 2)
  - [x] Check account exists in database
  - [x] Verify account belongs to current user
  - [x] Implement exact name matching
  - [x] Add error message for non-existent account
- [x] Implement symbol validation (AC: 3)
  - [x] Validate symbol format (1-5 chars, uppercase)
  - [x] Handle empty symbol
  - [x] Allow international symbols if needed
- [x] Implement numeric validation (AC: 4)
  - [x] Validate quantity is positive number
  - [x] Validate price is positive number
  - [x] Validate amount
  - [x] Handle decimal precision
  - [x] Check for negative values
  - [x] Warn if amount != quantity \* price
- [x] Implement date validation (AC: 5)
  - [x] Parse various date formats
  - [x] Validate date is not in future
  - [x] Add error for invalid dates
- [x] Implement duplicate detection (AC: 6)
  - [x] Check for duplicates within file
  - [x] Check for duplicates in database
  - [x] Add warnings (not errors) for duplicates
- [x] Implement error reporting (AC: 7, 8)
  - [x] Format error messages with row number
  - [x] Include field name in error message
  - [x] Make messages user-friendly (not technical)
  - [x] Aggregate multiple errors per row
  - [x] Collect all errors (don't stop at first)
  - [x] Report successful row count
  - [x] Include warnings separately from errors
- [x] Integrate validation into import service
  - [x] Call validators before processing each row
  - [x] Skip invalid rows
  - [x] Continue processing valid rows
  - [x] Return detailed results
- [x] Verify all tests pass (AC: 1)
- [x] Run validation commands

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

| Date       | Version | Description                                                    | Author |
| ---------- | ------- | -------------------------------------------------------------- | ------ |
| 2026-02-24 | 1.0     | Initial creation                                               | SM     |
| 2026-02-25 | 1.1     | Implemented all validation logic and re-enabled AR.5-TDD tests | Dev    |

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (copilot)

### Debug Log References

- No debug issues encountered

### Completion Notes List

- All 51 tests from AR.5-TDD re-enabled and passing
- Fixed 4 test cases missing `await` on async `validateAccount` calls
- Modular architecture: 14 single-export function files + 2 interface files per @smarttools/one-exported-item-per-file rule
- Validation types use TypeScript discriminated unions for type safety
- Applied CodeRabbit review suggestions (action validation, date format docs, exact-match account lookup)

### File List

- `apps/server/src/app/routes/import/validate-account.function.ts` (new)
- `apps/server/src/app/routes/import/validate-symbol.function.ts` (new)
- `apps/server/src/app/routes/import/validate-quantity.function.ts` (new)
- `apps/server/src/app/routes/import/validate-price.function.ts` (new)
- `apps/server/src/app/routes/import/validate-amount.function.ts` (new)
- `apps/server/src/app/routes/import/validate-date.function.ts` (new)
- `apps/server/src/app/routes/import/validate-action.function.ts` (new)
- `apps/server/src/app/routes/import/validate-row.function.ts` (new)
- `apps/server/src/app/routes/import/validate-rows.function.ts` (new)
- `apps/server/src/app/routes/import/format-validation-error.function.ts` (new)
- `apps/server/src/app/routes/import/aggregate-errors.function.ts` (new)
- `apps/server/src/app/routes/import/detect-duplicates-in-file.function.ts` (new)
- `apps/server/src/app/routes/import/detect-duplicate-in-db.function.ts` (new)
- `apps/server/src/app/routes/import/check-amount-mismatch.function.ts` (new)
- `apps/server/src/app/routes/import/validation-error.interface.ts` (new)
- `apps/server/src/app/routes/import/validation-warning.interface.ts` (new)
- `apps/server/src/app/routes/import/validation.spec.ts` (modified - re-enabled tests, added await, updated imports)
- `docs/stories/AR.5.validation.md` (modified - dev record updates)

---

## QA Results

_To be populated after implementation_
