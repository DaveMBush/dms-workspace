# Server-Side Sorting API Design for Lazy Loading Tables

## Document Information

**Status**: Draft
**Date**: 2025-10-12
**Author**: Product Management
**Related Epics**: U, V, W, X (Lazy Loading Table Enhancements)

## Overview

This document specifies the backend API changes required to support server-side sorting for lazy loading tables. The lazy loading pattern requires retrieving sorted entity IDs from the backend, which the SmartNgRX Signals layer then uses to fetch the full entity data.

## Current Architecture Pattern

### Current Implementation (Client-Side Sorting)

```typescript
// Frontend: Component computes signal with client-side sorting
positions$ = computed(() => {
  const rawPositions = this.service.selectOpenPositions();
  const sortField = this.getSortField();
  const sortOrder = this.getSortOrder();

  // Client sorts ALL data
  let sorted = [...rawPositions].sort((a, b) =>
    this.comparePositions(a, b, sortField, sortOrder)
  );

  // Then slice for lazy loading
  return sorted.slice(params.first, params.first + params.rows);
});
```

**Current Backend API Pattern**:
```typescript
// Backend: POST /api/trades (receives IDs, returns entities)
fastify.post<{ Body: string[]; Reply: Trade[] }>(
  '/',
  async function handleGetTrades(request, _): Promise<Trade[]> {
    const ids = request.body;
    const trades = await prisma.trades.findMany({
      where: { id: { in: ids } },
    });
    return trades.map(mapTradeToResponse);
  }
);
```

### Problem Statement

With lazy loading, we cannot sort all data on the client because we only have a subset of entities loaded. The backend must provide **sorted entity IDs** based on sort parameters, which the SmartNgRX layer will use to fetch the appropriate page of data.

## Proposed Architecture Pattern

### New Pattern: Server-Side Sorting with SmartNgRX

```typescript
// Frontend: EffectsService calls backend with sort params
@Injectable()
export class TradeEffectsService extends EffectService<Trade> {
  override loadByIds = (
    ids: string[],
    sortParams?: SortParams
  ): Observable<Trade[]> => {
    // Backend returns sorted IDs, then fetch entities
    return this.http.post<Trade[]>('/api/trades', {
      ids,
      sortField: sortParams?.sortField,
      sortOrder: sortParams?.sortOrder
    });
  };
}
```

## Backend API Changes Required

### 1. Dividend Deposits API (`/api/div-deposits`)

#### Current Signature
```typescript
POST /api/div-deposits
Body: string[]                  // Array of IDs
Reply: DivDeposit[]             // Array of entities
```

#### Proposed Signature
```typescript
POST /api/div-deposits
Body: {
  ids: string[];                // Array of IDs to retrieve
  sortField?: string;           // Field to sort by (e.g., 'date')
  sortOrder?: 1 | -1;          // Sort direction (1 = asc, -1 = desc)
  accountId?: string;           // Filter by account
}
Reply: DivDeposit[]             // Array of sorted entities
```

#### Implementation Pattern
```typescript
interface DivDepositQueryParams {
  ids: string[];
  sortField?: string;
  sortOrder?: 1 | -1;
  accountId?: string;
}

function handleGetDivDepositsRoute(fastify: FastifyInstance): void {
  fastify.post<{ Body: DivDepositQueryParams; Reply: DivDeposit[] }>(
    '/',
    async function handleGetDivDepositsRequest(
      request,
      _
    ): Promise<DivDeposit[]> {
      const { ids, sortField, sortOrder, accountId } = request.body;

      if (ids.length === 0) {
        return [];
      }

      const whereClause: any = {
        id: { in: ids },
        ...(accountId && { accountId })
      };

      // Build orderBy clause based on sort params
      const orderBy = sortField ? {
        [sortField]: sortOrder === -1 ? 'desc' : 'asc'
      } : undefined;

      const divDeposits = await prisma.divDeposits.findMany({
        where: whereClause,
        orderBy,
      });

      return divDeposits.map(mapDivDepositToResponse);
    }
  );
}
```

