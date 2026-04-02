# DMS Codebase Duplication Audit

## 1. jscpd Results (Automated Copy-Paste Detection)

**Tool:** jscpd v4.0.8 via `pnpm dupcheck`
**Config:** threshold 0, minLines 15, minTokens 100, mode weak

| Format     | Files Analyzed | Total Lines | Clones Found | Duplicated Lines |
| ---------- | -------------- | ----------- | ------------ | ---------------- |
| TypeScript | 371            | 32,845      | 0            | 0 (0%)           |
| HTML       | 32             | 2,498       | 0            | 0 (0%)           |
| SCSS       | 29             | 1,594       | 0            | 0 (0%)           |
| CSS        | 1              | 21          | 0            | 0 (0%)           |
| JSON       | 10             | 648         | 0            | 0 (0%)           |
| JavaScript | 2              | 76          | 0            | 0 (0%)           |
| **Total**  | **455**        | **40,417**  | **0**        | **0 (0%)**       |

**Summary:** Zero copy-paste clones detected. The codebase has no exact duplicate blocks of 15+ lines / 100+ tokens. All duplication found in this audit is _functional duplication_ — structurally similar code that differs just enough to avoid jscpd detection.

---

## 2. Manual Functional Duplication Review

### 2.1 CRITICAL — Global Summary vs Account Summary

**Severity:** 🔴 Critical
**Estimated duplicated LOC:** ~250

#### Files Compared

| Component       | TypeScript                                                                          | Template                                                                             | SCSS                                                                      |
| --------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Global Summary  | `apps/dms-material/src/app/global/global-summary.ts` (186 lines)                    | `apps/dms-material/src/app/global/global-summary.html` (96 lines)                    | `apps/dms-material/src/app/global/global-summary.scss`                    |
| Account Summary | `apps/dms-material/src/app/accounts/account-summary/account-summary.ts` (182 lines) | `apps/dms-material/src/app/accounts/account-summary/account-summary.html` (94 lines) | `apps/dms-material/src/app/accounts/account-summary/account-summary.scss` |

#### Identical / Near-Identical Code

**Imports (lines 1–18 in both files):** 16 of 18 imports are identical. Only differences: `SummaryService` import path, and Account Summary additionally imports `currentAccountSignalStore`.

**Computed signals (Global lines 63–99, Account lines 73–100):**

Both files define identically-structured computed signals:

```typescript
allocationChartData   = computed(() => buildAllocationChartData(this.summaryService.summary()));
hasAllocationData$    = computed(() => data.datasets[0].data.some(...));
performanceChartData  = computed(() => buildPerformanceChartData(this.summaryService.graph()));
basis$                = computed(() => this.summaryService.summary().deposits);
capitalGain$          = computed(() => this.summaryService.summary().capitalGains);
dividends$            = computed(() => this.summaryService.summary().dividends);
percentIncrease$      = computed(() => computePercentIncrease(this.basis$(), this.capitalGain$(), this.dividends$()));
```

These 7 signals are functionally identical across both components.

**Form controls (Global line 55–56, Account line 65–66):**

```typescript
selectedMonth = new FormControl('2025-03'); // Global
selectedMonth = new FormControl(getCurrentMonth()); // Account — only default differs
selectedYear = new FormControl(new Date().getFullYear()); // identical in both
```

**Template structure (96 vs 94 lines):** Nearly identical layout:

- `<mat-card>` wrapper with header, content
- Loading spinner block (identical)
- Error message block (identical)
- Two-column flex layout: left (month selector, stats grid, pie chart) + right (line chart)
- Stats grid: 2×2 grid with Base, Dividends, Capital Gain, % Increase (identical bindings)
- Chart components: identical `<dms-allocation-chart>` and `<dms-performance-chart>` usage

**Template differences (minor):**

