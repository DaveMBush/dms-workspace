# Story 85.3: Update Universe API to Serve Stored Volatility

Status: Approved

## Story

As Dave,
I want the Universe screen to load faster because volatility is served directly from the
database instead of being recalculated on every request,
so that the application is more responsive as my universe grows.

## Acceptance Criteria

1. **Given** the Universe Fastify endpoint (`GET /api/universe`),
   **When** it processes a request,
   **Then** it reads `volatility_long` and `volatility_short` directly from the `universe`
   table rows and includes them in the response — no call to the `calculateVolatility`
   function or `volatility-query.function.ts` is made during the request.

2. **Given** the on-the-fly volatility calculation code path (the separate
   `GET /api/universe/volatility` endpoint and `VolatilityDataService` on the frontend),
   **When** a code reviewer inspects the Universe query path after this story,
   **Then** the calculation function is not called from within the main universe query or
   route handler (the `/api/universe/volatility` endpoint may remain but is no longer
   needed for the Vol column).

3. **Given** a universe symbol whose `volatility_long` is `NULL` (e.g. newly added with no
   distribution history, or not yet calculated by Story 85.2 triggers),
   **When** the API response is received by the frontend,
   **Then** the `null` value is handled gracefully and the "Vol" column shows the neutral
   placeholder — not an error or broken icon.

4. **Given** the change is applied,
   **When** the Playwright MCP server is used to load the Universe screen on the live app
   (`pnpm start:server` + `pnpm start:dms-material`, port 4301),
   **Then** volatility icons still render correctly for all symbols that have distribution
   history (i.e. non-null `volatility_long`).

5. **Given** `pnpm all` is run,
   **Then** all tests pass.

## Tasks / Subtasks

