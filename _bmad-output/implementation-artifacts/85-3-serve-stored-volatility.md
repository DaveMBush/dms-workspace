# Story 85.3: Update Universe API to Serve Stored Volatility

Status: Review

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

- [x] Task 1: Update backend Universe interface to include volatility fields (AC: #1)
  - [x] Open `apps/server/src/app/routes/universe/universe.interface.ts`
  - [x] Add `volatilityLong: string | null` and `volatilityShort: string | null` to the `Universe` interface
  - [x] Ensure camelCase naming convention for TypeScript interface fields

- [x] Task 2: Update `get-all-universes` Prisma query to select volatility columns (AC: #1)
  - [x] Open `apps/server/src/app/routes/universe/get-all-universes/index.ts`
  - [x] Add `volatility_long: true` and `volatility_short: true` to the Prisma `select` object in the query (or confirm `findMany` without select returns all fields)
  - [x] Confirm `volatility_long` and `volatility_short` are available on the query result type

- [x] Task 3: Update `mapUniverseToResponse` to include stored volatility (AC: #1)
  - [x] Open `apps/server/src/app/routes/universe/index.ts`
  - [x] In `mapUniverseToResponse`, map `u.volatility_long ?? null` → `volatilityLong` and `u.volatility_short ?? null` → `volatilityShort`
  - [x] Confirm the Universe response shape now includes both new fields

- [x] Task 4: Update frontend `Universe` store interface (AC: #3)
  - [x] Open `apps/dms-material/src/app/store/universe/universe.interface.ts`
  - [x] Replace optional `volatility1yr?` and `volatility5yr?` fields with `volatilityLong: string | null` and `volatilityShort: string | null`
  - [x] Update any code that references the old field names (`volatility1yr`, `volatility5yr`)

- [x] Task 5: Update frontend rendering to use new field names (AC: #3)
  - [x] Open `apps/dms-material/src/app/global/global-universe/global-universe.component.html`
  - [x] Update `@switch` block for `'vol'` column — change `row.volatility1yr` to `row.volatilityLong`
  - [x] Confirm that `null` case already displays neutral placeholder (no icon)
  - [x] Open `apps/dms-material/src/app/global/global-universe/apply-volatility.function.ts`
  - [x] Update to set `volatilityLong` and `volatilityShort` from the universe row directly (or remove if no longer needed since data now comes directly from the API response)
  - [x] Open `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`
  - [x] If `VolatilityDataService` is no longer needed for Vol column rendering (since volatility comes directly from universe rows), remove its injection and the `applyVolatility` call
  - [x] If `VolatilityDataService` is kept for other purposes, mark it as deprecated

- [x] Task 6: Verify with Playwright MCP (AC: #4)
  - [x] Start `pnpm start:server` and `pnpm start:dms-material`
  - [x] Use Playwright MCP to navigate to `http://localhost:4301`
  - [x] Log in and navigate to the Universe screen
  - [x] Confirm volatility icons still render for symbols with distribution history
  - [x] Confirm no errors appear for symbols with null volatility

- [x] Task 7: Full test run (AC: #5)
  - [x] Run `pnpm all` and confirm all tests pass

## Dev Notes

### Key Insight: Two-Stage Volatility Architecture

Before this story, volatility was served via a **separate** endpoint and merged client-side:

```text
GET /api/universe          → universe data (no volatility)
GET /api/universe/volatility → volatility data (separate call)
↓
applyVolatility() in Angular → merges both into UI rows
```

After this story, volatility comes **directly** from the universe rows:

```text
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

- `apps/dms-material/src/app/global/global-universe/services/volatility-data.service.ts` - remove or deprecate because volatility now ships with the universe response
- `apps/dms-material/src/app/global/global-universe/services/volatility-result.interface.ts` - remove if `VolatilityDataService` is removed
- `apps/dms-material/src/app/global/global-universe/apply-volatility.function.ts` - remove because the client no longer merges a second volatility payload
- `apps/server/src/app/routes/universe/get-volatility/` - may remain, but it is no longer the primary Vol-column source

### Key Commands

```bash
pnpm nx run server:e2e-server      # Fastify API on port 3001 for the 4301 verification stack
pnpm nx run dms-material:serve-e2e # Angular app on port 4301 used by Playwright and MCP
pnpm nx test server                # Server unit tests
pnpm all                           # Full lint + build + test
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

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Implementation Summary

- Updated the main universe API response to expose `volatilityLong` and `volatilityShort` from stored `universe.volatility_long` and `universe.volatility_short` values, including add-universe responses and the shared backend interface.
- Removed the redundant client-side merge path by deleting `apply-volatility.function.ts`, `VolatilityDataService`, and its result interface, then switched the Universe screen to render directly from `row.volatilityLong`.
- Carried the new stored-volatility contract through the frontend store definition, enrichment helpers, and regression tests so both populated and null volatility values survive the normal table data flow.
- Updated the E2E seed helpers to write stored volatility fields directly into seeded universe rows, which keeps existing Vol-column browser coverage aligned with the new server-backed source of truth.

### Validation Notes

- Targeted frontend and server tests for the touched 85.3 slice passed earlier in this worktree before the final browser verification.
- `NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/dave/code/dms/story-85-3-serve-stored-volatility pnpm exec prisma generate` passed.
- `NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/dave/code/dms/story-85-3-serve-stored-volatility pnpm format` passed.
- `CI=1 NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/dave/code/dms/story-85-3-serve-stored-volatility pnpm all` passed.
- `NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/dave/code/dms/story-85-3-serve-stored-volatility pnpm dupcheck` passed.
- `NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/dave/code/dms/story-85-3-serve-stored-volatility pnpm e2e:dms-material:chromium` passed with `679 passed, 130 skipped (27.0m)`.
- `NX_DAEMON=false NX_WORKSPACE_ROOT_PATH=/home/dave/code/dms/story-85-3-serve-stored-volatility pnpm e2e:dms-material:firefox` passed with `679 passed, 130 skipped (33.2m)`.
- Live MCP verification used the actual 3001/4301 Playwright stack (`server:e2e-server` + `dms-material:serve-e2e`) because `start:dms-material` serves 4201 in this repo. On `http://localhost:4301/global/universe`, seeded symbol `LIVVOL33144091` rendered `aria-label="Volatility: steady"`, seeded symbol `LIVNUL33144091` rendered with no icon, and browser console error output remained empty.

### Completion Notes List

- The main `GET /api/universe` path now serves stored volatility directly and no longer depends on `volatility-query.function.ts` or any request-time merge on the Angular side.
- The null-volatility path was verified both in code and live: the row still renders and the Vol cell stays empty instead of throwing or showing a broken icon.
- Browser login for MCP verification is host-sensitive in this repo: `localhost:4301` works with the mock-auth flow, while `127.0.0.1:4301` does not complete the redirect.

## File List

- `_bmad-output/implementation-artifacts/85-3-serve-stored-volatility.md` - updated task state and recorded Story 85.3 implementation and validation details
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - moved Story 85.3 to `review`
- `apps/dms-material-e2e/src/helpers/seed-vol-column-e2e-data.helper.ts` - seeded stored volatility fields for the legacy Vol-column fixture
- `apps/dms-material-e2e/src/helpers/seed-volatility-new-categories.helper.ts` - seeded stored volatility fields for the new-category fixtures
- `apps/dms-material/src/app/global/global-universe/apply-volatility.function.ts` - removed redundant client-side volatility merge logic
- `apps/dms-material/src/app/global/global-universe/enrich-universe-with-risk-groups.function.spec.ts` - added regression coverage for stored and null volatility preservation
- `apps/dms-material/src/app/global/global-universe/enrich-universe-with-risk-groups.function.ts` - preserved stored volatility values through enrichment and placeholder rows
- `apps/dms-material/src/app/global/global-universe/global-universe.component.html` - switched Vol rendering to `row.volatilityLong`
- `apps/dms-material/src/app/global/global-universe/global-universe.component.ts` - removed `VolatilityDataService` usage and the old merge call
- `apps/dms-material/src/app/global/global-universe/services/volatility-data.service.ts` - removed obsolete separate volatility fetch service
- `apps/dms-material/src/app/global/global-universe/services/volatility-result.interface.ts` - removed obsolete separate volatility result contract
- `apps/dms-material/src/app/store/universe/universe-definition.const.ts` - added stored volatility defaults to the frontend entity definition
- `apps/dms-material/src/app/store/universe/universe-effect.service.spec.ts` - updated store effect fixtures for the new universe contract
- `apps/dms-material/src/app/store/universe/universe.interface.ts` - replaced `volatility1yr` and `volatility5yr` with `volatilityLong` and `volatilityShort`
- `apps/server/src/app/routes/universe/get-all-universes/index.ts` - mapped stored volatility columns into the main universe API response
- `apps/server/src/app/routes/universe/index.spec.ts` - asserted stored volatility fields are present in route responses
- `apps/server/src/app/routes/universe/index.ts` - added stored volatility fields to shared route mapping and add-universe responses
- `apps/server/src/app/routes/universe/universe.interface.ts` - added stored volatility fields to the backend universe contract

## Change Log

- 2026-04-26 - Served stored volatility directly from the main universe API and removed the obsolete client-side merge path.
- 2026-04-26 - Revalidated the story with full repo checks, grouped Chromium/Firefox E2E, and live MCP verification on 4301.
