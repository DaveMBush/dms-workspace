# Story 64.2: Fix Universe Scrolling Permanently (Round 5)

Status: Done

## Story

As a trader,
I want the Universe screen to scroll smoothly at all times,
so that I can review my portfolio without blank rows or position jumps interrupting my workflow.

## Acceptance Criteria

1. **Given** the Universe screen has more rows than the viewport,
   **When** the user scrolls quickly to the bottom,
   **Then** all rows are populated with data and no blank cells appear.

2. **Given** the user scrolls rapidly from bottom to top,
   **When** the viewport settles,
   **Then** the rows at the current scroll position are all fully populated.

3. **Given** the Playwright MCP server scrolls the Universe screen programmatically,
   **When** the scroll completes,
   **Then** the MCP server confirms no blank rows exist at the current viewport position.

4. **Given** the fix is applied and the failing E2E test from Story 64.1 runs,
   **When** `pnpm run e2e:dms-material:chromium` executes,
   **Then** the test passes green.

5. **Given** all changes are applied,
   **When** `pnpm all` runs,
   **Then** all tests pass with no regressions.

## Definition of Done

- [x] Root cause identified and documented in Dev Notes (which layer — CDK, SmartNgRX, zone-less CD — is the trigger this time)
- [x] Fix applied with an explanatory comment citing Epics 29, 31, 44, 60, and 64 to aid future maintainers
- [x] Playwright MCP server confirms smooth scroll with no blank rows on the Universe screen
- [x] E2E test from Story 64.1 passes green
- [x] `pnpm all` passes

## Tasks / Subtasks

