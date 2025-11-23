# Story AG.2: E2E Test Updates

## Story

**As a** QA engineer validating the application
**I want** E2E tests that cover all user flows
**So that** I can verify the application works correctly end-to-end

## Context

**Current System:**

- E2E tests use Playwright
- Tests in `apps/rms-e2e/`
- Test against RMS on port 4200

**Migration Target:**

- Create `apps/rms-material-e2e/`
- Test against rms-material on port 4201
- Update selectors for Material components

## Acceptance Criteria

### Functional Requirements

- [ ] All user flows tested
- [ ] Login flow works
- [ ] Navigation works
- [ ] Data entry works
- [ ] All tests pass

### Technical Requirements

- [ ] Playwright configuration for port 4201
- [ ] Selectors updated for Material components
- [ ] Test fixtures updated

### Test Coverage

- [ ] Authentication flow
- [ ] Account navigation
- [ ] Position management
- [ ] Dividend entry
- [ ] Universe management
- [ ] Screener usage

## Technical Approach

### Step 1: Generate E2E Project

```bash
nx g @nx/playwright:configuration rms-material-e2e --project=rms-material
```

### Step 2: Update Playwright Configuration

Update `apps/rms-material-e2e/playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4201',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm nx run rms-material:serve',
    url: 'http://localhost:4201',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Step 3: Update Selectors

Material components have different selectors:

| PrimeNG Selector | Material Selector |
|------------------|-------------------|
| `p-button` | `button[mat-button], button[mat-raised-button]` |
| `p-inputText` | `input[matInput]` |
| `p-password` | `input[matInput][type="password"]` |
| `p-table` | `table[mat-table]` |
| `p-dialog` | `mat-dialog-container` |
| `p-select` | `mat-select` |

### Step 4: Migrate Test Files

**Login test example:**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/auth/login');

    // Material form fields
    await page.fill('input[formControlName="email"]', 'test@example.com');
    await page.fill('input[formControlName="password"]', 'password123');

    // Material button
    await page.click('button[mat-raised-button][type="submit"]');

    // Wait for navigation
    await expect(page).toHaveURL('/');
  });

  test('should show validation errors', async ({ page }) => {
    await page.goto('/auth/login');

    await page.click('button[mat-raised-button][type="submit"]');

    // Material error messages
    await expect(page.locator('mat-error')).toBeVisible();
  });
});
```

### Step 5: Run E2E Tests

```bash
pnpm nx run rms-material-e2e:e2e
```

## Test Scenarios

### Authentication
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Logout
- [ ] Session timeout warning
- [ ] Profile update

### Navigation
- [ ] Navigate between accounts
- [ ] Navigate to global features
- [ ] Tab navigation in account panel
- [ ] Theme toggle

### Data Management
- [ ] View open positions
- [ ] Edit position
- [ ] Add dividend deposit
- [ ] View screener results
- [ ] Add symbol to universe

### Performance
- [ ] Scroll large dividend deposits list
- [ ] Lazy loading triggers

## Definition of Done

- [ ] E2E project created
- [ ] All tests migrated with updated selectors
- [ ] All tests pass
- [ ] CI configuration updated
- [ ] `pnpm nx run rms-material-e2e:e2e` succeeds
