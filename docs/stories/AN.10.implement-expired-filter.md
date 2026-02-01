# Story AN.10: Wire Up Expired Filter - TDD GREEN Phase

## Story

**As a** user
**I want** to filter universe table to show/hide expired symbols
**So that** I can manage active vs expired symbols separately

## Context

**Current System:**

- Universe table displays data from SmartNgRX
- Previous stories have implemented base functionality
- Unit tests written in Story AN.9 (currently disabled)

**Implementation Approach:**

- Re-enable unit tests from AN.9
- Implement functionality to make tests pass
- Make all tests pass (GREEN phase)

## Acceptance Criteria

### Functional Requirements

- [ ] All unit tests from AN.9 re-enabled and passing
- [ ] Tests cover all expected behaviors
- [ ] Implementation complete and working
- [ ] All edge cases handled properly

### Technical Requirements

- [ ] Tests follow existing testing patterns
- [ ] Mock dependencies properly configured
- [ ] Test coverage includes edge cases
- [ ] Implementation follows project patterns

## Implementation Details

### Step 1: Re-enable Tests

Remove `x` prefix or `.skip` from tests written in AN.9.

### Step 2: Implement Functionality

Implement the required functionality following TDD approach.

### Step 3: Verify All Tests Pass

```bash
pnpm test:dms-material
```

## Definition of Done

- [ ] All unit tests from AN.9 re-enabled and passing
- [ ] Implementation complete and functional
- [ ] All edge cases handled
- [ ] Code follows project patterns
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD GREEN phase
- All tests should now pass
- Follow patterns from similar stories

## Related Stories

- **Previous**: Story AN.9
- **Next**: Story AN.11
- **Epic**: Epic AN
- **Pattern Reference**: Story AM.10 (Similar TDD pattern)
