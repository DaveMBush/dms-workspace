# Story Update Summary: Server-Side Sorting Requirements

## Document Information

**Date**: 2025-10-12
**Author**: Product Management (John)
**Status**: Implementation Guide
**Related Stories**: V.1, W.1, X.1

## Purpose

This document provides a comprehensive guide for updating Stories V.1, W.1, and X.1 with server-side sorting requirements. Story U.1 has been fully updated and serves as the template pattern.

## Common Update Pattern

All stories follow this pattern (already implemented in U.1):

### 1. Update Acceptance Criteria

**Add these sections**:
1. **Backend API Changes:**
   - Update endpoint to accept query params object (backward compatible)
   - Implement server-side sorting with Prisma orderBy
   - Add database indexes
   - Write backend tests

2. **Frontend Changes:**
   - Lazy loading attributes
   - Create/Update EffectsService
   - Update computed signals
   - onLazyLoad handler

3. **Testing:**
   - Backend tests
   - Frontend tests
   - Integration tests

### 2. Expand Tasks / Subtasks

**Add these task groups**:
- Task 1: Update Backend API Endpoint
- Task 2: Create Database Indexes
- Task 3: Write Backend Tests
- Task 4: Create/Update EffectsService
- Task 5-11: Frontend implementation, testing, quality gates

### 3. Add Dev Notes Section

**Add**:
- Server-Side Sorting Architecture explanation
- Backend API implementation example
- Frontend EffectsService implementation example
- Frontend Component implementation example

### 4. Update Change Log

Add entry: "2.0 | Added server-side sorting requirements | Product Management (John)"

---

## Story V.1: Open Positions - Specific Changes

### Complexity: MEDIUM (Hybrid Sorting)

**Key Differences from U.1:**
- **Hybrid sorting approach**: Server for `buyDate`, client for `unrealizedGain` (calculated)
- Uses **TradeEffectsService** (shared with W.1)
- Closed filter parameter: `false` (open positions)
- More complex inline editing and validation

### Acceptance Criteria Additions

```markdown
1. **Backend API Changes:**
   - Update `/api/trades` endpoint to accept query params object
   - Add `closed` filter parameter (false for open positions)
   - Implement server-side sorting for buyDate field only
   - Add database indexes for buy_date and sell_date
   - Write backend tests for trades API with closed filter

2. **Frontend Changes:**
   - Create/update TradeEffectsService with sort params
   - Implement HYBRID sorting: server for buyDate, client for unrealizedGain
   - Update computed signal to handle both server and client sorting
   - Preserve inline editing and date validation
   - BasePositionsComponent integration maintained

3. **Testing:**
   - Test hybrid sorting pattern (server + client)
   - Test buyDate server sorting
   - Test unrealizedGain client sorting
   - Test inline editing with server-sorted data
```

### Task Updates

**Task 1: Update Backend API Endpoint**
- Update `/api/trades` endpoint
- Add `closed?: boolean` parameter
- For open positions: `closed: false` or `sell_date: null`

**Task 4: Create/Update TradeEffectsService**
- Check if TradeEffectsService exists
- Add `closed: false` to API call for open positions
- Shared with W.1 (sold positions uses `closed: true`)

**Task 7: Update computed signal - HYBRID APPROACH**
```typescript
positions$ = computed(() => {
  const params = this.lazyLoadParams();
  const rawPositions = this.service.selectOpenPositions();

  // Data is ALREADY SORTED by server for buyDate
  // Apply CLIENT-SIDE sort ONLY for calculated fields
  let results = rawPositions;

  if (params.sortField === 'unrealizedGainPercent' ||
      params.sortField === 'unrealizedGain') {
    // Client-side sort for calculated field
    results = [...results].sort((a, b) =>
      this.compareCalculatedField(a, b, params.sortField, params.sortOrder)
    );
  }

  // Slice for lazy loading
  return results.slice(params.first, params.first + params.rows);
});
```

### Dev Notes Additions

**Hybrid Sorting Strategy:**
- Server sorts: `buyDate` (database field)
- Client sorts: `unrealizedGainPercent`, `unrealizedGain` (calculated fields)
- Why: Calculated fields require all position data + current prices

**Backend Implementation:**
```typescript
interface TradeQueryParams {
  ids: string[];
  sortField?: string;
  sortOrder?: 1 | -1;
  accountId?: string;
  closed?: boolean;  // false for open, true for sold
}

// In handleGetTradesRoute
const whereClause: any = {
  id: { in: ids },
  ...(accountId && { accountId }),
  ...(closed !== undefined && {
    sell_date: closed ? { not: null } : null
  })
};
```

---

## Story W.1: Sold Positions - Specific Changes

### Complexity: MEDIUM-HIGH (Server Sorting + Client Calculations)

**Key Differences from U.1:**
- Uses **TradeEffectsService** (shared with V.1)
- Closed filter parameter: `true` (sold positions)
- **Capital gains calculations** happen client-side AFTER server sort
- Server sorts: `sellDate` (primary), `buyDate`
- Client calculates: `capitalGain`, `capitalGainPercentage`

