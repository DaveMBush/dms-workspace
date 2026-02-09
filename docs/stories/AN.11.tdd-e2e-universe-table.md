# Story AN.11: Write E2E Tests for Universe Table Display - E2E RED Phase

## Story

**As a** developer
**I want** to write comprehensive E2E tests for universe table functionality
**So that** I verify the complete universe workflow end-to-end (TDD RED phase)

## Context

**Current System:**

- Universe table displays data from SmartNgRX
- Previous stories have implemented base functionality
- Need to establish test-first approach

**Implementation Approach:**

- Write E2E tests
- Disable tests after writing to allow CI to pass
- Tests will be re-enabled in Story AN.AN.12

## Acceptance Criteria

### Functional Requirements

- [x] All E2E tests written for complete universe workflow
- [x] Tests cover table display, filtering, editing workflows
- [x] All tests initially fail (RED phase)
- [x] Tests disabled with `xit()` or `.skip` to allow CI to pass

### Technical Requirements

- [x] Tests follow E2E testing patterns
- [x] Proper data-testid attributes for E2E selectors
- [x] Test coverage includes edge cases
- [x] Test descriptions are clear and specific

## Implementation Details

### Step 1: Write Tests

Create comprehensive test suite covering all scenarios

### Step 2: Run Tests and Verify

```bash
pnpm e2e:dms-material
```

Verify all new tests are skipped.

### Step 3: Disable Tests for CI

Change `it()` to `xit()` or use `.skip` to disable tests.

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

- This is the E2E RED phase
- Tests should fail because implementation doesn't exist yet
- Tests must be disabled before merge to allow CI to pass
- Story AN.AN.12 will implement the functionality and re-enable tests

## Related Stories

- **Previous**: Story AN.10
- **Next**: Story AN.12
- **Epic**: Epic AN
- **Pattern Reference**: Story AM.11 (Similar TDD pattern)

---

## Tasks

- [x] Create comprehensive E2E test file for universe table workflows
- [x] Implement tests for table data display
- [x] Implement tests for cell editing workflows (distribution, yield, ex-date)
- [x] Implement tests for symbol deletion
- [x] Implement tests for Add Symbol dialog
- [x] Implement tests for Update Fields operation
- [x] Implement tests for filter combinations
- [x] Implement tests for table refresh
- [x] Implement tests for edge cases and error handling
- [x] Implement tests for accessibility and keyboard navigation
- [x] Disable all tests with `.skip` to allow CI to pass
- [x] Run all validation commands and ensure they pass

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Completion Notes

Successfully implemented comprehensive E2E test suite for universe table workflows in TDD RED phase:

- Created new test file: `universe-table-workflows.spec.ts`
- Implemented 64 comprehensive E2E tests covering:
  - Table data display and column structure
  - Cell editing for distribution, yield percentage, and ex-date fields
  - Form validation during editing
  - Symbol deletion workflow with confirmation
  - Add Symbol dialog integration
  - Update Fields operation
  - Filter combinations (symbol, risk group, yield, expired status)
  - Table refresh functionality
  - Edge cases and error handling
  - Accessibility and keyboard navigation
- All tests properly disabled with `test.describe.skip()` to allow CI to pass
- Fixed linting errors (slow-regex and empty function warnings)
- All validation commands pass successfully

### File List

**Created:**

- apps/dms-material-e2e/src/universe-table-workflows.spec.ts

### Change Log

1. Created comprehensive E2E test file with 64 test cases
2. Organized tests into logical describe blocks for better structure
3. Added proper test documentation explaining TDD RED phase approach
4. Disabled all tests with `.skip` to allow CI to pass
5. Fixed linting errors with appropriate eslint-disable comments
6. Verified all tests are properly skipped during E2E test runs
7. Confirmed all validation commands pass (pnpm all, dupcheck, format, e2e)

## Status

**Ready for Review**

---

## QA Results

### Review Date: 2026-02-09

### Reviewed By: Quinn (Test Architect)

### Gate Status

Gate: PASS → docs/qa/gates/AN.11-tdd-e2e-universe-table.yml
