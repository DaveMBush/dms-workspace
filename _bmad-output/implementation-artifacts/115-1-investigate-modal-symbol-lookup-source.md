# Story 115.1: Investigate Modal Symbol Lookup Source and Position-Mapping Gap

Status: Approved

**Story Key:** `115-1-investigate-modal-symbol-lookup-source`
**Epic:** 115 - Decouple Modal Symbol Lookup from Universe Filters
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-30.md](../planning-artifacts/epics-2026-05-30.md) (Epic 115 / Story 115.1)
**Story Meta:** [_bmad-output/planning-artifacts/story-meta/2026-05-30/115-1-investigate-modal-symbol-lookup-source.yaml](../planning-artifacts/story-meta/2026-05-30/115-1-investigate-modal-symbol-lookup-source.yaml)
**Source Story Title in Epic File:** `Investigate Current Modal Symbol Lookup Flow and Choose Shared Lookup Design`
**Type:** investigation / design handoff only - no production code changes
**Depends on:** none
**Enables:** Story 115.2 and Story 115.3

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want to trace how the Add Position and Dividend/Deposit modals currently source symbol
suggestions,
So that the shared fix targets the right client and server boundaries.

## Epic Context

Epic 115 exists because Dave can hide valid symbols on the Universe screen with active
filters and then fail to find those same symbols from Add Position or Dividend/Deposit.
The fix must remove modal lookup dependence on the currently resident Universe entity set
and replace it with a shared, unfiltered, query-driven lookup source that both modals can
reuse without breaking their current validation and selection flows.

This story is investigation-only. It should produce a precise diagnosis and a single
design choice for Stories 115.2 and 115.3. It must not change production code.

## Acceptance Criteria

1. **Given** the Add Position and Dividend/Deposit modals,
   **When** the developer traces symbol lookup from the modal components through the
   shared autocomplete component to the current data source,
   **Then** Dev Notes record the current source files and how lookup currently depends on
   `selectUniverses()` or other filtered Universe state.

2. **Given** the Universe filtering logic,
   **When** the developer reproduces the hidden-symbol failure with an active Universe
   filter,
   **Then** Dev Notes capture why the desired symbol cannot currently be found from the
   modal lookup.

3. **Given** the candidate implementation approaches,
   **When** the developer compares a shared API-backed live lookup against any client-only
   alternative,
   **Then** Dev Notes choose an unfiltered, query-driven symbol source and document the
   request shape, response shape, debounce/min-length expectations, and reuse plan across
   both modals.

4. **Given** the investigation is complete,
   **When** `pnpm all` runs,
   **Then** all tests pass and no production code is modified.

## Tasks / Subtasks

- [ ] **Task 1 - Read the current lookup path end-to-end before changing anything**
      (AC: 1, 2, 3)
  - [ ] Read `apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts`
        completely and record how `symbolSearchFn()`, `allUniversesLoaded`,
        `searchSymbolsSync()`, and `symbolExistsValidator()` use `selectUniverses()`.
  - [ ] Read `apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.ts`
        completely and record how `symbolSearchFnBound`, `symbolExistsValidator()`, and
        `resolveSymbol()` use `selectUniverses()`.
  - [ ] Read `apps/dms-material/src/app/shared/components/symbol-autocomplete/symbol-autocomplete.component.ts`
        completely and record the shared control contract: `searchFn`, `minLength`,
        debounce, loading behavior, and selected/blur events.
  - [ ] Read `apps/dms-material/src/app/store/universe/selectors/select-universes.function.ts`,
        `apps/dms-material/src/app/store/universe/selectors/select-top-universes.function.ts`,
        and `apps/dms-material/src/app/global/global-universe/services/universe.service.ts`
        to document what `selectUniverses()` actually returns and how the Smart Signals
        universe proxy is populated.
  - [ ] Read `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`
        and `apps/dms-material/src/app/global/global-universe/filter-universes.function.ts`
        to document how Universe screen filtering is applied for display and what parts of
        that behavior may or may not influence the modal-visible data set.

