# Current data flow (as‑is)

1. Screener refresh and curation

   - GET `/api/screener` scrapes + filters and upserts `screener` entries.
     Source: `apps/server/src/app/routes/screener/index.ts`.
   - POST `/api/screener/rows` returns selected screener rows by ids.
   - PUT `/api/screener/rows` updates booleans on a screener row.

2. Manual universe management

   - UI dialog allows pasting symbols per risk group and triggers:
     - POST `/api/settings` to upsert `universe`, mark non‑listed symbols
       as `expired=true`.
       Source: `routes/settings/index.ts`.
     - GET `/api/settings/update` refreshes prices/distributions for all
       universes.

3. Universe read & trading consumers
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
