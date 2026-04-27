# Story 86.1: Extend Universe API to Expose Short-Term Volatility

Status: Approved

## Story

As a developer,
I want the Universe API response to include a `volatilityShort` field for every symbol,
so that the Angular frontend has the data it needs to render the "SVol" column added in
Story 86.2.

## Acceptance Criteria

1. **Given** the Universe Fastify endpoint (`GET /api/universe`),
   **When** a request is processed,
   **Then** each universe item in the response includes a `volatilityShort` field containing
   the stored 1-year category string (or `null` if not yet calculated).

2. **Given** the TypeScript `Universe` interface on both the server (`universe.interface.ts`)
   and the frontend store (`apps/dms-material/src/app/store/universe/universe.interface.ts`),
   **When** the developer confirms the `volatilityShort: string | null` field is present,
   **Then** the Angular compiler raises no type errors and no `any` casts are needed.

3. **Given** the API change is applied,
   **When** unit tests for the Universe route are run,
   **Then** the tests assert that `volatilityShort` is present in the response payload and
   matches the value stored in `volatility_short` on the `universe` row.

4. **Given** `pnpm all` is run,
   **Then** all tests pass.

## Tasks / Subtasks

- [x] Task 1: Verify `volatilityShort` is included in the backend response (AC: #1)

  - [x] Open `apps/server/src/app/routes/universe/universe.interface.ts`
  - [x] Confirm `volatilityShort: string | null` is present (added in Story 85.3)
  - [x] If Story 85.3 did not include it, add it now alongside `volatilityLong`
  - [x] Open `apps/server/src/app/routes/universe/index.ts` — confirm `mapUniverseToResponse` maps `volatility_short → volatilityShort`

- [x] Task 2: Verify frontend `Universe` interface includes `volatilityShort` (AC: #2)

  - [x] Open `apps/dms-material/src/app/store/universe/universe.interface.ts`
  - [x] Confirm `volatilityShort: string | null` is declared (added in Story 85.3)
  - [x] If missing, add it now
  - [x] Run `pnpm nx build dms-material` to confirm no TypeScript errors

- [x] Task 3: Write/update unit tests for Universe route asserting `volatilityShort` (AC: #3)

  - [x] Open or create `apps/server/src/app/routes/universe/index.spec.ts`
  - [x] Add a test case: mock a `universe` row with a non-null `volatility_short` value
  - [x] Assert the route response JSON includes `volatilityShort` with the expected value
  - [x] Add a test case: mock a `universe` row with `volatility_short: null`
  - [x] Assert the response includes `volatilityShort: null` (not `undefined`)

- [ ] Task 4: Full test run (AC: #4)
  - [ ] Run `pnpm all` and confirm all tests pass

## Dev Notes

### Context: Relationship to Story 85.3

Story 85.3 is responsible for the primary API change (serving stored volatility from the DB).
This story ensures `volatilityShort` is explicitly exposed with a typed API contract and unit
test coverage, providing a solid foundation for Story 86.2 (the SVol column).

If Story 85.3 already added `volatilityShort` to both the interface and the route response,
this story's primary work is the unit tests (Task 3). Do not duplicate changes already made.

### API Response Shape After This Story

```typescript
// GET /api/universe response item shape
{
  id: string;
  symbol: string;
  // ... other fields ...
  volatilityLong: string | null; // 5-year category — from Story 85.3
  volatilityShort: string | null; // 1-year category — confirmed in this story
}
```

### Frontend Interface After This Story

```typescript
// apps/dms-material/src/app/store/universe/universe.interface.ts
export interface Universe {
  // ... existing fields ...
  volatilityLong: string | null;
  volatilityShort: string | null;
}
```

### Unit Test Pattern

Follow the Vitest + Fastify injection test pattern used in existing route specs:

```typescript
// apps/server/src/app/routes/universe/index.spec.ts
it('includes volatilityShort in universe response', async () => {
  // mock prisma.universe.findMany to return a row with volatility_short: 'steady'
  const response = await app.inject({ method: 'GET', url: '/api/universe' });
  const body = JSON.parse(response.body);
  expect(body[0].volatilityShort).toBe('steady');
});

it('includes volatilityShort as null when not calculated', async () => {
  // mock prisma.universe.findMany to return a row with volatility_short: null
  const response = await app.inject({ method: 'GET', url: '/api/universe' });
  const body = JSON.parse(response.body);
  expect(body[0].volatilityShort).toBeNull();
});
```

### Named Functions

All test callbacks must be named functions (ESLint `@smarttools/no-anonymous-functions`):

```typescript
it('includes volatilityShort in response', async function assertVolatilityShortInResponse() {
  // ...
});
```

### Key Commands

```bash
pnpm nx test server          # Server unit tests
pnpm nx build dms-material   # Check for TypeScript errors in frontend
pnpm all                     # Full lint + build + test
```

### References

- [apps/server/src/app/routes/universe/universe.interface.ts](apps/server/src/app/routes/universe/universe.interface.ts) — Server-side Universe interface
- [apps/server/src/app/routes/universe/index.ts](apps/server/src/app/routes/universe/index.ts) — Universe router with `mapUniverseToResponse`
- [apps/dms-material/src/app/store/universe/universe.interface.ts](apps/dms-material/src/app/store/universe/universe.interface.ts) — Frontend Universe interface
- Story 85.3 must be completed before this story
- This story is a prerequisite for Story 86.2 (SVol column)
