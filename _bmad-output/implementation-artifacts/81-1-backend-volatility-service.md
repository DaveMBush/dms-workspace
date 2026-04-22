# Story 81.1: Backend — Distribution Volatility Calculation Service

Status: Done

## Story

As a developer,
I want a backend service (Fastify route + Prisma query) that calculates the distribution volatility category (steady / increasing / decreasing / volatile) for each symbol in the Universe,
so that the frontend has a reliable, performant data source for the "Vol" column.

## Acceptance Criteria

1. **Given** Distribution table contains records for a symbol,
   **When** volatility service is called for symbol with at least 12 months of history,
   **Then** returns one of: `steady`, `increasing`, `decreasing`, `volatile` (with separate 1-year and 5-year values).

2. **Given** symbol with consistent amounts over 12 months (variance below threshold),
   **When** 1-year category calculated,
   **Then** category is `steady`.

3. **Given** symbol with upward trending amounts over 12 months,
   **When** 1-year category calculated,
   **Then** category is `increasing`.

4. **Given** symbol with downward trending amounts over 12 months,
   **When** 1-year category calculated,
   **Then** category is `decreasing`.

5. **Given** symbol with high variance (not clearly trending),
   **When** 1-year category calculated,
   **Then** category is `volatile`.

6. **Given** symbol with fewer than 12 months of data,
   **When** service called,
   **Then** returns `null` or `unknown` category without error.

7. **Given** new endpoint added,
   **When** developer writes unit tests,
   **Then** each category (`steady`, `increasing`, `decreasing`, `volatile`, `null`) is covered by at least one test case.

## Tasks / Subtasks