| Item                    | Global                     | Account                      |
| ----------------------- | -------------------------- | ---------------------------- |
| Title                   | "Global Summary"           | "Account Summary"            |
| data-testid prefix      | `global-summary-container` | `account-summary-container`  |
| Label text color class  | `text-gray-600`            | `text-gray-500`              |
| Month options binding   | `monthOptions` (getter)    | `monthOptions$()` (computed) |
| Year options binding    | `yearOptions` (getter)     | `yearOptions$()` (computed)  |
| Spinner aria-label      | Present                    | Missing                      |
| Stats data-testid attrs | Only `basis-value`         | All four stats have test IDs |

**Behavioural differences:**

| Feature                | Global                           | Account                                        |
| ---------------------- | -------------------------------- | ---------------------------------------------- |
| Data source            | All accounts aggregated          | Single account filtered by `accountId`         |
| Lifecycle              | `OnInit` fetches immediately     | `effect()` watches `currentAccountSignalStore` |
| Month selector disable | Only month disabled during fetch | Both month and year disabled during fetch      |
| Year change handler    | Re-fetches graph only            | Re-fetches graph and months                    |
| Month change handler   | Inline subscribe in `ngOnInit`   | Private `onMonthChange()` method               |

#### Merge Feasibility Assessment

✅ **Highly feasible.** A single `SummaryComponent` could accept:

- `@Input() mode: 'global' | 'account'`
- `@Input() accountId?: string`

The `SummaryService` already supports an optional `account_id` parameter. The template requires only one `@if (mode === 'account')` to conditionally show year-disable behaviour. Estimated effort: **1–2 days**. Risk: **Low** — both components share the same service and chart components already.

---

### 2.2 HIGH — Position Table Components (Open, Sold, Dividends)

**Severity:** 🟠 High
**Estimated duplicated LOC:** ~150

#### Files

| Component         | TypeScript                                                                                 | Lines |
| ----------------- | ------------------------------------------------------------------------------------------ | ----- |
| Open Positions    | `apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts`       | 297   |
| Sold Positions    | `apps/dms-material/src/app/account-panel/sold-positions/sold-positions.component.ts`       | 155   |
| Dividend Deposits | `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.ts` | 183   |

#### Identical Patterns

**Signal declarations** (Open lines 72–90, Sold lines 47–65, Dividends lines 67–83):

All three components declare the same signals with identical initialization:

```typescript
searchText = signal<string>((this.restoredFilter?.['symbol'] as string) ?? ''); // Open + Sold only
sortColumns$ = signal<SortColumn[]>(this.restoredSort !== null ? [{ column: this.restoredSort.field, direction: this.restoredSort.order }] : []);
visibleRange = signal<{ start: number; end: number }>({ start: 0, end: 50 });
```

**Filter timer pattern** (Open lines 92–98, Sold lines 67–73):

```typescript
private symbolFilterTimer: ReturnType<typeof setTimeout> | null = null;

ngOnDestroy(): void {
  if (this.symbolFilterTimer !== null) {
    clearTimeout(this.symbolFilterTimer);
    this.symbolFilterTimer = null;
  }
}
```

Identical cleanup logic duplicated across Open and Sold positions.

**`onSymbolFilterChange()` method** (Open lines 100–109, Sold lines 81–90):

Identical debounce-and-save logic with 300ms timer.

**`onSortChange()` method** (Open lines ~111–135, Sold lines 92–112, Dividends lines 92–108):

All three components have near-identical sort change handlers — set/clear `sortColumns$`, persist via `SortFilterStateService`, notify service.

**`onRangeChange()` method** (Open lines ~137–140, Sold lines 77–80, Dividends lines 85–88):

Identical pattern: `this.visibleRange.set(range); this.service.visibleRange.set(range);`

#### Refactor Approach

Extract a `BaseTableContainerMixin` or abstract class providing:

- `searchText`, `sortColumns$`, `visibleRange` signals
- `symbolFilterTimer` with cleanup
- `onSymbolFilterChange()`, `onSortChange()`, `onRangeChange()` methods
- `SortFilterStateService` integration

