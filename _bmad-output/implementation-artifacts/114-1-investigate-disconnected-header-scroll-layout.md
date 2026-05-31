# Story 114.1: Investigate Current Disconnected-Header Scroll Layout and Define the Fix

Status: Done

**Story Key:** `114-1-investigate-disconnected-header-scroll-layout`
**Epic:** 114 — Fix Disconnected-Header Table Layout and Scrollbar Behavior
**GitHub Issue:** #1327
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

- [x] **Task 1 — Trace the current base-table container hierarchy and scroll ownership** (AC: #1)
  - [x] Read [apps/dms-material/src/app/shared/components/base-table/base-table.component.html](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.html), [apps/dms-material/src/app/shared/components/base-table/base-table.component.ts](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.ts), and [apps/dms-material/src/app/shared/components/base-table/base-table.component.scss](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.scss) in full.
  - [x] Record the current DOM hierarchy in Dev Notes, including the relationship between `.table-container`, `.dms-outer-scroller`, `.dms-table-scroll-container`, `.dms-table-header`, and `.dms-table-body`.
  - [x] Record every relevant `overflow-*`, `flex`, `min-width`, and spacer rule that affects scroll ownership and header/body alignment.
  - [x] Identify which element is *intended* to own vertical scrolling according to the code comments, and which element appears to own it in the live runtime behaviour.

- [x] **Task 2 — Reproduce the regression on narrow and wide viewports via Playwright MCP** (AC: #2)
  - [x] Use the Playwright MCP server on a representative base-table consumer, starting with Universe because its column set is wide enough to force horizontal scroll.
  - [x] Reproduce at a narrow viewport (for example `800px` width) and a wide viewport (for example `1800px` width).
  - [x] For each viewport, record: header position during vertical scroll, header position during horizontal scroll, body movement, vertical scrollbar position at rest, and vertical scrollbar position after horizontal scrolling.
  - [x] Capture screenshots or equivalent DOM observations for each scenario and save the evidence in Dev Notes.
  - [x] Universe fully exposes the issue; additional consumer reproduction is not required for this investigation.

- [x] **Task 3 — Draft the precise fix approach for Story 114.2** (AC: #3)
  - [x] State whether vertical scroll ownership should remain on `.dms-outer-scroller` or move to a different element, with evidence.
  - [x] State whether horizontal scroll ownership should remain on `.dms-table-scroll-container` or change, with evidence.
  - [x] Identify the exact selectors / file locations Story 114.2 should modify.
  - [x] Explain how the fix preserves disconnected headers and header/body alignment without restoring `position: sticky`.
  - [x] Call out regression constraints that the implementation story must preserve: CDK virtual-scroll behaviour, no layout containment on the viewport / scroll ancestors, no double horizontal scrollbars, and no width-parity break between header and body columns.

- [x] **Task 4 — Quality gate and non-code-change confirmation** (AC: #4)
  - [x] Confirm no production source files were modified while investigating.
  - [x] Run `pnpm all` and record the result in Dev Notes.

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

### Investigation Summary

The current scroll ownership split is only partially correct in runtime. The code comments accurately describe **who owns scrolling** today, but the actual DOM hierarchy leaves the disconnected header **inside** the outer vertical scroll subtree.

- `.dms-outer-scroller` is the live vertical scroll owner.
- `.dms-table-scroll-container` is the live horizontal scroll owner.
- `.dms-table-header` and `.dms-table-body` still move together on horizontal scroll, so width parity is intact.
- The regression is that vertical scroll on `.dms-outer-scroller` translates the entire `.dms-table-scroll-container`, so the disconnected header scrolls out of view with body content instead of staying fixed above the body region.

### AC1 — Current scroll-container ownership documented

**Files inspected:**

- [apps/dms-material/src/app/shared/components/base-table/base-table.component.html](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.html)
- [apps/dms-material/src/app/shared/components/base-table/base-table.component.ts](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.ts)
- [apps/dms-material/src/app/shared/components/base-table/base-table.component.scss](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.scss)

**Current DOM hierarchy:**

1. `.table-container`
2. `.dms-outer-scroller[cdkVirtualScrollingElement]`
3. `.dms-table-scroll-container`
4. `.dms-table-header`
5. `cdk-virtual-scroll-viewport.dms-table-body`

**Relevant layout / overflow rules:**

- `.table-container` is `display:flex`, `flex-direction:column`, `height:100%`, `overflow:hidden`.
- `.dms-outer-scroller` is `flex:1`, `overflow-y:auto`, `overflow-x:hidden`.
- `.dms-table-scroll-container` is `display:flex`, `flex-direction:column`, `overflow-x:auto`, `overflow-y:hidden`, `min-width:0`.
- `.dms-table-header` is `flex-shrink:0`.
- `.dms-table-body` is `min-width:100%`, `overflow-y:visible`, `overflow-x:hidden`.
- `.dms-header-row` and `.dms-body-row` are flex rows with `min-width:100%`.
- `.dms-header-cell` and `.dms-body-cell` use exact `[style.width.px]` bindings with `flex-grow:0`, `flex-shrink:0`.
- `.dms-col-spacer` is `flex:1 0 auto`, preserving header/body width parity by absorbing spare width.

**Intended vs actual runtime ownership:**

- Intended by comments: vertical scroll on `.dms-outer-scroller`, horizontal scroll on `.dms-table-scroll-container`, disconnected header above body.
- Actual runtime: vertical scroll is still on `.dms-outer-scroller`, and horizontal scroll is still on `.dms-table-scroll-container`, but the header is not outside the vertical scroll subtree. Because `.dms-table-header` sits inside `.dms-table-scroll-container`, and that container sits inside `.dms-outer-scroller`, vertical scroll moves the header.

### AC2 — Narrow and wide viewport behaviour reproduced via Playwright MCP

Playwright MCP observations were captured against **Universe** after seeding 60 scroll rows via the existing e2e helper. Universe alone fully exposes the regression; no secondary consumer was required.

**Narrow viewport**
Screen: Universe
Viewport: 800px
Header behaviour:
- At rest, header top is `128px`.
- After vertical scroll (`.dms-outer-scroller.scrollTop = 300`), header top becomes `-172px`.
- After horizontal scroll (`.dms-table-scroll-container.scrollLeft ≈ 1015.2`), header left shifts from `152px` to `-863px`.
Body behaviour:
- First row top moves from `218px` to `-82px` during vertical scroll, matching the header's `300px` vertical shift.
- Header and body move together horizontally: after max horizontal scroll both header and body left edges are `-863px`.
Vertical scrollbar position:
- At rest, `.dms-outer-scroller` right edge is `624px`.
- After horizontal scroll, `.dms-outer-scroller` right edge is still `624px`.
Evidence:
- `.dms-outer-scroller` keeps `scrollTop` `0 -> 300` while `.dms-table-scroll-container.scrollTop` stays `0`.
- `.dms-table-scroll-container` keeps `scrollLeft` `0 -> 1015.2` while `.dms-outer-scroller.scrollLeft` stays `0`.
- This proves the scrollbar stays pinned on the outer container, but the disconnected header still rides inside the vertical scroll subtree.

**Wide viewport**
Screen: Universe
Viewport: 1800px
Header behaviour:
- At rest, header top is `128px`.
- After vertical scroll (`.dms-outer-scroller.scrollTop = 300`), header top becomes `-172px` again.
- After horizontal scroll (`.dms-table-scroll-container.scrollLeft ≈ 375.2`), header left shifts from `312px` to `-63px`.
Body behaviour:
- First row top moves from `218px` to `-82px` during vertical scroll, again matching the header's vertical movement.
- Header and body remain horizontally aligned after scroll: both left edges move to `-63px`.
Vertical scrollbar position:
- At rest, `.dms-outer-scroller` right edge is `1424px`.
- After horizontal scroll, `.dms-outer-scroller` right edge is still `1424px`.
Evidence:
- `.dms-outer-scroller` keeps `scrollTop` `0 -> 300` while `.dms-table-scroll-container.scrollTop` stays `0`.
- `.dms-table-scroll-container` keeps `scrollLeft` `0 -> 375.2` while `.dms-outer-scroller.scrollLeft` stays `0`.
- Universe remains horizontally scrollable even at 1800px because the table content still exceeds the visible content area.

**Observed conclusion:** current regression is **not** scrollbar drift. The vertical scrollbar already stays pinned on `.dms-outer-scroller`. The failure is that the disconnected header is structurally nested inside the outer vertical scroll region, so vertical scroll moves header and body together.

### AC3 — Fix approach documented with exact container / overflow changes

**Vertical scroll ownership:** keep vertical scrolling on `.dms-outer-scroller`.

- Evidence: its right edge stays stable at `624px` on the 800px viewport and `1424px` on the 1800px viewport, even after max horizontal scroll.
- Moving vertical scroll back to `.dms-table-body` or `.dms-table-scroll-container` would reintroduce Story 112's scrollbar-placement regressions.

**Horizontal scroll ownership:** keep horizontal scrolling on the inner table scroll container, but decouple header from the outer vertical scroll subtree.

- Evidence: `.dms-table-scroll-container.scrollLeft` changes while `.dms-outer-scroller.scrollLeft` stays `0`, and header/body currently remain horizontally aligned.
- Story 114.2 should preserve this horizontal ownership pattern while changing the container hierarchy.

**Exact implementation surface for Story 114.2:**

- HTML: [apps/dms-material/src/app/shared/components/base-table/base-table.component.html](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.html)
- SCSS: [apps/dms-material/src/app/shared/components/base-table/base-table.component.scss](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.scss)
- TS: [apps/dms-material/src/app/shared/components/base-table/base-table.component.ts](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.ts)

**Precise container / overflow change set:**

1. Move `.dms-table-header` out of `.dms-outer-scroller` so vertical scroll no longer translates the header.
2. Keep `.dms-outer-scroller` as the body-region vertical scroll owner with `overflow-y:auto` and `overflow-x:hidden`.
3. Keep the body-region horizontal scroll inside the inner scroll container that wraps the CDK viewport.
4. Add a dedicated header wrapper above `.dms-outer-scroller` with horizontal clipping only; do not place it inside any vertical scroll container.
5. Mirror body horizontal scroll position into the header wrapper from `base-table.component.ts` so the disconnected header stays horizontally aligned with body columns without restoring `position: sticky`.

**Most likely Story 114.2 selectors / responsibilities:**

- HTML:
  - extract `.dms-table-header` into a sibling header wrapper above `.dms-outer-scroller`
  - keep `.dms-table-body` under the body-region inner horizontal scroller only
- TS:
  - add ViewChild access for header wrapper and horizontal scroller
  - sync header horizontal offset from body scroll events in `ngAfterViewInit()`
  - clean up event subscriptions with existing `DestroyRef`
- SCSS:
  - preserve `.dms-outer-scroller` overflow rules
  - add header wrapper clipping / sizing rules
  - preserve `.dms-col-spacer`, exact pixel width bindings, and `min-width:100%` row behaviour so header/body width parity survives

**Regression constraints Story 114.2 must preserve:**

- Do not restore `position: sticky`.
- Do not move vertical scrolling off `.dms-outer-scroller`.
- Do not add layout containment to the viewport or scroll ancestors.
- Do not create double horizontal scrollbars.
- Preserve `.dms-col-spacer` behaviour and exact width parity between header and body columns.
- Preserve CDK virtual-scroll behaviour and `cdkVirtualScrollingElement` delegation.

### Quality Gate

- No production source files were modified during this story.
- `pnpm all` completed successfully.
- Nx reported `No tasks were run` for both affected phases because only the story markdown artifact changed relative to `main`; this is the expected outcome for a documentation-only investigation story.

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

- [x] Base-table scroll-container ownership documented
- [x] Narrow and wide viewport behaviour reproduced via Playwright MCP
- [x] Fix approach documented with explicit container / overflow changes
- [x] No production code changed; `pnpm all` passes

## Dev Agent Record

### Agent Model Used

GPT-5.4 (GitHub Copilot)

### Debug Log References

- Base-table template, SCSS, and TS triad read in full during investigation.
- Existing Story 112 investigation and `base-table-layout-regression.spec.ts` reviewed to compare intended post-112 behaviour against current runtime.
- Playwright MCP DOM measurements captured on Universe at 800px and 1800px viewports during this session.
- Session log: `/home/copilot/.config/Code/User/workspaceStorage/1d82b59183b3ee580029abc5e9ac7df1/GitHub.copilot-chat/debug-logs/5792d385-2fcb-4a46-b132-73584454b809`

### Completion Notes List

- Current runtime keeps vertical scroll on `.dms-outer-scroller` and horizontal scroll on `.dms-table-scroll-container`.
- Current regression root cause is structural: `.dms-table-header` remains inside the outer vertical scroll subtree, so the disconnected header scrolls vertically with content.
- Current runtime does **not** show scrollbar drift; outer scroller right edge remains stable on both narrow and wide viewports.
- Story 114.2 should preserve outer-scrollbar ownership and move only the header out of the vertical scroll subtree, with explicit horizontal sync between body scroll and header offset.
- QA workflow gate logic was updated during this story so investigation-only stories can be reviewed from artifact evidence when no implementation diff exists.
- No production source files were modified during investigation.
- `pnpm all` passed; Nx affected detected no runnable targets because the investigation changed only story markdown.

### File List

- `.github/agents/gate.agent.md`
- `_bmad-output/implementation-artifacts/114-1-investigate-disconnected-header-scroll-layout.md`

## Change Log

| Date | Change | Author |
| --- | --- | --- |
| 2026-05-30 | Investigation findings recorded for current disconnected-header regression; `pnpm all` passed with no affected targets | Dev Agent |
