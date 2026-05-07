# Story 97.3: Move Target Sell Computation to the Server and Remove Client-Side Logic

Status: Done

## Story

As Dave (the investor),
I want the Target Sell column to be computed once on the server and returned in the API
response,
So that the client does not duplicate the formula and Target Sell behaves identically to the
other restored open-positions columns (Expected$, Last$ Unrlz Gain%, Unrlz Gain$, Target
Gain) added in Story 97.2.

## Acceptance Criteria

1. **Given** the server `Trade` mapper updated in Story 97.2 at
   `apps/server/src/app/routes/trades/index.ts`,
   **When** Story 97.3 is complete,
   **Then** `mapTradeToResponse` returns a numeric `target_sell` field for every row using
   the formula documented in `_bmad-output/implementation-artifacts/open-positions-fields-research.md`.

2. **Given** the server `Trade` interface in
   `apps/server/src/app/routes/trades/index.ts` and the client `Trade` interface in
   `apps/dms-material/src/app/store/trades/trade.interface.ts`,
   **When** the change is applied,
   **Then** both interfaces declare `target_sell: number` (required, never `undefined`); rows
   where a dependency is missing return `0` rather than omitting the field. The client
   interface continues to mirror the server interface.

3. **Given** TDD ordering,
   **When** the failing server unit test for `target_sell` is written first in
   `apps/server/src/app/routes/trades/index.spec.ts`,
   **Then** the test goes from RED to GREEN once the mapper is updated. Coverage includes
   the success path and the missing-dependency → `0` path.

4. **Given** the existing client-side Target Sell computation in
   `apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts`
   (the `targetSell:` block that reads `trade.quantity`, `trade.buy`, and a derived
   `targetGain`),
   **When** Story 97.3 is complete,
   **Then** that arithmetic is removed and the component reads `trade.target_sell` (or its
   camelCase equivalent used by the row mapper) directly from the server-supplied `Trade`.

5. **Given** any client-side unit tests that asserted the now-removed Target Sell
   computation,
   **When** the change is applied,
   **Then** those assertions are deleted; the equivalent assertions live in the server
   spec file added in AC#3.

6. **Given** all changes,
   **When** `pnpm all` runs,
   **Then** all tests pass and there is no remaining Target Sell arithmetic anywhere under
   `apps/dms-material/` (verified by a workspace search for `targetSell` /
   `target_sell` arithmetic — only field reads/renders should remain).

7. **Given** the open-positions table is reloaded in the running app,
   **When** rows are rendered,
   **Then** the Target Sell column shows the same numeric values it showed before this
   story (no visible regression).

## Tasks / Subtasks

