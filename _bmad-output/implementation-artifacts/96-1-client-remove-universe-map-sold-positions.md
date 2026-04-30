# Story 96.1: Remove Universe Lookup Map from Sold Positions Client Component

Status: Approved

## Story

As a developer,
I want `sold-positions-component.service.ts` to use `trade.symbol` directly when building
`ClosedPosition` objects instead of calling `buildUniverseMap()` and performing
`universeMap.get(trade.universeId)`,
So that the sold-positions display is independent of the universe store being loaded, and
`buildUniverseMap` has no remaining callers after this epic.

## Acceptance Criteria

1. **Given** `selectSoldPositions` in `sold-positions-component.service.ts` currently calls
   `buildUniverseMap()` and uses `universeMap.get(trade.universeId)`,
   **When** the fix is applied,
   **Then** the symbol is read directly from `trade.symbol` (made non-optional in Story 95.1).

2. **Given** `buildFullClosedPosition(trade, universe)` currently accepts a `Universe` object,
   **When** the fix is applied,
   **Then** the helper is updated to accept `symbol: string` (and any other required fields)
   directly rather than a full `Universe` object.

3. **Given** `buildPartialClosedPosition(trade)` currently exists as a fallback for when the
   universe lookup returns `undefined`,
   **When** the fix is applied,
   **Then** the fallback is removed or simplified — `trade.symbol` is always present.

4. **Given** `buildUniverseMap()` is called in `selectSoldPositions`,
   **When** the fix is applied,
   **Then** `buildUniverseMap()` is no longer imported or called in this file.

5. **Given** the sold-positions table renders symbol, buy price, sell price, profit, and
   percent-gain columns,
   **When** a sold position row is displayed,
   **Then** all column values are correct (verified via Playwright MCP server).

6. **Given** the change is implemented with failing unit tests first (TDD),
   **When** `pnpm all` runs,
   **Then** all tests pass, including updated specs for `sold-positions-component.service.ts`.

## Tasks / Subtasks

- [ ] Task 1: Read the current implementation thoroughly
  - [ ] Open `apps/dms-material/src/app/account-panel/sold-positions/sold-positions-component.service.ts`
  - [ ] Understand what fields from `Universe` are used in `buildFullClosedPosition`
  - [ ] Note which are available on `Trade` vs only on `Universe`

- [ ] Task 2: Write failing unit tests (TDD)
  - [ ] Open the spec file for `sold-positions-component.service.ts`
  - [ ] Update test fixtures so `Trade` objects include `symbol: 'PDI'`
  - [ ] Assert `selectSoldPositions` uses `trade.symbol` directly
  - [ ] Confirm tests fail (RED) before implementation

- [ ] Task 3: Refactor `selectSoldPositions` to use `trade.symbol`
  - [ ] Remove `const universeMap = buildUniverseMap()` and `universeMap.get(trade.universeId)` logic
  - [ ] Use `trade.symbol` directly in `buildFullClosedPosition`
  - [ ] Simplify or remove `buildPartialClosedPosition` if it only existed for missing-symbol fallback

- [ ] Task 4: Remove `buildUniverseMap` dependency
  - [ ] Remove import of `buildUniverseMap`
  - [ ] Confirm this file no longer references `buildUniverseMap` at all

- [ ] Task 5: Verify with Playwright MCP server
  - [ ] Navigate to an account's sold positions panel
  - [ ] Confirm symbol, profit, and percent-gain columns render correctly

- [ ] Task 6: Run full test suite
  - [ ] `pnpm all` passes

## Dev Notes

### File to Change

```
apps/dms-material/src/app/account-panel/sold-positions/sold-positions-component.service.ts
```

### Current Implementation Pattern

```typescript
selectSoldPositions = computed(() => {
  const trades = this.trades();
  const universeMap = buildUniverseMap();  // ← REMOVE

  for (let i = 0; i < totalLength; i++) {
    const trade = trades[i];
    if (trade === undefined || typeof trade === 'string') {
      soldPositions[i] = buildPlaceholderClosedPosition(`placeholder-${String(i)}`);
      continue;
    }
    const universe = universeMap.get(trade.universeId);  // ← REPLACE
    soldPositions[i] =
      universe === undefined
        ? buildPartialClosedPosition(trade)    // ← REMOVE this fallback path
        : buildFullClosedPosition(trade, universe);
  }
});
```

### Key Consideration: Fields Used from `Universe`

The `buildFullClosedPosition(trade, universe)` helper likely uses:
- `universe.symbol` → available from `trade.symbol` (after Story 95.1)
- Any other `Universe` fields must be checked

The `GET /api/trades/closed` endpoint (`get-closed-trades/index.ts`) returns `profit` and
`percentGain` pre-computed in the `ClosedTradeResponse`, so the client may already have these
values without needing `Universe` data.

Check the `ClosedPosition` interface and `buildFullClosedPosition` function carefully before
proceeding — the same caution applies as for Story 95.2.

### Sequencing Note

This story should be done AFTER Epic 94 (divDeposit) and Epic 95 (open positions) are
complete, because after this story, `buildUniverseMap` will have no remaining callers and
Story 96.2 can safely delete the function.

### Test Scope

Unit tests for `sold-positions-component.service.ts`. Playwright MCP server for UI
verification. No new E2E automated tests required.

## Dev Agent Record

### Agent Notes

_To be filled in during implementation._

## File List

_To be populated during implementation._

## Change Log

_To be populated during implementation._
