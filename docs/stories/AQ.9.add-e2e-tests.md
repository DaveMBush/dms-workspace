# Story AQ.9: Add E2E Tests for Dividends & Deposits

## Status

Approved

## Story

**As a** QA engineer
**I want** comprehensive end-to-end tests for dividend and deposit functionality
**So that** we can ensure the complete feature works correctly in the browser

## Context

**Current System:**

- Dividend deposits table functional (AQ.2)
- Add functionality working (AQ.4)
- Edit functionality working (AQ.6)
- Delete functionality working (AQ.8)
- E2E test file already exists: `dividend-deposits-modal.spec.ts`

**Problem:**

- Need comprehensive E2E coverage for full workflow
- Existing E2E tests may be incomplete or outdated

## Acceptance Criteria

### Functional Requirements

1. [ ] E2E test for adding dividend via dialog
2. [ ] E2E test for editing existing dividend
3. [ ] E2E test for deleting dividend with confirmation
4. [ ] E2E test for cancel operations (add, edit, delete)
5. [ ] E2E test for form validation in dialog
6. [ ] E2E test for table display and filtering
7. [ ] E2E test for empty state
8. [ ] E2E test verifies data persists after operations

### Technical Requirements

1. [ ] Use Playwright for E2E tests
2. [ ] Tests run against dms-material app
3. [ ] Tests use proper page object patterns
4. [ ] Tests include proper waits and assertions
5. [ ] All tests pass consistently
6. [ ] Code follows existing E2E test patterns

## Tasks / Subtasks

- [ ] Review existing E2E tests (AC: 6)
  - [ ] Read `dividend-deposits-modal.spec.ts`
  - [ ] Identify gaps in coverage
  - [ ] Determine what needs to be added/updated
- [ ] Update/add table display tests (AC: 6, 7)
  - [ ] Test dividends table loads
  - [ ] Test table columns display correctly
  - [ ] Test empty state when no dividends
  - [ ] Test filtering by account
- [ ] Add/update add functionality tests (AC: 1, 4, 5)
  - [ ] Test opening add dialog
  - [ ] Test form fields present
  - [ ] Test form validation
  - [ ] Test successful add flow
  - [ ] Test cancel button
  - [ ] Verify dividend appears in table
- [ ] Add edit functionality tests (AC: 2, 4, 8)
  - [ ] Test clicking row opens edit dialog
  - [ ] Test dialog pre-populated with data
  - [ ] Test successful edit flow
  - [ ] Test cancel button
  - [ ] Verify changes appear in table
- [ ] Add delete functionality tests (AC: 3, 4, 8)
  - [ ] Test delete button/action
  - [ ] Test confirmation dialog appears
  - [ ] Test successful delete flow
  - [ ] Test cancel confirmation
  - [ ] Verify dividend removed from table
- [ ] Run E2E tests (AC: 5)
  - [ ] Execute: `pnpm e2e:dms-material`
  - [ ] Fix any failing tests
  - [ ] Verify all tests pass
- [ ] Run all validation commands (AC: DOD)
  - [ ] `pnpm all`
  - [ ] `pnpm e2e:dms-material`
  - [ ] `pnpm dupcheck`
  - [ ] `pnpm format`

## Dev Notes

### Testing Standards

**Test File Location:**
`apps/dms-material-e2e/src/dividend-deposits-modal.spec.ts`

**Testing Framework:**
- Playwright for E2E testing
- Follow patterns from existing E2E tests
- Use proper selectors (role, text, test-id)
- Include appropriate waits and timeouts

**Test Structure:**
```typescript
import { expect, test } from '@playwright/test';
import { login } from './helpers/login.helper';

test.describe('Dividend Deposits - Full Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/account/1677e04f-ef9b-4372-adb3-b740443088dc');
    const divDepTab = page.getByRole('tab', { name: /dividend.*deposit/i });
    await divDepTab.click();
    await page.waitForTimeout(500);
  });

  test('should display dividends table', async ({ page }) => {
    // Test implementation
  });

  test('should add dividend successfully', async ({ page }) => {
    // Test implementation
  });

  test('should edit dividend successfully', async ({ page }) => {
    // Test implementation
  });

  test('should delete dividend successfully', async ({ page }) => {
    // Test implementation
  });
});
```

### Important E2E Patterns

**Selector Strategies:**
- Prefer `getByRole()` for accessibility
- Use `getByText()` for visible text
- Use `getByLabel()` for form fields
- Use test-id attributes for complex selectors

**Wait Strategies:**
- Use `waitForSelector()` for element appearance
- Use `waitForTimeout()` sparingly (only when necessary)
- Use `waitForLoadState()` for page loads
- Use Playwright auto-waiting where possible

**Data Management:**
- Each test should create its own test data
- Clean up data after test (if needed)
- Use unique identifiers to avoid conflicts

### Relevant Source Tree

**Files to Modify:**
- `apps/dms-material-e2e/src/dividend-deposits-modal.spec.ts` - Add/update E2E tests

**Reference Files:**
- Existing E2E tests in `apps/dms-material-e2e/src/`
- `login.helper.ts` for authentication
- Other modal/dialog E2E test patterns

**Components Under Test:**
- `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.ts`
- `apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.ts`

### Test Scenarios to Cover

**Add Dividend Flow:**
1. Click add button
2. Dialog opens with empty form
3. Fill in all required fields (symbol, date, amount, type)
4. Submit form
5. Verify success notification
6. Verify dividend appears in table

**Edit Dividend Flow:**
1. Click existing dividend row
2. Dialog opens with pre-filled data
3. Modify field (e.g., amount)
4. Submit form
5. Verify success notification
6. Verify changes in table

**Delete Dividend Flow:**
1. Click delete action on dividend row
2. Confirmation dialog appears
3. Confirm deletion
4. Verify success notification
5. Verify dividend removed from table

**Cancel Operations:**
- Test cancel on add dialog
- Test cancel on edit dialog
- Test cancel on delete confirmation

**Validation:**
- Required field validation
- Date format validation
- Amount format validation

## Definition of Done

- [ ] All acceptance criteria have E2E tests
- [ ] E2E tests pass consistently
- [ ] Tests follow Playwright best practices
- [ ] Tests use proper selectors and waits
- [ ] Code follows existing E2E test patterns
- [ ] No flaky tests
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- E2E test file already exists but may need updates
- Follow patterns from existing E2E tests
- Consider test data management strategy
- May need to add test-id attributes to components

## Dependencies

- Story AQ.8 completed (all functionality implemented)
- Playwright configured for dms-material
- Test environment available
- Login helper available

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-02-22 | 1.0 | Initial story creation | PM Agent |

## Dev Agent Record

### Agent Model Used

_To be populated during implementation_

### Debug Log References

_To be populated during implementation_

### Completion Notes List

_To be populated during implementation_

### File List

_To be populated during implementation_

## QA Results

_To be populated by QA Agent after implementation_