- [ ] **Task 2 - Reproduce the hidden-symbol failure and capture the exact reason**
      (AC: 2)
  - [ ] Choose a symbol that exists in `Universe` and can be hidden by the current
        Universe-screen filters.
  - [ ] Use the running app plus Playwright MCP (preferred) or an equivalent live
        repro path to apply a filter that hides the target symbol on the Universe screen.
  - [ ] Open Add Position and show whether the symbol is absent from suggestions when the
        same text is typed.
  - [ ] Open Dividend/Deposit and repeat the same repro.
  - [ ] In Dev Notes, explain whether the failure is caused by the modal scanning only the
        current client-side universe collection, by server/state coupling that changes what
        that collection contains, or by another proven boundary. Do not speculate - cite the
        live code path and the repro.

- [ ] **Task 3 - Document the current lookup boundary for both modals** (AC: 1, 2)
  - [ ] Record that Add Position currently performs an in-memory search over
        `selectUniverses()` rather than an API query, and that it also resolves
        `selectedUniverseId` from that same collection.
  - [ ] Record that Dividend/Deposit currently performs an in-memory search over
        `selectUniverses()` and validates/resolves exact matches from that same collection.
  - [ ] Record that `dms-symbol-autocomplete` is data-source agnostic: it debounces the
        user's input and delegates the lookup work to the supplied `searchFn`.
  - [ ] Record which files and methods are the actual seams for the future fix, and which
        files are only display-layer wrappers.

- [ ] **Task 4 - Compare lookup designs and choose the shared direction** (AC: 3)
  - [ ] Read `apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts`
        as the current reference implementation for query-driven symbol lookup on the
        client.
  - [ ] Read `apps/dms-material/src/app/shared/services/symbol-search.service.ts` and
        `apps/server/src/app/routes/symbol/search/index.ts` as the current reference
        client-service and Fastify-route pattern for async symbol lookup.
  - [ ] Compare two concrete options only:
        1. shared API-backed lookup against an unfiltered Universe-backed source
        2. client-only lookup by scanning resident `selectUniverses()` rows
  - [ ] Choose the API-backed, unfiltered, query-driven option unless live code evidence
        disproves it. If rejecting it, document exactly why.
  - [ ] Document the chosen contract in Dev Notes:
        - request shape
        - response shape
        - debounce expectation
        - minimum typed length
        - result limit
        - client reuse plan across both modals
        - server route / service seam to implement in Stories 115.2 and 115.3

- [ ] **Task 5 - Produce a direct handoff for Stories 115.2 and 115.3** (AC: 1, 3)
  - [ ] List the exact files Story 115.2 should modify for Add Position.
  - [ ] List the exact files Story 115.3 should modify for Dividend/Deposit and regression
        coverage.
  - [ ] Record what must be preserved:
        - uppercase normalization in both modals
        - `selectedUniverseId` resolution from the chosen suggestion
        - Add Position validation that the symbol must already exist in Universe
        - Dividend/Deposit behavior where deposit-type-specific flows can keep current
          symbol-required / symbol-optional behavior
        - `dms-symbol-autocomplete` public contract
  - [ ] Explicitly state whether the existing Yahoo-backed `/api/symbol/search` route can
        be reused directly, must be extended, or should only serve as an architectural
        reference.

- [ ] **Task 6 - Prove the story stayed investigation-only and quality-clean**
      (AC: 4)
  - [ ] Verify that only this story file changed and no production source files were
        modified.
  - [ ] Run `pnpm all`.
  - [ ] Record the validation result in Dev Notes.

## Dev Notes

### Current Code Findings

- **Add Position currently does local, in-memory symbol lookup.**
  `add-position-dialog.component.ts` binds `symbolSearchFn()` into
  `dms-symbol-autocomplete`. That method waits for `allUniversesLoaded()` and then calls
  `searchSymbolsSync(query)`, which loops over `selectUniverses()` and returns matching
  `{ id, symbol, name }` options. No lookup request is sent from this modal today.

