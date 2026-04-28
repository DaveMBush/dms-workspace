# Story 88.3: Wire Volatility Recalculation Into the Universe Distribution-History Fetch

Status: Approved

## Story

As Dave,
I want volatility to be (re)calculated and persisted **for every symbol** at the moment the
universe-sync flow fetches its distribution history from dividendhistory.net,
so that after a universe sync the `universe` table has correct, current `volatility_long` and
`volatility_short` values for every symbol — not just the ones I have positions in.

## Acceptance Criteria

1. **Given** the call site identified in Story 88.1,
   **When** the universe-sync flow successfully fetches distribution history for a symbol via
   `fetchDividendHistory(symbol)`,
   **Then** the returned payload is passed straight into the refactored
   `recalculateUniverseVolatility(universeId, history)` (no re-fetch) before the per-symbol
   sync step completes.

2. **Given** the universe contains symbols the user has never held a position in,
   **When** universe sync runs end-to-end,
   **Then** every such symbol's row in `universe` has non-null `volatility_long` and
   `volatility_short` values (or the `null`/`unknown` category if dividendhistory.net returned
   no rows for it) and a fresh `volatility_calculated_at` timestamp.

3. **Given** `fetchDividendHistory(symbol)` fails (404, network error, or empty body),
   **When** universe sync continues,
   **Then** the symbol's volatility columns are written as the `null`/`unknown` category and
   the failure is logged using the existing universe-sync error path — sync does not abort.

4. **Given** the existing trigger wiring from Epic 85 Story 85.2,
   **When** any other caller invokes `recalculateUniverseVolatility(universeId, ...)` (for
   example after a manual symbol add),
   **Then** that caller is updated to also fetch distribution history first (or to pass an
   already-fetched payload), so no caller invokes the function with stale or missing history.

5. **Given** the wiring is complete,
   **When** `pnpm all` runs,
   **Then** all unit tests pass, including any sync-flow specs that needed updating for the
   new per-symbol recalculation step.

## Tasks / Subtasks

