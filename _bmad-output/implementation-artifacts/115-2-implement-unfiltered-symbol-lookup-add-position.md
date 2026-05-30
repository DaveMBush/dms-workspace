# Story 115.2: Implement Shared Unfiltered Symbol Lookup for Add Position

Status: Approved

**Story Key:** `115-2-implement-unfiltered-symbol-lookup-add-position`
**Epic:** 115 — Decouple Modal Symbol Lookup from Universe Filters
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-30.md](../planning-artifacts/epics-2026-05-30.md) (Story 115.2)
**Story Meta:** [_bmad-output/planning-artifacts/story-meta/2026-05-30/115-2-implement-unfiltered-symbol-lookup-add-position.yaml](../planning-artifacts/story-meta/2026-05-30/115-2-implement-unfiltered-symbol-lookup-add-position.yaml)
**Type:** Implementation
**Depends on:** Story 115.1
**Enables:** Story 115.3
**Requirements covered:** R4, R6

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Dave,
I want Add Position to find any matching symbol even when Universe filters hide it,
So that I can open positions without clearing unrelated Universe filters first.

## Epic Context

Story 115.1 established that both Add Position and Dividend/Deposit currently search the
resident `selectUniverses()` Smart Signals collection in memory rather than querying a fresh,
unfiltered source. That design couples modal symbol lookup to whatever Universe rows are
currently resident on the client and duplicates nearly identical search logic in both modal
components.

Story 115.2 is the first implementation step in the fix. It must introduce the shared,
unfiltered, query-driven lookup source and wire Add Position to it without regressing the
current dialog behavior around uppercase normalization, selected `universeId` mapping,
validation, and save payload shape. Story 115.3 then extends the same shared lookup to the
Dividend/Deposit modal and adds the cross-modal regression coverage.

## Acceptance Criteria

1. **AC1 — Add Position stops searching the filtered client-side Universe list.** (R4, R6)
   **Given** typed text in the Add Position symbol field,
   **When** the query reaches the configured threshold,
   **Then** the modal requests matching symbols from the shared unfiltered symbol lookup source
   instead of the current resident `selectUniverses()` scan.

2. **AC2 — Hidden symbols are discoverable in Add Position.** (R4)
   **Given** a symbol that is currently hidden by Universe filters,
   **When** Dave types matching text in Add Position,
   **Then** the symbol appears in the suggestion list and can be selected.

3. **AC3 — Existing Add Position behavior is preserved.**
   **Given** the shared `dms-symbol-autocomplete` component and current Add Position validation
   flow,
   **When** the new lookup path is integrated,
   **Then** selection, uppercase normalization, validation, and `universeId` resolution continue
   to work correctly.

4. **AC4 — Behavior verified through the UI.**
   **Given** the updated Add Position flow,
   **When** the behavior is verified via the Playwright MCP server,
   **Then** the dialog can find and select a symbol hidden by active Universe filters.

5. **AC5 — Quality gate.** (NFR1)
   **Given** `pnpm all` runs,
   **When** the implementation is validated,
   **Then** all tests pass.

## Tasks / Subtasks

