# Story AU.13: Add E2E Tests for Account Selection

## Story

**As a** developer
**I want** comprehensive end-to-end tests for the account selection feature
**So that** we ensure the complete user flow works correctly in a real browser environment

## Context

**Current System:**

- Account selection feature fully implemented and bug-fixed through AU.12
- Unit tests provide good coverage
- Ready for end-to-end testing
- Need to test full user flows in browser

**Problem:**

- Need to verify feature works in real browser environment
- Need to test complete user journeys across all tabs
- Need to ensure integration with routing and navigation
- Need automated regression tests for CI/CD

## Acceptance Criteria

### Functional Requirements

1. [ ] E2E tests cover account selection from dropdown
2. [ ] E2E tests verify summary screen updates
3. [ ] E2E tests verify open positions table updates
4. [ ] E2E tests verify sold positions table updates
5. [ ] E2E tests verify dividends table updates
6. [ ] E2E tests verify cross-tab account switching
7. [ ] E2E tests verify browser refresh maintains selection
8. [ ] E2E tests verify deep linking with account ID

### Technical Requirements

1. [ ] E2E tests use Playwright
2. [ ] Tests run in CI/CD pipeline
3. [ ] Tests are reliable (no flakiness)
4. [ ] Tests follow project E2E patterns
5. [ ] Tests include appropriate wait conditions
6. [ ] Code follows project coding standards

## Tasks / Subtasks

- [ ] Create E2E test file (AC: T1)
  - [ ] Create `apps/dms-material-e2e/src/account-selection.spec.ts`
  - [ ] Import necessary Playwright utilities
  - [ ] Set up test fixtures with multiple accounts
- [ ] Create account selection tests (AC: F1)
  - [ ] Test selecting account from dropdown
  - [ ] Test account dropdown displays available accounts
  - [ ] Test selecting different accounts
- [ ] Create summary screen tests (AC: F2)
  - [ ] Navigate to summary with account selected
  - [ ] Verify summary data is for correct account
  - [ ] Switch account and verify summary updates
- [ ] Create open positions tests (AC: F3)
  - [ ] Navigate to open positions tab
  - [ ] Verify table shows positions for correct account
  - [ ] Switch account and verify table updates
- [ ] Create sold positions tests (AC: F4)
  - [ ] Navigate to sold positions tab
  - [ ] Verify table and capital gains for correct account
  - [ ] Switch account and verify updates
- [ ] Create dividends tests (AC: F5)
  - [ ] Navigate to dividends tab
  - [ ] Verify table shows dividends for correct account
  - [ ] Switch account and verify table updates
- [ ] Create cross-tab tests (AC: F6)
  - [ ] Start on summary with account A
  - [ ] Switch to account B
  - [ ] Navigate to open positions
  - [ ] Verify open positions are for account B
  - [ ] Navigate through all tabs verifying account B data
- [ ] Create browser refresh tests (AC: F7)
  - [ ] Select account
  - [ ] Refresh browser
  - [ ] Verify same account still selected
  - [ ] Verify data loads for selected account
- [ ] Create deep linking tests (AC: F8)
  - [ ] Navigate to URL with accountId parameter
  - [ ] Verify correct account is selected
  - [ ] Verify data loads for that account
- [ ] Add loading state tests
  - [ ] Verify loading indicators during account switch
  - [ ] Verify data loads completely before interaction
- [ ] Add error handling tests
  - [ ] Test with invalid account ID
  - [ ] Test network error during account switch
  - [ ] Verify error messages display appropriately
- [ ] Optimize and stabilize tests (AC: T3)
  - [ ] Add appropriate wait conditions
  - [ ] Handle timing issues
  - [ ] Ensure tests are deterministic

## Technical Notes

- Use Playwright's `page.waitForSelector()` for reliability
- Consider using data-testid attributes for selectors
- Test with multiple accounts in test database
- Verify lazy loading works correctly in e2e environment
- May need to set up test accounts with different data profiles

## Dependencies

- Story AU.12 (bug fixes and verification)
- All previous AU stories

## Definition of Done

- [ ] All E2E test scenarios implemented
- [ ] All tests passing reliably
- [ ] Tests run in CI/CD pipeline
- [ ] No flaky tests
- [ ] Test coverage documented
- [ ] Code reviewed and approved
- [ ] All validation commands pass
