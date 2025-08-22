# Architecture

This document describes the end‑to‑end flow for the CEF universe feature and
proposes the change required by the PRD to populate the universe from the
Screener. It covers data model, backend APIs, frontend touch points, sequencing,
testing, deployment, and rollback.

## Context & scope

- Project type: Brownfield with UI (Angular 20 + PrimeNG + Tailwind)
- Backend: Fastify + Prisma (SQLite)
- Goal: Replace manual symbol entry with a flow that derives the tradable
  Universe from the curated Screener results where three booleans are true.

## Domain model (Prisma snapshot)

- `risk_group` (id, name)
- `screener` (id, symbol unique, risk_group_id, booleans, distribution fields)
- `universe` (id, symbol, risk_group_id, distribution fields, expired flag)
- `trades` (tied to `universe` and `accounts`)

See `prisma/schema.prisma` for the full schema.

## Current data flow (as‑is)

1) Screener refresh and curation
   - GET `/api/screener` scrapes + filters and upserts `screener` entries.
     Source: `apps/server/src/app/routes/screener/index.ts`.
   - POST `/api/screener/rows` returns selected screener rows by ids.
   - PUT `/api/screener/rows` updates booleans on a screener row.

2) Manual universe management
   - UI dialog allows pasting symbols per risk group and triggers:
     - POST `/api/settings` to upsert `universe`, mark non‑listed symbols
       as `expired=true`.
       Source: `routes/settings/index.ts`.
     - GET `/api/settings/update` refreshes prices/distributions for all
       universes.

3) Universe read & trading consumers
   - Universe CRUD:
     - POST `/api/universe` (load by ids)
     - POST `/api/universe/add`
     - PUT `/api/universe`
     - DELETE `/api/universe/:id`
     Source: `routes/universe/index.ts`.
   - Frontend consumes Universe via `UniverseEffectsService` and renders/sorts
     via `UniverseDataService`.

Limitations: Manual symbol entry is the source of truth. Screener curation is
not used to drive Universe.

## Proposed change (to‑be)

Create a backend sync that derives Universe from curated Screener.

### Selection criteria

Use all `screener` rows where these are true:

- `has_volitility`
- `objectives_understood`
- `graph_higher_before_2008`

For each selected row:

- Ensure `risk_group_id` is set (already populated in Screener flow).
- Upsert into `universe` with fields:
  - `symbol`, `risk_group_id`
  - `distribution`, `distributions_per_year`, `ex_date`
    - Prefer values from Yahoo via `getDistributions(symbol)` to keep
      consistency with existing Universe flows (`settings` routes).
  - `last_price` via `getLastPrice(symbol)`
  - Reset `most_recent_sell_date` only for new inserts; do not reset for
    existing rows to preserve trading history.
  - Set `expired=false`.

Non‑selected symbols handling:

- Mark any `universe.symbol` not in the selected Screener set as `expired=true`.
- Do not delete; keep for history.

### New API

- POST `/api/universe/sync-from-screener`
  - Body: none.
  - Behavior: Implements the selection criteria, upserts the Universe, marks
    non‑selected as expired, returns summary.
  - Idempotent: Running multiple times yields the same result.
  - Feature flag: Only active when `USE_SCREENER_FOR_UNIVERSE=true`.

### API schema (examples)

#### Request Schema

- **Method**: POST
- **Path**: `/api/universe/sync-from-screener`
- **Headers**: `Content-Type: application/json`
- **Body**: `{}` (empty object) or no body required

#### Response Schema

**Success Response (200 OK)**

```json
{
  "inserted": 12,
  "updated": 34,
  "markedExpired": 5,
  "selectedCount": 46,
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "logFilePath": "logs/sync-2025-08-22T17-30-45-123Z-a1b2c3d4-e5f6-7890-abcd-ef1234567890.log"
}
```

