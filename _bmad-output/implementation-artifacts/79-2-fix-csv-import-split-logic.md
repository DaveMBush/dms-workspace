# Story 79.2: Fix CSV Import Split Logic for OXLC and Similar Symbols

Status: Approved

## Story

As a developer,
I want the stock-split processing logic to correctly preserve all affected rows so that no positions or dividends are lost when a split is processed,
so that the OXLC Joint Brokerage data and any other symbol subject to the same defect is correctly imported.

## Acceptance Criteria

1. **Given** root cause from Story 79.1,
   **When** developer applies the fix to split-processing code,
   **Then** logic either updates existing rows in place or deletes-and-reinserts with complete data — never silently discards rows.

2. **Given** fix applied and Fidelity CSV re-imported,
   **When** developer queries database for OXLC Joint Brokerage rows,
   **Then** all purchases, dividends, and split-adjusted rows from Story 79.1 are present with correct values.

3. **Given** fix applied,
   **When** unit test is written for split-processing function with minimal OXLC fixture,
   **Then** test passes and verifies no rows are lost during split processing.

4. **Given** `pnpm all` runs after fix,
   **Then** all tests pass including new unit test.

## Tasks / Subtasks

- [ ] Task 1: Review Story 79.1 investigation findings (AC: #1)
  - [ ] Read completed `79-1-investigate-oxlc-csv-import.md` Dev Notes — "Investigation Findings" section
  - [ ] Identify the exact function, file, and line numbers responsible for the data loss
  - [ ] Confirm root cause: delete-without-reinsert, never-inserted, or data corruption

- [ ] Task 2: Apply targeted fix to split-processing logic (AC: #1)
  - [ ] Locate the split-processing function identified in Story 79.1
  - [ ] Prefer update-in-place: replace `prisma.trades.delete()` + `prisma.trades.create()` pattern with `prisma.trades.update()` where applicable
  - [ ] If delete+reinsert pattern must be kept, wrap both operations in `prisma.$transaction([...])` to guarantee atomicity
  - [ ] Ensure all row fields (quantity, price, amount, account, symbol, date) are correctly carried through the split adjustment
  - [ ] Apply same fix to `DivDeposits` or other affected tables if identified in 79.1

- [ ] Task 3: Re-import Fidelity CSV and verify data (AC: #2)
  - [ ] Trigger re-import via the import endpoint or import function with Fidelity CSV path
  - [ ] Query database for OXLC Joint Brokerage rows across `Trades`, `DivDeposits`, `Universe`
  - [ ] Confirm every row from the Story 79.1 CSV table is now present with correct values
  - [ ] Confirm no duplicate rows were created

- [ ] Task 4: Write unit test for split-processing function (AC: #3)
  - [ ] Create test file colocated with the split-processing function (e.g., `split-processing.function.spec.ts`)
  - [ ] Use Vitest; import the pure split-processing function directly
  - [ ] Write fixture data matching the OXLC scenario: at least one purchase row + one split event
  - [ ] Assert: all input rows are returned/persisted after split processing — none are lost
  - [ ] Add edge-case test: split with no prior purchases → expect graceful no-op or empty result

- [ ] Task 5: Run full test suite (AC: #4)
  - [ ] Run `pnpm all` and confirm all tests pass including new unit test
  - [ ] If any pre-existing test fails due to the fix, investigate carefully — do not change tests unless the tested behavior was intentionally changed

## Dev Notes

### Prerequisite

**Story 79.1 must be fully completed and its "Investigation Findings" section filled in before starting this story.** This story applies the fix identified by 79.1 — do not speculate about the root cause independently.

### Fix Approach

The preferred fix pattern (in priority order):

1. **Update-in-place (preferred):** Replace any `delete` + `create` sequence with a single `update`. This avoids the window where the row doesn't exist.
   ```typescript
   // Preferred
   await prisma.trades.update({
     where: { id: existingRow.id },
     data: { quantity: adjustedQuantity, price: adjustedPrice, /* ... */ },
   });
   ```

2. **Atomic transaction (if delete+reinsert must be kept):** Wrap delete and create in `prisma.$transaction()`.
   ```typescript
   await prisma.$transaction([
     prisma.trades.delete({ where: { id: existingRow.id } }),
     prisma.trades.create({ data: { ...newRowData } }),
   ]);
   ```

3. **Never use**: bare `delete()` followed by `create()` in separate awaits without a transaction.

### Unit Test Pattern

```typescript
// split-processing.function.spec.ts
import { describe, it, expect } from 'vitest';
import { processSplit } from './split-processing.function'; // adjust import path

describe('processSplit', () => {
  it('preserves all rows for OXLC split scenario', async () => {
    const fixture = [
      { symbol: 'OXLC', account: 'Joint Brokerage', quantity: 100, price: 5.00, date: '2025-01-15' },
    ];
    const result = await processSplit(fixture, { ratio: 2, splitDate: '2025-03-01' });
    expect(result).toHaveLength(1); // no rows lost
    expect(result[0].quantity).toBe(200); // quantity doubled
    expect(result[0].price).toBe(2.50);  // price halved
  });

  it('handles split with no prior purchases gracefully', async () => {
    const result = await processSplit([], { ratio: 2, splitDate: '2025-03-01' });
    expect(result).toHaveLength(0);
  });
});
```

### Key Commands

| Purpose | Command |
|---------|---------|
| Run all tests | `pnpm all` |
| Re-import Fidelity CSV via endpoint | `curl -X POST http://localhost:3000/api/import -F "file=@/home/dave/Fidelity-2025.csv"` (confirm URL in server routes) |
| Query OXLC in dev DB | `sqlite3 <db-path> "SELECT * FROM Trades WHERE symbol='OXLC';"` |
| Find split function | `grep -r "split\|Split" apps/server/src/ --include="*.ts" -l` |
| Run unit tests only | `pnpm nx test server` |

### Key Files

| File | Purpose |
|------|---------|
| `79-1-investigate-oxlc-csv-import.md` | Root cause findings — **read first** |
| `apps/server/src/app/routes/` | Import route(s) containing split-processing logic |
| `prisma/schema.prisma` | Database schema for `Trades`, `DivDeposits`, `Universe` models |
| `apps/dms-material-e2e/test-database.db` | SQLite dev/E2E database for verification queries |
| `split-processing.function.spec.ts` | New unit test file to create alongside split function |

### Constraints

- Fix must be **targeted** — only change the split-processing logic identified in 79.1
- Do not refactor or reorganise surrounding code
- Do not change existing tests unless the tested behavior was intentionally modified
- Named functions for callbacks — no anonymous arrow functions in production code

## Dev Agent Record

### Agent Model Used

_TBD_

### Debug Log References

### Completion Notes List

### File List
