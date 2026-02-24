# Story AR.1: Implement Fidelity CSV Parser and Data Mapper

**Status:** Draft

## Story

**As a** system
**I want** to parse Fidelity CSV files and map data to internal structures
**So that** transaction data can be imported accurately

## Context

**Current System:**

- Tests written in Story AR.1-TDD define expected behavior
- Need actual implementation of parser and mapper

**Implementation Approach:**

- Implement CSV parser following TDD tests
- Implement data mapper following TDD tests
- Re-enable tests from AR.1-TDD
- Verify all tests pass (GREEN phase)

## Acceptance Criteria

### Functional Requirements

1. [ ] CSV parser correctly parses Fidelity CSV format
2. [ ] Data mapper converts CSV rows to internal transaction structures
3. [ ] Parser handles all transaction types (purchase, sale, dividend, cash deposit)
4. [ ] Account name matching works correctly
5. [ ] Error handling for invalid data

### Technical Requirements

1. [ ] All tests from AR.1-TDD re-enabled and passing
2. [ ] Code follows project coding standards
3. [ ] Proper error messages for parsing failures
4. [ ] Type-safe implementation with TypeScript
5. [ ] Unit test coverage >80%

## Tasks / Subtasks

- [ ] Re-enable tests from AR.1-TDD (AC: 1)
- [ ] Implement CSV parser (AC: 1)
  - [ ] Parse CSV file structure
  - [ ] Validate required columns
  - [ ] Handle header row
  - [ ] Parse data rows
- [ ] Implement data mapper (AC: 2)
  - [ ] Map purchase transactions
  - [ ] Map sale transactions
  - [ ] Map dividend transactions
  - [ ] Map cash deposit transactions
  - [ ] Implement account name lookup
- [ ] Implement error handling (AC: 5)
  - [ ] Handle missing required fields
  - [ ] Handle invalid dates
  - [ ] Handle invalid amounts
  - [ ] Handle unknown transaction types
- [ ] Verify all tests pass (AC: 1)
- [ ] Run validation commands

## Dev Notes

### Testing Standards

- **Test Location:** Server-side tests in `apps/server/src/**/*.spec.ts`
- **Testing Framework:** Vitest
- **Coverage:** Must achieve >80% coverage
- **Re-enable Tests:** Change `.skip` to active tests from AR.1-TDD

### Technical Context

- Fidelity CSV format includes columns: Date, Action, Symbol, Description, Quantity, Price, Total Amount, Account
- Account column value matches the `name` field in Accounts table
- Transaction types to support:
  - Purchase: Map to trades table (similar to manual Add Position)
  - Sale: Map to trades table with sell data (match to existing positions)
  - Dividend: Map to dividend deposits
  - Cash Deposit: Map to dividend deposits
- For sales: Need to match shares to existing open positions
- May need to split positions if sale quantity doesn't match exactly

### Implementation Notes

- Use CSV parsing library (e.g., papaparse, csv-parse) for reliable parsing
- Implement TypeScript interfaces for parsed data and mapped transactions
- Create separate mapper functions for each transaction type
- Validate account exists before mapping transactions
- Log warnings for unknown transaction types and ask for input via .github/prompts/prompt.sh

## Definition of Done

- [ ] All tests from AR.1-TDD re-enabled and passing (GREEN phase)
- [ ] CSV parser implemented and working
- [ ] Data mapper implemented for all transaction types
- [ ] Error handling implemented
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
- All tests from AR.1-TDD should pass after implementation
- Build incrementally, running tests frequently

## Related Stories

- **Previous:** Story AR.1-TDD (Tests)
- **Next:** Story AR.2-TDD
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