- [x] Task 1: Read Story 64.1 Dev Agent Record and confirm root cause (AC: #1, #2)

  - [x] Subtask 1.1: Read the Dev Agent Record from Story 64.1 to get the confirmed root cause and the exact code path involved
  - [x] Subtask 1.2: Re-read `global-universe.component.ts` `filteredData$` computed — confirm whether `excludeLoadingRows` filter is the Round 5 regression path
  - [x] Subtask 1.3: Re-read `enrich-universe-with-risk-groups.function.ts` — confirm the Epic 60 placeholder fix is still in place and that placeholders have `symbol: ''`

- [x] Task 2: Evaluate fix strategy options and choose the minimal-risk approach (AC: #1, #2)

  - [x] Subtask 2.1: Option A — Remove `excludeLoadingRows` from `filteredData$` and instead give `buildPlaceholderUniverseEntry` a non-empty sentinel symbol value (e.g., `'\u200B'` ZERO WIDTH SPACE) that renders blank in the table but bypasses the `symbol !== ''` check; update the template to hide cells with that sentinel if needed
  - [x] Subtask 2.2: Option B — Remove `excludeLoadingRows` from `filteredData$` entirely and instead handle blank-row suppression at the template level using `*ngIf="row.symbol"` on the row or cell content so CDK sees the full array but the user never sees empty text
  - [x] Subtask 2.3: Option C — Add an `isPlaceholder` boolean field to `EnrichedUniverse`; set it `true` in `buildPlaceholderUniverseEntry`; replace `symbol !== ''` with `!row.isPlaceholder` in `filteredData$` — but this preserves array length only if the filter is removed entirely; otherwise still shrinks
  - [x] Subtask 2.4: Choose and document the selected approach — **the preferred approach is to keep the full stable-length array for CDK and handle blank display differently, not by filtering the data array**

- [x] Task 3: Apply the fix (AC: #1, #2, #3)

  - [x] Subtask 3.1: Modify `filteredData$` in `global-universe.component.ts` to keep placeholder rows in the array (do not filter out `symbol === ''` rows from the CDK data)
  - [x] Subtask 3.2: Ensure the table template does not display placeholder row content visibly to the user — this typically means the `dms-base-table` renders the row at the correct position but shows blank cells, which is acceptable during the brief `isLoading` window
  - [x] Subtask 3.3: Add an explanatory code comment citing the regression history: Epics 29, 31, 44, 60, and 64; explain WHY removing the filter preserves CDK scroll stability
  - [x] Subtask 3.4: Update `enrich-universe-with-risk-groups.function.spec.ts` if any test assertions change; do NOT remove assertions — update them to reflect the new behavior

- [x] Task 4: Verify with Playwright MCP server (AC: #3)

  - [x] Subtask 4.1: Navigate to the Universe screen; fast-scroll to the bottom; confirm no blank rows in the MCP screenshot
  - [x] Subtask 4.2: Click the Symbol sort header; wait for network idle; fast-scroll to the bottom; confirm no blank rows
  - [x] Subtask 4.3: Document the verification result in the Dev Agent Record

- [x] Task 5: Confirm the Story 64.1 E2E test passes (AC: #4, #5)
  - [x] Subtask 5.1: Run `pnpm run e2e:dms-material:chromium` — confirm the previously-failing test at `universe-scrolling-regression.spec.ts:200` now passes
  - [x] Subtask 5.2: Run `pnpm all` — confirm no regressions

## Dev Notes

### Key Files

| File                                                                                                 | Purpose                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`                      | **Primary fix location** — `filteredData$` computed contains `excludeLoadingRows` filter; remove or replace this filter so CDK receives the full stable-length array |
| `apps/dms-material/src/app/global/global-universe/enrich-universe-with-risk-groups.function.ts`      | `buildPlaceholderUniverseEntry()` — returns `symbol: ''`; Epic 60 fix (`buildEnrichedEntry` returns placeholder not null) is present and should be preserved         |
| `apps/dms-material/src/app/global/global-universe/enrich-universe-with-risk-groups.function.spec.ts` | Unit tests for the enrich function — update if behavior changes                                                                                                      |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.html`                    | Template — verify CDK `<cdk-virtual-scroll-viewport>` binding and row rendering; may need to add template-level blank-row suppression if placeholders render visibly |
| `apps/dms-material/src/app/global/global-universe/filter-universes.function.ts`                      | `filterUniverses()` — passes placeholders through when `symbolFilter` is empty; no changes needed here                                                               |
| `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`                     | CDK virtual scroll host; `renderedRangeChange` emitted after `debounceTime(100)` — do not change this component in this story                                        |
| `apps/dms-material-e2e/src/universe-scrolling-regression.spec.ts`                                    | E2E regression suite — the failing test from Story 64.1 must turn green                                                                                              |

### Architecture Context

**Angular 21 zoneless + CDK virtual scroll constraint**: The total height of the CDK virtual scroll
container is `itemSize × dataArray.length`. If `dataArray.length` decreases during an in-flight
API call (even briefly), the CDK viewport recalculates a shorter `scrollHeight`, clamps the current
`scrollTop`, and jumps the view. Blank rows appear at the new scroll position.

**The rule**: The array passed to `data` input of `<dms-base-table>` must never decrease in length
while SmartNgRX is loading rows for the current viewport. Use placeholder entries (stable length)
and handle blank display in the template, not by filtering the array.

### Fix Strategy Rationale

**Root cause (confirmed by code review)**:
The `filteredData$` computed applies `.filter(function excludeLoadingRows(row) { return row.symbol !== ''; })` after `enrichUniverseWithRiskGroups`. This removes placeholder rows (which have `symbol: ''`) from the CDK data array, negating the Epic 60 fix. The `excludeLoadingRows` filter was added to prevent blank symbol rows from being visible in the table UI, but it introduced the array-shrinkage problem.

**Recommended fix approach**:

- Keep the `excludeLoadingRows` concept but implement it WITHOUT removing rows from the array
- The CDK `data` binding must receive all rows including placeholders
- If the template currently renders empty cells for placeholder rows, this is acceptable (the `isLoading` window is typically < 300ms on a local network)
- Alternatively, add a `hidden` binding in the row template: `[style.visibility]="row.symbol ? 'visible' : 'hidden'"` — this hides content without changing array length

**What NOT to do**:

- Do NOT filter `filteredData$` by `symbol !== ''` — this is the regression source
- Do NOT use `NgZone.run()` or `ApplicationRef.tick()` — zoneless project; breaks compatibility
- Do NOT change `rowHeight` — confirmed at 52px (Epic 29 fix still valid per `docs/row-height-audit.md`)
- Do NOT change `contain: paint` on `.virtual-scroll-viewport` — Epic 31 fix still valid
- Do NOT add `will-change: transform` — Epic 44 regression

### Prior Fix History (to cite in code comment)

| Epic | Fix                                                                    | Status in Current Code                                             |
| ---- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 29   | `rowHeight=52` (removed explicit binding, uses 52px default)           | ✅ Still in place (`docs/row-height-audit.md`)                     |
| 31   | `contain: paint` on `.virtual-scroll-viewport` (not `contain: strict`) | ✅ Still in place (`base-table.component.scss`)                    |
| 44   | Removed `will-change: transform` + excess `markForCheck()` calls       | ✅ Still in place                                                  |
| 60   | `buildEnrichedEntry` returns placeholder not null for `isLoading` rows | ✅ Still in place (`enrich-universe-with-risk-groups.function.ts`) |
| 64   | Remove `excludeLoadingRows` filter from `filteredData$`                | **THIS STORY**                                                     |

### Code Comment Template

Use this comment block when applying the fix in `global-universe.component.ts`:

```typescript
// IMPORTANT: Do NOT filter this array by `symbol !== ''` or any other criteria that removes
// placeholder rows. The CDK virtual scroll viewport calculates total scrollable height as
// itemSize × data.length. Removing rows mid-scroll causes the height to shrink, which forces
// scrollTop to be clamped, producing visible position jumps and blank rows.
//
// Placeholder rows (symbol === '') are returned by buildPlaceholderUniverseEntry() in
// enrich-universe-with-risk-groups.function.ts for SmartNgRX rows that are isLoading === true.
// They must remain in the array so array.length stays stable during lazy-load in-flight windows.
//
// Regression history: Epics 29 (rowHeight), 31 (contain:strict), 44 (will-change),
// 60 (null→placeholder fix), 64 (excludeLoadingRows removed — THIS COMMENT).
// See Story 64.2 Dev Agent Record for full investigation.
```

### Testing Standards

- Unit tests: Vitest in same directory as source file
- E2E tests: Playwright in `apps/dms-material-e2e/src/`
- `pnpm all` must pass after fix is applied

### Project Structure Notes

- `globals: true` in Vitest — no explicit `import { describe, it, expect }` needed
- Named functions required in all callbacks — ESLint `@smarttools/no-anonymous-functions`
- `inject()` pattern only — no constructor injection
- `ChangeDetectionStrategy.OnPush` on all components

### References

- [Source: `_bmad-output/planning-artifacts/epics-2026-04-10.md`#Story 64.2]
- [Source: `_bmad-output/implementation-artifacts/60-2-fix-universe-scrolling-permanently.md`]
- [Source: `_bmad-output/implementation-artifacts/64-1-reproduce-scrolling-regression-failing-e2e.md`]
- [Source: `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`#filteredData$]
- [Source: `apps/dms-material/src/app/global/global-universe/enrich-universe-with-risk-groups.function.ts`]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

- E2E Chromium run: `universe-scrolling-regression.spec.ts:200` (Round 5 test) **PASSES** after fix
- E2E Firefox run: All 5 scrolling regression tests pass (test at line 125 is timing-flaky but passes on retry in both browsers — pre-existing behavior)
- Playwright MCP verification:
  - Fast scroll to bottom: 0 blank cells in 32 visible rows
  - Sort change (Symbol header click) + fast scroll: 0 blank cells in 22 visible rows

### Completion Notes List

- **Root cause**: `filteredData$` in `global-universe.component.ts` applied `.filter(function excludeLoadingRows(row) { return row.symbol !== ''; })` after `enrichUniverseWithRiskGroups`. This removed placeholder rows (SmartNgRX `isLoading=true` rows with `symbol: ''` from `buildPlaceholderUniverseEntry`) from the CDK data array, causing array length to vary during in-flight API calls, re-introducing the blank-row / position-jump regression from Epics 29/31/44/60.
- **Fix applied**: Removed the `.filter(excludeLoadingRows)` chain from `filteredData$`. Placeholder rows now pass through to CDK, maintaining stable array length. Updated the comment above `filteredData$` with full regression history (Epics 29, 31, 44, 60, 64) and explanation of WHY filtering is prohibited.
- **No unit test changes needed**: `enrich-universe-with-risk-groups.function.spec.ts` tests the enrich function (unchanged). Component spec tests use real symbol values, not placeholder rows. `filter-universes.function.spec.ts` tests the filter function (unchanged).
- **Blank cells during isLoading**: Placeholder rows render as blank cells briefly during loading. This is intentional and acceptable — the loading window is < 300ms on a typical local/LAN backend. The CDK scroll stability benefit outweighs the brief visual placeholder.

### File List

- `apps/dms-material/src/app/global/global-universe/global-universe.component.ts` — removed `excludeLoadingRows` filter from `filteredData$`, added regression-history comment
