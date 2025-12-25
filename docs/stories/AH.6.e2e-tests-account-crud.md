# Story AH.6: Add End-to-End Tests for Account CRUD Operations

## Story

**As a** QA engineer
**I want** comprehensive end-to-end tests for account CRUD operations
**So that** I can verify the entire account workflow works correctly in a real browser

## Context

**Current System:**

- RMS app has Playwright E2E tests for account operations
- Tests verify complete user workflows from start to finish
- Tests run against real backend with database
- Tests verify UI rendering and user interactions

**Migration Target:**

- Create Playwright E2E tests for RMS-MATERIAL account operations
- Verify complete CRUD workflows
- Test cross-component navigation
- Ensure data persistence across page reloads

## Acceptance Criteria

### Functional Requirements

- [ ] **CRITICAL** E2E tests match RMS app coverage
- [ ] Tests verify list, add, edit, delete workflows
- [ ] Tests verify navigation between accounts
- [ ] Tests verify data persistence
- [ ] Tests verify UI feedback (confirmations, errors)
- [ ] Tests run reliably in CI/CD

### Technical Requirements

- [ ] Use Playwright test framework
- [ ] Use page object pattern for maintainability
- [ ] Test against real backend
- [ ] Clean up test data after each test
- [ ] Use data-testid attributes for selectors
- [ ] Handle async operations properly

## Test-Driven Development Approach

### Step 1: Create E2E Test File

