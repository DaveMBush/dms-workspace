---
name: DMS
status: final
sources:
  - _bmad-output/planning-artifacts/prds/prd-dms-workspace-2026-08-20/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-dms-workspace-2026-08-22/ARCHITECTURE-SPINE.md
updated: 2026-08-22
---

## Foundation

Desktop-first, single-operator, self-hosted web app. Angular 22 standalone + zoneless with `ChangeDetectionStrategy.OnPush` everywhere; signals + `computed()` drive reactivity. The UI kit is **Angular Material 22** for all standard primitives (buttons, dialogs, chips, tabs, snackbars, spinners) and a bespoke `dms-base-table` (CDK virtual scroll, 57px rows, ARIA table roles) for the data-dense surfaces. Tailwind CSS 4 provides the utility layout/spacing layer (no custom tokens). State management is `@smarttools/smart-signals` (SmartNgRX) for per-route entity stores and `@ngrx/signals` for the current-account context. `DESIGN.md` is the visual identity reference; this spine is the experience — IA, behavior, states, interactions, a11y, and journeys. Single-tenant (Dave); no multi-user, no team surfaces.

## Information Architecture

| Surface | Reached from | Purpose |
|---|---|---|
| Shell (split layout) | App launch / `/` | Left sidebar (`dms-account`) + right content pane (`dms-splitter`). The persistent frame — every surface lives inside it. |
| Universe | Sidebar → Global section | CEF watchlist: add, inline-edit, remove, risk-group tag, symbol autocomplete (FR-8, FR-9, FR-11). |
| Screener | Sidebar → Global section | cefconnect.com CEF cache: browse, filter by risk group, refresh, bulk-sync into universe (FR-12, FR-13, FR-10). |
| Summary | Sidebar → Global section | Portfolio-wide totals + income charts (deposits, dividends, capital gains per month) (FR-15). |
| Error Logs | Sidebar → Global section | Server error-log list, view detail, remove (FR-17). |
| CUSIP Cache | Sidebar → Global section | CUSIP→symbol mappings with source, archive, audit trail; manual refresh (FR-16). |
| Account list | Sidebar → Accounts section | Create, list, rename, soft-delete brokerage accounts (FR-1). |
| Account → Summary | Account → tab nav | Per-account totals, yield, gains/losses (FR-14). |
| Account → Open | Account → tab nav | Open positions: buy price, qty, date, inline edit, add new (FR-2, FR-4). |
| Account → Sold | Account → tab nav | Closed positions: sell price, date, computed gain/loss (FR-3). |
| Account → Div/Dep | Account → tab nav | Dividend/cash deposits: date, amount, type, CEF, inline edit, Fidelity CSV import (FR-5, FR-6, FR-7). |
| Auth / Login | `/auth/login` or session expiry | Sign-in, session validation, expiry warning (FR-19). |
| Profile | Sidebar / `/profile` | Session info, theme toggle. |

## Voice and Tone

DMS is a ledger, not a chatbot. The interface speaks in the register of a well-kept accounting journal: precise, quiet, and unambiguous. It never cheerleads, never punishes, and never hides a number behind jargon.

| Do | Don't |
|---|---|
| State facts plainly: "Position updated." "Import completed: 14 deposits, 2 trades." | Don't editorialize: "Great job closing that position! 🎉" |
| Report errors as actionable facts: "Row 42: unrecognized action 'MONEY MARKET TRANSFER' — skipped." | Don't blame the user: "You entered an invalid file." |
| Name the thing and the action: "Soft-deleted Fidelity IRA." "Refreshed screener (2026-08-22)." | Don't use vague verbs: "Processed." "Handled." |
| Use the domain vocabulary from the PRD glossary (universe, risk group, cost basis, distribution). | Don't invent marketing terms (portfolio health, wealth score, alpha). |
| Quantify: "3 deposits created, 1 unknown action collected." | Don't leave counts implicit: "Some rows were skipped." |
| Keep numbers in tabular, monospace-friendly form; right-align figures. | Don't bury amounts in prose paragraphs. |
| When a session is about to expire, warn once and offer the choice: "Extend or sign out." | Don't silently drop mid-entry work. |

