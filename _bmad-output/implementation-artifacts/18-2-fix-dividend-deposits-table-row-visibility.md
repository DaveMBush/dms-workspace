# Story 18.2: Fix Dividend Deposits Table Row Visibility

Status: ready-for-dev

## Story

As a user,
I want the Dividend Deposits table to display rows correctly on initial load and remain visible while scrolling,
So that I can view my dividend deposit history without having to perform a scroll workaround.

## Acceptance Criteria

1. **Given** I navigate to the Account screen
   **When** the page finishes loading
   **Then** the Dividend Deposits table displays its rows immediately without any scrolling required

2. **Given** the Dividend Deposits table is showing rows
   **When** I scroll down through the table
   **Then** rows remain visible as I scroll — they do not disappear

3. **Given** I scroll to the bottom of the Dividend Deposits table and then scroll back up
   **When** I then scroll down again
   **Then** rows remain visible and stable — there is no row-disappearing behavior

4. **Given** the fix accounts for the single-header-row structure
   **When** I apply the fix (e.g., correct container height, correct CDK virtual scroll configuration)
   **Then** the Dividend Deposits table behaves consistently with Open Positions and Sold Positions tables
   **And** Open Positions and Sold Positions tables are not regressed by the fix

5. **Given** I use the Playwright MCP server
   **When** I navigate to the Account screen and interact with all three tables
   **Then** all three tables (Open Positions, Sold Positions, Dividend Deposits) display rows correctly on load
   **And** all three tables maintain row visibility while scrolling

## Definition of Done

- [ ] Dividend Deposits rows visible immediately on page load
- [ ] Rows remain visible while scrolling (no disappearing behavior)
- [ ] Open Positions and Sold Positions tables not regressed
- [ ] All three tables verified using Playwright MCP server
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Read diagnosis from Story 18.1 (AC: 1–4)
  - [ ] Open `_bmad-output/implementation-artifacts/dividend-deposits-diagnosis.md`
  - [ ] Confirm the root cause and proposed fix approach before proceeding
- [ ] Locate Dividend Deposits table component (AC: 4)
  - [ ] Find the component in `apps/dms-material/src/app/pages/account/`
  - [ ] Open template and component TypeScript files
- [ ] Apply the targeted fix from the diagnosis (AC: 1, 2, 3, 4)
  - [ ] If the issue is **CDK virtual scroll height**: adjust viewport height calculation to use `1` header row instead of `2`
  - [ ] If the issue is **container height = 0**: ensure the wrapper has an explicit height via Tailwind (e.g., `h-[400px]` or `flex-1`)
  - [ ] If the issue is **CSS class difference**: align Dividend Deposits container classes with Open Positions/Sold Positions
  - [ ] Apply ONLY Tailwind utility classes — no custom CSS
- [ ] Verify Open Positions and Sold Positions are not regressed (AC: 4)
  - [ ] Navigate to Account screen and check all three tables
  - [ ] Confirm Open Positions still shows rows on load
  - [ ] Confirm Sold Positions still shows rows on load
- [ ] Use Playwright MCP for all-three-tables verification (AC: 5)
  - [ ] Navigate to Account screen via Playwright MCP
  - [ ] Take screenshot confirming Dividend Deposits rows visible on initial load
  - [ ] Scroll through Dividend Deposits — confirm rows stay visible
  - [ ] Scroll to bottom and back, scroll down again — confirm rows stay visible
  - [ ] Repeat visual check for Open Positions and Sold Positions
- [ ] Run validation suite
  - [ ] `pnpm all`
  - [ ] `pnpm e2e:dms-material:chromium`
  - [ ] `pnpm e2e:dms-material:firefox`
  - [ ] `pnpm dupcheck`
  - [ ] `pnpm format`

## Dev Notes

### Dependency on Story 18.1

This story **must** be implemented after Story 18.1 is complete. The diagnosis document at `_bmad-output/implementation-artifacts/dividend-deposits-diagnosis.md` is the primary input. Do not guess at a fix — apply only what was diagnosed.

### Most Likely Fix Patterns

Based on the known symptom pattern (scroll-triggered visibility), the fix will likely be one of:

**Option A — Header row count correction** (most likely):
If the CDK virtual scroll viewport subtracts a fixed header height assuming 2 rows, change it to use the actual header row count dynamically:
```typescript
// Find where headerRowHeight is calculated, e.g.:
const headerHeight = this.headerRowCount * ROW_HEIGHT;  // was hardcoded to 2
```

**Option B — Explicit container height** (fallback):
If the container has no height, CDK virtual scroll has nothing to work with:
```html
<!-- Add explicit height to the wrapper -->
<div class="h-[400px] overflow-hidden">
  <cdk-virtual-scroll-viewport ...>
```

**Option C — Force recalculation**:
Call `checkViewportSize()` on the `CdkVirtualScrollViewport` after data loads using a signal effect.

### Angular CDK Virtual Scroll API

```typescript
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';

// Inject via viewChild():
viewport = viewChild.required(CdkVirtualScrollViewport);

// Force recalculation:
effect(() => {
  if (this.data().length > 0) {
    this.viewport().checkViewportSize();
  }
});
```

### CSS Policy

Only Tailwind utilities — no custom SCSS for layout/height. If explicit height is needed, use Tailwind arbitrary values: `h-[400px]`, `min-h-[200px]`, etc.

### Non-Regression Check

The Epic 12 fix made Open Positions and Sold Positions work. The fix for Dividend Deposits must:
- NOT change the Open Positions or Sold Positions table components
- Only touch Dividend Deposits-specific code
- OR if using a shared component, make the header-row count configurable (as an `input()`)

### Previous Story References

- `_bmad-output/implementation-artifacts/12-1-restore-account-screen-table-visibility.md` — Epic 12 fix details
- `_bmad-output/implementation-artifacts/18-1-diagnose-dividend-deposits-table-rendering-issue.md` — diagnosis (required reading before implementation)

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-03-23.md#Story 18.2]
- [Source: _bmad-output/implementation-artifacts/18-1-diagnose-dividend-deposits-table-rendering-issue.md]
- [Source: _bmad-output/project-context.md#Technology Stack (Angular Material, Angular CDK)]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
