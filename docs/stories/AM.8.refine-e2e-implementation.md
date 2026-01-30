# Story AM.8: Refine Implementation Based on E2E Test Results - TDD GREEN Phase

## Story

**As a** developer
**I want** to refine the add symbol implementation to pass E2E tests
**So that** the complete workflow is verified and production-ready

## Context

**Current System:**

- E2E tests written in Story AM.7 (currently disabled)
- Add Symbol functionality implemented in AM.1-AM.6
- Need to ensure E2E tests pass and refine any edge cases

**Implementation Approach:**

- Re-enable E2E tests from AM.7
- Run tests and identify any failures
- Refine implementation to make all tests pass (GREEN phase)
- Address any edge cases discovered during E2E testing

## Acceptance Criteria

### Functional Requirements

- [ ] All E2E tests from AM.7 re-enabled
- [ ] All E2E tests passing
- [ ] Edge cases identified and handled
- [ ] Complete add symbol workflow verified end-to-end
- [ ] Dialog interaction smooth and intuitive
- [ ] Error messages clear and actionable

### Technical Requirements

- [ ] Proper data-testid attributes in place
- [ ] Notification selectors work correctly
- [ ] API routes match what E2E tests expect
- [ ] Dialog state properly managed
- [ ] Autocomplete accessible and functional

## Implementation Details

### Step 1: Re-enable E2E Tests from AM.7

Remove `.skip` from the test suite:

\`\`\`typescript
// Change from test.describe.skip to test.describe
test.describe('Add Symbol Flow', () => {
// ... tests
});
\`\`\`

### Step 2: Run E2E Tests and Identify Failures

\`\`\`bash
pnpm e2e:dms-material --grep "Add Symbol"
\`\`\`

Document any failures and their causes.

### Step 3: Refine Implementation

Address any issues found:

1. **data-testid attributes**: Ensure all elements have proper test IDs
2. **API routes**: Verify services call correct endpoints
3. **Notification selectors**: Check for `.snackbar-success` and `.snackbar-error`
4. **Dialog state**: Ensure proper opening/closing behavior
5. **Autocomplete**: Verify dropdown displays and selection works
6. **Error messages**: Match exact text expected by tests

### Step 4: Verify All Tests Pass

\`\`\`bash
pnpm e2e:dms-material --grep "Add Symbol"
\`\`\`

Ensure all Add Symbol tests pass across browsers.

### Step 5: Manual Testing

1. Navigate to Global/Universe screen
2. Click "Add Symbol" button
3. Test autocomplete search
4. Add valid symbol
5. Test validation errors
6. Test duplicate symbol
7. Test API error scenarios

## Definition of Done

- [ ] All E2E tests from AM.7 re-enabled
- [ ] All E2E tests passing
- [ ] Edge cases handled properly
- [ ] Manual testing completed successfully
- [ ] API routes consistent between implementation and tests
- [ ] Notification system working as expected
- [ ] All validation commands pass:
  - [ ] Run \`pnpm all\`
  - [ ] Run \`pnpm e2e:dms-material\`
  - [ ] Run \`pnpm dupcheck\`
  - [ ] Run \`pnpm format\`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD GREEN phase for E2E tests
- Makes the RED E2E tests from AM.7 turn GREEN
- Completes Epic AM implementation
- Follow pattern from Story AL.6

## Related Stories

- **Prerequisite**: Story AM.7
- **Completes**: Epic AM
- **Reference**: Story AL.6 (Similar E2E refinement pattern)
