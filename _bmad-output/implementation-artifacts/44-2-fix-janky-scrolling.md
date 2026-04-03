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

- [ ] Review Story 44.1 investigation findings before starting (root cause must be known) (AC: #1)
- [ ] Apply the fix to the base table component or shared virtual scroll configuration (AC: #1)
  - [ ] If root cause is row height inconsistency: set fixed, consistent row heights across all tables (see row-height-audit.md)
  - [ ] If root cause is change detection: review `OnPush` compliance and reduce unnecessary CD cycles during scroll
  - [ ] If root cause is CSS: remove transitions/animations from scroll containers
  - [ ] If root cause is buffer size: tune `minBufferPx`/`maxBufferPx` in CdkVirtualScrollViewport
- [ ] Verify fix applies to ALL data table screens — not just one (AC: #1)
  - [ ] Universe screen
  - [ ] Account > Open Positions screen
  - [ ] Account > Sold Positions screen
  - [ ] Dividend Deposits screen
  - [ ] Any other tables in the app
- [ ] Use Playwright MCP server to confirm janky scrolling is no longer observable on each screen (AC: #2)
- [ ] Run `pnpm all` and confirm no regressions (AC: #3)

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

### Debug Log References

### Completion Notes List

### File List
