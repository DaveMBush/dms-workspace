# Story 114.2: Implement Disconnected-Header Layout and Scrollbar Ownership Fix

Status: Approved

**Story Key:** `114-2-implement-disconnected-header-layout-fix`
**Epic:** 114 — Fix Disconnected-Header Table Layout and Scrollbar Behavior
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-30.md](../planning-artifacts/epics-2026-05-30.md) (Story 114.2)
**Type:** Implementation
**Depends on:** Story 114.1
**Enables:** Story 114.3
**Requirements covered:** R1, R2, R3

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Dave,
I want disconnected table headers to stay fixed while the body scrolls with the vertical scrollbar pinned at the far right,
So that the table behaves like it did before the header split while keeping the disconnected-header architecture.

## Epic Context

Epic 114 restores the intended disconnected-header table behavior after the earlier base-table refactor and follow-on layout fixes. Story 114.1 is the investigation and design prerequisite for this implementation story: the implementation must apply the exact container and overflow changes proven there, not invent a new table architecture from scratch.

The shared base-table component is the primary implementation surface. Universe remains the primary reproduction screen because it forces wide-column horizontal scrolling, but the fix must preserve all current `<dms-base-table>` consumers: Universe, Screener, Open Positions, Sold Positions, and Dividend Deposits.

## Acceptance Criteria

1. **AC1 — Narrow viewport fixed-header behavior.** (R1, R2)
   **Given** a viewport narrower than the table,
   **When** Dave scrolls horizontally and vertically,
   **Then** the headers remain fixed in place and the vertical scrollbar remains pinned at the far right of the table area.

2. **AC2 — Wide viewport scrollbar placement.** (R2)
   **Given** a viewport wider than the table,
   **When** the table renders,
   **Then** the vertical scrollbar appears at the far right of the available table area rather than immediately beside the last visible column.

3. **AC3 — Disconnected-header alignment preserved.** (R1, R3)
   **Given** the header and body are rendered as separate regions,
   **When** the table renders or is scrolled,
   **Then** header/body columns remain aligned, vertical body scrolling does not pull the header with it, and the implementation does not revert to `position: sticky`.

4. **AC4 — Representative consumers smoke-verified.**
   **Given** the layout fix is applied,
   **When** representative base-table-consuming screens are smoke-tested via the Playwright MCP server,
   **Then** they render correctly with no obvious regressions.

5. **AC5 — Quality gate.** (NFR1)
   **Given** `pnpm all` runs,
   **When** the updated implementation is validated,
   **Then** all tests pass.

## Tasks / Subtasks

