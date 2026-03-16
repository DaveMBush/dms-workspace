import { expect, test } from 'playwright/test';
// eslint-disable-next-line @typescript-eslint/naming-convention -- AxeBuilder is the upstream class name from @axe-core/playwright
import AxeBuilder from '@axe-core/playwright';

import { login } from './helpers/login.helper';

// ─── Accessibility Tests (RED Phase - TDD) ──────────────────────────────────
//
// These tests verify WCAG 2.1 AA compliance using axe-core.
// They are currently SKIPPED because they identify real accessibility
// violations that need to be fixed. Story AY.4 will re-enable these
// tests and implement the necessary fixes (GREEN phase).
//
// To run these tests locally for development:
//   Remove .skip from the describe block or individual tests.
//
// ─────────────────────────────────────────────────────────────────────────────

test.describe.skip('Accessibility - axe-core audits', () => {
  // ─── Login Page ──────────────────────────────────────────────────────────

  test.describe('Login Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('input[type="email"]', {
        state: 'visible',
        timeout: 30000,
      });
    });

    test('should have no accessibility violations on login page', async ({
      page,
    }) => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });

    test('should have no accessibility violations on login form with validation errors', async ({
      page,
    }) => {
      await page.locator('button[type="submit"]').click();
      await page.waitForSelector('mat-error', {
        state: 'visible',
        timeout: 10000,
      });

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  });

  // ─── Dashboard Page ──────────────────────────────────────────────────────

  test.describe('Dashboard Page', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('should have no accessibility violations on dashboard', async ({
      page,
    }) => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  });

  // ─── Universe Page ───────────────────────────────────────────────────────

  test.describe('Universe Page', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await page.goto('/global/universe', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('dms-base-table', {
        state: 'visible',
        timeout: 15000,
      });
    });

    test('should have no accessibility violations on universe page', async ({
      page,
    }) => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  });

  // ─── Screener Page ───────────────────────────────────────────────────────

  test.describe('Screener Page', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await page.goto('/global/screener', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('dms-base-table', {
        state: 'visible',
        timeout: 15000,
      });
    });

    test('should have no accessibility violations on screener page', async ({
      page,
    }) => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  });

  // ─── Global Summary Page ─────────────────────────────────────────────────

  test.describe('Global Summary Page', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await page.goto('/global/summary', { waitUntil: 'domcontentloaded' });
    });

    test('should have no accessibility violations on global summary page', async ({
      page,
    }) => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  });

  // ─── Error Logs Page ─────────────────────────────────────────────────────

  test.describe('Error Logs Page', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await page.goto('/global/error-logs', { waitUntil: 'domcontentloaded' });
    });

    test('should have no accessibility violations on error logs page', async ({
      page,
    }) => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  });

  // ─── CUSIP Cache Page ────────────────────────────────────────────────────

  test.describe('CUSIP Cache Page', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await page.goto('/global/cusip-cache', {
        waitUntil: 'domcontentloaded',
      });
    });

    test('should have no accessibility violations on cusip cache page', async ({
      page,
    }) => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  });

  // ─── Profile Page ────────────────────────────────────────────────────────

  test.describe('Profile Page', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await page.goto('/profile', { waitUntil: 'domcontentloaded' });
    });

    test('should have no accessibility violations on profile page', async ({
      page,
    }) => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  });
});

