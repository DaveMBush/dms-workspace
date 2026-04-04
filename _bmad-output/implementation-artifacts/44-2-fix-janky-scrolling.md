# Story 44.2: Fix Janky Scrolling Implementation

Status: Approved

## Story

As a trader,
I want all data table screens to scroll smoothly without visual stuttering,
so that I can review large lists of data comfortably.

## Acceptance Criteria

1. **Given** the root cause is known from Story 44.1, **When** the fix is applied to all affected table components, **Then** scrolling is visually smooth with no perceptible stutter on any data table.
2. **Given** the fix is applied, **When** the Playwright MCP server is used to scroll through a table, **Then** no rendering jank is observable during the scroll.
3. **Given** all changes, **When** `pnpm all` runs, **Then** all unit tests and existing e2e tests continue to pass with no regressions.

## Tasks / Subtasks

- [x] Review Story 44.1 investigation findings before starting (root cause must be known) (AC: #1)
- [x] Apply the fix to the base table component or shared virtual scroll configuration (AC: #1)
  - [ ] If root cause is row height inconsistency: set fixed, consistent row heights across all tables (see row-height-audit.md)
  - [x] If root cause is change detection: review `OnPush` compliance and reduce unnecessary CD cycles during scroll
  - [x] If root cause is CSS: remove transitions/animations from scroll containers
  - [ ] If root cause is buffer size: tune `minBufferPx`/`maxBufferPx` in CdkVirtualScrollViewport
- [x] Verify fix applies to ALL data table screens — not just one (AC: #1)
  - [x] Universe screen
  - [x] Account > Open Positions screen
  - [x] Account > Sold Positions screen
  - [x] Dividend Deposits screen
  - [x] Any other tables in the app
- [x] Use Playwright MCP server to confirm janky scrolling is no longer observable on each screen (AC: #2)
- [x] Run `pnpm all` and confirm no regressions (AC: #3)

## Dev Notes

### Background

Janky scrolling was targeted in Epic 31 but persists. Story 44.1 must be completed first to identify the specific root cause. The fix should be applied globally (to shared base components) where possible, rather than patching each screen individually.

### Key Commands

- Run all tests: `pnpm all`
- Run unit tests: `pnpm test`
- Run chromium e2e: `pnpm run e2e:dms-material:chromium`

### Key File Locations

- Row height audit: `docs/row-height-audit.md`
- Base table component: search for `BaseTableComponent` or `base-table` in `apps/dms-material/src/`
- Virtual scroll templates: search for `cdk-virtual-scroll-viewport` in Angular templates
- Epic 31 implementation: `_bmad-output/implementation-artifacts/31-2-implement-and-verify-the-virtual-scroll-header-fix.md`

### Tech Stack

- Angular CDK Virtual Scroll with `cdkFixedSizeVirtualScroll` (consistent row heights required)
- Angular 21 zoneless (`OnPush` everywhere, `inject()` pattern)
- SmartNgRX / SmartSignals

### Rules

- Story 44.1 must be fully complete before this story begins
- Fix must not modify test files
- All table screens must be verified — the fix is only complete when ALL screens scroll smoothly

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-03.md]
- [Source: docs/row-height-audit.md]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4.6

### Debug Log References
N/A

### Completion Notes List
- P1 CSS: Added `cdk-virtual-scroll-viewport * { transition: none; }` after the global `* { transition: ... }` rule in `styles.scss` to prevent transitions from firing on every CDK row create/recycle during scroll.
- P1 CSS: Removed `will-change: transform` from `.virtual-scroll-viewport` in `base-table.component.scss`. This property was creating a new stacking context that broke `position: sticky` on header cells and caused compositor-layer churn during scroll.
- P2: Removed `this.visibleRange(); // maintain signal dependency for reactivity` from the `selectOpenPositions` computed in `open-positions-component.service.ts`. The call was creating a signal dependency causing O(n) recomputes at ~10Hz during scroll, but `visibleRange` was never actually used to filter results (dense array pattern already returns all items).
- P2: Same removal from `selectSoldPositions` computed in `sold-positions-component.service.ts`.
- P2: Same removal from `dividends` computed in `dividend-deposits-component.service.ts`.
- P3: Removed `context.cdr.markForCheck()` from the `effect()` in `base-table.component.ts` that tracks `dataSource()`. In Angular 21 zoneless, signal-based effects automatically schedule view updates; the redundant `markForCheck()` was adding an extra CD cycle per data recompute. Also removed the unused `ChangeDetectorRef` import and `cdr` field.

### File List
- `apps/dms-material/src/styles.scss`
- `apps/dms-material/src/app/shared/components/base-table/base-table.component.scss`
- `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`
- `apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts`
- `apps/dms-material/src/app/account-panel/sold-positions/sold-positions-component.service.ts`
- `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits-component.service.ts`
- `_bmad-output/implementation-artifacts/44-2-fix-janky-scrolling.md`