- [ ] Task 1: Update backend Universe interface to include volatility fields (AC: #1)
  - [ ] Open `apps/server/src/app/routes/universe/universe.interface.ts`
  - [ ] Add `volatilityLong: string | null` and `volatilityShort: string | null` to the `Universe` interface
  - [ ] Ensure camelCase naming convention for TypeScript interface fields

- [ ] Task 2: Update `get-all-universes` Prisma query to select volatility columns (AC: #1)
  - [ ] Open `apps/server/src/app/routes/universe/get-all-universes/index.ts`
  - [ ] Add `volatility_long: true` and `volatility_short: true` to the Prisma `select` object in the query (or confirm `findMany` without select returns all fields)
  - [ ] Confirm `volatility_long` and `volatility_short` are available on the query result type

- [ ] Task 3: Update `mapUniverseToResponse` to include stored volatility (AC: #1)
  - [ ] Open `apps/server/src/app/routes/universe/index.ts`
  - [ ] In `mapUniverseToResponse`, map `u.volatility_long ?? null` → `volatilityLong` and `u.volatility_short ?? null` → `volatilityShort`
  - [ ] Confirm the Universe response shape now includes both new fields

- [ ] Task 4: Update frontend `Universe` store interface (AC: #3)
  - [ ] Open `apps/dms-material/src/app/store/universe/universe.interface.ts`
  - [ ] Replace optional `volatility1yr?` and `volatility5yr?` fields with `volatilityLong: string | null` and `volatilityShort: string | null`
  - [ ] Update any code that references the old field names (`volatility1yr`, `volatility5yr`)

- [ ] Task 5: Update frontend rendering to use new field names (AC: #3)
  - [ ] Open `apps/dms-material/src/app/global/global-universe/global-universe.component.html`
  - [ ] Update `@switch` block for `'vol'` column — change `row.volatility1yr` to `row.volatilityLong`
  - [ ] Confirm that `null` case already displays neutral placeholder (no icon)
  - [ ] Open `apps/dms-material/src/app/global/global-universe/apply-volatility.function.ts`
  - [ ] Update to set `volatilityLong` and `volatilityShort` from the universe row directly (or remove if no longer needed since data now comes directly from the API response)
  - [ ] Open `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`
  - [ ] If `VolatilityDataService` is no longer needed for Vol column rendering (since volatility comes directly from universe rows), remove its injection and the `applyVolatility` call
  - [ ] If `VolatilityDataService` is kept for other purposes, mark it as deprecated

- [ ] Task 6: Verify with Playwright MCP (AC: #4)
  - [ ] Start `pnpm start:server` and `pnpm start:dms-material`
  - [ ] Use Playwright MCP to navigate to `http://localhost:4301`
  - [ ] Log in and navigate to the Universe screen
  - [ ] Confirm volatility icons still render for symbols with distribution history
  - [ ] Confirm no errors appear for symbols with null volatility

- [ ] Task 7: Full test run (AC: #5)
  - [ ] Run `pnpm all` and confirm all tests pass

## Dev Notes

### Key Insight: Two-Stage Volatility Architecture

Before this story, volatility was served via a **separate** endpoint and merged client-side:

```
GET /api/universe          → universe data (no volatility)
GET /api/universe/volatility → volatility data (separate call)
↓
applyVolatility() in Angular → merges both into UI rows
```

After this story, volatility comes **directly** from the universe rows:

```
GET /api/universe → universe data WITH volatilityLong + volatilityShort
↓
No separate call needed — Vol column reads row.volatilityLong directly
```

The `VolatilityDataService` and `applyVolatility.function.ts` become redundant.
Remove them unless they are used elsewhere (check with `grep_search` first).

### Field Naming Convention

The Prisma column is `snake_case` (`volatility_long`). The TypeScript interface and API
response use `camelCase` (`volatilityLong`). Map at the `mapUniverseToResponse` boundary:

```typescript
function mapUniverseToResponse(u: UniverseWithVolatility): Universe {
  return {
    // ...existing fields...
    volatilityLong: u.volatility_long ?? null,
    volatilityShort: u.volatility_short ?? null,
  };
}
```

### Null Handling in Template

The HTML template must gracefully handle `null` volatility — the existing `@switch` pattern
already falls through to a no-icon state for unknown/null values. Verify this is still correct
after the field rename.

### Server-Side Universe Interface

`apps/server/src/app/routes/universe/universe.interface.ts` (server-side):
```typescript
export interface Universe {
  // ...existing fields...
  volatilityLong: string | null;
  volatilityShort: string | null;
}
```

### Frontend Universe Interface

`apps/dms-material/src/app/store/universe/universe.interface.ts` (client-side):
```typescript
export interface Universe {
  // ...existing fields...
  volatilityLong: string | null;
  volatilityShort: string | null;
}
```

Note: the current optional `volatility1yr?` / `volatility5yr?` fields should be replaced
with the new non-optional `string | null` fields to enforce the contract.

### Existing Files to Clean Up

| File | Action |
|------|--------|
| `apps/dms-material/src/app/global/global-universe/services/volatility-data.service.ts` | Remove or deprecate — volatility now in universe response |
| `apps/dms-material/src/app/global/global-universe/services/volatility-result.interface.ts` | Remove if `VolatilityDataService` removed |
| `apps/dms-material/src/app/global/global-universe/apply-volatility.function.ts` | Remove — no longer merging separate data |
| `apps/server/src/app/routes/universe/get-volatility/` | Optionally keep but no longer primary source |

### Key Commands

```bash
pnpm start:server          # Start Fastify API server
pnpm start:dms-material    # Start Angular dev server (port 4301)
pnpm nx test server        # Server unit tests
pnpm all                   # Full lint + build + test
```

### References

- [apps/server/src/app/routes/universe/universe.interface.ts](apps/server/src/app/routes/universe/universe.interface.ts) — Server-side Universe interface
- [apps/server/src/app/routes/universe/index.ts](apps/server/src/app/routes/universe/index.ts) — Universe router with `mapUniverseToResponse`
- [apps/server/src/app/routes/universe/get-all-universes/index.ts](apps/server/src/app/routes/universe/get-all-universes/index.ts) — Prisma query for universe list
- [apps/dms-material/src/app/store/universe/universe.interface.ts](apps/dms-material/src/app/store/universe/universe.interface.ts) — Frontend Universe interface
- [apps/dms-material/src/app/global/global-universe/global-universe.component.html](apps/dms-material/src/app/global/global-universe/global-universe.component.html) — Vol column `@switch` rendering
- [apps/dms-material/src/app/global/global-universe/global-universe.component.ts](apps/dms-material/src/app/global/global-universe/global-universe.component.ts) — VolatilityDataService usage
- [apps/dms-material/src/app/global/global-universe/apply-volatility.function.ts](apps/dms-material/src/app/global/global-universe/apply-volatility.function.ts) — Client-side merge function (to remove)
- [apps/dms-material/src/app/global/global-universe/services/volatility-data.service.ts](apps/dms-material/src/app/global/global-universe/services/volatility-data.service.ts) — Separate volatility HTTP service (to remove)
