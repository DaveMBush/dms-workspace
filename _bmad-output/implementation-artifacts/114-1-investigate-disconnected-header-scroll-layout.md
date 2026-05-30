# Story 114.1: Investigate Current Disconnected-Header Scroll Layout and Define the Fix

Status: Approved

**Story Key:** `114-1-investigate-disconnected-header-scroll-layout`
**Epic:** 114 — Fix Disconnected-Header Table Layout and Scrollbar Behavior
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-30.md](../planning-artifacts/epics-2026-05-30.md) (Story 114.1)
**Type:** Investigation / Design
**Depends on:** none
**Enables:** Story 114.2, Story 114.3

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want to trace the current base-table overflow and scroll-container behavior,
So that the layout fix lands in the correct container without reintroducing sticky-header regressions.

## Epic Context

**Epic 114 Goal:** Restore the intended disconnected-header table behavior introduced by the earlier base-table refactor so headers stay fixed, the vertical scrollbar remains pinned at the far right of the table area, and header/body alignment remains correct without reverting to sticky headers.

This story (114.1) is the **investigation / design** story. It must confirm the current header/body container hierarchy in the live UI, identify which element actually owns vertical scrolling today, reproduce the regression on narrow and wide viewports via the Playwright MCP server, and produce the precise container / overflow fix that Story 114.2 will implement. **No production code is modified in this story.**

The current anchors from story metadata are the base-table component files. The investigation must treat the existing in-code comments as hypotheses to verify, not as proof that the runtime layout still behaves as intended.

## Acceptance Criteria

1. **AC1 — Current scroll-container ownership documented.**
   **Given** the current disconnected-header table implementation,
   **When** the developer traces the base-table component structure and styles,
   **Then** Dev Notes record the base-table files involved, the current header/body container hierarchy, and which element currently owns vertical scrolling.

2. **AC2 — Narrow and wide viewport behaviour reproduced via Playwright MCP.**
   **Given** the reported regression,
   **When** the developer reproduces the issue via the Playwright MCP server on both narrow and wide viewport scenarios,
   **Then** Dev Notes record how the header, body content, and vertical scrollbar currently move relative to each other.

3. **AC3 — Fix approach documented with exact container / overflow changes.**
   **Given** the desired behavior,
   **When** the developer drafts the fix approach,
   **Then** Dev Notes specify the exact container and overflow changes needed to keep headers fixed, keep the vertical scrollbar at the far right, and preserve disconnected-header alignment without restoring `position: sticky`.

4. **AC4 — No production code changes; quality gate passes.**
   **Given** the investigation is complete,
   **When** `pnpm all` runs,
   **Then** all tests pass and no production code is modified.

## Tasks / Subtasks

