# Story 17.1: Fix Wait Spinner Centering with Tailwind CSS

Status: Approved

## Story

As a user,
I want the loading spinner to appear centered on my screen when data is loading,
So that I have a clear, unobstructed visual indicator of loading state rather than a spinner hidden in a corner.

## Acceptance Criteria

1. **Given** the spinner component's HTML template
   **When** I review the git history from the commit immediately before Epic 8 started
   **Then** I can identify what CSS rules or classes were centering the spinner before the Tailwind migration

2. **Given** I understand the pre-migration centering approach
   **When** I update the spinner component's template with appropriate Tailwind utilities
   **Then** the spinner wrapper uses either:

   - Fixed positioning: `fixed inset-0 flex items-center justify-center` (or equivalent), or
   - A full-screen overlay approach that places the spinner in the viewport center

3. **Given** I am on the Screener screen
   **When** I click the "Refresh" button and a loading state begins
   **Then** the spinner appears horizontally centered on the screen
   **And** the spinner appears vertically centered on the screen
   **And** the spinner remains centered regardless of page scroll position

4. **Given** I use the Playwright MCP server to verify
   **When** I trigger a loading state on each screen
   **Then** the spinner is centered on the Screener screen
   **And** the spinner is centered on the Universe screen
   **And** the spinner is centered on all Account screens
   **And** the spinner is centered on the Global Summary screen

5. **Given** the fix is applied
   **When** I verify at different viewport sizes via Playwright
   **Then** the spinner remains centered on both desktop and mobile viewports

## Definition of Done

- [ ] Spinner centered horizontally and vertically on all screens
- [ ] Pre-Epic 8 git history consulted for original approach
- [ ] Tailwind utility classes used for centering (no custom CSS)
- [ ] Verified on Screener, Universe, Account, and Global Summary screens using Playwright MCP server
- [ ] Verified at multiple viewport sizes
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Find the spinner component (AC: 1)
  - [ ] Search: `find apps/dms-material/src -name "*spinner*" -o -name "*loading*" -o -name "*wait*"`
  - [ ] Identify the template file responsible for the loading overlay
- [ ] Consult git history from before Epic 8 (AC: 1)
  - [ ] Run: `git log --all --oneline` to find the commit just before Epic 8
  - [ ] Run: `git show <commit>:<path-to-spinner-template>` to see the pre-Tailwind template
  - [ ] Note what CSS classes or styles were used for centering
- [ ] Apply Tailwind centering classes (AC: 2)
  - [ ] Update the spinner wrapper element with: `fixed inset-0 flex items-center justify-center`
  - [ ] If a backdrop/overlay is needed, add: `bg-black/50` (or equivalent semi-transparent overlay)
  - [ ] Ensure `z-index` via Tailwind (`z-50` or higher) so spinner renders above other content
  - [ ] Remove any old CSS that referenced centering
- [ ] Verify centering at each screen (AC: 3, 4)
  - [ ] Trigger loading on Screener screen — verify spinner centered
  - [ ] Trigger loading on Universe screen — verify spinner centered
  - [ ] Trigger loading on Account screen — verify spinner centered
  - [ ] Trigger loading on Global Summary screen — verify spinner centered
- [ ] Use Playwright MCP for visual verification (AC: 4, 5)
  - [ ] Navigate to Screener, trigger refresh, take screenshot
  - [ ] Confirm spinner is visually centered in screenshot
  - [ ] Repeat at 1280×800 (desktop) and 375×812 (mobile) viewports
- [ ] Run validation suite
  - [ ] `pnpm all`
  - [ ] `pnpm e2e:dms-material:chromium`
  - [ ] `pnpm e2e:dms-material:firefox`
  - [ ] `pnpm dupcheck`
  - [ ] `pnpm format`

## Dev Notes

### Context: Why Epic 10 Failed

Epic 10 (`10-1-center-wait-spinner-using-tailwind.md`) marked this as done but the spinner still appears in the upper-left corner. The previous fix likely:

- Applied classes to the wrong element, OR
- Applied classes that were overridden by other CSS, OR
- Did not account for the positioning context of the spinner's parent container

The fix must use `fixed` positioning to escape any parent container stacking contexts.

### Recommended Tailwind Pattern

```html
<!-- Spinner overlay wrapper -->
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
  <!-- Spinner element -->
  <mat-spinner></mat-spinner>
</div>
```

Key details:

- `fixed` — positions relative to the viewport, not the document
- `inset-0` — shorthand for `top-0 right-0 bottom-0 left-0` (full viewport coverage)
- `z-50` — ensures spinner renders above all page content
- `flex items-center justify-center` — centers the spinner both horizontally and vertically
- `bg-black/40` — semi-transparent backdrop (optional but improves UX)

### Common Mistake to Avoid

Do NOT use `absolute` positioning — this relies on a positioned ancestor and will fail if the parent has no explicit height. `fixed` is the correct choice for a screen-covering overlay.

### Screens That Use the Spinner

All four screens share the same spinner component/mechanism. A single fix to the spinner component should resolve all screens simultaneously. Confirm by checking:

- `apps/dms-material/src/app/pages/screener/`
- `apps/dms-material/src/app/pages/universe/`
- `apps/dms-material/src/app/pages/account/`
- `apps/dms-material/src/app/pages/global-summary/`

### Previous Story Reference

See `_bmad-output/implementation-artifacts/10-1-center-wait-spinner-using-tailwind.md` for context on the previous failed attempt. The Definition of Done items were incorrectly marked complete.

### Angular + Zoneless Requirements

- Use `ChangeDetectionStrategy.OnPush` (already required by ESLint)
- The spinner visibility is likely controlled by a signal — use `@if` or `@switch` in the template
- No Zone.js — do not add it

### CSS Policy

Per project rules (project-context.md): Only Tailwind utility classes are allowed. No custom SCSS for layout/positioning. The fix must be pure Tailwind.

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-03-23.md#Epic 17]
- [Source: _bmad-output/implementation-artifacts/10-1-center-wait-spinner-using-tailwind.md]
- [Source: _bmad-output/project-context.md#Styling/Theming]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