#### Sort Fields Supported
- `date` (Date) - Primary sort field
- `amount` (number)

### 2. Trades API (`/api/trades`)

#### Current Signature
```typescript
POST /api/trades
Body: string[]                  // Array of IDs
Reply: Trade[]                  // Array of entities
```

#### Proposed Signature
```typescript
POST /api/trades
Body: {
  ids: string[];                // Array of IDs to retrieve
  sortField?: string;           // Field to sort by
  sortOrder?: 1 | -1;          // Sort direction
  accountId?: string;           // Filter by account
  closed?: boolean;             // Filter: true = sold, false = open
}
Reply: Trade[]                  // Array of sorted entities
```

#### Implementation Pattern
```typescript
interface TradeQueryParams {
  ids: string[];
  sortField?: string;
  sortOrder?: 1 | -1;
  accountId?: string;
  closed?: boolean;
}

function handleGetTradesRoute(fastify: FastifyInstance): void {
  fastify.post<{ Body: TradeQueryParams; Reply: Trade[] }>(
    '/',
    async function handleGetTrades(request, _): Promise<Trade[]> {
      const { ids, sortField, sortOrder, accountId, closed } = request.body;

      if (!ids || ids.length === 0) {
        return [];
      }

      const whereClause: any = {
        id: { in: ids },
        ...(accountId && { accountId }),
        ...(closed !== undefined && {
          sell_date: closed ? { not: null } : null
        })
      };

      // Build orderBy clause
      const orderBy = sortField ? {
        [sortField]: sortOrder === -1 ? 'desc' : 'asc'
      } : undefined;

      const trades = await prisma.trades.findMany({
        where: whereClause,
        orderBy,
      });

      return trades.map(mapTradeToResponse);
    }
  );
}
```

#### Sort Fields Supported

**Open Positions (V.1)**:
- `buy_date` (Date)
- `sell` (number) - unrealized gain calculations done client-side

**Sold Positions (W.1)**:
- `sell_date` (Date) - Primary sort field
- `buy_date` (Date)

### 3. Universe API (`/api/universe`)

#### Current Signature
```typescript
POST /api/universe
Body: string[]                  // Array of IDs
Reply: Universe[]               // Array of entities
```

#### Proposed Signature
```typescript
POST /api/universe
Body: {
  ids: string[];                // Array of IDs to retrieve
  sortField?: string;           // Field to sort by
  sortOrder?: 1 | -1;          // Sort direction
  filters?: {
    symbol?: string;            // Symbol text search
    riskGroupId?: string;       // Risk group filter
    minYield?: number;          // Minimum yield percentage
    expired?: boolean;          // Expired filter
    accountId?: string;         // Account filter
  };
}
Reply: Universe[]               // Array of sorted entities
```

#### Implementation Pattern
```typescript
interface UniverseQueryParams {
  ids: string[];
  sortField?: string;
  sortOrder?: 1 | -1;
  filters?: {
    symbol?: string;
    riskGroupId?: string;
    minYield?: number;
    expired?: boolean;
    accountId?: string;
  };
}

function handleGetUniversesRoute(fastify: FastifyInstance): void {
  fastify.post<{ Body: UniverseQueryParams; Reply: Universe[] }>(
    '/',
    async function handleGetUniverses(request, _): Promise<Universe[]> {
      const { ids, sortField, sortOrder, filters } = request.body;

      if (!ids || ids.length === 0) {
        return [];
      }

      // Build where clause with filters
      const whereClause: any = {
        id: { in: ids },
        ...(filters?.symbol && {
          symbol: { contains: filters.symbol, mode: 'insensitive' }
        }),
        ...(filters?.riskGroupId && { risk_group_id: filters.riskGroupId }),
        ...(filters?.expired !== undefined && { expired: filters.expired })
      };

      // Note: minYield filter requires calculation, done client-side
      // Note: accountId filter requires join with trades, done via query

      // Build orderBy clause
      const orderBy = sortField ? {
        [sortField]: sortOrder === -1 ? 'desc' : 'asc'
      } : undefined;

      const universes = await prisma.universe.findMany({
        where: whereClause,
        include: {
          risk_group: true,
          trades: {
            where: { sell_date: null },
          },
        },
        orderBy,
      });

      return universes.map(u => mapUniverseToResponse(u as UniverseWithTrades));
    }
  );
}
```

