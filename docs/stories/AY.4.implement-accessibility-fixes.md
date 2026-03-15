# Story AY.4: Implement - Accessibility Fixes

## Story

**As a** user with accessibility needs
**I want** the application to be fully accessible
**So that** I can use it effectively with assistive technologies

## Context

This story focuses on the **GREEN phase** of TDD - re-enabling the accessibility tests from Story AY.3 and fixing all issues to make them pass.

**Prerequisites**: Story AY.3 must be complete with disabled accessibility tests.

## Acceptance Criteria

### Functional Requirements

- [ ] All tests from AY.3 re-enabled
- [ ] All accessibility violations fixed
- [ ] Keyboard navigation works throughout
- [ ] Screen reader announces content correctly
- [ ] Focus management is correct
- [ ] Color contrast meets WCAG 2.1 AA

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

### Step 1: Re-enable Tests from AY.3

Remove `.skip` from all accessibility tests:

```typescript
// Before (from AY.3)
test.skip('should have no accessibility violations on login page', async ({ page }) => {
  // ...
});

// After (AY.4)
test('should have no accessibility violations on login page', async ({ page }) => {
  // ...
});
```

### Step 2: Run Tests to Identify Violations

```bash
pnpm nx run dms-material-e2e:e2e
```

Review axe-core violation reports to identify specific issues.

### Step 3: Fix Common Issues

**1. Missing Form Labels:**

```html
<!-- Bad -->
<input matInput placeholder="Email" />

<!-- Good -->
<mat-form-field>
  <mat-label>Email</mat-label>
  <input matInput />
</mat-form-field>
```

**2. Missing Button Labels:**

```html
<!-- Bad -->
<button mat-icon-button><mat-icon>delete</mat-icon></button>

<!-- Good -->
<button mat-icon-button aria-label="Delete item">
  <mat-icon>delete</mat-icon>
</button>
```

**3. Table Accessibility:**

```html
<table mat-table [dataSource]="data" aria-label="Investment positions">
  <caption class="sr-only">Investment Positions</caption>
  ...
</table>
```

**4. Heading Hierarchy:**

Ensure headings follow proper hierarchy (h1 → h2 → h3, no skipping).

**5. Link Purpose:**

```html
<!-- Bad -->
<a href="/details">Click here</a>

<!-- Good -->
<a href="/details">View position details</a>
```

**6. Focus Visible:**

Ensure all interactive elements have visible focus indicators. Material components provide this by default, but verify custom components.

### Step 4: Execute Manual Testing

Follow the manual test plans created in AY.3:

**Keyboard Navigation:**

- [ ] Tab through all pages
- [ ] Test all interactive elements
- [ ] Verify dialog focus management
- [ ] Test dropdown navigation

**Screen Reader Testing:**

- [ ] Test with VoiceOver (Mac) or NVDA (Windows)
- [ ] Verify announcements for all major workflows
- [ ] Test form submission with errors

**Visual Testing:**

- [ ] Test at 200% zoom
- [ ] Test in high contrast mode
- [ ] Test with Windows High Contrast Mode

### Step 5: Document Fixes Applied

Create accessibility report:

```markdown
# Accessibility Fixes Report - Story AY.4

## Violations Fixed

### Missing Form Labels (Count: X)

**Files Changed:**

- `apps/dms-material/src/app/auth/login/login.component.html`
- ...

**Fix Applied:** Added `<mat-label>` elements to all form fields.

### Missing ARIA Labels on Icon Buttons (Count: Y)

**Files Changed:**

- `apps/dms-material/src/app/account-panel/...`

**Fix Applied:** Added `aria-label` attributes to all icon-only buttons.

## Compliance Status

- ✅ WCAG 2.1 AA Level 1.1.1 - Non-text Content
- ✅ WCAG 2.1 AA Level 1.3.1 - Info and Relationships
  ...

## Manual Testing Results

- ✅ Keyboard navigation complete
- ✅ Screen reader testing complete
- ✅ Visual testing (zoom, contrast) complete
```

## Definition of Done

- [ ] All tests from AY.3 re-enabled
- [ ] All automated accessibility tests pass
- [ ] Manual keyboard testing complete
- [ ] Screen reader testing complete
- [ ] All critical accessibility issues fixed
- [ ] Accessibility fixes report documented
- [ ] WCAG 2.1 AA compliance verified
- [ ] All validation commands pass
  - Run `pnpm all`
  - Run `pnpm e2e:dms-material:chromium`
  - Run `pnpm e2e:dms-material:firefox`
  - Run `pnpm dupcheck`
  - Run `pnpm format`
  - Repeat all of these if any fail until they all pass

## Related Stories

- **Previous**: Story AY.3 (created the tests)
- **Next**: Story AY.5 (performance TDD)
- **Epic**: Epic AY

---

## Dev Agent Record

### Status

Approved