**Field Descriptions**:
- `inserted` (number): Count of new universe records created
- `updated` (number): Count of existing universe records updated
- `markedExpired` (number): Count of universe records marked as expired
- `selectedCount` (number): Total count of screener records that met selection criteria
- `correlationId` (string): Unique identifier for tracking this sync operation across logs
- `logFilePath` (string): Path to the detailed log file for this sync operation

**Feature Disabled Response (403 Forbidden)**

When `USE_SCREENER_FOR_UNIVERSE` environment variable is not set to `true`:

```json
{
  "inserted": 0,
  "updated": 0,
  "markedExpired": 0,
  "selectedCount": 0,
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "logFilePath": "logs/sync-2025-08-22T17-30-45-123Z-a1b2c3d4-e5f6-7890-abcd-ef1234567890.log"
}
```

**Error Response (500 Internal Server Error)**

```json
{
  "inserted": 0,
  "updated": 0,
  "markedExpired": 0,
  "selectedCount": 0,
  "correlationId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "logFilePath": "logs/sync-2025-08-22T17-30-45-123Z-a1b2c3d4-e5f6-7890-abcd-ef1234567890.log"
}
```

Notes:

- Idempotent: multiple calls with unchanged Screener state return the same
  counts.
- Do not cache responses; clients should treat this as a command.
- Apply server-side rate limiting to prevent accidental hammering.

### Frontend changes

- `UniverseSettingsComponent` dialog:
  - Keep current controls for manual entry (as fallback).
  - Add a button "Use Screener" that calls the new POST endpoint.
  - After completion, close dialog and refresh relevant stores.

No changes to Universe read paths are required; consumers already read
`expired` and other fields.

## Error handling & edge cases

- Missing `risk_group` rows: ensure via existing `ensureRiskGroupsExist()`.
- Distribution unavailable: upsert with existing values; do not block sync.
- Network failures to Yahoo: retry/backoff similar to current flows; partial
  updates allowed, and a later `settings/update` call can catch up.
- Concurrency: wrap upserts and mark‑expired in a transaction.

## Testing plan

- Unit
  - Selector that builds the set of eligible Screener ids.
  - Upsert function maps fields correctly and preserves history.
  - Expire function only marks symbols not present.

- Integration (server)
  - Seed `risk_group`, `screener`, `universe` records, run sync, assert
    upserted rows and expirations. Re‑run to verify idempotency.

- E2E (UI)
  - Button triggers POST, dialog progress indicator shows, stores refresh.

## Deployment & configuration

- Env
  - `DATABASE_URL` (existing)
  - `USE_SCREENER_FOR_UNIVERSE` (new)

- Scheduling
  - Run GET `/api/screener` on a schedule (e.g., daily) to refresh sources.
  - The user can invoke the sync on demand from the UI.

## Schema changes plan (no immediate code changes)

These changes improve integrity and performance; apply via migrations after
review. A phased approach avoids downtime and allows safe rollback.

- Unique constraints
  - Add unique on `universe.symbol` (dedupe first; see below).
  - Add unique on `risk_group.name` to prevent duplicates.

- Indexes
  - `universe`: index on `expired`, index on `risk_group_id`.
  - `screener`: composite index on
    `(has_volitility, objectives_understood, graph_higher_before_2008)` and
    an index on `risk_group_id`.

- Phased rename (typo)
  - Field: `screener.has_volitility` → `has_volatility`.
  - Phase 1: Add new column `has_volatility` nullable, backfill from
    `has_volitility`, keep both updated in code (toggle via feature flag).
  - Phase 2: Switch reads/writes to `has_volatility` in code.
  - Phase 3: Backfill verification, drop `has_volitility` column.

- Dedupe plan for `universe.symbol`
  - Report current duplicates with a query and decide retention rule
    (keep most recent `updatedAt`).
  - Mark others as expired or archive before adding the unique.

- Rollback
  - Each migration must be reversible; document how to drop unique/indexes
    and how to restore the old column if needed.

## CI and testing

Define quality gates and automation to protect existing functionality while
adding the Screener→Universe sync.

