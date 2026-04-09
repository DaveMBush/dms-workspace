# Story 59.1: Write Failing E2E Test for Filename Visibility in Dark Mode

Status: Approved

## Story

As a developer,
I want a Playwright e2e test that confirms the selected filename text is not visible (or
insufficiently contrasted) in dark mode,
so that I have a reproducible red test to guide the fix in Story 59.2.

## Acceptance Criteria

1. **Given** the Playwright MCP server is used to open the app in dark mode and trigger the CSV
   import dialog,
   **When** a file is selected and the filename span is displayed,
   **Then** the MCP server captures the rendered state and the developer confirms the filename text
   is not legible (near-black on dark background, or near-white on forced-white background).

2. **Given** the test is committed,
   **When** `pnpm run e2e:dms-material:chromium` runs,
   **Then** the new test fails (confirming the bug).

3. **Given** all other existing tests are unmodified,
   **When** the test suite runs,
   **Then** all previously passing tests continue to pass.

## Definition of Done

- [ ] Playwright MCP server used to reproduce the dark mode filename visibility issue
- [ ] Playwright test file `import-dialog-dark-mode.spec.ts` created in `apps/dms-material-e2e/src/`
- [ ] Test activates dark mode (via `data-theme` attribute or keyboard shortcut), opens the import dialog, selects a file, and asserts the filename text colour meets a minimum contrast ratio — test currently **fails**
- [ ] `pnpm all` passes (new e2e test fails, unit tests unaffected)

## Tasks / Subtasks

- [ ] **Task 1: Reproduce with Playwright MCP server**
  - [ ] Use the Playwright MCP server to navigate to the app
  - [ ] Toggle dark mode (inspect how the dark theme is activated — class on `<html>` or `<body>`, or a toggle button)
  - [ ] Open the Import dialog and select a CSV file
  - [ ] Take a screenshot and inspect the `.selected-file-name` rendered colour
  - [ ] Document the observed values in the Dev Agent Record

- [ ] **Task 2: Investigate the specific CSS issue**
  - [ ] Read `apps/dms-material/src/app/global/import-dialog/import-dialog.component.scss`
  - [ ] Read `apps/dms-material/src/styles.scss` — look for `.mat-mdc-dialog-surface` override
  - [ ] Read `apps/dms-material/src/themes/_dark-theme.scss` (if it exists) to understand the dark theme setup
  - [ ] Document which CSS rules are causing the contrast failure

- [ ] **Task 3: Write the failing Playwright test**
  - [ ] Create `apps/dms-material-e2e/src/import-dialog-dark-mode.spec.ts`
  - [ ] Test: navigate to the app, activate dark mode, open import dialog, select a file, assert filename text colour is visible (assertion written correctly so it passes in light mode but fails in dark mode)
  - [ ] Confirm the test is red

## Dev Notes

### Key Files

| File | Purpose |
| ---- | ------- |
| `apps/dms-material/src/app/global/import-dialog/import-dialog.component.scss` | `.selected-file-name` colour definition |
| `apps/dms-material/src/styles.scss` | Global `.mat-mdc-dialog-surface` override forcing `#ffffff` |
| `apps/dms-material/src/themes/_light-theme.scss` | Light theme custom properties |
| `apps/dms-material/src/app/global/import-dialog/import-dialog.component.html` | Template — filename displayed in `<span class="selected-file-name">` |
| `apps/dms-material-e2e/src/` | Target directory for new test |

### Known CSS root causes

**In `import-dialog.component.scss`:**
```scss
.selected-file-name {
  color: var(--mat-sys-on-surface-variant, rgba(0, 0, 0, 0.6));
  /* ^ fallback rgba(0,0,0,0.6) is near-black — invisible on dark backgrounds */
}
```

**In `styles.scss`:**
```scss
.mat-mdc-dialog-surface {
  background-color: #ffffff !important;
  /* ^ forces white background in ALL themes, including dark mode */
}
```

Both issues must be confirmed with the MCP server before writing tests.

### Dark mode activation

Check how the dark theme is toggled. Typically a `.dark-theme` class is applied to `<html>` or
`<body>`, or a `data-theme="dark"` attribute. Use the Playwright MCP server to inspect the DOM
after clicking a theme toggle button (if one exists on the app).

## Dev Agent Record

_To be filled in by the implementing agent._
