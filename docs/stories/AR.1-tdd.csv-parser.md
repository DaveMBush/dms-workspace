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

- [ ] Create test file for CSV parser (AC: 1)
  - [ ] Test valid CSV parsing
  - [ ] Test invalid CSV handling
  - [ ] Test empty file handling
  - [ ] Test malformed data handling
- [ ] Create test file for data mapper (AC: 2)
  - [ ] Test purchase transaction mapping
  - [ ] Test sale transaction mapping
  - [ ] Test dividend transaction mapping
  - [ ] Test cash deposit mapping
  - [ ] Test account name matching
- [ ] Write edge case tests (AC: 3)
  - [ ] Test missing required fields
  - [ ] Test invalid dates
  - [ ] Test negative amounts
  - [ ] Test unknown transaction types
- [ ] Disable all tests using .skip (AC: 5)
- [ ] Verify tests fail before disabling (AC: 4)
- [ ] Run validation commands (AC: 5)

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
- Story AR.1 will implement the functionality and re-enable tests

## Related Stories

- **Next:** Story AR.1 (Implementation)
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