Create `apps/rms-material-e2e/src/accounts-crud.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Account CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Ensure clean state
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ page }) => {
    // Clean up any test accounts created
    // This may require a helper function or API call
  });

  test.describe('Account List', () => {
    test('should display accounts panel', async ({ page }) => {
      const accountsPanel = page.locator('[data-testid="accounts-panel"]');
      await expect(accountsPanel).toBeVisible();
    });

    test('should display account list items', async ({ page }) => {
      const accountItems = page.locator('[data-testid="account-item"]');
      await expect(accountItems.first()).toBeVisible();
    });

    test('should have add account button', async ({ page }) => {
      const addButton = page.locator('[data-testid="add-account-button"]');
      await expect(addButton).toBeVisible();
    });

    test('should navigate to account on click', async ({ page }) => {
      const firstAccount = page.locator('[data-testid="account-item"]').first();
      const accountName = await firstAccount.textContent();

      await firstAccount.click();

      await expect(page).toHaveURL(/\/account\/.+/);
      await expect(page.locator('h1')).toContainText(accountName || '');
    });
  });

  test.describe('Add Account', () => {
    test('should add new account successfully', async ({ page }) => {
      const addButton = page.locator('[data-testid="add-account-button"]');
      await addButton.click();

      // Inline editor should appear
      const editor = page.locator('[data-testid="node-editor"]');
      await expect(editor).toBeVisible();

      // Type account name
      const input = editor.locator('input');
      await input.fill('Test Account ' + Date.now());

      // Save
      const saveButton = editor.locator('[data-testid="save-button"]');
      await saveButton.click();

      // Verify account appears in list
      await expect(page.locator('[data-testid="account-item"]').last()).toContainText('Test Account');
    });

    test('should cancel add account', async ({ page }) => {
      const initialCount = await page.locator('[data-testid="account-item"]').count();

      const addButton = page.locator('[data-testid="add-account-button"]');
      await addButton.click();

      const editor = page.locator('[data-testid="node-editor"]');
      const input = editor.locator('input');
      await input.fill('Cancelled Account');

      // Cancel
      const cancelButton = editor.locator('[data-testid="cancel-button"]');
      await cancelButton.click();

      // Verify account count unchanged
      const finalCount = await page.locator('[data-testid="account-item"]').count();
      expect(finalCount).toBe(initialCount);
    });

    test('should not save empty account name', async ({ page }) => {
      const addButton = page.locator('[data-testid="add-account-button"]');
      await addButton.click();

      const editor = page.locator('[data-testid="node-editor"]');
      const input = editor.locator('input');
      await input.fill('');

      const saveButton = editor.locator('[data-testid="save-button"]');
      await saveButton.click();

      // Editor should still be visible (validation failed)
      await expect(editor).toBeVisible();
    });
  });

  test.describe('Edit Account', () => {
    test('should edit account name successfully', async ({ page }) => {
      // Click first account name to edit
      const accountItem = page.locator('[data-testid="account-item"]').first();
      const accountName = accountItem.locator('[data-testid="account-name"]');
      await accountName.click();

      // Editor should appear
      const editor = page.locator('[data-testid="node-editor"]');
      await expect(editor).toBeVisible();

      // Change name
      const input = editor.locator('input');
      const newName = 'Updated Account ' + Date.now();
      await input.fill(newName);

      // Save
      const saveButton = editor.locator('[data-testid="save-button"]');
      await saveButton.click();

      // Verify name updated
      await expect(accountItem).toContainText(newName);
    });

    test('should cancel edit account', async ({ page }) => {
      const accountItem = page.locator('[data-testid="account-item"]').first();
      const originalName = await accountItem.textContent();

      const accountName = accountItem.locator('[data-testid="account-name"]');
      await accountName.click();

      const editor = page.locator('[data-testid="node-editor"]');
      const input = editor.locator('input');
      await input.fill('Changed Name');

      // Cancel
      const cancelButton = editor.locator('[data-testid="cancel-button"]');
      await cancelButton.click();

      // Verify name unchanged
      await expect(accountItem).toContainText(originalName || '');
    });

    test('should not save empty account name on edit', async ({ page }) => {
      const accountItem = page.locator('[data-testid="account-item"]').first();
      const originalName = await accountItem.textContent();

      const accountName = accountItem.locator('[data-testid="account-name"]');
      await accountName.click();

      const editor = page.locator('[data-testid="node-editor"]');
      const input = editor.locator('input');
      await input.fill('');

      const saveButton = editor.locator('[data-testid="save-button"]');
      await saveButton.click();

      // Editor should still be visible
      await expect(editor).toBeVisible();

      // Cancel to restore state
      const cancelButton = editor.locator('[data-testid="cancel-button"]');
      await cancelButton.click();

      // Name should be unchanged
      await expect(accountItem).toContainText(originalName || '');
    });
  });

  test.describe('Delete Account', () => {
    test('should delete account with confirmation', async ({ page }) => {
      // Add test account first
      const addButton = page.locator('[data-testid="add-account-button"]');
      await addButton.click();

      const editor = page.locator('[data-testid="node-editor"]');
      const input = editor.locator('input');
      const testAccountName = 'Delete Test ' + Date.now();
      await input.fill(testAccountName);

      const saveButton = editor.locator('[data-testid="save-button"]');
      await saveButton.click();

      // Find the test account
      const testAccount = page.locator('[data-testid="account-item"]').filter({ hasText: testAccountName });
      await expect(testAccount).toBeVisible();

      // Click delete button
      const deleteButton = testAccount.locator('[data-testid="delete-account-button"]');
      await deleteButton.click();

      // Confirm deletion dialog
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText('Delete Account');
      await expect(dialog).toContainText(testAccountName);

      const confirmButton = dialog.locator('button', { hasText: 'Delete' });
      await confirmButton.click();

      // Verify account removed
      await expect(testAccount).not.toBeVisible();
    });

    test('should cancel delete account', async ({ page }) => {
      const accountItem = page.locator('[data-testid="account-item"]').first();
      const accountName = await accountItem.textContent();

      // Click delete button
      const deleteButton = accountItem.locator('[data-testid="delete-account-button"]');
      await deleteButton.click();

      // Cancel deletion dialog
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      const cancelButton = dialog.locator('button', { hasText: 'Cancel' });
      await cancelButton.click();

      // Verify account still exists
      await expect(accountItem).toBeVisible();
      await expect(accountItem).toContainText(accountName || '');
    });

    test('should navigate away when deleting active account', async ({ page }) => {
      // Navigate to first account
      const firstAccount = page.locator('[data-testid="account-item"]').first();
      await firstAccount.click();

      await expect(page).toHaveURL(/\/account\/.+/);

      // Delete the account from side panel
      const deleteButton = page.locator('[data-testid="accounts-panel"]').locator('[data-testid="account-item"]').first().locator('[data-testid="delete-account-button"]');
      await deleteButton.click();

      // Confirm deletion
      const dialog = page.locator('[role="dialog"]');
      const confirmButton = dialog.locator('button', { hasText: 'Delete' });
      await confirmButton.click();

      // Should navigate to home
      await expect(page).toHaveURL('/');
    });
  });

  test.describe('Data Persistence', () => {
    test('should persist new account across page reload', async ({ page }) => {
      // Add account
      const addButton = page.locator('[data-testid="add-account-button"]');
      await addButton.click();

      const editor = page.locator('[data-testid="node-editor"]');
      const input = editor.locator('input');
      const accountName = 'Persist Test ' + Date.now();
      await input.fill(accountName);

      const saveButton = editor.locator('[data-testid="save-button"]');
      await saveButton.click();

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify account still exists
      const account = page.locator('[data-testid="account-item"]').filter({ hasText: accountName });
      await expect(account).toBeVisible();
    });

    test('should persist edited account name across page reload', async ({ page }) => {
      // Edit first account
      const accountItem = page.locator('[data-testid="account-item"]').first();
      const accountName = accountItem.locator('[data-testid="account-name"]');
      await accountName.click();

      const editor = page.locator('[data-testid="node-editor"]');
      const input = editor.locator('input');
      const newName = 'Edited Persist ' + Date.now();
      await input.fill(newName);

      const saveButton = editor.locator('[data-testid="save-button"]');
      await saveButton.click();

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify name persisted
      await expect(accountItem).toContainText(newName);
    });
  });

  test.describe('Cross-Component Integration', () => {
    test('should load account in screener when selected', async ({ page }) => {
      const accountItem = page.locator('[data-testid="account-item"]').first();
      const accountName = await accountItem.textContent();

      await accountItem.click();

      // Navigate to screener
      await page.goto('/account/' + (await page.url().split('/').pop()) + '/screener');

      // Verify account context in screener
      const breadcrumb = page.locator('[data-testid="account-breadcrumb"]');
      await expect(breadcrumb).toContainText(accountName || '');
    });

    test('should maintain account selection across navigation', async ({ page }) => {
      const accountItem = page.locator('[data-testid="account-item"]').nth(1);
      await accountItem.click();

      const accountUrl = page.url();

      // Navigate to universe
      await page.click('[data-testid="universe-link"]');

      // Navigate back
      await page.goBack();

      // Should still be on same account
      expect(page.url()).toBe(accountUrl);
    });
  });
});
```

