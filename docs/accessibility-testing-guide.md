# RMS Workspace - Accessibility Testing Guide

This guide provides comprehensive testing procedures to ensure the RMS Workspace meets accessibility standards and provides an inclusive user experience.

## Table of Contents

1. [Testing Setup](#testing-setup)
2. [Automated Testing](#automated-testing)
3. [Manual Testing Procedures](#manual-testing-procedures)
4. [Screen Reader Testing](#screen-reader-testing)
5. [Keyboard Navigation Testing](#keyboard-navigation-testing)
6. [Color Contrast Testing](#color-contrast-testing)
7. [Testing Checklist](#testing-checklist)
8. [Reporting Issues](#reporting-issues)

## Testing Setup

### Required Tools

**Automated Testing Tools:**
- **axe DevTools**: Browser extension for accessibility auditing
- **Lighthouse**: Built-in Chrome DevTools accessibility audit
- **Pa11y**: Command-line accessibility testing tool
- **axe-core**: JavaScript library for automated testing

**Screen Readers:**
- **NVDA** (Windows) - Free and widely used
- **JAWS** (Windows) - Industry standard (requires license)
- **VoiceOver** (macOS) - Built-in macOS screen reader
- **Orca** (Linux) - Free Linux screen reader

**Color Contrast Tools:**
- **WebAIM Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **Colour Contrast Analyser**: Desktop application
- **axe DevTools**: Includes contrast checking

### Browser Extensions Installation

```bash
# Install browser extensions:
# Chrome/Edge: axe DevTools, WAVE, Lighthouse
# Firefox: axe DevTools, WAVE
```

### Development Environment Setup

```bash
# Install testing dependencies
pnpm add -D @axe-core/playwright jest-axe @testing-library/jest-dom

# Install Pa11y for command-line testing
npm install -g pa11y
```

## Automated Testing

### Integration with Jest/Vitest

**Setup accessibility testing in test files:**

```typescript
// accessibility.test.ts
import { axe, toHaveNoViolations } from 'jest-axe';
import { render } from '@testing-library/angular';
import { Component } from './component';

expect.extend(toHaveNoViolations);

describe('Component Accessibility', () => {
  test('should not have accessibility violations', async () => {
    const { container } = await render(Component, {
      imports: [/* required imports */],
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('should have proper ARIA labels', async () => {
    const { getByRole } = await render(Component);
    
    expect(getByRole('button')).toHaveAttribute('aria-label');
    expect(getByRole('dialog')).toHaveAttribute('aria-labelledby');
  });
});
```

### Command Line Testing with Pa11y

```bash
# Test specific pages
pa11y http://localhost:4200
pa11y http://localhost:4200/global/some-id

# Test with different standards
pa11y --standard WCAG2AA http://localhost:4200
pa11y --standard WCAG2AAA http://localhost:4200

# Generate reports
pa11y --reporter json http://localhost:4200 > accessibility-report.json
pa11y --reporter html http://localhost:4200 > accessibility-report.html
```

### Lighthouse Accessibility Audit

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run accessibility audit
lighthouse http://localhost:4200 --only-categories=accessibility --output=html --output-path=./accessibility-audit.html

# CI/CD integration
lighthouse http://localhost:4200 --only-categories=accessibility --output=json --quiet --chrome-flags="--headless"
```

## Manual Testing Procedures

### Component Testing Workflow

**Before Component Development:**
1. Review accessibility requirements for component type
2. Identify required ARIA attributes and roles
3. Plan keyboard navigation flow
4. Consider screen reader announcements

**During Component Development:**
1. Test with keyboard navigation
2. Verify focus management
3. Check ARIA labels and roles
4. Test with browser zoom (up to 200%)

**After Component Development:**
1. Run automated accessibility tests
2. Test with screen reader
3. Verify color contrast compliance
4. Complete manual testing checklist

### Page-Level Testing

**Complete Page Audit Process:**
1. Load page in browser
2. Run axe DevTools scan
3. Fix critical and serious violations
4. Test keyboard navigation through entire page
5. Test with screen reader
6. Verify responsive behavior with zoom
7. Test in both light and dark themes

## Screen Reader Testing

### Testing Procedures by Screen Reader

**NVDA (Windows):**
1. Start NVDA (Ctrl + Alt + N)
2. Navigate to application
3. Use browse mode (default) to read page structure
4. Switch to focus mode (NVDA + Space) for form interaction
5. Test common navigation commands:
   - H: Navigate by headings
   - F: Navigate by form fields
   - B: Navigate by buttons
   - L: Navigate by links
   - T: Navigate by tables

**VoiceOver (macOS):**
1. Enable VoiceOver (Cmd + F5)
2. Navigate using VoiceOver cursor
3. Test web rotor navigation (Ctrl + Option + U)
4. Use quick navigation (arrows) vs. VoiceOver navigation (Ctrl + Option + arrows)

**Testing Scenarios:**
1. **Page Structure**: Verify headings, landmarks, and navigation
2. **Forms**: Test field labels, error messages, required fields
3. **Interactive Elements**: Buttons, links, dropdowns, modals
4. **Dynamic Content**: Live regions, loading states, updates
5. **Tables**: Header associations, captions, navigation

### Screen Reader Testing Checklist

**Content Structure:**
- [ ] Page has proper heading hierarchy (H1 → H2 → H3)
- [ ] Landmarks are properly identified (header, nav, main, aside, footer)
- [ ] Lists are properly marked up (ul, ol, dl)
- [ ] Links have descriptive text or aria-label

**Forms:**
- [ ] All form fields have associated labels
- [ ] Required fields are indicated
- [ ] Error messages are announced
- [ ] Fieldsets and legends used for grouped fields

**Interactive Elements:**
- [ ] Buttons have accessible names
- [ ] Custom components have proper roles
- [ ] State changes are announced (expanded/collapsed, selected)
- [ ] Modal dialogs manage focus properly

**Dynamic Content:**
- [ ] Live regions announce changes appropriately
- [ ] Loading states are communicated
- [ ] Error messages use assertive live regions
- [ ] Status updates use polite live regions

## Keyboard Navigation Testing

### Standard Keyboard Testing

**Basic Navigation:**
- **Tab**: Move to next focusable element
- **Shift + Tab**: Move to previous focusable element
- **Enter**: Activate buttons and links
- **Space**: Activate buttons, checkboxes, toggle controls
- **Arrow Keys**: Navigate within component groups
- **Escape**: Close modals, dropdowns, cancel actions

**Component-Specific Testing:**

**Modals/Dialogs:**
- [ ] Tab focus trapped within modal
- [ ] Escape closes modal
- [ ] Focus returns to trigger element when closed
- [ ] First focusable element receives focus when opened

**Dropdown/Select Components:**
- [ ] Arrow keys navigate options
- [ ] Enter/Space selects option
- [ ] Escape closes dropdown
- [ ] Typing searches/filters options

**Tables:**
- [ ] Tab moves between interactive table elements
- [ ] Arrow keys navigate table cells (if implemented)
- [ ] Sort controls are keyboard accessible

**Forms:**
- [ ] Tab order follows logical sequence
- [ ] All form controls reachable via keyboard
- [ ] Form validation doesn't break keyboard navigation
- [ ] Submit/cancel actions keyboard accessible

### Focus Management Testing

**Focus Indicators:**
- [ ] All focused elements have visible focus indicators
- [ ] Focus indicators have sufficient contrast (3:1 minimum)
- [ ] Focus indicators are not removed by CSS
- [ ] Custom focus styles are consistent

**Focus Traps:**
- [ ] Modal dialogs trap focus appropriately
- [ ] Users can always escape focus traps
- [ ] Focus returns to logical location after trap closes

**Skip Navigation:**
- [ ] Skip links provided for main content
- [ ] Skip links are keyboard accessible
- [ ] Skip links work correctly in screen readers

## Color Contrast Testing

### Automated Contrast Testing

**Using axe DevTools:**
1. Open axe DevTools panel
2. Run full scan
3. Review "Color Contrast" issues
4. Fix violations and retest

**Using WebAIM Contrast Checker:**
1. Navigate to https://webaim.org/resources/contrastchecker/
2. Enter foreground and background colors
3. Verify compliance with WCAG AA (4.5:1 normal text, 3:1 large text)
4. Test both light and dark themes

### Manual Contrast Testing

**Theme Testing:**
1. Test all text colors in light theme
2. Switch to dark theme (click theme toggle)
3. Verify all text remains readable in dark theme
4. Test focus indicators in both themes
5. Test UI component states (hover, active, disabled)

**Component State Testing:**
- [ ] Normal text has 4.5:1 contrast minimum
- [ ] Large text has 3:1 contrast minimum  
- [ ] Focus indicators have 3:1 contrast minimum
- [ ] UI components have 3:1 contrast minimum
- [ ] Error states maintain proper contrast
- [ ] Disabled states are still readable

## Testing Checklist

### Pre-Development Checklist
- [ ] Accessibility requirements documented
- [ ] Component accessibility patterns identified
- [ ] Keyboard navigation flow planned
- [ ] Screen reader announcements planned

### Development Checklist
- [ ] Semantic HTML elements used where appropriate
- [ ] ARIA labels and roles implemented correctly
- [ ] Keyboard event handlers added
- [ ] Focus management implemented
- [ ] Color contrast verified
- [ ] Automated tests written and passing

### Pre-Release Checklist
- [ ] All automated accessibility tests passing
- [ ] Manual keyboard testing completed
- [ ] Screen reader testing completed
- [ ] Color contrast verified in both themes
- [ ] Responsive behavior tested with zoom
- [ ] Cross-browser compatibility verified

### Component-Specific Checklists

**Form Components:**
- [ ] Labels properly associated with inputs
- [ ] Required fields indicated
- [ ] Error states accessible
- [ ] Keyboard navigation works correctly

**Navigation Components:**
- [ ] Proper ARIA roles (menubar, menu, menuitem)
- [ ] Keyboard navigation implemented
- [ ] Current page indicated
- [ ] Skip navigation provided

**Data Display Components:**
- [ ] Tables have proper headers
- [ ] Complex data has accessible descriptions
- [ ] Sort states announced
- [ ] Filter states accessible

**Modal/Dialog Components:**
- [ ] Focus management implemented
- [ ] ARIA roles and attributes correct
- [ ] Escape key functionality
- [ ] Backdrop click handling accessible

## Reporting Issues

### Issue Documentation Template

```markdown
## Accessibility Issue Report

**Component:** [Component name]
**Issue Type:** [Keyboard/Screen Reader/Color Contrast/Focus Management]
**Severity:** [Critical/High/Medium/Low]
**WCAG Criteria:** [e.g., 1.4.3 Contrast (Minimum)]

**Description:**
[Clear description of the accessibility issue]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Testing Environment:**
- Browser: [Browser and version]
- Screen Reader: [If applicable]
- Operating System: [OS and version]

**Screenshots/Evidence:**
[Include screenshots or axe DevTools reports]

**Suggested Fix:**
[Recommended solution if known]
```

### Priority Guidelines

**Critical Issues:**
- Keyboard traps that prevent navigation
- Missing form labels
- Contrast ratios below 3:1
- Focus management breaking functionality

**High Priority:**
- Missing ARIA labels on interactive elements
- Improper heading hierarchy
- Contrast ratios below 4.5:1 for normal text
- Screen reader announcements missing

**Medium Priority:**
- Suboptimal focus indicators
- Missing skip navigation
- Inconsistent keyboard shortcuts

**Low Priority:**
- Enhanced ARIA descriptions
- Non-essential animations not respecting prefers-reduced-motion

### Testing Schedule

**During Development:**
- Run automated tests on every commit
- Manual keyboard testing for new components
- Screen reader spot testing for complex components

**Before Feature Release:**
- Complete accessibility audit of new features
- Cross-browser accessibility testing
- User acceptance testing with assistive technologies

**Regular Maintenance:**
- Monthly full-site accessibility audit
- Quarterly screen reader testing
- Annual accessibility compliance review

## Resources

### Testing Tools
- [axe DevTools](https://www.deque.com/axe/browser-extensions/)
- [WAVE Web Accessibility Evaluation Tool](https://wave.webaim.org/)
- [Pa11y Command Line Tool](https://pa11y.org/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Documentation
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [PrimeNG Accessibility Guide](https://primeng.org/guides/accessibility)
- [MDN Accessibility Documentation](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)

### Screen Reader Resources
- [NVDA Download](https://www.nvaccess.org/download/)
- [NVDA User Guide](https://www.nvaccess.org/files/nvda/documentation/userGuide.html)
- [VoiceOver User Guide](https://support.apple.com/guide/voiceover/welcome/mac)
- [JAWS Screen Reader](https://www.freedomscientific.com/products/software/jaws/)