- [ ] Task 1: Re-confirm Story 88.1's chosen wiring point and Story 88.2's signature (AC: #1)
  - [ ] Open `_bmad-output/implementation-artifacts/88-1-investigate-distribution-history-volatility-source.md` and re-read the "Recommended Story 88.3 Wiring Point" section
  - [ ] Open `_bmad-output/implementation-artifacts/88-2-refactor-volatility-to-use-distribution-history.md` and confirm the final signature of `recalculateUniverseVolatility`
  - [ ] If Story 88.1 chose to modify `getDistributions` to return the raw rows alongside `DistributionResult`: prepare to update its signature and one caller in `screener/get-consistent-distributions.function.ts` if needed
  - [ ] If Story 88.1 chose to call `fetchDividendHistory` directly from `upsertUniverse`: prepare to refactor `getDistributions` to accept rows so we don't double-fetch

- [ ] Task 2: Modify the universe-sync per-symbol step to capture and reuse the history payload (AC: #1, #2)
  - [ ] Open `apps/server/src/app/routes/universe/sync-from-screener/index.ts`
  - [ ] In `upsertUniverse({ symbol, riskGroupId })`, capture the `ProcessedRow[]` payload from `fetchDividendHistory(symbol)` exactly once per symbol
    - **Preferred path** (per Story 88.1 hint): change `getDistributions(symbol)` to return `{ result: DistributionResult | undefined, history: ProcessedRow[] }` so the existing single fetch is reused
    - **Alternative path**: call `fetchDividendHistory(symbol)` directly in `upsertUniverse`, then refactor `getDistributions(rows: ProcessedRow[])` to take pre-fetched rows
  - [ ] After `updateExistingUniverseRecord` / `createNewUniverseRecord`, call `await recalculateUniverseVolatility(<id>, history)` with the captured payload
  - [ ] Verify by reading the resulting code that `fetchDividendHistory(symbol)` is called **exactly once** per symbol per sync (no second fetch path inside `recalculateUniverseVolatility`)

- [ ] Task 3: Handle the failure path (AC: #3)
  - [ ] If `fetchDividendHistory` throws or returns `[]`, the call still completes — `recalculateUniverseVolatility(id, [])` writes the `null`/`unknown` category (already the Story 88.2 behaviour for empty history)
  - [ ] Confirm `getDistributions`'s existing `try/catch` (which currently returns a fallback `{ distribution: 0, ex_date: now, distributions_per_year: 0 }`) is preserved — it still applies to the distribution metadata, not to volatility
  - [ ] Confirm the universe-sync per-symbol loop is wrapped in or already uses `processSymbols` such that one symbol's failure does not abort the sync — read `symbol-processing.function.ts` to verify
  - [ ] Add a structured log entry when `history.length === 0` so failures are observable: `logger.warn('Empty dividend history; volatility set to insufficient-history', { symbol, universeId })`

- [ ] Task 4: Update the other two `recalculateUniverseVolatility` callers (AC: #4)
  - [ ] **Add-symbol route** (`apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts`): replace the temporary `recalculateUniverseVolatility(universeRecord.id, [])` (left over from Story 88.2) with `recalculateUniverseVolatility(universeRecord.id, await fetchDividendHistory(symbol))`. Wrap the fetch in a `try/catch` so a fetch failure doesn't break add-symbol — log and pass `[]` on failure.
  - [ ] **Universe PATCH route** (`apps/server/src/app/routes/universe/index.ts` ~line 241): same pattern — fetch fresh history with the symbol from the updated row, then pass it. The PATCH handler must look up `symbol` from the universe row before fetching.
  - [ ] Update each caller's `*.spec.ts` to mock `fetchDividendHistory` and assert the wiring (e.g. `expect(mockFetchDividendHistory).toHaveBeenCalledWith(symbol)` and `expect(mockRecalculateUniverseVolatility).toHaveBeenCalledWith(id, fakeHistoryArray)`)
  - [ ] Confirm via `grep_search` that **no caller** invokes `recalculateUniverseVolatility` with a hard-coded `[]` (which would be a stale-data bug)

- [ ] Task 5: Update sync-from-screener tests for the new wiring (AC: #1, #2, #3, #5)
  - [ ] Open `apps/server/src/app/routes/universe/sync-from-screener/index.spec.ts`
  - [ ] Update mocks to include `fetchDividendHistory` returning a deterministic fixture for each test symbol
  - [ ] Add a test: per-symbol step calls `recalculateUniverseVolatility(id, fixtureHistory)` exactly once with the same payload that was fetched
  - [ ] Add a test: when `fetchDividendHistory` returns `[]` for a symbol, `recalculateUniverseVolatility(id, [])` is still called (so the column gets `null`/`unknown`) and the next symbol still processes
  - [ ] Add a test: `fetchDividendHistory` is called exactly once per symbol per sync (no second invocation from inside the recalc) — assert `mockFetchDividendHistory.mock.calls.length === <expected per-symbol count>`
  - [ ] Update or remove the Story 85.2 mock expectation `expect(mockRecalculateUniverseVolatility).toHaveBeenNthCalledWith(n, id)` to use the new 2-arg signature

- [ ] Task 6: Integration confirmation via `sync.integration.spec.ts` (AC: #2)
  - [ ] Open `apps/server/src/app/routes/universe/sync-from-screener/sync.integration.spec.ts`
  - [ ] If the integration spec drives the sync flow end-to-end against a test DB: extend it (or add a new case) that asserts the `universe` row for a symbol with no `divDeposits` history still gets a non-undefined `volatility_long`/`volatility_short` value (either a real category or the `null`/`unknown` marker — but the column must have been written, evidenced by a non-null `volatility_calculated_at`)
  - [ ] If extending the integration spec is out of scope for this branch, document why in Dev Notes and rely on the unit tests in Task 5

- [ ] Task 7: Full validation (AC: #5)
  - [ ] `pnpm nx test server`
  - [ ] `pnpm all`
  - [ ] `pnpm dupcheck`
  - [ ] Optional smoke check: with a local DB seeded with at least one universe symbol that has zero `divDeposits` rows, run the sync route and confirm via Prisma Studio (or a quick `prisma.universe.findUnique`) that the row has populated `volatility_*` columns

## Dev Notes

### Why This Story Exists

Story 88.2 made `recalculateUniverseVolatility` accept a payload but left every caller passing
`[]` (a temporary regression). This story wires the **real** payload through the universe-sync
per-symbol path so that volatility is computed for **every** universe symbol, not just held
ones — fulfilling the user-visible goal of Epic 88.

### The Single-Fetch Constraint

`fetchDividendHistory` is rate-limited to **one call per 10 seconds** (see
`enforceDividendHistoryRateLimit` in `dividend-history.service.ts`). Any wiring that fetches
twice per symbol would double the sync time for the entire universe. **Reuse the payload from
the first fetch.** This is the central design constraint of the story.

### Suggested Wiring (Preferred)

Modify `getDistributions(symbol)` to return both the parsed result and the raw rows it parsed:

```typescript
// apps/server/src/app/routes/settings/common/get-distributions.function.ts

interface GetDistributionsOutcome {
  result: DistributionResult | undefined;
  history: ProcessedRow[];
}

export async function getDistributions(
  symbol: string
): Promise<GetDistributionsOutcome> {
  try {
    let rows = await fetchDividendHistory(symbol);

    if (rows.length === 0) {
      logger.warn(
        `fetchDividendHistory returned no data for ${symbol}, falling back to Yahoo Finance`,
        { symbol }
      );
      rows = await fetchDistributionData(symbol);
    }

    if (rows.length === 0) {
      return { result: undefined, history: [] };
    }

    const today = new Date();
    return {
      result: {
        distribution: findNextOrRecentDistribution(rows, today).amount,
        ex_date: findNextOrRecentDistribution(rows, today).date,
        distributions_per_year: calculateDistributionsPerYear(rows, today),
      },
      history: rows,
    };
  } catch {
    return {
      result: { distribution: 0, ex_date: new Date(), distributions_per_year: 0 },
      history: [],
    };
  }
}
```

Then in `upsertUniverse`:

```typescript
const { result: distribution, history } = await getDistributions(symbol);
// ... existing upsert logic using `distribution` ...
await recalculateUniverseVolatility(<id>, history);
```

**Caveat:** Yahoo Finance fallback rows (`fetchDistributionData(symbol)`) — they're also
`ProcessedRow[]`-shaped, so they can flow through too. Confirm by reading
`fetchDistributionData`'s return type.

**Other caller of `getDistributions`:** `apps/server/src/app/routes/screener/get-consistent-distributions.function.ts`
also calls `getDistributions(symbol)` — it currently consumes the `DistributionResult` only.
Update it to destructure `{ result }` and ignore `history`.

### Failure Path Behaviour

| Failure | Current behaviour | Behaviour after this story |
| --- | --- | --- |
| `fetchDividendHistory` throws | `getDistributions` catches → returns fallback `{ result, history: [] }` | Same; `recalculateUniverseVolatility(id, [])` writes `null`/`unknown`; sync continues |
| `fetchDividendHistory` returns `[]` | `getDistributions` falls back to Yahoo; if that also returns `[]`, returns `{ result: undefined, history: [] }` | Same; `recalculateUniverseVolatility(id, [])` writes `null`/`unknown`; sync continues |
| Per-symbol step throws unexpectedly | `processSymbols` (existing infra) logs and continues to next symbol | Unchanged |

### What NOT to Change

- **Do not** change the algorithm or signature of `calculateVolatility` (Epic 81 territory)
- **Do not** change `recalculateUniverseVolatility`'s signature or windowing (Story 88.2 owns that)
- **Do not** introduce a second fetch of `fetchDividendHistory(symbol)` anywhere
- **Do not** change the database schema (Story 85.1 owns that)
- **Do not** change the API response shape of `/api/universe` (Story 85.3 owns that — the new volatility values flow into the same columns and out the same response)

### Files Likely to Change

| File | Change |
| --- | --- |
| `apps/server/src/app/routes/settings/common/get-distributions.function.ts` | Return `{ result, history }` instead of `DistributionResult \| undefined` |
| `apps/server/src/app/routes/settings/common/get-distributions.function.spec.ts` | Update return-shape assertions |
| `apps/server/src/app/routes/screener/get-consistent-distributions.function.ts` | Destructure `{ result }` from updated `getDistributions` return |
| `apps/server/src/app/routes/universe/sync-from-screener/index.ts` | Capture `history` from `getDistributions`; pass to `recalculateUniverseVolatility(id, history)` |
| `apps/server/src/app/routes/universe/sync-from-screener/index.spec.ts` | Mock `fetchDividendHistory`; assert wiring with payload |
| `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts` | Fetch history; pass to recalc |
| `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.spec.ts` | Mock `fetchDividendHistory`; assert wiring |
| `apps/server/src/app/routes/universe/index.ts` | PATCH handler: look up symbol, fetch history, pass to recalc |
| `apps/server/src/app/routes/universe/index.spec.ts` | Mock `fetchDividendHistory`; assert wiring |
| (optional) `apps/server/src/app/routes/universe/sync-from-screener/sync.integration.spec.ts` | Add coverage for unheld symbol path |

### Project Structure Notes

- `apps/server` is Fastify + TypeScript; routes live under `apps/server/src/app/routes/**`
- Universe sync entry point: `POST /api/sync-from-screener` — wired in `apps/server/src/app/routes/universe/sync-from-screener/index.ts`
- Logging: `import { logger } from '../../../utils/structured-logger'` (or equivalent relative path)
- Prisma singleton: `import { prisma } from '../../prisma/prisma-client'`
- All callbacks must be **named functions** (`@smarttools/no-anonymous-functions`)
- Vitest mocks: use the existing `vi.mock` patterns from Story 85.2's spec files as templates

### Dependency Notes

- Hard prerequisite: Story 88.2 must be merged first (the new signature must exist)
- Hard prerequisite: Story 88.1 Dev Notes must identify the wiring-point function
- Enables Story 88.4 (e2e regression) — the e2e test will only pass once this story is merged
- The Yahoo Finance fallback in `getDistributions` is preserved; the rows it returns also flow into volatility (a small behavioural improvement)

### Useful Commands

```bash
pnpm nx test server
pnpm exec vitest run apps/server/src/app/routes/universe/sync-from-screener/index.spec.ts
pnpm exec vitest run apps/server/src/app/routes/universe/add-symbol/add-symbol.function.spec.ts
pnpm exec vitest run apps/server/src/app/routes/universe/index.spec.ts
pnpm all
pnpm dupcheck
grep_search "recalculateUniverseVolatility\([^,]+, *\[\]\)"   # MUST return zero hits after this story
```

### References

- [apps/server/src/app/routes/universe/sync-from-screener/index.ts](apps/server/src/app/routes/universe/sync-from-screener/index.ts) — Universe-sync per-symbol entry; primary wiring point
- [apps/server/src/app/routes/settings/common/get-distributions.function.ts](apps/server/src/app/routes/settings/common/get-distributions.function.ts) — Wraps `fetchDividendHistory`; return-shape change is the cleanest wiring path
- [apps/server/src/app/routes/common/dividend-history.service.ts](apps/server/src/app/routes/common/dividend-history.service.ts) — `fetchDividendHistory` definition + 10-second rate limiter
- [apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts](apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts) — Add-symbol caller (must fetch history)
- [apps/server/src/app/routes/universe/index.ts](apps/server/src/app/routes/universe/index.ts) — PATCH route caller (must fetch history)
- [apps/server/src/app/routes/screener/get-consistent-distributions.function.ts](apps/server/src/app/routes/screener/get-consistent-distributions.function.ts) — Other `getDistributions` consumer
- [apps/server/src/app/volatility/recalculate-universe-volatility.function.ts](apps/server/src/app/volatility/recalculate-universe-volatility.function.ts) — Story 88.2 refactored signature
- [_bmad-output/implementation-artifacts/88-1-investigate-distribution-history-volatility-source.md](_bmad-output/implementation-artifacts/88-1-investigate-distribution-history-volatility-source.md) — Required prerequisite (wiring point)
- [_bmad-output/implementation-artifacts/88-2-refactor-volatility-to-use-distribution-history.md](_bmad-output/implementation-artifacts/88-2-refactor-volatility-to-use-distribution-history.md) — Required prerequisite (signature)
- [_bmad-output/implementation-artifacts/85-2-wire-volatility-recalculation-triggers.md](_bmad-output/implementation-artifacts/85-2-wire-volatility-recalculation-triggers.md) — Existing trigger wiring this story finishes
- [_bmad-output/planning-artifacts/epics-2026-04-28.md](_bmad-output/planning-artifacts/epics-2026-04-28.md) — Source epic (Epic 88, Story 88.3)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