## Component Patterns

| Component | Use | Behavioral rules |
|---|---|---|
| `dms-base-table` | All primary data tables (positions, deposits, universe, screener, CUSIP cache) | CDK virtual scroll (57px rows, 10-row buffer); multi-column `MatSort` with rank badges (¹²³) showing active sort stack; `SelectionModel` + `mat-checkbox` header for bulk ops; full ARIA table roles (`role=table/row/cell`, `aria-sort`); keyboard-sortable; server-side windowing via `visibleRange`/`loadByIndexes`; symbol search routed through an HTTP interceptor. |
| `dms-editable-cell` / `dms-editable-date-cell` | Inline edits of price, date, amount, type, risk group inside a table row | Click-to-edit; Enter commits, Escape reverts; on commit the SmartNgRX proxy row mutates and persists automatically (no manual save button); validation errors show inline on the cell, not in a snackbar. |
| `dms-node-editor` | Inline rename of accounts and symbols | `ControlValueAccessor`; Enter saves, Escape cancels; single-line, no placeholder decoration. |
| MatDialog (add flows) | Adding a new position, deposit, account, or universe entry | Reactive forms with `Validators.required/min/pattern`; price pattern `^\d+\.\d{2,5}$`; dialog stays open on validation failure with per-field error text; success closes dialog and fires a snackbar. |
| `MatSnackBar` (via `NotificationService`) | Confirmation and error toasts | 3000ms duration, top-end position, `snackbar-{success\|info\|warn\|error}` class, "Close" action; `showPersistent` for unrecoverable errors only. |
| `ConfirmDialogService` (MatDialog 400px) | Destructive confirmations (soft-delete, remove log, remove CEF) | One confirmation per destructive action; the dialog names the entity: "Remove CEF **JPM** from the universe?" |
| `dms-splitter` | Shell layout (sidebar + content pane) | Resizable; left pane holds `dms-account` sidebar; right pane is the router outlet; splitter position persists across sessions. |
| `dms-account` (sidebar) | Global nav + account list | Two sections: **Global** (Universe, Screener, Summary, Error Logs, CUSIP Cache) and **Accounts** (list with inline rename via `dms-node-editor`); active route highlighted. |
| `mat-tab-nav` / tab bar | Account sub-navigation (Summary / Open / Sold / Div-dep) | Horizontal tabs above the account content; the active tab is derived from the current route, not click state. |
| `GlobalLoadingService` overlay | App-level initial load / heavy data fetch | Full-screen overlay with 48px `mat-spinner`, z-index 9999, "Loading..." text; component-level uses a smaller spinner with `aria-label` — no skeleton screens anywhere. |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| **Loading (initial)** | Any data table, summary, screener | Component-level `mat-spinner` (24–48px) centered in the content area, `aria-label="Loading"`. The table header and column labels are visible immediately — rows fill in as data arrives. |
| **Loading (app-level)** | Shell / route transition | `GlobalLoadingService` overlay: full-screen, 48px spinner, "Loading..." text, z-9999. Dismissed automatically when data resolves. |
| **Empty** | Any `@empty` block (positions, deposits, universe, logs) | A plain-text `@empty` block in the table area: "No open positions in this account yet." No icon, no illustration, no CTA button — just the fact. |
| **Error (inline)** | Editable cell, form dialog field | Red border on the field + single-line error text below the field. The cell/dialog stays interactive; the user fixes and re-enters. |
| **Error (banner)** | Page-level failures (import rejected, server error) | `role="alert"` banner, Tailwind red (`--dms-error #ef4444`) background, full-width above the table content. Dismissible via a "Close" button. |
| **Error (snackbar)** | Non-blocking failures, confirmations | `MatSnackBar` top-end, 3s auto-dismiss (persistent for unrecoverable errors). Color-coded: green=success, amber=warn, red=error. |
| **Session expiring** | Any surface | Banner or dialog: "Your session is expiring. Extend or sign out?" with two buttons. The app is read-only during the warning window; unsaved inline edits are preserved. |
| **Concurrency conflict** | Editable cell (version mismatch) | The cell reverts to the last-known value; a snackbar says: "Value was changed elsewhere — showing latest." No data is silently overwritten. |
| **Screener stale** | Screener table | A muted timestamp above the table: "Cached 2026-08-20." A "Refresh" button is always visible; after refresh, the timestamp updates. |
| **Soft-deleted (hidden)** | All entity tables | Soft-deleted rows are invisible in normal queries. No "restored" or "trash" UI exists in the current build — recovery is via the API. |