#### Sort Fields Supported

**Global Universe (X.1)**:
- `distribution` (number) - For yield_percent calculation
- `ex_date` (Date)
- `most_recent_sell_date` (Date)
- `most_recent_sell_price` (number)

**Note**: Calculated fields like `yield_percent` and `avg_purchase_yield_percent` require client-side sorting since they depend on trade data calculations.

## API Design Principles

### 1. Backward Compatibility

**Approach**: Accept both old and new request formats:

```typescript
// Accept string[] OR QueryParams object
type RequestBody = string[] | QueryParams;

async function handleRequest(request, _): Promise<Entity[]> {
  const body = request.body;

  // Backward compatibility: If array, use old behavior
  if (Array.isArray(body)) {
    const ids = body;
    return prisma.entities.findMany({ where: { id: { in: ids } } });
  }

  // New behavior: Extract params
  const { ids, sortField, sortOrder, filters } = body;
  // ... implement sorting
}
```

**Rollout Strategy**: Frontend can adopt new API gradually without breaking existing components.

### 2. Query Parameter Validation

```typescript
const queryParamsSchema = {
  type: 'object',
  properties: {
    ids: {
      type: 'array',
      items: { type: 'string' },
      minItems: 0,
    },
    sortField: {
      type: 'string',
      enum: ['date', 'amount', 'buy_date', 'sell_date'] // Per endpoint
    },
    sortOrder: {
      type: 'number',
      enum: [1, -1]
    },
  },
  required: ['ids'],
};
```

### 3. Performance Considerations

- **Indexing**: Ensure all sortable fields have database indexes
- **Query Limits**: Add pagination limits to prevent large result sets
- **Caching**: Consider response caching for common sort combinations

### 4. Error Handling

```typescript
// Invalid sort field
if (sortField && !VALID_SORT_FIELDS.includes(sortField)) {
  reply.status(400).send({
    error: 'Invalid sort field',
    validFields: VALID_SORT_FIELDS
  });
  return;
}
```

## SmartNgRX Integration Pattern

### Frontend Implementation

```typescript
// 1. Update EffectService to include sort params
export interface SortParams {
  sortField?: string;
  sortOrder?: 1 | -1;
}

@Injectable()
export class TradeEffectsService extends EffectService<Trade> {
  private http = inject(HttpClient);
  private sortParams = signal<SortParams | undefined>(undefined);

  // Method to update sort parameters
  setSortParams(params: SortParams): void {
    this.sortParams.set(params);
  }

  override loadByIds = (ids: string[]): Observable<Trade[]> => {
    const params = this.sortParams();

    return this.http.post<Trade[]>('/api/trades', {
      ids,
      sortField: params?.sortField,
      sortOrder: params?.sortOrder,
      accountId: this.currentAccountId(),
      closed: false // For open positions
    });
  };
}

// 2. Component calls setSortParams before triggering load
export class OpenPositionsComponent {
  private effectsService = inject(TradeEffectsService);

  onLazyLoad(event: LazyLoadEvent): void {
    // Update sort params in effects service
    this.effectsService.setSortParams({
      sortField: event.sortField,
      sortOrder: event.sortOrder
    });

    // Update lazy load params triggers reload via computed signal
    this.lazyLoadParams.set({
      first: event.first || 0,
      rows: event.rows || 10,
      sortField: event.sortField,
      sortOrder: event.sortOrder
    });
  }
}
```

## Database Schema Requirements

### Recommended Indexes