test.describe.skip('Accessibility - Keyboard Navigation', () => {
  // ─── Login Page Keyboard Navigation ──────────────────────────────────────

  test.describe('Login Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('input[type="email"]', {
        state: 'visible',
        timeout: 30000,
      });
    });

    test('should complete login flow using keyboard only', async ({ page }) => {
      await page.keyboard.press('Tab');
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toBeFocused();

      await page.keyboard.type('test@example.com');
      await page.keyboard.press('Tab');

      const passwordInput = page.locator('input[type="password"]');
      await expect(passwordInput).toBeFocused();

      await page.keyboard.type('password123');
      await page.keyboard.press('Tab'); // to password visibility toggle
      await page.keyboard.press('Tab'); // to remember me checkbox
      await page.keyboard.press('Tab'); // to submit button

      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeFocused();

      await page.keyboard.press('Enter');
      await page.waitForURL('**/dashboard', { timeout: 45000 });
    });

    test('should toggle password visibility with keyboard', async ({
      page,
    }) => {
      const toggleButton = page.locator('button[matIconSuffix]');

      // Tab until the toggle button receives focus (bypasses hardcoded tab order)
      const maxTabs = 10;
      for (let i = 0; i < maxTabs; i++) {
        await page.keyboard.press('Tab');
        if (
          await toggleButton.evaluate(function isFocused(el) {
            return document.activeElement === el;
          })
        ) {
          break;
        }
        if (i === maxTabs - 1) {
          throw new Error('Toggle button was not reached via Tab navigation');
        }
      }

      await page.keyboard.press('Enter');

      const passwordInput = page.locator('input[formControlName="password"]');
      await expect(passwordInput).toHaveAttribute('type', 'text');

      await page.keyboard.press('Enter');
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should show focus indicators on all interactive elements', async ({
      page,
    }) => {
      // Drive focus via Tab to trigger :focus-visible, not .focus()
      const expectedCount = 5; // email, password, toggle, checkbox, submit
      const focusIndicators: { tag: string; hasIndicator: boolean }[] = [];

      for (let i = 0; i < expectedCount; i++) {
        await page.keyboard.press('Tab');
        const result = await page.evaluate(function checkFocusIndicator(): {
          tag: string;
          hasIndicator: boolean;
        } {
          const el = document.activeElement;
          if (!el) {
            return { tag: 'NONE', hasIndicator: false };
          }
          const computed = window.getComputedStyle(el);
          return {
            tag: el.tagName,
            hasIndicator:
              computed.outlineStyle !== 'none' || computed.boxShadow !== 'none',
          };
        });
        focusIndicators.push(result);
      }

      for (const indicator of focusIndicators) {
        expect(
          indicator.hasIndicator,
          `Focus indicator missing on ${indicator.tag}`
        ).toBeTruthy();
      }
    });
  });

  // ─── Dashboard Keyboard Navigation ──────────────────────────────────────

  test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test('should have logical tab order on dashboard', async ({ page }) => {
      // tab through navigation items
      await page.keyboard.press('Tab');
      const firstFocused = await page.evaluate(function getActiveTag(): string {
        return document.activeElement?.tagName ?? '';
      });

      expect(firstFocused).toBeTruthy();

      // continue tabbing and verify focus moves forward
      const focusedElements: string[] = [];
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        const tag = await page.evaluate(function getActiveTag(): string {
          return document.activeElement?.tagName ?? '';
        });
        focusedElements.push(tag);
      }

      // verify that focus moved through multiple distinct elements
      const uniqueTags = new Set(focusedElements);
      expect(uniqueTags.size).toBeGreaterThan(1);
    });

    test('should navigate sidenav with keyboard', async ({ page }) => {
      const navLinks = page.locator('mat-nav-list a');
      const count = await navLinks.count();

      expect(count).toBeGreaterThan(0);

      await navLinks.first().focus();
      await expect(navLinks.first()).toBeFocused();

      const initialUrl = page.url();

      // arrow/tab through nav links
      for (let i = 1; i < Math.min(count, 5); i++) {
        await page.keyboard.press('Tab');
      }

      // activate a link with Enter
      await page.keyboard.press('Enter');

      // verify navigation occurred by polling until URL changes
      await expect
        .poll(
          function checkUrlChanged() {
            return page.url();
          },
          { timeout: 10000 }
        )
        .not.toBe(initialUrl);
    });
  });

  // ─── Dialog Keyboard Navigation ─────────────────────────────────────────

  test.describe('Dialogs', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await page.goto('/global/universe', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('dms-base-table', {
        state: 'visible',
        timeout: 15000,
      });
    });

    test('should trap focus within dialog', async ({ page }) => {
      const addButton = page.locator('button', { hasText: /add/i });
      expect(
        await addButton.count(),
        'Add button trigger must exist on universe page'
      ).toBeGreaterThan(0);

      await addButton.first().click();

      // wait for dialog
      await page.waitForSelector('mat-dialog-container', {
        state: 'visible',
        timeout: 10000,
      });

      // tab through dialog elements
      const dialogFocusedTags: string[] = [];
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');
        const tag = await page.evaluate(function getActiveTag(): string {
          const el = document.activeElement;
          return el?.closest('mat-dialog-container') ? el.tagName : 'OUTSIDE';
        });
        dialogFocusedTags.push(tag);
      }

      // focus should never leave the dialog
      expect(dialogFocusedTags).not.toContain('OUTSIDE');
    });

    test('should close dialog with Escape key', async ({ page }) => {
      const addButton = page.locator('button', { hasText: /add/i });
      expect(
        await addButton.count(),
        'Add button trigger must exist on universe page'
      ).toBeGreaterThan(0);

      await addButton.first().click();

      await page.waitForSelector('mat-dialog-container', {
        state: 'visible',
        timeout: 10000,
      });

      await page.keyboard.press('Escape');

      await expect(page.locator('mat-dialog-container')).not.toBeVisible();
    });

    test('should return focus to trigger after dialog close', async ({
      page,
    }) => {
      const addButton = page.locator('button', { hasText: /add/i });
      expect(
        await addButton.count(),
        'Add button trigger must exist on universe page'
      ).toBeGreaterThan(0);

      await addButton.first().focus();
      await page.keyboard.press('Enter');

      await page.waitForSelector('mat-dialog-container', {
        state: 'visible',
        timeout: 10000,
      });

      await page.keyboard.press('Escape');

      await expect(page.locator('mat-dialog-container')).not.toBeVisible();

      // focus should return to the trigger button
      await expect(addButton.first()).toBeFocused();
    });
  });

  // ─── Table Keyboard Navigation ──────────────────────────────────────────

  test.describe('Tables', () => {
    test.beforeEach(async ({ page }) => {
      await login(page);
      await page.goto('/global/universe', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('dms-base-table', {
        state: 'visible',
        timeout: 15000,
      });
    });

    test('should navigate table headers with keyboard for sorting', async ({
      page,
    }) => {
      const headers = page.locator('th.mat-mdc-header-cell[mat-sort-header]');
      const headerCount = await headers.count();

      expect(
        headerCount,
        'Sortable table headers must be present'
      ).toBeGreaterThan(0);

      await headers.first().focus();
      await expect(headers.first()).toBeFocused();

      // Enter should trigger sort — verify aria-sort changes
      const sortBefore = await headers.first().getAttribute('aria-sort');

      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      const sortAfter = await headers.first().getAttribute('aria-sort');

      expect(sortAfter, 'Sort state should change after Enter').not.toBe(
        sortBefore
      );
    });

    test('should skip disabled elements during tab navigation', async ({
      page,
    }) => {
      // Tab through elements and verify none that receive focus are disabled
      let focusedDisabledCount = 0;

      for (let i = 0; i < 30; i++) {
        await page.keyboard.press('Tab');
        const isDisabled = await page.evaluate(
          function checkDisabledFocus(): boolean {
            const el = document.activeElement;
            return el instanceof HTMLElement && el.hasAttribute('disabled');
          }
        );
        if (isDisabled) {
          focusedDisabledCount++;
        }
      }

      expect(focusedDisabledCount).toBe(0);
    });
  });
});