### Acceptance Criteria Additions

```markdown
1. **Backend API Changes:**
   - Update `/api/trades` endpoint (shared with V.1)
   - Add `closed` filter parameter (true for sold positions)
   - Implement server-side sorting for sellDate and buyDate
   - Database indexes shared with V.1

2. **Frontend Changes:**
   - Use TradeEffectsService (shared with V.1)
   - Server sorts data by sellDate/buyDate
   - Client applies capital gains calculations AFTER server sort
   - Preserve inline editing and date validation
   - BasePositionsComponent integration maintained

3. **Testing:**
   - Test server-side sorting for sellDate
   - Test capital gains calculations on server-sorted data
   - Test calculations recalculate on value changes
   - Test inline editing preserves sort order
```

### Task Updates

**Task 1: Update Backend API Endpoint**
- Same as V.1 (shared `/api/trades` endpoint)
- Sortable fields: `sell_date`, `buy_date`

**Task 4: Use TradeEffectsService**
- Same service as V.1
- Add `closed: true` to API call for sold positions

**Task 7: Update computed signal for calculations AFTER server sort**
```typescript
positions$ = computed(() => {
  const params = this.lazyLoadParams();
  const rawPositions = this.service.selectClosedPositions();

  // Data is ALREADY SORTED by server (sellDate)
  // Apply capital gains calculations to sorted data
  const soldPositions = rawPositions.map(pos => {
    const capitalGains = calculateCapitalGains({
      buy: pos.buy,
      sell: pos.sell,
      quantity: pos.quantity,
    });

    return {
      ...pos,
      capitalGain: capitalGains.capitalGain,
      capitalGainPercentage: capitalGains.capitalGainPercentage,
    } as SoldPosition;
  });

  // Slice for lazy loading (already sorted by server)
  return soldPositions.slice(params.first, params.first + params.rows);
});
```

### Dev Notes Additions

**Server Sorting + Client Calculations Pattern:**
1. Server sorts trades by `sellDate` or `buyDate`
2. Frontend receives sorted trade entities
3. Client applies `calculateCapitalGains()` function to each row
4. Client slices for lazy loading pagination
5. Capital gains recalculate when values change (reactive)

**Capital Gains Calculator (Preserved):**
```typescript
export function calculateCapitalGains(params: {
  buy: number;
  sell: number;
  quantity: number;
}): { capitalGain: number; capitalGainPercentage: number } {
  const { buy, sell, quantity } = params;
  const capitalGain = (sell - buy) * quantity;
  const capitalGainPercentage = buy === 0 ? 0 : ((sell - buy) / buy) * 100;
  return { capitalGain, capitalGainPercentage };
}
```

---

## Story X.1: Global Universe - Specific Changes

### Complexity: HIGH (Hybrid Filtering + Hybrid Sorting)

**Key Differences from U.1:**
- **Most complex**: 5 filters + 5 sortable columns
- **Hybrid filtering**: 3 server-side, 2 client-side
- **Hybrid sorting**: 3 server-side, 2 client-side
- Uses **UniverseEffectsService** and **UniverseDataService**
- Multiple handler services for filters and sorting

### Acceptance Criteria Additions

```markdown
1. **Backend API Changes:**
   - Update `/api/universe` endpoint with filters and sort params
   - Implement server-side filtering: symbol, riskGroupId, expired
   - Implement server-side sorting: ex_date, most_recent_sell_date, most_recent_sell_price, distribution
   - Add database indexes for filterable and sortable fields
   - Write backend tests for complex filter/sort combinations

2. **Frontend Changes:**
   - Update UniverseEffectsService with filter and sort params
   - Update UniverseDataService for hybrid approach
   - Server filters: symbol, riskGroup, expired
   - Client filters: minYield (calculated), accountId (requires joins)
   - Server sorting: ex_date, sell fields, distribution
   - Client sorting: yield_percent, avg_purchase_yield_percent (calculated)
   - Preserve inline editing and row dimming logic

3. **Testing:**
   - Test hybrid filtering (3 server + 2 client)
   - Test hybrid sorting (3 server + 2 client)
   - Test all 25 filter/sort combinations
   - Test inline editing with complex filters
```

### Task Updates

**Task 1: Update Backend API Endpoint**
```typescript
interface UniverseQueryParams {
  ids: string[];
  sortField?: string;
  sortOrder?: 1 | -1;
  filters?: {
    symbol?: string;          // Server-side (text search)
    riskGroupId?: string;     // Server-side
    expired?: boolean;        // Server-side
    // minYield and accountId handled client-side
  };
}
```

**Task 4: Update UniverseEffectsService**
- Pass both filter and sort params
- Server handles: symbol, riskGroupId, expired filters
- Client handles: minYield, accountId filters