## Interaction Primitives

**Direct, no ceremony.** DMS is a single-operator tool. Every interaction is click-to-act with a keyboard path alongside; there is no command palette, no gesture vocabulary, no modal stacking.

- **Click-to-edit** (`dms-editable-cell`) — single click on a numeric/date cell enters edit mode; `Enter` commits and the SmartNgRX proxy persists; `Escape` reverts to the prior value and exits edit mode.
- **Rename** (`dms-node-editor`) — click an account or symbol name to enter inline rename; `Enter` saves, `Escape` cancels. No separate edit button.
- **Sort** (`dms-base-table` headers) — click a column header to sort; `↑`/`↓` arrow keys on a focused header cycle sort direction. Multi-column sort is additive (click next header to add, rank badge shows priority).
- **Add flows** — a labelled "Add" button in the toolbar opens a MatDialog; Tab navigates fields; `Enter` submits when the form is valid; `Escape` closes without saving.
- **Dialog dismiss** — `Escape` or clicking outside a MatDialog closes it (Material 22 default). `ConfirmDialogService` dialogs require an explicit button click to confirm; `Escape` cancels.
- **Skip link** — first tab stop is a visually-hidden "Skip to main content" link → `#main-content`, for keyboard/screen-reader users who need to bypass the sidebar.
- **Tab order** — follows DOM reading order on every surface; no `tabindex` hacks. Material components ship correct order by default.
- **Splitter** — drag the `dms-splitter` divider to resize sidebar vs. content pane; position persists in `localStorage`. No keyboard resize in v1.

**Banned everywhere:** hover-only affordances (every action must be reachable via click or keyboard), drag-to-reorder rows, infinite scroll (tables use virtual scroll with finite row counts), modal stacks deeper than one level (dialog on a dialog), command palette, vim-style navigation shortcuts.

## Accessibility Floor

Behavioral. Visual contrast lives in `DESIGN.md` (light/dark palettes verified to meet WCAG AA ratios).

- WCAG 2.1 AA across the desktop web surface.
- **Skip link** — "Skip to main content" is the first tab stop; target is `#main-content` in the shell.
- **Screen-reader landmarks** — sidebar nav uses `role=navigation` + `aria-label`; main content pane uses `role=main`; each data table exposes `role=table`/`role=row`/`role=cell` with `aria-sort` on active sort columns.
- **Icon buttons** — every icon-only button carries an `aria-label` (e.g., `aria-label="Add position"`, `aria-label="Remove"`, `aria-label="Close"`).
- **Live region** — a hidden `aria-live="polite"` region (`#notification-region`) announces snackbars and state changes (e.g., "Position updated.") to assistive tech.
- **Keyboard-sortable tables** — column headers are focusable; `Enter`/`Space` toggles sort; `aria-sort` reflects state.
- **Focus-visible** — global `:focus-visible` outline (`--dms-focus-light #1976d2` / `--dms-focus-dark #90caf9`) on all interactive elements; never suppressed.
- **Dialog semantics** — MatDialog traps focus on open and returns it to the trigger on close; `aria-modal="true"`; labelled by its heading.
- **Theme toggle** — accessible via keyboard (button with `aria-label="Toggle dark mode"`); persisted in `localStorage` (`dms-theme`); respects `prefers-color-scheme` on first visit.
- **Spinner** — component-level `mat-spinner` carries `aria-label="Loading"`; `GlobalLoadingService` overlay has `role=status` + "Loading..." text.