test.describe.skip('Accessibility - Screen Reader Support', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ─── ARIA Landmarks ────────────────────────────────────────────────────

  test('should have proper ARIA landmarks', async ({ page }) => {
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();

    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav).toBeVisible();
  });

  // ─── Form Labels ──────────────────────────────────────────────────────

  test('should have labels for all form inputs on profile page', async ({
    page,
  }) => {
    await page.goto('/profile', { waitUntil: 'domcontentloaded' });

    const inputs = page.locator('input:not([type="hidden"])');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const id = await input.getAttribute('id');
      const associatedLabel = id
        ? await page.locator(`label[for="${id}"]`).count()
        : 0;
      const matLabel = await input
        .locator('xpath=ancestor::mat-form-field//mat-label')
        .count();

      const hasLabel =
        ariaLabel !== null ||
        ariaLabelledBy !== null ||
        associatedLabel > 0 ||
        matLabel > 0;

      expect(hasLabel, `Input ${i} is missing a label`).toBeTruthy();
    }
  });

  // ─── Table Accessibility ──────────────────────────────────────────────

  test('should have proper table structure on universe page', async ({
    page,
  }) => {
    await page.goto('/global/universe', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('dms-base-table', {
      state: 'visible',
      timeout: 15000,
    });

    // table should have headers
    const headers = page.locator('th');
    const headerCount = await headers.count();
    expect(headerCount).toBeGreaterThan(0);

    // table should have an accessible name (caption or aria-label)
    const table = page.locator('table').first();
    const ariaLabel = await table.getAttribute('aria-label');
    const caption = await table.locator('caption').count();

    expect(
      ariaLabel !== null || caption > 0,
      'Table is missing accessible name'
    ).toBeTruthy();
  });

  // ─── Error Messages ──────────────────────────────────────────────────

  test('should associate error messages with inputs on login page', async ({
    page,
  }) => {
    await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]', {
      state: 'visible',
      timeout: 30000,
    });

    // trigger validation errors
    await page.locator('button[type="submit"]').click();
    await page.waitForSelector('mat-error', {
      state: 'visible',
      timeout: 10000,
    });

    // verify error messages are associated via aria-describedby
    const emailInput = page.locator('input[type="email"]');
    const describedBy = await emailInput.getAttribute('aria-describedby');

    expect(
      describedBy,
      'Email input missing aria-describedby for error message'
    ).toBeTruthy();
  });

  // ─── Live Regions ─────────────────────────────────────────────────────

  test('should have aria-live regions for dynamic content', async ({
    page,
  }) => {
    const liveRegions = page.locator('[aria-live]');
    const count = await liveRegions.count();

    expect(
      count,
      'No aria-live regions found for notifications'
    ).toBeGreaterThan(0);
  });

  // ─── Skip Navigation Link ────────────────────────────────────────────

  test('should have skip navigation link', async ({ page }) => {
    const skipLink = page.locator(
      'a[href="#main-content"], a[href="#main"], .skip-link, .skip-nav'
    );
    const count = await skipLink.count();

    expect(count, 'No skip navigation link found').toBeGreaterThan(0);
  });
});