- [x] Task 1: Confirm Story 97.2 prerequisites are in place (AC: #1, #2)

  - [x] Verify `Expected$`, `Last$ Unrlz Gain%`, `Unrlz Gain$`, and `Target Gain` are
        already returned by `mapTradeToResponse` and present on both `Trade` interfaces.
  - [x] Verify the Target Sell formula and required dependencies are documented in
        `_bmad-output/implementation-artifacts/open-positions-fields-research.md`.

- [x] Task 2: Write failing server unit test for `target_sell` (AC: #3) — RED

  - [x] Add a `mapTradeToResponse` describe block test in
        `apps/server/src/app/routes/trades/index.spec.ts` asserting the formula from the
        research doc on a happy-path fixture.
  - [x] Add a missing-dependency test asserting `target_sell === 0` when a required input
        is absent.
  - [x] Run the spec — both tests must fail before implementation.

- [x] Task 3: Add `target_sell` to the server `Trade` interface and mapper (AC: #1, #2)

  - [x] Update the `Trade` interface in `apps/server/src/app/routes/trades/index.ts` to
        include `target_sell: number;`.
  - [x] Update `mapTradeToResponse` to compute `target_sell` from the joined `Universe`
        (and any `Trade` fields) using the documented formula. Return `0` when a required
        dependency is missing — do not omit the field.
  - [x] Re-run the server spec — both new tests must pass (GREEN).

- [x] Task 4: Mirror the field on the client `Trade` interface (AC: #2)

  - [x] Update `apps/dms-material/src/app/store/trades/trade.interface.ts` to add
        `target_sell: number;` matching the server.

- [x] Task 5: Remove the client-side Target Sell computation (AC: #4, #5, #6)

  - [x] In `apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts`,
        delete the `targetSell:` arithmetic (currently `targetGain / trade.quantity + trade.buy`,
        with the `trade.quantity > 0` guard) and replace it with a direct read from
        `trade.target_sell`.
  - [x] If the surrounding `targetGain` local variable is no longer needed for any other
        field, remove it as well; otherwise leave it untouched.
  - [x] Update or delete any client unit tests that asserted the old Target Sell formula.
  - [x] Workspace-search `apps/dms-material/` for `targetSell` and `target_sell` and
        confirm no arithmetic / formula uses remain (only field reads, type declarations,
        column bindings).

- [ ] Task 6: Verify in the running app (AC: #7)

  - [ ] Use the Playwright MCP server to load an account with open positions.
  - [ ] Confirm the Target Sell column renders the same numeric values as before this
        story (spot-check a few rows against the previous behavior).

- [ ] Task 7: Quality gates (AC: #6)
  - [ ] `pnpm all` passes.
  - [ ] `pnpm format` passes.

## Dev Notes

### Files to Change

```
apps/server/src/app/routes/trades/index.ts                     (UPDATE: interface + mapper)
apps/server/src/app/routes/trades/index.spec.ts                (UPDATE: add target_sell tests first)
apps/dms-material/src/app/store/trades/trade.interface.ts      (UPDATE: mirror server)
apps/dms-material/src/app/account-panel/open-positions/
    open-positions-component.service.ts                        (UPDATE: remove arithmetic)
```

### Current Client-Side Computation Being Removed

From `open-positions-component.service.ts` (around lines 113–124):

```typescript
const targetGain = 0; // requires distribution and ex_date — derived locally today
// ...
{
  // ...
  targetSell:
    trade.quantity > 0
      ? targetGain / trade.quantity + trade.buy
      : trade.buy,
}
```

After this story the row should read `trade.target_sell` (passed through directly from the
server). If `targetGain` is no longer referenced for any other column after the cleanup,
remove it too; otherwise leave it.

### Current Server Mapper to Extend

From `apps/server/src/app/routes/trades/index.ts` (around lines 36–48), as updated by Story
97.2:

```typescript
export function mapTradeToResponse(trade: TradeWithUniverseAndDates): Trade {
  return {
    id: trade.id,
    universeId: trade.universeId,
    accountId: trade.accountId,
    symbol: trade.universe?.symbol ?? '',
    buy: trade.buy,
    sell: trade.sell,
    buy_date: trade.buy_date.toISOString(),
    sell_date: trade.sell_date?.toISOString(),
    quantity: trade.quantity,
    // ...Story 97.2 fields...
    target_sell: /* formula from research doc; 0 when dependencies missing */,
  };
}
```

### Authoritative Formula Source

The exact `target_sell` formula and its dependency list MUST be taken verbatim from
`_bmad-output/implementation-artifacts/open-positions-fields-research.md` (created in Story
97.1). Do not reverse-engineer a different formula from the client code — Story 97.1's
historical research is the source of truth.

### Naming Convention

The server response uses snake_case for these computed fields (`target_sell`,
`target_gain`, `expected_dollars`, etc.) per the existing `buy_date` / `sell_date`
precedent and the eslint disable already present in the client `Trade` interface
(`/* eslint-disable @typescript-eslint/naming-convention -- matching server */`). Match
that convention; do NOT introduce a parallel camelCase server field.

### Missing-Dependency Behavior

Per Epic 97 Definition of Done and the Story 97.2 pattern, return `0` (not `undefined`,
not `null`) when any input the formula requires is missing on the joined `Universe` row.
The field is declared as required `number` on both interfaces.

### Test Scope

- **Server unit tests** (RED → GREEN): `apps/server/src/app/routes/trades/index.spec.ts` —
  one happy-path test, one missing-dependency test.
- **Client unit tests:** delete any obsolete Target Sell assertions; do NOT migrate them —
  the server spec is now authoritative.
- **E2E:** No new automated E2E test in this story. Story 97.4 covers end-to-end
  verification of all five restored open-positions computed fields, including Target Sell.
- **Manual verification:** Playwright MCP server visual spot-check per Task 6.

### Dependency / Sequencing

- **Depends on:** Story 97.2 (server mapper, interface, and `target_gain` infrastructure).
- **Enables:** Story 97.4 (e2e verification of computed fields).
- After this story, `open-positions-component.service.ts` performs **no** per-row
  arithmetic — it only renders server-supplied values. This is the closing condition for
  the per-row arithmetic removal goal stated in the Epic 97 header.

### References

- Epic + Story spec: `_bmad-output/planning-artifacts/epics-2026-05-05.md` → Epic 97 →
  Story 97.3
- Story metadata: `_bmad-output/planning-artifacts/story-meta/2026-05-05/97-3-move-target-sell-to-server.yaml`
- Formula source of truth: `_bmad-output/implementation-artifacts/open-positions-fields-research.md`
  (produced by Story 97.1)
- Pattern precedent: Story 97.2 implementation (server mapper + mirrored client
  interface)

## Dev Agent Record

### Agent Notes

- Story 97.2 prerequisites confirmed: `expected_dollars`, `last_dollars_unrealized_gain_percent`,
  `unrealized_gain_dollars`, `target_gain` all present on both interfaces and in `mapTradeToResponse`.
- Formula simplified to `distribution + buy` (mathematically equivalent to the original
  `targetGain / quantity + buy` since `targetGain = quantity × distribution`).
- `targetGain` local variable in `transformTradeToPosition` retained (still used for `targetGain:` output).
- Service spec `createOpenTrade` fixture updated to include all required `Trade` fields (including
  `target_sell: 0`) to prevent runtime `undefined` for the `toBeDefined()` assertion.
- No client-side Target Sell arithmetic remains in `apps/dms-material/`.

## File List

- `apps/server/src/app/routes/trades/index.ts` — added `target_sell: number` to `Trade` interface and
  computed `target_sell = distribution + trade.buy` in `mapTradeToResponse`
- `apps/server/src/app/routes/trades/index.spec.ts` — added 3 new `target_sell` tests (happy-path,
  zero-distribution, null-universe)
- `apps/dms-material/src/app/store/trades/trade.interface.ts` — mirrored `target_sell: number`
- `apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.ts` —
  removed `targetSell:` arithmetic; replaced with `targetSell: trade.target_sell`
- `apps/dms-material/src/app/account-panel/open-positions/open-positions-component.service.spec.ts` —
  updated `createOpenTrade` fixture to include all required `Trade` fields

## Change Log

- Added `target_sell: number` to server `Trade` interface
- Implemented `target_sell = distribution + trade.buy` in `mapTradeToResponse`
- Added 3 new server unit tests for `target_sell` (happy-path + edge cases)
- Mirrored `target_sell: number` on client `Trade` interface
- Removed client-side `targetSell` arithmetic from `transformTradeToPosition`
- Updated service spec mock fixture to include required numeric Trade fields
