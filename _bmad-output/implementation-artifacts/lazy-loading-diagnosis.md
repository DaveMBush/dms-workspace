# Lazy Loading Diagnosis: Universe Table

## Root Cause

**All universe rows are loaded eagerly because the `top` entity returns every universe ID, and SmartSignals then fetches every one of those IDs via `loadByIds()`.**

The system uses a two-step fetch pattern:

1. **Step 1 — ID list**: The `top` entity (`POST /api/top`) calls `getTopUniverses()` which executes `prisma.universe.findMany({ select: { id: true } })` with **no pagination** (`skip`/`take`), returning every universe ID in the database.
2. **Step 2 — Row data**: SmartSignals sees `Top.universes` (an array of all IDs), then calls `UniverseEffectsService.loadByIds()` with those IDs, which does `POST /api/universe` with the full ID array. The server then runs `prisma.universe.findMany({ where: { id: { in: ids } } })` to return all rows.

There is **no index-based / paginated loading** anywhere in the chain. The `loadByIndexes()` method on both `UniverseEffectsService` and `TopEffectsService` throws `'Method not implemented.'`.

## Data Flow Trace

### Component Layer

- **File**: `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`
- **Data access**: `this.universeService.universes()` → reads from `UniverseService`

### Service Layer

- **File**: `apps/dms-material/src/app/global/global-universe/services/universe.service.ts`
- **Function**: `UniverseService.universes` (computed signal)
- **Action**: Calls `selectUniverses()` which returns all universe rows from the SmartSignals store

### Selector Chain

1. **`selectTopEntities`** (`apps/dms-material/src/app/store/top/selectors/select-top-entities.function.ts`)
   - `createSmartSignal<Top>('app', 'top')` — top-level signal for the `top` entity
   - This triggers `TopEffectsService.loadByIds(['1'])` → `POST /api/top` with `['1']`

2. **`selectTopUniverses`** (`apps/dms-material/src/app/store/universe/selectors/select-top-universes.function.ts`)
   - `createSmartSignal(selectTopEntities, [{ childFeature: 'app', childEntity: 'universes', parentField: 'universes', ... }])`
   - Reads `Top.universes` (the array of **all** universe IDs) and triggers `loadByIds()` for each batch

3. **`selectUniverses`** (`apps/dms-material/src/app/store/universe/selectors/select-universes.function.ts`)
   - `getTopChildRows<Top, Universe>(selectTopUniverses, 'universes')`
   - Returns all universe rows as a signal

### Effect Service Layer

- **File**: `apps/dms-material/src/app/store/universe/universe-effect.service.ts`
- **`loadByIds(ids)`**: `POST /api/universe` with the full array of IDs — **no pagination**
- **`loadByIndexes()`**: `throw new Error('Method not implemented.')` — **never called, not wired**

### Server Layer

- **`POST /api/top`** (`apps/server/src/app/routes/top/index.ts`)
  - `getTopUniverses()` → `prisma.universe.findMany({ select: { id: true }, where: ..., orderBy: ... })` — returns **all** IDs
  - No `skip`/`take` pagination parameters

- **`POST /api/universe`** (`apps/server/src/app/routes/universe/index.ts`)
  - `prisma.universe.findMany({ where: { id: { in: ids } }, include: { trades: ... } })` — fetches every requested ID

- **`GET /api/universe`** (`apps/server/src/app/routes/universe/get-all-universes/index.ts`)
  - `prisma.universe.findMany({ include: { risk_group: true, trades: true } })` — fetches **all** universes (used elsewhere, not primary path)

### Store Definition

- **File**: `apps/dms-material/src/app/store/universe/universe-definition.const.ts`
- No `markDirtyFetchesNew`, no pagination config, just basic entity definition with `entityName`, `effectServiceToken`, and `defaultRow`

### Virtual Scroll (Render-Only)