test.describe.skip('Accessibility - Visual Requirements', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ─── Color Contrast ──────────────────────────────────────────────────

  test('should pass color contrast checks on dashboard', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .withRules(['color-contrast'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('should pass color contrast checks on universe page', async ({
    page,
  }) => {
    await page.goto('/global/universe', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('dms-base-table', {
      state: 'visible',
      timeout: 15000,
    });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .withRules(['color-contrast'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  // ─── Focus Indicators ────────────────────────────────────────────────

  test('should have visible focus indicators on all interactive elements', async ({
    page,
  }) => {
    await page.goto('/global/universe', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('dms-base-table', {
      state: 'visible',
      timeout: 15000,
    });

    // Drive focus via Tab to trigger :focus-visible
    const focusResults: { tag: string; hasIndicator: boolean }[] = [];

    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const result = await page.evaluate(function checkFocusIndicator(): {
        tag: string;
        hasIndicator: boolean;
      } {
        const el = document.activeElement;
        if (!el) {
          return { tag: 'NONE', hasIndicator: false };
        }
        const computed = window.getComputedStyle(el);
        return {
          tag: el.tagName,
          hasIndicator:
            computed.outlineStyle !== 'none' || computed.boxShadow !== 'none',
        };
      });
      focusResults.push(result);
    }

    for (const result of focusResults) {
      expect(
        result.hasIndicator,
        `Focus indicator missing on ${result.tag}`
      ).toBeTruthy();
    }
  });

  // ─── Zoom Support ────────────────────────────────────────────────────

  test('should reflow correctly at narrow viewport (simulated zoom)', async ({
    page,
  }) => {
    await page.goto('/global/universe', { waitUntil: 'domcontentloaded' });

    // Simulate narrow viewport to test reflow (true browser zoom
    // cannot be automated — see manual test plans for 200% zoom)
    await page.setViewportSize({ width: 640, height: 360 });

    // content should still be visible without extreme horizontal overflow
    const bodyWidth = await page.evaluate(
      function getBodyScrollWidth(): number {
        return document.body.scrollWidth;
      }
    );
    const viewportWidth = await page.evaluate(function getInnerWidth(): number {
      return window.innerWidth;
    });

    // Allow modest overflow but not extreme horizontal scrolling
    expect(bodyWidth).toBeLessThan(viewportWidth * 2);
  });
});

test.describe.skip('Accessibility - Forms', () => {
  // ─── Login Form ──────────────────────────────────────────────────────

  test.describe('Login Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/auth/login', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('input[type="email"]', {
        state: 'visible',
        timeout: 30000,
      });
    });

    test('should have autocomplete attributes on login form', async ({
      page,
    }) => {
      const emailInput = page.locator('input[type="email"]');
      const autocomplete = await emailInput.getAttribute('autocomplete');
      expect(autocomplete).toBe('email');

      const passwordInput = page.locator('input[type="password"]');
      const pwAutocomplete = await passwordInput.getAttribute('autocomplete');
      expect(pwAutocomplete).toBe('current-password');
    });

    test('should mark required fields with aria-required', async ({ page }) => {
      const emailInput = page.locator('input[type="email"]');
      const required =
        (await emailInput.getAttribute('aria-required')) ??
        (await emailInput.getAttribute('required'));

      expect(
        required !== null,
        'Email field not marked as required'
      ).toBeTruthy();
    });

    test('should mark invalid fields with aria-invalid after validation', async ({
      page,
    }) => {
      await page.locator('button[type="submit"]').click();
      await page.waitForSelector('mat-error', {
        state: 'visible',
        timeout: 10000,
      });

      const emailInput = page.locator('input[type="email"]');
      const ariaInvalid = await emailInput.getAttribute('aria-invalid');

      expect(ariaInvalid, 'Email field not marked aria-invalid').toBe('true');
    });
  });
});