- Strategy
  - Unit: pure logic (selection, mapping, expire rules).
  - Integration (server): Fastify + Prisma on a temp SQLite file.
  - E2E (optional): UI smoke for dialog and table render.
  - Coverage thresholds: lines 85%, branches 75%, functions 85%.

- Frameworks
  - Angular app: Jest (Nx preset), TestBed for components/services.
  - Server: Jest with ts-jest or swc, supertest for HTTP, Prisma test db.

- Nx targets
  - `nx run-many -t lint` for all projects.
  - `nx run-many -t test --ci --code-coverage`.
  - `nx run-many -t build` (affected on PRs).

- Test data and db
  - Use a per-test SQLite file via `DATABASE_URL=file:./test.db`.
  - Migrate before tests, wipe file after suite.
  - Seed minimal `risk_group` rows for server tests.

- Server integration tests must cover
  - Select eligible screener rows (three booleans true).
  - Upsert new, update existing without losing history fields.
  - Mark non-selected as `expired=true`.
  - Idempotency: second run produces no changes.

- Regression focus areas (manual checklist)
  - Trading views: positions and sell history unaffected.
  - Universe table sorting/filtering unchanged for existing symbols.
  - Settings manual update flow still works.

- CI pipeline (high level)
  - Setup Node 20.x and pnpm; cache pnpm store and Nx cache.
  - Install, lint, test with coverage, build.
  - Upload coverage summary and fail under thresholds.
  - For main, build artifacts; for PRs, run affected-only where possible.

- PR gating
  - All checks green: lint, tests, build.
  - Coverage thresholds met.
  - Spec changes required when behavior changes (architecture/backlog).

## Rollout & rollback

- Default off behind `USE_SCREENER_FOR_UNIVERSE=false`.
- Enable in non‑prod, validate parity with current manual list.
- Enable in prod; keep manual path as fallback.
- Rollback by toggling the flag off.

See detailed procedures in the [Rollback runbook](./rollback-runbook.md).

## Implementation sequence

1) Server: implement POST `/api/universe/sync-from-screener`.
2) UI: add "Use Screener" button and service call.
3) Tests: unit + integration.
4) Optional: job to schedule Screener refresh.

## References (source of truth)

- Prisma schema: `prisma/schema.prisma`
- Screener refresh: `routes/screener/index.ts`
- Screener rows: `routes/screener/rows/index.ts`
- Universe CRUD: `routes/universe/index.ts`
- Settings (manual universe): `routes/settings/index.ts`
- Settings/update (refresh): `routes/settings/update/index.ts`
- Frontend consumers:
  - `apps/rms/src/app/store/universe/universe-effect.service.ts`
  - `apps/rms/src/app/global/global-universe/universe-data.service.ts`
  - `apps/rms/src/app/universe-settings/*`

## Acceptance criteria

- Triggering the sync (spec) updates `universe` by selecting all `screener`
  rows with the three booleans set to true.
- Existing `universe` rows for selected symbols are updated (fields from
  Yahoo) but keep historical trading data; non‑selected rows are marked
  `expired=true` and are not deleted.
- Operation is idempotent; re‑running produces no change if inputs unchanged.
- Feature is disabled by default and is enabled only via
  `USE_SCREENER_FOR_UNIVERSE=true`.
- Manual universe entry remains available and unchanged.

## Sequence (sync-from-screener)

```mermaid
sequenceDiagram
  participant UI as UI (future: button)
  participant API as Fastify API
  participant DB as Prisma (SQLite)
  participant Yahoo as Yahoo APIs

  UI->>API: POST /api/universe/sync-from-screener (future)
  API->>DB: Query screener where all booleans true
  loop for each selected symbol
    API->>Yahoo: getLastPrice(symbol)
    API->>Yahoo: getDistributions(symbol)
    alt universe exists
      API->>DB: Update universe (preserve trading history)
    else new symbol
      API->>DB: Insert universe (expired=false)
    end
  end
  API->>DB: Mark non-selected universes expired
  API-->>UI: Summary { inserted, updated, markedExpired }
```
