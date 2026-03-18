# Component Inventory — dms-material

All components are standalone, use `OnPush` change detection, and use `inject()` for DI. Inputs use the `input()` signal API; outputs use `output()`.

---

## Shell & Layout Components

### `ShellComponent`

**File**: `apps/dms-material/src/app/shell/shell.component.ts`
**Selector**: `dms-shell`
**Purpose**: App toolbar with navigation, dark-mode toggle, username display, logout

**Key bindings**:

- Reads `userState.profile` signal for displayed username
- Triggers `ThemeService.toggle()` on theme button click
- Calls `AuthService.signOut()` on logout

---

### `AccountComponent`

**File**: `apps/dms-material/src/app/accounts/account.ts`
**Selector**: `dms-accounts`
**Purpose**: Account list in named outlet (`accounts`). Lists all investment accounts with navigation links.

---

## Dashboard Components

### `DashboardComponent`

**File**: `apps/dms-material/src/app/dashboard/dashboard.component.ts`
**Route**: `/dashboard`
**Purpose**: Landing page showing portfolio summary and quick-access tiles.

---

## Account Panel Components

### `AccountPanelComponent`

**File**: `apps/dms-material/src/app/account-panel/account-panel.component.ts`
**Route**: `/account/:accountId`
**Purpose**: Tab container for a single account. Hosts Material tabs: Open Positions / Sold Positions / Dividend Deposits.

### `AccountDetailComponent`

**File**: `apps/dms-material/src/app/account-panel/account-detail.component.ts`
**Purpose**: Registers SmartNgRX account-scoped entities (`openTrades`, `soldTrades`, `divDeposits`, `divDepositTypes`).

### `OpenPositionsComponent`

**File**: `apps/dms-material/src/app/account-panel/open-positions/open-positions.component.ts`
**Route**: `/account/:accountId/open`
**Purpose**: Virtual-scroll table of open CEF positions for the selected account.

| Input       | Type                  | Description                           |
| ----------- | --------------------- | ------------------------------------- |
| `accountId` | `InputSignal<string>` | Current account ID (from route param) |

**Features**: Inline price/date editing via `editable-cell`, add position dialog, sort by distribution yield / symbol / buy date

### `SoldPositionsComponent`

**File**: `apps/dms-material/src/app/account-panel/sold-positions/sold-positions.component.ts`
**Route**: `/account/:accountId/sold`
**Purpose**: Table of closed/sold positions with gain/loss calculation.

**Utilities**:

- `classifyCapitalGain.function.ts` — short-term (< 1yr) vs long-term gain classification

### `DividendDepositsComponent`

**File**: `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.ts`
**Route**: `/account/:accountId/div-dep`
**Purpose**: Table of dividend deposit records for selected account. Supports inline editing and add-deposit dialog.

---

## Global View Components

### `GlobalSummaryComponent` (also: `GlobalSummary`)

**File**: `apps/dms-material/src/app/global/global-summary.ts`
**Route**: `/global/summary`
**Purpose**: Portfolio-wide summary with distribution chart and monthly income breakdown.

**Sub-components used**: `SummaryDisplayComponent`, chart (renders `summary/graph` data)

### `GlobalUniverseComponent`

**File**: `apps/dms-material/src/app/global/global-universe/global-universe.component.ts`
**Route**: `/global/universe`
**Purpose**: Full management table for the CEF universe (watchlist). Supports editing, adding new symbols, syncing from screener.

**Features**:

- `BaseTableComponent` with virtual scroll
- Inline editing columns: `symbol`, `distribution`, `distributions_per_year`, `ex_date`, `risk_group_id`
- Add symbol dialog: autocomplete search + risk group selection
- Sync from screener action button
- Expired symbols filtered out by default

### `GlobalScreenerComponent`

**File**: `apps/dms-material/src/app/global/global-screener/global-screener.component.ts`
**Route**: `/global/screener`
**Purpose**: Displays CEF screener data pulled from cefconnect.com. Shows volatility, distribution rate, premium/discount, YTD return.

### `GlobalErrorLogsComponent`

**File**: `apps/dms-material/src/app/global/global-error-logs/`
**Route**: `/global/error-logs`
**Purpose**: Admin view of server log files. Lists available logs, allows viewing content and deleting.

### `CusipCacheComponent`

**File**: `apps/dms-material/src/app/global/cusip-cache/cusip-cache.component.ts`
**Route**: `/global/cusip-cache`
**Purpose**: Admin view of the CUSIP→symbol cache. Shows entries, source (OPENFIGI / YAHOO_FINANCE), last-used date, allows manual refresh.

---

## Shared Components

### `BaseTableComponent<T>`

**File**: `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`
**Selector**: `dms-base-table`
**Purpose**: Reusable virtual-scroll data table based on Angular CDK + Material. Used by all entity tables.

