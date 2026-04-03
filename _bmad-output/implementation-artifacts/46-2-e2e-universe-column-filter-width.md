# Story 46.2: Verify Column Filter Fix with Playwright E2E Tests

Status: Approved

## Story

As a developer,
I want Playwright e2e tests that verify column filter width behaviour on the Universe screen,
so that filter clipping cannot regress unnoticed.

## Acceptance Criteria

1. **Given** the Playwright MCP server is used to verify the fix, **When** a column filter is activated on a narrow Universe screen column, **Then** the filter input is fully visible within the column bounds with no overflow or clipping.
2. **Given** e2e tests are written using the Playwright MCP server, **When** `pnpm run e2e:dms-material:chromium` is run, **Then** all new column filter width tests pass.
3. **Given** the new tests are added, **When** `pnpm all` runs, **Then** no existing tests regress.

## Tasks / Subtasks

- [ ] Use Playwright MCP server to activate column filters on narrow Universe screen columns and confirm visual containment (AC: #1)
  - [ ] Identify at least two narrow columns on the Universe screen to test
  - [ ] Confirm Story 46.1 fix is visible: filter input does not overflow the column boundary
- [ ] Write Playwright e2e test: activate filter on narrow column 1, assert filter input bounding box is within column bounding box (AC: #2)
- [ ] Write Playwright e2e test: activate filter on narrow column 2, assert same containment (AC: #2)
- [ ] Run `pnpm run e2e:dms-material:chromium` and confirm all new tests pass (AC: #2)
- [ ] Run `pnpm all` and confirm no regressions (AC: #3)

## Dev Notes

### Key Commands

- Run chromium e2e: `pnpm run e2e:dms-material:chromium`
- Run all tests: `pnpm all`

### Key File Locations

- E2E test directory: `apps/dms-material-e2e/src/`
- Existing Universe screen e2e tests for structural reference: search for `universe` in `apps/dms-material-e2e/src/`

### Tech Stack

- Playwright 1.55.1
- Use Playwright MCP server to create tests interactively
- Bounding box assertion: `const filterBox = await filterLocator.boundingBox(); const colBox = await colLocator.boundingBox(); expect(filterBox.x).toBeGreaterThanOrEqual(colBox.x);`

### Rules

- Story 46.1 must be fully complete before this story begins
- Tests must cover at least two narrow Universe screen columns
- Do not modify existing test files

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-03.md]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
