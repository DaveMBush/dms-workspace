# Story 95.2: Remove Universe Lookup Map from Open Positions Client Component

Status: Approved

## Story

As a developer,
I want `open-positions-component.service.ts` to use `trade.symbol` directly when building
`OpenPosition` objects instead of calling `buildUniverseMap()` and performing
`universeMap.get(trade.universeId)`,
So that the open-positions display is independent of the universe store being loaded.

## Acceptance Criteria

1. **Given** `selectOpenPositions` in `open-positions-component.service.ts` currently calls
   `this.universeMap()` and uses `universeMap.get(trade.universeId)`,
   **When** the fix is applied,
   **Then** the symbol is read directly from `trade.symbol` without any map lookup.

2. **Given** `transformTradeToPosition(trade, universe)` currently accepts a `Universe` object
   and uses `universe.symbol` (and possibly other `Universe` fields),
   **When** the fix is applied,
   **Then** the helper is updated to accept `symbol: string` (and any other required fields)
   directly rather than a full `Universe` object.

3. **Given** `partialOpenPosition(trade)` currently exists as a fallback for when the universe
   lookup returns `undefined`,
   **When** the fix is applied,
   **Then** the fallback is removed or simplified — `trade.symbol` is always present after
   Story 95.1.

4. **Given** `private universeMap()` helper and its `buildUniverseMap()` call exist in
   `open-positions-component.service.ts`,
   **When** the fix is applied,
   **Then** both are removed.

5. **Given** the open-positions table renders symbol and calculated columns (Current Value,
   Unrealized Gain),
   **When** a position row is displayed,
   **Then** all column values are correct (verified via Playwright MCP server).

6. **Given** the change is implemented with failing unit tests first (TDD),
   **When** `pnpm all` runs,
   **Then** all tests pass, including updated specs for `open-positions-component.service.ts`.

## Tasks / Subtasks

- [ ] Task 1: Read the current implementation thoroughly
  - [ ] Open `apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts`
  - [ ] Understand what fields from `Universe` are used in `transformTradeToPosition` (e.g., `last_price`, `distribution`, `distributions_per_year`, `risk_group_id`)
  - [ ] Note which fields are available on `Trade` vs those only on `Universe`

- [ ] Task 2: Write failing unit tests (TDD)
  - [ ] Open the spec file for `open-positions-component.service.ts`
  - [ ] Update test fixtures so `Trade` objects include `symbol: 'PDI'` (after Story 95.1 makes it required)
  - [ ] Assert the `selectOpenPositions` result uses `trade.symbol` directly, not a universe map lookup
  - [ ] Confirm tests fail (RED) before implementation

- [ ] Task 3: Refactor `selectOpenPositions` to use `trade.symbol`
  - [ ] Remove `const universe = universeMap.get(trade.universeId)` logic
  - [ ] Use `trade.symbol` directly in position building
  - [ ] Determine if `Universe` fields beyond `symbol` (e.g., `last_price`, `distribution`) are
    also available on `Trade` or need a different approach
  - [ ] If other `Universe` fields are needed, check if the trades API already returns them; if not,
    use safe defaults for now and file a follow-up as needed

- [ ] Task 4: Remove `buildUniverseMap` dependency
  - [ ] Remove `private universeMap()` helper method
  - [ ] Remove import of `buildUniverseMap` if no longer used in this file

- [ ] Task 5: Verify with Playwright MCP server
  - [ ] Navigate to an account's open positions panel
  - [ ] Confirm symbol, current value, and unrealized gain columns render correctly

- [ ] Task 6: Run full test suite
  - [ ] `pnpm all` passes

## Dev Notes

### File to Change

```
apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts
```

### Current Implementation Pattern

```typescript
selectOpenPositions = computed(() => {
  const trades = this.trades();
  const universeMap = this.universeMap();  // ← REMOVE

  for (let i = 0; i < totalLength; i++) {
    const trade = trades[i];
    if (trade === undefined || typeof trade === 'string') {
      openPositions[i] = placeholderOpenPosition(`placeholder-${String(i)}`);
      continue;
    }
    const universe = universeMap.get(trade.universeId);  // ← REPLACE
    openPositions[i] =
      universe === undefined
        ? partialOpenPosition(trade)          // ← REMOVE this fallback
        : this.transformTradeToPosition(trade, universe);
  }
});

private universeMap(): Map<string, Universe> {
  return buildUniverseMap();  // ← REMOVE
}
```

### Key Consideration: Fields Used from `Universe`

The `transformTradeToPosition(trade, universe)` helper likely uses:
- `universe.symbol` → available from `trade.symbol` (after Story 95.1)
- `universe.last_price` → check if it's on the `Trade` interface; if not, the API may
  need to be extended OR the open-positions server endpoint (`GET /api/trades/open`) already
  returns `last_price` directly in the `OpenTradeResponse`

**IMPORTANT**: Before removing the universe lookup, check what other fields beyond `symbol`
are used from the `Universe` object in `transformTradeToPosition`. The `GET /api/trades/open`
endpoint returns `currentValue` and `unrealizedGain` pre-computed, so the client may already
have the calculated values and only needs `symbol` for display.

Read the `OpenPosition` interface and `transformTradeToPosition` implementation carefully
before proceeding.

### Test Scope

Unit tests for `open-positions-component.service.ts`. Playwright MCP server for UI
verification. No new E2E automated tests required.

## Dev Agent Record

### Agent Notes

_To be filled in during implementation._

## File List

_To be populated during implementation._

## Change Log

_To be populated during implementation._
