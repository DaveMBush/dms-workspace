# Accessibility Manual Test Plans

These manual test plans supplement the automated axe-core accessibility tests.
To be executed as part of Story AY.4 when accessibility fixes are implemented.

## 1. Keyboard Navigation Checklist

### Login Page

- [ ] Tab moves focus to email input
- [ ] Tab moves focus to password input
- [ ] Tab moves focus to "Remember Me" checkbox
- [ ] Tab moves focus to "Sign In" button
- [ ] Shift+Tab moves focus backwards through all elements
- [ ] Enter on "Sign In" button submits the form
- [ ] Space toggles "Remember Me" checkbox
- [ ] Enter on password visibility toggle changes input type
- [ ] Focus is visible on every focused element

### Dashboard / Main Navigation

- [ ] Tab navigates through sidebar navigation links
- [ ] Enter activates the focused navigation link
- [ ] Tab navigates through toolbar/header actions
- [ ] Focus order matches visual layout (left-to-right, top-to-bottom)

### Data Tables (Universe, Screener, Positions)

- [ ] Tab navigates to table column headers
- [ ] Enter on a sortable header triggers sort
- [ ] Tab navigates to editable cells
- [ ] Enter activates editable cell editing
- [ ] Escape cancels cell editing
- [ ] Tab moves to next editable cell after confirming

### Dialogs (Add Symbol, Import, Confirm)

- [ ] Focus moves to dialog on open
- [ ] Tab cycles only within dialog (focus trap)
- [ ] Shift+Tab cycles backwards within dialog
- [ ] Escape closes the dialog
- [ ] Focus returns to the trigger element after dialog close
- [ ] Dialog title is announced on open

### Dropdown Menus

- [ ] Arrow keys navigate menu items
- [ ] Enter activates selected menu item
- [ ] Escape closes the menu
- [ ] Focus returns to trigger after menu close

## 2. Screen Reader Testing Checklist

Test with VoiceOver (macOS) or NVDA (Windows).

### Page Structure

- [ ] Page title is announced on navigation
- [ ] Landmarks are announced (main, navigation, banner)
- [ ] Heading structure is logical (h1 > h2 > h3)
- [ ] Skip navigation link is available and works

### Forms

- [ ] Input labels are announced when focused
- [ ] Required fields are announced as required
- [ ] Error messages are announced when validation fails
- [ ] Autocomplete suggestions are announced
- [ ] Form group labels (fieldset/legend) are announced

### Tables

- [ ] Table caption or name is announced
- [ ] Column headers are announced with cell content
- [ ] Row count and column count are announced
- [ ] Sort state is announced (ascending/descending)
- [ ] Editable cells announce their editable state

### Dynamic Content

- [ ] Loading states are announced ("Loading...")
- [ ] Toast/snackbar notifications are announced
- [ ] Content updates after filtering are announced
- [ ] Account panel changes are announced
- [ ] Error states are announced

### Dialogs

- [ ] Dialog title is announced on open
- [ ] Dialog role is announced
- [ ] Close button is labeled and announced

## 3. Visual Testing Checklist

### Color Contrast

- [ ] Body text meets 4.5:1 contrast ratio
- [ ] Large text (18px+ or 14px+ bold) meets 3:1 contrast ratio
- [ ] Link text is distinguishable from body text
- [ ] Form input borders meet 3:1 contrast ratio
- [ ] Focus indicators meet 3:1 contrast ratio
- [ ] Error messages meet 4.5:1 contrast ratio
- [ ] Placeholder text meets 4.5:1 contrast ratio

### Zoom and Reflow

- [ ] Page is usable at 200% browser zoom
- [ ] Page reflows to single column at 400% zoom
- [ ] No horizontal scrolling at 320px viewport width
- [ ] Text enlargement does not break layout
- [ ] Images scale appropriately

### Motion and Animation

- [ ] `prefers-reduced-motion` is respected
- [ ] No auto-playing animations that can't be paused
- [ ] Loading spinners don't cause seizure risk

### Color Independence

- [ ] Error states use more than just color (icons, text, borders)
- [ ] Required fields indicated beyond color
- [ ] Chart data distinguishable without color
- [ ] Status indicators use icons alongside colors

### Dark/Light Theme

- [ ] Both themes maintain minimum contrast ratios
- [ ] Focus indicators visible in both themes
- [ ] Form elements visible in both themes
- [ ] Error states visible in both themes

## 4. WCAG 2.1 AA Quick Audit Reference

| Criterion | Description            | Test Method                         |
| --------- | ---------------------- | ----------------------------------- |
| 1.1.1     | Non-text Content       | Verify all images have alt text     |
| 1.3.1     | Info and Relationships | Verify semantic HTML, ARIA roles    |
| 1.3.2     | Meaningful Sequence    | Verify reading order matches visual |
| 1.4.1     | Use of Color           | Verify color is not sole indicator  |
| 1.4.3     | Contrast (Minimum)     | Use axe-core color-contrast rule    |
| 2.1.1     | Keyboard               | Tab through all functionality       |
| 2.1.2     | No Keyboard Trap       | Verify Escape/Tab always works      |
| 2.4.1     | Bypass Blocks          | Verify skip navigation link         |
| 2.4.2     | Page Titled            | Verify page titles on navigation    |
| 2.4.3     | Focus Order            | Tab order matches visual layout     |
| 2.4.7     | Focus Visible          | Focus indicator visible on all      |
| 3.3.1     | Error Identification   | Errors described in text            |
| 3.3.2     | Labels or Instructions | All inputs have labels              |
| 4.1.1     | Parsing                | Valid HTML (no duplicate IDs)       |
| 4.1.2     | Name, Role, Value      | ARIA attributes correct             |
