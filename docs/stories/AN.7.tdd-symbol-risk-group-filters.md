# Story AN.7: Write Unit Tests for Symbol and Risk Group Filters - TDD RED Phase

## Story

**As a** developer
**I want** to write comprehensive unit tests for symbol and risk group filtering
**So that** I have failing tests that define the expected filtering behavior (TDD RED phase)

## Context

**Current System:**

- Universe table displays data from SmartNgRX
- Previous stories have implemented base functionality
- Need to establish test-first approach

**Implementation Approach:**

- Write unit tests
- Disable tests after writing to allow CI to pass
- Tests will be re-enabled in Story AN.AN.8

## Acceptance Criteria

### Functional Requirements

- [ ] All unit tests written
- [ ] Tests cover all expected behaviors
- [ ] All tests initially fail (RED phase)
- [ ] Tests disabled with `xit()` or `.skip` to allow CI to pass

### Technical Requirements

- [ ] Tests follow existing testing patterns
- [ ] Mock dependencies properly configured
- [ ] Test coverage includes edge cases
- [ ] Test descriptions are clear and specific

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
- Story AN.AN.8 will implement the functionality and re-enable tests

## Related Stories

- **Previous**: Story AN.6
- **Next**: Story AN.AN.8
- **Epic**: Epic AN
- **Pattern Reference**: Story AM.7 (Similar TDD pattern)