- [ ] **Task 1 — Reconfirm the design source and read all update files before editing** (AC: #1, #2, #3)
  - [ ] Read [_bmad-output/implementation-artifacts/114-1-investigate-disconnected-header-scroll-layout.md](./114-1-investigate-disconnected-header-scroll-layout.md) completely and extract the exact scroll-ownership and container/overflow changes it recommends. If that story does not yet contain specific implementation guidance, stop and complete the missing investigation evidence before changing production code.
  - [ ] Read [apps/dms-material/src/app/shared/components/base-table/base-table.component.html](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.html), [apps/dms-material/src/app/shared/components/base-table/base-table.component.scss](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.scss), and [apps/dms-material/src/app/shared/components/base-table/base-table.component.ts](../../apps/dms-material/src/app/shared/components/base-table/base-table.component.ts) in full before editing.
  - [ ] Record in Dev Notes the current roles of `.dms-outer-scroller`, `.dms-table-scroll-container`, `.dms-table-header`, `.dms-table-body`, and `.dms-col-spacer`, plus what must be preserved.
  - [ ] Review [apps/dms-material-e2e/src/base-table-layout-regression.spec.ts](../../apps/dms-material-e2e/src/base-table-layout-regression.spec.ts) and [apps/dms-material-e2e/src/base-table-two-region-regression.spec.ts](../../apps/dms-material-e2e/src/base-table-two-region-regression.spec.ts) so the fix preserves existing invariants instead of fighting them.

- [ ] **Task 2 — Apply the shared base-table layout and scrollbar-ownership fix** (AC: #1, #2, #3)
  - [ ] Modify the shared base-table HTML/SCSS so the header region stays visually fixed while the body scrolls vertically and the far-right scrollbar requirement holds on both narrow and wide layouts.
  - [ ] Keep horizontal scrolling synchronized for header and body through a single owner. Do not introduce double horizontal scrollbars or a JS scroll-sync mechanism unless Story 114.1 proves one is required.
  - [ ] Preserve `.dms-col-spacer` or replace it with an equivalently parity-safe mechanism so header/body widths remain aligned when there is spare horizontal space.
  - [ ] If vertical-scroll ownership changes away from the current `.dms-outer-scroller`, update CDK scroll detection correctly and preserve virtual height calculation.

- [ ] **Task 3 — Preserve virtual-scroll and disconnected-header guardrails** (AC: #3)
  - [ ] Do not reintroduce `position: sticky` on the header region.
  - [ ] Do not add `contain: paint`, `contain: layout`, `contain: strict`, `contain: content`, `transform`, `will-change: transform`, `filter`, `perspective`, or `backdrop-filter` to `.dms-table-body`, the CDK viewport, or any scroll ancestor.
  - [ ] Preserve existing `contextId` / `scrollToIndex(0)` behavior and the stable-array / placeholder-row guardrails in `BaseTableComponent` unless Story 114.1 explicitly proves they must change.
  - [ ] Avoid consumer-specific CSS overrides unless the shared component cannot satisfy the requirement and the reason is documented.

- [ ] **Task 4 — Smoke-verify representative consumers via Playwright MCP** (AC: #4)
  - [ ] Use Universe as the primary reproduction surface at a narrow viewport (for example `800px` width) and a wide viewport (for example `1800px` width).
  - [ ] Verify headers stay fixed, the body scrolls independently, the vertical scrollbar stays at the far right, and column alignment holds during horizontal scrolling.
  - [ ] Smoke-check at least one account-panel consumer such as Open Positions, plus one additional base-table consumer if Universe alone does not exercise the final layout shape.
  - [ ] Record observed pass/fail results and any remaining risk in Dev Notes.

- [ ] **Task 5 — Validation and quality gate** (AC: #5)
  - [ ] Update any focused automated assertions that must change because scroll ownership changed, while leaving broad new regression coverage to Story 114.3.
  - [ ] Run `pnpm all`.

## Dev Notes

### Dependency Gate

- Story 114.1 is the design source of truth for this story. Do not guess at the fix. If 114.1 does not explicitly identify the target scroll owner, exact container hierarchy change, and overflow rule changes, complete that evidence first and only then implement 114.2.

### Current Shared Layout Surface

- `apps/dms-material/src/app/shared/components/base-table/base-table.component.html` currently renders `.table-container > .dms-outer-scroller[cdkVirtualScrollingElement] > .dms-table-scroll-container > .dms-table-header + cdk-virtual-scroll-viewport.dms-table-body`.
- `apps/dms-material/src/app/shared/components/base-table/base-table.component.scss` currently gives `.dms-outer-scroller` `overflow-y: auto` and `.dms-table-scroll-container` `overflow-x: auto`; `.dms-table-body` currently uses `overflow-y: visible` and `overflow-x: hidden`.
- `.dms-col-spacer` is the current width-fill mechanism introduced by Story 112.2. If it changes, the replacement must preserve header/body parity.
- `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts` carries the accumulated scrolling-regression history and structural constraints. Treat those comments as guardrails, not noise.

### Non-Negotiable Guardrails

- **Do not restore sticky headers.** Epic 111 structurally removed `position: sticky`; this story must keep the disconnected-header design.
- **Do not violate the virtual-scroll containment rules.** Architecture documents and prior stories explicitly ban `contain:*` and transform-like properties on the viewport or its scroll ancestors because they break sticky/scroll geometry in Chrome and Firefox.
- **Preserve single-owner horizontal scroll.** The fix must not create header/body drift, double horizontal scrollbars, or separate manual sync paths unless Story 114.1 proves a different structure is necessary.
- **Preserve stable virtual-scroll behavior.** Do not disturb placeholder-row handling, `contextId` reset behavior, or other unrelated scrolling guardrails while fixing this layout issue.

### Likely File Touch List

- **Primary UPDATE targets:**
  - `apps/dms-material/src/app/shared/components/base-table/base-table.component.html`
  - `apps/dms-material/src/app/shared/components/base-table/base-table.component.scss`
  - `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts` (only if scroll delegation or structural comments must change)
- **Potential focused regression updates only if required by the implementation:**
  - `apps/dms-material-e2e/src/base-table-layout-regression.spec.ts`
  - `apps/dms-material-e2e/src/base-table-two-region-regression.spec.ts`
- **Representative consuming screens to smoke-check, not patch first:**
  - `apps/dms-material/src/app/global/global-universe/global-universe.component.html`
  - `apps/dms-material/src/app/global/global-screener/global-screener.component.html`
  - `apps/dms-material/src/app/account-panel/open-positions/open-positions.component.html`
  - `apps/dms-material/src/app/account-panel/sold-positions/sold-positions.component.html`
  - `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.html`

### Architecture & Testing References

- [_bmad-output/planning-artifacts/architecture.md](../planning-artifacts/architecture.md) section `Virtual Scroll & Sticky Header Guardrails` is mandatory reading before changing scroll ownership.
- [_bmad-output/project-context.md](../project-context.md) confirms Angular 21 zoneless, `inject()`, `OnPush`, signal-first patterns, Playwright MCP expectations, and the CSS containment ban for virtual-scroll ancestors.
- Existing guardrail specs already cover important invariants:
  - `apps/dms-material-e2e/src/base-table-two-region-regression.spec.ts` protects the disconnected-header architecture and header/body width parity.
  - `apps/dms-material-e2e/src/base-table-layout-regression.spec.ts` protects far-right scrollbar placement and width-fill behavior.
- Story 114.3 owns broad new regression coverage. Story 114.2 should only update focused assertions that must change as part of the implementation.

### Smoke-Verification Expectations

- Universe is the primary reproduction surface because its column set forces horizontal scrolling.
- Verify both a narrow viewport and a wide viewport. Record header position, body movement, and scrollbar position before and after horizontal scroll.
- Verify at least one account-panel consumer after the shared fix so the change is not accidentally Universe-specific.

### Project Structure Notes

- The fix belongs in the shared base-table component first. Avoid consumer-specific CSS patches unless the shared component cannot satisfy the requirement and the reason is documented.
- Prefer surgical changes to the existing container hierarchy rather than a broad refactor of the base-table component.
- If TS changes are required, preserve Angular 21 standalone, zoneless, `inject()`, and signal-first conventions already used in `BaseTableComponent`.

### References

- Epic source: [_bmad-output/planning-artifacts/epics-2026-05-30.md](../planning-artifacts/epics-2026-05-30.md) — Story 114.2 section
- Story metadata: [_bmad-output/planning-artifacts/story-meta/2026-05-30/114-2-implement-disconnected-header-layout-fix.yaml](../planning-artifacts/story-meta/2026-05-30/114-2-implement-disconnected-header-layout-fix.yaml)
- Previous story: [_bmad-output/implementation-artifacts/114-1-investigate-disconnected-header-scroll-layout.md](./114-1-investigate-disconnected-header-scroll-layout.md)
- Architecture guardrails: [_bmad-output/planning-artifacts/architecture.md](../planning-artifacts/architecture.md)
- Project context: [_bmad-output/project-context.md](../project-context.md)

## Definition of Done

- [ ] Headers remain fixed while body scrolls in the disconnected-header layout
- [ ] Vertical scrollbar stays pinned at the far right on narrow and wide layouts
- [ ] Header/body alignment remains correct after the fix
- [ ] Representative base-table consumers are smoke-verified via Playwright MCP
- [ ] `pnpm all` passes

## Dev Agent Record

### Agent Model Used

*To be filled by dev agent.*

### Debug Log References

*To be filled by dev agent.*

### Completion Notes List

*To be filled by dev agent.*

### File List

*To be filled by dev agent.*