- [x] Task 1: Locate distribution data model in Prisma schema (AC: #1)

  - [x] Read `prisma/schema.prisma` — identify the model storing distribution/dividend history (look for `Distribution`, `DivDeposits`, or similar)
  - [x] Identify fields: `symbol`, `amount`/`distribution`, `date`/`exDate`, `account`
  - [x] Document model name and fields in Dev Notes before writing any code

- [x] Task 2: Write the volatility calculation pure function (AC: #1–6)

  - [x] Create `apps/server/src/app/volatility/volatility-calculation.function.ts`
  - [x] Function signature: `calculateVolatility(amounts: number[]): VolatilityCategory`
  - [x] Type: `type VolatilityCategory = 'steady' | 'increasing' | 'decreasing' | 'volatile' | null`
  - [x] Algorithm:
    - If fewer than 12 data points → return `null`
    - Calculate coefficient of variation (CV = stddev / mean)
    - If CV < 0.10 → `steady`
    - Else run linear regression; if slope is clearly positive → `increasing`
    - Else if slope is clearly negative → `decreasing`
    - Else → `volatile`
  - [x] Named functions throughout — no anonymous arrow functions

- [x] Task 3: Write Prisma query function to batch-fetch distribution history (AC: #1)

  - [x] Create query function that fetches all symbols' distribution history in a single query (avoid N+1)
  - [x] Query: group by symbol, order by date, return last 5 years of records
  - [x] Return type: `Map<string, { date: Date; amount: number }[]>` (symbol → sorted history)

- [x] Task 4: Create or augment Universe API endpoint (AC: #1)

  - [x] Check if `GET /api/universe` or `GET /api/screener` exists in `apps/server/src/app/routes/`
  - [x] Created new endpoint `GET /api/universe/volatility` that returns `{ symbol: string; volatility1yr: VolatilityCategory; volatility5yr: VolatilityCategory }[]`
  - [x] Use the Prisma batch query from Task 3 — do not execute per-symbol queries inside a loop

- [x] Task 5: Write unit tests for volatility calculation function (AC: #7)

  - [x] Create `apps/server/src/app/volatility/volatility-calculation.function.spec.ts`
  - [x] Use Vitest; import the pure `calculateVolatility` function directly
  - [x] Test cases:
    - Steady: 12 months of identical amounts → `steady`
    - Increasing: 12 months of linearly increasing amounts → `increasing`
    - Decreasing: 12 months of linearly decreasing amounts → `decreasing`
    - Volatile: 12 months of random high-variance amounts → `volatile`
    - Insufficient data: array of 6 items → `null`
    - Empty array: `[]` → `null`

- [x] Task 6: Performance verification and full test run (AC: #1–7)
  - [x] Confirmed batch query design avoids N+1 (single Prisma query with universe relation)
  - [x] Run `pnpm all` and confirm all tests pass including new unit tests

## Dev Notes

### Distribution Model Discovery

Before writing any code, read `prisma/schema.prisma` to confirm the correct model name and fields. Common candidates based on project structure:

- `DivDeposits` — dividend/distribution deposit records
- `Distribution` — distribution history
- Fields to look for: `symbol`, `amount` or `distribution`, `date` or `exDate`, `account`

### Volatility Algorithm

```typescript
// volatility-calculation.function.ts
type VolatilityCategory = 'steady' | 'increasing' | 'decreasing' | 'volatile' | null;

const STEADY_CV_THRESHOLD = 0.1; // 10% coefficient of variation
const TREND_SLOPE_THRESHOLD = 0.001; // minimum slope to classify as trending

function calculateMean(values: number[]): number {
  return (
    values.reduce(function sum(acc, v) {
      return acc + v;
    }, 0) / values.length
  );
}

function calculateStdDev(values: number[], mean: number): number {
  const variance =
    values.reduce(function sumSqDiff(acc, v) {
      return acc + Math.pow(v - mean, 2);
    }, 0) / values.length;
  return Math.sqrt(variance);
}

function calculateLinearRegressionSlope(values: number[]): number {
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = calculateMean(values);
  let numerator = 0;
  let denominator = 0;
  values.forEach(function accumulateSlope(y, x) {
    numerator += (x - xMean) * (y - yMean);
    denominator += Math.pow(x - xMean, 2);
  });
  return denominator === 0 ? 0 : numerator / denominator;
}

export function calculateVolatility(amounts: number[]): VolatilityCategory {
  if (amounts.length < 12) {
    return null;
  }
  const mean = calculateMean(amounts);
  if (mean === 0) return null;
  const stdDev = calculateStdDev(amounts, mean);
  const cv = stdDev / mean;
  if (cv < STEADY_CV_THRESHOLD) {
    return 'steady';
  }
  const slope = calculateLinearRegressionSlope(amounts);
  const normalizedSlope = slope / mean;
  if (normalizedSlope > TREND_SLOPE_THRESHOLD) {
    return 'increasing';
  }
  if (normalizedSlope < -TREND_SLOPE_THRESHOLD) {
    return 'decreasing';
  }
  return 'volatile';
}
```

### Avoiding N+1 Queries

**Do not** query per-symbol inside a loop. Use a single Prisma query to fetch all distribution records at once:

```typescript
// Example batch query
const allRecords = await prisma.divDeposits.findMany({
  // adjust model name from schema
  where: { date: { gte: fiveYearsAgo } },
  orderBy: { date: 'asc' },
  select: { symbol: true, amount: true, date: true },
});

// Group by symbol in memory
const bySymbol = new Map<string, number[]>();
for (const record of allRecords) {
  if (!bySymbol.has(record.symbol)) {
    bySymbol.set(record.symbol, []);
  }
  bySymbol.get(record.symbol)!.push(record.amount);
}
```

### Performance Target

The Universe endpoint with volatility data must respond in < 200 ms. If the distribution table is large, consider:

- Filtering to last 5 years in the Prisma query (use `gte` on date field)
- Selecting only `symbol`, `amount`, `date` fields
- NOT loading all fields or related records

### Key Commands

| Purpose                        | Command                                                                   |
| ------------------------------ | ------------------------------------------------------------------------- |
| Run all tests                  | `pnpm all`                                                                |
| Run server unit tests only     | `pnpm nx test server`                                                     |
| Check Prisma schema            | `cat prisma/schema.prisma`                                                |
| List server routes             | `ls apps/server/src/app/routes/`                                          |
| Measure endpoint response time | `curl -w "%{time_total}" -o /dev/null http://localhost:3000/api/universe` |

### Key Files

| File                                                                     | Purpose                                                             |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `prisma/schema.prisma`                                                   | Database schema — find distribution model name and fields           |
| `apps/server/src/app/routes/`                                            | Existing server routes — find Universe/Screener endpoint to augment |
| `apps/server/src/app/volatility/volatility-calculation.function.ts`      | New pure function to create                                         |
| `apps/server/src/app/volatility/volatility-calculation.function.spec.ts` | New unit tests to create                                            |

### Constraints

- No N+1 queries — batch fetch all distribution records in a single Prisma call
- Performance target: < 200 ms for Universe query with volatility data
- Named functions for all callbacks
- Pure function for `calculateVolatility` — no side effects, no Prisma calls inside it
- Unit tests must cover all 5 category outcomes

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

- ESLint `@typescript-eslint/sort-type-constituents` on `VolatilityCategory` — sorted alphabetically
- ESLint `@smarttools/one-exported-item-per-file` — split `VolatilityCategory` to `volatility-category.type.ts` and `VolatilityResult` to `volatility-result.interface.ts`
- Coverage branch miss on `denominator === 0` guard in `calculateLinearRegressionSlope` — removed dead branch (denominator is always > 0 for n ≥ 2)
- Prisma generate required in worktree before lint to resolve unsafe-member-access errors

### Completion Notes List

- Distribution model: `divDeposits` with fields `amount` (Float), `date` (DateTime), `universeId` (String?, FK to universe), `deletedAt` (DateTime?)
- Created new dedicated endpoint `GET /api/universe/volatility` (not augmenting existing universe endpoint)
- Single batch Prisma query with universe relation select; in-memory grouping by symbol
- `VolatilityCategory` type alphabetically sorted as required by ESLint rule
- All 5 outcomes (steady, increasing, decreasing, volatile, null) tested with 10 test cases total
- Gate review: PASS — 0 findings

### File List

- `apps/server/src/app/volatility/volatility-category.type.ts` (new)
- `apps/server/src/app/volatility/volatility-calculation.function.ts` (new)
- `apps/server/src/app/volatility/volatility-calculation.function.spec.ts` (new)
- `apps/server/src/app/volatility/volatility-query.function.ts` (new)
- `apps/server/src/app/volatility/volatility-result.interface.ts` (new)
- `apps/server/src/app/routes/universe/get-volatility/index.ts` (new)
- `apps/server/src/app/routes/universe/index.ts` (modified — added import + route registration)

### Change Log

| Date       | Change                                                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-21 | Initial implementation — volatility calculation function, Prisma batch query, GET /api/universe/volatility endpoint, 10 unit tests |
