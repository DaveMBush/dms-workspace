# Story AV.13: Refine Implementation Based on E2E Test Results - TDD GREEN Phase

## Story

**As a** developer
**I want** to enable E2E tests and fix any issues they reveal
**So that** the state persistence feature is fully verified and production-ready

## Context

**Current System:**

- State persistence feature implemented (AV.1-AV.11)
- E2E tests written in Story AV.12 (currently disabled)
- Need to enable tests and address any failures

**Implementation Approach:**

- Re-enable E2E tests from AV.12
- Run tests and identify failures
- Fix issues revealed by E2E tests
- Make all tests pass (GREEN phase)
- Verify feature is production-ready

## Acceptance Criteria

### Functional Requirements

- [ ] All E2E tests from AV.12 re-enabled
- [ ] All E2E tests passing
- [ ] State persistence works correctly in all scenarios
- [ ] No regressions in existing functionality
- [ ] Feature verified in both Chrome and Firefox

### Technical Requirements

- [ ] All components have required test-id attributes
- [ ] No race conditions in state restoration
- [ ] E2E tests are stable (no flakiness)
- [ ] Tests complete in reasonable time

## Implementation Details

### Step 1: Re-enable E2E Tests

Remove `.skip` from test suite written in AV.12.

### Step 2: Run Tests and Identify Failures

```bash
pnpm e2e:dms-material:chromium
```

Note any failing tests.

### Step 3: Fix Issues

For each failing test:

1. Understand why test is failing
2. Determine if issue is in implementation or test
3. Fix implementation issue or adjust test expectations
4. Re-run test to verify fix
5. Ensure unit tests still pass

Common issues to watch for:

- Missing test-id attributes
- Timing issues (need to wait for state restoration)
- Incorrect selectors
- Race conditions in component initialization

### Step 4: Verify in Both Browsers

```bash
pnpm e2e:dms-material:chromium
pnpm e2e:dms-material:firefox
```

### Step 5: Stability Check

Run E2E suite multiple times to ensure no flakiness:

```bash
for i in {1..3}; do pnpm e2e:dms-material:chromium; done
```

## Definition of Done

- [ ] All E2E tests from AV.12 re-enabled and passing
- [ ] Tests pass consistently in Chrome
- [ ] Tests pass consistently in Firefox
- [ ] No flaky tests
- [ ] Feature verified production-ready
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD GREEN phase for E2E tests
- Focus on making tests pass and ensuring stability
- Document any tricky E2E testing issues for team knowledge
- Feature should be production-ready after this story
- All unit and e2e tests must pass even if you think they are unrelated to this story.
- If any tests fail, fix them before merging this story to ensure a stable baseline for Story AV.13
- E2E tests must be run for Chromium and Firefox separately and both must pass before merge.

## Related Stories

- **Previous**: Story AV.12 (E2E TDD Tests)
- **Epic**: Epic AV - COMPLETE

---

## Dev Agent Record

### Status

Approved

### E2E Issues Found and Fixed

### Stability Notes
