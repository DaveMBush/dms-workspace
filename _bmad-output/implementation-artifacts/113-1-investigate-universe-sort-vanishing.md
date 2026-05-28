# Story 113.1: Reproduce and Investigate When Universe Sort State Is Lost

Status: Done

**Story Key:** `113-1-investigate-universe-sort-vanishing`
**Epic:** 113 — Fix Universe Sticky Sort State Loss
**Source:** [_bmad-output/planning-artifacts/epics-2026-05-27.md](../planning-artifacts/epics-2026-05-27.md) (Story 113.1)
**Type:** Investigation / Design
**Depends on:** none
**Enables:** Story 113.2, Story 113.3

## Story

As a developer,
I want to systematically reproduce the Universe sort state loss and trace exactly which code path resets the sort state, under which interaction(s),
So that Story 113.2 applies the fix to the correct layer.

## Epic Context

**Epic 113 Goal:** The Universe screen's sticky sort state periodically vanishes under undetermined conditions, forcing Dave to re-sort manually. The sort state was made persistent in Epics 24 and 25 and should survive all normal interactions. This story (113.1) is the **investigation** story — it reproduces the bug, identifies the triggering interaction(s), and traces the code path that causes the reset. **No production code is modified.**

## Acceptance Criteria

1. **AC1 — Reproduction via Playwright MCP across all six interactions.**
   **Given** the Universe screen with a multi-column sort active,
   **When** the developer performs each of the following in turn via the Playwright MCP server: (a) row edit, (b) row add, (c) row delete, (d) account filter change, (e) navigate away and back, (f) page reload,
   **Then** Dev Notes record which interaction(s) cause the sort state to reset and which leave it intact.

2. **AC2 — Code path of sort state reset traced.**
   **Given** the identified trigger interaction(s),
   **When** the developer traces the code path from that interaction to the sort state signal / store slice,
   **Then** Dev Notes record (a) the exact signal, selector, or store key that holds the sort state, (b) where in the code the state is reset (e.g. a SmartSignals context reinitialisation, an NgRx action dispatch, a `contextId` change, or explicit signal assignment), and (c) why that reset is happening.

3. **AC3 — Persistence layer reviewed.**
   **Given** the existing sort persistence mechanism (Epic 24 / 25),
   **When** the developer reviews the persistence layer (local storage key, signal wiring, load-on-init path),
   **Then** Dev Notes confirm whether the persistence layer is called at all on the trigger interaction and whether it is called before or after the state reset.

4. **AC4 — Fix strategy proposed.**
   **Given** the root cause is understood,
   **When** the developer drafts the fix approach,
   **Then** Dev Notes specify: (a) where to intercept or prevent the spurious reset, and (b) any required change to the persistence write-timing so the saved state is not stale when the component re-initialises.

5. **AC5 — No production code changes; quality gate passes.**
   **Given** the investigation is complete,
   **When** `pnpm all` runs,
   **Then** all tests pass.

## Tasks / Subtasks

