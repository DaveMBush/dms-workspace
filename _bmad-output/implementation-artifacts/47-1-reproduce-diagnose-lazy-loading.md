# Story 47.1: Reproduce and Diagnose the Lazy Loading Bulk-Fetch Issue

Status: Approved

## Story

As a developer,
I want to reproduce the bulk data fetch using Playwright MCP and network inspection,
so that I can identify the exact code path that triggers loading all remaining rows at once.

## Acceptance Criteria

1. **Given** the Playwright MCP server is connected and browser network dev tools are accessible, **When** a data table (e.g., Dividend Deposits) is loaded and the user scrolls slightly beyond the first 10 rows, **Then** a network request fetching ALL remaining rows (rather than the next page) is observed in the captured network traffic.
2. **Given** the bulk-fetch network request is identified, **When** the SmartNgRX virtual scroll and data-fetch trigger code is traced, **Then** the specific code path and/or configuration value that causes the bulk fetch is identified and documented.

## Tasks / Subtasks

- [ ] Use Playwright MCP server with network request interception to load a data table screen (AC: #1)
  - [ ] Start with Dividend Deposits (highest data volume / risk)
  - [ ] Load the screen and capture all network requests
  - [ ] Scroll slightly past the first 10 visible rows
  - [ ] Confirm in captured network traffic that a bulk request for ALL remaining rows is triggered
- [ ] Repeat network traffic observation on at least two other table screens (AC: #1)
  - [ ] Universe screen
  - [ ] Account > Open Positions
- [ ] Review Epic 40 findings for context (`_bmad-output/implementation-artifacts/40-1-diagnose-root-cause-eager-data-loading.md`) (AC: #2)
- [ ] Trace the SmartNgRX virtual scroll data-fetch trigger in the codebase (AC: #2)
  - [ ] Find where the `scrolled` index change triggers a data load
  - [ ] Identify the condition/calculation that requests all remaining rows instead of the next page
- [ ] Document the root cause (code comment or investigation note committed with Story 47.2) (AC: #2)
- [ ] Run `pnpm all` — confirm no changes needed in this story

## Dev Notes

### Background

This issue was targeted in Epic 40 (stories 40-1 through 40-4) but the lazy loading still loads all remaining rows after the first 10. Review Epic 40 files for what was previously diagnosed and attempted.

### Key Commands

- Run all tests: `pnpm all`

### Key File Locations

- Epic 40 story files:
  - `_bmad-output/implementation-artifacts/40-1-diagnose-root-cause-eager-data-loading.md`
  - `_bmad-output/implementation-artifacts/40-2-implement-lazy-loading-universe-screen-table.md`
  - `_bmad-output/implementation-artifacts/40-3-implement-lazy-loading-account-tables.md`
- SmartNgRX / SmartSignals source: `node_modules/@smarttools/` or linked workspace packages
- Table component with virtual scroll: search for `cdk-virtual-scroll` in `apps/dms-material/src/`
- Lazy-loading diagnosis from Epic 40: `_bmad-output/implementation-artifacts/lazy-loading-diagnosis.md`

### Tech Stack

- SmartNgRX virtual scroll with signal-based lazy data loading
- Angular CDK Virtual Scroll
- Playwright MCP server network interception: `page.on('request', ...)` or `page.route()`

### Rules

- This story is investigation-only — no implementation changes
- Document findings clearly to give Story 47.2 a concrete starting point

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-03.md]
- [Source: _bmad-output/implementation-artifacts/40-1-diagnose-root-cause-eager-data-loading.md]
- [Source: _bmad-output/implementation-artifacts/lazy-loading-diagnosis.md]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
