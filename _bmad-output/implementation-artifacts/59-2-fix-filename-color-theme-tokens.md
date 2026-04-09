# Story 59.2: Fix Filename Color to Use Theme Tokens

Status: Approved

## Story

As a trader,
I want the selected filename in the CSV import dialog to be legible in both light and dark mode
without any manual intervention,
so that I can confirm which file I have selected regardless of the active theme.

## Acceptance Criteria

1. **Given** the application is in dark mode and a file is selected in the import dialog,
   **When** the filename is displayed,
   **Then** the text colour is light (white or near-white) and clearly visible against the dark
   dialog background.

2. **Given** the application is in light mode and a file is selected in the import dialog,
   **When** the filename is displayed,
   **Then** the text colour is dark (black or near-black) and clearly visible against the light
   dialog background.

3. **Given** the fix replaces the fallback colour value,
   **When** a developer inspects the SCSS,
   **Then** there are no hardcoded hex or `rgba(0,0,0,…)` values in `.selected-file-name`.

4. **Given** the `.mat-mdc-dialog-surface` override in `styles.scss` forces white background in all
   themes,
   **When** the app is in dark mode,
   **Then** that override is removed or scoped to `.light-theme` only so the dialog background
   darkens correctly.

5. **Given** the fix is applied and the e2e test from Story 59.1 runs,
   **When** `pnpm run e2e:dms-material:chromium` executes,
   **Then** the test passes green.

6. **Given** all changes are applied,
   **When** `pnpm all` runs,
   **Then** all tests pass with no regressions.

## Definition of Done

- [ ] `.selected-file-name` SCSS uses a Material 3 theme token (e.g. `var(--mat-sys-on-surface)`) or `color: inherit` — no hardcoded colour
- [ ] `.mat-mdc-dialog-surface` override in `styles.scss` removed or scoped to `.light-theme` only
- [ ] Playwright MCP server confirms filename is visible in dark mode after fix
- [ ] E2E test from Story 59.1 passes green
- [ ] `pnpm all` passes

## Tasks / Subtasks

- [ ] **Task 1: Read Story 59.1 Dev Agent Record**
  - [ ] Confirm the exact CSS rules identified as root cause
  - [ ] Note which Material 3 tokens are available for `on-surface` text color in dark mode

- [ ] **Task 2: Fix `.selected-file-name` in the component SCSS**
  - [ ] Open `apps/dms-material/src/app/global/import-dialog/import-dialog.component.scss`
  - [ ] Replace `rgba(0, 0, 0, 0.6)` fallback with `var(--mat-sys-on-surface)` (no hardcoded fallback),
        OR replace the whole `color` rule with `color: inherit` to pick up the dialog's text colour
  - [ ] Verify the replacement token correctly adapts in both themes

- [ ] **Task 3: Fix `.mat-mdc-dialog-surface` in `styles.scss`**
  - [ ] Open `apps/dms-material/src/styles.scss`
  - [ ] Scope the `background-color: #ffffff !important` rule so it only applies under `.light-theme`
        (or remove it entirely if Material 3 already handles the dialog background correctly)
  - [ ] Confirm no other dialogs break in light mode after removing the rule

- [ ] **Task 4: Verify with Playwright MCP server**
  - [ ] Use the Playwright MCP server to toggle dark mode, open the import dialog, select a file,
        and confirm the filename is now visible
  - [ ] Take a screenshot and document the fix in the Dev Agent Record

- [ ] **Task 5: Confirm Story 59.1 E2E test passes**
  - [ ] Run the Playwright test from Story 59.1 and confirm it is now green
  - [ ] Run `pnpm all` and confirm all tests pass

## Dev Notes

### Key Files

| File | Purpose |
| ---- | ------- |
| `apps/dms-material/src/app/global/import-dialog/import-dialog.component.scss` | Fix `.selected-file-name` here |
| `apps/dms-material/src/styles.scss` | Fix `.mat-mdc-dialog-surface` override here |
| `apps/dms-material-e2e/src/import-dialog-dark-mode.spec.ts` | E2E test from Story 59.1 (must turn green) |

### Recommended Fix

**`import-dialog.component.scss`:**
```scss
.selected-file-name {
  font-size: 14px;
  color: inherit; /* inherits from dialog text context — adapts to light/dark automatically */
}
```
Or use the Material 3 token directly:
```scss
.selected-file-name {
  font-size: 14px;
  color: var(--mat-sys-on-surface); /* no fallback — if token is missing, default browser color */
}
```

**`styles.scss` (scope to light theme):**
```scss
.light-theme .mat-mdc-dialog-surface {
  background-color: #ffffff !important;
}
```
Or remove the rule entirely and verify Material 3 provides the correct surface colour in both
themes without an override.

## Dev Agent Record

_To be filled in by the implementing agent._
