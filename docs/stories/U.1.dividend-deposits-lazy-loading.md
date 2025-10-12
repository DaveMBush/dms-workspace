# Story U.1: Implement Lazy Loading for Dividend Deposits Table

## Status

Draft

## Story

**As a** user viewing dividend and deposit records,
**I want** the table to load only visible rows with a small buffer,
**so that** the screen loads faster and scrolls smoothly even with large datasets.

## Acceptance Criteria

1. **Backend API Changes:**
   - Update `/api/div-deposits` endpoint to accept query params object (backward compatible)
   - Implement server-side sorting with Prisma orderBy clauses
   - Add database indexes for sortable fields (date, amount)
   - Write backend tests for new API signature
2. **Frontend Changes:**
   - Add lazy loading attributes to dividend-deposits p-table template
   - Implement onLazyLoad event handler in component
   - Configure 10-row buffer with existing scroll height
   - Create or update DivDepositEffectsService to pass sort params to backend
   - Update computed signal to remove client-side sorting logic
   - Verify delete functionality works with lazy-loaded rows
   - Add dataKey attribute for proper row identification
3. **Testing:**
   - Update backend tests for new API with sorting
   - Update frontend unit tests to cover lazy loading behavior
   - Write integration tests for server-side sorting
   - Test with small and large datasets
4. Ensure the following commands run without errors:
   - `pnpm format`
   - `pnpm dupcheck`
   - `pnpm nx run rms:test --code-coverage`
   - `pnpm nx run server:build:production`
   - `pnpm nx run server:test --code-coverage`
   - `pnpm nx run server:lint`
   - `pnpm nx run rms:lint`
   - `pnpm nx run rms:build:production`
   - `pnpm nx run rms-e2e:lint`

## Tasks / Subtasks

- [ ] **Task 1: Update Backend API Endpoint** (AC: 1)
  - [ ] Read current `/api/div-deposits` endpoint implementation
  - [ ] Update request signature to accept `QueryParams | string[]` (backward compatible)
  - [ ] Define `DivDepositQueryParams` interface with `ids`, `sortField`, `sortOrder`, `accountId`
  - [ ] Implement Prisma `orderBy` clause based on sort params
  - [ ] Add validation for sort field (date, amount)
  - [ ] Ensure backward compatibility with old string[] format
  - [ ] Update API documentation/comments

- [ ] **Task 2: Create Database Indexes** (AC: 1)
  - [ ] Create migration script or document index creation SQL
  - [ ] Add index: `CREATE INDEX idx_div_deposits_date ON div_deposits(date DESC);`
  - [ ] Add index: `CREATE INDEX idx_div_deposits_account_date ON div_deposits(account_id, date DESC);`
  - [ ] Test index performance with large datasets
  - [ ] Document index rationale in migration file

- [ ] **Task 3: Write Backend Tests** (AC: 1)
  - [ ] Test new API accepts query params object
  - [ ] Test backward compatibility with string[] format
  - [ ] Test sorting by date ascending
  - [ ] Test sorting by date descending
  - [ ] Test sorting by amount
  - [ ] Test invalid sort field returns error or defaults
  - [ ] Test empty IDs array returns empty result
  - [ ] Test accountId filter works correctly

- [ ] **Task 4: Create/Update DivDepositEffectsService** (AC: 2)
  - [ ] Check if DivDepositEffectsService exists, create if needed
  - [ ] Extend `EffectService<DivDeposit>` from SmartNgRX
  - [ ] Inject HttpClient
  - [ ] Create `sortParams` signal to store current sort parameters
  - [ ] Implement `setSortParams(params: SortParams)` method
  - [ ] Override `loadByIds(ids: string[]): Observable<DivDeposit[]>` method
  - [ ] Call backend API with sort params: `{ ids, sortField, sortOrder, accountId }`
  - [ ] Register service in entity definition and providers

- [ ] **Task 5: Add PrimeNG lazy loading attributes to p-table** (AC: 2)
  - [ ] Add `[lazy]="true"` attribute to p-table in dividend-deposits.html
  - [ ] Add `[virtualScroll]="true"` attribute for virtual scrolling
  - [ ] Configure `[rows]="10"` for 10-row buffer size
  - [ ] Add `[dataKey]="'id'"` for proper row identification
  - [ ] Add `[totalRecords]="totalRecords$()"` signal for total count
  - [ ] Add `(onLazyLoad)="onLazyLoad($event)"` event handler
  - [ ] Preserve existing `[scrollHeight]="'calc(100vh - 184px)'"`
  - [ ] Preserve existing sort configuration `[sortField]="'date'"` `[sortOrder]="-1"`

