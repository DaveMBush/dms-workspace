# Story 40.2: Implement Lazy Loading for Universe Screen Table

Status: Approved

## Story

As Dave (the investor),
I want the Universe Screen table to load only the visible rows (plus a buffer) from the server as I scroll,
so that initial page load is fast even when the universe contains hundreds of symbols.

## Acceptance Criteria

1. **Given** the Universe Screen opened, **When** the initial load completes, **Then** only the rows visible in the viewport (± CDK virtual scroll buffer, typically ~20 rows) have been fetched from the server.
2. **Given** the investor scrolls down in the Universe table, **When** new rows scroll into the visible area, **Then** a new API request is made for those rows' data and they are rendered when the response returns.
3. **Given** the investor has already scrolled past rows, **When** they scroll back up to previously loaded rows, **Then** no new network request is made for rows already in the SmartSignals cache.
4. **Given** the implementation uses SmartSignals lazy-loading configuration, **When** the code is reviewed, **Then** no array of all entity IDs is constructed at the component level (this was identified as the likely root cause in Story 40.1).
5. **Given** all unit and e2e tests, **When** `pnpm all` runs, **Then** all tests pass.

## Definition of Done

- [ ] SmartSignals configured for lazy/paginated loading on the Universe table
- [ ] Initial load sends only viewport-sized request
- [ ] Cache prevents redundant re-fetching
- [ ] Unit tests for the lazy-loading store configuration
- [ ] `pnpm all` passes
- [ ] `pnpm format` passes

## Tasks / Subtasks

- [ ] Read `lazy-loading-diagnosis.md` from Story 40.1 to confirm the root cause and approach (AC: #4)
- [ ] Apply the correct SmartSignals lazy-loading configuration for the Universe table (AC: #1, #4)
  - [ ] Configure `pageSize` or index-range-based fetching in the store feature
  - [ ] Ensure CDK virtual scroll range events drive the fetch range
- [ ] Update the Universe table server route to accept and apply `start`/`end` or `page`/`pageSize` parameters (AC: #2)
  - [ ] Return only the requested row range, not all rows
- [ ] Verify that cache prevents re-fetching already-loaded rows (AC: #3)
- [ ] Add unit tests for the store configuration (AC: #5)
- [ ] Run `pnpm all` and fix any failures (AC: #5)
- [ ] Run `pnpm format`

## Dev Notes

### Key Files

- `_bmad-output/implementation-artifacts/lazy-loading-diagnosis.md` — Story 40.1 output; must be read first
- `apps/dms-material/src/app/global/` — Universe Screen store feature configuration
- `apps/server/src/app/routes/` — Universe table server route
- SmartNgRX documentation — use Context7 for current API

### Approach

Follow the recommended approach from the diagnosis document exactly. The key change is switching from "fetch all IDs on init" to "fetch ID range driven by `cdk-virtual-scroll-viewport` scroll events". Ensure the server route can handle range-based queries. Test with a realistic dataset of 100+ rows to confirm only ~20 rows are fetched on initial load.

## Dev Agent Record

### Agent Model Used

### Completion Notes

## File List
