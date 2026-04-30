# Story 89.2: Fix CSV Import Path to Set CEF Records as Expired

Status: review

## Story

As a developer,
I want the exported `createUniverseEntry()` in `create-universe-entry.helper.ts` to set
`expired: true` whenever `isCef` is `true`,
So that CEF symbols added via CSV import are immediately visible in the expired-CEF filter.

## Acceptance Criteria

1. **Given** `createUniverseEntry(symbol, riskGroupId, true)` is called from the CSV import
   pipeline,
   **When** the Prisma `create` executes,
   **Then** the resulting record has `expired: true` and `is_closed_end_fund: true`.

2. **Given** `createUniverseEntry(symbol, riskGroupId, false)` is called for a non-CEF symbol,
   **When** the Prisma `create` executes,
   **Then** the resulting record has `expired: false` and `is_closed_end_fund: false`.

3. **Given** the change is implemented with a failing unit test first (TDD),
   **When** `pnpm all` runs,
   **Then** all tests pass, including a spec covering `create-universe-entry.helper.ts`
   (or the `fidelity-data-mapper` spec if the helper has no dedicated spec file).

## Tasks / Subtasks

- [x] Task 1: Write failing unit test (TDD)

  - [x] Check whether `apps/server/src/app/routes/import/create-universe-entry.helper.spec.ts`
        exists; if not, create it
  - [x] Add a test case: when `isCef = true`, the mocked `prisma.universe.create` is called
        with `{ expired: true, is_closed_end_fund: true }` in the `data` payload
  - [x] Add a test case: when `isCef = false`, `expired: false` is used
  - [x] Confirm the CEF test fails before implementation

- [x] Task 2: Implement the fix

  - [x] In `apps/server/src/app/routes/import/create-universe-entry.helper.ts`,
        change `expired: false` → `expired: isCef` in the `prisma.universe.create` call

- [x] Task 3: Verify
  - [x] Run `pnpm all` — confirm all tests pass
  - [x] Confirm fidelity-data-mapper and related import specs still pass

## Dev Notes

### File to Change

```
apps/server/src/app/routes/import/create-universe-entry.helper.ts
```

Current content (simplified):

```typescript
export async function createUniverseEntry(symbol: string, riskGroupId: string, isCef: boolean): Promise<{ id: string }> {
  const entry = await prisma.universe.create({
    data: {
      symbol,
      risk_group_id: riskGroupId,
      last_price: 0,
      distribution: 0,
      distributions_per_year: 0,
      ex_date: null,
      most_recent_sell_date: null,
      expired: false, // ← change to: expired: isCef,
      is_closed_end_fund: isCef,
    },
  });
  // … price/dividend fetch …
}
```

### Call Site

The call site is in `apps/server/src/app/routes/import/fidelity-data-mapper.function.ts`
(line ~63):

```typescript
const { riskGroupId, isCef } = await buildCefClassification(symbol);
return createUniverseEntry(symbol, riskGroupId, isCef);
```

No changes needed in `fidelity-data-mapper.function.ts`.

### Why This Story is Separate from 89.1

The exported `createUniverseEntry` in `create-universe-entry.helper.ts` is a distinct
function from the private `createUniverseEntry` inside `add-symbol.function.ts`.
Each must be fixed and tested independently to prevent future confusion about which path is
which.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

_None_

### Completion Notes

- ✅ AC1: CEF symbols now stored with `expired: true` and `is_closed_end_fund: true` when `isCef=true`.
- ✅ AC2: Non-CEF symbols unchanged — `expired: false` and `is_closed_end_fund: false` when `isCef=false`.
- ✅ AC3: TDD cycle followed — spec file created first (would fail with old `expired: false`), then one-line fix applied.
- Created dedicated spec file `create-universe-entry.helper.spec.ts` with 5 test cases covering CEF path, non-CEF path, return value, price fetch call, and fetch error handling.
- Changed `expired: false` → `expired: isCef` in `prisma.universe.create` data payload.

## File List

- `apps/server/src/app/routes/import/create-universe-entry.helper.ts` (modified)
- `apps/server/src/app/routes/import/create-universe-entry.helper.spec.ts` (created)
- `_bmad-output/implementation-artifacts/89-2-fix-csv-import-cef-expired.md` (story file updated)

## Change Log

- 2026-04-30: Implemented fix — `expired: isCef` in CSV import create-universe-entry helper; added dedicated spec with 5 test cases (TDD).

## Status

review