- [ ] **Task 6: Implement onLazyLoad event handler** (AC: 2)
  - [ ] Inject DivDepositEffectsService in component
  - [ ] Create `onLazyLoad(event: LazyLoadEvent): void` method in component
  - [ ] Extract `first`, `rows`, `sortField`, `sortOrder` from event
  - [ ] Call `effectsService.setSortParams()` with sort parameters
  - [ ] Create `lazyLoadParams` signal to store load parameters
  - [ ] Update `lazyLoadParams` signal with event data
  - [ ] Create `totalRecords$` computed signal for total record count (after filtering)

- [ ] **Task 7: Update computed signal to remove client-side sorting** (AC: 2)
  - [ ] Update `deposits$` computed signal
  - [ ] Remove any client-side `.sort()` calls (sorting now server-side)
  - [ ] Keep data transformation logic (symbol lookup, divDepositType mapping)
  - [ ] Slice data based on `lazyLoadParams`: `slice(first, first + rows)`
  - [ ] Ensure data transformation happens AFTER server sorts data
  - [ ] Maintain existing `trackById` function

- [ ] **Task 8: Verify delete functionality with lazy loading** (AC: 2)
  - [ ] Test `deleteDeposit()` method with lazy-loaded rows on first page
  - [ ] Test delete on middle pages
  - [ ] Test delete on last page
  - [ ] Verify SmartArray delete proxy works correctly
  - [ ] Ensure table updates properly after deletion
  - [ ] Verify `totalRecords$` updates after delete

- [ ] **Task 9: Update frontend unit tests** (AC: 3)
  - [ ] Update existing component tests in dividend-deposits.spec.ts (if exists)
  - [ ] Mock DivDepositEffectsService
  - [ ] Test onLazyLoad event handler calls setSortParams correctly
  - [ ] Test totalRecords$ signal calculation
  - [ ] Test lazy load with small dataset (< 10 rows)
  - [ ] Test lazy load with large dataset (> 100 rows)
  - [ ] Test delete operation updates lazy load state
  - [ ] Verify server-side sorting (no client-side sort logic)

- [ ] **Task 10: Write integration tests** (AC: 3)
  - [ ] Test end-to-end lazy loading flow
  - [ ] Test user clicks sort header → backend receives sort params
  - [ ] Test server returns sorted data → frontend displays correctly
  - [ ] Test pagination with sorting maintained
  - [ ] Test delete operation with server-sorted data
  - [ ] Test with various dataset sizes

- [ ] **Task 11: Run all quality gates** (AC: 4)
  - [ ] Execute `pnpm format` and fix any formatting issues
  - [ ] Execute `pnpm dupcheck` and resolve duplicates
  - [ ] Execute all test suites and ensure 100% pass rate
  - [ ] Execute all lint commands and resolve issues
  - [ ] Execute all build commands and ensure successful compilation

## Dev Notes

### Epic Context

This story implements lazy loading with virtual scrolling for the Dividend Deposits table (Epic U). This is the simplest of four table components being optimized, as it only requires basic sorting and delete functionality without complex filtering or inline editing.

**IMPORTANT**: This story includes **server-side sorting** implementation. The original approach of client-side sorting will NOT work with lazy loading because the frontend only has a subset of records loaded. Sorting must happen on the server before returning entity IDs to the frontend.

### Server-Side Sorting Architecture

**Reference**: `/docs/architecture/server-side-sorting-api-design.md`

**Why Server-Side Sorting is Required:**
- SmartNgRX Signals lazy loading only loads a subset of entity IDs
- Cannot sort all data client-side when we don't have all records
- Backend must return **sorted** entity IDs for the frontend to display

**Implementation Pattern:**
1. Backend API accepts sort parameters (`sortField`, `sortOrder`)
2. Prisma orderBy clause sorts data at database level
3. Backend returns sorted entities
4. Frontend EffectsService passes sort params to backend
5. Frontend computed signal slices sorted data for pagination

### Current Implementation

**Source: [apps/rms/src/app/account-panel/dividend-deposits/dividend-deposits.ts]**

