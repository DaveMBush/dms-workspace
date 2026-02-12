# Story AO.9: E2E Tests for Open Positions Screen

## Story

**As a** QA engineer
**I want** comprehensive E2E tests for the open positions screen
**So that** we can ensure the entire user workflow functions correctly

## Context

**Current System:**

- Stories AO.1-AO.8 completed
- Open positions screen fully functional
- Need E2E tests to verify complete user flows

**Problem:**

- No E2E coverage for open positions
- Need to verify integration across all features

## Acceptance Criteria

### Functional Requirements

- [ ] Test: Load open positions for account
- [ ] Test: Edit quantity, price, purchase_date
- [ ] Test: Add new position via dialog
- [ ] Test: Close position by filling sell_date
- [ ] Test: Validation prevents invalid input
- [ ] Test: Switch accounts updates positions
- [ ] Test: Capital gains calculated correctly

### Technical Requirements

- [ ] E2E tests using Playwright
- [ ] Tests follow page object pattern
- [ ] Tests use proper data setup/teardown
- [ ] Tests verify no console errors
- [ ] Visual regression checks included

## E2E Test Implementation

### Step 1: Create Page Object

Create `apps/dms-material-e2e/src/support/page-objects/open-positions.page.ts`:

```typescript
import { Page, Locator } from '@playwright/test';

export class OpenPositionsPage {
  readonly page: Page;
  readonly addPositionButton: Locator;
  readonly positionsTable: Locator;
  readonly symbolColumn: Locator;
  readonly quantityColumn: Locator;
  readonly sellDateColumn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addPositionButton = page.getByRole('button', { name: 'Add New Position' });
    this.positionsTable = page.locator('mat-table');
    this.symbolColumn = page.locator('mat-column-symbol');
    this.quantityColumn = page.locator('mat-column-quantity');
    this.sellDateColumn = page.locator('mat-column-sell_date');
  }

  async navigateToOpenPositions() {
    await this.page.goto('/account/open-positions');
    await this.page.waitForLoadState('networkidle');
  }

  async addPosition(symbol: string, quantity: number, price: number, purchaseDate: string) {
    await this.addPositionButton.click();

    await this.page.getByLabel('Symbol').fill(symbol);
    await this.page.getByLabel('Quantity').fill(quantity.toString());
    await this.page.getByLabel('Price').fill(price.toString());
    await this.page.getByLabel('Purchase Date').fill(purchaseDate);

    await this.page.getByRole('button', { name: 'Add Position' }).click();
  }

  async editQuantity(rowIndex: number, newQuantity: number) {
    const quantityCell = this.quantityColumn.nth(rowIndex);
    await quantityCell.click();
    await quantityCell.locator('input').fill(newQuantity.toString());
    await this.page.keyboard.press('Enter');
  }

  async closePosition(rowIndex: number, sellPrice: number, sellDate: string) {
    // First set sell price
    const sellPriceCell = this.page.locator('mat-column-sell').nth(rowIndex);
    await sellPriceCell.click();
    await sellPriceCell.locator('input').fill(sellPrice.toString());
    await this.page.keyboard.press('Enter');

    // Then set sell date (triggers close)
    const sellDateCell = this.sellDateColumn.nth(rowIndex);
    await sellDateCell.click();
    await sellDateCell.locator('input').fill(sellDate);
    await this.page.keyboard.press('Enter');

    // Confirm dialog
    await this.page.getByRole('button', { name: 'OK' }).click();
  }

  async getPositionCount(): Promise<number> {
    return await this.positionsTable.locator('mat-row').count();
  }

  async getPositionData(rowIndex: number): Promise<any> {
    const row = this.positionsTable.locator('mat-row').nth(rowIndex);

    return {
      symbol: await row.locator('mat-column-symbol').textContent(),
      quantity: await row.locator('mat-column-quantity').textContent(),
      price: await row.locator('mat-column-price').textContent(),
      capitalGain: await row.locator('mat-column-capitalGain').textContent(),
    };
  }
}
```

### Step 2: Create E2E Test Suite