- [ ] **Task 1 — Trace the current base-table container hierarchy and scroll ownership** (AC: #1)
  - [ ] Read [apps/dms-material/src/app/shared/components/base-table/base-table.component.html](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.html), [apps/dms-material/src/app/shared/components/base-table/base-table.component.ts](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.ts), and [apps/dms-material/src/app/shared/components/base-table/base-table.component.scss](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.scss) in full.
  - [ ] Record the current DOM hierarchy in Dev Notes, including the relationship between `.table-container`, `.dms-outer-scroller`, `.dms-table-scroll-container`, `.dms-table-header`, and `.dms-table-body`.
  - [ ] Record every relevant `overflow-*`, `flex`, `min-width`, and spacer rule that affects scroll ownership and header/body alignment.
  - [ ] Identify which element is *intended* to own vertical scrolling according to the code comments, and which element appears to own it in the live runtime behaviour.

- [ ] **Task 2 — Reproduce the regression on narrow and wide viewports via Playwright MCP** (AC: #2)
  - [ ] Use the Playwright MCP server on a representative base-table consumer, starting with Universe because its column set is wide enough to force horizontal scroll.
  - [ ] Reproduce at a narrow viewport (for example `800px` width) and a wide viewport (for example `1800px` width).
  - [ ] For each viewport, record: header position during vertical scroll, header position during horizontal scroll, body movement, vertical scrollbar position at rest, and vertical scrollbar position after horizontal scrolling.
  - [ ] Capture screenshots or equivalent DOM observations for each scenario and save the evidence in Dev Notes.
  - [ ] If Universe does not fully expose the issue, reproduce on at least one additional base-table consumer from the Story 111.1 inventory.

- [ ] **Task 3 — Draft the precise fix approach for Story 114.2** (AC: #3)
  - [ ] State whether vertical scroll ownership should remain on `.dms-outer-scroller` or move to a different element, with evidence.
  - [ ] State whether horizontal scroll ownership should remain on `.dms-table-scroll-container` or change, with evidence.
  - [ ] Identify the exact selectors / file locations Story 114.2 should modify.
  - [ ] Explain how the fix preserves disconnected headers and header/body alignment without restoring `position: sticky`.
  - [ ] Call out regression constraints that the implementation story must preserve: CDK virtual-scroll behaviour, no layout containment on the viewport / scroll ancestors, no double horizontal scrollbars, and no width-parity break between header and body columns.

- [ ] **Task 4 — Quality gate and non-code-change confirmation** (AC: #4)
  - [ ] Confirm no production source files were modified while investigating.
  - [ ] Run `pnpm all` and record the result in Dev Notes.

## Dev Notes

### Architecture & Code Pointers

- **Primary anchors:**
  - [apps/dms-material/src/app/shared/components/base-table/base-table.component.html](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.html)
  - [apps/dms-material/src/app/shared/components/base-table/base-table.component.ts](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.ts)
  - [apps/dms-material/src/app/shared/components/base-table/base-table.component.scss](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.scss)
- **Current intended structure from the component code:** `.table-container` → `.dms-outer-scroller[cdkVirtualScrollingElement]` → `.dms-table-scroll-container` → `.dms-table-header` + `cdk-virtual-scroll-viewport.dms-table-body`.
- **Current intended ownership split from Epic 112 comments:** `.dms-outer-scroller` owns vertical scroll, `.dms-table-scroll-container` owns horizontal scroll, `.dms-table-body` keeps `overflow-x: hidden` and `overflow-y: visible`, and `.dms-col-spacer` absorbs spare width so header/body columns stay aligned.
- **The investigation must verify whether runtime behaviour still matches those comments.** The story is not complete until the live UI evidence and the code-level intent agree on what is actually happening.

### Related Prior Work

- [111-1-design-base-table-two-region-layout.md](./111-1-design-base-table-two-region-layout.md) — consumer inventory and the original two-region design.
- [111-2-refactor-base-table-two-region.md](./111-2-refactor-base-table-two-region.md) — initial disconnected-header refactor.
- [112-1-investigate-base-table-layout-regressions.md](./112-1-investigate-base-table-layout-regressions.md) — prior investigation of scrollbar drift / width-fill regressions.
- [112-2-fix-base-table-layout-regressions.md](./112-2-fix-base-table-layout-regressions.md) — implementation that introduced the current `.dms-outer-scroller` and `.dms-col-spacer` pattern.

### Existing Regression Coverage to Review

- [apps/dms-material-e2e/src/base-table-two-region-regression.spec.ts](../../apps/dms-material-e2e/src/base-table-two-region-regression.spec.ts)
- [apps/dms-material-e2e/src/base-table-layout-regression.spec.ts](../../apps/dms-material-e2e/src/base-table-layout-regression.spec.ts)
- [apps/dms-material-e2e/src/scrolling-regression-101.spec.ts](../../apps/dms-material-e2e/src/scrolling-regression-101.spec.ts)
- [apps/dms-material-e2e/src/scrolling-regression-105.spec.ts](../../apps/dms-material-e2e/src/scrolling-regression-105.spec.ts)
- [apps/dms-material-e2e/src/scrolling-regression-106.spec.ts](../../apps/dms-material-e2e/src/scrolling-regression-106.spec.ts)
- [apps/dms-material-e2e/src/scrolling-regression-106-investigation.spec.ts](../../apps/dms-material-e2e/src/scrolling-regression-106-investigation.spec.ts)

### Investigation Constraints

- **Do not restore `position: sticky`.** Epic 111 removed sticky headers structurally; Story 114.2 must keep the disconnected-header design.
- **Do not assume code comments are still correct.** Verify scroll ownership and scrollbar position from the live browser, not only from static file inspection.
- **Preserve CDK virtual-scroll constraints.** No `contain: layout|paint|strict|content` changes on the viewport or any scroll ancestor unless the investigation proves they are safe.
- **Preserve header/body width parity.** Any proposed fix must account for the existing `.dms-col-spacer` or explicitly replace it with a parity-safe alternative.
- **No production code changes in this story.** Evidence collection, Dev Notes, and quality validation only.

### Evidence Template (fill in during investigation)

- Narrow viewport
  Screen: Universe
  Viewport: 800px
  Header behaviour:
  Body behaviour:
  Vertical scrollbar position:
  Evidence:
- Wide viewport
  Screen: Universe
  Viewport: 1800px
  Header behaviour:
  Body behaviour:
  Vertical scrollbar position:
  Evidence:
- Additional consumer (if needed)
  Screen:
  Viewport:
  Header behaviour:
  Body behaviour:
  Vertical scrollbar position:
  Evidence:

### Testing Standards

- Use the Playwright MCP server for the reproduction steps in AC2; static code analysis alone is insufficient.
- `pnpm all` must pass at the end of the story.
- If an existing regression spec already captures the failure precisely, cite it in Dev Notes rather than inventing a second explanation.

### Project Structure Notes

- Expected implementation surface for Story 114.2 is the base-table component triad first: HTML, TS, and SCSS.
- Consumer screens most likely to expose the issue remain the Story 111.1 inventory: Universe, Screener, Open Positions, Sold Positions, and Dividend Deposits.
- Project-wide guardrails are documented in [_bmad-output/project-context.md](../project-context.md).

### References

- Epic source: [_bmad-output/planning-artifacts/epics-2026-05-30.md](../planning-artifacts/epics-2026-05-30.md) — Story 114.1 section
- Story metadata: [_bmad-output/planning-artifacts/story-meta/2026-05-30/114-1-investigate-disconnected-header-scroll-layout.yaml](../planning-artifacts/story-meta/2026-05-30/114-1-investigate-disconnected-header-scroll-layout.yaml)
- Project context: [_bmad-output/project-context.md](../project-context.md)

## Definition of Done

- [ ] Base-table scroll-container ownership documented
- [ ] Narrow and wide viewport behaviour reproduced via Playwright MCP
- [ ] Fix approach documented with explicit container / overflow changes
- [ ] No production code changed; `pnpm all` passes

## Dev Agent Record

### Agent Model Used

*To be filled by dev agent.*

### Debug Log References

*To be filled by dev agent.*

### Completion Notes List

*To be filled by dev agent.*

### File List

*To be filled by dev agent.*