**Current Component Structure:**
```typescript
export class DividendDeposits {
  private currentAccount = inject(currentAccountSignalStore);

  deposits$ = computed(() => {
    // Transforms all data at once
    const symbols = selectUniverses();
    const divDepositTypes = selectDivDepositTypes();
    const account = selectCurrentAccountSignal(this.currentAccount);
    const divDepositsArray = account().divDeposits;
    // Returns complete array
    return divDeposits;
  });

  deleteDeposit(row: DivDeposit): void {
    // Uses SmartArray proxy delete method
  }

  trackById(index: number, row: DivDeposit): string {
    return row.id;
  }
}
```

**Current Template Structure:**
```html
<p-table
  [value]="deposits$()"
  [scrollable]="true"
  [scrollHeight]="'calc(100vh - 184px)'"
  [sortField]="'date'"
  [sortOrder]="-1"
  [rowTrackBy]="trackById"
>
```

### PrimeNG Lazy Loading Pattern

**Source: [PrimeNG 20 Table Documentation - Virtual Scroll with Lazy Loading]**

**Required Template Changes:**
```html
<p-table
  [value]="deposits$()"
  [lazy]="true"
  [virtualScroll]="true"
  [rows]="10"
  [totalRecords]="totalRecords$()"
  (onLazyLoad)="onLazyLoad($event)"
  [dataKey]="'id'"
  [scrollable]="true"
  [scrollHeight]="'calc(100vh - 184px)'"
  [sortField]="'date'"
  [sortOrder]="-1"
  [rowTrackBy]="trackById"
>
```

**LazyLoadEvent Interface:**
```typescript
interface LazyLoadEvent {
  first: number;      // Index of first row to load
  rows: number;       // Number of rows to load
  sortField?: string; // Field to sort by
  sortOrder?: number; // Sort order (1 or -1)
  filters?: any;      // Filter metadata
}
```

