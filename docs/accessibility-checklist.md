# RMS Workspace - Accessibility Checklist for PrimeNG/Tailwind

This document provides comprehensive accessibility guidelines and standards for the RMS Workspace project, focusing on PrimeNG components and Tailwind CSS implementation.

## Table of Contents

1. [Keyboard Focus Behavior Standards](#keyboard-focus-behavior-standards)
2. [Color Contrast Requirements](#color-contrast-requirements)  
3. [Screen Reader Compatibility](#screen-reader-compatibility)
4. [Component-Specific Guidelines](#component-specific-guidelines)
5. [Testing Procedures](#testing-procedures)
6. [Implementation Best Practices](#implementation-best-practices)

## Keyboard Focus Behavior Standards

### Focus Management Principles

**Visual Focus Indicators:**
- All interactive elements MUST have visible focus indicators
- Focus outline MUST have minimum 3:1 contrast ratio against adjacent colors
- Focus indicators should be 2px minimum thickness
- Use consistent focus styling across all components

**Tab Order:**
- Logical tab sequence following visual layout (left-to-right, top-to-bottom)
- Skip links provided for complex navigation structures
- Focus traps implemented for modal dialogs and overlays
- No keyboard traps (users must always be able to navigate away)

**Standard Keyboard Interactions:**
- **Tab**: Move to next focusable element
- **Shift + Tab**: Move to previous focusable element  
- **Enter**: Activate buttons, links, and form submissions
- **Space**: Activate buttons, checkboxes, toggle controls
- **Arrow Keys**: Navigate within component groups (radio buttons, menu items, tabs)
- **Escape**: Close modals, dropdowns, and overlays
- **Home**: Move to first item in a list/group
- **End**: Move to last item in a list/group

### Component-Specific Focus Standards

**Form Controls:**
- Labels MUST be properly associated with inputs
- Focus moves logically through form fields
- Error states announced to screen readers
- Required fields clearly indicated

**Navigation Menus:**
- Arrow key navigation within menu groups
- Enter/Space to activate menu items
- Escape to close submenu or entire menu
- Tab moves out of menu system

**Data Tables:**
- Tab moves between interactive table elements
- Arrow keys navigate table cells when appropriate
- Column/row headers properly associated with data cells

## Color Contrast Requirements

### WCAG 2.1 Level AA Standards (Minimum)

**Text Content:**
- Normal text: minimum contrast ratio of **4.5:1**
- Large text (18pt/24px+ or 14pt/18.66px+ bold): minimum contrast ratio of **3:1**

**Non-Text Elements:**
- UI components and graphics: minimum contrast ratio of **3:1**
- Focus indicators: minimum contrast ratio of **3:1**

**Enhanced Standards (Recommended - WCAG AAA):**
- Normal text: minimum contrast ratio of **7:1**
- Large text: minimum contrast ratio of **4.5:1**

### Dark Mode Considerations

**Theme-Specific Standards:**
- Maintain contrast ratios in both light and dark themes
- Test contrast values using PrimeNG's dark theme (`.p-dark` class)
- Verify custom Tailwind colors meet requirements in both themes

**Implementation:**
```css
/* Example: Ensuring proper contrast in both themes */
.text-primary {
  /* Light theme: ensure 4.5:1 contrast */
  color: var(--p-primary-color);
}

html.p-dark .text-primary {
  /* Dark theme: maintain 4.5:1 contrast */
  color: var(--p-primary-color);
}
```

## Screen Reader Compatibility

### ARIA Labels and Roles

**Required ARIA Attributes:**
- `aria-label`: Provide accessible names for components without visible labels
- `aria-labelledby`: Reference visible labels by ID
- `aria-describedby`: Reference additional descriptive text
- `role`: Define semantic meaning when not implicit

**Live Regions:**
- `aria-live="polite"`: Announce changes when user is idle
- `aria-live="assertive"`: Announce changes immediately
- Use for status messages, error announcements, loading states

**Form Validation:**
- Error messages associated with `aria-describedby`
- Invalid fields marked with `aria-invalid="true"`
- Required fields indicated with `aria-required="true"`

### Semantic HTML Structure

**Use Semantic Elements:**
- `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>` for layout
- `<h1>` through `<h6>` for heading hierarchy
- `<button>` for interactive actions
- `<a>` for navigation links
- Form elements (`<label>`, `<input>`, `<select>`, `<textarea>`)

## Component-Specific Guidelines

### Progress Spinners

**Accessibility Requirements:**
- MUST include `aria-label` describing the loading state
- MUST have `role="status"` for screen reader announcement
- MUST include `aria-live="polite"` for dynamic announcements
- Loading text should be provided for screen readers

**Implementation Example:**
```html
<p-progressSpinner 
  styleClass="w-12 h-12"
  strokeWidth="4"
  aria-label="Loading data, please wait"
  role="status"
  aria-live="polite">
</p-progressSpinner>
<span class="sr-only">Loading data, please wait</span>
```

### Message Components

**Accessibility Requirements:**
- Messages MUST have `role="alert"` for immediate announcements
- Error messages MUST use `aria-live="assertive"`
- Success/info messages should use `aria-live="polite"`
- Provide close button with proper `aria-label`

**Implementation Example:**
```html
<p-message 
  severity="error" 
  role="alert" 
  aria-live="assertive"
  [text]="errorMessage">
</p-message>

<p-message 
  severity="success" 
  role="status" 
  aria-live="polite"
  [text]="successMessage">
</p-message>
```

### Form Components

**Input Fields:**
```html
<!-- Preferred: Explicit label association -->
<label for="username">Username</label>
<input pInputText id="username" />

<!-- Alternative: ARIA labeling -->
<span id="email-label">Email Address</span>
<input pInputText aria-labelledby="email-label" />

<!-- Direct ARIA label -->
<input pInputText aria-label="Search query" />
```

**Select Components:**
```html
<label for="country">Country</label>
<p-select inputId="country" ariaLabelledBy="country" />
```

**Checkboxes and Radio Buttons:**
```html
<label for="remember">Remember me</label>
<p-checkbox inputId="remember" />
```

### Navigation Components

**Toolbars:**
```html
<p-toolbar aria-label="Main actions toolbar">
  <!-- toolbar content -->
</p-toolbar>
```

**Buttons:**
```html
<!-- Icon-only buttons need explicit labels -->
<p-button 
  icon="pi pi-refresh" 
  aria-label="Refresh data" 
  pTooltip="Refresh" 
  tooltipPosition="bottom" />
```

### Modal Dialogs

**Required Attributes:**
- `role="dialog"` or `role="alertdialog"`
- `aria-labelledby` pointing to dialog title
- `aria-describedby` pointing to dialog description
- `aria-modal="true"` for modal behavior

**Implementation Example:**
```html
<p-dialog 
  header="Settings" 
  [(visible)]="visible" 
  [modal]="true"
  role="dialog"
  aria-labelledby="dialog-header"
  aria-describedby="dialog-description"
  aria-modal="true">
  
  <div id="dialog-description" class="sr-only">
    Configure application settings and preferences
  </div>
  <!-- dialog content -->
</p-dialog>
```

## Testing Procedures

### Automated Testing Tools

**Required Tools:**
- **axe-core**: Run accessibility audits in tests
- **Pa11y**: Command-line accessibility testing
- **Lighthouse**: Built-in Chrome accessibility audit

**Integration Example:**
```typescript
// In Jest/Vitest tests
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('component should be accessible', async () => {
  const component = render(MyComponent);
  const results = await axe(component.container);
  expect(results).toHaveNoViolations();
});
```

### Manual Testing Procedures

**Keyboard Testing:**
1. Navigate entire application using only keyboard
2. Verify all interactive elements are reachable
3. Ensure focus is visible and logical
4. Test all keyboard shortcuts and interactions

**Screen Reader Testing:**
1. Test with NVDA (Windows), JAWS (Windows), or VoiceOver (macOS)
2. Verify all content is announced properly
3. Test form submissions and error handling
4. Verify live regions announce changes

**Visual Testing:**
1. Verify color contrast using WebAIM Contrast Checker
2. Test with browser zoom up to 200%
3. Verify focus indicators are visible
4. Test in both light and dark themes

## Implementation Best Practices

### Development Workflow

**Before Development:**
- Review existing accessibility patterns in codebase
- Plan keyboard navigation flow
- Identify required ARIA attributes

**During Development:**
- Use semantic HTML elements first
- Add ARIA attributes when semantic HTML is insufficient
- Test with keyboard navigation during development
- Include accessibility attributes in component templates

**Code Review Checklist:**
- [ ] Semantic HTML elements used appropriately
- [ ] All interactive elements have accessible names
- [ ] Focus management implemented correctly
- [ ] Color contrast requirements met
- [ ] ARIA attributes used properly
- [ ] Keyboard navigation works as expected

### Common Mistakes to Avoid

**Don't Do:**
- Use `div` or `span` with click handlers instead of `button`
- Rely solely on color to convey information
- Create keyboard traps in modals
- Use placeholder text as the only label
- Implement custom focus management without testing

**Do:**
- Use native HTML elements when possible
- Provide multiple ways to convey information (color + text + icons)
- Implement proper focus traps with escape routes
- Associate labels with form controls
- Test focus management with actual keyboard navigation

### Utilities and Helper Classes

**Screen Reader Only Text:**
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

**Skip Links:**
```html
<a href="#main-content" class="skip-link">Skip to main content</a>
```

## Resources and References

### Documentation Links
- [PrimeNG Accessibility Guide](https://primeng.org/guides/accessibility)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Testing Tools
- [axe DevTools Browser Extension](https://www.deque.com/axe/browser-extensions/)
- [WAVE Web Accessibility Evaluation Tool](https://wave.webaim.org/)
- [Lighthouse Accessibility Audit](https://developers.google.com/web/tools/lighthouse/)

### Compliance Standards
- **Target**: WCAG 2.1 Level AA compliance
- **Enhanced**: WCAG 2.1 Level AAA where feasible
- **Testing**: Both automated and manual testing required
- **Browser Support**: Modern browsers with keyboard and screen reader compatibility