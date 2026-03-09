# Story AW.6: Implement HTTP Interceptor to Send Sort Headers and localStorage Sort State Management - TDD GREEN Phase

## Story

**As a** user
**I want** my sort preferences to persist across page refreshes and be automatically sent to the server
**So that** I don't have to re-configure sorting every time I reload the page

## Context

**Current System:**

- Sort state not persisted
- Unit tests written in Story AW.5 (currently disabled)

**Implementation Approach:**

- Re-enable unit tests from AW.5
- Create SortStateService for localStorage management
- Create SortInterceptor to add headers to HTTP requests
- Make all tests pass (GREEN phase)

## Acceptance Criteria

### Functional Requirements

- [ ] SortStateService saves/loads/clears sort state
- [ ] SortInterceptor adds X-Sort-Field and X-Sort-Order headers
- [ ] Sort state persists across page refreshes
- [ ] Interceptor only adds headers to sortable endpoints
- [ ] All unit tests from AW.5 re-enabled and passing

### Technical Requirements

- [ ] Service is injectable
- [ ] Interceptor properly registered in providers
- [ ] Headers only added to GET requests for data endpoints
- [ ] Proper error handling

## Implementation Details

### Step 1: Re-enable Unit Tests

Remove `.skip` from tests written in AW.5.

### Step 2: Create SortStateService

```typescript
@Injectable({ providedIn: 'root' })
export class SortStateService {
  private readonly STORAGE_KEY = 'dms-sort-state';

  saveSortState(table: string, sortField: string, sortOrder: 'asc' | 'desc'): void {
    try {
      const state = this.loadAllState();
      state[table] = { sortField, sortOrder };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save sort state:', error);
    }
  }

  loadSortState(table: string): { sortField: string; sortOrder: 'asc' | 'desc' } | null {
    try {
      const state = this.loadAllState();
      return state[table] || null;
    } catch (error) {
      console.error('Failed to load sort state:', error);
      return null;
    }
  }

  clearSortState(table?: string): void {
    try {
      if (table) {
        const state = this.loadAllState();
        delete state[table];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
      } else {
        localStorage.removeItem(this.STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to clear sort state:', error);
    }
  }

  private loadAllState(): Record<string, any> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      return {};
    }
  }
}
```

### Step 3: Create SortInterceptor

```typescript
@Injectable()
export class SortInterceptor implements HttpInterceptor {
  constructor(private sortStateService: SortStateService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only add headers to sortable endpoints
    const sortableEndpoints = ['/api/universe', '/api/trades/open', '/api/trades/closed'];
    const isSortable = sortableEndpoints.some((endpoint) => req.url.includes(endpoint));

    if (!isSortable || req.method !== 'GET') {
      return next.handle(req);
    }

    // Determine table name from URL
    const tableName = this.getTableNameFromUrl(req.url);
    const sortState = this.sortStateService.loadSortState(tableName);

    if (sortState) {
      req = req.clone({
        setHeaders: {
          'X-Sort-Field': sortState.sortField,
          'X-Sort-Order': sortState.sortOrder,
        },
      });
    }

    return next.handle(req);
  }

  private getTableNameFromUrl(url: string): string {
    if (url.includes('/api/universe')) return 'universe';
    if (url.includes('/api/trades/open')) return 'openTrades';
    if (url.includes('/api/trades/closed')) return 'closedTrades';
    return 'unknown';
  }
}
```

### Step 4: Register Interceptor

```typescript
// In app.config.ts or module providers
provideHttpClient(withInterceptors([sortInterceptor]));
```

### Step 5: Verify All Tests Pass

```bash
pnpm test:dms-material
```

## Definition of Done

- [ ] All unit tests from AW.5 re-enabled and passing
- [ ] SortStateService properly implemented
- [ ] SortInterceptor properly implemented and registered
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
- All tests from AW.5 should now pass
- Headers should be read by backend from AW.2 and AW.4

## Related Stories

- **Previous**: Story AW.5 (TDD Tests)
- **Next**: Story AW.7 (TDD for frontend components)
- **Epic**: Epic AW

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Status

Ready for Review

### Tasks / Subtasks

- [x] Re-enable unit tests from AW.5 (remove `.skip` from describe blocks)
- [x] Implement SortStateService for localStorage management
- [x] Implement SortInterceptor to add sort headers to HTTP requests
- [x] All unit tests passing (GREEN phase complete)
- [x] Lint, build, test passing (`pnpm all`)
- [x] Format check (`pnpm format`)
- [x] Duplicate check (`pnpm dupcheck`)
- [x] E2E chromium
- [x] E2E firefox

### File List

- apps/dms-material/src/app/shared/services/sort-state.service.ts (modified - implemented)
- apps/dms-material/src/app/shared/services/sort-state.service.spec.ts (modified - removed .skip)
- apps/dms-material/src/app/auth/interceptors/sort.interceptor.ts (modified - implemented)
- apps/dms-material/src/app/auth/interceptors/sort.interceptor.spec.ts (modified - removed .skip)
- apps/dms-material/src/app/app.config.ts (modified - registered sortInterceptor)

### Change Log

- Implemented SortStateService: saveSortState, loadSortState, clearSortState with localStorage persistence and error handling
- Implemented sortInterceptor: adds X-Sort-Field and X-Sort-Order headers to sortable endpoints (/api/universe, /api/trades/open, /api/trades/closed)
- Re-enabled all 28+ unit tests from AW.5 TDD RED phase

### Debug Log References