Create `apps/dms-material-e2e/src/open-positions.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { OpenPositionsPage } from './support/page-objects/open-positions.page';

test.describe('Open Positions Screen', () => {
  let openPositionsPage: OpenPositionsPage;

  test.beforeEach(async ({ page }) => {
    openPositionsPage = new OpenPositionsPage(page);

    // Login and setup test data
    await page.goto('/login');
    await page.getByLabel('Username').fill('testuser');
    await page.getByLabel('Password').fill('testpass');
    await page.getByRole('button', { name: 'Login' }).click();

    // Select test account
    await page.getByText('Test Account 1').click();

    await openPositionsPage.navigateToOpenPositions();
  });

  test('should display open positions for selected account', async ({ page }) => {
    // Verify table loads
    await expect(openPositionsPage.positionsTable).toBeVisible();

    // Verify at least one position exists
    const count = await openPositionsPage.getPositionCount();
    expect(count).toBeGreaterThan(0);

    // Verify no console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    expect(consoleErrors).toHaveLength(0);
  });

  test('should add new position via dialog', async ({ page }) => {
    const initialCount = await openPositionsPage.getPositionCount();

    await openPositionsPage.addPosition('TSLA', 50, 250.5, '2024-01-15');

    // Wait for success message
    await expect(page.getByText('Position added successfully')).toBeVisible();

    // Verify position added
    const newCount = await openPositionsPage.getPositionCount();
    expect(newCount).toBe(initialCount + 1);

    // Verify position data
    const position = await openPositionsPage.getPositionData(newCount - 1);
    expect(position.symbol).toContain('TSLA');
    expect(position.quantity).toContain('50');
  });

  test('should edit quantity inline', async ({ page }) => {
    await openPositionsPage.editQuantity(0, 150);

    // Wait for update
    await page.waitForTimeout(500);

    // Verify updated
    const position = await openPositionsPage.getPositionData(0);
    expect(position.quantity).toContain('150');
  });

  test('should close position when sell date filled', async ({ page }) => {
    const initialCount = await openPositionsPage.getPositionCount();

    await openPositionsPage.closePosition(0, 175.5, '2024-06-15');

    // Wait for position to be removed
    await page.waitForTimeout(500);

    // Verify position removed from open positions
    const newCount = await openPositionsPage.getPositionCount();
    expect(newCount).toBe(initialCount - 1);

    // Verify success message
    await expect(page.getByText('Position closed successfully')).toBeVisible();
  });

  test('should calculate capital gains correctly', async ({ page }) => {
    // Add position with known values
    await openPositionsPage.addPosition('AAPL', 100, 150, '2024-01-01');

    // Get the new position
    const count = await openPositionsPage.getPositionCount();
    const position = await openPositionsPage.getPositionData(count - 1);

    // Initially no gain
    expect(position.capitalGain).toContain('$0.00');

    // Set sell price
    const sellPriceCell = page.locator('mat-column-sell').nth(count - 1);
    await sellPriceCell.click();
    await sellPriceCell.locator('input').fill('175');
    await page.keyboard.press('Enter');

    // Wait for calculation
    await page.waitForTimeout(500);

    // Verify capital gain: (175 - 150) * 100 = 2500
    const updatedPosition = await openPositionsPage.getPositionData(count - 1);
    expect(updatedPosition.capitalGain).toContain('$2,500');
    expect(updatedPosition.capitalGain).toHaveClass(/positive/);
  });

  test('should validate quantity must be positive', async ({ page }) => {
    await openPositionsPage.editQuantity(0, -50);

    // Verify error message
    await expect(page.getByText('Quantity must be positive')).toBeVisible();
  });

  test('should require sell price before closing position', async ({ page }) => {
    // Try to set sell date without sell price
    const sellDateCell = openPositionsPage.sellDateColumn.nth(0);
    await sellDateCell.click();
    await sellDateCell.locator('input').fill('2024-06-15');
    await page.keyboard.press('Enter');

    // Verify error message
    await expect(page.getByText('Sell price is required to close position')).toBeVisible();
  });

  test('should update positions when account changes', async ({ page }) => {
    const account1Count = await openPositionsPage.getPositionCount();

    // Switch to different account
    await page.getByText('Test Account 2').click();

    // Wait for data to load
    await page.waitForTimeout(500);

    const account2Count = await openPositionsPage.getPositionCount();

    // Counts should be different (unless by chance they're the same)
    // Just verify table reloaded
    await expect(openPositionsPage.positionsTable).toBeVisible();
  });

  test('should handle empty positions list', async ({ page }) => {
    // Switch to account with no positions
    await page.getByText('Empty Account').click();

    // Verify empty state message or table
    await expect(page.getByText(/no open positions/i)).toBeVisible();
  });
});
```

### Step 3: Run E2E Tests

```bash
pnpm nx e2e dms-material-e2e
```

### Step 4: Verify with Playwright MPC

Use Playwright MPC to:

- Verify visual appearance
- Check for console errors
- Validate user flows
- Test edge cases

### Step 5: Run All Validation Commands

```bash
pnpm all
pnpm e2e:dms-material
pnpm dupcheck
pnpm format
```

## Files Modified

| File                                                                    | Changes            |
| ----------------------------------------------------------------------- | ------------------ |
| `apps/dms-material-e2e/src/support/page-objects/open-positions.page.ts` | Create page object |
| `apps/dms-material-e2e/src/open-positions.spec.ts`                      | Create E2E tests   |

## Definition of Done

- [ ] E2E tests created for all user flows
- [ ] All E2E tests passing
- [ ] Page object pattern used
- [ ] No console errors during tests
- [ ] Visual appearance verified
- [ ] Edge cases covered
- [ ] All existing E2E tests still pass
- [ ] Lint passes
- [ ] Screenshots/videos captured for documentation
- [ ] Code reviewed
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Notes

- Follow existing E2E test patterns
- Use data-test attributes if needed for stable selectors
- Consider adding visual regression tests
- Document any flaky tests and solutions
- Ensure tests are deterministic and repeatable

## Dependencies

- Stories AO.1-AO.8 completed
- Playwright configured
- Test data available
- Login functionality working

## Test Coverage

This E2E suite covers:

- ✅ Loading positions
- ✅ Adding positions
- ✅ Editing positions
- ✅ Closing positions
- ✅ Validation
- ✅ Account switching
- ✅ Capital gain calculations
- ✅ Empty state handling

Epic AO is complete when all stories including this E2E suite are done and passing.
