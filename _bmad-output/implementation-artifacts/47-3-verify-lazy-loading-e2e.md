# Story 47.3: Verify Lazy Loading with Playwright E2E Tests and Network Inspection

Status: Approved

## Story

As a developer,
I want Playwright e2e tests with network traffic assertions that confirm true lazy loading,
so that the bulk-fetch regression is caught automatically if it recurs.

## Acceptance Criteria

1. **Given** the Playwright MCP server with network traffic inspection enabled, **When** a data table is loaded and the user scrolls through it page by page, **Then** network requests are made incrementally (one page-sized request per scroll step) and no single request fetching all remaining rows is made.
2. **Given** e2e tests using the Playwright MCP server with network assertions, **When** `pnpm run e2e:dms-material:chromium` is run, **Then** all new lazy loading tests pass including the network-traffic assertions.
3. **Given** the Dividend Deposits screen (highest data volume risk), **When** the table is loaded and scrolled, **Then** network inspection confirms only incremental page fetches occur throughout the scroll.
4. **Given** the new tests are added, **When** `pnpm all` runs, **Then** no existing tests regress.

## Tasks / Subtasks

- [ ] Confirm Story 47.2 fix is complete before starting
- [ ] Write Playwright e2e test for Universe screen lazy loading with network assertions (AC: #1, #2)
  - [ ] Intercept all API requests during the test
  - [ ] Load Universe screen — assert only one initial page request
  - [ ] Scroll one page — assert exactly one additional page request (not bulk)
  - [ ] Assert no request with a huge row count / no "load all" request occurs
- [ ] Write Playwright e2e test for Account > Open Positions lazy loading (AC: #1, #2)
- [ ] Write Playwright e2e test for Dividend Deposits lazy loading (AC: #3)
  - [ ] This is the highest priority screen due to volume of data
- [ ] Run `pnpm run e2e:dms-material:chromium` and confirm all new tests pass (AC: #2)
- [ ] Run `pnpm all` and confirm no regressions (AC: #4)

## Dev Notes

### Key Commands

- Run chromium e2e: `pnpm run e2e:dms-material:chromium`
- Run all tests: `pnpm all`

### Key File Locations

- E2E test directory: `apps/dms-material-e2e/src/`
- Epic 40 e2e tests (prior attempt): `_bmad-output/implementation-artifacts/40-4-e2e-tests-verifying-lazy-loading-network-traffic.md`

### Tech Stack

- Playwright 1.55.1
- Network interception: `page.route('**/api/**', route => { ... })` or `page.on('request', request => { ... })`
- Validate request URL/params: assert that page size param never equals total count
- Use Playwright MCP server to create tests interactively

### Rules

- Story 47.2 must be fully complete before this story begins
- Tests must include network-traffic assertions (not just visual scroll checks)
- Must cover at minimum: Universe, Account > Open Positions, and Dividend Deposits
- Do not modify existing test files

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-03.md]
- [Source: _bmad-output/implementation-artifacts/40-4-e2e-tests-verifying-lazy-loading-network-traffic.md]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
