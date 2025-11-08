# Story Y1: Update getRiskGroupData to Filter by Account

Description: Modify the `getRiskGroupData()` function to accept an optional `accountId` parameter and conditionally filter the SQL query to return risk group data for a specific account when provided, or global data when omitted.

## Acceptance Criteria

- `getRiskGroupData()` signature updated to accept optional `accountId` parameter:
  - From: `getRiskGroupData(year: number, monthNum: number)`
  - To: `getRiskGroupData(year: number, monthNum: number, accountId?: string)`

- SQL query conditionally filters by account:
  - When `accountId` is provided: Query includes `AND t.accountId = ?` clause
  - When `accountId` is undefined/null: Query returns data for all accounts (global view)

- `handleSummaryRoute()` passes `account_id` from request to `getRiskGroupData()`:
  - Update line ~300: `const result = await getRiskGroupData(year, monthNum, account_id);`

- Query uses Prisma's `Prisma.sql` for safe parameterization to prevent SQL injection

- Behavior verification:
  - Account-specific request: Returns risk group data filtered to that account's trades only
  - Global request (no account_id): Returns risk group data aggregated across all accounts

## Technical Implementation Details

### Change 1: Update function signature

**File:** `/apps/server/src/app/routes/summary/index.ts` (line ~127-130)

From:
```typescript
async function getRiskGroupData(
  year: number,
  monthNum: number
): Promise<RiskGroupResult[]> {
```

To:
```typescript
async function getRiskGroupData(
  year: number,
  monthNum: number,
  accountId?: string
): Promise<RiskGroupResult[]> {
```

### Change 2: Add Prisma import

**File:** `/apps/server/src/app/routes/summary/index.ts` (top of file)

Add to imports section:
```typescript
import { Prisma } from '@prisma/client';
```

### Change 3: Update SQL query with conditional filter

**File:** `/apps/server/src/app/routes/summary/index.ts` (line ~131-144)

From:
```typescript
const rawResults = await prisma.$queryRaw<RawRiskGroupResult[]>`
  SELECT
    rg.id as riskGroupId,
    rg.name as riskGroupName,
    SUM(t.buy * t.quantity) as totalCostBasis,
    COUNT(t.id) as tradeCount
  FROM trades t
  JOIN universe u ON t."universeId" = u.id
  JOIN risk_group rg ON u.risk_group_id = rg.id
  WHERE (t.sell_date IS NULL OR
        (t.sell_date >= ${new Date(year, monthNum - 1, 1)} AND
          t.sell_date < ${new Date(year, monthNum, 0)}))
  GROUP BY rg.id, rg.name
`;
```

To:
```typescript
const rawResults = await prisma.$queryRaw<RawRiskGroupResult[]>`
  SELECT
    rg.id as riskGroupId,
    rg.name as riskGroupName,
    SUM(t.buy * t.quantity) as totalCostBasis,
    COUNT(t.id) as tradeCount
  FROM trades t
  JOIN universe u ON t."universeId" = u.id
  JOIN risk_group rg ON u.risk_group_id = rg.id
  WHERE (t.sell_date IS NULL OR
        (t.sell_date >= ${new Date(year, monthNum - 1, 1)} AND
          t.sell_date < ${new Date(year, monthNum, 0)}))
    ${accountId ? Prisma.sql`AND t."accountId" = ${accountId}` : Prisma.empty}
  GROUP BY rg.id, rg.name
`;
```

### Change 4: Update function call

**File:** `/apps/server/src/app/routes/summary/index.ts` (line ~300)

From:
```typescript
const result = await getRiskGroupData(year, monthNum);
```

To:
```typescript
const result = await getRiskGroupData(year, monthNum, account_id);
```

## Dependencies

- Existing `/apps/server/src/app/routes/summary/index.ts` file
- Prisma client and `Prisma.sql` for parameterized queries
- Understanding of existing `calculateSummaryData()` pattern for reference

## Estimated Effort

1-2 hours
