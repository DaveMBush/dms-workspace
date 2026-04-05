# Story 12.1: Restore Account Screen Table Visibility

Status: Approved

## Story

As a user,
I want to see all tables on Account screens,
So that I can view my Open Positions, Sold Positions, and Dividend Deposits data.

## Acceptance Criteria

1. **Given** I am on any Account screen
   **When** the page loads
   **Then** I can see the "Open Positions" table with data
   **And** I can see the "Sold Positions" table with data
   **And** I can see the "Dividend Deposits" table with data

2. **Given** I review the git history from Epic 8
   **When** I compare Account screen layouts to Universe screen layout
   **Then** I can identify what Tailwind classes were changed on the panels/containers
   **And** I understand why Universe tables still work but Account tables don't

3. **Given** the panel or container elements wrapping the tables
   **When** I apply correct Tailwind layout utilities (flex, block, etc.)
   **Then** the tables become visible and properly sized
   **And** the tables scroll if content exceeds container height
   **And** the styling matches the Universe screen's working table layout

4. **Given** I use the Playwright MCP server
   **When** I verify all Account screens
   **Then** all three tables are visible on each Account screen
   **And** the tables display data correctly
   **And** the layout is consistent with the Universe screen appearance

## Definition of Done

- [ ] All three tables visible on Account screens (Open Positions, Sold Positions, Dividend Deposits)
- [ ] Tables properly sized and scrollable if needed
- [ ] Layout consistent with Universe screen
- [ ] Verified on all Account screens using Playwright MCP server
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Locate Account screen components (AC: 1)
  - [ ] Find Account page component: `apps/dms-material/src/app/pages/account/`
  - [ ] Identify templates for all three tables
  - [ ] Note current layout structure
- [ ] Compare with Universe screen (AC: 2, 3)
  - [ ] Open Universe screen template
  - [ ] Note the container/panel structure wrapping working tables
  - [ ] Note Tailwind classes used for layout
  - [ ] Identify differences in Account screen structure
- [ ] Check git history (AC: 2)
  - [ ] Run `git log --all --full-history -- **/account/**`
  - [ ] Find Epic 8 commits that modified Account screen layout
  - [ ] Document what layout classes were added/removed
  - [ ] Compare before/after to identify breaking changes
- [ ] Fix panel/container layout (AC: 3)
  - [ ] Ensure containers have proper display properties: `flex`, `block`, or `grid`
  - [ ] Set proper sizing: `h-full`, `min-h-0`, or specific height
  - [ ] Enable overflow if needed: `overflow-auto`, `overflow-y-auto`
  - [ ] Match Universe screen container classes
- [ ] Test locally on all Account screens (AC: 1)
  - [ ] Navigate to each Account detail screen
  - [ ] Verify Open Positions table is visible and displays data
  - [ ] Verify Sold Positions table is visible and displays data
  - [ ] Verify Dividend Deposits table is visible and displays data
  - [ ] Test scrolling if tables have many rows
- [ ] Use Playwright MCP server for comprehensive verification (AC: 4)
  - [ ] Navigate to multiple Account screens
  - [ ] Take screenshots of each screen
  - [ ] Verify all three tables are visible in screenshots
  - [ ] Compare layout to Universe screen

## Dev Notes

### Context from Epic 8

- After Tailwind CSS migration, Account screen tables are no longer displaying
- Universe screen tables still work correctly → suggests issue is with panel/container structure, not table component itself
- Likely a Flexbox or Grid layout issue where containers collapsed or tables pushed off-screen

### Common Layout Issues After Tailwind Migration

- Missing `flex` or `flex-col` on parent containers
- Missing height constraints: `h-full`, `min-h-0`
- Overflow hidden: changed from `overflow-auto` to `overflow-hidden`
- Missing `flex-1` or `grow` on expanding sections

### Expected Fix Pattern

```html
<!-- Before (broken) -->
<div class="account-container">
  <div class="table-section">
    <app-positions-table />
  </div>
</div>

<!-- After (fixed) -->
<div class="flex flex-col h-full">
  <div class="flex-1 overflow-auto">
    <app-positions-table />
  </div>
</div>
```

### Key Files to Modify

- Account page: `apps/dms-material/src/app/pages/account/account.component.html`
- Account page: `apps/dms-material/src/app/pages/account/account.component.ts`
- Possibly table components if they have wrapper elements

### Reference: Universe Screen (Working)

- Universe page: `apps/dms-material/src/app/pages/universe/universe.component.html`
- Use this as the reference implementation for correct table layout

### Testing with Playwright MCP Server

- Use `mcp_microsoft_pla_browser_navigate` to navigate to Account screens
- Use `mcp_microsoft_pla_browser_take_screenshot` to capture full page
- Use `mcp_microsoft_pla_browser_evaluate` to check element visibility:
  ```javascript
  document.querySelector('.open-positions-table').offsetHeight > 0;
  ```

### Project Structure Notes

- Account screens follow Angular 21 patterns with SmartNgRX for state
- Tables are display-only components receiving data via `input()` signals
- CEF-focused domain: accounts track positions and dividends for Closed-End Funds

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-03-21.md#Story 12.1]
- [Source: apps/dms-material/src/app/pages/account/]
- [Source: apps/dms-material/src/app/pages/universe/] (working reference)

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_
