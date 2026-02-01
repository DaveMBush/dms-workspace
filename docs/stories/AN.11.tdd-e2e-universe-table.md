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

- [ ] All E2E tests written for complete universe workflow
- [ ] Tests cover table display, filtering, editing workflows
- [ ] All tests initially fail (RED phase)
- [ ] Tests disabled with `xit()` or `.skip` to allow CI to pass

### Technical Requirements

- [ ] Tests follow E2E testing patterns
- [ ] Proper data-testid attributes for E2E selectors
- [ ] Test coverage includes edge cases
- [ ] Test descriptions are clear and specific

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

- This is the E2E RED phase
- Tests should fail because implementation doesn't exist yet
- Tests must be disabled before merge to allow CI to pass
- Story AN.AN.12 will implement the functionality and re-enable tests

## Related Stories

- **Previous**: Story AN.10
- **Next**: Story AN.AN.12
- **Epic**: Epic AN
- **Pattern Reference**: Story AM.11 (Similar TDD pattern)
