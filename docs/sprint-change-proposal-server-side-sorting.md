# Sprint Change Proposal: Server-Side Sorting for Lazy Loading Tables

## Document Information

**Date**: 2025-10-12
**Author**: Product Management (John)
**Status**: Proposed
**Affected Epics**: U, V, W, X
**Affected Stories**: U.1, V.1, W.1, X.1

## Executive Summary

This proposal addresses a critical gap identified in Epics U, V, W, and X (Lazy Loading for Tables). The original stories focused on implementing PrimeNG lazy loading with virtual scrolling but **failed to account for the requirement that sorting must move from client-side to server-side** when implementing lazy loading with SmartNgRX Signals.

**Impact**: MEDIUM-HIGH complexity increase across all 4 stories
**Timeline Impact**: +2-3 days per story for backend API changes
**Risk**: MEDIUM - Hybrid sorting patterns add complexity

## Problem Statement

### Original Oversight

The lazy loading epics and stories were created with the assumption that:

- Client-side sorting would continue to work with lazy-loaded data
- Only the visible rows would be sliced from the full sorted dataset

### Why This Won't Work

With SmartNgRX Signals and lazy loading:

1. The frontend only loads a subset of entity IDs from the backend
2. **Cannot sort all data client-side** because we don't have all records in memory
3. **Sorting must happen on the server** before returning the list of IDs to display
4. Calculated fields (e.g., yield_percent, unrealizedGain) still require client-side sorting

### Current State

All 4 components currently sort data **client-side** in computed signals:

- **Epic U**: Dividend Deposits - sort by `date` (descending)
- **Epic V**: Open Positions - sort by `buyDate`, `unrealizedGainPercent`, `unrealizedGain`
- **Epic W**: Sold Positions - sort by `sellDate`, `buyDate` + capital gains calculations
- **Epic X**: Global Universe - sort by 5 columns (yield_percent, avg_purchase_yield_percent, ex_date, most_recent_sell_date, most_recent_sell_price)

## Proposed Solution

### High-Level Approach

Implement a **hybrid sorting strategy** where:

- **Server-side sorting**: For database fields (dates, prices, distribution values)
- **Client-side sorting**: For calculated fields (yield_percent, unrealizedGain, capital gains)

### Backend API Changes

#### 1. Update Request Signature (All Endpoints)

**Current Pattern**:

```typescript
POST /api/{endpoint}
Body: string[]  // Array of IDs
Reply: Entity[]
```

**New Pattern (Backward Compatible)**:

```typescript
POST /api/{endpoint}
Body: string[] | QueryParams  // Accept both old and new formats
Reply: Entity[]

interface QueryParams {
  ids: string[];
  sortField?: string;
  sortOrder?: 1 | -1;  // 1 = asc, -1 = desc
  filters?: {
    // Endpoint-specific filters
  };
}
```

#### 2. Prisma OrderBy Implementation

```typescript
const orderBy = sortField ? {
  [sortField]: sortOrder === -1 ? 'desc' : 'asc'
} : undefined;

const results = await prisma.{entity}.findMany({
  where: whereClause,
  orderBy,
});
```

#### 3. Database Indexes

Add indexes for all sortable fields:

**Div Deposits**:

```sql
CREATE INDEX idx_div_deposits_date ON div_deposits(date DESC);
CREATE INDEX idx_div_deposits_account_date ON div_deposits(account_id, date DESC);
```

**Trades**:

```sql
CREATE INDEX idx_trades_buy_date ON trades(buy_date DESC);
CREATE INDEX idx_trades_sell_date ON trades(sell_date DESC);
CREATE INDEX idx_trades_account_buy ON trades(account_id, buy_date DESC);
CREATE INDEX idx_trades_account_sell ON trades(account_id, sell_date DESC);
```

**Universe**:

