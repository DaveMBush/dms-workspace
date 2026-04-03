# Story 45.2: Verify Dividend Data Correctness After Yahoo Finance Removal

Status: Approved

## Story

As a trader,
I want to confirm that all dividend information displayed in the app remains correct after the Yahoo Finance code removal,
so that my yield calculations and income projections stay accurate.

## Acceptance Criteria

1. **Given** Yahoo Finance dividend code has been removed (Story 45.1 complete), **When** the Universe screen loads, **Then** current dividend values are populated and visible for securities that have data on dividendhistory.org.
2. **Given** the Account screens load, **When** dividend information is displayed, **Then** values are present, non-null, and consistent with dividendhistory.org data.
3. **Given** all changes, **When** `pnpm all` runs, **Then** all unit and integration tests pass.

## Tasks / Subtasks

- [ ] Confirm Story 45.1 is complete before starting
- [ ] Trigger a dividend data refresh/update cycle (simulate or use existing scheduled process) (AC: #1, #2)
- [ ] Open the Universe screen and verify that current dividend values are populated for known dividend-paying securities (AC: #1)
  - [ ] Pick 3-5 known securities (e.g., OXLC, AGNC, or similar) and confirm dividend values are shown
  - [ ] Confirm no null/empty dividend cells where data is expected
- [ ] Open Account screens and verify dividend information is visible (AC: #2)
  - [ ] Check Account > Open Positions dividend-related columns
  - [ ] Confirm values are consistent with what dividendhistory.org reports
- [ ] Run `pnpm all` and confirm all tests pass (AC: #3)

## Dev Notes

### Key Commands

- Run all tests: `pnpm all`
- Start server: `pnpm start:server`
- Run chromium e2e (smoke test): `pnpm run e2e:dms-material:chromium`

### Key File Locations

- dividendhistory.org service: search for `dividendhistory` in `apps/server/src/`
- Epic 34 story for dividend update process: `_bmad-output/implementation-artifacts/34-3-wire-new-service-into-dividend-update-process.md`

### Rules

- Story 45.1 must be fully complete before starting
- Do not modify test files
- If a security doesn't have data on dividendhistory.org, a null value is acceptable — only fail if data is clearly missing when it should be present

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-03.md]
- [Source: _bmad-output/implementation-artifacts/34-3-wire-new-service-into-dividend-update-process.md]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
