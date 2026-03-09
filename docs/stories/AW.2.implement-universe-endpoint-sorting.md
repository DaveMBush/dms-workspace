# Story AW.2: Implement Server-Side Sorting for Universe Endpoint - TDD GREEN Phase

## Story

**As a** user
**I want** the universe data to be sorted on the server
**So that** large datasets load faster with pre-sorted data

## Context

**Current System:**

- Universe endpoint returns unsorted data
- Unit tests written in Story AW.1 (currently disabled)

**Implementation Approach:**

- Re-enable unit tests from AW.1
- Add sort parameter handling to universe endpoint
- Implement database-level sorting
- Make all tests pass (GREEN phase)

## Acceptance Criteria

### Functional Requirements

- [ ] Universe endpoint accepts sort parameters
- [ ] Data sorted by requested field and order
- [ ] Supports sorting by: symbol, name, sector, marketCap
- [ ] Supports ascending and descending order
- [ ] Default sorting applied when no parameter provided
- [ ] Invalid sort fields handled gracefully
- [ ] All unit tests from AW.1 re-enabled and passing

### Technical Requirements

- [ ] Sorting performed at database level (not in application code)
- [ ] Proper SQL/query builder syntax for sorting
- [ ] Performance optimized with appropriate indexes
- [ ] Case-insensitive sorting for text fields

## Implementation Details

### Step 1: Re-enable Unit Tests

Remove `.skip` from tests written in AW.1.

### Step 2: Update Universe Endpoint

Add sort parameter handling to the universe controller/route:

```typescript
// Example implementation structure
router.get('/api/universe', async (req, res) => {
  const { sortField = 'symbol', sortOrder = 'asc' } = req.query;

  // Validate sort field
  const validFields = ['symbol', 'name', 'sector', 'marketCap'];
  const field = validFields.includes(sortField) ? sortField : 'symbol';
  const order = sortOrder === 'desc' ? 'desc' : 'asc';

  // Apply sorting at database level
  const data = await universeService.getUniverse({ sortField: field, sortOrder: order });

  res.json(data);
});
```

### Step 3: Update Database Query

Implement sorting in the data access layer:

```typescript
// Add ORDER BY clause to universe query
const query = db
  .select()
  .from(universe)
  .orderBy(sortOrder === 'desc' ? desc(universe[sortField]) : asc(universe[sortField]));
```

### Step 4: Verify All Tests Pass

```bash
pnpm test:server
```

## Definition of Done

- [ ] All unit tests from AW.1 re-enabled and passing
- [ ] Endpoint properly implemented with sort parameters
- [ ] Database-level sorting implemented
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
- All tests from AW.1 should now pass
- Sorting must be database-level for performance

## Related Stories

- **Previous**: Story AW.1 (TDD Tests)
- **Next**: Story AW.3 (TDD for trades endpoints)
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
