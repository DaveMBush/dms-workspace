# Epic AG: Ensure Risk Group Data Initialization in Top Route

## Epic Goal

Ensure that risk group data is properly initialized and validated when the top route is loaded, preventing downstream data integrity issues in the RMS-MATERIAL application.

## Epic Description

**Existing System Context:**

- Backend has logic to ensure risk groups exist (Equities, Income, Tax Free Income)
- This logic may not be executing during the top route data load
- Risk groups are critical for universe management and screener functionality

**Enhancement Details:**

- Integrate risk group validation into top route loading sequence
- Ensure all required risk groups exist before returning top data
- Add proper error handling and logging

**Success Criteria:**

- Risk groups always exist when top data is loaded
- Application handles missing risk groups gracefully
- Tests verify risk group initialization

## Stories

1. **Story AG.1:** Integrate risk group validation into top route handler
2. **Story AG.2:** Add unit tests for risk group initialization in top route
3. **Story AG.3:** Add e2e tests verifying risk groups load correctly

## Dependencies

- None - foundational for all other backend integration work

## Priority

**Critical** - Must complete before wiring up other components

## Estimated Effort

1-2 days

## Definition of Done

- [ ] Risk group validation integrated into top route
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] All linting passes
- [ ] Code reviewed and merged
