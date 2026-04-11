# Story 65.2: Fix Signal Processing for Multi-Page Lazy Load

Status: Approved

## Story

As a trader,
I want all symbols to load correctly as I scroll down through my universe regardless of how many
lazy-load pages I trigger,
so that I never see blank symbol rows at the bottom of the sorted list.

## Acceptance Criteria

1. **Given** the Universe screen is loaded and the user scrolls down across multiple lazy-load page
   boundaries,
   **When** each new page of entities is fetched and stored by SmartNgRX,
   **Then** all visible symbol cells in the viewport are populated with the correct symbol text.

2. **Given** the user scrolls to the very last page of the sorted list,
   **When** the final lazy-load batch resolves,
   **Then** all visible symbol cells at the bottom of the list are populated — none are empty.

3. **Given** the fix is applied and the failing E2E test from Story 65.1 runs,
   **When** `pnpm run e2e:dms-material:chromium` executes,
   **Then** the test passes green.

4. **Given** all changes are applied,
   **When** `pnpm all` runs,
   **Then** all tests pass with no regressions.

## Definition of Done

- [ ] Root cause from Story 65.1 confirmed and documented in Dev Notes (SmartNgRX multi-page signal re-emission, `filteredData$` `excludeLoadingRows` filter vs CDK height stability, or equivalent)
- [ ] Fix applied in the SmartNgRX / signal layer (or Angular CDK layer if applicable) with an explanatory comment citing the root cause and distinguishing this defect from the Epic 60 / 64 fast-scroll jank
- [ ] Playwright MCP server confirms all symbol cells are populated after deep, multi-page scrolling (scroll to bottom of a 150-row universe list)
- [ ] E2E test from Story 65.1 passes green
- [ ] `pnpm all` passes

## Tasks / Subtasks

