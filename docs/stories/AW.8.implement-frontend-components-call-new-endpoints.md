# Story AW.8: Update Frontend Components to Call New Endpoints and Send Sort Parameters - TDD GREEN Phase

## Story

**As a** user
**I want** my table components to use the new separate endpoints with server-side sorting
**So that** I experience faster data loading and persistent sort preferences

## Context

**Current System:**

- Components call old endpoints
- Unit tests written in Story AW.7 (currently disabled)

**Implementation Approach:**

- Re-enable unit tests from AW.7
- Update UniverseTableComponent to integrate with SortStateService
- Update OpenTradesComponent to call /api/trades/open
- Update ClosedTradesComponent to call /api/trades/closed
- Make all tests pass (GREEN phase)

## Acceptance Criteria

### Functional Requirements

- [ ] UniverseTableComponent updated
  - [ ] Calls /api/universe
  - [ ] Loads sort state on init
  - [ ] Saves sort state on user action
- [ ] OpenTradesComponent updated
  - [ ] Calls /api/trades/open instead of filtering client-side
  - [ ] Integrates with SortStateService
- [ ] ClosedTradesComponent updated
  - [ ] Calls /api/trades/closed instead of filtering client-side
  - [ ] Integrates with SortStateService
- [ ] All unit tests from AW.7 re-enabled and passing

### Technical Requirements

- [ ] Components use Angular best practices
- [ ] Proper dependency injection
- [ ] Error handling in place
- [ ] Loading states managed properly

## Implementation Details

### Step 1: Re-enable Unit Tests

Remove `.skip` from tests written in AW.7.

### Step 2: Update UniverseTableComponent

```typescript
export class UniverseTableComponent implements OnInit {
  constructor(private http: HttpClient, private sortStateService: SortStateService) {}

  ngOnInit() {
    // Load saved sort state
    const sortState = this.sortStateService.loadSortState('universe');
    if (sortState) {
      this.currentSort = sortState;
    }
    this.loadData();
  }

  onSortChange(sortField: string, sortOrder: 'asc' | 'desc') {
    this.sortStateService.saveSortState('universe', sortField, sortOrder);
    this.currentSort = { sortField, sortOrder };
    this.loadData();
  }

  private loadData() {
    // Interceptor will add headers automatically
    this.http.get('/api/universe').subscribe((data) => {
      this.universeData = data;
    });
  }
}
```

### Step 3: Update Trades Components

Update both OpenTradesComponent and ClosedTradesComponent similarly:

```typescript
export class OpenTradesComponent implements OnInit {
  constructor(private http: HttpClient, private sortStateService: SortStateService) {}

  ngOnInit() {
    const sortState = this.sortStateService.loadSortState('openTrades');
    if (sortState) {
      this.currentSort = sortState;
    }
    this.loadData();
  }

  onSortChange(sortField: string, sortOrder: 'asc' | 'desc') {
    this.sortStateService.saveSortState('openTrades', sortField, sortOrder);
    this.currentSort = { sortField, sortOrder };
    this.loadData();
  }

  private loadData() {
    this.http.get('/api/trades/open').subscribe((data) => {
      this.tradesData = data;
    });
  }
}
```

### Step 4: Verify All Tests Pass

```bash
pnpm test:dms-material
```

## Definition of Done

- [ ] All unit tests from AW.7 re-enabled and passing
- [ ] All components properly updated
- [ ] Components integrate with SortStateService
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
- All tests from AW.7 should now pass
- Components now ready for removal of client-side sorting

## Related Stories

- **Previous**: Story AW.7 (TDD Tests)
- **Next**: Story AW.9 (TDD for removing client-side sorting)
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