```sql
CREATE INDEX idx_universe_ex_date ON universe(ex_date DESC);
CREATE INDEX idx_universe_sell_date ON universe(most_recent_sell_date DESC);
CREATE INDEX idx_universe_distribution ON universe(distribution DESC);
CREATE INDEX idx_universe_symbol ON universe(symbol);
CREATE INDEX idx_universe_expired ON universe(expired);
```

### Frontend Changes

#### 1. Update EffectsService Classes

```typescript
// Example: DivDepositEffectsService
@Injectable()
export class DivDepositEffectsService extends EffectService<DivDeposit> {
  private http = inject(HttpClient);
  private sortParams = signal<SortParams | undefined>(undefined);
  private accountId = inject(currentAccountId); // From context

  setSortParams(params: SortParams): void {
    this.sortParams.set(params);
  }

  override loadByIds = (ids: string[]): Observable<DivDeposit[]> => {
    const params = this.sortParams();

    return this.http.post<DivDeposit[]>('/api/div-deposits', {
      ids,
      sortField: params?.sortField,
      sortOrder: params?.sortOrder,
      accountId: this.accountId(),
    });
  };
}
```

#### 2. Update Component onLazyLoad Handlers

```typescript
export class DividendDepositsComponent {
  private effectsService = inject(DivDepositEffectsService);

  onLazyLoad(event: LazyLoadEvent): void {
    // Update sort params in effects service BEFORE triggering reload
    this.effectsService.setSortParams({
      sortField: event.sortField,
      sortOrder: event.sortOrder,
    });

    // Update lazy load params triggers reload
    this.lazyLoadParams.set({
      first: event.first || 0,
      rows: event.rows || 10,
      sortField: event.sortField,
      sortOrder: event.sortOrder,
    });
  }
}
```

#### 3. Update Computed Signals

```typescript
// Remove client-side sorting for server-sorted fields
// Keep client-side sorting for calculated fields

positions$ = computed(() => {
  const params = this.lazyLoadParams();
  const rawPositions = this.service.selectPositions();

  // Data already sorted by server for buyDate
  // Apply client-side sorting ONLY for calculated fields like unrealizedGain
  let results = rawPositions;

  if (params.sortField === 'unrealizedGainPercent') {
    // Client-side sort for calculated field
    results = [...results].sort((a, b) => this.compareCalculatedField(a, b, params.sortOrder));
  }

  // Slice for lazy loading
  return results.slice(params.first, params.first + params.rows);
});
```

## Detailed Changes by Epic

### Epic U: Dividend Deposits (Simplest)

**Complexity**: LOW
**Sortable Fields**: `date` (primary), `amount`
**Approach**: Full server-side sorting

**Backend Changes**:

- Update `/api/div-deposits` endpoint
- Add `sortField` and `sortOrder` params
- Implement Prisma orderBy
- Add database indexes

**Frontend Changes**:

- Update DivDepositEffectsService
- Remove client-side sorting from computed signal
- Update onLazyLoad handler

**Testing Impact**: +1-2 days

---

### Epic V: Open Positions (Moderate)

**Complexity**: MEDIUM
**Sortable Fields**:

- `buyDate` (server-side)
- `unrealizedGainPercent` (client-side - calculated)
- `unrealizedGain` (client-side - calculated)

**Approach**: Hybrid - server sort for buyDate, client sort for calculated gains

**Backend Changes**:

- Update `/api/trades` endpoint
- Add `closed` filter parameter (false for open positions)
- Add `sortField` and `sortOrder` params
- Implement Prisma orderBy for buyDate
- Add database indexes

**Frontend Changes**:

- Update TradeEffectsService
- Update computed signal for hybrid sorting
- Remove client-side sorting for buyDate only
- Keep client-side sorting for unrealizedGain fields
- Update onLazyLoad handler

**Testing Impact**: +2 days (hybrid pattern testing)

---

### Epic W: Sold Positions (Complex)