- **Add Position validation and universe resolution use the same resident Universe
  collection.** `symbolExistsValidator()`, `findMatchingUniverse()`, and
  `updateSelectedSymbol()` all resolve against `selectUniverses()`. The selected row's
  `id` becomes `selectedUniverseId`, and the chosen symbol is uppercased in-place.

- **Dividend/Deposit currently does the same local lookup, but with its own duplicated
  implementation.** `div-dep-modal.component.ts` defines `symbolSearchFnBound` as an async
  function that loops over `selectUniverses()` and returns matching `SymbolOption[]`.
  `symbolExistsValidator()`, `tryResolveFromControl()`, and `resolveSymbol()` also scan
  `selectUniverses()` directly. No lookup request is sent from this modal today.

- **The shared autocomplete component is already compatible with API-backed live lookup.**
  `symbol-autocomplete.component.ts` applies `debounceTime(300)`, enforces `minLength`
  (default `2`), shows loading state, and delegates the actual query work to the supplied
  `searchFn`. It accepts any `ObservableInput<SymbolOption[]>`, so either Observable- or
  Promise-based modal adapters can continue to work.

- **`selectUniverses()` is a Smart Signals top-child collection, not a purpose-built search
  result set.** The selector chain is:
  `selectTopEntities -> selectTopUniverses -> selectUniverses`. `UniverseService`
  exposes that proxy directly and caches it to survive temporary recalculation gaps.
  Add Position explicitly iterates all rows to force the entire collection to load before
  searching. That means the current lookup path is coupled to whatever Universe entity set
  is resident in the client, not to a fresh query.

- **Global Universe filtering logic exists in a different path than the modal lookup.**
  `global-universe.component.ts` computes `filteredData$` by passing `UniverseService`
  rows through `filter-universes.function.ts`. The modal code does not call that helper.
  Investigation must therefore prove whether the hidden-symbol failure comes from
  resident-store coupling, current screen-state coupling, or another boundary. Do not
  assume `filter-universes.function.ts` alone is the root cause.

- **The project already has a query-driven symbol-search pattern worth reusing.**
  `universe-settings/add-symbol-dialog/add-symbol-dialog.ts` uses
  `SymbolSearchService.searchSymbols(query)` and feeds its results into the same
  `dms-symbol-autocomplete` component. The service calls `GET /api/symbol/search`, and the
  Fastify route in `apps/server/src/app/routes/symbol/search/index.ts` returns
  `SymbolOption[]` from Yahoo Finance results. This is a strong architectural reference,
  but it is not the same as an unfiltered Universe-backed lookup.

### Recommended Design Direction

Choose a **shared API-backed, unfiltered, query-driven Universe lookup** as the design for
Stories 115.2 and 115.3.

**Why this is the preferred design:**

- It removes both modals from direct dependence on the currently resident `selectUniverses()`
  collection.
- It lets the server query the canonical Universe data without requiring the client to load
  every row just to search.
- It eliminates the current duplicated search logic across Add Position and Dividend/Deposit.
- It keeps `dms-symbol-autocomplete` unchanged because that component already supports async
  search via `searchFn`.
- It follows an existing project pattern: Angular service -> Fastify route -> normalized
  `SymbolOption[]` response.

**Design to document and then implement in later stories:**

- **Request shape:** `GET /api/universe/symbol-search?query=<typed-text>&limit=<n>`
  (or equivalent Fastify route under the existing Universe route tree). Keep the request
  query-driven and stateless.
- **Minimum typed length:** `2`, matching the current `dms-symbol-autocomplete` default.
- **Debounce:** keep the existing `300ms` debounce already built into
  `dms-symbol-autocomplete`.
- **Result limit:** default `10`, unless live UX testing proves another limit is needed.
- **Response shape:** `Array<{ id: string; symbol: string; name: string }>` so the modals
  can keep resolving `selectedUniverseId` and displaying a symbol/name pair without
  inventing a second client shape.
