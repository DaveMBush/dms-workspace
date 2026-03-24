# Story 20.1: Fix Account Summary Responsive Layout

Status: Approved

## Story

As a user,
I want the line graph to appear beside the summary information on desktop screens and below it on smaller screens,
So that I can view my account summary numbers and performance graph side by side on wide screens.

## Acceptance Criteria

1. **Given** the layout pattern established in Epic 19 for the Global Summary screen
   **When** I examine the Account Summary component template
   **Then** I can identify where the same or equivalent responsive layout must be applied

2. **Given** I apply the same Tailwind responsive layout approach used in Epic 19
   **When** I update the Account Summary component template
   **Then** the outer wrapper uses responsive flex or grid classes consistent with the Global Summary fix (e.g., `flex flex-col lg:flex-row` or `grid grid-cols-1 lg:grid-cols-2`)

3. **Given** I am on any Account Summary screen on a desktop browser (viewport ≥1024px)
   **When** the page loads
   **Then** the summary information appears on the left side
   **And** the line graph appears on the right side
   **And** both sections are fully visible without horizontal scrolling

4. **Given** I am on any Account Summary screen on a mobile browser (viewport <1024px)
   **When** the page loads
   **Then** the summary information stacks above the line graph
   **And** all content is accessible by vertical scrolling
   **And** no horizontal overflow occurs

5. **Given** I use the Playwright MCP server
   **When** I navigate to an Account Summary screen at 1280×800 (desktop)
   **Then** the line graph is to the right of the summary info — confirmed by screenshot
   **When** I navigate to the same screen at 375×812 (mobile)
   **Then** the elements stack vertically — confirmed by screenshot

## Definition of Done

- [ ] Line graph to the right of summary info at desktop width (≥1024px)
- [ ] Elements stack vertically at mobile width (<1024px)
- [ ] No horizontal overflow at any viewport
- [ ] Tailwind responsive utilities used (consistent with Epic 19 fix)
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

- [ ] Read Epic 19 story and confirm the Tailwind fix pattern used (AC: 1, 2)
  - [ ] Open `_bmad-output/implementation-artifacts/19-1-fix-global-summary-responsive-layout.md`
  - [ ] Note the exact Tailwind classes applied as the fix
  - [ ] Understand the structure: outer wrapper class, child width/flex classes, gap class
- [ ] Locate Account Summary component(s) (AC: 1)
  - [ ] Find: `apps/dms-material/src/app/pages/account/`
  - [ ] Identify the template that shows summary info + line graph
  - [ ] There may be multiple Account Summary views (per account) — check if they share a component or each have their own template
- [ ] Compare Account Summary layout to Global Summary (AC: 1, 2)
  - [ ] Identify the outer wrapper element containing summary info and line graph
  - [ ] Note current classes — why is graph stacking below instead of beside?
- [ ] Apply the same Tailwind responsive pattern from Epic 19 (AC: 2, 3, 4)
  - [ ] Add `flex flex-col lg:flex-row gap-6` (or equivalent) to the outer wrapper
  - [ ] Add `flex-1 min-w-0` to each child (summary info div and graph div)
  - [ ] Add `min-h-[250px]` to graph container to prevent cold-start collapse
  - [ ] Ensure no conflicting width classes (remove any `w-full` that may override flex)
- [ ] Verify at desktop viewport via Playwright MCP (AC: 3, 5)
  - [ ] Navigate to Account Summary at 1280×800
  - [ ] Take screenshot — confirm graph is RIGHT of summary info
  - [ ] Confirm no horizontal overflow
- [ ] Verify at mobile viewport via Playwright MCP (AC: 4, 5)
  - [ ] Resize to 375×812
  - [ ] Take screenshot — confirm vertical stacking
  - [ ] Confirm no horizontal overflow
- [ ] Run validation suite
  - [ ] `pnpm all`
  - [ ] `pnpm e2e:dms-material:chromium`
  - [ ] `pnpm e2e:dms-material:firefox`
  - [ ] `pnpm dupcheck`
  - [ ] `pnpm format`

## Dev Notes

### Dependency on Epic 19

This story requires Epic 19's fix to be complete first. The same Tailwind pattern that fixed the Global Summary layout must be applied here. Do NOT create a new or different pattern — use whatever Epic 19 established as the standard.

### Context: Why Epic 14 Failed

Epic 14 (`14-1-fix-account-summary-responsive-layout.md`) did not resolve the issue. The Account Summary is the same type of broken responsive layout as Global Summary — the Tailwind migration in Epic 8 removed or broke the side-by-side layout. Whatever was missing in Epic 14 is the same gap that Epic 19 corrects.

### Tailwind Side-by-Side Pattern (from Epic 19)

```html
<!-- Apply the EXACT same pattern used in Epic 19's Global Summary fix -->
<div class="flex flex-col lg:flex-row gap-6">
  <div class="flex-1 min-w-0">
    <!-- Account summary info (left on desktop) -->
  </div>
  <div class="flex-1 min-w-0 min-h-[250px]">
    <!-- Line graph (right on desktop) -->
  </div>
</div>
```

**`min-w-0`** prevents flex children from overflowing on small screens (required with chart.js content).

### Multiple Account Summary Screens

The Account screen likely shows summary info for multiple accounts. Determine if:
- There is a single shared `AccountSummaryComponent` used for all accounts (preferred — fix once), OR
- Each account type has its own template (must fix each individually)

If a shared component exists, the fix is in one place. If not, apply the fix to every template that shows summary info + graph.

### Chart Container Size Fix

The chart library (ng2-charts / chart.js) requires a sized container or it will render at zero height initially, causing overlap or mis-positioning. Always add `min-h-[...]` to the graph container wrapper.

### Tailwind Breakpoints

| Prefix | Min Width |
|--------|-----------|
| `lg`   | 1024px ← use this for desktop side-by-side |

### CSS Policy

Per project rules: ONLY Tailwind utility classes for layout. No custom SCSS.

### Key Files to Check

- `apps/dms-material/src/app/pages/account/account-summary/` (if it exists)
- `apps/dms-material/src/app/pages/account/` — look for any `*summary*.html` or `*summary*.component.ts`

### Previous Story References

- `_bmad-output/implementation-artifacts/14-1-fix-account-summary-responsive-layout.md` — previous failed attempt (review before implementing)
- `_bmad-output/implementation-artifacts/19-1-fix-global-summary-responsive-layout.md` — the pattern to follow (required reading)

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-03-23.md#Epic 20]
- [Source: _bmad-output/implementation-artifacts/14-1-fix-account-summary-responsive-layout.md]
- [Source: _bmad-output/implementation-artifacts/19-1-fix-global-summary-responsive-layout.md]
- [Source: _bmad-output/project-context.md#Styling/Theming and Technology Stack]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
