# Story 88.2: Refactor Volatility Calculation to Consume Distribution History

Status: Approved

## Story

As a developer,
I want `recalculateUniverseVolatility()` to compute long-term and short-term volatility from a
distribution-history payload (the same shape returned by `fetchDividendHistory()`) instead of
querying `divDeposits`,
so that volatility for any symbol can be computed the moment its distribution history is fetched
— with no dependency on the user having ever held that symbol.

## Acceptance Criteria

1. **Given** the existing
   `apps/server/src/app/volatility/recalculate-universe-volatility.function.ts`,
   **When** the developer refactors it (TDD: failing unit test first),
   **Then** the function signature accepts a distribution-history payload (e.g.
   `recalculateUniverseVolatility(universeId, history: DividendHistoryRow[])` or a clearly
   named equivalent decided in Dev Notes from Story 88.1) and **no longer** calls
   `prisma.divDeposits.findMany()`.

2. **Given** a distribution-history payload covering more than 5 years,
   **When** `recalculateUniverseVolatility()` is invoked,
   **Then** `volatility_long` is computed from rows where `date >= now - 5y` and
   `volatility_short` is computed from rows where `date >= now - 1y`, both using the existing
   `calculateVolatility()` pure function unchanged.

3. **Given** an empty or sub-minimum distribution-history payload,
   **When** `recalculateUniverseVolatility()` is invoked,
   **Then** the persisted `volatility_long` and `volatility_short` are the
   `null`/`unknown` category (the existing `recalculate-universe-volatility.function.spec.ts`
   case `'writes insufficient-history when no distribution history exists'` passes against
   the new data flow with an updated arrange step that supplies an empty `history` argument
   instead of seeding empty `divDeposits`).

4. **Given** the refactor is complete,
   **When** the developer greps the codebase,
   **Then** `prisma.divDeposits.findMany` no longer appears in any volatility code path
   (`recalculate-universe-volatility.function.ts` and `volatility-query.function.ts`); the
   legacy symbol-grouping logic in `volatility-query.function.ts` is either deleted or
   replaced with a parallel distribution-history-driven implementation if
   `fetchVolatilityForAllSymbols()` still has a caller.

5. **Given** the refactor is complete,
   **When** `pnpm all` runs,
   **Then** every test passes — including the updated unit specs for
   `recalculate-universe-volatility.function.spec.ts` and (if it exists) the spec for
   `volatility-query.function.ts`.

## Tasks / Subtasks

