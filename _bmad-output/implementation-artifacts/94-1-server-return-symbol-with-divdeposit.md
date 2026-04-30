# Story 94.1: Update divDeposit Server Endpoint to Return Symbol

Status: Approved

## Story

As a developer,
I want the `DivDeposit` API response to include a `symbol: string | null` field resolved from
the linked universe record,
So that the client can render the deposit's ticker without performing a separate universe
store lookup.

## Acceptance Criteria

1. **Given** the `POST /api/div-deposits/` endpoint is called with an array of deposit IDs,
   **When** the server queries the database,
   **Then** each returned `DivDeposit` object includes a `symbol` field resolved from
   `divDeposits.universe.symbol` (or `null` if `universeId` is `null`).

2. **Given** the Prisma query currently uses `prisma.divDeposits.findMany({ where: { id: { in: ids } } })`,
   **When** the fix is applied,
   **Then** the query includes `include: { universe: { select: { symbol: true } } }` so the
   join is performed in a single database round-trip.

3. **Given** the `handleAddDivDepositRoute` (`POST /api/div-deposits/add`) creates a new deposit,
   **When** the response is sent,
   **Then** the returned `DivDeposit` object also includes the resolved `symbol` field.

4. **Given** the `handleUpdateDivDepositRoute` (`PUT /api/div-deposits/`) updates a deposit,
   **When** the response is sent,
   **Then** the returned `DivDeposit` objects also include the resolved `symbol` field.

5. **Given** the server-side `DivDeposit` interface in `div-deposits.interface.ts`,
   **When** the fix is applied,
   **Then** the interface includes `symbol: string | null` alongside the existing fields.

6. **Given** the change is implemented with failing unit tests first (TDD),
   **When** `pnpm all` runs,
   **Then** all tests pass, including updated specs for `div-deposits/index.ts`.

## Tasks / Subtasks

- [ ] Task 1: Write failing unit tests (TDD)
  - [ ] Open or create `apps/server/src/app/routes/div-deposits/index.spec.ts`
  - [ ] Mock Prisma to return records with `universe: { symbol: 'PDI' }` and assert the response includes `symbol: 'PDI'`
  - [ ] Test null case: `universeId: null` should produce `symbol: null`
  - [ ] Confirm tests fail (RED) before any implementation change

- [ ] Task 2: Update the server `DivDeposit` interface
  - [ ] Open `apps/server/src/app/routes/div-deposits/div-deposits.interface.ts`
  - [ ] Add `symbol: string | null` to the `DivDeposit` interface

- [ ] Task 3: Update the Prisma queries to include the join
  - [ ] In `handleGetDivDepositsRoute`: change `prisma.divDeposits.findMany({ where: { id: { in: ids } } })`
    to include `include: { universe: { select: { symbol: true } } }`
  - [ ] In `handleAddDivDepositRoute`: after `prisma.divDeposits.create(...)`, either re-fetch with the
    universe join or map `universe?.symbol ?? null` from the result if Prisma returns it
  - [ ] In `handleUpdateDivDepositRoute`: similarly ensure the response includes `symbol`

- [ ] Task 4: Update `mapDivDepositToResponse`
  - [ ] Change the `DivDepositFromDb` local interface to include `universe: { symbol: string } | null`
  - [ ] Map `u.universe?.symbol ?? null` to `symbol` in `mapDivDepositToResponse`

- [ ] Task 5: Verify
  - [ ] Run `pnpm all` — confirm all tests pass

## Dev Notes

### Files to Change

```
apps/server/src/app/routes/div-deposits/index.ts
apps/server/src/app/routes/div-deposits/div-deposits.interface.ts
```

### Current Implementation in `div-deposits/index.ts`

```typescript
interface DivDepositFromDb {
  id: string;
  date: Date;
  amount: number;
  accountId: string;
  divDepositTypeId: string;
  universeId: string | null;
}

function mapDivDepositToResponse(u: DivDepositFromDb): DivDeposit {
  return {
    id: u.id,
    date: u.date,
    amount: u.amount,
    accountId: u.accountId,
    divDepositTypeId: u.divDepositTypeId,
    universeId: u.universeId,
    // ← symbol field MISSING
  };
}
```

The Prisma query in `handleGetDivDepositsRoute`:
```typescript
const divDeposits = await prisma.divDeposits.findMany({
  where: { id: { in: ids } },
  // ← no include for universe
});
```

### Target Implementation

Update `DivDepositFromDb` and the Prisma query:
```typescript
interface DivDepositFromDb {
  id: string;
  date: Date;
  amount: number;
  accountId: string;
  divDepositTypeId: string;
  universeId: string | null;
  universe: { symbol: string } | null;  // ← ADD
}

function mapDivDepositToResponse(u: DivDepositFromDb): DivDeposit {
  return {
    id: u.id,
    date: u.date,
    amount: u.amount,
    accountId: u.accountId,
    divDepositTypeId: u.divDepositTypeId,
    universeId: u.universeId,
    symbol: u.universe?.symbol ?? null,  // ← ADD
  };
}
```

Query:
```typescript
const divDeposits = await prisma.divDeposits.findMany({
  where: { id: { in: ids } },
  include: { universe: { select: { symbol: true } } },  // ← ADD
});
```

The same `include` pattern must be applied to the `create` and `update` calls (or alternatively,
perform a re-fetch after create/update if Prisma's create/update doesn't support the nested
include directly).

### Server Interface Update

`div-deposits.interface.ts` currently:
```typescript
export interface DivDeposit {
  id: string;
  date: Date;
  amount: number;
  accountId: string;
  divDepositTypeId: string;
  universeId: string | null;
}
```

Add `symbol: string | null` to this interface.

### Test Scope

Unit tests only in this story. Client-side changes are in Story 94.2.

## Dev Agent Record

### Agent Notes

_To be filled in during implementation._

## File List

_To be populated during implementation._

## Change Log

_To be populated during implementation._
