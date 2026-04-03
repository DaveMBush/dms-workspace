# Story 48.1: Detect and Classify Split Transactions in CSV Import

Status: Approved

## Story

As a trader,
I want the CSV import to detect split transaction rows automatically,
so that they are processed with the correct split-handling logic rather than as ordinary buy or sell trades.

## Acceptance Criteria

1. **Given** a CSV row whose description contains the word "SPLIT" (e.g., "REVERSE SPLIT R/S FROM 691543102#REOR M005168075001"), **When** the CSV import parser processes that row, **Then** the row is classified as a split transaction and is not processed as a buy or sell.
2. **Given** a CSV row classified as a split, **When** the row is passed into the processing pipeline, **Then** the symbol (ticker) and the new post-split quantity are extracted correctly from the row.
3. **Given** a CSV row whose description does not contain "SPLIT", **When** the row is processed, **Then** it is not classified as a split and is handled by the existing buy/sell logic unchanged.
4. **Given** all changes, **When** `pnpm all` runs, **Then** all unit tests (including new unit tests for split detection) pass.

## Tasks / Subtasks

- [ ] Locate the CSV import parser in the server codebase (AC: #1)
  - [ ] Search for CSV import service/controller in `apps/server/src/`
  - [ ] Identify where each CSV row is classified as a buy, sell, or other transaction type
- [ ] Add split detection logic: if `description.toUpperCase().includes('SPLIT')` → classify as split (AC: #1)
  - [ ] Ensure case-insensitive matching
  - [ ] The split row must NOT fall through to buy/sell logic (AC: #1)
- [ ] Extract symbol and post-split quantity from the split row (AC: #2)
  - [ ] Symbol is already in the CSV row (existing ticker field)
  - [ ] Post-split quantity comes from the quantity field of the split row
- [ ] Ensure "IN LIEU OF FRX SHARE" detection is also in place (will be used by Story 48.4) — add a `isInLieuRow` classifier alongside the split classifier (AC: #3 — non-split rows unaffected)
- [ ] Write unit tests for split detection (AC: #4)
  - [ ] Test: description with "SPLIT" → classified as split
  - [ ] Test: description with "REVERSE SPLIT" → classified as split
  - [ ] Test: description without "SPLIT" → classified as buy/sell (existing logic)
  - [ ] Test: description with "IN LIEU OF FRX SHARE" → classified as in-lieu row
  - [ ] Test: mixed-case "Split" → classified as split (case-insensitive)
- [ ] Run `pnpm all` and confirm all tests pass (AC: #4)

## Dev Notes

### Background

The CSV import currently does not handle split transactions. When a split row is encountered it is likely treated as an incorrect buy or sell, producing wrong account data. This story adds the detection layer only — the actual adjustment logic is in Stories 48.2–48.4.

### Key Commands

- Run all tests: `pnpm all`
- Run unit tests: `pnpm test`

### Known Split Row Format

Example row fields (from the epic description):
- **Symbol:** OXLC
- **Description:** "REVERSE SPLIT R/S FROM 691543102#REOR M005168075001"
- **Quantity:** 306 (post-split quantity — this is the NEW quantity after the split)
- **CUSIP** (if present in description): 691543102 — already resolved to ticker, not needed for logic

"IN LIEU OF FRX SHARE" row:
- **Description:** "IN LIEU OF FRX SHARE EU PAYOUT..."
- **Amount:** cash amount for fractional share payout
- This row should be detected and classified separately (skipped by Story 48.4)

### Key File Locations

- Server source: `apps/server/src/`
- CSV import service: search for `csv`, `import`, or `transaction` in `apps/server/src/`

### Tech Stack

- Fastify backend, Prisma ORM
- TypeScript — use `const isSplitRow = row.description?.toUpperCase().includes('SPLIT') ?? false;`

### Rules

- Do not modify test files
- Detection only — no adjustment logic in this story (that is Stories 48.2–48.4)
- Existing buy/sell processing must remain completely unchanged for non-split rows

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-03.md]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