**Complexity**: MEDIUM-HIGH
**Sortable Fields**:

- `sellDate` (server-side - primary)
- `buyDate` (server-side)
  **Calculations**: Capital gains (client-side after fetch)

**Approach**: Server sorting + client-side capital gains calculations

**Backend Changes**:

- Update `/api/trades` endpoint (same as V)
- Add `closed` filter parameter (true for sold positions)
- Add `sortField` and `sortOrder` params
- Implement Prisma orderBy for sellDate and buyDate
- Add database indexes (shared with Epic V)

**Frontend Changes**:

- Update TradeEffectsService (shared with Epic V)
- Update computed signal to apply capital gains after server-sort
- Remove client-side sorting for date fields
- Keep capital gains calculation logic in computed signal
- Update onLazyLoad handler

**Testing Impact**: +2-3 days (capital gains calculation testing with server-sorted data)

---

### Epic X: Global Universe (Most Complex)

**Complexity**: HIGH
**Filters**:

- **Server-side**: symbol (text search), riskGroupId, expired
- **Client-side**: minYield (calculated), accountId (requires trades join)

**Sortable Fields**:

- **Server-side**: ex_date, most_recent_sell_date, most_recent_sell_price, distribution
- **Client-side**: yield_percent (calculated), avg_purchase_yield_percent (calculated)

**Approach**: Hybrid filtering and sorting - most complex implementation

**Backend Changes**:

- Update `/api/universe` endpoint
- Add filter params: symbol, riskGroupId, expired
- Add sort params: sortField, sortOrder
- Implement Prisma where clauses for filters
- Implement Prisma orderBy for sortable fields
- Add database indexes for filterable and sortable fields

**Frontend Changes**:

- Update UniverseEffectsService
- Update UniverseDataService for hybrid approach
- Update computed signals for server filters (symbol, riskGroup, expired)
- Keep client filters (minYield, accountId)
- Update computed signals for server sorting (ex_date, sell fields, distribution)
- Keep client sorting (yield_percent, avg_purchase_yield_percent)
- Update multiple filter handler functions
- Update onLazyLoad handler

**Testing Impact**: +3-4 days (complex hybrid patterns, 5 filters, 5 sort columns)

---

## Risk Assessment

### Technical Risks

| Risk                                       | Severity | Likelihood | Mitigation                                                    |
| ------------------------------------------ | -------- | ---------- | ------------------------------------------------------------- |
| Database performance degradation           | MEDIUM   | LOW        | Add proper indexes before deployment, monitor with CloudWatch |
| Hybrid sorting logic errors                | HIGH     | MEDIUM     | Comprehensive unit and integration tests for all combinations |
| Backward compatibility breaks              | MEDIUM   | LOW        | Implement dual API signature acceptance (old + new)           |
| Complex filter/sort combinations in Epic X | HIGH     | MEDIUM     | Extensive integration testing, staged rollout                 |
| SmartNgRX integration issues               | MEDIUM   | LOW        | Follow established EffectsService extension patterns          |

### Schedule Risks

| Risk                             | Impact              | Mitigation                                      |
| -------------------------------- | ------------------- | ----------------------------------------------- |
| Underestimated backend API work  | +2-4 days per story | Include backend dev time in estimates           |
| Database index creation delays   | +1 day              | Create indexes in parallel with API development |
| Integration testing complexity   | +1-2 days per story | Automated integration test suite                |
| Epic X hybrid pattern complexity | +2-3 days           | Allocate extra time for most complex story      |

## Timeline Impact

### Original Estimates (Without Server-Side Sorting)

| Story     | Original Estimate | Components                 |
| --------- | ----------------- | -------------------------- |
| U.1       | 2-3 days          | Frontend only              |
| V.1       | 3-4 days          | Frontend + inline editing  |
| W.1       | 3-4 days          | Frontend + capital gains   |
| X.1       | 4-5 days          | Frontend + complex filters |
| **Total** | **12-16 days**    |                            |

