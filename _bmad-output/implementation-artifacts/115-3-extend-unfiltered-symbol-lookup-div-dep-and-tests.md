# Story 115.3: Extend Shared Unfiltered Symbol Lookup to Dividend/Deposit and Add Regression Coverage

Status: Approved

**Story Key:** `115-3-extend-unfiltered-symbol-lookup-div-dep-and-tests`
**Epic:** 115 - Decouple Modal Symbol Lookup from Universe Filters
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-30.md](../planning-artifacts/epics-2026-05-30.md) (Story 115.3)
**Story Meta:** [_bmad-output/planning-artifacts/story-meta/2026-05-30/115-3-extend-unfiltered-symbol-lookup-div-dep-and-tests.yaml](../planning-artifacts/story-meta/2026-05-30/115-3-extend-unfiltered-symbol-lookup-div-dep-and-tests.yaml)
**Source Story Title in Epic File:** `Extend Shared Lookup to Dividend/Deposit Modal and Lock in Regression Coverage`
**Type:** Implementation
**Depends on:** Story 115.2
**Enables:** none
**Requirements covered:** R4, R5, R6

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Dave,
I want the Dividend/Deposit modal to find any matching symbol regardless of Universe filters,
So that entering dividends or deposits is not blocked by unrelated screen state.

## Epic Context

Story 115.1 established that both Add Position and Dividend/Deposit currently search the
resident `selectUniverses()` Smart Signals collection in memory rather than querying a fresh,
unfiltered source. Story 115.2 is the first implementation step: it introduces the shared,
Universe-backed lookup route and client service used by Add Position.

Story 115.3 must extend that same shared lookup to Dividend/Deposit and add durable regression
coverage proving both modals can still find a symbol even when active Universe filters hide that
symbol from the visible Universe table. This story must not fork a second lookup path, silently
repoint the Yahoo-backed symbol search, or regress existing Dividend/Deposit behavior around
deposit-type-specific validation, optional-symbol deposit flows, uppercase normalization, edit-mode
read-only symbol behavior, or exact-match `universeId` resolution.

## Acceptance Criteria

1. **AC1 - Dividend/Deposit uses the shared unfiltered lookup.** (R5, R6)
   **Given** typed text in the Dividend/Deposit modal symbol field,
   **When** the query reaches the configured threshold,
   **Then** the modal uses the shared unfiltered lookup source from Story 115.2 instead of the
   current resident `selectUniverses()` scan, and matching symbols are returned even when those
   symbols are hidden on the Universe screen.

2. **AC2 - Existing Dividend/Deposit behavior is preserved.** (R5)
   **Given** the existing Dividend/Deposit modal behavior,
   **When** the new lookup is integrated,
   **Then** deposit-type-specific validation, symbol-optional deposit flows, uppercase
   normalization, exact-match resolution, and edit-mode behavior continue to work exactly as they
   do today.

3. **AC3 - Cross-modal hidden-symbol regression coverage exists.** (R4, R5, R6)
   **Given** both Add Position and Dividend/Deposit use the shared lookup source,
   **When** regression tests run with active Universe filters that hide the target symbol,
   **Then** both modal flows can still find and select the expected symbol and no lookup path
   reverts to filtered-Universe sourcing.

4. **AC4 - Full validation passes.**
   **Given** `pnpm all`, `pnpm e2e:dms-material:chromium`, and
   `pnpm e2e:dms-material:firefox` run,
   **When** the change is validated,
   **Then** all targeted unit, integration, and regression coverage passes.

## Tasks / Subtasks

