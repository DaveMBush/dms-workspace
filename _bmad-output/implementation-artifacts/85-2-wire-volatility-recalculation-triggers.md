# Story 85.2: Wire Volatility Recalculation Triggers

Status: Done

## Story

As a developer,
I want the stored volatility values in the `universe` table to be recalculated automatically
whenever distribution data changes — on symbol add, screener data sync, and universe data update —
so that the stored values are always current without requiring a manual recalculation step.

## Acceptance Criteria

1. **Given** a new symbol is added to the universe via the symbol-add route,
   **When** the symbol-add Fastify handler completes successfully,
   **Then** the volatility calculation service is called for that symbol and the result is
   written to `volatility_long`, `volatility_short`, and `volatility_calculated_at` on
   the new universe row.

2. **Given** screener data is synced to universe symbols via the sync-from-screener route,
   **When** the sync handler completes for any affected symbol,
   **Then** the volatility for each affected symbol is recalculated and stored.

3. **Given** the price or distribution value for a universe symbol is updated via the
   universe update route,
   **When** the update handler completes,
   **Then** the volatility for that symbol is recalculated and stored.

4. **Given** the recalculation logic uses the pure `calculateVolatility` function from
   `apps/server/src/app/volatility/volatility-calculation.function.ts` (introduced in
   Epics 81 and 84),
   **When** a code reviewer inspects the new trigger wiring code,
   **Then** no duplicate calculation logic exists — the triggers call the shared pure
   function, not a reimplementation.

5. **Given** the triggers are wired,
   **When** unit tests run for each of the three trigger paths (symbol add, screener sync,
   universe update),
   **Then** each test confirms that after the write operation the `volatility_long`,
   `volatility_short`, and `volatility_calculated_at` fields are populated on the
   universe row in the database.

6. **Given** `pnpm all` is run,
   **Then** all tests pass.

## Tasks / Subtasks

