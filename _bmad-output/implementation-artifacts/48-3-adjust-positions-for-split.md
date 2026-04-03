# Story 48.3: Adjust Existing Open Position Lots per Split Ratio

Status: Approved

## Story

As a trader,
I want all open position lots for a split symbol to have their quantities and per-share prices adjusted by the split ratio,
so that my cost basis and share count accurately reflect the post-split reality.

## Acceptance Criteria

1. **Given** a 1-for-5 reverse split for OXLC (ratio = 5) with multiple open lots, **When** the split adjustment is applied to all open OXLC lots, **Then** each lot's quantity is divided by 5 and each lot's per-share price is multiplied by 5.
2. **Given** a 2-for-1 forward split (ratio = 0.5) for any symbol, **When** the split adjustment is applied, **Then** each lot's quantity is doubled and each lot's per-share price is halved.
3. **Given** a split adjustment is applied to a lot, **When** the total position value is recalculated (quantity × per-share price), **Then** the total value is unchanged from before the split (the adjustment is value-neutral).
4. **Given** all changes, **When** `pnpm all` runs, **Then** all unit tests pass.

## Tasks / Subtasks

- [ ] Confirm Stories 48.1 and 48.2 are complete before starting
- [ ] Implement `adjustLotsForSplit(symbol, ratio)` service function (AC: #1, #2, #3)
  - [ ] Query all open lots for the given symbol
  - [ ] For each lot:
    - [ ] `newQuantity = lot.quantity / ratio` (rounded to whole shares — fractional handled in Story 48.4)
    - [ ] `newPricePerShare = lot.pricePerShare * ratio`
  - [ ] Update all lot records in the database with the adjusted quantity and price
  - [ ] Use a database transaction to ensure all lots are updated atomically
- [ ] Wire `adjustLotsForSplit` into the CSV import split-handling pipeline (alongside `calculateSplitRatio` from Story 48.2)
- [ ] Write unit tests for lot adjustment (AC: #4)
  - [ ] Test: reverse split ratio=5 → quantity halved by 5, price multiplied by 5
  - [ ] Test: forward split ratio=0.5 → quantity doubled, price halved
  - [ ] Test: value-neutrality: `(newQty * newPrice) === (oldQty * oldPrice)` within float tolerance
  - [ ] Test: multiple lots all adjusted correctly in one call
  - [ ] Test: single lot adjusted correctly
- [ ] Run `pnpm all` and confirm all tests pass (AC: #4)

## Dev Notes

### Adjustment Formula per Lot

```
newQuantity     = Math.floor(lot.quantity / ratio)    // whole shares — fractional remainder handled in Story 48.4
newPricePerShare = lot.pricePerShare * ratio
```

Value check: `newQuantity * newPricePerShare ≈ lot.quantity * lot.pricePerShare` (may differ slightly due to fractional remainder — the remainder value is handled as a sale in Story 48.4).

### Key Commands

- Run all tests: `pnpm all`
- Run unit tests: `pnpm test`

### Key File Locations

- Server source: `apps/server/src/`
- Prisma schema (for lot model field names): `prisma/schema.prisma`
- CSV import service: search for `csv`, `import` in `apps/server/src/`

### Tech Stack

- Fastify backend, Prisma ORM, TypeScript
- Prisma transaction: `prisma.$transaction(async (tx) => { ... })` for atomic lot updates
- Use `Math.floor()` for whole-share quantity (fractional part handled in Story 48.4)

### Rules

- Stories 48.1 and 48.2 must be complete before starting
- Do not modify test files
- Lot adjustments must be atomic (all lots for the symbol succeed or all are rolled back)
- Use `Math.floor()` for adjusted quantity — do NOT round to nearest

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-03.md]
- [Source: prisma/schema.prisma]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
