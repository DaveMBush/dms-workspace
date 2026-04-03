# Story 48.2: Calculate Split Ratio from Open Position and CSV Data

Status: Approved

## Story

As a trader,
I want the split ratio to be automatically derived from existing position data and the CSV post-split quantity,
so that the correct adjustment factor is applied without manual input.

## Acceptance Criteria

1. **Given** a reverse split for OXLC where the CSV post-split quantity is 306 and the total current open position quantity across all lots is 1530, **When** the ratio is calculated as `1530 / 306`, **Then** the system determines a ratio of 5 (i.e., a 1-for-5 reverse split).
2. **Given** a forward split where the current open quantity is 100 and the CSV post-split quantity is 200, **When** the ratio is calculated as `100 / 200 = 0.5`, **Then** the system correctly identifies it as a 2-for-1 forward split.
3. **Given** no open lots exist for the split symbol at the time of processing, **When** the ratio calculation is attempted, **Then** the split row is skipped with a warning logged and no exception is thrown.
4. **Given** all changes, **When** `pnpm all` runs, **Then** all unit tests (including new unit tests for ratio calculation) pass.

## Tasks / Subtasks

- [ ] Confirm Story 48.1 is complete (split detection in place) before starting
- [ ] Implement `calculateSplitRatio(symbol, csvPostSplitQuantity)` service function (AC: #1, #2)
  - [ ] Query the database for all open lots for the given symbol
  - [ ] Sum the quantities of all open lots → `totalCurrentOpenQuantity`
  - [ ] Compute `ratio = totalCurrentOpenQuantity / csvPostSplitQuantity`
  - [ ] Return the ratio (a float — 5.0 for a 1:5 reverse split, 0.5 for a 2:1 forward split)
- [ ] Handle the "no open lots" edge case gracefully (AC: #3)
  - [ ] If `totalCurrentOpenQuantity === 0`, log a warning and return `null` or skip
  - [ ] Caller must check for null and skip in that case
- [ ] Write unit tests for ratio calculation (AC: #4)
  - [ ] Test: 1530 shares open, csv qty 306 → ratio 5 (reverse split 1:5)
  - [ ] Test: 100 shares open, csv qty 200 → ratio 0.5 (forward split 2:1)
  - [ ] Test: exact whole number outcome (1000 / 500 = 2)
  - [ ] Test: no open lots → returns null / skips with warning log
  - [ ] Test: single lot open position
  - [ ] Test: multiple lots summed correctly
- [ ] Run `pnpm all` and confirm all tests pass (AC: #4)

## Dev Notes

### Key Formula

```
ratio = totalCurrentOpenQuantity / csvPostSplitQuantity
```

- ratio > 1 → reverse split (shares reduced, price increased)
- ratio < 1 → forward split (shares increased, price reduced)
- ratio = 1 → no change (should not happen but handle gracefully)

### Key Commands

- Run all tests: `pnpm all`
- Run unit tests: `pnpm test`

### Key File Locations

- Server source: `apps/server/src/`
- CSV import service: search for `csv`, `import` in `apps/server/src/`
- Open lots table/model: search in Prisma schema — `prisma/schema.prisma` — for a table tracking open share lots

### Tech Stack

- Fastify backend, Prisma ORM, TypeScript
- Open lots query: `prisma.lot.findMany({ where: { symbol, isSold: false } })` (adjust model name to match schema)
- Sum quantities: `lots.reduce((sum, lot) => sum + lot.quantity, 0)`

### Rules

- Story 48.1 must be complete before starting
- Do not modify test files
- Ratio calculation must handle both forward and reverse splits correctly

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-03.md]
- [Source: prisma/schema.prisma]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
