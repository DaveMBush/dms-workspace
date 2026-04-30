# Story 95.1: Enforce Symbol as Required in the Trade Interface

Status: Approved

## Story

As a developer,
I want `symbol` to be a required (non-optional) field in both the server and client `Trade`
interfaces, and the SmartNgRX `/api/trades/` POST endpoint to always return a non-null symbol,
So that downstream components can safely access `trade.symbol` without optional chaining or
fallback lookups.

## Acceptance Criteria

1. **Given** the server `Trade` interface in `apps/server/src/app/routes/trades/index.ts`
   currently has `symbol?: string`,
   **When** the fix is applied,
   **Then** the field is changed to `symbol: string` and `mapTradeToResponse` maps
   `trade.universe?.symbol ?? ''` to ensure it is always a string.

2. **Given** the client `Trade` interface in
   `apps/dms-material/src/app/store/trades/trade.interface.ts` currently has `symbol?: string`,
   **When** the fix is applied,
   **Then** the field is changed to `symbol: string`.

3. **Given** a trade record references a universe symbol that has been deleted or is missing,
   **When** the `/api/trades/` POST endpoint returns that trade,
   **Then** `symbol` falls back to an empty string `''` rather than throwing or omitting
   the field.

4. **Given** the change is implemented with failing unit tests first (TDD),
   **When** `pnpm all` runs,
   **Then** all tests pass, including updated specs for `routes/trades/index.ts`.

## Tasks / Subtasks

- [ ] Task 1: Write failing unit tests (TDD)
  - [ ] Open `apps/server/src/app/routes/trades/index.spec.ts` (or the trade route spec)
  - [ ] Add a test asserting `mapTradeToResponse` always returns `symbol: string` (not undefined)
  - [ ] Test the null/undefined universe case returns `symbol: ''`
  - [ ] Confirm tests fail (RED) before any implementation change

- [ ] Task 2: Update the server `Trade` interface and `mapTradeToResponse`
  - [ ] In `apps/server/src/app/routes/trades/index.ts`, change `symbol?: string` to `symbol: string`
  - [ ] Update `mapTradeToResponse` to map `trade.universe?.symbol ?? ''` (currently it uses `trade.universe?.symbol` which could be undefined)

- [ ] Task 3: Update the client `Trade` interface
  - [ ] In `apps/dms-material/src/app/store/trades/trade.interface.ts`, change `symbol?: string` to `symbol: string`

- [ ] Task 4: Fix any TypeScript errors in the client that previously handled `trade.symbol` as optional
  - [ ] Search for `trade.symbol?` or `trade?.symbol` in the client codebase
  - [ ] Remove unnecessary optional chaining now that `symbol` is required

- [ ] Task 5: Verify
  - [ ] `pnpm all` passes with no TypeScript errors

## Dev Notes

### Files to Change

```
apps/server/src/app/routes/trades/index.ts
apps/dms-material/src/app/store/trades/trade.interface.ts
```

### Current Trade Interface (Server)

From `apps/server/src/app/routes/trades/index.ts`:
```typescript
interface Trade {
  id: string;
  universeId: string;
  accountId: string;
  symbol?: string;   // ← change to: symbol: string
  buy: number;
  sell: number;
  buy_date: string;
  sell_date?: string;
  quantity: number;
}
```

### Current `mapTradeToResponse`

```typescript
function mapTradeToResponse(trade: TradeWithUniverseAndDates): Trade {
  return {
    id: trade.id,
    universeId: trade.universeId,
    accountId: trade.accountId,
    symbol: trade.universe?.symbol,  // ← can be undefined; change to: trade.universe?.symbol ?? ''
    buy: trade.buy,
    sell: trade.sell,
    buy_date: trade.buy_date.toISOString(),
    sell_date: trade.sell_date?.toISOString(),
    quantity: trade.quantity,
  };
}
```

The Prisma query already includes:
```typescript
include: { universe: { select: { symbol: true } } }
```
so `trade.universe?.symbol` will be populated for all valid records.

### Client Interface

`apps/dms-material/src/app/store/trades/trade.interface.ts`:
```typescript
export interface Trade {
  id: string;
  universeId: string;
  accountId: string;
  symbol?: string;   // ← change to: symbol: string
  buy: number;
  sell: number;
  buy_date: string;
  sell_date?: string;
  quantity: number;
}
```

### Test Scope

Unit tests only. Client-side component changes are in Story 95.2.

## Dev Agent Record

### Agent Notes

_To be filled in during implementation._

## File List

_To be populated during implementation._

## Change Log

_To be populated during implementation._
