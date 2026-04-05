# Story 19.1: Fix Global Summary Responsive Layout

Status: Approved

## Story

As a user,
I want the line graph to appear beside the summary information and pie chart on desktop screens and below them on smaller screens,
So that I can view the full summary at a glance on wide screens and scroll comfortably on narrow ones.

## Acceptance Criteria

1. **Given** I review the git history from the commit immediately before Epic 8 began
   **When** I examine the Global Summary component template and any associated CSS
   **Then** I can identify the precise layout mechanism (CSS classes, flex/grid, media queries) that placed the graph beside the summary info

2. **Given** I understand the pre-Epic 8 layout approach
   **When** I rewrite the Global Summary component template layout using Tailwind CSS responsive utilities
   **Then** the container uses a responsive flex or grid approach such as:

   - `flex flex-col lg:flex-row` on the outer wrapper, with each child taking appropriate width/flex values, or
   - A `grid grid-cols-1 lg:grid-cols-2` (or similar column split) approach

3. **Given** I am on the Global Summary screen on a desktop browser (viewport ≥1024px)
   **When** the page loads from a cold start (no cached data)
   **Then** the line graph does NOT overlap the pie chart — each element occupies its own layout area
   **And** the summary information and pie chart appear on the left side
   **And** the line graph appears on the right side
   **And** both sections are fully visible without needing to scroll horizontally

4. **Given** I am on the Global Summary screen on a tablet or mobile browser (viewport <1024px)
   **When** the page loads
   **Then** the summary information and pie chart stack above the line graph
   **And** all content is fully visible by scrolling vertically
   **And** no horizontal overflow occurs

5. **Given** I use the Playwright MCP server to verify
   **When** I set the viewport to 1280×800 and navigate to Global Summary
   **Then** the line graph is to the right of the summary info — confirmed by screenshot
   **When** I set the viewport to 375×812 (mobile)
   **Then** the elements stack vertically — confirmed by screenshot
   **And** on neither viewport is the graph overlapping another element

## Definition of Done

- [ ] Pre-Epic 8 git history consulted for original layout approach
- [ ] Line graph to the right of summary info at desktop width (≥1024px) — no overlap on cold start
- [ ] Elements stack vertically at mobile width (<1024px)
- [ ] Tailwind responsive utilities used (no custom CSS for layout)
- [ ] Verified at 1280×800 and 375×812 viewports using Playwright MCP server
- [ ] Screenshots captured showing correct layout at both breakpoints
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Locate the Global Summary component (AC: 1)
  - [ ] Find: `apps/dms-material/src/app/pages/global-summary/`
  - [ ] Open the template file (`.html`)
  - [ ] Identify the summary info section, pie chart section, and line graph section
- [ ] Consult git history from before Epic 8 (AC: 1)
  - [ ] Run: `git log --all --oneline -- apps/dms-material/src/app/pages/global-summary/`
  - [ ] Find the commit just before Epic 8 Tailwind migration
  - [ ] Run: `git show <commit>:<path-to-template>` to see pre-migration layout
  - [ ] Note what layout classes or CSS were producing the side-by-side layout
- [ ] Apply Tailwind responsive layout (AC: 2, 3, 4)
  - [ ] Identify the outer wrapper element containing all three sections
  - [ ] Add `flex flex-col lg:flex-row` (or equivalent grid approach) to wrapper
  - [ ] Add appropriate width classes to children: `flex-1` or `lg:w-1/2`
  - [ ] Add gap: `gap-4` or `gap-6` between children
  - [ ] Ensure no `position: absolute` or `z-index` tricks that could cause overlapping on cold start
- [ ] Fix the cold-start overlap issue (AC: 3)
  - [ ] Investigate why the graph overlaps pie chart on cold start — likely a timing/animation issue with the chart library
  - [ ] Ensure the graph container always has a defined width/height even before data loads
  - [ ] Use `min-h-[200px]` or similar on the graph container to prevent zero-height collapse
- [ ] Verify at desktop viewport (AC: 3, 5)
  - [ ] Use Playwright MCP to navigate to Global Summary at 1280×800
  - [ ] Take screenshot — confirm graph is to the RIGHT of summary info
  - [ ] Confirm no overlap between graph and pie chart
- [ ] Verify at mobile viewport (AC: 4, 5)
  - [ ] Resize Playwright viewport to 375×812
  - [ ] Take screenshot — confirm elements stack vertically
  - [ ] Confirm no horizontal overflow
- [ ] Run validation suite
  - [ ] `pnpm all`
  - [ ] `pnpm e2e:dms-material:chromium`
  - [ ] `pnpm e2e:dms-material:firefox`
  - [ ] `pnpm dupcheck`
  - [ ] `pnpm format`

## Dev Notes

### Context: Why Epic 13 Failed

Epic 13 (`13-1-fix-global-summary-responsive-layout.md`) was marked done but two issues persist:

1. **Cold start**: The line graph renders ON TOP of the pie chart momentarily, not beside it
2. **After settling**: The graph is BELOW the summary info, not beside it

The likely cause of #2 is that `flex-col lg:flex-row` was applied but:

- The `lg:flex-row` breakpoint was not set correctly, OR
- A child element was preventing the side-by-side layout (e.g., `width: 100%` override in SCSS)

The likely cause of #1 is that the charts library (chart.js / ng2-charts) uses `position: relative/absolute` internally, and without an explicit container size, it collapses to zero height then recalculates — causing the overlap.

### Tailwind Responsive Layout Patterns

```html
<!-- CORRECT: Stacks on mobile, side-by-side on desktop lg: (≥1024px) -->
<div class="flex flex-col lg:flex-row gap-6">
  <div class="flex-1 min-w-0">
    <!-- Summary info + pie chart (left on desktop) -->
  </div>
  <div class="flex-1 min-w-0">
    <!-- Line graph (right on desktop) -->
  </div>
</div>
```

**`min-w-0`** is critical: Without it, a flex child with wide content (like a chart) will overflow the container on small screens.

### Chart Container — Preventing Cold-Start Overlap

The chart library (ng2-charts wrapping chart.js) can cause overlap if the container has no size on initial render:

```html
<!-- Give graph container a minimum height -->
<div class="flex-1 min-w-0 min-h-[250px]">
  <app-line-chart ...></app-line-chart>
</div>
```

### Tailwind Breakpoints Reference

| Prefix | Min Width         |
| ------ | ----------------- |
| `sm`   | 640px             |
| `md`   | 768px             |
| `lg`   | 1024px ← use this |
| `xl`   | 1280px            |
| `2xl`  | 1536px            |

Use `lg:` prefix for desktop side-by-side layout.

### Key Files to Modify

- `apps/dms-material/src/app/pages/global-summary/global-summary.component.html`
- `apps/dms-material/src/app/pages/global-summary/global-summary.component.ts` (if structural changes needed)

### CSS Policy

Per project rules: ONLY Tailwind utility classes for layout. No custom SCSS for flex/grid/positioning. If overriding a component's internal CSS is needed, use Angular's `::ng-deep` SPARINGLY and document why.

### Previous Story Reference

See `_bmad-output/implementation-artifacts/13-1-fix-global-summary-responsive-layout.md` for the previous failed attempt. Understand what was tried and why it didn't fully work before implementing the new fix.

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-03-23.md#Epic 19]
- [Source: _bmad-output/implementation-artifacts/13-1-fix-global-summary-responsive-layout.md]
- [Source: _bmad-output/project-context.md#Styling/Theming and Technology Stack (Charts: chart.js + ng2-charts)]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
