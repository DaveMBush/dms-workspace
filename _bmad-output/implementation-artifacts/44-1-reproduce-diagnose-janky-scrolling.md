# Story 44.1: Reproduce and Diagnose Janky Scrolling with Playwright

Status: Approved

## Story

As a developer,
I want to reproduce the janky scrolling issue using the Playwright MCP server and identify its root cause,
so that I can apply a targeted, permanent fix.

## Acceptance Criteria

1. **Given** the Playwright MCP server is connected and a data table screen is open, **When** the developer programmatically scrolls through a data table (e.g., the Universe screen or Dividend Deposits), **Then** the scrolling stutter / jank is observable and reproducible in the Playwright session.
2. **Given** the jank is reproducible, **When** the rendering strategy, change detection cycle, virtual scroll configuration, and CSS are inspected, **Then** the specific root cause is identified and documented (code comment or investigation note).

## Tasks / Subtasks

- [ ] Use the Playwright MCP server to open the Universe screen and programmatically scroll through the table (AC: #1)
  - [ ] Observe and capture evidence of the scrolling jank
  - [ ] Repeat on at least two other table screens (e.g., Account > Open Positions, Dividend Deposits)
- [ ] Review Epic 31 findings (`31-1-reproduce-and-root-cause-the-header-jumping-issue.md`, `31-2-implement-and-verify-the-virtual-scroll-header-fix.md`) to understand what was attempted previously (AC: #2)
- [ ] Inspect virtual scroll configuration — row heights, `cdkFixedSizeVirtualScroll` or `cdkAutoSizeVirtualScroll`, buffer sizes (AC: #2)
- [ ] Inspect change detection — confirm all table components use `OnPush`; check for unnecessary `markForCheck()` calls in scroll handlers (AC: #2)
- [ ] Inspect CSS — check for CSS transitions, animations, or layout-triggering properties on scroll (AC: #2)
- [ ] Document root cause in an investigation note or code comment (AC: #2)
- [ ] Run `pnpm all` to confirm no regressions from read-only investigation (AC: no changes expected)

## Dev Notes

### Background

This issue was previously targeted in Epic 31 (stories 31-1 and 31-2) but the fix did not resolve it completely. The jank continues across ALL data tables in the application, not just one screen. Refer to the Epic 31 story files for context on what was tried previously.

### Key Commands

- Run all tests: `pnpm all`
- E2E: `pnpm run e2e:dms-material:chromium`

### Key File Locations

- Epic 31 story files: `_bmad-output/implementation-artifacts/31-1-reproduce-and-root-cause-the-header-jumping-issue.md`
- Epic 31 story files: `_bmad-output/implementation-artifacts/31-2-implement-and-verify-the-virtual-scroll-header-fix.md`
- Base table component: search for `BaseTableComponent` or `base-table` in `apps/dms-material/src/`
- Virtual scroll usage: search for `cdk-virtual-scroll` in the Angular templates

### Tech Stack

- Angular CDK Virtual Scroll (`@angular/cdk/scrolling`)
- Angular 21 zoneless with `OnPush` change detection
- SmartNgRX / SmartSignals for lazy data loading

### Rules

- This story is investigation-only — do not make implementation changes
- Document findings clearly so Story 44.2 has a clear starting point

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-03.md]
- [Source: _bmad-output/implementation-artifacts/31-1-reproduce-and-root-cause-the-header-jumping-issue.md]
- [Source: _bmad-output/implementation-artifacts/31-2-implement-and-verify-the-virtual-scroll-header-fix.md]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