### Revised Estimates (With Server-Side Sorting)

| Story     | New Estimate   | Components                              | Delta          |
| --------- | -------------- | --------------------------------------- | -------------- |
| U.1       | 3-4 days       | Backend API + Frontend                  | +1 day         |
| V.1       | 5-6 days       | Backend API + Frontend (hybrid)         | +2 days        |
| W.1       | 5-7 days       | Backend API + Frontend (calculations)   | +2-3 days      |
| X.1       | 7-9 days       | Backend API + Frontend (complex hybrid) | +3-4 days      |
| **Total** | **20-26 days** |                                         | **+8-10 days** |

### Breakdown by Work Type

| Work Type                       | Days per Story (Avg) | Total          |
| ------------------------------- | -------------------- | -------------- |
| Backend API Development         | 1-2 days             | 4-8 days       |
| Database Index Creation         | 0.5 days             | 2 days         |
| Backend Testing                 | 0.5-1 day            | 2-4 days       |
| Frontend EffectsService Updates | 0.5 day              | 2 days         |
| Frontend Component Updates      | 1-3 days             | 4-12 days      |
| Frontend Unit Tests             | 1 day                | 4 days         |
| Integration Testing             | 1-2 days             | 4-8 days       |
| **Total**                       |                      | **22-38 days** |

## Resource Requirements

### Development Team

- **Backend Developer**: 8-12 days total (API updates, indexes, tests)
- **Frontend Developer**: 12-16 days total (EffectsService, components, hybrid logic)
- **QA/Testing**: 4-8 days total (integration tests, regression testing)

### Infrastructure

- **Database**: Temporary downtime for index creation (off-hours deployment)
- **Monitoring**: CloudWatch dashboard updates for query performance
- **Documentation**: API documentation updates (OpenAPI/Swagger)

## Testing Strategy

### Backend Testing

1. **Unit Tests**:

   - Sort parameter validation
   - Prisma orderBy clause generation
   - Filter parameter handling
   - Backward compatibility (old string[] format)

2. **Integration Tests**:

   - Sort order verification (ascending/descending)
   - Multi-field sorting combinations
   - Filter + sort combinations
   - Large dataset handling (1000+ records)

3. **Performance Tests**:
   - Query performance with indexes
   - Concurrent request handling
   - Response time benchmarks

### Frontend Testing

1. **Unit Tests**:

   - EffectsService sort param passing
   - Computed signal reactivity
   - Hybrid sorting logic (server + client)
   - LazyLoadEvent handling

2. **Integration Tests**:

   - End-to-end sorting flow
   - PrimeNG table integration
   - SmartNgRX state updates
   - Lazy loading pagination with sorting

3. **User Acceptance Testing**:
   - All sort columns functional
   - Sort direction toggle
   - Sort with filtering
   - Inline editing with sorted data

## Deployment Strategy

### Phase 1: Backend Preparation (Day 0-2)

1. Create database indexes (off-hours)
2. Deploy backend API updates with backward compatibility
3. Verify old API format still works
4. Monitor database performance

### Phase 2: Frontend Rollout (Staged by Epic)

**Week 1**: Epic U (Simplest)

- Deploy DivDepositEffectsService updates
- Deploy component updates
- Monitor for issues
- Rollback plan ready

**Week 2**: Epics V & W (Moderate complexity)

- Deploy TradeEffectsService updates (shared)
- Deploy Open Positions component updates (Epic V)
- Deploy Sold Positions component updates (Epic W)
- Monitor hybrid sorting patterns
- Rollback plan ready

**Week 3**: Epic X (Most complex)

- Deploy UniverseEffectsService updates
- Deploy UniverseDataService updates
- Deploy Global Universe component updates
- Monitor complex hybrid patterns
- Rollback plan ready

### Phase 3: Validation (Week 4)