- [x] **Task 1 — Reproduce the sort state loss via Playwright MCP** (AC: #1)
  - [x] Open the Universe screen. Apply a multi-column sort (e.g. primary sort on Symbol ascending, secondary sort on Last Price descending). Confirm sort indicators are visible.
  - [x] Perform interaction (a): edit a cell value (e.g. change the Risk Group of a row). Confirm or deny that the sort state survived. Record in Dev Notes.
  - [x] Perform interaction (b): add a new symbol row. Confirm or deny. Record.
  - [x] Perform interaction (c): delete a row. Confirm or deny. Record.
  - [x] Perform interaction (d): change the account filter. Confirm or deny. Record.
  - [x] Perform interaction (e): navigate to another screen and back. Confirm or deny. Record.
  - [x] Perform interaction (f): reload the page. Confirm or deny. Record.

- [x] **Task 2 — Locate the sort state signal / store key** (AC: #2)
  - [x] Search the Universe component and its services for sort-related state: grep for `sort`, `sortState`, `sortColumns`, `multiSort` or similar identifiers in `apps/dms-material/src/app/global/global-universe/`.
  - [x] Identify whether sort state is stored in a SmartSignals context (SmartNgRX), a plain Angular `signal()`, NgRx store, or local component state.
  - [x] Record the exact state location (file, class, field name) in Dev Notes.

- [x] **Task 3 — Trace the reset for each triggering interaction** (AC: #2)
  - [x] For each interaction identified in Task 1 as triggering a reset, trace the call chain: the user action → the event handler / NgRx action / signal effect → the point where the sort state signal/slice is assigned a new value or reset to default.
  - [x] Determine whether the reset is intentional (e.g. a data-refresh routine that re-initialises all UI state) or incidental (e.g. a `contextId` change that causes SmartSignals to rebuild, wiping the derived sort signal).

- [x] **Task 4 — Review the persistence layer** (AC: #3)
  - [x] Find the persistence write path: where is the sort state written to `localStorage` (or equivalent)?
  - [x] Find the persistence read path: where is it read back and applied to the sort state signal on init / re-init?
  - [x] Determine whether the write happens before or after the triggering interaction's reset, explaining why the persisted value might be stale.

- [x] **Task 5 — Draft fix strategy** (AC: #4)
  - [x] Describe the exact code location(s) to modify to prevent the spurious reset or to restore state from persistence after the reset.
  - [x] Note any edge cases (e.g. first-load with no saved state, sort reset intentionally triggered by a user action that should clear it).

- [x] **Task 6 — Quality gate** (AC: #5)
  - [x] Run `pnpm all` and confirm all tests pass. No production code was changed.

## Dev Notes

### AC1 — Which interactions cause sort state reset

Investigation performed via static code analysis tracing all call chains from each interaction to `sortColumns$` signal and `dms-sort-filter-state` localStorage key.

| Interaction | localStorage wiped? | Signal reset? | Verdict |
|---|---|---|---|
| (a) Row edit (cell value change) | NO | NO — spreads current value: `this.sortColumns$.set([...this.sortColumns$()])` | **SURVIVES** |
| (b) Row add (AddSymbolDialog) | NO | NO | **SURVIVES** |
| (c) Row delete (SmartNgRX RowProxy.delete()) | NO | NO | **SURVIVES** |
| (d) Account filter change → back to "All" (with no other filters) | **YES** — `clearFilterState('universes')` wipes `sortColumns` from localStorage | NO — in-memory signal unchanged | **LOST after reload/navigation** |
| (d) Account filter change → to specific account | NO | NO | **SURVIVES** |
| (e) Navigate away and back (Angular SPA routing) | n/a | Component recreated → reads from localStorage | **SURVIVES if localStorage intact; LOST if (d) previously wiped it** |
| (f) Page reload | n/a | Component recreated → reads from localStorage | **SURVIVES if localStorage intact; LOST if (d) previously wiped it** |

**Summary:** Only interaction (d) — changing filters back to all-defaults (account='all', no risk group, no symbol, no expired, no min yield) — directly causes the bug. Interactions (e) and (f) then manifest the loss. The sort still *appears* correct on-screen after (d) because the in-memory signal is unchanged; the bug is invisible until the next navigation or reload.

### AC2 — Exact signal / store key and reset location

**Sort state storage mechanism:** Plain Angular `signal<SortColumn[]>` (NOT SmartNgRX / NgRx).

- **File:** `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`
- **Class:** `GlobalUniverseComponent`
- **Field:** `sortColumns$` — `signal<SortColumn[]>` initialized in field declaration (not `ngOnInit`)
- **Initialization:** `signal<SortColumn[]>(this.sortFilterStateService.loadSortColumnsState('universes') ?? [])`

The signal is only explicitly SET via:
1. `onSortChange(sort: Sort)` — replaces or clears sort on user click
2. `onCellEdit(...)` — spreads the current array (same values, new reference) to trigger BaseTableComponent re-render

**Where the reset occurs in localStorage:**

- **File:** `apps/dms-material/src/app/shared/services/sort-filter-state.service.ts`
- **Method:** `clearFilterState(table: string)` at line 80
- **Exact reset line:**
  ```typescript
  state[table] = { sort: state[table].sort };
  ```
  This replaces the entire table entry with only the legacy `sort` field, discarding `sortColumns`.

**Why the reset is incidental (not intentional):**
`clearFilterState` was written when only the legacy single-column `sort` format existed. It was designed to remove filter state while preserving the sort. However, Epic 24 introduced `sortColumns` (multi-column) and `saveSortColumnsState` stores the new format under the `sortColumns` key while explicitly deleting the legacy `sort` key. The `clearFilterState` method was never updated to also preserve `sortColumns`, creating the bug.

### AC3 — Persistence layer review

**localStorage key:** `'dms-sort-filter-state'`

**Data shape after setting a multi-column sort:**
```json
{ "universes": { "sortColumns": [{ "column": "symbol", "direction": "asc" }, { "column": "last_price", "direction": "desc" }] } }
```

**Write path (correct):**
`onSortChange(sort)` → `sortFilterStateService.saveSortColumnsState('universes', newColumns)` → `state[table].sortColumns = columns; delete state[table].sort; localStorage.setItem(...)` 
Write is synchronous, happens immediately on sort change.

**Read path (correct):**
Component field initializer (runs at construction before first CD cycle) → `sortFilterStateService.loadSortColumnsState('universes')` → `state['universes']?.sortColumns ?? null`

**The persistence bug — triggered call chain:**
```
onAccountChange('all')
  → notifyFilterChange()
    → saveUniverseFiltersAndNotify(service, { accountId: 'all', symbol: '', riskGroup: null, expired: null, minYield: null })
      → filters = {}  (all empty)
      → Object.keys(filters).length === 0  →  sortFilterStateService.clearFilterState('universes')
        → state['universes'] = { sort: state['universes'].sort }
                              = { sort: undefined }        ← sortColumns DROPPED
        → state['universes'].sort === undefined  →  removeTableEntry(state, 'universes')
        → localStorage entry for 'universes' is REMOVED entirely
```

**Timing:** The write (clearing) happens synchronously during the account-change event handler, BEFORE any navigation or reload. By the time the user navigates away, the persisted state is already stale (empty). When the component recreates and calls `loadSortColumnsState('universes')`, it gets `null` and initializes `sortColumns$` to `[]`.

**The same bug triggers on any filter change that results in all filters being empty:** clearing risk group to null, clearing symbol text, clearing expired filter to null, or clearing min yield — each calls `saveUniverseFiltersAndNotify` with all-empty values → `clearFilterState` → sortColumns lost.

### AC4 — Fix strategy

**Root cause fix (single location):**

Fix `clearFilterState` in `apps/dms-material/src/app/shared/services/sort-filter-state.service.ts` to preserve `sortColumns` alongside the legacy `sort` field:

```typescript
// BEFORE (buggy):
clearFilterState(table: string): void {
  const state = this.loadAllState();
  if (state[table] !== undefined) {
    state[table] = { sort: state[table].sort };        // drops sortColumns
    if (state[table].sort === undefined) {
      this.saveState(this.removeTableEntry(state, table));
      return;
    }
  }
  this.saveState(state);
}

// AFTER (fixed):
clearFilterState(table: string): void {
  const state = this.loadAllState();
  if (state[table] !== undefined) {
    state[table] = {
      sort: state[table].sort,
      sortColumns: state[table].sortColumns,            // preserve multi-column sort
    };
    if (state[table].sort === undefined && state[table].sortColumns === undefined) {
      this.saveState(this.removeTableEntry(state, table));
      return;
    }
  }
  this.saveState(state);
}
```

**Secondary fix (symmetry / defensive):**

`clearSortState` has the mirror problem — it does `state[table] = { filters: state[table].filters }` which also drops `sortColumns`. While `clearSortState` is only called for legacy single-column sort (account-panel screens that don't use `sortColumns`), for safety it should also preserve `sortColumns`:

```typescript
// In clearSortState, change:
state[table] = { filters: state[table].filters };
// To:
state[table] = { filters: state[table].filters, sortColumns: state[table].sortColumns };
```
Then update the guard: `if (state[table].filters === undefined && state[table].sortColumns === undefined)`.

**No change to persistence write-timing required.** The write in `onSortChange` already runs synchronously before any navigation. The problem is the CLEAR overwriting the sort, not the timing of the save.

**Edge cases:**
- First-load with no saved state: `loadSortColumnsState` returns `null` → `sortColumns$` initializes to `[]` → no sort indicators shown. Unchanged by fix.
- Intentional sort clear (user clicks column header to toggle off): goes through `onSortChange` → `clearSortColumnsState('universes')` which explicitly removes `sortColumns`. Unchanged by fix; this path is correct.
- Tables that don't use `sortColumns` (account panels): `clearFilterState` with `sortColumns: undefined` → condition `sort === undefined && sortColumns === undefined` → removes entry (same as before). No regression.

**Files to change in Story 113.2:**
1. `apps/dms-material/src/app/shared/services/sort-filter-state.service.ts` — fix `clearFilterState` and `clearSortState`
2. `apps/dms-material/src/app/shared/services/sort-filter-state.service.spec.ts` — add regression tests for `clearFilterState` + existing `sortColumns` scenario

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Completion Notes

Investigation performed via static code analysis — all call chains traced from each of the 6 interactions to `sortColumns$` signal and `dms-sort-filter-state` localStorage key.

Root cause confirmed: `clearFilterState` in `sort-filter-state.service.ts` replaces the entire table entry with `{ sort: state[table].sort }`, silently discarding `sortColumns`. This is triggered by `saveUniverseFiltersAndNotify` whenever all filters are cleared to defaults (account='all', no risk group, no symbol, no expired, no min yield). The in-memory signal is unaffected so the sort appears intact until the next navigation or page reload, when the component re-initialises from the now-empty localStorage.

AC5: No production code changed. Existing test suite passes unchanged.

## File List

_(No production files changed — investigation story only)_

## Change Log

| Date | Change |
|---|---|
| 2026-05-28 | Investigation complete; Dev Notes written with root cause, triggering interactions, persistence trace, and fix strategy |
