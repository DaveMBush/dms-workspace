# Story 95.1: Enforce Symbol as Required in the Trade Interface

Status: review

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

- [x] Task 1: Write failing unit tests (TDD)

  - [x] Open `apps/server/src/app/routes/trades/index.spec.ts` (or the trade route spec)
  - [x] Add a test asserting `mapTradeToResponse` always returns `symbol: string` (not undefined)
  - [x] Test the null/undefined universe case returns `symbol: ''`
  - [x] Confirm tests fail (RED) before any implementation change

- [x] Task 2: Update the server `Trade` interface and `mapTradeToResponse`

  - [x] In `apps/server/src/app/routes/trades/index.ts`, change `symbol?: string` to `symbol: string`
  - [x] Update `mapTradeToResponse` to map `trade.universe?.symbol ?? ''` (currently it uses `trade.universe?.symbol` which could be undefined)

- [x] Task 3: Update the client `Trade` interface

  - [x] In `apps/dms-material/src/app/store/trades/trade.interface.ts`, change `symbol?: string` to `symbol: string`

- [x] Task 4: Fix any TypeScript errors in the client that previously handled `trade.symbol` as optional

  - [x] Search for `trade.symbol?` or `trade?.symbol` in the client codebase
  - [x] Remove unnecessary optional chaining now that `symbol` is required

- [x] Task 5: Verify
  - [x] `pnpm all` passes with no TypeScript errors

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
  symbol?: string; // ← change to: symbol: string
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
    symbol: trade.universe?.symbol, // ← can be undefined; change to: trade.universe?.symbol ?? ''
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
include: {
  universe: {
    select: {
      symbol: true;
    }
  }
}
```

so `trade.universe?.symbol` will be populated for all valid records.

### Client Interface

`apps/dms-material/src/app/store/trades/trade.interface.ts`:

```typescript
export interface Trade {
  id: string;
  universeId: string;
  accountId: string;
  symbol?: string; // ← change to: symbol: string
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

### Implementation Plan

1. Created comprehensive unit tests for `mapTradeToResponse` function following TDD methodology (RED phase)
2. Updated server-side `Trade` interface to make `symbol` required
3. Modified `mapTradeToResponse` to use nullish coalescing operator (`??`) for guaranteed string return
4. Updated client-side `Trade` interface to match server requirements
5. Verified no optional chaining cleanup needed in client codebase
6. Confirmed all tests pass including new unit tests

### Completion Notes

✅ All acceptance criteria met:

- Server `Trade` interface updated: `symbol: string` (required)
- `mapTradeToResponse` now uses `trade.universe?.symbol ?? ''` for guaranteed string
- Client `Trade` interface updated: `symbol: string` (required)
- TDD approach followed: failing tests written first (RED), then implementation (GREEN)
- Full test suite passing: `pnpm nx run-many -t lint build test --coverage` succeeded
- No optional chaining on `trade.symbol` found in client codebase

**Testing**: Created 4 unit tests in `apps/server/src/app/routes/trades/index.spec.ts`:

- Verifies symbol is always a string type (not undefined)
- Tests null universe case returns empty string
- Tests undefined symbol case returns empty string
- Validates sell_date handling with symbol present

**Implementation Details**:

- Server interface change ensures type safety at compile time
- Nullish coalescing operator provides runtime safety for missing universe records
- Empty string fallback maintains backward compatibility while ensuring non-null values

## File List

### Modified Files

- `apps/server/src/app/routes/trades/index.ts` - Updated Trade interface and mapTradeToResponse function
- `apps/dms-material/src/app/store/trades/trade.interface.ts` - Updated client Trade interface

### Created Files

- `apps/server/src/app/routes/trades/index.spec.ts` - New unit test file for trade route handlers

## Change Log

- **2026-05-04**: Implemented story 95.1 following TDD methodology
  - Created comprehensive unit tests for mapTradeToResponse (RED phase)
  - Updated server Trade interface: `symbol?: string` → `symbol: string`
  - Updated mapTradeToResponse: `trade.universe?.symbol` → `trade.universe?.symbol ?? ''`
  - Updated client Trade interface: `symbol?: string` → `symbol: string`
  - Verified no optional chaining cleanup needed
  - All tests passing including new unit tests
  - Story status updated to "review"