- Performance benchmarking
- User feedback collection
- Bug fixes and optimization
- Documentation updates

## Rollback Plan

### Backend Rollback

**Option 1**: API accepts new params but ignores them

```typescript
// Backward-compatible no-op
if (typeof body === 'object' && 'sortField' in body) {
  // Ignore sort params, return unsorted
  const { ids } = body;
  return prisma.entity.findMany({ where: { id: { in: ids } } });
}
```

**Option 2**: Full API revert via deployment

### Frontend Rollback

**Option 1**: Revert EffectsService changes only

- Restore client-side sorting in computed signals
- Remove sort param passing

**Option 2**: Full component revert via Git

### Database Rollback

Drop indexes if performance issues occur (unlikely):

```sql
DROP INDEX IF EXISTS idx_div_deposits_date;
DROP INDEX IF EXISTS idx_trades_buy_date;
-- etc.
```

## Success Criteria

### Performance Metrics

- [ ] Lazy loading renders in < 100ms
- [ ] Sort operation completes in < 200ms
- [ ] Database query performance < 50ms (with indexes)
- [ ] No increase in memory usage on frontend
- [ ] Backend API response time < 100ms (p95)

### Functional Criteria

- [ ] All sortable columns functional
- [ ] Hybrid sorting patterns work correctly
- [ ] Backward compatibility maintained
- [ ] All filters work with sorting
- [ ] Inline editing preserved
- [ ] Capital gains calculations accurate (Epic W)
- [ ] Complex filter/sort combinations work (Epic X)

### Quality Criteria

- [ ] 100% backend unit test coverage for new code
- [ ] 90%+ frontend unit test coverage
- [ ] Integration tests passing
- [ ] No critical bugs in production
- [ ] Performance SLAs met

## Change Impact Summary

### Architecture Changes

✅ **Created**: `/docs/architecture/server-side-sorting-api-design.md`

- Complete API specification
- SmartNgRX integration patterns
- Database schema requirements

### Epic Changes

✅ **Updated**: All 4 epics (U, V, W, X)

- Added server-side sorting requirements
- Updated compatibility requirements
- Enhanced risk mitigation strategies
- Expanded Definition of Done criteria

### Story Changes

⏳ **Pending**: All 4 stories (U.1, V.1, W.1, X.1)

- Add backend API change tasks
- Add database index tasks
- Update frontend tasks for EffectsService integration
- Add integration testing tasks
- Update testing requirements

## Recommendation

**PROCEED with the proposed changes** with the following conditions:

1. **Allocate additional 8-10 days** to the sprint timeline
2. **Stage rollout** by epic complexity (U → V/W → X)
3. **Create database indexes** before code deployment
4. **Implement backward-compatible APIs** first
5. **Monitor performance closely** during rollout
6. **Maintain rollback readiness** throughout deployment

The server-side sorting requirement is **critical for lazy loading to function correctly** with SmartNgRX Signals. Without this change, the lazy loading implementation will fail to properly sort data when only a subset of records is loaded.

## Next Steps

1. ✅ Architecture document created
2. ✅ Epics U, V, W, X updated
3. ⏳ Update Stories U.1, V.1, W.1, X.1 with detailed implementation tasks
4. ⏳ Obtain stakeholder approval for timeline extension
5. ⏳ Assign backend developer resources
6. ⏳ Create database migration scripts for indexes
7. ⏳ Update sprint planning with revised estimates

## Approval

**Product Owner**: **\*\*\*\***\_\_\_**\*\*\*\*** Date: \***\*\_\_\*\***
**Tech Lead**: \***\*\*\*\*\***\_\***\*\*\*\*\*** Date: \***\*\_\_\*\***
**Scrum Master**: **\*\*\*\***\_\_**\*\*\*\*** Date: \***\*\_\_\*\***

---

**Document Version**: 1.0
**Last Updated**: 2025-10-12
**Author**: Product Management (John)