- [x] Task 1: Create `recalculate-universe-volatility.function.ts` (AC: #4)
  - [x] Create `apps/server/src/app/volatility/recalculate-universe-volatility.function.ts`
  - [x] Function signature: `recalculateUniverseVolatility(universeId: string): Promise<void>`
  - [x] Import `calculateVolatility` from `./volatility-calculation.function`
  - [x] Import `prisma` from `../../prisma/prisma-client` (singleton)
  - [x] Query `divDeposits` for the symbol matching `universeId` (last 5 years, `deletedAt: null`)
  - [x] Call `calculateVolatility` with 1-year window → `volatility_short`
  - [x] Call `calculateVolatility` with 5-year window → `volatility_long`
  - [x] Write results to `prisma.universe.update({ where: { id: universeId }, data: { volatility_long, volatility_short, volatility_calculated_at: new Date() } })`
  - [x] Use named functions throughout — no anonymous callbacks
  - [x] Handle case where symbol has no distribution history: write `null` to both columns

- [x] Task 2: Wire trigger on symbol add (AC: #1)
  - [x] Open `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts`
  - [x] After the `prisma.universe.create` call that creates the new universe row, call `await recalculateUniverseVolatility(newUniverse.id)`
  - [x] Ensure the call does not block the HTTP response (can be fire-and-forget with error logging, or awaited before response — prefer awaited for correctness)

- [x] Task 3: Wire trigger on screener sync (AC: #2)
  - [x] Open `apps/server/src/app/routes/universe/sync-from-screener/` — identify the function that updates existing universe rows
  - [x] After each universe row is inserted or updated, call `recalculateUniverseVolatility` for that row's id
  - [x] If the sync processes many rows, batch the recalculations (iterate, don't Promise.all all at once to avoid DB overload)

- [x] Task 4: Wire trigger on universe update (AC: #3)
  - [x] Open `apps/server/src/app/routes/universe/index.ts` — find the PATCH/PUT route that updates universe distribution or price
  - [x] After the `prisma.universe.update` call, call `await recalculateUniverseVolatility(universeId)`

- [x] Task 5: Write unit tests for all three trigger paths (AC: #5)
  - [x] Create `apps/server/src/app/volatility/recalculate-universe-volatility.function.spec.ts`
  - [x] Use Vitest with a mocked Prisma client (mock `prisma.divDeposits.findMany` and `prisma.universe.update`)
  - [x] Test 1 — Symbol with 12+ months of history: confirm `volatility_long` and `volatility_short` written with non-null values
  - [x] Test 2 — Symbol with fewer than 12 months of history: confirm `null` written to both columns
  - [x] Test 3 — Symbol with no distribution records: confirm `null` written without error
  - [x] Create integration-level tests verifying each trigger path calls the recalculation function (mock `recalculateUniverseVolatility` in trigger tests)

- [x] Task 6: Full test run (AC: #6)
  - [x] Run `pnpm all` and confirm all tests pass

## Dev Notes

### Existing Volatility Infrastructure (Do NOT Duplicate)

The pure calculation function already exists from Epics 81/84:

```
apps/server/src/app/volatility/
  volatility-calculation.function.ts  ← import calculateVolatility from here
  volatility-category.type.ts         ← VolatilityCategory type
  volatility-result.interface.ts      ← VolatilityResult interface
  volatility-query.function.ts        ← Prisma query for distribution history (may reuse)
```

Import `calculateVolatility` directly — **do not re-implement the algorithm**.

### New File to Create

```
apps/server/src/app/volatility/recalculate-universe-volatility.function.ts
```

This function is the single entry point for all three trigger paths. It:
1. Queries divDeposits for the universe row (use `universeId` FK on `divDeposits.universeId`)
2. Separates 1-year and 5-year windows by date filtering
3. Calls `calculateVolatility` twice
4. Writes results to the universe row via the Prisma singleton

### Distribution Data Model

`divDeposits` has `universeId String?` FK to `universe`. Use this to filter deposits by symbol:

```typescript
const deposits = await prisma.divDeposits.findMany({
  where: {
    universeId: universeId,
    deletedAt: null,
    date: { gte: fiveYearsAgo },
  },
  orderBy: { date: 'asc' },
  select: { amount: true, date: true },
});
```

### Windowed Calculation

```typescript
const now = new Date();
const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());

const oneYearAmounts = deposits
  .filter(d => d.date >= oneYearAgo)
  .map(d => d.amount);

const fiveYearAmounts = deposits.map(d => d.amount); // already filtered to 5 years in query

const volatilityShort = calculateVolatility(oneYearAmounts);
const volatilityLong = calculateVolatility(fiveYearAmounts);
```

### Three Trigger Locations

| Trigger | File | Hook Point |
|---------|------|------------|
| Symbol add | `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts` | After `prisma.universe.create` |
| Screener sync | `apps/server/src/app/routes/universe/sync-from-screener/symbol-processing.function.ts` | After each universe insert/update |
| Universe update | `apps/server/src/app/routes/universe/index.ts` | After PATCH route `prisma.universe.update` |

### Named Functions Requirement

All callbacks and handlers must be named functions per `@smarttools/no-anonymous-functions` ESLint rule:

```typescript
// CORRECT
async function recalculateUniverseVolatility(universeId: string): Promise<void> { ... }

// WRONG
const recalculateUniverseVolatility = async (universeId: string) => { ... }
```

### Prisma Singleton

```typescript
import { prisma } from '../../prisma/prisma-client';
```

Never instantiate `PrismaClient` directly. Always filter `deletedAt: null` in queries.

### Key Commands

```bash
pnpm nx test server                # Run server unit tests only
pnpm all                           # Full lint + build + test
```

### References

- [apps/server/src/app/volatility/volatility-calculation.function.ts](apps/server/src/app/volatility/volatility-calculation.function.ts) — Pure calculation function (import this)
- [apps/server/src/app/volatility/volatility-category.type.ts](apps/server/src/app/volatility/volatility-category.type.ts) — VolatilityCategory type
- [apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts](apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts) — Symbol add handler
- [apps/server/src/app/routes/universe/sync-from-screener/](apps/server/src/app/routes/universe/sync-from-screener/) — Screener sync route
- [apps/server/src/app/routes/universe/index.ts](apps/server/src/app/routes/universe/index.ts) — Universe router (PATCH route)
- [apps/server/src/app/prisma/prisma-client.ts](apps/server/src/app/prisma/prisma-client.ts) — Prisma singleton
- Story 85.1 must be completed before this story (columns must exist in schema)

## Dev Agent Record

### Completion Notes

- Added `recalculateUniverseVolatility(universeId)` as the shared trigger entry point and reused the existing `calculateVolatility` function instead of duplicating the algorithm.
- Wired recalculation into the add-symbol flow, the sync-from-screener upsert flow, and the universe update route.
- Returned created universe ids from the shared universe-create helper so sync inserts can recalculate immediately after insert.
- Added unit coverage for the helper plus trigger-path assertions for add-symbol, sync-from-screener, and universe update route tests.
- The live `calculateVolatility` contract on `origin/main` currently stores `flat` and `insufficient-history` values for low/insufficient history cases; the new helper intentionally preserves that shared behavior.

### Debug Log

- `NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/dave/code/dms/story-85-2-wire-volatility-recalculation-triggers pnpm exec vitest run apps/server/src/app/volatility/recalculate-universe-volatility.function.spec.ts`
- `NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/dave/code/dms/story-85-2-wire-volatility-recalculation-triggers pnpm exec vitest run apps/server/src/app/volatility/recalculate-universe-volatility.function.spec.ts apps/server/src/app/routes/universe/add-symbol/add-symbol.function.spec.ts apps/server/src/app/routes/universe/sync-from-screener/index.spec.ts apps/server/src/app/routes/universe/index.spec.ts`
- `NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/dave/code/dms/story-85-2-wire-volatility-recalculation-triggers pnpm exec prisma generate`
- `NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/dave/code/dms/story-85-2-wire-volatility-recalculation-triggers pnpm format`
- `CI=1 NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/dave/code/dms/story-85-2-wire-volatility-recalculation-triggers pnpm all`
- `NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/dave/code/dms/story-85-2-wire-volatility-recalculation-triggers pnpm dupcheck`
- `NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/dave/code/dms/story-85-2-wire-volatility-recalculation-triggers pnpm e2e:dms-material:chromium`
- `NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/dave/code/dms/story-85-2-wire-volatility-recalculation-triggers pnpm e2e:dms-material:firefox`

## File List

- `_bmad-output/implementation-artifacts/85-2-wire-volatility-recalculation-triggers.md`
- `apps/server/src/app/routes/common/universe-operations.function.ts`
- `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.spec.ts`
- `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts`
- `apps/server/src/app/routes/universe/index.spec.ts`
- `apps/server/src/app/routes/universe/index.ts`
- `apps/server/src/app/routes/universe/sync-from-screener/index.spec.ts`
- `apps/server/src/app/routes/universe/sync-from-screener/index.ts`
- `apps/server/src/app/volatility/recalculate-universe-volatility.function.spec.ts`
- `apps/server/src/app/volatility/recalculate-universe-volatility.function.ts`

## Change Log

- 2026-04-26: Added a shared universe volatility recalculation helper, wired the three required triggers, added trigger tests, and validated the branch with `pnpm all`, `pnpm dupcheck`, and grouped Chromium/Firefox e2e runs.