- [ ] **Task 1 - Confirm the dependency handoff and read every real update surface before editing** (AC: #1, #2, #3)
  - [ ] Read [_bmad-output/implementation-artifacts/115-1-investigate-modal-symbol-lookup-source.md](./115-1-investigate-modal-symbol-lookup-source.md) and [_bmad-output/implementation-artifacts/115-2-implement-unfiltered-symbol-lookup-add-position.md](./115-2-implement-unfiltered-symbol-lookup-add-position.md) completely. Treat Story 115.2's shared lookup contract as the design source of truth for this story.
  - [ ] Read [apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.ts](../../apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.ts), [apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.html](../../apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.html), and [apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.spec.ts](../../apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.spec.ts) in full before changing the modal.
  - [ ] Read [apps/dms-material/src/app/shared/services/symbol-search.service.ts](../../apps/dms-material/src/app/shared/services/symbol-search.service.ts) and its spec, plus any Universe-backed lookup route and tests added by Story 115.2 under [apps/server/src/app/routes/universe](../../apps/server/src/app/routes/universe).
  - [ ] Read the current e2e anchors: [apps/dms-material-e2e/src/add-symbol-modals-validation.spec.ts](../../apps/dms-material-e2e/src/add-symbol-modals-validation.spec.ts), [apps/dms-material-e2e/src/dividend-deposits-modal.spec.ts](../../apps/dms-material-e2e/src/dividend-deposits-modal.spec.ts), and the relevant helper files under [apps/dms-material-e2e/src/helpers](../../apps/dms-material-e2e/src/helpers).
  - [ ] If Story 115.2 is not merged or its shared lookup seam is missing in the current branch, rebase or land that dependency first. Do not create a second modal-specific lookup route or service in Story 115.3.

- [ ] **Task 2 - Reuse the shared unfiltered lookup inside Dividend/Deposit** (AC: #1, #2)
  - [ ] Update [apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.ts](../../apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.ts) so `symbolSearchFnBound` calls the shared Universe-backed lookup introduced by Story 115.2 rather than scanning `selectUniverses()` locally.
  - [ ] Keep the existing `dms-symbol-autocomplete` `searchFn` contract intact. Bridge Observable/Promise differences inside the modal or shared service as needed; do not change the autocomplete component API just for this story.
  - [ ] Remove the resident-`selectUniverses()` dependency from exact-match validation and resolution once the shared 115.2 lookup seam exists. Reuse the same exact-match strategy as Add Position instead of introducing a second modal-specific async validation design.
  - [ ] Preserve `onSymbolSelected()`, uppercase blur normalization, `selectedSymbolId`, `selectedUniverseId`, and the dialog close payload shape.
  - [ ] Preserve deposit-type-specific behavior: non-Deposit types still require a valid symbol; Deposit type can still submit with no symbol; if a user types a symbol during a Deposit flow, it must still resolve to a valid Universe entry.
  - [ ] Preserve edit mode's read-only symbol behavior and existing labels/layout unless a focused regression fix proves a UI change is required.

- [ ] **Task 3 - Update focused unit coverage around the modal and shared lookup seam** (AC: #1, #2, #4)
  - [ ] Extend [apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.spec.ts](../../apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.spec.ts) instead of creating a parallel component spec.
  - [ ] Replace direct `selectUniverses()`-driven expectations with mocks around the shared lookup seam once the component stops using resident Universe rows.
  - [ ] Cover at minimum: service-backed search invocation, selecting a returned option sets `selectedUniverseId`, uppercase normalization still occurs, exact typed symbol resolution still works on blur/submit, Deposit keeps symbol optional, and an unresolved typed symbol still produces `invalidSymbol`.
  - [ ] If Story 115.3 needs a shared exact-match helper or extra Universe-backed service method, extend [apps/dms-material/src/app/shared/services/symbol-search.service.spec.ts](../../apps/dms-material/src/app/shared/services/symbol-search.service.spec.ts) with focused coverage rather than burying HTTP assertions only in component tests.

- [ ] **Task 4 - Add durable hidden-symbol regression coverage for both modals** (AC: #3, #4)
  - [ ] Add the Add Position side of the regression to [apps/dms-material-e2e/src/add-symbol-modals-validation.spec.ts](../../apps/dms-material-e2e/src/add-symbol-modals-validation.spec.ts) or a tightly scoped sibling spec if that produces a cleaner hidden-symbol scenario without duplicating its existing polarity cases.
  - [ ] Add the Dividend/Deposit side of the regression to [apps/dms-material-e2e/src/dividend-deposits-modal.spec.ts](../../apps/dms-material-e2e/src/dividend-deposits-modal.spec.ts) or a shared focused sibling spec, reusing helpers rather than creating a second broad modal suite.
  - [ ] Seed at least one known Universe symbol that can be hidden by active Universe-screen filters and is available to both modal flows. Prefer reusable helpers under [apps/dms-material-e2e/src/helpers](../../apps/dms-material-e2e/src/helpers) over inline database setup.
  - [ ] Use Playwright to apply Universe-screen filters that hide the target symbol from the visible table, then verify Add Position can still search/select it and Dividend/Deposit can still search/select it in a non-Deposit flow.
  - [ ] Keep one focused regression proving Deposit type can still submit without a symbol so the shared lookup change does not accidentally make symbol entry mandatory for deposits.

- [ ] **Task 5 - Run the quality gate and record the real validation surface** (AC: #4)
  - [ ] Use Playwright on the running app to manually confirm the hidden-symbol scenario for both modals before closing the story.
  - [ ] Run `pnpm all`.
  - [ ] Run `pnpm e2e:dms-material:chromium`.
  - [ ] Run `pnpm e2e:dms-material:firefox`.
  - [ ] Record which spec files and helper files now own the durable hidden-symbol regression so future stories do not duplicate coverage.

## Dev Notes

### Dependency Gate

- Story 115.3 is intentionally downstream of Story 115.2. Reuse the shared Universe-backed lookup route and client-service seam from 115.2; do not fork another modal-specific lookup implementation.
- If 115.2 is incomplete in the working branch, land or rebase it first. The core failure mode to avoid in 115.3 is "Dividend/Deposit fixed separately from Add Position," because that recreates the duplication Story 115 was meant to remove.

### Current Dividend/Deposit Behavior

- [apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.ts](../../apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.ts) currently binds `symbolSearchFnBound` to `dms-symbol-autocomplete`, scanning `selectUniverses()` in memory and returning up to 50 `SymbolOption` results by `symbol` or `name`.
- The same component also uses `selectUniverses()` for exact-match validation and resolution in `symbolExistsValidator()`, `tryResolveFromControl()`, and `resolveSymbol()`. That is the dependency Story 115.3 must remove.
- `onSymbolBlur()` already uppercases typed text and resolves `selectedUniverseId` / `selectedSymbolId` on an exact match. Preserve that user-facing behavior even if the underlying lookup source changes.
- `updateSymbolValidators()` removes `Validators.required` when the selected type is `Deposit`, but typed symbols still flow through `invalidSymbol` validation. Preserve that distinction.
- Edit mode is different from add mode: the symbol is read-only and pre-populated. Story 115.3 should leave the edit path unchanged unless a focused regression proves otherwise.

### Shared Lookup and Server Constraints

- [apps/dms-material/src/app/shared/services/symbol-search.service.ts](../../apps/dms-material/src/app/shared/services/symbol-search.service.ts) currently exposes only the Yahoo-backed `/api/symbol/search` lookup via `searchSymbols(query)`. Story 115.2 is expected to add or already has added a separate Universe-backed lookup method. Reuse that method; do not repoint the Yahoo-backed call because Add Symbol and other callers still depend on it.
- The server lookup seam should remain under the Universe route tree, for example [apps/server/src/app/routes/universe/index.ts](../../apps/server/src/app/routes/universe/index.ts) plus a focused symbol-search route. Keep it stateless and independent from active UI filters, current screen state, or resident Smart Signals rows.
- Prisma Universe data still has no persisted `name` column in the main schemas. If the shared lookup payload needs `name`, keep using an already-available field or `name: ''`; do not widen schema or add a migration for Story 115.3.

### Test Surface Intelligence

- [apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.spec.ts](../../apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.spec.ts) already covers required symbol behavior, invalid symbol handling, submit-without-blur exact-match resolution, deposit-type-specific optional-symbol behavior, and blur uppercasing. Update this spec rather than creating a duplicate component-spec surface.
- [apps/dms-material-e2e/src/dividend-deposits-modal.spec.ts](../../apps/dms-material-e2e/src/dividend-deposits-modal.spec.ts) is the dedicated e2e home for Dividend/Deposit modal add/edit behavior. Prefer extending it for the Dividend/Deposit hidden-symbol regression.
- [apps/dms-material-e2e/src/add-symbol-modals-validation.spec.ts](../../apps/dms-material-e2e/src/add-symbol-modals-validation.spec.ts) already seeds known in-Universe and out-of-Universe symbols and covers Add Position modal validation semantics. It is the best existing Add Position anchor for the hidden-symbol regression unless a tighter sibling spec is clearly simpler.
- [apps/dms-material-e2e/src/open-positions.spec.ts](../../apps/dms-material-e2e/src/open-positions.spec.ts) is broader smoke coverage with skipped CRUD scenarios. Do not place the primary hidden-symbol regression there unless no better focused surface exists.

### Likely File Touch List

- **Primary UPDATE targets:**
  - [apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.ts](../../apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.ts)
  - [apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.spec.ts](../../apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.spec.ts)
  - [apps/dms-material/src/app/shared/services/symbol-search.service.ts](../../apps/dms-material/src/app/shared/services/symbol-search.service.ts)
  - [apps/dms-material/src/app/shared/services/symbol-search.service.spec.ts](../../apps/dms-material/src/app/shared/services/symbol-search.service.spec.ts)
  - [apps/dms-material-e2e/src/add-symbol-modals-validation.spec.ts](../../apps/dms-material-e2e/src/add-symbol-modals-validation.spec.ts)
  - [apps/dms-material-e2e/src/dividend-deposits-modal.spec.ts](../../apps/dms-material-e2e/src/dividend-deposits-modal.spec.ts)
- **Possible helper additions or updates:**
  - [apps/dms-material-e2e/src/helpers/seed-add-symbol-modals-e2e-data.helper.ts](../../apps/dms-material-e2e/src/helpers/seed-add-symbol-modals-e2e-data.helper.ts)
  - [apps/dms-material-e2e/src/helpers/seed-div-deposits-e2e-data.helper.ts](../../apps/dms-material-e2e/src/helpers/seed-div-deposits-e2e-data.helper.ts)
  - A new shared hidden-symbol seed helper under [apps/dms-material-e2e/src/helpers](../../apps/dms-material-e2e/src/helpers) if both modal specs need the same setup
- **Only touch if a focused follow-up fix is required:**
  - Universe symbol-search route files created by Story 115.2
  - [apps/dms-material/src/app/shared/components/symbol-autocomplete/symbol-autocomplete.component.ts](../../apps/dms-material/src/app/shared/components/symbol-autocomplete/symbol-autocomplete.component.ts)
  - [prisma/schema.prisma](../../prisma/schema.prisma)
  - [prisma/schema.postgresql.prisma](../../prisma/schema.postgresql.prisma)

### Project Context References

- [_bmad-output/project-context.md](../project-context.md) confirms Angular 21 standalone + zoneless + OnPush patterns, Fastify + Prisma routing conventions, and the Vitest/Playwright toolchain.
- [_bmad-output/planning-artifacts/architecture.md](../planning-artifacts/architecture.md) confirms server routes live under `apps/server/src/app/routes/{domain}/`, route registration happens through the domain `index.ts`, and Prisma schema changes must stay synchronized across SQLite/PostgreSQL schemas if schema work is ever needed. Story 115.3 should avoid schema work.
- [_bmad-output/planning-artifacts/epics-2026-05-30.md](../planning-artifacts/epics-2026-05-30.md) is the story-level source of truth for the acceptance criteria and validation commands.

### References

- Epic source: [_bmad-output/planning-artifacts/epics-2026-05-30.md](../planning-artifacts/epics-2026-05-30.md)
- Story metadata: [_bmad-output/planning-artifacts/story-meta/2026-05-30/115-3-extend-unfiltered-symbol-lookup-div-dep-and-tests.yaml](../planning-artifacts/story-meta/2026-05-30/115-3-extend-unfiltered-symbol-lookup-div-dep-and-tests.yaml)
- Previous stories: [_bmad-output/implementation-artifacts/115-1-investigate-modal-symbol-lookup-source.md](./115-1-investigate-modal-symbol-lookup-source.md), [_bmad-output/implementation-artifacts/115-2-implement-unfiltered-symbol-lookup-add-position.md](./115-2-implement-unfiltered-symbol-lookup-add-position.md)
- Dividend/Deposit modal: [apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.ts](../../apps/dms-material/src/app/account-panel/div-dep-modal/div-dep-modal.component.ts)
- Shared search service: [apps/dms-material/src/app/shared/services/symbol-search.service.ts](../../apps/dms-material/src/app/shared/services/symbol-search.service.ts)
- Add Position regression anchor: [apps/dms-material-e2e/src/add-symbol-modals-validation.spec.ts](../../apps/dms-material-e2e/src/add-symbol-modals-validation.spec.ts)
- Dividend/Deposit regression anchor: [apps/dms-material-e2e/src/dividend-deposits-modal.spec.ts](../../apps/dms-material-e2e/src/dividend-deposits-modal.spec.ts)

## Definition of Done

- [ ] Dividend/Deposit uses the shared unfiltered, query-driven Universe symbol lookup from Story 115.2
- [ ] Deposit-specific optional-symbol behavior and non-Deposit symbol validation both still work
- [ ] Hidden-symbol regression coverage exists for both Add Position and Dividend/Deposit under active Universe filters
- [ ] Focused unit coverage is updated for the Dividend/Deposit modal and shared lookup seam
- [ ] `pnpm all`, `pnpm e2e:dms-material:chromium`, and `pnpm e2e:dms-material:firefox` pass

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- To be filled by dev agent during implementation.

### Completion Notes List

- To be filled by dev agent during implementation.

### File List

- To be filled by dev agent during implementation.
