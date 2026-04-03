# Story 44.3: Verify Scrolling Fix and Write E2E Tests with Playwright

Status: Approved

## Story

As a developer,
I want Playwright e2e tests that verify smooth scrolling on all major data table screens,
so that the janky scrolling regression cannot go undetected.

## Acceptance Criteria

1. **Given** the Playwright MCP server is used to verify the fix on all major table screens, **When** each table is scrolled end-to-end, **Then** no stutter or rendering jank is detected.
2. **Given** e2e tests are written using the Playwright MCP server, **When** `pnpm run e2e:dms-material:chromium` is run, **Then** all new scrolling tests pass.
3. **Given** the new tests are added, **When** `pnpm all` runs, **Then** no existing tests regress.

## Tasks / Subtasks

- [ ] Use the Playwright MCP server to verify fix on all major table screens (AC: #1)
  - [ ] Universe screen: scroll full list end-to-end; confirm no visual jank
  - [ ] Account > Open Positions: scroll full list; confirm no visual jank
  - [ ] Dividend Deposits: scroll full list (high data volume); confirm no visual jank
  - [ ] Account > Sold Positions: scroll full list; confirm no visual jank
- [ ] Write Playwright e2e tests for smooth scrolling on the Universe screen (AC: #2)
  - [ ] Test: load universe, scroll to bottom, assert rendered rows change correctly
  - [ ] Assert scroll performance (no exceptions, no blank rows)
- [ ] Write Playwright e2e tests for Account > Open Positions scroll (AC: #2)
- [ ] Write Playwright e2e tests for Dividend Deposits scroll (AC: #2)
- [ ] Run `pnpm run e2e:dms-material:chromium` and confirm all new scrolling tests pass (AC: #2)
- [ ] Run `pnpm all` and confirm no regressions (AC: #3)

## Dev Notes

### Key Commands

- Run chromium e2e: `pnpm run e2e:dms-material:chromium`
- Run all tests: `pnpm all`

### Key File Locations

- E2E test directory: `apps/dms-material-e2e/src/`
- Existing scroll tests for reference (Epic 29): `_bmad-output/implementation-artifacts/29-2-verify-smooth-scrolling-on-all-tables-with-playwright.md`

### Tech Stack

- Playwright 1.55.1
- Use Playwright MCP server to create tests interactively
- Playwright scroll: `page.mouse.wheel()` or `locator.scrollIntoViewIfNeeded()` for element scroll; `page.evaluate(() => container.scrollTop = N)` for programmatic scroll

### Rules

- Story 44.2 must be fully complete before this story begins
- Tests must cover at least Universe screen, Account > Open Positions, and Dividend Deposits
- Do not modify existing test files

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-03.md]
- [Source: _bmad-output/implementation-artifacts/29-2-verify-smooth-scrolling-on-all-tables-with-playwright.md]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
