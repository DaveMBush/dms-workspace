# Story 11.1: Apply Button Styling to Upload Input

Status: review

## Story

As a user,
I want the "Upload" control to look like a button,
So that I know I can click it to select a file to upload.

## Acceptance Criteria

1. **Given** I am on the Universe screen
   **When** I view the "Upload" control
   **Then** it has a visible background color consistent with other buttons
   **And** it has padding to make it appropriately sized
   **And** it has border radius for rounded corners
   **And** it has a hover effect when I move my mouse over it

2. **Given** I review the git history from Epic 8
   **When** I check what styles were applied before Tailwind migration
   **Then** I can identify the previous button classes or Material directives
   **And** I implement equivalent styling using Tailwind utilities or Angular Material

3. **Given** the styling uses Tailwind utilities
   **When** I apply classes like `bg-primary`, `px-4`, `py-2`, `rounded`, `hover:bg-primary-dark`
   **Then** the upload input looks consistent with other action buttons in the app
   **And** the styling follows the app's design system color tokens

4. **Given** I use the Playwright MCP server
   **When** I verify the Upload input on the Universe screen
   **Then** it is visually styled as a button
   **And** it shows a hover state when mouse interaction occurs
   **And** it maintains proper spacing and alignment with surrounding elements

## Definition of Done

- [x] Upload input has button-like styling with background, padding, rounded corners
- [x] Hover effect works correctly
- [x] Styling consistent with other buttons in the app
- [x] Verified using Playwright MCP server
- [x] All validation commands pass:
  - [x] Run `pnpm all`
  - [x] Run `pnpm e2e:dms-material:chromium`
  - [x] Run `pnpm e2e:dms-material:firefox`
  - [x] Run `pnpm dupcheck`
  - [x] Run `pnpm format`
  - [x] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [x] Find the Universe screen upload control (AC: 1)
  - [x] Navigate to Universe screen component: `apps/dms-material/src/app/pages/universe/`
  - [x] Locate the file upload input element in the template
  - [x] Identify current styling classes
- [x] Check git history for previous styling (AC: 2)
  - [x] Run `git log --all --full-history -- **/universe/**`
  - [x] Find Epic 8 commits that modified Universe screen styling
  - [x] Document what button classes or Material directives were removed
- [x] Examine other buttons for consistent styling (AC: 3)
  - [x] Find other action buttons on Universe or similar screens
  - [x] Note the Tailwind classes they use
  - [x] Identify color tokens from `tailwind.config.js`
- [x] Apply button styling to upload input (AC: 1, 3)
  - [x] Replace raw `<input type="file">` affordance with Angular Material button trigger
  - [x] Use `mat-raised-button color="primary"` to match existing app button styling
  - [x] Hide the native file input with `hidden`
  - [x] Ensure file selection still works after styling
- [x] Test locally (AC: 1)
  - [x] Navigate to Universe screen
  - [x] Verify upload control looks like a button
  - [x] Test hover state
  - [x] Test file selection functionality
- [x] Use Playwright MCP server for verification (AC: 4)
  - [x] Navigate to Universe screen
  - [x] Take screenshot of upload button
  - [x] Test hover state with `mcp_microsoft_pla_browser_hover`
  - [x] Verify button appearance and functionality

## Dev Notes

### Context from Epic 8

- Tailwind CSS migration removed button styling from file upload input
- File input now appears as plain text label with no visual affordance

### Common Pattern for Styled File Inputs

```html
<!-- Hidden native input -->
<input #fileInput type="file" class="hidden" (change)="onFileSelect($event)" />

<!-- Visible styled label acting as button -->
<label for="fileInput" class="inline-flex items-center px-4 py-2 bg-primary text-white rounded cursor-pointer hover:bg-primary-dark transition-colors">
  <mat-icon class="mr-2">upload</mat-icon>
  Upload CSV
</label>
```

Or using Angular Material button:

```html
<input #fileInput type="file" class="hidden" (change)="onFileSelect($event)" />
<button mat-raised-button color="primary" (click)="fileInput.click()">
  <mat-icon>upload</mat-icon>
  Upload CSV
</button>
```

### Key Files to Modify

- Universe screen component: `apps/dms-material/src/app/pages/universe/universe.component.ts`
- Universe screen template: `apps/dms-material/src/app/pages/universe/universe.component.html`

### Tailwind Color Tokens

Check `tailwind.config.js` for:

- `bg-primary` - primary button background
- `bg-primary-dark` - primary button hover state
- `text-white` or `text-primary-contrast` - button text color

### Testing with Playwright MCP Server

- Use `mcp_microsoft_pla_browser_navigate` to go to Universe screen
- Use `mcp_microsoft_pla_browser_take_screenshot` to capture button styling
- Use `mcp_microsoft_pla_browser_hover` to test hover state
- Use `mcp_microsoft_pla_browser_click` to test file dialog opens

### Project Structure Notes

- Follow Angular 21 patterns: standalone components, `inject()`, signals
- Maintain CEF-focused domain logic for Universe screen
- Ensure accessibility: proper label, keyboard navigation

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-03-21.md#Story 11.1]
- [Source: apps/dms-material/src/app/pages/universe/]
- [Source: tailwind.config.js]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (GitHub Copilot)

### Debug Log References

N/A - no significant debug issues

### Completion Notes List

- Upload control was located in `import-dialog.component.html` (not `pages/universe/` as story indicated - it's a global dialog)
- No prior button styling found in git history - input was always unstyled
- `tailwind.config.js` has no custom color tokens (`bg-primary` does not exist), so Angular Material `mat-raised-button color="primary"` was used instead - consistent with app's existing button pattern
- All E2E tests (9/9 Chromium, 9/9 Firefox) pass with hidden input approach - Playwright's `setInputFiles()` works on hidden inputs
- Playwright MCP visual verification confirmed styled button appears correctly in the Import Fidelity Transactions dialog

### File List

- `apps/dms-material/src/app/global/import-dialog/import-dialog.component.html`
- `apps/dms-material/src/app/global/import-dialog/import-dialog.component.spec.ts`