- [ ] Task 1: Confirm root cause from Story 65.1 investigation (AC: #1, #2)
  - [ ] Subtask 1.1: Read the Dev Agent Record from Story 65.1 — confirm whether the root cause is (A) `filteredData$` removes placeholder rows from CDK, preventing deep-scroll trigger, or (B) signal re-emission failure after multi-page load, or (C) both
  - [ ] Subtask 1.2: Verify by checking if `POST /api/top/indexes` is called during incremental deep scroll (use Playwright network interception or server logs)
  - [ ] Subtask 1.3: Verify whether CDK scroll height = `50 × rowHeight` (indicating CDK only sees 50 rows) or = `150 × rowHeight` (CDK sees all rows)

- [ ] Task 2: Implement fix for root cause A — `filteredData$` stability (AC: #1, #2)
  - [ ] Subtask 2.1: If root cause A is confirmed — `filteredData$` removes placeholder rows, CDK only sees loaded rows, deep scroll never triggers — then modify `filteredData$` to keep placeholder rows in the CDK data source while not allowing them to visually cluster at the top
  - [ ] Subtask 2.2: Replace the `.filter(function excludeLoadingRows(row) { return row.symbol !== ''; })` terminal filter with a strategy that (a) retains placeholder rows to maintain stable CDK scroll height, and (b) prevents empty-symbol placeholders from disrupting the sort order at the top of the list
  - [ ] Subtask 2.3: Add a comment explaining the tension: "Epics 55/56 required filtering loading placeholders to prevent them from clustering at the top under symbol-ascending sort. Epic 65 requires retaining them so CDK reports the correct total scroll height and triggers lazy-load requests for pages 2+. The solution [describe here] reconciles both constraints."
  - [ ] Subtask 2.4: If using a placeholder-preserving filter: ensure `assertVisibleSymbolsNonEmpty` in E2E tests uses `expect.poll` to allow time for data to arrive (already the pattern in `universe-scrolling-regression.spec.ts`)

- [ ] Task 3: Implement fix for root cause B — signal re-emission failure (AC: #1, #2)
  - [ ] Subtask 3.1: If root cause B is confirmed — signal chain between `selectUniverseEntity` and `filteredData$` does not re-invalidate after multi-page `loadByIds` — investigate whether the SmartNgRX entity store emits a new reference after bulk insert or mutates in-place
  - [ ] Subtask 3.2: If mutation (in-place) is the issue, the fix may require forcing a new signal emission via `computed` or `effect` after each batch of entities is stored
  - [ ] Subtask 3.3: Add comment referencing Epic 65 and the multi-batch signal update path

- [ ] Task 4: Add unit tests for the fix (AC: #4)
  - [ ] Subtask 4.1: If fix is in `filteredData$` / `enrichUniverseWithRiskGroups` — add / update unit tests in `enrich-universe-with-risk-groups.proxy.spec.ts` or `global-universe.component.spec.ts` covering: (a) proxy with 3 pages of items, (b) pages 2-3 returning placeholders initially, (c) assert CDK data length equals total length (not just loaded length)
  - [ ] Subtask 4.2: If fix is in the signal chain — add unit tests in the relevant selector spec file confirming signal re-emission after batch entity update

- [ ] Task 5: Verify with Playwright MCP server (AC: #3)
  - [ ] Subtask 5.1: Use Playwright MCP to scroll a 150-row universe incrementally to the bottom, asserting no empty symbol cells at any step
  - [ ] Subtask 5.2: Confirm `POST /api/top/indexes` is called for pages 2 and 3 (network inspection) — this proves the lazy-load chain is working end-to-end

- [ ] Task 6: Run the Story 65.1 failing test and confirm it passes green (AC: #3)
  - [ ] Subtask 6.1: `pnpm run e2e:dms-material:chromium --grep "deep scroll"` — test must pass

- [ ] Task 7: Run full suite and confirm no regressions (AC: #4)
  - [ ] Subtask 7.1: `pnpm all` must pass
  - [ ] Subtask 7.2: Pay special attention to `universe-scrolling-regression.spec.ts` (Epic 60 regression guard) — the fix must not re-introduce the isLoading→array-shrink jank that Epic 60.2 fixed

## Dev Notes

### Key Files

| File | Purpose |
|------|---------|
| `apps/dms-material/src/app/global/global-universe/global-universe.component.ts` | `filteredData$` computed — the `excludeLoadingRows` filter is the likely fix target |
| `apps/dms-material/src/app/global/global-universe/enrich-universe-with-risk-groups.function.ts` | `buildEnrichedEntry` — already returns placeholders (symbol='') for isLoading rows; `triggerProxyLoad` — accesses visible range ± 20 |
| `apps/dms-material/src/app/global/global-universe/services/universe.service.ts` | `universes` computed — returns proxy, no iteration |
| `apps/dms-material/src/app/store/universe/universe-definition.const.ts` | `defaultRow` with `symbol: ''` — identifies unloaded rows |
| `apps/dms-material/src/app/store/universe/universe-effect.service.ts` | `loadByIndexes` intentionally throws — do NOT add implementation here |
| `apps/dms-material/src/app/store/top/top-effect.service.ts` | `loadByIndexes` fetches next batch of universe IDs from `/api/top/indexes` |
| `apps/server/src/app/routes/top/index.ts` | `/api/top/indexes` handler — returns paginated universe IDs |
| `apps/dms-material/src/app/global/global-universe/enrich-universe-with-risk-groups.proxy.spec.ts` | Proxy-specific unit tests — likely needs updating |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.spec.ts` | Component unit tests — update if `filteredData$` behaviour changes |
| `apps/dms-material-e2e/src/universe-lazy-load-deep-scroll.spec.ts` | The Story 65.1 failing test — must go green |
| `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts` | Epic 60 regression guard — must NOT regress |

### Architecture Context

**The conflicting constraints (must satisfy BOTH):**

| Constraint | Source | Requirement |
|------------|--------|-------------|
| Sort stability | Epics 55, 56 | Loading placeholder rows (symbol='') must NOT appear at top of symbol-ascending sort — they would sort before 'A' |
| CDK scroll height stability | Epics 29, 31, 44, 60 | The array passed to CDK must have stable length — removing rows during loading caused viewport height jumps and blank rows |
| Deep-scroll trigger | Epic 65 | CDK's visible range must span the full proxy length so `triggerProxyLoad` requests pages 2+ |

**The current (broken) state:**

1. `buildEnrichedEntry` returns `buildPlaceholderUniverseEntry(id)` (symbol='') for `isLoading` rows — this was the Epic 60.2 fix to keep the array length stable inside `enrichUniverseWithRiskGroups`.
2. `filteredData$` then applies `.filter(row => row.symbol !== '')` which undoes the length stability for CDK: if 100 rows are loading placeholders, CDK only sees 50 rows.
3. Result: CDK scroll height = 50 × rowHeight; user cannot scroll beyond row 50; `triggerProxyLoad` never accesses proxy positions 51+; pages 2–3 are never requested.

**Candidate fix approach (validate via root-cause confirmation in Story 65.1):**

*Option A — Remove the terminal `excludeLoadingRows` filter from `filteredData$` and handle sort-stability via a different mechanism:*
- Sort placeholders to the END of the list (not the beginning) — `buildEnrichedEntry` already uses the row's UUID as its id, which tends to sort after real ticker symbols (letters). The comment in `buildEnrichedEntry` explains this: "the id is a UUID that sorts to the end of the alphabet range, away from real symbols like 'AAPL'."
- The filter removal would allow CDK to see all 150 rows, giving it the correct scroll height.
- CDK would show placeholder rows near the end with empty symbol cells until data arrives; `expect.poll` in E2E tests handles this transient state.
- This approach preserves Epic 60.2's intent (stable array length) without conflicting with it.

*Option B — Keep the terminal filter but pass the unfiltered array to CDK for height calculation only:*
- Requires splitting the data source: one signal for CDK total-count (all rows including placeholders), another for visible data.
- More invasive — likely requires changes to `base-table.component.ts`.

*Option C — Move the filter inside `filterUniverses` where it can be controlled contextually:*
- If the filter is moved to apply only when a user-supplied symbol text-filter is active, placeholder rows would be visible during deep scroll but still hidden when the user is actively filtering by symbol text.

**Prior fix history to reference in code comment:**
```
// Deep-scroll lazy-load fix history:
// - Epics 29, 31, 44: CDK rowHeight mismatch, contain: strict, CSS transitions
// - Epic 60 (Story 60.2): isLoading→null return was causing array shrink; replaced with placeholder return
// - Epic 65 (Story 65.2): The terminal excludeLoadingRows filter in filteredData$ was undoing
//   the Epic 60.2 stability fix for multi-page deep-scroll scenarios. [describe fix here]
```

**Signal chain (do not break):**
```
selectUniverseEntity()  (SmartNgRX entity signal)
  → selectTopUniverses  (createSmartSignal)
  → selectUniverses     (getTopChildRows)
  → universeService.universes  (computed)
  → filteredData$       (computed — fix likely lives here)
  → BaseTableComponent data input
  → CDK virtual scroll
```

**`UniverseEffectsService.loadByIndexes` MUST remain unimplemented.** Universe entities are ALWAYS loaded by their actual IDs via `loadByIds` after the top entity's `loadByIndexes` provides the IDs. Implementing it would create a conflicting code path.

### Testing Standards
- Unit tests: Vitest in same directory as source file
- E2E tests: Playwright in `apps/dms-material-e2e/src/`
- `pnpm all` must pass after the fix; both `universe-scrolling-regression.spec.ts` (Epic 60 guard) and `universe-lazy-load-deep-scroll.spec.ts` (Epic 65 guard) must pass

### Project Structure Notes
- Angular 21 zoneless — all state is signal-based; no Zone.js; use signals not async pipe
- Named functions required by `@smarttools/no-anonymous-functions` ESLint rule — all callbacks in effects/subscriptions must be named
- `computed()` bodies may use arrow functions with the `// eslint-disable-next-line @smarttools/no-anonymous-functions -- <reason>` comment
- Unit tests use Vitest (`describe`, `it`, `expect`) — file co-located with source
- ESLint must pass — run `pnpm lint` before committing

### References
- [Source: _bmad-output/planning-artifacts/epics-2026-04-10.md#Epic 65 — Story 65.2]
- [Source: apps/dms-material/src/app/global/global-universe/global-universe.component.ts#filteredData$]
- [Source: apps/dms-material/src/app/global/global-universe/enrich-universe-with-risk-groups.function.ts#buildEnrichedEntry]
- [Source: _bmad-output/implementation-artifacts/60-1-investigate-scrolling-regression-failing-e2e.md#Root cause for Epic 60]
- [Source: _bmad-output/implementation-artifacts/65-1-reproduce-unloaded-symbols-deep-scroll.md]

## Dev Agent Record

### Agent Model Used

_[to be filled by dev agent]_

### Debug Log References

### Completion Notes List

### File List
