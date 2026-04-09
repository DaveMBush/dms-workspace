# Story 60.2: Fix Universe Scrolling Permanently

Status: Approved

## Story

As a trader,
I want the Universe screen to scroll smoothly at all times,
so that I can review my portfolio without the distraction of blank rows or position jumps.

## Acceptance Criteria

1. **Given** the Universe screen has more rows than the viewport,
   **When** the user scrolls quickly to the bottom,
   **Then** all rows are populated with data and no blank cells appear.

2. **Given** the user scrolls rapidly from bottom to top,
   **When** the viewport settles,
   **Then** the rows at the current scroll position are all populated.

3. **Given** the Playwright MCP server scrolls the Universe screen programmatically,
   **When** the scroll completes,
   **Then** the MCP server confirms no blank rows exist at the current viewport position.

4. **Given** the fix is applied and the e2e test from Story 60.1 runs,
   **When** `pnpm run e2e:dms-material:chromium` executes,
   **Then** the test passes green.

5. **Given** all changes are applied,
   **When** `pnpm all` runs,
   **Then** all tests pass with no regressions.

## Definition of Done

- [ ] Root cause identified and documented in Dev Notes (which layer — CDK, SmartNgRX, zone-less CD — was the trigger)
- [ ] Fix applied with an explanatory comment citing both the root cause and the relevant previous epics (29, 31, 44, 60) so future maintainers understand the fragile area
- [ ] Playwright MCP server confirms smooth scroll with no blank rows on the Universe screen
- [ ] E2E test from Story 60.1 passes green
- [ ] `pnpm all` passes

## Tasks / Subtasks

- [ ] **Task 1: Read Story 60.1 Dev Agent Record**
  - [ ] Confirm root cause hypothesis from the investigation
  - [ ] Note the exact component / service / line where the fix should be applied

- [ ] **Task 2: Apply the fix**
  - [ ] Implement the minimal change required to eliminate blank rows during fast scroll
  - [ ] Add an explanatory code comment that cites the root cause AND references Epics 29, 31, 44, 60 to warn future developers

- [ ] **Task 3: Verify with Playwright MCP server**
  - [ ] Use the Playwright MCP server to perform rapid scroll-to-bottom and scroll-to-top on the Universe screen
  - [ ] Confirm all rows are populated — no blank cells
  - [ ] Take screenshot for Dev Agent Record

- [ ] **Task 4: Confirm Story 60.1 E2E test passes**
  - [ ] Run `pnpm run e2e:dms-material:chromium` and confirm the Story 60.1 test passes
  - [ ] Run `pnpm all` and confirm no regressions

## Dev Notes

### Key Files

| File | Purpose |
| ---- | ------- |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.ts` | Most likely fix location |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.html` | CDK virtual-scroll template |
| `apps/dms-material/src/app/global/base-table/` | Shared table — check if fix applies here too |
| `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts` | E2E test from Story 60.1 (must turn green) |

### Architectural Constraints

This project uses Angular 21 **zoneless** with `provideZonelessChangeDetection()`. Zone.js is NOT
loaded. Any fix that relies on `NgZone.run()` or `ApplicationRef.tick()` patterns is incompatible.
Use `ChangeDetectorRef.markForCheck()` or signal updates to trigger re-renders.

CDK virtual scroll calculates item positions based on `itemSize`. If the actual rendered row height
diverges from the configured `itemSize` (e.g. after a row-height change in a prior PR), the
viewport will have an incorrect offset map and rows will appear at wrong positions — this is a
common cause of blank rows during scroll. Verify `itemSize` matches the actual row height in pixels.

## Dev Agent Record

_To be filled in by the implementing agent._