- [ ] **Task 1 — Reconfirm the design handoff and read every update surface before editing** (AC: #1, #2, #3)
  - [ ] Read [_bmad-output/implementation-artifacts/115-1-investigate-modal-symbol-lookup-source.md](./115-1-investigate-modal-symbol-lookup-source.md) completely and use it as the design source of truth for this story.
  - [ ] Read [apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts) in full, including `symbolSearchFn()`, `symbolExistsValidator()`, `onSymbolSelected()`, `onSymbolBlur()`, `searchSymbolsSync()`, `findMatchingUniverse()`, and `checkUniversesLoaded()`.
  - [ ] Read [apps/dms-material/src/app/shared/components/symbol-autocomplete/symbol-autocomplete.component.ts](../../apps/dms-material/src/app/shared/components/symbol-autocomplete/symbol-autocomplete.component.ts) in full and preserve its `searchFn` contract, `minLength`, debounce, loading behavior, and selected/blur outputs.
  - [ ] Read [apps/dms-material/src/app/shared/services/symbol-search.service.ts](../../apps/dms-material/src/app/shared/services/symbol-search.service.ts) and [apps/dms-material/src/app/shared/services/symbol-search.service.spec.ts](../../apps/dms-material/src/app/shared/services/symbol-search.service.spec.ts) in full before extending the shared client lookup service.
  - [ ] Read [apps/server/src/app/routes/universe/index.ts](../../apps/server/src/app/routes/universe/index.ts), [apps/server/src/app/routes/universe/index.spec.ts](../../apps/server/src/app/routes/universe/index.spec.ts), [apps/server/src/app/routes/universe/universe.interface.ts](../../apps/server/src/app/routes/universe/universe.interface.ts), and both Prisma schema files before adding the new route.
  - [ ] Record in Dev Notes that the Prisma `universe` model has `symbol` but does **not** have a `name` column. Do not add a schema change just to populate autocomplete labels in this story.

- [ ] **Task 2 — Add a dedicated unfiltered Universe symbol-search route on the server** (AC: #1, #2)
  - [ ] Add a new Fastify route under the existing Universe route tree, preferably [apps/server/src/app/routes/universe/symbol-search/index.ts](../../apps/server/src/app/routes/universe/symbol-search/index.ts).
  - [ ] Register the route from [apps/server/src/app/routes/universe/index.ts](../../apps/server/src/app/routes/universe/index.ts) using the existing domain-route registration pattern.
  - [ ] Implement a query-driven lookup against `prisma.universe.findMany` that searches the canonical `universe` table, not Yahoo Finance and not the resident Smart Signals store.
  - [ ] Filter out deleted rows (`deletedAt: null`) and keep the lookup independent from current Universe screen filters, account filters, expired filters, or current client-side residency.
  - [ ] Search by `symbol` case-insensitively; if another already-persisted, no-schema-change display field is proven to exist, it may be included, but do not invent a new persistence field in this story.
  - [ ] Return a normalized `SymbolOption[]` payload with `id` and uppercase `symbol`. If no display name exists in persisted data, return `name: ''` rather than changing Prisma schema.
  - [ ] Enforce a small result limit (default `10`) and keep the route stateless, e.g. `GET /api/universe/symbol-search?query=<typed>&limit=<n>`.
  - [ ] Add focused route tests covering: required `query`, case-insensitive symbol matching, result limiting, and exclusion of deleted rows.

- [ ] **Task 3 — Extend the shared client symbol-search service for Universe-backed lookup** (AC: #1, #2)
  - [ ] Extend [apps/dms-material/src/app/shared/services/symbol-search.service.ts](../../apps/dms-material/src/app/shared/services/symbol-search.service.ts) with a dedicated method for Universe-backed lookup, for example `searchUniverseSymbols(query: string): Observable<SymbolOption[]>`.
  - [ ] Keep the existing `/api/symbol/search` Yahoo-backed behavior intact for Add Symbol and any other existing callers; do not silently repoint that method to Universe data.
  - [ ] Use a cache namespace or cache key strategy that does not collide with the existing external-symbol search cache.
  - [ ] Preserve the existing transformation/filtering pattern and return type so `dms-symbol-autocomplete` can consume the new method without component changes.
  - [ ] Extend [apps/dms-material/src/app/shared/services/symbol-search.service.spec.ts](../../apps/dms-material/src/app/shared/services/symbol-search.service.spec.ts) with focused coverage for the new Universe-backed endpoint and cache path.

- [ ] **Task 4 — Rewire Add Position to use the shared unfiltered lookup source** (AC: #1, #2, #3)
  - [ ] Replace the current `selectUniverses()`-backed autocomplete search path in [apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts) with the shared Universe-backed service method from Task 3.
  - [ ] Remove the current requirement to bulk-read the full Universe Smart Signals proxy before searching. `allUniversesLoaded()`, `checkUniversesLoaded()`, and `searchSymbolsSync()` should be deleted or retained only if a proven remaining responsibility still requires them.
  - [ ] Preserve `onSymbolSelected()` behavior so the selected option still sets uppercase `symbol`, `selectedUniverseId`, and control validity.
  - [ ] Preserve uppercase normalization on blur.
  - [ ] Preserve the save payload shape: the dialog still closes with `{ symbol, universeId, quantity, price, purchase_date }`.
  - [ ] Update validation and exact-match resolution so they no longer depend on `selectUniverses()` residency. Prefer keeping the validator synchronous by validating against resolved selection state and moving any async exact-match resolution into blur/submit helpers rather than introducing an async validator unless a focused proof shows that is necessary.
  - [ ] Ensure the dialog still rejects symbols that are not already in Universe.

- [ ] **Task 5 — Add focused frontend tests for Add Position without waiting for Story 115.3** (AC: #3, #5)
  - [ ] Create [apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.spec.ts](../../apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.spec.ts) because no dedicated spec currently exists.
  - [ ] Cover at minimum: service-backed search invocation, selecting a returned option sets `selectedUniverseId`, uppercase normalization still occurs, an exact typed symbol can still resolve before save, and an unresolved symbol remains invalid.
  - [ ] Keep broad cross-modal regression coverage out of this story; Story 115.3 owns the shared Add Position + Dividend/Deposit automated regression suite.

- [ ] **Task 6 — Verify through the UI and run the quality gate** (AC: #4, #5)
  - [ ] Use the Playwright MCP server on the running app to reproduce the original failure: apply a Universe filter that hides a known existing symbol, then open Add Position and confirm the symbol can still be found and selected.
  - [ ] If a focused automated e2e assertion is added now, extend an existing Add Position surface such as [apps/dms-material-e2e/src/open-positions.spec.ts](../../apps/dms-material-e2e/src/open-positions.spec.ts) or [apps/dms-material-e2e/src/add-symbol-modals-validation.spec.ts](../../apps/dms-material-e2e/src/add-symbol-modals-validation.spec.ts) rather than creating a second overlapping modal suite. Leave the full filter-hidden-symbol regression matrix to Story 115.3.
  - [ ] Run `pnpm all`.

## Dev Notes

### Dependency Gate

- Story 115.1 is the implementation handoff for this story. Do not revisit the high-level design. The chosen direction is a shared, API-backed, unfiltered lookup source reused by both modals.
- Story 115.2 only wires Add Position. Story 115.3 reuses the same lookup source for Dividend/Deposit and adds the durable two-modal regression coverage.

### Current Add Position Behavior

- `AddPositionDialogComponent` currently drives `dms-symbol-autocomplete` via `symbolSearchFnBound`, which waits for `allUniversesLoaded()` and then iterates `selectUniverses()` through `searchSymbolsSync()`.
- `symbolExistsValidator()`, `findMatchingUniverse()`, and `updateSelectedSymbol()` all depend on the resident `selectUniverses()` collection.
- `onSymbolSelected()` already has the correct post-selection behavior for this story: it uppercases the selected symbol, captures `selectedUniverseId`, and updates the control state.
- `onSave()` already guards on a resolved `selectedUniverseId`; preserve that invariant.

### Shared Autocomplete Contract

- `dms-symbol-autocomplete` is already compatible with this change. It debounces input by `300ms`, enforces a default `minLength` of `2`, shows loading state, and delegates lookup to the provided `searchFn`.
- Prefer not to edit `SymbolAutocompleteComponent` in this story. Reuse its existing async contract.

### Server-Side Design Constraints

- The existing `/api/symbol/search` route is **not** the implementation surface for this story. It searches Yahoo Finance and can return symbols that are **not** already in the local Universe, which breaks Add Position’s requirement that the symbol already exist in the system.
- Add a dedicated Universe-backed route under the `universe` domain instead.
- The Prisma `universe` model contains `id`, `symbol`, `expired`, `deletedAt`, and related trading fields, but **does not contain a `name` column** in either [prisma/schema.prisma](../../prisma/schema.prisma) or [prisma/schema.postgresql.prisma](../../prisma/schema.postgresql.prisma).
- The frontend `Universe` interface currently includes `name`, but the server `Universe` DTO does not return it. Treat that mismatch as existing context. Do not widen Prisma schema or introduce a migration in this story merely to populate autocomplete labels.
- If the `SymbolOption` contract requires `name`, return `name: ''` from the new route unless another already-persisted, already-available display field is proven and intentionally chosen.

### Recommended Implementation Shape

- **Server route:** `GET /api/universe/symbol-search?query=<typed>&limit=<n>`
- **Response shape:** `Array<{ id: string; symbol: string; name: string }>`
- **Search rules:** case-insensitive `symbol` contains match, result limit `10`, no dependency on current UI filters, no dependency on loaded Smart Signals rows.
- **Client reuse:** extend `SymbolSearchService` with a Universe-backed method rather than creating a second client-side modal-specific lookup implementation.
- **Validation strategy:** keep Add Position’s validator behavior but stop reading from `selectUniverses()`. Prefer resolved-selection validation plus blur/submit exact-match lookup over adding a network async validator.

### Likely File Touch List

- **Primary UPDATE targets:**
  - `apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts`
  - `apps/dms-material/src/app/shared/services/symbol-search.service.ts`
  - `apps/dms-material/src/app/shared/services/symbol-search.service.spec.ts`
  - `apps/server/src/app/routes/universe/index.ts`
  - `apps/server/src/app/routes/universe/index.spec.ts` or a new focused sibling route spec
- **Primary NEW targets:**
  - `apps/server/src/app/routes/universe/symbol-search/index.ts`
  - `apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.spec.ts`
- **Do not change unless a focused need is proven:**
  - `apps/dms-material/src/app/shared/components/symbol-autocomplete/symbol-autocomplete.component.ts`
  - `prisma/schema.prisma`
  - `prisma/schema.postgresql.prisma`

### Testing Guidance

- Server route tests should follow the existing Fastify injection pattern used in [apps/server/src/app/routes/universe/index.spec.ts](../../apps/server/src/app/routes/universe/index.spec.ts).
- Frontend service tests should follow the current `HttpTestingController` pattern in [apps/dms-material/src/app/shared/services/symbol-search.service.spec.ts](../../apps/dms-material/src/app/shared/services/symbol-search.service.spec.ts).
- Add Position component tests are missing today. Create a focused spec rather than trying to cover this only through e2e.
- For Playwright verification, use an existing open-positions modal surface rather than creating a second broad modal suite here. Story 115.3 owns the long-term regression coverage for both modals under active Universe filters.

### Project Context References

- [_bmad-output/project-context.md](../project-context.md) confirms Angular 21 zoneless, `inject()`, `OnPush`, signal-first patterns, Fastify + Prisma routing, and the Vitest + Playwright toolchain.
- [_bmad-output/planning-artifacts/architecture.md](../planning-artifacts/architecture.md) confirms server routes are co-located under `apps/server/src/app/routes/{domain}/`, Fastify route registration happens through the domain `index.ts`, and both Prisma schemas must remain in sync if schema work is required. This story should avoid schema work.
- The PRD baseline in [_bmad-output/planning-artifacts/prd.md](../planning-artifacts/prd.md) still frames Add Position and Dividend/Deposit symbol entry as Universe-backed behavior; this story changes lookup freshness, not the underlying business rule that the symbol must already exist in Universe.

### Previous Story Intelligence

- Story 115.1 proved the current duplicate modal search logic and selected the shared API-backed lookup direction.
- Story 115.1 also identified `apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts` and `apps/dms-material/src/app/shared/services/symbol-search.service.ts` as the nearest existing async search pattern. Reuse that pattern, but do **not** reuse the Yahoo-backed route itself for Add Position.
- Refine one Story 115.1 assumption during implementation: the proposed `SymbolOption.name` value cannot come from a `universe.name` Prisma column because none exists.

### References

- Epic source: [_bmad-output/planning-artifacts/epics-2026-05-30.md](../planning-artifacts/epics-2026-05-30.md)
- Story metadata: [_bmad-output/planning-artifacts/story-meta/2026-05-30/115-2-implement-unfiltered-symbol-lookup-add-position.yaml](../planning-artifacts/story-meta/2026-05-30/115-2-implement-unfiltered-symbol-lookup-add-position.yaml)
- Previous story: [_bmad-output/implementation-artifacts/115-1-investigate-modal-symbol-lookup-source.md](./115-1-investigate-modal-symbol-lookup-source.md)
- Add Position dialog: [apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts](../../apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts)
- Shared autocomplete: [apps/dms-material/src/app/shared/components/symbol-autocomplete/symbol-autocomplete.component.ts](../../apps/dms-material/src/app/shared/components/symbol-autocomplete/symbol-autocomplete.component.ts)
- Shared search service: [apps/dms-material/src/app/shared/services/symbol-search.service.ts](../../apps/dms-material/src/app/shared/services/symbol-search.service.ts)
- Universe routes: [apps/server/src/app/routes/universe/index.ts](../../apps/server/src/app/routes/universe/index.ts)

## Definition of Done

- [ ] Add Position uses the shared unfiltered, query-driven Universe symbol lookup source
- [ ] A symbol hidden by active Universe filters can still be found and selected in Add Position
- [ ] Uppercase normalization, validation, and `universeId` resolution still work correctly
- [ ] Server route, shared client service, and Add Position component have focused automated coverage
- [ ] Playwright MCP verification completed for the Add Position flow
- [ ] `pnpm all` passes

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- To be filled by dev agent during implementation.

### Completion Notes List

- To be filled by dev agent during implementation.

### File List

- To be filled by dev agent during implementation.
