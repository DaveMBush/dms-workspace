# Story 13.1: Fix Global Summary Responsive Layout

Status: Approved

## Story

As a user,
I want the line graph to appear beside the summary information on larger screens,
So that I can view both the numbers and the graph simultaneously without scrolling.

## Acceptance Criteria

1. **Given** I am on the Global Summary screen on a desktop browser
   **When** the screen width is greater than or equal to the large breakpoint (lg: 1024px)
   **Then** the summary information appears on the left side
   **And** the line graph appears on the right side
   **And** both elements are visible without scrolling

2. **Given** I am on the Global Summary screen on a tablet or mobile device
   **When** the screen width is below the large breakpoint
   **Then** the summary information stacks above the line graph
   **And** both elements remain fully visible and properly sized

3. **Given** I review the git history from Epic 8
   **When** I check the previous layout classes used
   **Then** I can identify what flex or grid structure was in place
   **And** I implement equivalent layout using Tailwind responsive utilities

4. **Given** the component template uses Tailwind utilities
   **When** I apply responsive flex classes like `flex-col lg:flex-row`
   **Then** the layout adapts correctly at different breakpoints
   **And** spacing between elements is appropriate

5. **Given** I use the Playwright MCP server
   **When** I verify the Global Summary screen at different viewport sizes
   **Then** the layout displays side-by-side at desktop width (≥1024px)
   **And** the layout stacks vertically at mobile width (<1024px)
   **And** no content is clipped or hidden
   **And** the graph renders properly in both layouts

## Definition of Done

- [ ] Line graph appears to the right of summary info on desktop (≥1024px)
- [ ] Layout stacks vertically on mobile (<1024px)
- [ ] Both elements visible without scrolling
- [ ] Verified at multiple viewport sizes using Playwright MCP server
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Locate Global Summary component (AC: 1, 2)
  - [ ] Find: `apps/dms-material/src/app/pages/global-summary/`
  - [ ] Open template file
  - [ ] Identify summary info and line graph sections
- [ ] Check git history (AC: 3)
  - [ ] Run `git log --all --full-history -- **/global-summary/**`
  - [ ] Find Epic 8 commits that changed layout
  - [ ] Document what flex/grid classes were removed
- [ ] Apply responsive Tailwind layout (AC: 4)
  - [ ] Wrap summary and graph in flex container
  - [ ] Add `flex flex-col lg:flex-row` to container
  - [ ] Add `gap-4` or `space-x-4` for spacing
  - [ ] Set widths: `lg:w-1/2` for each section or `flex-1`
  - [ ] Ensure proper height constraints
- [ ] Test locally at different viewport sizes (AC: 1, 2)
  - [ ] Open browser dev tools
  - [ ] Test at desktop width (1280px+)
  - [ ] Test at tablet width (768px - 1023px)
  - [ ] Test at mobile width (<768px)
  - [ ] Verify side-by-side at large breakpoint
  - [ ] Verify stacking at small breakpoint
- [ ] Use Playwright MCP server for verification (AC: 5)
  - [ ] Navigate to Global Summary screen
  - [ ] Resize viewport to 1280px width
  - [ ] Take screenshot and verify side-by-side layout
  - [ ] Resize viewport to 375px width
  - [ ] Take screenshot and verify stacked layout
  - [ ] Check that graph renders correctly at both sizes

## Dev Notes

### Context from Epic 8
- Tailwind CSS migration changed layout classes
- Line graph now stacks below summary instead of appearing side-by-side on desktop

### Tailwind Responsive Layout Pattern
```html
<!-- Stacks on mobile, side-by-side on desktop -->
<div class="flex flex-col lg:flex-row gap-4">
  <div class="flex-1">
    <!-- Summary information -->
  </div>
  <div class="flex-1">
    <!-- Line graph -->
  </div>
</div>
```

### Tailwind Breakpoints
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px (use this for desktop layout)
- `xl`: 1280px
- `2xl`: 1536px

### Key Files to Modify
- Global Summary page: `apps/dms-material/src/app/pages/global-summary/global-summary.component.html`
- Global Summary page: `apps/dms-material/src/app/pages/global-summary/global-summary.component.ts`

### Graph Component
- Likely using a charting library (Chart.js, D3, or similar)
- Ensure graph component is responsive and fills its container

### Testing with Playwright MCP Server
- Use `mcp_microsoft_pla_browser_navigate` to go to Global Summary
- Use `mcp_microsoft_pla_browser_resize` to set viewport sizes:
  - Desktop: `{ width: 1280, height: 720 }`
  - Mobile: `{ width: 375, height: 667 }`
- Use `mcp_microsoft_pla_browser_take_screenshot` to capture layouts
- Use `mcp_microsoft_pla_browser_evaluate` to check element positions

### Project Structure Notes
- Global Summary displays portfolio-wide CEF dividend income data
- Uses SmartNgRX for state management
- Line graph shows monthly/yearly income trends

### References
- [Source: _bmad-output/planning-artifacts/epics-2026-03-21.md#Story 13.1]
- [Source: apps/dms-material/src/app/pages/global-summary/]
- [Source: tailwind.config.js] (for breakpoint configuration)

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_