Each concrete component would only define its unique columns, data source, and any custom actions (edit/delete). Estimated effort: **2–3 days**. Risk: **Medium** — needs careful handling of the different column definitions and service injection per component.

---

### 2.3 MEDIUM — Server Summary Calculation Functions

**Severity:** 🟡 Medium
**Estimated duplicated LOC:** ~60

#### Files

- `apps/server/src/app/routes/summary/index.ts` (276 lines)

#### Duplicated Functions

**`calculateSingleAccountSummaryData()` (lines 107–136) vs `calculateGlobalSummaryData()` (lines 138–162):**

Both functions:

1. Fetch account data for "this month" (single vs all accounts)
2. Fetch account data for "prior months" (single vs all accounts)
3. Call `aggregateAccountData()` on results
4. Call `calculatePriorDivDeposits()` and `calculatePriorCapitalGains()` on prior months
5. Return identical `{ deposits, dividends, capitalGains, priorDivDeposit, priorCapitalGains }` shape

The only difference: single-account uses `findUnique` + `findMany` with `where: { id: accountId }`, while global uses `findMany` without the ID filter.

**Query functions (lines 71–105 and 201–225):**

- `getAccountThisMonth()` — single account, date range filter
- `getAccountPriorMonths()` — single account, before date filter
- `getAllAccountsThisMonth()` — all accounts, date range filter
- `getAllAccountsPriorMonths()` — all accounts, before date filter

Four functions with the same Prisma include pattern, differing only in presence of `where: { id: accountId }` and date comparison operators.

#### Refactor Approach

Unify into a single `fetchAccountData(sellDateStart, sellDateEnd, accountId?)` function that:

- Uses `findMany` when no accountId, `findUnique` + array wrap when accountId is present
- Accepts a `mode: 'thisMonth' | 'priorMonths'` parameter for date filtering

Estimated effort: **0.5–1 day**. Risk: **Low**.

---

### 2.4 MEDIUM — Server Page Fetcher Functions

**Severity:** 🟡 Medium
**Estimated duplicated LOC:** ~80

#### Files

- `apps/server/src/app/routes/accounts/build-account-response.function.ts` (227 lines)

#### Duplicated Functions

**`getOpenTradesPage()` (lines 69–106), `getSoldTradesPage()` (lines 108–130), `getDivDepositsPage()` (lines 132–152):**

`getSoldTradesPage()` and `getDivDepositsPage()` follow an identical pattern:

```typescript
const where = buildXxxWhere(state, accountId, ...);
const [totalCount, items] = await Promise.all([
  prisma.xxx.count({ where }),
  prisma.xxx.findMany({ where, select: { id: true }, orderBy: ..., skip: 0, take: ACCOUNT_PAGE_SIZE }),
]);
return { startIndex: 0, indexes: items.map(t => t.id), length: totalCount };
```

`getOpenTradesPage()` has extra complexity for computed sort fields but its non-computed branch is identical to `getSoldTradesPage()`.

#### Refactor Approach

Create a generic `fetchPage<T>(model, whereBuilder, orderByBuilder, state, accountId)` factory function. Estimated effort: **0.5–1 day**. Risk: **Low**.

---

### 2.5 LOW — Utilities and Services (No Significant Duplication)

The Angular shared utilities in `apps/dms-material/src/app/shared/utils/` are well-organized with no functional overlap. Each utility function (`buildAllocationChartData`, `buildPerformanceChartData`, `computePercentIncrease`, etc.) exists in exactly one location and is imported by both summary components.

The `SortFilterStateService` is a single service used consistently across all table components.

---

## 3. Global Summary vs Account Summary — Detailed Analysis

### 3.1 Structural Comparison

