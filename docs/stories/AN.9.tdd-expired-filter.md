# Story AN.9: Write Unit Tests for Expired Filter - TDD RED Phase

## Story

**As a** developer
**I want** to write comprehensive unit tests for expired symbol filtering
**So that** I have failing tests that define the expected expired filter behavior (TDD RED phase)

## Context

**Current System:**

- Universe table displays data from SmartNgRX
- Previous stories have implemented base functionality
- Need to establish test-first approach

**Implementation Approach:**

- Write unit tests
- Disable tests after writing to allow CI to pass
- Tests will be re-enabled in Story AN.AN.10

## Acceptance Criteria

### Functional Requirements

- [x] All unit tests written
- [x] Tests cover all expected behaviors
- [x] All tests initially fail (RED phase)
- [x] Tests disabled with `xit()` or `.skip` to allow CI to pass

### Technical Requirements

- [x] Tests follow existing testing patterns
- [x] Mock dependencies properly configured
- [x] Test coverage includes edge cases
- [x] Test descriptions are clear and specific

## Implementation Details

### Step 1: Write Tests

Create comprehensive test suite covering all scenarios

### Step 2: Run Tests and Verify

```bash
pnpm test:dms-material
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
  - [ ] Run `pnpm e2e:dms-material`
  - [x] Run `pnpm dupcheck`
  - [x] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD RED phase
- Tests should fail because implementation doesn't exist yet
- Tests must be disabled before merge to allow CI to pass
- Story AN.AN.10 will implement the functionality and re-enable tests

## Related Stories

- **Previous**: Story AN.8
- **Next**: Story AN.AN.10
- **Epic**: Epic AN
- **Pattern Reference**: Story AM.9 (Similar TDD pattern)

---

## QA Results

### Review Date: 2026-02-07

### Reviewed By: Quinn (Test Architect)

### Gate Status

Gate: PASS → docs/qa/gates/AN.9-write-unit-tests-for-expired-filter-tdd-red-phase.yml

---

## Dev Agent Record

### Status

Ready for Review

### Agent Model Used

- Claude Sonnet 4.5

### File List

- apps/dms-material/src/app/global/global-universe/filter-universes.function.spec.ts

### Change Log

1. Added comprehensive expired filter test suite (28 tests) covering:
   - Basic expired filter behavior
   - Expired filter with symbol filter combination
   - Expired filter with risk group filter combination
   - Expired filter with min yield filter combination
   - All filters combined scenarios
   - Edge cases (empty datasets, null values, order preservation)
2. Disabled all new tests using `it.skip()` for Vitest compatibility
3. Verified tests properly skip during CI execution

### Completion Notes

- Tests written following TDD RED phase
- All 28 comprehensive tests are properly disabled with `it.skip()`
- Tests cover all edge cases and filter combinations
- Existing 29 tests still pass, 28 new tests properly skipped
