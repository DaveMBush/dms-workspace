# Story AR.1-TDD: Write Unit Tests for Fidelity CSV Parser and Data Mapper - TDD RED Phase

**Status:** Approved

## Story

**As a** developer
**I want** to write comprehensive unit tests for the Fidelity CSV parser and data mapper
**So that** I have failing tests that define the expected parsing behavior (TDD RED phase)

## Context

**Current System:**

- Need to import Fidelity transaction data from CSV files
- Must parse and map CSV data to internal data structures
- Support purchases, sales, dividends, and cash deposits

**Implementation Approach:**

- Write unit tests for CSV parsing logic
- Write unit tests for data mapping logic
- Disable tests after writing to allow CI to pass
- Tests will be re-enabled in Story AR.1

## Acceptance Criteria

### Functional Requirements

1. [ ] All unit tests written for CSV parser
2. [ ] All unit tests written for data mapper
3. [ ] Tests cover all expected behaviors
4. [ ] All tests initially fail (RED phase)
5. [ ] Tests disabled with `xit()` or `.skip` to allow CI to pass

### Technical Requirements

1. [ ] Tests follow existing testing patterns
2. [ ] Mock dependencies properly configured
3. [ ] Test coverage includes edge cases
4. [ ] Test descriptions are clear and specific
5. [ ] Tests cover all transaction types (purchase, sale, dividend, cash deposit)

## Tasks / Subtasks

- [x] Create test file for CSV parser (AC: 1)
  - [x] Test valid CSV parsing
  - [x] Test invalid CSV handling
  - [x] Test empty file handling
  - [x] Test malformed data handling
- [x] Create test file for data mapper (AC: 2)
  - [x] Test purchase transaction mapping
  - [x] Test sale transaction mapping
  - [x] Test dividend transaction mapping
  - [x] Test cash deposit mapping
  - [x] Test account name matching
- [x] Write edge case tests (AC: 3)
  - [x] Test missing required fields
  - [x] Test invalid dates
  - [x] Test negative amounts
  - [x] Test unknown transaction types
- [x] Disable all tests using .skip (AC: 5)
- [x] Verify tests fail before disabling (AC: 4)
- [x] Run validation commands (AC: 5)

## Dev Notes

### Testing Standards

- **Test Location:** Server-side tests in `apps/server/src/**/*.spec.ts`
- **Testing Framework:** Vitest
- **Patterns:** Use AAA (Arrange-Act-Assert) pattern
- **Coverage:** Target >80% coverage for parser and mapper modules

### Technical Context

- Fidelity CSV format includes columns: Date, Action, Symbol, Description, Quantity, Price, Total Amount, Account
- Account column value matches the `name` field in Accounts table
- Transaction types to support:
  - Purchase: Add to open positions (similar to manual Add Position flow)
  - Sale: Close/reduce open positions (similar to manual Sell flow)
  - Dividend: Add to dividend deposits
  - Cash Deposit: Add to dividend deposits (same screen as dividends)
- For sales: Match shares to existing positions, may need to split positions to match sale quantity

### Related Epic Notes

From Epic AR:

- Account name in CSV matches Accounts.name field
- Purchases treated same as manual Add Position flow
- Sales treated same as manual Sell flow (match to existing positions)
- May need to break existing positions into multiple records for sale matching
- Dividends and Cash Deposits share the same screen/flow
- Ask for clarification on unknown transaction types

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
- Story AR.1 will implement the functionality and re-enable tests

## Related Stories

- **Next:** Story AR.1 (Implementation)
- **Epic:** Epic AR - Fidelity Transaction Import

---

## Change Log

| Date       | Version | Description                                                                | Author    |
| ---------- | ------- | -------------------------------------------------------------------------- | --------- |
| 2026-02-24 | 1.0     | Initial creation                                                           | SM        |
| 2026-02-24 | 1.1     | Implemented TDD RED phase: 36 skipped tests for CSV parser and data mapper | Dev Agent |

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

_To be populated during implementation_

### Completion Notes List

- Created CSV parser test file with 17 tests covering valid parsing, invalid CSV, empty files, and malformed data
- Created data mapper test file with 19 tests covering purchases, sales, dividends, cash deposits, account matching, and edge cases
- All 36 tests use `describe.skip` to satisfy CI requirements (TDD RED phase)
- Created stub implementation files for TypeScript compilation
- Created separate interface files following project one-export-per-file convention

### File List

- `apps/server/src/app/routes/import/fidelity-csv-parser.function.spec.ts` (new)
- `apps/server/src/app/routes/import/fidelity-data-mapper.function.spec.ts` (new)
- `apps/server/src/app/routes/import/fidelity-csv-parser.function.ts` (new - stub)
- `apps/server/src/app/routes/import/fidelity-data-mapper.function.ts` (new - stub)
- `apps/server/src/app/routes/import/mapped-trade.interface.ts` (new)
- `apps/server/src/app/routes/import/mapped-sale.interface.ts` (new)
- `apps/server/src/app/routes/import/mapped-div-deposit.interface.ts` (new)
- `apps/server/src/app/routes/import/unknown-transaction.interface.ts` (new)
- `apps/server/src/app/routes/import/mapped-transaction-result.interface.ts` (new)

---

## QA Results

### Review Date: 2026-02-24

### Reviewed By: Quinn (Test Architect)

- All 36 unit tests verified across 2 spec files
- CSV parser tests: 17 tests covering valid parsing, invalid CSV, empty files, malformed data
- Data mapper tests: 19 tests covering purchases, sales, dividends, cash deposits, account matching, edge cases
- All tests properly disabled with `describe.skip`
- Test patterns match project conventions (Vitest, AAA, vi.mock)
- Interface files follow one-export-per-file convention

### Gate Status

Gate: PASS → docs/qa/gates/AR.1-tdd-csv-parser.yml
