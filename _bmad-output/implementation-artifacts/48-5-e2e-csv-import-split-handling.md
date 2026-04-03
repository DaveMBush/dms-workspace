# Story 48.5: E2E Tests for CSV Import Split Handling

Status: Approved

## Story

As a developer,
I want end-to-end tests for the complete CSV import split handling workflow,
so that split processing correctness is continuously verified and cannot regress silently.

## Acceptance Criteria

1. **Given** a test CSV file containing an OXLC 1-for-5 reverse split row and a precondition of 1530 open OXLC shares across multiple lots, **When** the CSV import is executed (via the UI or API), **Then** the resulting OXLC open position shows 306 shares with per-share prices adjusted by factor 5.
2. **Given** the test CSV also contains an "IN LIEU OF FRX SHARE" row for OXLC, **When** the import completes, **Then** only one fractional sale record exists for the remainder — the "IN LIEU" row did not create a duplicate.
3. **Given** the import is complete, **When** the Account > Open Positions screen is loaded, **Then** the OXLC position reflects the correct post-split quantity (306) and adjusted cost basis.
4. **Given** all e2e tests, **When** `pnpm run e2e:dms-material:chromium` is run, **Then** all CSV split import tests pass with zero failures.
5. **Given** the new tests are added, **When** `pnpm all` runs, **Then** no existing tests regress.

## Tasks / Subtasks

- [ ] Confirm Stories 48.1–48.4 are all complete before starting
- [ ] Create a test CSV fixture file for the OXLC 1-for-5 reverse split scenario (AC: #1, #2)
  - [ ] Include the split row (description contains "REVERSE SPLIT", symbol OXLC, qty 306)
  - [ ] Include the "IN LIEU OF FRX SHARE" row for the fractional remainder
  - [ ] Pre-condition: seed the database with 1530 total OXLC shares across multiple lots
- [ ] Write Playwright e2e test: import the fixture CSV, assert post-split OXLC qty = 306 (AC: #1)
  - [ ] Use the UI import flow or the API endpoint — whichever is more stable for e2e testing
  - [ ] After import: navigate to Account > Open Positions and assert OXLC position
- [ ] Assert in-lieu row did not create a duplicate sale (AC: #2)
  - [ ] Query or navigate to sold positions / transaction history
  - [ ] Confirm only one fractional sale record for OXLC remainder
- [ ] Assert Account > Open Positions screen shows correct post-split data (AC: #3)
  - [ ] Qty = 306
  - [ ] Cost basis per share is 5x the original (within rounding tolerance)
- [ ] Write an additional test for a forward split if feasible (bonus but encouraged)
- [ ] Run `pnpm run e2e:dms-material:chromium` and confirm all new tests pass (AC: #4)
- [ ] Run `pnpm all` and confirm no regressions (AC: #5)

## Dev Notes

### Test Data (OXLC 1-for-5 Reverse Split)

Pre-condition lots to seed:
- Lot 1: 500 OXLC shares at $4.00/share (bought 2024-01-15)
- Lot 2: 500 OXLC shares at $3.80/share (bought 2024-03-01)
- Lot 3: 530 OXLC shares at $3.60/share (bought 2024-06-01)
- Total: 1530 shares

CSV rows to import:
```
<Symbol>,<Date>,<Description>,<Quantity>,<Price>,<Amount>
OXLC,2025-09-08,"REVERSE SPLIT R/S FROM 691543102#REOR M005168075001",306,,
OXLC,2025-09-08,"IN LIEU OF FRX SHARE EU PAYOUT...",,, 0.36
```

Expected post-import state:
- Open OXLC position: 306 shares
- Lot 1: 100 shares at $20.00/share
- Lot 2: 100 shares at $19.00/share
- Lot 3: 106 shares at $18.00/share
- 1 fractional sale record for ~0 remainder (1530/5 = 306.0 — no remainder in this case)

### Key Commands

- Run chromium e2e: `pnpm run e2e:dms-material:chromium`
- Run all tests: `pnpm all`

### Key File Locations

- E2E test directory: `apps/dms-material-e2e/src/`
- E2E fixture directory: search for `fixtures` in `apps/dms-material-e2e/`
- CSV import UI: search for `import` in `apps/dms-material/src/`

### Tech Stack

- Playwright 1.55.1
- Use Playwright MCP server to find the correct UI elements for file upload and data verification
- File upload: `page.setInputFiles(selector, filePath)` for CSV upload

### Rules

- All stories 48.1–48.4 must be complete before starting
- Do not modify existing test files
- Create a clean test fixture CSV file for split scenarios

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-03.md]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
