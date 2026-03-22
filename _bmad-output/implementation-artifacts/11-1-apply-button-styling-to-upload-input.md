# Story 11.1: Apply Button Styling to Upload Input

Status: Approved

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

- [ ] Upload input has button-like styling with background, padding, rounded corners
- [ ] Hover effect works correctly
- [ ] Styling consistent with other buttons in the app
- [ ] Verified using Playwright MCP server
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Find the Universe screen upload control (AC: 1)
  - [ ] Navigate to Universe screen component: `apps/dms-material/src/app/pages/universe/`
  - [ ] Locate the file upload input element in the template
  - [ ] Identify current styling classes
- [ ] Check git history for previous styling (AC: 2)
  - [ ] Run `git log --all --full-history -- **/universe/**`
  - [ ] Find Epic 8 commits that modified Universe screen styling
  - [ ] Document what button classes or Material directives were removed
- [ ] Examine other buttons for consistent styling (AC: 3)
  - [ ] Find other action buttons on Universe or similar screens
  - [ ] Note the Tailwind classes they use
  - [ ] Identify color tokens from `tailwind.config.js`
- [ ] Apply button styling to upload input (AC: 1, 3)
  - [ ] Wrap `<input type="file">` in a styled label or button
  - [ ] Apply Tailwind classes: `bg-primary text-white px-4 py-2 rounded cursor-pointer`
  - [ ] Add hover classes: `hover:bg-primary-dark transition-colors`
  - [ ] Hide the native file input: `hidden` or `sr-only`
  - [ ] Ensure file selection still works after styling
- [ ] Test locally (AC: 1)
  - [ ] Navigate to Universe screen
  - [ ] Verify upload control looks like a button
  - [ ] Test hover state
  - [ ] Test file selection functionality
- [ ] Use Playwright MCP server for verification (AC: 4)
  - [ ] Navigate to Universe screen
  - [ ] Take screenshot of upload button
  - [ ] Test hover state with `mcp_microsoft_pla_browser_hover`
  - [ ] Verify button appearance and functionality

## Dev Notes

### Context from Epic 8
- Tailwind CSS migration removed button styling from file upload input
- File input now appears as plain text label with no visual affordance

### Common Pattern for Styled File Inputs
```html
<!-- Hidden native input -->
<input #fileInput type="file" class="hidden" (change)="onFileSelect($event)" />

<!-- Visible styled label acting as button -->
<label
  for="fileInput"
  class="inline-flex items-center px-4 py-2 bg-primary text-white rounded cursor-pointer hover:bg-primary-dark transition-colors"
>
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

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_