| Input        | Type                                     | Description                                     |
| ------------ | ---------------------------------------- | ----------------------------------------------- |
| `columns`    | `InputSignal<ColumnDef<T>[]>`            | Column definitions (key, header, cell template) |
| `dataSource` | `InputSignal<VirtualTableDataSource<T>>` | Virtual scroll data source                      |
| `tableId`    | `InputSignal<string>`                    | Unique table ID for state persistence           |
| `sortable`   | `InputSignal<boolean>`                   | Enable column sort headers                      |

| Output        | Type                          | Description                 |
| ------------- | ----------------------------- | --------------------------- |
| `rowSelected` | `OutputEmitterRef<T>`         | Emits on row click          |
| `sortChanged` | `OutputEmitterRef<SortEvent>` | Emits on column sort change |

### `EditableCellComponent`

**File**: `apps/dms-material/src/app/shared/components/editable-cell/`
**Selector**: `dms-editable-cell`
**Purpose**: Table cell that toggles between display text and a `MatInput` on click. Saves on blur / Enter.

| Input   | Type                              | Description        |
| ------- | --------------------------------- | ------------------ |
| `value` | `InputSignal<string \| number>`   | Current cell value |
| `type`  | `InputSignal<'text' \| 'number'>` | Input type         |

| Output        | Type                                 | Description         |
| ------------- | ------------------------------------ | ------------------- |
| `valueChange` | `OutputEmitterRef<string \| number>` | Emits updated value |

### `EditableDateCellComponent`

**File**: `apps/dms-material/src/app/shared/components/editable-date-cell/`
**Selector**: `dms-editable-date-cell`
**Purpose**: Same as `EditableCellComponent` but wraps a `MatDatepicker`.

### `ConfirmDialogComponent`

**File**: `apps/dms-material/src/app/shared/components/confirm-dialog/`
**Selector**: `dms-confirm-dialog`
**Purpose**: Reusable confirmation dialog. Opened via `ConfirmDialogService`.

**Dialog data type**:

```typescript
interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string; // default 'Confirm'
  cancelLabel?: string; // default 'Cancel'
}
```

### `SplitterComponent`

**File**: `apps/dms-material/src/app/shared/components/splitter/`
**Selector**: `dms-splitter`
**Purpose**: Resizable horizontal split pane. Used in shell layout to separate account list from main area.

| Input          | Type                  | Description                   |
| -------------- | --------------------- | ----------------------------- |
| `initialSplit` | `InputSignal<number>` | Initial left-pane ratio (0–1) |

### `SummaryDisplayComponent`

**File**: `apps/dms-material/src/app/shared/components/summary-display/`
**Selector**: `dms-summary-display`
**Purpose**: Financial summary card showing investment totals, yield %, gains/losses.

| Input     | Type                            | Description             |
| --------- | ------------------------------- | ----------------------- |
| `summary` | `InputSignal<PortfolioSummary>` | Aggregated summary data |

### `SymbolAutocompleteComponent`

**File**: `apps/dms-material/src/app/shared/components/symbol-autocomplete/`
**Selector**: `dms-symbol-autocomplete`
**Purpose**: Searchable autocomplete input for CEF symbols. Calls `GET /api/symbol/search?q=<term>`.

| Input         | Type                   | Description              |
| ------------- | ---------------------- | ------------------------ |
| `placeholder` | `InputSignal<string>`  | Input placeholder        |
| `required`    | `InputSignal<boolean>` | Validation required flag |

| Output           | Type                         | Description                            |
| ---------------- | ---------------------------- | -------------------------------------- |
| `symbolSelected` | `OutputEmitterRef<Universe>` | Emits when symbol chosen from dropdown |

### `SymbolFilterHeaderComponent`

**File**: `apps/dms-material/src/app/shared/components/symbol-filter-header/`
**Selector**: `dms-symbol-filter-header`
**Purpose**: Column header with embedded filter input for symbol columns in tables. Integrates with `SortFilterStateService`.

---

## Auth Components

### `SessionWarningComponent`

**File**: `apps/dms-material/src/app/auth/components/session-warning/`
**Purpose**: MatDialog that appears X minutes before session expiry. Offers "Extend Session" or "Log Out".

Triggered by `SessionManagerService` session expiry event.

---

## Store — Signal Service Layer

These are not UI components but are tightly coupled to component state:

### `CurrentAccountSignalStore`

**File**: `apps/dms-material/src/app/store/current-account/current-account.signal-store.ts`
**Purpose**: NgRx-like signal store for currently selected account ID. Not SmartNgRX — plain signal with reducer-style updates.

### `SortFilterStateService`

**File**: `apps/dms-material/src/app/shared/services/sort-filter-state.service.ts`
**Purpose**: Maintains per-table sort/filter state across navigation. Persists to `localStorage`. Key: table name (e.g., `'trades-open'`).
