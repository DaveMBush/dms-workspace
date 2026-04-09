# Story 60.1: Investigate Current Scrolling Regression and Write Failing E2E Test

Status: Approved

## Story

As a developer,
I want to understand exactly how the current janky scroll manifests and have a red Playwright test
that proves it,
so that the fix in Story 60.2 has a clear target and cannot be skipped or misjudged.

## Acceptance Criteria

1. **Given** the Playwright MCP server is used to navigate to the Universe screen with enough rows
   to trigger virtual scrolling,
   **When** the user scrolls quickly to the bottom and then back to the top,
   **Then** the MCP server captures observable symptoms (blank rows, position resets, double-scroll
   jumps) and the developer documents the exact sequence.

2. **Given** the investigation is complete,
   **When** the developer writes a Playwright test that replicates the symptom,
   **Then** the test fails (confirming the regression is captured).

3. **Given** all other existing tests are unmodified,
   **When** the test suite runs,
   **Then** all previously passing tests continue to pass.

## Definition of Done

- [ ] Playwright MCP server used to reproduce the current scrolling jank on the Universe screen
- [ ] Root cause hypothesis documented in Dev Agent Record (e.g. CDK virtual-scroll viewport size recalculation, zone-less change detection not triggering, SmartSignals re-emission race, itemSize mismatch)
- [ ] Playwright test file `universe-scrolling-regression.spec.ts` created in `apps/dms-material-e2e/src/`
- [ ] Test scrolls the Universe rapidly and asserts no blank rows appear — test currently **fails**
- [ ] `pnpm all` passes

## Tasks / Subtasks

- [ ] **Task 1: Research prior fix attempts**

  - [ ] Check git log or story files for Epics 29, 31, 44 — note what each fixed and why it regressed
  - [ ] Read `apps/dms-material/src/app/global/global-universe/global-universe.component.ts` — CDK virtual-scroll setup, `trackBy` function, item size
  - [ ] Read `apps/dms-material/src/app/global/base-table/base-table.component.ts` (if it exists) — shared virtual-scroll table logic

- [ ] **Task 2: Reproduce with Playwright MCP server**

  - [ ] Navigate to the Universe screen (ensure it has enough rows — at least 20+ to trigger virtual scroll)
  - [ ] Scroll to the bottom rapidly
  - [ ] Scroll back to the top rapidly
  - [ ] Look for blank rows, white cells, or rows that appear empty until a re-scroll
  - [ ] Take screenshots at each step and document in the Dev Agent Record

- [ ] **Task 3: Write the failing Playwright test**
  - [ ] Create `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts`
  - [ ] Test: seed sufficient rows, load Universe, scroll to bottom, scroll to top, assert all
        visible rows have non-empty symbol values (assertion currently fails due to blank rows)
  - [ ] Confirm the test is red

## Dev Notes

### Key Files

| File                                                                              | Purpose                                  |
| --------------------------------------------------------------------------------- | ---------------------------------------- |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`   | CDK virtual-scroll host component        |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.html` | `<cdk-virtual-scroll-viewport>` template |
| `apps/dms-material/src/app/global/base-table/`                                    | Shared lazy-load table (if applicable)   |
| `apps/dms-material-e2e/src/`                                                      | Target directory for the new test        |

### Previous Fix Attempts

- **Epic 29:** Fix Janky Virtual-Scroll Table Scrolling
- **Epic 31:** Fix Janky Virtual-Scroll Scrolling
- **Epic 44:** Fix Janky Scrolling Across All Tables (broadened scope)

The regression pattern suggests a structural issue — likely a CDK `itemSize` mismatch after row
height changes, or SmartSignals not re-emitting for rows that are re-entering the viewport and are
considered "already in store". The investigation must identify the specific trigger in the current
codebase version.

### Architectural Note

This project uses Angular 21 **zoneless** (`provideZonelessChangeDetection()`). Zone.js is NOT
loaded. CDK virtual scroll requires explicit change-detection triggers. If a SmartNgRX effect
updates a signal but the CDK viewport does not re-render because change detection is not triggered,
rows will appear blank — this is a known failure mode in zoneless Angular + CDK virtual scroll
combinations.

## Dev Agent Record

_To be filled in by the implementing agent._
