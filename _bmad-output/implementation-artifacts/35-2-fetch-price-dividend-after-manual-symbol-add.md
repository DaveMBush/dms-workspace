# Story 35.2: Fetch Price and Dividend After Manual Symbol Add

Status: Approved

## Story

As Dave (the investor),
I want the application to automatically fetch and store the current price and dividend when I manually add a symbol to the universe,
so that the symbol appears fully populated immediately after I add it.

## Acceptance Criteria

1. **Given** the investor manually adds a ticker symbol through the UI (Add Symbol flow), **When** the symbol is successfully saved to the database, **Then** the server immediately triggers a price and dividend fetch for that symbol using the same logic as "Update Fields."
2. **Given** the price/dividend fetch succeeds, **When** the investor views the newly added symbol in the Universe Screen, **Then** the price and dividend fields are populated (not blank/zero) without requiring a manual "Update Fields" action.
3. **Given** the price/dividend fetch fails (e.g. unknown ticker, external API error), **When** the add response is returned to the client, **Then** the symbol is still saved successfully and the response indicates the fetch failed (the symbol is not rolled back); a structured warning is logged.
4. **Given** the change, **When** `pnpm all` runs, **Then** all tests pass.

## Definition of Done

- [ ] Server add-symbol handler triggers fetch after save
- [ ] Fetch failure does not prevent symbol creation
- [ ] Unit test covers success and fetch-failure paths
- [ ] `pnpm all` passes
- [ ] `pnpm format` passes

## Tasks / Subtasks

- [ ] Read `price-dividend-fetch-analysis.md` from Story 35.1 to identify the exact functions to call (AC: #1)
- [ ] Modify the manual symbol-add server route handler to call the price/dividend fetch after a successful save (AC: #1)
  - [ ] Call the existing fetch function(s) identified in Story 35.1
  - [ ] Do NOT duplicate the fetch logic — reuse the existing function
- [ ] Wrap the fetch call in a try/catch so a fetch failure does not prevent symbol creation (AC: #3)
  - [ ] Log a structured warning on failure including the ticker symbol
  - [ ] Return a response that indicates partial success (symbol saved, fetch failed)
- [ ] Update the unit test for the add-symbol handler to cover: success + fetch success, success + fetch failure (AC: #4)
- [ ] Run `pnpm all` and fix any failures
- [ ] Run `pnpm format`

## Dev Notes

### Key Files

- `_bmad-output/implementation-artifacts/price-dividend-fetch-analysis.md` — produced by Story 35.1; must be read before implementing
- `apps/server/src/app/routes/` — manual add-symbol route handler
- Existing price/dividend fetch function (identified in Story 35.1)

### Approach

The key constraint is: reuse, don't duplicate. The add-symbol handler should call the same fetch function used by "Update Fields" — just after the `prisma.universe.create()` call. The fetch is fire-and-respond (not blocking the add response), or it can be awaited with a timeout. If awaited, ensure the timeout is short enough to not hang the UI. Follow the error-handling pattern used elsewhere in the server routes.

## Dev Agent Record

### Agent Model Used

### Completion Notes

## File List
