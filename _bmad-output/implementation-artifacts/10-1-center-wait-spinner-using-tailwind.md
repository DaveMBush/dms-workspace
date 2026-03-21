# Story 10.1: Center Wait Spinner Using Tailwind

Status: Approved

## Story

As a user,
I want the loading spinner to appear centered on my screen,
So that I have a clear visual indication that data is loading without it being obscured in the corner.

## Acceptance Criteria

1. **Given** I am on the Screener screen
   **When** I click the "Refresh" button
   **Then** the wait spinner appears centered horizontally on the screen
   **And** the wait spinner appears centered vertically on the screen

2. **Given** the spinner component HTML template
   **When** I apply Tailwind utility classes for centering
   **Then** the classes use flexbox or fixed positioning with transform
   **And** the solution works for all screen sizes

3. **Given** I use the Playwright MCP server to verify
   **When** I trigger a loading state on multiple screens
   **Then** the spinner is centered on the Screener screen
   **And** the spinner is centered on the Universe screen
   **And** the spinner is centered on all Account screens
   **And** the spinner is centered on the Global Summary screen

4. **Given** I review the git history from Epic 8
   **When** I check what styles were used before the Tailwind migration
   **Then** I can reference the previous centering approach
   **And** I implement an equivalent solution using Tailwind utilities

## Definition of Done

- [ ] Wait spinner centered horizontally and vertically on all screens
- [ ] Verified on Screener, Universe, Account, and Global Summary screens
- [ ] Solution works at all screen sizes
- [ ] Verified using Playwright MCP server
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Find the spinner component (AC: 2)
  - [ ] Search for spinner/loading component in `apps/dms-material/src/app`
  - [ ] Identify the component file and template
  - [ ] Note current styling approach
- [ ] Check git history for previous styling (AC: 4)
  - [ ] Run `git log --all --full-history -- **/spinner*` or similar
  - [ ] Find commits from Epic 8 that modified spinner styling
  - [ ] Document what CSS classes were removed
- [ ] Apply Tailwind centering utilities (AC: 2)
  - [ ] Use flexbox approach: `class="fixed inset-0 flex items-center justify-center"`
  - [ ] Or use transform approach: `class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"`
  - [ ] Ensure z-index is appropriate to show above content
  - [ ] Add backdrop if needed: `class="bg-black/50"`
- [ ] Test locally on multiple screens (AC: 1, 3)
  - [ ] Navigate to Screener screen and trigger refresh
  - [ ] Navigate to Universe screen and trigger loading state
  - [ ] Navigate to Account screens and trigger loading state
  - [ ] Navigate to Global Summary and trigger loading state
  - [ ] Verify centering at different browser window sizes
- [ ] Use Playwright MCP server for verification (AC: 3)
  - [ ] Write/run Playwright test that triggers loading states
  - [ ] Capture screenshots of spinner on each screen
  - [ ] Verify spinner position in screenshots
  - [ ] Check for visual regressions

## Dev Notes

### Context from Epic 8
- Epic 8 migrated CSS to Tailwind utilities, which removed spinner centering styles
- The spinner component is shared across multiple screens
- Angular 21 zoneless + SmartNgRX reactive patterns are in use

### Common Tailwind Centering Patterns
**Flexbox approach (recommended):**
```html
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
  <div class="spinner"><!-- spinner SVG/animation --></div>
</div>
```

**Transform approach:**
```html
<div class="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2">
  <div class="spinner"><!-- spinner SVG/animation --></div>
</div>
```

### Key Files to Modify
- Likely in: `apps/dms-material/src/app/components/loading-spinner/` or similar
- Or possibly a shared component in `apps/dms-material/src/app/shared/`

### Testing with Playwright MCP Server
- Use `mcp_microsoft_pla_browser_navigate` to navigate to screens
- Use `mcp_microsoft_pla_browser_click` to trigger loading states
- Use `mcp_microsoft_pla_browser_take_screenshot` to capture spinner position
- Use `mcp_microsoft_pla_browser_wait_for` to wait for spinner to appear

### CSS Layer Order
**ADR-002** specifies layer order: `tailwind-base, material, tailwind-utilities`
- Ensure Tailwind utilities take precedence over Angular Material styles

### Project Structure Notes
- Spinner component should follow Angular 21 standalone component pattern
- Use `inject()` pattern for any dependencies
- Follow `OnPush` change detection strategy

### References
- [Source: _bmad-output/planning-artifacts/epics-2026-03-21.md#Story 10.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-002]
- [Source: docs/component-inventory.md] (if spinner is documented there)

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_
