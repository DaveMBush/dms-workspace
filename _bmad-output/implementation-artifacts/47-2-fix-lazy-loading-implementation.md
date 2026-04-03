# Story 47.2: Fix SmartNgRX Lazy Loading Implementation

Status: Approved

## Story

As a trader,
I want data tables to fetch only the rows entering the viewport as I scroll,
so that the application remains fast and memory-efficient even with years of data.

## Acceptance Criteria

1. **Given** a data table with hundreds of rows, **When** the table first loads, **Then** only the first viewport-sized page of data is fetched from the server.
2. **Given** the user scrolls down, **When** new rows are about to enter the viewport, **Then** only the next required page is fetched — no bulk request for all remaining rows.
3. **Given** the user stops scrolling mid-table and does not scroll further, **When** network traffic is inspected, **Then** no additional data requests are made beyond the pages already needed for the visible viewport.
4. **Given** the fix is applied to all data tables across all screens, **When** `pnpm all` runs, **Then** all unit tests pass with no regressions.

## Tasks / Subtasks

- [ ] Review Story 47.1 findings (root cause must be known before starting) (AC: #1)
- [ ] Fix the SmartNgRX virtual scroll data-fetch trigger to request only the next page on scroll events (AC: #2)
  - [ ] Fix the page-size calculation so it does not compute "all remaining rows"
  - [ ] Ensure fetches are triggered incrementally based on viewport index changes
- [ ] Apply fix to all data table screens (AC: #2, #4)
  - [ ] Universe screen
  - [ ] Account > Open Positions
  - [ ] Account > Sold Positions
  - [ ] Dividend Deposits (highest priority — most data)
  - [ ] Any other tables in the application
- [ ] Use Playwright MCP server with network interception to confirm bulk-fetch no longer occurs (AC: #2, #3)
  - [ ] Load Dividend Deposits, scroll past first 10 rows — confirm only next page is fetched
  - [ ] Scroll incrementally — confirm one page-sized request per scroll step
  - [ ] Stop scrolling — confirm no additional requests occur
- [ ] Run `pnpm all` and confirm no regressions (AC: #4)

## Dev Notes

### Background

Story 47.1 must be complete before this story. Epic 40 previously attempted this fix but did not resolve the bulk-fetch issue. The root cause from Story 47.1 investigation points to a specific configuration or trigger in SmartNgRX virtual scroll.

### Key Commands

- Run all tests: `pnpm all`
- Run chromium e2e: `pnpm run e2e:dms-material:chromium`

### Key File Locations

- Epic 40 implementation files (prior attempt):
  - `_bmad-output/implementation-artifacts/40-2-implement-lazy-loading-universe-screen-table.md`
  - `_bmad-output/implementation-artifacts/40-3-implement-lazy-loading-account-tables.md`
- SmartNgRX docs / source: check `node_modules/@smarttools/` for virtual scroll configuration options
- Table components: search for `cdk-virtual-scroll` in `apps/dms-material/src/`

### Tech Stack

- SmartNgRX / SmartSignals lazy loading
- Angular CDK Virtual Scroll (`CdkVirtualScrollViewport`)
- Angular 21 zoneless, `OnPush`, signal-first
- Key config options to investigate: page size, buffer configuration, scroll index change debounce

### Rules

- Story 47.1 must be fully complete before starting
- Fix must be applied to ALL table screens — not just one
- Do not modify test files
- Verify with network traffic inspection (Playwright MCP) not just visual inspection

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-03.md]
- [Source: _bmad-output/implementation-artifacts/40-2-implement-lazy-loading-universe-screen-table.md]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
