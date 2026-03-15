# Story AY.3: TDD - Accessibility Tests

## Story

**As a** developer maintaining the dms-material application
**I want** automated accessibility tests
**So that** I can ensure the application meets WCAG 2.1 AA standards

## Context

This story focuses on creating the **RED phase** of TDD - writing failing accessibility tests using axe-core and defining manual test plans.

**IMPORTANT**: Once tests are written and failing (RED), **disable them** using `.skip` or similar so that CI can pass and this story can be merged. Story AY.4 will re-enable the tests and fix the issues (GREEN).

## Acceptance Criteria

### Functional Requirements

- [ ] Keyboard navigation works throughout
- [ ] Screen reader announces content correctly
- [ ] Focus management is correct
- [ ] Color contrast meets WCAG 2.1 AA
- [ ] All interactive elements are accessible

### Technical Requirements

- [ ] ARIA attributes correctly applied
- [ ] Focus indicators visible
- [ ] Skip links available
- [ ] Error messages associated with inputs

### WCAG 2.1 AA Compliance

- [ ] 1.1.1 Non-text Content
- [ ] 1.3.1 Info and Relationships
- [ ] 1.4.3 Contrast (Minimum)
- [ ] 2.1.1 Keyboard
- [ ] 2.4.3 Focus Order
- [ ] 2.4.7 Focus Visible
- [ ] 3.3.1 Error Identification
- [ ] 4.1.2 Name, Role, Value

## Technical Approach

### Step 1: Install Testing Dependencies

```bash
pnpm add -D @axe-core/playwright
```

### Step 2: Create Automated Accessibility Tests (RED Phase)

Use axe-core for automated accessibility testing in E2E tests:

```typescript
// In Playwright E2E tests
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('should have no accessibility violations on login page', async ({ page }) => {
  await page.goto('/auth/login');

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});

test('should have no accessibility violations on dashboard', async ({ page }) => {
  // Login first
  await page.goto('/auth/login');
  await page.fill('input[formControlName="email"]', 'test@example.com');
  await page.fill('input[formControlName="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

### Step 2: Manual Testing Checklist

**Keyboard Navigation:**

- [ ] Tab through all interactive elements
- [ ] Shift+Tab to go backwards
- [ ] Enter/Space to activate buttons
- [ ] Arrow keys in selects and menus
- [ ] Escape to close dialogs

**Screen Reader Testing:**

- [ ] VoiceOver (Mac)
- [ ] NVDA (Windows)
- [ ] Test form labels announced
- [ ] Test table structure announced
- [ ] Test error messages announced

**Visual Testing:**

- [ ] Zoom to 200% - layout remains usable
- [ ] High contrast mode
- [ ] Color blindness simulation

### Step 3: Document Manual Test Plans

Create manual testing checklists (these will be executed in Story AY.4):

**Keyboard Navigation Checklist:**

- Tab through all interactive elements
- Shift+Tab to go backwards
- Enter/Space to activate buttons
- Arrow keys in selects and menus
- Escape to close dialogs

**Screen Reader Testing Checklist:**

- VoiceOver (Mac) or NVDA (Windows)
- Form labels announced
- Table structure announced
- Error messages announced

**Visual Testing Checklist:**

- Zoom to 200% - layout remains usable
- High contrast mode works
- Color blindness simulation checked

### Step 4: Disable Failing Tests for CI

**CRITICAL**: After writing tests that identify accessibility violations, disable them so CI can pass:

```typescript
test.skip('should have no accessibility violations on login page', async ({ page }) => {
  // Test implementation...
});
```

Or mark the entire test file/suite as skip if needed. Story AY.4 will re-enable and fix.

## Audit Checklist

### Forms

- [ ] All inputs have labels
- [ ] Required fields indicated
- [ ] Error messages associated with inputs
- [ ] Instructions provided where needed

### Navigation

- [ ] Skip to main content link
- [ ] Consistent navigation
- [ ] Breadcrumbs where appropriate
- [ ] Current page indicated

### Tables

- [ ] Table headers properly marked
- [ ] Caption or aria-label present
- [ ] Sort indicators announced

### Dialogs

- [ ] Focus managed correctly
- [ ] Escape closes dialog
- [ ] Title announced

### Colors

- [ ] Text contrast >= 4.5:1
- [ ] Large text contrast >= 3:1
- [ ] Focus indicators visible
- [ ] Information not conveyed by color alone

## Definition of Done

- [ ] axe-core dependency installed
- [ ] Automated accessibility tests written for all major pages
- [ ] Manual test plans documented
- [ ] Tests identify accessibility violations (RED phase)
- [ ] All failing tests disabled with `.skip` or similar
- [ ] CI passes despite disabled tests
- [ ] Test code documented for Story AY.4 re-enablement
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material:chromium`
  - Run `pnpm e2e:dms-material:firefox`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## E2E Test Requirements

When this story is complete, ensure the following e2e tests exist in `apps/dms-material-e2e/`:

### Core Functionality

- [ ] axe-core audit passes on login page
- [ ] axe-core audit passes on dashboard
- [ ] axe-core audit passes on all major routes
- [ ] Keyboard navigation completes login flow
- [ ] Keyboard navigation opens/closes dialogs
- [ ] Tab order is logical on all pages
- [ ] Focus returns to trigger after dialog close

### Edge Cases - Keyboard Navigation

- [ ] Tab navigation skips disabled elements
- [ ] Shift+Tab moves backwards through elements
- [ ] Arrow keys navigate within dropdowns/menus
- [ ] Enter activates focused buttons/links
- [ ] Space toggles checkboxes
- [ ] Escape closes modals/dropdowns
- [ ] Tab trapped within modal dialogs
- [ ] Focus visible on all interactive elements
- [ ] Skip link jumps to main content
- [ ] Keyboard shortcuts don't conflict with screen reader shortcuts

### Edge Cases - Screen Reader

- [ ] Form labels announced correctly
- [ ] Error messages announced when shown
- [ ] Loading states announced
- [ ] Live regions update correctly (aria-live)
- [ ] Table headers associated with cells
- [ ] Row/column count announced for tables
- [ ] Expandable sections announce state (expanded/collapsed)
- [ ] Progress indicators announced
- [ ] Toast notifications announced
- [ ] Dialog title announced on open

### Edge Cases - Visual

- [ ] 200% zoom maintains usable layout
- [ ] 400% zoom (single column) maintains usable layout
- [ ] High contrast mode colors correct
- [ ] Reduced motion preference respected
- [ ] Dark mode maintains contrast ratios
- [ ] Focus indicators visible in all themes
- [ ] Error states not conveyed by color alone
- [ ] Required fields indicated beyond asterisk
- [ ] Charts have text alternatives
- [ ] Images have appropriate alt text

### Edge Cases - Forms

- [ ] Autocomplete attributes correct
- [ ] Password fields have proper autocomplete
- [ ] Error messages associated via aria-describedby
- [ ] Required fields marked with aria-required
- [ ] Invalid fields marked with aria-invalid
- [ ] Form groups have fieldset/legend or role="group"
- [ ] Multi-step forms indicate progress

Run `pnpm nx run dms-material-e2e:e2e` to verify all e2e tests pass.
