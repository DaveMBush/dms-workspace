# Story 94.2: Remove Universe Lookup Map from DivDeposit Client Component

Status: Approved

## Story

As a developer,
I want `dividend-deposits-component.service.ts` to read `d.symbol` directly from each
`DivDeposit` row instead of building a `universeMap` and performing a `universeMap.get(d.universeId)` lookup,
So that the dividend-deposits display does not depend on the universe store being fully loaded.

## Acceptance Criteria

1. **Given** the client-side `DivDeposit` interface in
   `apps/dms-material/src/app/store/div-deposits/div-deposit.interface.ts`,
   **When** the fix is applied,
   **Then** the interface includes `symbol: string | null` (matching the server response
   from Story 94.1).

2. **Given** `buildLoadedDividendRow` in `dividend-deposits-component.service.ts` currently
   uses `universeMap.get(d.universeId)?.symbol ?? ''`,
   **When** the fix is applied,
   **Then** it uses `d.symbol ?? ''` directly, with no reference to `universeMap`.

3. **Given** the `dividends` computed signal currently calls `buildUniverseMap()`,
   **When** the fix is applied,
   **Then** `buildUniverseMap()` is no longer called from this file.

4. **Given** the deposit table renders the symbol column,
   **When** a deposit row is displayed,
   **Then** the ticker symbol is visible and matches the symbol returned by the API (verified
   via Playwright MCP server).

5. **Given** the change is implemented with failing unit tests first (TDD),
   **When** `pnpm all` runs,
   **Then** all tests pass, including updated specs for `dividend-deposits-component.service.ts`.

## Tasks / Subtasks

- [ ] Task 1: Update the client `DivDeposit` interface
  - [ ] Open `apps/dms-material/src/app/store/div-deposits/div-deposit.interface.ts`
  - [ ] Add `symbol: string | null` to the interface

- [ ] Task 2: Write failing unit tests (TDD)
  - [ ] Open `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits-component.service.spec.ts`
  - [ ] Update test fixtures to include `symbol: 'PDI'` in `DivDeposit` objects
  - [ ] Assert that `buildLoadedDividendRow` result has `symbol: 'PDI'` from the deposit directly (not from a universe map)
  - [ ] Confirm tests fail (RED) before any implementation change

- [ ] Task 3: Update `buildLoadedDividendRow` in `dividend-deposits-component.service.ts`
  - [ ] Change `symbol: d.universeId !== null ? universeMap.get(d.universeId)?.symbol ?? '' : ''`
    to `symbol: d.symbol ?? ''`
  - [ ] Remove the `universeMap` parameter from `buildLoadedDividendRow`

- [ ] Task 4: Update the `dividends` computed signal
  - [ ] Remove the `const universeMap = buildUniverseMap();` line
  - [ ] Remove any now-unused `universeMap` parameter from `buildLoadedDividendRow` calls
  - [ ] Remove the import of `buildUniverseMap` if it is no longer used in this file

- [ ] Task 5: Verify with Playwright MCP server
  - [ ] Launch the app and navigate to an account's dividend deposits panel
  - [ ] Confirm the symbol column displays ticker symbols correctly

- [ ] Task 6: Run full test suite
  - [ ] `pnpm all` passes

## Dev Notes

### Files to Change

```
apps/dms-material/src/app/store/div-deposits/div-deposit.interface.ts
apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits-component.service.ts
```

### Current `buildLoadedDividendRow` Implementation

```typescript
function buildLoadedDividendRow(
  d: DivDeposit,
  universeMap: Map<string, Universe>,
  typeNamesMap: Map<string, string>
): DividendRow {
  return {
    id: d.id,
    date: d.date,
    amount: d.amount,
    accountId: d.accountId,
    divDepositTypeId: d.divDepositTypeId,
    universeId: d.universeId,
    symbol:
      d.universeId !== null ? universeMap.get(d.universeId)?.symbol ?? '' : '',
    //                       ↑ REPLACE with: d.symbol ?? ''
    type: typeNamesMap.get(d.divDepositTypeId) ?? '',
  };
}
```

### Current `dividends` Signal (removing the universeMap call)

```typescript
readonly dividends = computed(() => {
  const divDepositsArray = this.currentAccount().divDeposits as DivDeposit[];
  const totalLength = divDepositsArray.length;
  if (totalLength === 0) {
    return [];
  }
  const universeMap = buildUniverseMap();  // ← REMOVE this line
  const typesList = selectDivDepositTypes();
  const typeNamesMap = new Map<string, string>();
  for (let ti = 0; ti < typesList.length; ti++) {
    typeNamesMap.set(typesList[ti].id, typesList[ti].name);
  }

  const result = new Array<DividendRow>(totalLength);
  for (let i = 0; i < totalLength; i++) {
    const d = divDepositsArray[i];
    if (d === undefined || typeof d === 'string') {
      result[i] = buildPlaceholderDividendRow(`placeholder-${String(i)}`);
      continue;
    }
    result[i] = buildLoadedDividendRow(d, universeMap, typeNamesMap);
    //                                     ↑ REMOVE universeMap parameter after refactor
  }
  return result;
});
```

### Dependency Note

This story depends on Story 94.1 being deployed (i.e., the server must return `symbol` in
the `DivDeposit` response before this client change will work correctly in production).
Unit tests can mock the server response to include `symbol` regardless of Story 94.1's
deployment status.

### Test Scope

Unit tests for `dividend-deposits-component.service.ts`. Playwright MCP server verification
for the symbol column rendering. No new E2E automated tests required.

## Dev Agent Record

### Agent Notes

_To be filled in during implementation._

## File List

_To be populated during implementation._

## Change Log

_To be populated during implementation._