### Step 2: Add Data Test IDs to Components

Update components to include `data-testid` attributes for testing.

### Step 3: Run E2E Tests

```bash
pnpm nx e2e rms-material-e2e
```

### Step 4: Verify Tests in CI

Run tests in CI environment to ensure reliability.

### Step 5: Manual Verification with Playwright Inspector

```bash
pnpm nx e2e rms-material-e2e --headed --debug
```

## Technical Approach

### Files to Modify

- `apps/rms-material-e2e/src/accounts-crud.spec.ts` - E2E tests
- `apps/rms-material/src/app/accounts/account.html` - Add data-testid attributes
- `apps/rms-material/src/app/shared/components/node-editor/` - Add data-testid attributes

### Testing Strategy

1. **Setup/Teardown**: Clean state before/after each test
2. **User Workflows**: Test complete workflows from user perspective
3. **Data Persistence**: Verify database operations
4. **Navigation**: Test routing and context preservation
5. **Error Handling**: Test validation and error states
6. **Cross-Component**: Verify integration with other features

### Test Organization

- Group tests by feature area
- Use descriptive test names
- Test one workflow per test
- Use page object pattern for maintainability
- Handle async operations properly

## Files Modified

| File                                                       | Changes                      |
| ---------------------------------------------------------- | ---------------------------- |
| `apps/rms-material-e2e/src/accounts-crud.spec.ts`          | Added E2E tests              |
| `apps/rms-material/src/app/accounts/account.html`          | Added data-testid attributes |
| `apps/rms-material/src/app/shared/components/node-editor/` | Added data-testid attributes |

## Definition of Done

- [ ] All CRUD workflows tested end-to-end
- [ ] Add account tested (happy path, cancel, validation)
- [ ] Edit account tested (happy path, cancel, validation)
- [ ] Delete account tested (confirm, cancel, navigation)
- [ ] Data persistence verified across reloads
- [ ] Cross-component navigation tested
- [ ] All tests pass locally
- [ ] All tests pass in CI
- [ ] Tests are reliable (no flakiness)
- [ ] Data-testid attributes added to all interactive elements
- [ ] Code reviewed
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:rms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- Use `data-testid` attributes for stable selectors
- Avoid CSS selectors that may change
- Use Playwright's auto-waiting features
- Consider using page object model for complex pages
- Add screenshots on failure for debugging
- Test in multiple browsers if required
- Consider visual regression testing in future
