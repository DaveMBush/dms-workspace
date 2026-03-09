# Story AW.4: Create Separate openTrades and closedTrades Endpoints with Server-Side Sorting - TDD GREEN Phase

## Story

**As a** user
**I want** separate endpoints for open and closed trades with server-side sorting
**So that** trade data loads faster and is pre-filtered for my needs

## Context

**Current System:**

- Mixed trades endpoint with client-side filtering
- Unit tests written in Story AW.3 (currently disabled)

**Implementation Approach:**

- Re-enable unit tests from AW.3
- Create /api/trades/open endpoint with sorting
- Create /api/trades/closed endpoint with sorting
- Make all tests pass (GREEN phase)

## Acceptance Criteria

### Functional Requirements

- [ ] Create /api/trades/open endpoint
  - [ ] Returns only open trades
  - [ ] Supports sorting by: symbol, openDate, currentValue, unrealizedGain
  - [ ] Supports ascending and descending order
- [ ] Create /api/trades/closed endpoint
  - [ ] Returns only closed trades
  - [ ] Supports sorting by: symbol, closeDate, profit, percentGain
  - [ ] Supports ascending and descending order
- [ ] Invalid fields handled gracefully
- [ ] All unit tests from AW.3 re-enabled and passing

### Technical Requirements

- [ ] Filtering performed at database level
- [ ] Sorting performed at database level
- [ ] Proper SQL/query builder syntax
- [ ] Performance optimized

## Implementation Details

### Step 1: Re-enable Unit Tests

Remove `.skip` from tests written in AW.3.

### Step 2: Create Open Trades Endpoint

```typescript
router.get('/api/trades/open', async (req, res) => {
  const { sortField = 'symbol', sortOrder = 'asc' } = req.query;

  const validFields = ['symbol', 'openDate', 'currentValue', 'unrealizedGain'];
  const field = validFields.includes(sortField) ? sortField : 'symbol';
  const order = sortOrder === 'desc' ? 'desc' : 'asc';

  const data = await tradesService.getOpenTrades({ sortField: field, sortOrder: order });
  res.json(data);
});
```

### Step 3: Create Closed Trades Endpoint

```typescript
router.get('/api/trades/closed', async (req, res) => {
  const { sortField = 'closeDate', sortOrder = 'desc' } = req.query;

  const validFields = ['symbol', 'closeDate', 'profit', 'percentGain'];
  const field = validFields.includes(sortField) ? sortField : 'closeDate';
  const order = sortOrder === 'desc' ? 'desc' : 'asc';

  const data = await tradesService.getClosedTrades({ sortField: field, sortOrder: order });
  res.json(data);
});
```

### Step 4: Update Service Layer

```typescript
async getOpenTrades({ sortField, sortOrder }) {
  return db
    .select()
    .from(trades)
    .where(eq(trades.closeDate, null))
    .orderBy(sortOrder === 'desc' ? desc(trades[sortField]) : asc(trades[sortField]));
}

async getClosedTrades({ sortField, sortOrder }) {
  return db
    .select()
    .from(trades)
    .where(isNotNull(trades.closeDate))
    .orderBy(sortOrder === 'desc' ? desc(trades[sortField]) : asc(trades[sortField]));
}
```

### Step 5: Verify All Tests Pass

```bash
pnpm test:server
```

## Definition of Done

- [ ] All unit tests from AW.3 re-enabled and passing
- [ ] Both endpoints properly implemented
- [ ] Database-level filtering and sorting
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass
- [ ] Code reviewed and approved

## Notes

- This is the TDD GREEN phase
- All tests from AW.3 should now pass
- Old trades endpoint can remain for backwards compatibility if needed

## Related Stories

- **Previous**: Story AW.3 (TDD Tests)
- **Next**: Story AW.5 (TDD for httpInterceptor)
- **Epic**: Epic AW

---

## Dev Agent Record

### Agent Model Used

### Status

Approved

### Tasks / Subtasks

### File List

### Change Log

### Debug Log References
