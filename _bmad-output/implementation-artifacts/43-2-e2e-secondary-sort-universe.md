# Story 43.2: Write Playwright E2E Tests for Secondary Sort

Status: Approved

## Story

As a developer,
I want Playwright e2e tests that verify multi-column sort on the Universe screen,
so that secondary sort behaviour cannot silently regress.

## Acceptance Criteria

1. **Given** the Universe screen is open with data loaded, **When** the Playwright test clicks a primary sort column and then Shift+clicks a secondary sort column, **Then** the test asserts that rows with equal primary values appear in the correct secondary-sort order.
2. **Given** the Playwright MCP server is used to create and run the tests, **When** `pnpm run e2e:dms-material:chromium` is executed, **Then** all new secondary sort tests pass with zero failures.
3. **Given** the secondary sort tests are added, **When** `pnpm all` runs, **Then** no existing tests regress.

## Tasks / Subtasks

- [ ] Use the Playwright MCP server to interact with the Universe screen and observe multi-column sort behaviour (AC: #1)
  - [ ] Identify a column with naturally duplicate values suitable for secondary sort verification
  - [ ] Confirm Story 43.1 fix is complete before writing tests
- [ ] Write Playwright e2e test for descending secondary sort scenario (AC: #1, #2)
  - [ ] Click primary sort column → verify primary order → Shift+click secondary column
  - [ ] Assert rows with equal primary values are sub-ordered by secondary column descending
- [ ] Write Playwright e2e test for ascending secondary sort scenario (AC: #1, #2)
- [ ] Run `pnpm run e2e:dms-material:chromium` and confirm all new tests pass (AC: #2)
- [ ] Run `pnpm all` and confirm no regressions (AC: #3)

## Dev Notes

### Key Commands

- Run chromium e2e tests: `pnpm run e2e:dms-material:chromium`
- Run all tests: `pnpm all`

### Key File Locations

- E2E test directory: `apps/dms-material-e2e/src/`
- Existing sort tests for reference: search for `sort` in `apps/dms-material-e2e/src/`

### Tech Stack

- E2E: Playwright 1.55.1
- Use the Playwright MCP server to reproduce interactions and generate test code
- Shift+click in Playwright: `page.keyboard.down('Shift')` then `locator.click()` then `page.keyboard.up('Shift')`

### Rules

- Do not modify existing test files — only add new ones
- Story 43.1 must be fully complete before this story begins
- Tests must cover at least one ascending and one descending secondary sort scenario

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-03.md]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
