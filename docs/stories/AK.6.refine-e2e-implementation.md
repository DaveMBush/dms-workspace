# Story AK.6: Refine Implementation Based on E2E Test Results

## Story

**As a** developer
**I want** to refine the universe update implementation to pass E2E tests
**So that** the complete workflow is verified and production-ready

## Context

**Current System:**

- TDD E2E tests written in Story AK.5 (currently disabled)
- Universe button, notifications fully implemented
- Need to ensure E2E tests pass and refine any edge cases

**Implementation Approach:**

- Re-enable E2E tests from AK.5
- Run tests and identify any failures
- Refine implementation to make all tests pass (GREEN phase)
- Address any edge cases discovered during E2E testing

## Acceptance Criteria

### Functional Requirements

- [ ] All E2E tests from AK.5 re-enabled
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

### Step 1: Re-enable E2E Tests from AK.5

Remove `.skip` from the test suite created in Story AK.5:

```typescript
// Change from test.describe.skip to test.describe
test.describe('Universe Update Flow', () => {
  // ... tests
});
```

### Step 2: Run E2E Tests and Identify Failures

Run E2E tests:

```bash
pnpm e2e:dms-material
```

Document any failures and their causes.

### Step 3: Refine Implementation

Address any issues found:

**Common Issues to Check:**

1. **data-testid attribute missing or incorrect**
   - Ensure button has `data-testid="update-universe-button"`
2. **API route mismatch**
   - E2E tests mock `**/api/universe/sync`
   - Ensure your service calls the correct endpoint
3. **Notification selectors**
   - Verify notification component classes match test expectations
   - Check for `.notification-success` and `.notification-error` or `[role="alert"]`
4. **Loading state text**

   - Ensure button shows exactly "Syncing..." during operation

5. **Response format**
   - Ensure backend returns `{ success: true, count: number }` format

**Example Refinements:**

```typescript
// If notification classes don't match, update NotificationService
// or adjust E2E test selectors

// If API route is different, update either:
// - Service to use /api/universe/sync
// - E2E test mocks to match actual route

// If response format differs, normalize in service:
this.syncService.syncFromScreener().pipe(
  map((response) => ({
    success: response.success || response.ok,
    count: response.count || response.symbolsUpdated || 0,
  }))
  // ... rest of implementation
);
```

### Step 4: Verify All Tests Pass

Run E2E tests again:

```bash
pnpm e2e:dms-material
```

Ensure all tests pass.

### Step 5: Manual Testing

1. Navigate to Global/Universe screen
2. Click "Update Universe" button multiple times rapidly
3. Verify only one request is sent
4. Test with network throttling
5. Test with backend errors
6. Verify all scenarios match E2E test expectations

## Definition of Done

- [ ] All E2E tests from AK.5 re-enabled
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
- [ ] Documentation updated if needed

## Notes

- This story makes the RED E2E tests from AK.5 turn GREEN
- May require minor adjustments to implementation
- Focus on making tests pass without changing test requirements
- Document any deviations from original design
- This completes Epic AK implementation

## Related Stories

- **Prerequisite**: Story AK.5 (E2E TDD tests)
- **Completes**: Epic AK (Universe Update Button)
- **Reference**: Stories AK.1-AK.4 (Prior implementations)