| Dimension             | Global Summary             | Account Summary             | Identical? |
| --------------------- | -------------------------- | --------------------------- | ---------- |
| Component decorator   | Yes (same imports, config) | Yes (same imports, config)  | ~95%       |
| Template layout       | mat-card → content → flex  | mat-card → content → flex   | ~90%       |
| Computed signals      | 7 signals                  | 7 signals (identical logic) | 100%       |
| Form controls         | 2 (month, year)            | 2 (month, year)             | ~95%       |
| Chart components used | allocation + performance   | allocation + performance    | 100%       |
| SCSS                  | Same responsive layout     | Same responsive layout      | ~90%       |
| Service               | SummaryService             | Same SummaryService         | 100%       |

### 3.2 Differences That Must Be Preserved

1. **Account ID context:** Account Summary must receive and pass `accountId` to all service calls
2. **Reactive trigger:** Global uses `ngOnInit`, Account uses `effect()` watching account store
3. **Year change:** Account re-fetches months for the account; Global does not
4. **Initial state:** Account resets month/year on account switch; Global uses static defaults
5. **Selector disabling:** Account disables both selectors during fetch; Global only disables month

### 3.3 Merge Recommendation

**Recommended approach:** Create a single `SummaryComponent` with `@Input() mode: 'global' | 'account'`.

- Shared template with `@if (mode === 'account')` for account-specific title/test-ids
- Shared computed signals (no change needed)
- Mode-specific data fetch method that optionally passes `accountId`
- The `SummaryService` already handles both cases via its optional `account_id` parameter

**Effort:** 1–2 days
**Risk:** Low — the service layer already supports both modes

---

## 4. Prioritised Refactor Candidate List

| Priority | Candidate                           | Difficulty | Impact | Est. LOC Saved | Rationale                                                             |
| -------- | ----------------------------------- | ---------- | ------ | -------------- | --------------------------------------------------------------------- |
| 1        | Merge Global/Account Summary        | Low        | High   | ~250           | Eliminates the largest functional duplicate; single maintenance point |
| 2        | Extract table component base class  | Medium     | High   | ~150           | Three components share filter/sort/range plumbing                     |
| 3        | Unify server summary queries        | Low        | Medium | ~60            | Four nearly-identical Prisma query functions → one                    |
| 4        | Unify server page fetcher functions | Low        | Medium | ~80            | Three functions with identical structure → generic factory            |

---

## 5. Recommended Implementation Sequence for Stories 41.2–41.4

### Story 41.2: Merge Global Summary and Account Summary

**Target:** Priority 1 from above
**Approach:**

1. Create `apps/dms-material/src/app/shared/components/summary/summary.component.ts`
2. Add `@Input() mode: 'global' | 'account'` and `@Input() accountId?: string`
3. Move all 7 computed signals and chart setup into the shared component
4. Handle mode-specific fetch logic via a single `refreshData(accountId?)` method
5. Replace `GlobalSummaryComponent` and `AccountSummaryComponent` with the new component
6. Update route configurations and tests

### Story 41.3: Extract Table Component Base Class

**Target:** Priority 2 from above
**Approach:**

1. Create an abstract `BaseTableContainerComponent` with shared signals and methods
2. Move `searchText`, `sortColumns$`, `visibleRange`, filter timer, `onSymbolFilterChange()`, `onSortChange()`, `onRangeChange()` into the base
3. Have `OpenPositionsComponent`, `SoldPositionsComponent`, `DividendDepositsComponent` extend it
4. Each subclass only defines its columns, data source, and unique actions

### Story 41.4: Server-Side Query Consolidation

**Target:** Priorities 3 and 4 from above
**Approach:**

1. Unify `getAccountThisMonth/PriorMonths` and `getAllAccountsThisMonth/PriorMonths` into a single parameterized query function
2. Unify `calculateSingleAccountSummaryData` and `calculateGlobalSummaryData` into `calculateSummaryData` (partially done — the dispatch function exists but the underlying queries remain duplicated)
3. Create a generic page fetcher factory to replace the three `getXxxPage()` functions
