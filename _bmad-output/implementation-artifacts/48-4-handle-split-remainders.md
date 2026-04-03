# Story 48.4: Handle Fractional Share Remainders from Splits

Status: Approved

## Story

As a trader,
I want fractional share remainders from splits to be recorded as a sale, and the corresponding "IN LIEU OF FRX SHARE" CSV row to be intentionally skipped,
so that my cash balance is correct and no duplicate sale entry is created.

## Acceptance Criteria

1. **Given** a reverse split that produces a fractional remainder (e.g., 1531 shares ÷ 5 = 306.2 shares, remainder = 0.2), **When** the split adjustment is calculated, **Then** the 0.2-share remainder is recorded as a fractional share sale at the current market price.
2. **Given** a CSV row with a description containing "IN LIEU OF FRX SHARE", **When** the CSV import processes that row, **Then** the row is intentionally skipped (the remainder was already handled as a sale in the split adjustment step) and no duplicate sale record is created.
3. **Given** a split that produces an exact whole-share result (no remainder), **When** the split adjustment completes, **Then** no fractional sale record is created.
4. **Given** all changes, **When** `pnpm all` runs, **Then** all unit tests pass.

## Tasks / Subtasks

- [ ] Confirm Stories 48.1, 48.2, and 48.3 are complete before starting
- [ ] Compute fractional remainder during split adjustment (AC: #1, #3)
  - [ ] `remainder = (lot.quantity / ratio) - Math.floor(lot.quantity / ratio)` per lot
  - [ ] Sum remainders across all lots for the symbol to get the total fractional share count
- [ ] If total remainder > 0: create a sale record for the fractional shares (AC: #1)
  - [ ] Sale quantity = total fractional remainder (e.g., 0.2 shares)
  - [ ] Sale price per share = current market price for the symbol (use existing price lookup logic)
  - [ ] Record as a sell transaction in the database
- [ ] If total remainder = 0: no sale record created (AC: #3)
- [ ] Implement "IN LIEU OF FRX SHARE" skip logic in CSV import (AC: #2)
  - [ ] Detection was scaffolded in Story 48.1 (`isInLieuRow` classifier)
  - [ ] When an in-lieu row is encountered: log that it is intentionally skipped and do nothing
  - [ ] Do NOT create a sale record for in-lieu rows (remainder sale was already created in Step above)
- [ ] Write unit tests (AC: #4)
  - [ ] Test: remainder = 0.2 → fractional sale record created with correct quantity and price
  - [ ] Test: exactly whole shares (remainder = 0) → no sale record created
  - [ ] Test: "IN LIEU OF FRX SHARE" row → skipped, no record created
  - [ ] Test: multiple lots with combined fractional remainder
- [ ] Run `pnpm all` and confirm all tests pass (AC: #4)

## Dev Notes

### Remainder Calculation

```
// Per lot:
const adjustedQty = lot.quantity / ratio;
const wholeQty = Math.floor(adjustedQty);
const lotRemainder = adjustedQty - wholeQty;  // fractional shares from this lot

// Across all lots for the symbol:
const totalRemainder = lots.reduce((sum, lot) => sum + (lot.quantity / ratio - Math.floor(lot.quantity / ratio)), 0);
```

### Key Commands

- Run all tests: `pnpm all`
- Run unit tests: `pnpm test`

### Key File Locations

- Server source: `apps/server/src/`
- CSV import service: search for `csv`, `import` in `apps/server/src/`
- Prisma schema: `prisma/schema.prisma` — transaction/sale model
- Price lookup service: search for `price` or `marketPrice` in `apps/server/src/`

### Tech Stack

- Fastify backend, Prisma ORM, TypeScript
- Sale record: use the existing sell transaction model (same as when a user normally sells shares)
- Current price lookup: use whatever service the rest of the app uses to get the current market price

### Rules

- Stories 48.1–48.3 must be complete before starting
- Do not modify test files
- NEVER create a sale record for "IN LIEU OF FRX SHARE" rows — they are already covered by the fractional sale created in this story
- If there is no current price available for the symbol, log a warning and use a price of 0 rather than throwing

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-03.md]
- [Source: prisma/schema.prisma]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
