# Story 43.2: Write Playwright E2E Tests for Secondary Sort

Status: Done

## Story

As a developer,
I want Playwright e2e tests that verify multi-column sort on the Universe screen,
so that secondary sort behaviour cannot silently regress.

## Acceptance Criteria

1. **Given** the Universe screen is open with data loaded, **When** the Playwright test clicks a primary sort column and then Shift+clicks a secondary sort column, **Then** the test asserts that rows with equal primary values appear in the correct secondary-sort order.
2. **Given** the Playwright MCP server is used to create and run the tests, **When** `pnpm run e2e:dms-material:chromium` is executed, **Then** all new secondary sort tests pass with zero failures.
3. **Given** the secondary sort tests are added, **When** `pnpm all` runs, **Then** no existing tests regress.

## Tasks / Subtasks

- [x] Use the Playwright MCP server to interact with the Universe screen and observe multi-column sort behaviour (AC: #1)
  - [x] Identify a column with naturally duplicate values suitable for secondary sort verification
  - [x] Confirm Story 43.1 fix is complete before writing tests
- [x] Write Playwright e2e test for descending secondary sort scenario (AC: #1, #2)
  - [x] Click primary sort column → verify primary order → Shift+click secondary column
  - [x] Assert rows with equal primary values are sub-ordered by secondary column descending
- [x] Write Playwright e2e test for ascending secondary sort scenario (AC: #1, #2)
- [x] Run `pnpm run e2e:dms-material:chromium` and confirm all new tests pass (AC: #2)
- [x] Run `pnpm all` and confirm no regressions (AC: #3)

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
- Shift+click in Playwright: `locator.click({ modifiers: ['Shift'] })`

### Rules

- Do not modify existing test files — only add new ones
- Story 43.1 must be fully complete before this story begins
- Tests must cover at least one ascending and one descending secondary sort scenario

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-03.md]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

None

### Completion Notes List

- Reused `seedUniverseE2eData()` helper which seeds UAAA (Equities, ex_date=2026-06-15) and UDDD (Equities, ex_date=2026-04-15) — both sharing the same primary sort value (Risk Group), making them ideal for secondary sort assertions.
- Used `click({ modifiers: ['Shift'] })` pattern consistent with existing e2e test conventions in the codebase.
- Descending scenario: 2 Shift+clicks on Ex-Date header (first = asc, second = desc).
- Did not modify any existing test files.

### File List

- `apps/dms-material-e2e/src/universe-secondary-sort.spec.ts` (new)

## Change Log

| Date       | Change                                                                                                                            | Author    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 2026-04-03 | Created `universe-secondary-sort.spec.ts` with descending and ascending secondary sort E2E tests for Universe screen (Story 43.2) | Dev Agent |