```sql
-- Dividend Deposits
CREATE INDEX idx_div_deposits_date ON div_deposits(date DESC);
CREATE INDEX idx_div_deposits_account_date ON div_deposits(account_id, date DESC);

-- Trades
CREATE INDEX idx_trades_buy_date ON trades(buy_date DESC);
CREATE INDEX idx_trades_sell_date ON trades(sell_date DESC);
CREATE INDEX idx_trades_account_buy ON trades(account_id, buy_date DESC);
CREATE INDEX idx_trades_account_sell ON trades(account_id, sell_date DESC);

-- Universe
CREATE INDEX idx_universe_ex_date ON universe(ex_date DESC);
CREATE INDEX idx_universe_sell_date ON universe(most_recent_sell_date DESC);
CREATE INDEX idx_universe_distribution ON universe(distribution DESC);
```

## Testing Requirements

### Backend API Tests

1. **Sort Parameter Validation**
   - Valid sort fields accepted
   - Invalid sort fields rejected with 400
   - Missing sort params default to no ordering

2. **Sort Order Verification**
   - Ascending sort returns correct order
   - Descending sort returns correct order
   - Multi-record datasets sorted correctly

3. **Filter + Sort Combinations**
   - Symbol filter with date sort
   - Account filter with amount sort
   - Multiple filters with sort

4. **Backward Compatibility**
   - Old API format (string[]) still works
   - New API format works correctly
   - Both return same data structure

5. **Performance Tests**
   - Query performance with indexes
   - Large dataset handling (1000+ records)
   - Concurrent request handling

### Integration Tests

1. **SmartNgRX Integration**
   - EffectService calls API with sort params
   - Computed signals react to sort changes
   - Lazy loading triggers correct API calls

2. **End-to-End Sorting**
   - User clicks sort column
   - Backend sorts correctly
   - Frontend displays sorted data
   - Pagination maintains sort order

## Migration Strategy

### Phase 1: Backend API Updates (Stories U.1-X.1)

1. Update API endpoint handlers to accept new params
2. Implement backward compatibility
3. Add database indexes
4. Write backend tests

### Phase 2: Frontend Integration (Stories U.1-X.1)

1. Update EffectService implementations
2. Modify component onLazyLoad handlers
3. Update computed signals to use backend sorting
4. Remove client-side sorting logic

### Phase 3: Validation & Optimization (All Stories)

1. Integration testing
2. Performance testing
3. Load testing
4. Query optimization

## Rollback Plan

If server-side sorting introduces issues:

1. **Frontend Rollback**: Revert EffectService changes, restore client-side sorting
2. **Backend Rollback**: API accepts new params but ignores them, returns unsorted
3. **Full Rollback**: Git revert both frontend and backend changes

**Note**: Backward-compatible API design allows partial rollback of frontend without breaking backend.

## Performance Impact Assessment

### Expected Improvements

- **Client-Side**: Reduced JavaScript computation for large datasets
- **Memory Usage**: Lower frontend memory consumption (no sorting all data)
- **Network**: No change (same entity payload size)
- **Database**: Optimized with proper indexes, should be faster than client sorting

### Potential Concerns

- **Database Load**: Increased query complexity with ORDER BY clauses
- **Network Latency**: Slight increase in request payload size
- **Caching**: Backend responses harder to cache with variable sort params

### Mitigation Strategies

- Add comprehensive database indexes for all sort fields
- Implement query result caching for common sort combinations
- Monitor database query performance with CloudWatch
- Add database connection pooling if needed

## Change Log

| Date       | Version | Description                          | Author             |
| ---------- | ------- | ------------------------------------ | ------------------ |
| 2025-10-12 | 1.0     | Initial server-side sorting API spec | Product Management |

## References

- Epic U: Lazy Loading Dividend Deposits
- Epic V: Lazy Loading Open Positions
- Epic W: Lazy Loading Sold Positions
- Epic X: Lazy Loading Global Universe
- Architecture README: `/docs/architecture/README.md`
- SmartNgRX Reference: `/docs/SmartNgRX-Signals-Reference.md`