**Backend API Implementation (NEW)**:
```typescript
interface DivDepositQueryParams {
  ids: string[];
  sortField?: string;
  sortOrder?: 1 | -1;
  accountId?: string;
}

function handleGetDivDepositsRoute(fastify: FastifyInstance): void {
  fastify.post<{ Body: string[] | DivDepositQueryParams; Reply: DivDeposit[] }>(
    '/',
    async function handleGetDivDepositsRequest(request, _): Promise<DivDeposit[]> {
      // Backward compatibility
      if (Array.isArray(request.body)) {
        const ids = request.body;
        return prisma.divDeposits.findMany({ where: { id: { in: ids } } });
      }

      const { ids, sortField, sortOrder, accountId } = request.body;

      if (ids.length === 0) return [];

      const whereClause: any = {
        id: { in: ids },
        ...(accountId && { accountId })
      };

      // Server-side sorting with Prisma
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

**Frontend EffectsService Implementation (NEW)**:
```typescript
@Injectable()
export class DivDepositEffectsService extends EffectService<DivDeposit> {
  private http = inject(HttpClient);
  private sortParams = signal<SortParams | undefined>(undefined);
  private accountId = inject(currentAccountId);

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

**Frontend Component Implementation (UPDATED)**:
```typescript
// Add signal for total records
totalRecords$ = computed(() => {
  const account = selectCurrentAccountSignal(this.currentAccount);
  const divDepositsArray = account().divDeposits;
  return divDepositsArray.length;
});

// Add lazy load state
private lazyLoadParams = signal<{first: number; rows: number}>({
  first: 0,
  rows: 10
});

// Update deposits$ - NO CLIENT-SIDE SORTING
deposits$ = computed(() => {
  const params = this.lazyLoadParams();
  const symbols = selectUniverses();
  // ... existing transformation logic
  // Data is ALREADY SORTED by server
  const allDeposits = [/* transformed data */];

  // Slice for lazy loading (server already sorted)
  return allDeposits.slice(params.first, params.first + params.rows);
});

// Add onLazyLoad handler - sets sort params in EffectsService
onLazyLoad(event: LazyLoadEvent): void {
  // Tell EffectsService about sort params BEFORE reload
  this.effectsService.setSortParams({
    sortField: event.sortField,
    sortOrder: event.sortOrder
  });

  // Update lazy load params (triggers reload)
  this.lazyLoadParams.set({
    first: event.first || 0,
    rows: event.rows || 10
  });
}
```

### SmartNgRX Signals Integration

**Source: [CLAUDE.md - SmartNgRX Signals State Management]**

**Current State Management:**
- Uses `selectCurrentAccountSignal(currentAccountSignalStore)` for account data
- Uses `selectUniverses()` for symbol mapping
- Uses `selectDivDepositTypes()` for type mapping
- SmartArray proxy methods for delete operations

**Lazy Loading Considerations:**
- SmartNgRX signals remain unchanged
- Computed signal must still access full dataset for total count
- Lazy loading only affects what's rendered, not state management
- Delete operations work on full dataset via SmartArray proxy

### File Locations

**Source: [Epic U - Integration Points]**

**Files to Modify:**
- `/apps/rms/src/app/account-panel/dividend-deposits/dividend-deposits.html` - Add lazy loading attributes
- `/apps/rms/src/app/account-panel/dividend-deposits/dividend-deposits.ts` - Implement lazy load logic
- `/apps/rms/src/app/account-panel/dividend-deposits/dividend-deposits.spec.ts` - Update tests (if exists)

**Related Files (Read-Only):**
- `/apps/rms/src/app/store/current-account/select-current-account.signal.ts` - Current account selector
- `/apps/rms/src/app/store/universe/selectors/select-universes.function.ts` - Universe selector
- `/apps/rms/src/app/store/div-deposit-types/selectors/select-div-deposit-types.function.ts` - Div deposit types selector

### Component Architecture

**Source: [CLAUDE.md - Component Guidelines]**

**Angular 20 Standards:**
- Use `inject()` for dependency injection (already followed)
- Use signals for all template-accessed variables
- External files for HTML and SCSS (already followed)
- OnPush change detection (already configured)

**Performance Optimization:**
- `[virtualScroll]="true"` - Only renders visible rows plus buffer
- `[rows]="10"` - Loads 10 rows at a time
- `[dataKey]="'id'"` - Efficient row tracking for updates
- Maintain existing `trackById` function

### Code Quality Standards

**Source: [CLAUDE.md - Code Quality Standards]**

**Line Length and Function Rules:**
- Maximum 80 characters per line
- Maximum 50 executable lines per function
- Maximum 4 parameters per function
- No more than 2 levels of nesting

**Anonymous Function Handling:**
- For computed signals: Use context pattern if referencing `this`
- For event handlers: Named functions preferred
- Exception: Computed signals may use arrow functions with eslint-disable

**Quality Gates (AC: 9):**
```bash
pnpm format                                    # Code formatting
pnpm dupcheck                                  # Duplicate detection
pnpm nx run rms:test --code-coverage          # Unit tests
pnpm nx run server:build:production           # Server build
pnpm nx run server:test --code-coverage       # Server tests
pnpm nx run server:lint                       # Server linting
pnpm nx run rms:lint                          # RMS linting
pnpm nx run rms:build:production              # RMS build
pnpm nx run rms-e2e:lint                      # E2E linting
```

### Testing

**Source: [CLAUDE.md - Testing Requirements]**

**Testing Framework:**
- Use Vitest for all testing
- Follow existing test patterns in codebase
- Ensure tests pass before committing

**Test Scenarios:**
1. **Lazy Load Event Handling:**
   - Test onLazyLoad receives correct event parameters
   - Test lazyLoadParams signal updates correctly
   - Test deposits$ recomputes with new slice

2. **Total Records Calculation:**
   - Test totalRecords$ returns correct count
   - Test with empty dataset (0 records)
   - Test with small dataset (< 10 records)
   - Test with large dataset (> 100 records)

3. **Data Slicing:**
   - Test first page loads rows 0-9
   - Test second page loads rows 10-19
   - Test last page with partial rows

4. **Delete Functionality:**
   - Test delete on first page
   - Test delete on middle page
   - Test delete on last page
   - Test table updates after deletion

5. **Sorting:**
   - Test default sort by date descending
   - Verify sorting maintained with lazy loading

**Test File Location:**
- `/apps/rms/src/app/account-panel/dividend-deposits/dividend-deposits.spec.ts` (create if doesn't exist)

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-10-11 | 1.0 | Initial story creation for Epic U.1 lazy loading | BMad Scrum Master |
| 2025-10-12 | 2.0 | Added server-side sorting requirements (backend API, database indexes, EffectsService) | Product Management (John) |

## Dev Agent Record

### Agent Model Used

_To be populated by development agent_

### Debug Log References

_To be populated by development agent_

### Completion Notes List

_To be populated by development agent_

### File List

_To be populated by development agent_

## QA Results

_Results from QA Agent review will be populated here after implementation_