## Responsive & Platform

DMS is a **desktop-first, single-operator** application. It runs in a standard browser (Chrome/Edge/Firefox) on a laptop or desktop, and as an Electron desktop app. It is not a mobile application and does not target touch-first interaction.

| Breakpoint | Behavior |
|---|---|
| `≥ 1280px` (desktop) | Full layout: sidebar + content pane via `dms-splitter`. All columns visible. Dialogs at their natural 400–600px width. |
| `1024px–1279px` (small laptop) | Same layout; `dms-splitter` lets the user narrow the sidebar. Table columns that overflow get horizontal scroll within the table container. |
| `< 1024px` (tablet / small window) | Functional but degraded. Sidebar narrows. Table may require horizontal scroll. No dedicated mobile layout is designed or tested. |

**Electron:** the Electron wrapper (`dms-electron`) provides a native window with the same Angular app. Window sizing and resizing behave identically to the browser. The Electron shell adds no unique UX surface — it is a distribution channel, not a platform variant.

**Platform posture:** DMS is self-hosted, single-tenant. There is no PWA manifest, no responsive mobile design, no touch-optimised gesture set. The "responsive" floor is "doesn't break below 1024px" — not "delight on a phone."

## Inspiration & Anti-patterns

- **Lifted from Angular Material 22:** the standard primitive set — buttons, tabs, dialogs, snackbars, chips, mat-sort, virtual scroll. DMS inherits Material's keyboard semantics, focus management, and a11y defaults rather than reimplementing them. The brand layer (colors, spacing, typography) is the override surface; the behavioral contract is Material's.
- **Lifted from bespoke `dms-base-table`:** virtual scroll (57px rows, 10-row buffer), multi-column sort with rank badges, `SelectionModel` bulk selection, and full ARIA table roles. These are purpose-built for DMS's data-dense tables and are not part of Material's stock table. The pattern — CDK virtual scroll + ARIA roles + keyboard-sortable headers — is the baseline for every new data surface.
- **Lifted from SmartNgRX (`@smarttools/smart-signals`):** optimistic, auto-persisting row edits via proxy mutation. The user edits a cell, presses Enter, and the data is saved — no explicit "Save" button on row edits. This is the core interaction contract for inline editing.
- **Rejected — Skeleton screens:** DMS uses `mat-spinner` (component or global overlay). Skeletons add a visual pattern that implies content shape before it's known; a spinner + visible column headers is sufficient and honest.
- **Rejected — Command palette / global search:** Single-operator, single-app; the sidebar navigation and route structure are the navigation model. A command palette adds a second navigation vocabulary with no proportional benefit for one user.
- **Rejected — Kanban / board views:** DMS data is tabular (positions, deposits, universe, screener). Board views are a task-management idiom that has no place in a financial ledger.
- **Rejected — Drag-and-drop reordering:** Tables are sorted, not ordered. Reordering a financial record by drag is semantically wrong and conflicts with sort state.
- **Rejected — Mobile-first responsive design:** DMS is a desktop tool. The responsive floor is "doesn't break"; the design target is "delights on a 1440px display."
- **Rejected — Multi-level modal stacks:** A confirm dialog on top of a form dialog creates a focus-trap confusion. DMS flattens: confirmations happen before or after the dialog, not inside it.

## Key Flows

### Flow 1 — Adding a new position (Dave, solo CEF investor, after buying shares)

