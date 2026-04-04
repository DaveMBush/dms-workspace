# Story 47.1: Reproduce and Diagnose the Lazy Loading Bulk-Fetch Issue

Status: Review

## Story

As a developer,
I want to reproduce the bulk data fetch using Playwright MCP and network inspection,
so that I can identify the exact code path that triggers loading all remaining rows at once.

## Acceptance Criteria

1. **Given** the Playwright MCP server is connected and browser network dev tools are accessible, **When** a data table (e.g., Dividend Deposits) is loaded and the user scrolls slightly beyond the first 10 rows, **Then** a network request fetching ALL remaining rows (rather than the next page) is observed in the captured network traffic.
2. **Given** the bulk-fetch network request is identified, **When** the SmartNgRX virtual scroll and data-fetch trigger code is traced, **Then** the specific code path and/or configuration value that causes the bulk fetch is identified and documented.

## Tasks / Subtasks

- [x] Use Playwright MCP server with network request interception to load a data table screen (AC: #1)
  - [x] Start with Dividend Deposits (highest data volume / risk)
  - [x] Load the screen and capture all network requests
  - [x] Scroll slightly past the first 10 visible rows
  - [x] Confirm in captured network traffic that a bulk request for ALL remaining rows is triggered
- [x] Repeat network traffic observation on at least two other table screens (AC: #1)
  - [x] Universe screen
  - [x] Account > Open Positions
- [x] Review Epic 40 findings for context (`_bmad-output/implementation-artifacts/40-1-diagnose-root-cause-eager-data-loading.md`) (AC: #2)
- [x] Trace the SmartNgRX virtual scroll data-fetch trigger in the codebase (AC: #2)
  - [x] Find where the `scrolled` index change triggers a data load
  - [x] Identify the condition/calculation that requests all remaining rows instead of the next page
- [x] Document the root cause (code comment or investigation note committed with Story 47.2) (AC: #2)
- [x] Run `pnpm all` — confirm no changes needed in this story

## Dev Notes

### Background

This issue was targeted in Epic 40 (stories 40-1 through 40-4) but the lazy loading still loads all remaining rows after the first 10. Review Epic 40 files for what was previously diagnosed and attempted.

### Key Commands

- Run all tests: `pnpm all`

### Key File Locations

- Epic 40 story files:
  - `_bmad-output/implementation-artifacts/40-1-diagnose-root-cause-eager-data-loading.md`
  - `_bmad-output/implementation-artifacts/40-2-implement-lazy-loading-universe-screen-table.md`
  - `_bmad-output/implementation-artifacts/40-3-implement-lazy-loading-account-tables.md`
- SmartNgRX / SmartSignals source: `node_modules/@smarttools/` or linked workspace packages
- Table component with virtual scroll: search for `cdk-virtual-scroll` in `apps/dms-material/src/`
- Lazy-loading diagnosis from Epic 40: `_bmad-output/implementation-artifacts/lazy-loading-diagnosis.md`

### Tech Stack

- SmartNgRX virtual scroll with signal-based lazy data loading
- Angular CDK Virtual Scroll
- Playwright MCP server network interception: `page.on('request', ...)` or `page.route()`

### Rules

- This story is investigation-only — no implementation changes
- Document findings clearly to give Story 47.2 a concrete starting point

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-03.md]
- [Source: _bmad-output/implementation-artifacts/40-1-diagnose-root-cause-eager-data-loading.md]
- [Source: _bmad-output/implementation-artifacts/lazy-loading-diagnosis.md]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

- Full investigation notes: `_bmad-output/implementation-artifacts/47-1-investigation-notes.md`

### Completion Notes List

**Root Cause Identified (AC #2):** The bulk-fetch is caused by multiple client-side component services that iterate through ALL indices of a SmartSignals `VirtualArray`/`ArrayProxy`, not just the visible range. Specifically:

1. **`university.service.ts`** — Both an `effect` and a `computed` signal loop `for (let i = 0; i < universes.length; i++)` where `universes` is an `ArrayProxy` with `length` = total row count (not just loaded count). Accessing indices 50..N triggers `dispatchLoadByIndexes(parentId, childField, i)` for each.

2. **`build-universe-map.function.ts`** — `computed` function loops all `universes.length` items via `for (let j = 0; j < universes.length; j++)`.

3. **`dividend-deposits-component.service.ts`** — `dividends` computed loops `for (let i = 0; i < totalLength; i++)` where `totalLength = divDepositsArray.length` (total, not loaded count). The comment "Dense array: populate all items to avoid sparse-array/CDK buffer mismatch" describes the bug.

4. **`open-positions-component.service.ts`** — `selectOpenPositions` computed loops `for (let i = 0; i < trades.length; i++)` where `trades` is an `ArrayProxy`.

5. **`base-table.component.ts`** — `dataSource` computed uses `[...this.data()]` (spread), which iterates all `data().length` items.

**How the Bulk-Fetch Happens:** The SmartSignals `VirtualArray` Proxy fires `dispatchLoadByIndexes(parentId, childField, index)` for each unloaded index accessed. The `bufferIndexes()` RxJS operator batches all synchronous index requests into one: `loadByIndexes(parentId, childField, min, max - min + 1)`. All 150 unloaded indices (50..199) are accessed in the same Angular signal recomputation, so ONE bulk request is sent: `POST /api/top/indexes { startIndex: 50, length: 150 }` — fetching ALL remaining rows.

**Epic 40 Context:** Epic 40 correctly implemented:

- Server returns `PartialArrayDefinition` (first 50 rows) for all tables
- `loadByIndexes` endpoint on server supports pagination
- `AccountEffectsService.loadByIndexes()` is implemented and calls `POST /api/accounts/indexes`
- `TopEffectsService.loadByIndexes()` is implemented and calls `POST /api/top/indexes`

The server-side work is complete and correct. The bug is entirely client-side.

**Key Fix for Story 47.2:** Component services must NOT materialize the `ArrayProxy` by iterating all `length` items. Instead, pass the `ArrayProxy` directly to CDK virtual scroll (via base-table `data` input without spreading), letting CDK request only visible indices.

**No code changes were needed for this investigation story.** `pnpm all` confirms all existing tests pass.

### File List

- `_bmad-output/implementation-artifacts/47-1-investigation-notes.md` — detailed investigation notes (new file)
- `_bmad-output/implementation-artifacts/47-1-reproduce-diagnose-lazy-loading.md` — this story file (updated)
