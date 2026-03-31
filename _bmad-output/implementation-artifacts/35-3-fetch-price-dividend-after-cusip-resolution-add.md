# Story 35.3: Fetch Price and Dividend After CUSIP Resolution Add

Status: Approved

## Story

As Dave (the investor),
I want the application to automatically fetch and store the current price and dividend when a symbol is added via CUSIP resolution,
so that CUSIP-resolved symbols are fully populated from the moment they enter the universe.

## Acceptance Criteria

1. **Given** a symbol is resolved via CUSIP (OpenFIGI → massive.com → Yahoo Finance chain) and added to the universe, **When** the CUSIP resolution and save completes, **Then** the server triggers price and dividend fetch for the resolved ticker using the same logic as Story 35.2.
2. **Given** the fetch is triggered post-CUSIP-resolution, **When** the fetch completes, **Then** the universe record has populated price and dividend fields visible on the Universe Screen.
3. **Given** the CUSIP resolution itself succeeds but the subsequent price/dividend fetch fails, **When** the response is returned, **Then** the symbol is still added to the universe; the fetch failure is logged but does not cause a CUSIP resolution failure.
4. **Given** Story 35.2 is complete, **When** this story is implemented, **Then** the price/dividend fetch function is shared between both add paths (not duplicated).
5. **Given** all changes, **When** `pnpm all` runs, **Then** all tests pass.

## Definition of Done

- [ ] CUSIP resolution handler triggers shared fetch after save (same function as Story 35.2)
- [ ] Fetch failure does not prevent CUSIP resolution success
- [ ] Unit test covers CUSIP-resolve + successful fetch, and CUSIP-resolve + fetch failure
- [ ] `pnpm all` passes
- [ ] `pnpm format` passes

## Tasks / Subtasks

- [ ] Locate the CUSIP resolution server route handler (AC: #1)
  - [ ] Reference `price-dividend-fetch-analysis.md` from Story 35.1
- [ ] Add call to the shared price/dividend fetch function after a successful CUSIP-resolved symbol save (AC: #1, #4)
  - [ ] Use exactly the same shared function introduced/identified in Story 35.2
  - [ ] Do NOT duplicate logic
- [ ] Wrap the fetch call in try/catch to ensure CUSIP resolution is not rolled back on fetch failure (AC: #3)
  - [ ] Log a structured warning on fetch failure
- [ ] Add/update unit tests for the CUSIP resolution handler covering both paths (AC: #5)
- [ ] Run `pnpm all` and fix any failures
- [ ] Run `pnpm format`

## Dev Notes

### Key Files

- `_bmad-output/implementation-artifacts/price-dividend-fetch-analysis.md` — Story 35.1 output; identifies the CUSIP resolution call site
- `apps/server/src/app/routes/` — CUSIP resolution route handler
- The shared fetch function from Story 35.2

### Approach

This story mirrors Story 35.2 but targets the CUSIP resolution path. The implementation should be nearly identical — find the `prisma.universe.create()` (or equivalent) call in the CUSIP resolution handler and add the same post-save fetch. The emphasis on sharing (not duplicating) the fetch function is critical — if Story 35.2 extracted a helper, use that helper here.

## Dev Agent Record

### Agent Model Used

### Completion Notes

## File List