**Task 5: Update UniverseDataService**
- New method: `filterAndSortHybrid()`
- Apply server filters first
- Then client filters (minYield, accountId)
- Apply server sorting
- Then client sorting (yield_percent fields)

**Task 7: Update computed signal - COMPLEX HYBRID**
```typescript
universe$ = computed(() => {
  const params = this.lazyLoadParams();
  const rawUniverses = this.service.selectUniverses();

  // Step 1: Server has already filtered (symbol, riskGroup, expired)
  // Step 2: Server has already sorted (ex_date, sell fields, distribution)

  // Step 3: Apply CLIENT-SIDE filters
  let filtered = rawUniverses;

  if (this.minYieldFilter()) {
    filtered = filtered.filter(u =>
      this.calculateYieldPercent(u) >= this.minYieldFilter()
    );
  }

  if (this.accountIdFilter()) {
    filtered = filtered.filter(u =>
      this.hasTradesForAccount(u, this.accountIdFilter())
    );
  }

  // Step 4: Apply CLIENT-SIDE sorting for calculated fields
  if (params.sortField === 'yield_percent' ||
      params.sortField === 'avg_purchase_yield_percent') {
    filtered = [...filtered].sort((a, b) =>
      this.compareCalculatedYields(a, b, params.sortField, params.sortOrder)
    );
  }

  // Step 5: Slice for lazy loading
  return filtered.slice(params.first, params.first + params.rows);
});
```

### Dev Notes Additions

**Complex Hybrid Pattern:**

**Server-Side Operations:**
- **Filters**: symbol (LIKE/ILIKE), riskGroupId (=), expired (boolean)
- **Sorting**: ex_date, most_recent_sell_date, most_recent_sell_price, distribution

**Client-Side Operations:**
- **Filters**: minYield (calculated), accountId (requires trades join)
- **Sorting**: yield_percent, avg_purchase_yield_percent (both calculated)

**Why Hybrid Approach:**
- `minYield` requires calculation: `(distribution * distributions_per_year) / last_price * 100`
- `accountId` filter requires checking if universe has trades for specific account
- `yield_percent` fields are calculated from multiple database fields
- Server can't efficiently calculate these without complex queries

**Backend Implementation:**
```typescript
const whereClause: any = {
  id: { in: ids },
  ...(filters?.symbol && {
    symbol: { contains: filters.symbol, mode: 'insensitive' }
  }),
  ...(filters?.riskGroupId && { risk_group_id: filters.riskGroupId }),
  ...(filters?.expired !== undefined && { expired: filters.expired })
};

const orderBy = sortField ? {
  [sortField]: sortOrder === -1 ? 'desc' : 'asc'
} : undefined;

const universes = await prisma.universe.findMany({
  where: whereClause,
  include: {
    risk_group: true,
    trades: { where: { sell_date: null } }
  },
  orderBy,
});
```

---

## Implementation Order Recommendation

Based on complexity and dependencies:

1. ✅ **Story U.1** - COMPLETED
   - Simplest pattern
   - Full server-side sorting
   - No dependencies

2. **Story V.1** - Next (2-3 days)
   - Moderate complexity
   - Hybrid sorting (template for W.1)
   - Creates TradeEffectsService (shared with W.1)

3. **Story W.1** - After V.1 (2-3 days)
   - Uses TradeEffectsService from V.1
   - Server sort + client calculations
   - Validates capital gains pattern

4. **Story X.1** - Last (3-4 days)
   - Most complex
   - Validates hybrid filtering + sorting
   - UniverseDataService requires most changes

---

## Quality Checklist

For each story update, verify:

- [ ] Acceptance Criteria expanded with backend/frontend/testing sections
- [ ] Tasks expanded to 10-11 tasks (backend, indexes, tests, frontend, quality gates)
- [ ] Dev Notes include:
  - [ ] Server-Side Sorting Architecture section
  - [ ] Backend API implementation example
  - [ ] Frontend EffectsService implementation example
  - [ ] Frontend Component implementation example (with hybrid notes if applicable)
- [ ] Change Log updated with v2.0 entry
- [ ] References to `/docs/architecture/server-side-sorting-api-design.md` added
- [ ] Hybrid patterns clearly documented (V.1, W.1, X.1)

---

## References

- **Architecture Document**: `/docs/architecture/server-side-sorting-api-design.md`
- **Sprint Change Proposal**: `/docs/sprint-change-proposal-server-side-sorting.md`
- **Template Story**: `/docs/stories/U.1.dividend-deposits-lazy-loading.md` (v2.0)
- **Epic Updates**:
  - `/docs/prd/epic-U-lazy-loading-dividend-deposits.md`
  - `/docs/prd/epic-V-lazy-loading-open-positions.md`
  - `/docs/prd/epic-W-lazy-loading-sold-positions.md`
  - `/docs/prd/epic-X-lazy-loading-global-universe.md`

---

**Document Version**: 1.0
**Last Updated**: 2025-10-12
**Author**: Product Management (John)