- [ ] Task 1: Read Story 88.1 Dev Notes and confirm the agreed signature (AC: #1)
  - [ ] Open `_bmad-output/implementation-artifacts/88-1-investigate-distribution-history-volatility-source.md`
  - [ ] Confirm the chosen signature for the refactored function (e.g. `recalculateUniverseVolatility(universeId: string, history: DividendHistoryRow[]): Promise<void>`)
  - [ ] Confirm the chosen `DividendHistoryRow` type — re-use the existing `ProcessedRow` type exported from `apps/server/src/app/routes/common/distribution-api.function.ts` (re-exported via `dividend-history.service.ts`) rather than introducing a parallel shape
  - [ ] Confirm the chosen fate of `volatility-query.function.ts::fetchVolatilityForAllSymbols` (delete vs. refactor) based on whether any caller still needs it

- [ ] Task 2: TDD — write failing unit tests against the new signature **first** (AC: #1, #2, #3)
  - [ ] Open `apps/server/src/app/volatility/recalculate-universe-volatility.function.spec.ts`
  - [ ] Update the existing tests to call the new signature with a `history` argument instead of mocking `prisma.divDeposits.findMany`
  - [ ] Test 1 — `history` covering > 5 years: assert `prisma.universe.update` is called with computed `volatility_long` (from 5y window) and `volatility_short` (from 1y window) plus a fresh `volatility_calculated_at`
  - [ ] Test 2 — `history` with only the last 8 months of rows: assert short-window category is whatever `calculateVolatility` returns for that subset; long-window category is the same (since all rows fit in both windows)
  - [ ] Test 3 — empty `history` (`[]`): assert `prisma.universe.update` is called with the `null`/`unknown` category from `calculateVolatility([])` for both columns (preserves the existing "writes insufficient-history when no distribution history exists" semantics)
  - [ ] Test 4 — assert the function does **not** call `prisma.divDeposits.findMany` (use `expect(mockPrisma.divDeposits.findMany).not.toHaveBeenCalled()`)
  - [ ] Run the spec — confirm all 4 tests fail against the current implementation
  - [ ] Commit the failing spec as a separate commit if practical (TDD discipline)

- [ ] Task 3: Refactor `recalculate-universe-volatility.function.ts` to consume the payload (AC: #1, #2, #3, #4)
  - [ ] Change signature to `export async function recalculateUniverseVolatility(universeId: string, history: ProcessedRow[]): Promise<void>`
  - [ ] Remove the `prisma.divDeposits.findMany` call entirely
  - [ ] Add a new helper `extractWindowedAmounts(history, now)` that returns `{ longAmounts, shortAmounts }` by filtering rows where `date >= fiveYearsAgo` and `date >= oneYearAgo` respectively, then mapping to `amount`
  - [ ] Reuse `calculateVolatility(...)` unchanged (do **not** copy its body)
  - [ ] Keep the existing windowing constants (`FIVE_YEARS_MS`, `ONE_YEAR_MS`) and `buildFiveYearsAgo`/`buildOneYearAgo` helpers; they already work
  - [ ] All callbacks must be **named functions** per `@smarttools/no-anonymous-functions` ESLint rule
  - [ ] Run the spec — confirm all 4 tests now pass

- [ ] Task 4: Resolve `volatility-query.function.ts::fetchVolatilityForAllSymbols` (AC: #4)
  - [ ] Run `grep_search` for `fetchVolatilityForAllSymbols` across `apps/**` and `apps/dms-material/src/**` to find callers
  - [ ] If the only caller is `apps/server/src/app/routes/universe/get-volatility/index.ts` (the legacy endpoint Story 85.3 made redundant for the Vol column) AND no frontend code still calls it: **delete** `volatility-query.function.ts`, `volatility-query.function.spec.ts`, the `get-volatility` route folder, and any router registration of that route
  - [ ] If a caller still depends on it: refactor it to use `fetchDividendHistory(symbol)` per-symbol and the new `recalculateUniverseVolatility` semantics (or read from the stored `universe.volatility_long`/`volatility_short` columns instead, since Story 85.3 already serves them via the main universe API)
  - [ ] Either way: confirm `prisma.divDeposits.findMany` does not appear in any file under `apps/server/src/app/volatility/**` after this story

- [ ] Task 5: Update Story 85.2 trigger callers' tests to compile (AC: #5)
  - [ ] The signature change to `recalculateUniverseVolatility(universeId, history)` will break compilation of all three callers from Story 85.2:
    - `apps/server/src/app/routes/universe/sync-from-screener/index.ts`
    - `apps/server/src/app/routes/universe/index.ts`
    - `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts`
  - [ ] **Story 88.2 minimum**: update each caller to pass `[]` as the second argument (preserving existing behaviour: empty history → `null`/`unknown` category)
  - [ ] Update each caller's `*.spec.ts` mock expectations accordingly (`expect(mockRecalculateUniverseVolatility).toHaveBeenCalledWith(id, [])`)
  - [ ] **Do NOT wire `fetchDividendHistory` into these callers in this story** — that is Story 88.3's responsibility. Passing `[]` is a temporary regression in volatility freshness for these three trigger paths; Story 88.3 closes the gap immediately after.
  - [ ] Document this temporary `[]` argument in Dev Notes under "Temporary State After Story 88.2"

- [ ] Task 6: Full validation (AC: #5)
  - [ ] Run `pnpm nx test server` and confirm all server unit tests pass
  - [ ] Run `pnpm all` and confirm everything (lint + build + test across all projects) passes
  - [ ] Run `pnpm dupcheck` and confirm no new copy-paste violations introduced

## Dev Notes

### Why a Pure-Argument Signature

Story 85.2 wired `recalculateUniverseVolatility(universeId)` to query the database for distribution
data. This couples volatility freshness to **what we already persisted as `divDeposits`** — which
only exists for symbols the user has held. By the time volatility runs, only the user's positions
have data; every other universe symbol's `divDeposits.findMany` returns `[]` and the function
writes `null`/`unknown`. That is the bug Epic 88 fixes.

The new signature pushes the data-source decision to the caller. Story 88.3 will pass the
already-fetched `dividendhistory.net` payload from universe sync; Stories 85.2's other two
trigger paths (PATCH universe, add-symbol) can decide independently whether to fetch fresh
history (likely yes, in a follow-up) or accept the temporary regression.

### Algorithm — Do NOT Reinvent

The pure `calculateVolatility(amounts: number[]): VolatilityCategory` function in
`apps/server/src/app/volatility/volatility-calculation.function.ts` is **the only place**
the algorithm lives. This story imports and calls it twice (once with 5y amounts, once with
1y amounts). Do not copy the body, do not parameterise with a window, do not "improve" it.

### Type Reuse

`fetchDividendHistory` returns `Promise<ProcessedRow[]>` where `ProcessedRow` is defined in
`apps/server/src/app/routes/common/distribution-api.function.ts` as roughly
`{ amount: number; date: Date }`. Re-use that type. Do not introduce a `DividendHistoryRow`
alias or interface unless the import path causes a circular dependency — in which case,
extract the shared shape to a small new type file (`apps/server/src/app/routes/common/distribution-row.type.ts`).

### Windowing Helper Sketch

```typescript
interface DistributionRecord {
  amount: number;
  date: Date;
}

function extractWindowedAmounts(
  history: DistributionRecord[],
  now: Date
): { longAmounts: number[]; shortAmounts: number[] } {
  const fiveYearsAgo = buildFiveYearsAgo(now);
  const oneYearAgo = buildOneYearAgo(now);
  const longRows = filterRecordsSince(history, fiveYearsAgo);
  const shortRows = filterRecordsSince(history, oneYearAgo);
  return {
    longAmounts: mapAmounts(longRows),
    shortAmounts: mapAmounts(shortRows),
  };
}
```

Reuse the existing `buildFiveYearsAgo`, `buildOneYearAgo`, `filterRecordsSince`, and
`mapAmounts` helpers already in the file (Story 85.2 wrote them) — they already satisfy
the named-function ESLint rule.

### Insufficient-History Behaviour

`calculateVolatility([])` already returns the `null`/`unknown` category in the current
codebase (Story 85.2 verified this). The refactor preserves the same code path: pass the empty
amounts array straight through. No new conditional branches are needed.

### Temporary State After Story 88.2 (Important)

After this story merges and **before** Story 88.3 merges:

- All three Story 85.2 trigger paths (PATCH universe, add-symbol, sync-from-screener row update) will
  call `recalculateUniverseVolatility(id, [])` and write `null`/`unknown` to every symbol's
  volatility columns
- This is a **temporary regression** in production behaviour
- Story 88.3 must merge promptly afterwards to wire the real history payload into sync-from-screener
- Stories 88.3+ may decide to do the same for PATCH/add-symbol or accept that those paths refresh
  volatility lazily on the next universe sync

This trade-off is intentional: it keeps Story 88.2 a pure refactor (algorithm + signature) and
keeps Story 88.3 a pure wiring change (no algorithm work).

### Files Likely to Change

| File | Change |
| --- | --- |
| `apps/server/src/app/volatility/recalculate-universe-volatility.function.ts` | New signature; remove `prisma.divDeposits.findMany`; add windowing helper |
| `apps/server/src/app/volatility/recalculate-universe-volatility.function.spec.ts` | Update tests to pass `history` argument; assert no DB query for divDeposits |
| `apps/server/src/app/volatility/volatility-query.function.ts` | Delete OR refactor (per Task 4 decision) |
| `apps/server/src/app/volatility/volatility-query.function.spec.ts` | Delete if `volatility-query.function.ts` is deleted |
| `apps/server/src/app/routes/universe/get-volatility/index.ts` | Delete if no remaining caller |
| `apps/server/src/app/routes/universe/sync-from-screener/index.ts` | Pass `[]` as 2nd arg (temporary, Story 88.3 fixes) |
| `apps/server/src/app/routes/universe/sync-from-screener/index.spec.ts` | Update mock expectations |
| `apps/server/src/app/routes/universe/index.ts` | Pass `[]` as 2nd arg |
| `apps/server/src/app/routes/universe/index.spec.ts` | Update mock expectations |
| `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts` | Pass `[]` as 2nd arg |
| `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.spec.ts` | Update mock expectations |

### Project Structure Notes

- `apps/server` is a Fastify TypeScript app under `apps/server/src/app/**`
- Volatility code lives under `apps/server/src/app/volatility/**` — keep it there
- Prisma singleton: `import { prisma } from '../prisma/prisma-client'` — never instantiate `PrismaClient` directly
- `@smarttools/no-anonymous-functions` ESLint rule is enforced — every callback must be a named function
- Vitest is the test runner; mocks use `vi.fn()` and module mocks via `vi.mock(...)`

### Dependency Notes

- Depends on Story 88.1 (audit) being complete and the chosen signature documented in its Dev Notes
- Enables Story 88.3 (wiring) and Story 88.4 (e2e regression)
- Does **not** depend on or modify `calculateVolatility` from Epic 81 — that pure function is reused as-is
- The `universe.volatility_long`, `universe.volatility_short`, `universe.volatility_calculated_at` columns from Story 85.1 stay unchanged

### Useful Commands

```bash
pnpm nx test server                       # Server unit tests
pnpm exec vitest run apps/server/src/app/volatility/recalculate-universe-volatility.function.spec.ts
pnpm all                                  # Full lint + build + test
pnpm dupcheck                             # jscpd duplication check
grep_search "prisma.divDeposits.findMany" # Confirm no volatility-module hits remain
```

### References

- [apps/server/src/app/volatility/recalculate-universe-volatility.function.ts](apps/server/src/app/volatility/recalculate-universe-volatility.function.ts) — Refactor target
- [apps/server/src/app/volatility/recalculate-universe-volatility.function.spec.ts](apps/server/src/app/volatility/recalculate-universe-volatility.function.spec.ts) — Tests to update (TDD-first)
- [apps/server/src/app/volatility/volatility-calculation.function.ts](apps/server/src/app/volatility/volatility-calculation.function.ts) — Pure algorithm (re-use, do not duplicate)
- [apps/server/src/app/volatility/volatility-query.function.ts](apps/server/src/app/volatility/volatility-query.function.ts) — Legacy `fetchVolatilityForAllSymbols`; delete or refactor
- [apps/server/src/app/routes/common/dividend-history.service.ts](apps/server/src/app/routes/common/dividend-history.service.ts) — Owns `fetchDividendHistory`; defines `ProcessedRow[]` payload shape
- [apps/server/src/app/routes/universe/sync-from-screener/index.ts](apps/server/src/app/routes/universe/sync-from-screener/index.ts) — Caller (passes `[]` temporarily)
- [apps/server/src/app/routes/universe/index.ts](apps/server/src/app/routes/universe/index.ts) — Caller (passes `[]` temporarily)
- [apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts](apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts) — Caller (passes `[]` temporarily)
- [_bmad-output/implementation-artifacts/88-1-investigate-distribution-history-volatility-source.md](_bmad-output/implementation-artifacts/88-1-investigate-distribution-history-volatility-source.md) — Required prerequisite
- [_bmad-output/implementation-artifacts/85-2-wire-volatility-recalculation-triggers.md](_bmad-output/implementation-artifacts/85-2-wire-volatility-recalculation-triggers.md) — Established the existing trigger wiring this story refactors
- [_bmad-output/planning-artifacts/epics-2026-04-28.md](_bmad-output/planning-artifacts/epics-2026-04-28.md) — Source epic (Epic 88, Story 88.2)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