- **Reuse plan:** expose a shared client lookup service for both modals. Either extend the
  existing `SymbolSearchService` with a Universe-backed method or introduce a sibling
  service with the same return contract. Both modals should pass that shared function into
  `dms-symbol-autocomplete` instead of scanning `selectUniverses()` directly.

**Client-only alternative to reject unless evidence proves otherwise:**

- Scanning resident `selectUniverses()` rows keeps the modals tied to client-side entity
  residency and stale/local screen state.
- It forces full-client loading of the Universe collection before search.
- It preserves duplicated search logic in two modal components.
- It makes the fix less robust and less reusable than the existing service/route pattern.

### Files to Read Before Starting

- `apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts`
- `apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.ts`
- `apps/dms-material/src/app/shared/components/symbol-autocomplete/symbol-autocomplete.component.ts`
- `apps/dms-material/src/app/store/universe/selectors/select-universes.function.ts`
- `apps/dms-material/src/app/store/universe/selectors/select-top-universes.function.ts`
- `apps/dms-material/src/app/global/global-universe/services/universe.service.ts`
- `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`
- `apps/dms-material/src/app/global/global-universe/filter-universes.function.ts`
- `apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts`
- `apps/dms-material/src/app/shared/services/symbol-search.service.ts`
- `apps/server/src/app/routes/symbol/search/index.ts`
- `apps/server/src/app/routes/universe/get-all-universes/index.ts`

### What Must Be Preserved

- Add Position uppercase normalization, `selectedUniverseId` capture, and existing
  validator behavior.
- Dividend/Deposit symbol selection behavior, including its current deposit-type-specific
  validation rules.
- `dms-symbol-autocomplete` public contract and UX: loading indicator, debounce, minimum
  length, selected-option output, and blur handling.
- Existing Fastify + Prisma layering and existing Angular service patterns.
- No new package dependencies.

### Testing Strategy

- Investigation story only: live repro plus documentation.
- `pnpm all` must pass unchanged.
- Do not add or change production behavior in this story.
- Stories 115.2 and 115.3 should add the implementation and regression tests after this
  investigation is complete.

## Project Context

- Project root: `/home/dave/code/dms-workspace`
- Epic source: `_bmad-output/planning-artifacts/epics-2026-05-30.md` -> Epic 115 -> Story 115.1
- Story meta source:
  `_bmad-output/planning-artifacts/story-meta/2026-05-30/115-1-investigate-modal-symbol-lookup-source.yaml`
- Primary code anchors from story metadata:
  - `apps/dms-material/src/app/account-panel/open-positions/add-position-dialog/add-position-dialog.component.ts`
  - `apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.ts`
  - `apps/dms-material/src/app/shared/components/symbol-autocomplete/symbol-autocomplete.component.ts`
  - `apps/dms-material/src/app/global/global-universe/filter-universes.function.ts`
- Reference lookup pattern already in repo:
  - `apps/dms-material/src/app/universe-settings/add-symbol-dialog/add-symbol-dialog.ts`
  - `apps/dms-material/src/app/shared/services/symbol-search.service.ts`
  - `apps/server/src/app/routes/symbol/search/index.ts`
- Architecture guardrails from `_bmad-output/project-context.md`:
  - Angular 21 zoneless, standalone, `inject()` only, signal-first state
  - Smart Signals / SmartNgRX entity-store patterns
  - Fastify + Prisma backend
  - Vitest + Playwright test stack
  - No new dependencies for this story
- Quality gate: `pnpm all`

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- Story creation analysis only; implementation has not started.

### Completion Notes List

- Story file created from Epic 115 plus live code-path analysis of the current modal
  lookup stack.
- Sprint tracking file currently stops at Epic 114, so Story 115.1 must be tracked here
  even if `_bmad-output/implementation-artifacts/sprint-status.yaml` has not yet been
  extended for Epic 115.

### File List

- `_bmad-output/implementation-artifacts/115-1-investigate-modal-symbol-lookup-source.md`
