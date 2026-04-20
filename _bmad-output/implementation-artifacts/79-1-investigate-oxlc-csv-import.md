# Story 79.1: Investigate CSV Import and Split Logic for OXLC Joint Brokerage

Status: Approved

## Story

As a developer,
I want a thorough investigation of the Fidelity CSV import pipeline and the stock-split processing logic to understand exactly why OXLC Joint Brokerage rows are absent from the database,
so that Story 79.2 can apply a precise, targeted fix.

## Acceptance Criteria

1. **Given** Fidelity CSV at `/home/dave/Fidelity-2025.csv`,
   **When** developer inspects file for OXLC rows in Joint Brokerage account,
   **Then** exact set of rows (purchases, dividends, splits) is documented in Dev Notes with raw CSV field values.

2. **Given** CSV import pipeline in `apps/server/`,
   **When** developer traces how OXLC rows are processed including split-detection branch,
   **Then** the code path is identified and expected vs actual database outcome for each OXLC row is documented in Dev Notes.

3. **Given** current database state,
   **When** developer queries for OXLC rows in Joint Brokerage account,
   **Then** actual database content (including malformed/orphaned rows) is documented in Dev Notes.

4. **Given** split processing branch,
   **When** developer reads delete/insert vs update-in-place logic,
   **Then** Dev Notes record definitively whether split rows are deleted-not-reinserted, never inserted, or corrupted and which specific code lines are responsible.

5. **Given** no production code changed in this story,
   **When** `pnpm all` runs,
   **Then** all tests continue to pass.

## Tasks / Subtasks

- [ ] Task 1: Read and document OXLC rows from CSV (AC: #1)
  - [ ] Open `/home/dave/Fidelity-2025.csv` and extract all rows where account contains "Joint Brokerage" and symbol is "OXLC"
  - [ ] Record exact raw CSV field values: date, action/type, symbol, quantity, price, amount
  - [ ] Identify which rows are purchases, dividends, or splits
  - [ ] Document in Dev Notes with table format

- [ ] Task 2: Trace CSV import pipeline for OXLC (AC: #2)
  - [ ] Run `grep -r "split\|Split\|OXLC" apps/server/src/ --include="*.ts"` to locate relevant code
  - [ ] Find import/CSV route(s) in `apps/server/src/app/routes/` (look for `import`, `csv`, `fidelity` files)
  - [ ] Trace the full code path from CSV row parsing → type detection → database write
  - [ ] Identify where the split-detection branch diverges from normal insert logic
  - [ ] Document expected vs actual database outcome for each OXLC row type

- [ ] Task 3: Query database for current OXLC state (AC: #3)
  - [ ] Identify dev database location (likely `apps/dms-material-e2e/test-database.db` for E2E or a local dev DB)
  - [ ] Query for OXLC rows across relevant tables: `Universe`, `Trades`, `DivDeposits`, `Screener`
  - [ ] Document exact query results including any malformed or orphaned rows
  - [ ] Compare DB state against expected rows from CSV (AC #1)

- [ ] Task 4: Audit split-processing delete/insert logic (AC: #4)
  - [ ] Read split-processing function code in full
  - [ ] Determine definitively: does the code delete rows and fail to reinsert, never insert, or corrupt data?
  - [ ] Record exact file paths, function names, and line numbers responsible
  - [ ] Document the root cause hypothesis for Story 79.2

- [ ] Task 5: Verify all tests still pass (AC: #5)
  - [ ] Run `pnpm all` and confirm zero failures (no production code was changed)

## Dev Notes

### Investigation Overview

This is a **pure investigation story** — no production code changes are permitted. All findings must be documented in this file's Dev Notes section under "Investigation Findings" so Story 79.2 can implement a precise fix.

### Key Investigation Commands

| Purpose | Command |
|---------|---------|
| Search for split/OXLC logic | `grep -r "split\|Split\|OXLC" apps/server/src/ --include="*.ts"` |
| Find CSV/import routes | `grep -r "import\|csv\|fidelity" apps/server/src/app/routes/ --include="*.ts" -l` |
| Git history for server | `git log --all --oneline -- apps/server/src/ \| head -50` |
| Query dev SQLite DB | `sqlite3 <db-path> "SELECT * FROM Trades WHERE symbol='OXLC';"` |
| List server route files | `ls apps/server/src/app/routes/` |
| Run all tests | `pnpm all` |
| Check Prisma schema | `cat prisma/schema.prisma` |

### Key Files

| File | Purpose |
|------|---------|
| `/home/dave/Fidelity-2025.csv` | Source Fidelity CSV — read to find OXLC Joint Brokerage rows |
| `apps/server/src/app/routes/` | Server route directory — look for `import`, `csv`, or `fidelity` files |
| `prisma/schema.prisma` | Database schema — check `Universe`, `Trades`, `DivDeposits`, `Screener` models |
| `apps/dms-material-e2e/test-database.db` | SQLite E2E database — query for OXLC rows |

### Database Models to Inspect

From `prisma/schema.prisma`, check these models for OXLC rows:
- `Universe` — holdings/positions universe
- `Trades` — individual trade/purchase records
- `DivDeposits` — dividend and distribution records
- `Screener` — screener/analysis data

### Investigation Findings

> **To be filled in during investigation — Story 79.2 depends on this section**

#### OXLC CSV Rows (to be documented)

| Date | Action/Type | Symbol | Account | Quantity | Price | Amount |
|------|-------------|--------|---------|----------|-------|--------|
| _fill during investigation_ | | | | | | |

#### Code Path Identified (to be documented)

- Import route file: _TBD_
- Split-detection function: _TBD_
- Root cause (delete/no-reinsert / never-inserted / corrupted): _TBD_
- Responsible file + line numbers: _TBD_

#### Current Database State for OXLC (to be documented)

- Rows in `Trades`: _TBD_
- Rows in `DivDeposits`: _TBD_
- Rows in `Universe`: _TBD_

#### Root Cause Summary (to be documented for Story 79.2)

_TBD — fill after completing Tasks 1-4_

### Constraints

- **No production code changes** in this story
- Findings must be thorough enough that Story 79.2 can implement a fix without additional investigation
- If multiple code paths could be responsible, document all candidates with reasoning for the most likely one

## Dev Agent Record

### Agent Model Used

_TBD_

### Debug Log References

### Completion Notes List

### File List
