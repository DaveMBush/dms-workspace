# Story AG.3: Accessibility Audit

## Story

**As a** user with accessibility needs
**I want** the application to be fully accessible
**So that** I can use it effectively with assistive technologies

## Context

Angular Material components have built-in accessibility features, but custom components and integrations need verification.

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

### Step 1: Automated Testing

Use axe-core for automated accessibility testing:

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

### Step 3: Fix Common Issues

**Common fixes needed:**

1. **Missing form labels:**

```html
<!-- Bad -->
<input matInput placeholder="Email" />

<!-- Good -->
<mat-form-field>
  <mat-label>Email</mat-label>
  <input matInput />
</mat-form-field>
```

2. **Missing button labels:**

```html
<!-- Bad -->
<button mat-icon-button><mat-icon>delete</mat-icon></button>

<!-- Good -->
<button mat-icon-button aria-label="Delete item">
  <mat-icon>delete</mat-icon>
</button>
```

3. **Table accessibility:**

```html
<table mat-table [dataSource]="data" aria-label="Investment positions">
  ...
</table>
```

4. **Dialog focus management:**
   Material dialogs handle this automatically, but verify:

- Focus moves to dialog on open
- Focus trapped within dialog
- Focus returns to trigger on close

### Step 4: Document Findings

Create accessibility report with:

- Issues found
- Severity
- Remediation steps
- Verification status

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

- [ ] Automated tests pass with no violations
- [ ] Manual keyboard testing complete
- [ ] Screen reader testing complete
- [ ] All critical issues fixed
- [ ] Accessibility report documented
- [ ] WCAG 2.1 AA compliance verified
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material`
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