1. Dave opens DMS; the shell loads with the left sidebar (Global + Accounts). He clicks his **Fidelity IRA** in the Accounts section.
2. The account panel renders; he clicks the **Open** tab. The `dms-base-table` shows his current open positions with columns for symbol, buy price, quantity, and date.
3. He clicks the **Add** button in the toolbar. A MatDialog opens with a reactive form: Symbol (with autocomplete from the universe), Buy Price, Quantity, Purchase Date.
4. He types the symbol — autocomplete suggests matches from his universe — selects, enters the price and quantity, picks the date.
5. **Climax:** He presses Enter. The form is valid, the dialog closes, a green snackbar reads "Position added." The new row appears in the table, sorted into place. SmartNgRX has already persisted it — no save button, no confirmation round-trip. He's back to work.

Failure: He mistypes the price as "45.2" (too few decimals). The field shows an inline red error: "Price must have 2–5 decimal places." The dialog stays open. He corrects it and presses Enter again.

### Flow 2 — Importing a Fidelity CSV (Dave, quarterly dividend season)

1. Dave downloads his quarterly statement CSV from Fidelity's website.
2. In the **Div/Dep** tab of his Fidelity IRA account, he clicks **Import**. A MatDialog opens with a file picker and an optional "Account" selector (pre-filled with the current account).
3. He selects the CSV. The dialog closes. A `GlobalLoadingService` overlay appears: spinner + "Processing import…" — the app is locked while the server parses, maps, and persists.
4. **Climax:** The overlay lifts. A snackbar reads: "Import completed: 14 deposits, 2 trades, 1 unknown action collected." He clicks the **Div/Dep** tab — his new rows are there, sorted by date, with correct types (Dividend vs Deposit). The one unrecognized action ("MONEY MARKET TRANSFER") is logged in the error log, not silently dropped.

Failure: The CSV has a malformed date on row 8. The snackbar reads: "Import completed: 12 deposits, 0 trades. 2 rows skipped." He opens Error Logs to see which rows failed and why. The valid rows are persisted; the invalid ones are not silently coerced.

### Flow 3 — Syncing from the screener (Dave, monthly portfolio review)

1. Dave clicks **Screener** in the Global sidebar. The `dms-base-table` loads the cached cefconnect.com data — symbol, name, risk group, distribution rate, dividend yield.
2. He sorts by **Yield** (clicks the column header; the arrow flips to descending). He scans the top rows.
3. He notices a CEF he hasn't tracked yet — **JEPQ**. He checks its checkbox.
4. **Climax:** He clicks **Sync to Universe**. A `ConfirmDialogService` dialog asks: "Add **JEPQ** to your universe?" He clicks **Confirm**. A snackbar reads: "Universe updated: 1 CEF added." He navigates to Universe and sees JEPQ there, ready to be assigned to an account.

Failure: He checks 5 CEFs and clicks Sync. 4 succeed; 1 (a delisted fund) fails the universe validation. The snackbar reads: "Universe updated: 4 added, 1 failed." The failed CEF is not in his universe; the error log records the rejection reason.

### Flow 4 — Reviewing the quarterly summary (Dave, end-of-quarter)

1. Dave clicks **Summary** in the Global sidebar. The surface loads: portfolio-wide totals (total cost basis, total distributions YTD, net capital gains YTD) and the income chart.
2. The chart renders three series — dividends, cash deposits, capital gains — across the trailing 12 months. The totals are right-aligned, monospace, in the primary blue.
3. He wants the per-account breakdown. He clicks his Fidelity IRA in the sidebar, then the **Summary** tab.
4. **Climax:** The account summary shows: total cost basis, current yield, YTD distributions, realized gains/losses. The numbers match his Fidelity statement within rounding. He screenshots the summary for his records. The surface is a ledger — no commentary, no "you're doing great," just the numbers.

Failure: A position was edited after the last summary cache. The totals reflect the latest persisted state. If a server error occurred during aggregation, the surface shows a `role="alert"` banner: "Summary data is unavailable. Check the server logs." — the old cached numbers are not silently shown as current.
