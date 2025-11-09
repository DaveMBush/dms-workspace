# Story Y3: Verify Fix and Run Full Test Suite

Description: Perform manual verification that the bug is resolved and run the complete project test suite to ensure no regressions were introduced by the changes.

## Acceptance Criteria

### Manual Verification

Perform the following manual tests in the running application:

- **View Account A summary screen:**

  - Navigate to Account A summary page
  - Verify pie chart shows allocation percentages specific to Account A's holdings
  - Note the specific percentages (e.g., 70% Equities, 20% Income, 10% Tax Free)

- **View Account B summary screen:**

  - Navigate to Account B summary page
  - Verify pie chart shows allocation percentages specific to Account B's holdings
  - Verify percentages are DIFFERENT from Account A when holdings differ
  - Specifically test with accounts that have only one fund type to see 100%/0%/0% splits

- **View Global summary screen:**

  - Navigate to Global summary page
  - Verify pie chart shows combined allocations across all accounts
  - Verify percentages represent the aggregate of all accounts

- **Verify charts are different:**
  - Confirm that accounts with different holdings show different pie charts
  - Confirm that the bug (all accounts showing identical charts) is resolved

### Run Complete Test Suite

Execute all commands from CLAUDE.md in sequence and verify all pass:

```bash
pnpm format
pnpm dupcheck
pnpm nx run rms:test --code-coverage
pnpm nx run server:build:production
pnpm nx run server:test --code-coverage
pnpm nx run server:lint
pnpm nx run rms:lint
pnpm nx run rms:build:production
pnpm nx run rms-e2e:lint
```

### Success Criteria

- **All commands succeed with no errors:**

  - `pnpm format` - Code formatting passes
  - `pnpm dupcheck` - No duplicate code detected
  - `pnpm nx run rms:test --code-coverage` - All frontend tests pass
  - `pnpm nx run server:build:production` - Backend builds successfully
  - `pnpm nx run server:test --code-coverage` - All backend tests pass (including new Y2 tests)
  - `pnpm nx run server:lint` - Backend linting passes
  - `pnpm nx run rms:lint` - Frontend linting passes
  - `pnpm nx run rms:build:production` - Frontend builds successfully
  - `pnpm nx run rms-e2e:lint` - E2E linting passes

- **Manual verification confirms:**
  - Account-specific pie charts display correctly filtered data
  - Global pie chart aggregates all accounts correctly
  - No visual regressions on summary screens
  - No console errors during navigation or chart rendering

## Technical Implementation Details

### Pre-Verification Checklist

Before running tests, ensure:

- Story Y1 implementation is complete and committed
- Story Y2 tests are implemented and committed
- All file changes have been saved
- Development server can start without errors

### Manual Test Data Requirements

For effective manual testing, ensure test database has:

- At least 2 accounts with different risk group allocations
- At least 1 account with single risk group (100% in one category)
- Example scenario:
  - Account "IRA": 100% Equities
  - Account "Taxable": 100% Income
  - Global should show 50% Equities, 50% Income

### Test Failure Handling

If any test fails:

- Document the specific failure message
- Identify which story (Y1 or Y2) introduced the issue
- Fix the issue before proceeding
- Re-run full test suite after fixes
- Do not consider story Y3 complete until ALL tests pass

### Rollback Plan

If critical issues are discovered:

- Revert commits from Stories Y1 and Y2
- Document the issue for future analysis
- Re-assess the implementation approach
- Consider alternative solutions if SQL approach proves problematic

## Dependencies

- Story Y1 must be completed and committed
- Story Y2 must be completed and committed
- Test database populated with appropriate test data
- All project dependencies installed (`pnpm install`)

## Estimated Effort

1 hour

## Definition of Done

- [ ] Manual verification completed for Account A summary
- [ ] Manual verification completed for Account B summary
- [ ] Manual verification completed for Global summary
- [ ] Confirmed different accounts show different pie charts
- [ ] All 9 test suite commands executed successfully
- [ ] No errors, warnings, or regressions detected
- [ ] Bug fix confirmed resolved (accounts no longer show identical charts)
- [ ] Epic Y marked as complete
