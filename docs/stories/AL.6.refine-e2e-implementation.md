# Story AL.6: Refine Implementation Based on E2E Test Results (Implementation)

## Story

**As a** developer
**I want** to refine the Update Fields implementation to pass E2E tests
**So that** the complete workflow is verified and production-ready

## Context

**Current System:**

- E2E tests written in Story AL.5 (currently disabled)
- Update Fields button and service fully implemented
- Need to ensure E2E tests pass and refine any edge cases

**Implementation Approach:**

- Re-enable E2E tests from AL.5
- Run tests and identify any failures
- Refine implementation to make all tests pass (GREEN phase)
- Address any edge cases discovered during E2E testing

## Acceptance Criteria

### Functional Requirements

- [ ] All E2E tests from AL.5 re-enabled
- [ ] All E2E tests passing
- [ ] Edge cases identified and handled
- [ ] Complete user workflow verified end-to-end

### Technical Requirements

- [ ] Proper data-testid attributes in place
- [ ] Notification selectors work correctly
- [ ] API routes match what E2E tests expect
- [ ] Loading states properly managed
- [ ] Error handling robust

## Implementation Details

### Step 1: Re-enable E2E Tests from AL.5

Remove `.skip` from the test suite:

```typescript
// Change from test.describe.skip to test.describe
test.describe('Update Fields Flow', () => {
  // ... tests
});
```

### Step 2: Run E2E Tests and Identify Failures

```bash
pnpm e2e:dms-material
```

Document any failures and their causes.

### Step 3: Refine Implementation

Address any issues found:

1. **data-testid attribute**: Ensure button has `data-testid="update-fields-button"`
2. **API route**: Verify service calls `/api/universe/update-fields`
3. **Notification selectors**: Check for `.snackbar-success` and `.snackbar-error`
4. **Loading state**: Ensure proper GlobalLoadingService integration
5. **Response format**: Ensure backend returns `UpdateFieldsSummary` format

### Step 4: Verify All Tests Pass

```bash
pnpm e2e:dms-material
```

Ensure all Update Fields tests pass.

### Step 5: Manual Testing

1. Navigate to Global/Universe screen
2. Click "Update Fields" button
3. Verify loading overlay appears
4. Verify success notification with count
5. Test error scenarios
6. Test rapid clicking (concurrent prevention)

## Definition of Done

- [ ] All E2E tests from AL.5 re-enabled
- [ ] All E2E tests passing
- [ ] Edge cases handled properly
- [ ] Manual testing completed successfully
- [ ] API routes consistent between implementation and tests
- [ ] Notification system working as expected
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD GREEN phase for E2E tests
- Makes the RED E2E tests from AL.5 turn GREEN
- Completes Epic AL implementation
- Follow pattern from Story AK.6

## Related Stories

- **Prerequisite**: Story AL.5
- **Completes**: Epic AL
- **Reference**: Story AK.6 (Similar E2E refinement pattern)