- **File**: `apps/dms-material/src/app/shared/components/base-table/base-table.component.html`
- `<cdk-virtual-scroll-viewport [itemSize]="rowHeight()">` — DOM virtualization only
- No `scrolledIndexChange` event handler wired to data fetching
- Virtual scroll handles **rendering** performance (only renders visible rows in the DOM), but **all data is already loaded in memory**

## Summary of Issues

| # | Issue | File(s) | Impact |
|---|-------|---------|--------|
| 1 | `getTopUniverses()` returns ALL IDs with no pagination | `apps/server/src/app/routes/top/index.ts` | Server sends every universe ID on initial load |
| 2 | `loadByIndexes()` not implemented | `apps/dms-material/src/app/store/universe/universe-effect.service.ts` | No mechanism for index-based fetching |
| 3 | No `PartialArrayDefinition` / virtual array in store config | `apps/dms-material/src/app/store/universe/universe-definition.const.ts` | SmartSignals treats universes as a flat ID list, not a virtual array |
| 4 | Virtual scroll not connected to data fetching | `apps/dms-material/src/app/shared/components/base-table/base-table.component.html` | Scroll position doesn't drive data loading |

## SmartSignals Lazy Loading Architecture

SmartSignals supports lazy loading through its **virtual array / `loadByIndexes`** pattern:

### How It Works (from `@smarttools/smart-core` types)

1. **`PartialArrayDefinition`**: Represents a page of data with `{ startIndex, indexes (string[]), length }`. The `length` is the total row count; `indexes` contains only the IDs for the requested page; `startIndex` is where they fit in the virtual array.

2. **`EffectService.loadByIndexes(parentId, childField, startIndex, length)`**: Called by SmartSignals when it needs a range of rows. Should return an `Observable<PartialArrayDefinition>` with the requested page of IDs.

3. **Virtual Array**: When SmartSignals receives a `PartialArrayDefinition`, it builds a sparse/virtual array internally. Only the requested range has real IDs; other positions use placeholder IDs (format: `index${psi}${index}`). When a placeholder comes into view, SmartSignals fires another `loadByIndexes` call.

4. **`defaultRow(id)`**: The `id` parameter may be in the form `index${psi}${index}` for virtual rows. The default row function should handle this to create a loading placeholder.

### What Needs to Change for Lazy Loading

#### Server Side (`apps/server/src/app/routes/top/index.ts`)
- `getTopUniverses()` must return a `PartialArrayDefinition` instead of a flat `string[]`, OR
- The `top` entity should return only a total count + first page of IDs, and subsequent pages are fetched via `loadByIndexes()`

#### Client Side — Effect Service (`universe-effect.service.ts`)
- Implement `loadByIndexes()` to call a new server endpoint that accepts `start`/`length` parameters and returns `PartialArrayDefinition`

#### Client Side — Store Definition (`universe-definition.const.ts`)
- May need additional configuration depending on how SmartSignals triggers virtual array loading (this is handled implicitly when `loadByIndexes` is wired up and the parent field contains a virtual array)

#### Server Side — New Endpoint
- Create a `GET /api/universe/indexes?parentId=1&childField=universes&start=N&length=M` endpoint (or similar) that returns `{ startIndex, indexes, length }` from the database using `skip`/`take`

## Recommended Implementation Approach

### Story 40.2: Server-Side Pagination Support
1. Add a new route or modify the `top` route to support returning `PartialArrayDefinition` for universes
2. Use `prisma.universe.count()` for total length
3. Use `prisma.universe.findMany({ skip: start, take: length, select: { id: true } })` for the page of IDs
4. Return `{ startIndex: start, indexes: ids, length: totalCount }`

### Story 40.3: Client-Side Virtual Array Wiring
1. Implement `loadByIndexes()` in `UniverseEffectsService` to call the new endpoint
2. Update the `top` route response so `universes` field triggers virtual array behavior
3. Verify SmartSignals automatically requests more pages as the user scrolls via `cdk-virtual-scroll-viewport`
4. Update `defaultRow()` to handle placeholder IDs gracefully
