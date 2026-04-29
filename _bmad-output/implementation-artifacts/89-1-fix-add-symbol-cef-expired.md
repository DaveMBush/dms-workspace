# Story 89.1: Fix Manual Add-Symbol Path to Set CEF Records as Expired

Status: Approved

## Story

As a developer,
I want the `createUniverseEntry()` function inside `add-symbol.function.ts` to set
`expired: true` whenever `isCef` is `true`,
So that manually-added CEF symbols are immediately visible in the expired-CEF filter without
requiring a separate universe sync.

## Acceptance Criteria

1. **Given** a symbol identified as a CEF via `lookupCefConnectSymbol`,
   **When** `createUniverseEntry(upperSymbol, effectiveRiskGroupId, true)` is called,
   **Then** the Prisma `create` call sets `expired: true` and `is_closed_end_fund: true`.

2. **Given** a symbol that is NOT a CEF,
   **When** `createUniverseEntry(upperSymbol, effectiveRiskGroupId, false)` is called,
   **Then** the Prisma `create` call sets `expired: false` and `is_closed_end_fund: false`
   (no behaviour change for non-CEF symbols).

3. **Given** the change is implemented with a failing unit test first (TDD),
   **When** `pnpm all` runs,
   **Then** all tests pass, including the updated spec for `add-symbol.function.ts`.

## Tasks / Subtasks

- [ ] Task 1: Write failing unit test (TDD)
  - [ ] Locate or create spec for the internal `createUniverseEntry` in
        `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.spec.ts`
  - [ ] Add a test case: when `isCef = true`, the mocked `prisma.universe.create` is
        called with `{ expired: true, is_closed_end_fund: true }` in the `data` payload
  - [ ] Confirm the test fails before any implementation change

- [ ] Task 2: Implement the fix
  - [ ] In `apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts`,
        find the internal `createUniverseEntry` function (around line 165)
  - [ ] Change `expired: false` to `expired: isCef` in the `prisma.universe.create` call

- [ ] Task 3: Verify
  - [ ] Run `pnpm all` — confirm all tests pass
  - [ ] Confirm no existing non-CEF test assertions changed

## Dev Notes

### File to Change

```
apps/server/src/app/routes/universe/add-symbol/add-symbol.function.ts
```

The internal `createUniverseEntry` function (not exported — it is private to this file and
different from the exported helper in `create-universe-entry.helper.ts`) currently has:

```typescript
async function createUniverseEntry(
  upperSymbol: string,
  effectiveRiskGroupId: string,
  isCef: boolean
): Promise<UniverseRecord> {
  return prisma.universe.create({
    data: {
      symbol: upperSymbol,
      risk_group_id: effectiveRiskGroupId,
      last_price: 0,
      distribution: 0,
      distributions_per_year: 0,
      ex_date: null,
      most_recent_sell_date: null,
      expired: false,          // ← change to: expired: isCef,
      is_closed_end_fund: isCef,
    },
  });
}
```

The fix is a one-line change: `expired: false` → `expired: isCef`.

### Why `expired: true` for CEFs

When a symbol is manually added, it is being added because it is NOT currently present in the
screener (if it were, it would already be in the universe via sync). A CEF that is not in the
screener is, by definition, expired/delisted. Setting `expired: true` immediately allows the
"expired CEF" filter to work from day one without waiting for a subsequent universe sync to
mark it.

### Test Scope

The fix is minimal: one field in one `prisma.universe.create` call. Only unit tests need to
change in this story. E2E coverage is added in Story 89.3.
