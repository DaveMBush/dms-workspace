# Story 81.2: Frontend — "Vol" Column on Universe Screen

Status: Done

## Story

As Dave,
I want to see a "Vol" column as the first column on the Universe screen that shows a stability icon for each symbol,
so that I can quickly assess distribution stability without scrolling.

## Acceptance Criteria

1. **Given** Universe screen loaded,
   **When** component initialises and fetches Universe data (now with volatility),
   **Then** "Vol" column appears as leftmost column in the table.

2. **Given** "Vol" column header,
   **When** user hovers over it,
   **Then** tooltip with text "Volatility" is displayed.

3. **Given** symbol with `steady` category,
   **When** its row is rendered in "Vol" column,
   **Then** a "steady" icon/indicator is displayed.

4. **Given** symbol with `increasing`, `decreasing`, or `volatile` category,
   **When** row rendered,
   **Then** appropriate icon is displayed.

5. **Given** symbol with `null`/`unknown` category,
   **When** row rendered,
   **Then** empty cell or neutral placeholder shown (no error, no broken icon).

6. **Given** Angular component uses `OnPush` and `inject()`,
   **When** code reviewer inspects implementation,
   **Then** no constructor injection, no `ngZone.run()`, no `ChangeDetectorRef.detectChanges()` workarounds.

## Tasks / Subtasks

- [x] Task 1: Locate Universe screen component and understand data model (AC: #1)

  - [x] Find Universe component in `apps/dms-material/src/app/` (search for `universe`)
  - [x] Read the component `.ts` file to understand how data is fetched (signal store, HTTP service, etc.)
  - [x] Read the component template `.html` to understand the table structure (column defs, `matColumnDef`, virtual scroll if used)
  - [x] Identify how column order is controlled (array of column names, or direct template order)

- [x] Task 2: Update data model and API service (AC: #1)

  - [x] Find the Universe interface/type definition (look in `apps/dms-material/src/app/` or shared models)
  - [x] Add `volatility1yr?: 'steady' | 'increasing' | 'decreasing' | 'volatile' | null` and `volatility5yr?` to the interface
  - [x] Confirm the HTTP service/API call fetches from the correct endpoint augmented in Story 81.1
  - [x] Ensure the signal/store state includes the new volatility fields without breaking existing state shape

- [x] Task 3: Add "Vol" column to the table as the first column (AC: #1, #2, #3, #4, #5)

  - [x] In the component template, add `<ng-container matColumnDef="vol">` with header and cell definitions
  - [x] Header cell: `<mat-header-cell>Vol</mat-header-cell>` with `matTooltip="Volatility"`
  - [x] Cell content: display correct Material icon based on `volatility1yr` value (see icon mapping below)
  - [x] Handle `null`/`unknown`: render empty cell or a neutral `—` placeholder
  - [x] Update the displayed columns array to insert `'vol'` at index 0 (first position)

- [x] Task 4: Verify OnPush, inject(), and signal patterns (AC: #6)

  - [x] Confirm component has `ChangeDetectionStrategy.OnPush`
  - [x] Confirm no constructor injection — use `inject()` only
  - [x] Confirm state is managed via signals (not imperative `detectChanges()` calls)
  - [x] Named functions for any callbacks — no anonymous arrow functions

- [x] Task 5: Run full test suite (AC: #1–6)
  - [x] Run `pnpm all` and confirm all tests pass
  - [x] Run `pnpm e2e:dms-material:chromium` for E2E confirmation
  - [x] Do not modify pre-existing tests

## Dev Notes

### Prerequisite

Story 81.1 must be completed — the backend endpoint must be returning `volatility1yr` and `volatility5yr` fields before this component can display them.

### Volatility Icon Mapping

| Category         | Material Icon    | Rationale             |
| ---------------- | ---------------- | --------------------- |
| `steady`         | `trending_flat`  | Flat/stable trend     |
| `increasing`     | `trending_up`    | Upward trend          |
| `decreasing`     | `trending_down`  | Downward trend        |
| `volatile`       | `show_chart`     | Irregular/jagged line |
| `null`/`unknown` | _(empty)_ or `—` | Insufficient data     |

### Template Pattern

```html
<!-- In the table component template -->
<ng-container matColumnDef="vol">
  <mat-header-cell *matHeaderCellDef matTooltip="Volatility">Vol</mat-header-cell>
  <mat-cell *matCellDef="let row">
    @if (row.volatility1yr === 'steady') {
    <mat-icon>trending_flat</mat-icon>
    } @else if (row.volatility1yr === 'increasing') {
    <mat-icon>trending_up</mat-icon>
    } @else if (row.volatility1yr === 'decreasing') {
    <mat-icon>trending_down</mat-icon>
    } @else if (row.volatility1yr === 'volatile') {
    <mat-icon>show_chart</mat-icon>
    }
    <!-- null/unknown: empty cell — no @else needed -->
  </mat-cell>
</ng-container>
```

### Column Order — Insert at Index 0

Find the displayed columns array in the component and insert `'vol'` at position 0:

```typescript
// In the component, locate the displayedColumns signal or array
// Change from:
displayedColumns = signal(['symbol', 'price' /* ... */]);
// To:
displayedColumns = signal(['vol', 'symbol', 'price' /* ... */]);
```

If the table uses a BaseTableComponent or configuration object for columns, find where that config is defined and prepend the `vol` column definition there.

### Locating the Universe Component

```bash
find apps/dms-material/src/app/ -name "*universe*" -type f
# Also try:
grep -r "universe\|Universe" apps/dms-material/src/app/ --include="*.ts" -l
```

### Angular Imports Needed

Ensure the component imports:

- `MatIconModule` (or `MatIcon`) for `<mat-icon>`
- `MatTooltipModule` (or `MatTooltip`) for `matTooltip`

Check the component's `imports: []` array in the `@Component` decorator and add if missing.

### SmartSignals / SmartNgRX Pattern

The Universe data likely comes from a `@smarttools/smart-signals` store. When adding `volatility1yr` to the model:

- Update the TypeScript interface/type
- Ensure the store/smart-signal definition includes the new field
- The API response will automatically populate it once Story 81.1 is complete

Look for the Universe store/smart-signal definition in `apps/dms-material/src/app/` or a shared state directory.

### Key Commands

| Purpose                       | Command                                                                   |
| ----------------------------- | ------------------------------------------------------------------------- |
| Run all tests                 | `pnpm all`                                                                |
| Run Chromium E2E              | `pnpm e2e:dms-material:chromium`                                          |
| Find Universe component       | `find apps/dms-material/src/app/ -name "*universe*"`                      |
| Find Universe type definition | `grep -r "Universe\|universe" apps/dms-material/src/ --include="*.ts" -l` |

### Key Files

| File                                               | Purpose                                                       |
| -------------------------------------------------- | ------------------------------------------------------------- |
| `81-1-backend-volatility-service.md`               | Prerequisite — backend volatility endpoint must be done first |
| `apps/dms-material/src/app/universe/` (or similar) | Universe component — add Vol column here                      |
| `apps/dms-material/src/app/`                       | Search here for Universe interface/type                       |
| `apps/dms-material/src/app/app.routes.ts`          | Confirm Universe route path                                   |

### Constraints

- `inject()` — no constructor injection
- `ChangeDetectionStrategy.OnPush` — already required
- Signal-first state management
- Named functions for callbacks — no anonymous arrow functions
- No NgModules — standalone component only
- Column must be the **first** column (index 0)
- `null` category must render gracefully — no broken icon or JS error

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

### Completion Notes List

- Used `BaseTableComponent` column-config pattern (ColumnDef array) — added `tooltip?: string` to ColumnDef and `[matTooltip]` in base-table header cell so the "Volatility" tooltip is rendered generically for any column with a tooltip defined.
- The `vol` column uses `@if`/`@else if` blocks in the `cellTemplate` of GlobalUniverseComponent — no `@else` for null/unknown (empty cell renders by default).
- `MatTooltipModule` added to `BaseTableComponent` imports.
- `volatility1yr` and `volatility5yr` added as optional fields to `Universe` interface.
- All existing Angular patterns (OnPush, inject(), signals) already in place — no changes needed.

### File List

- `apps/dms-material/src/app/store/universe/universe.interface.ts`
- `apps/dms-material/src/app/shared/components/base-table/column-def.interface.ts`
- `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`
- `apps/dms-material/src/app/shared/components/base-table/base-table.component.html`
- `apps/dms-material/src/app/global/global-universe/global-universe.columns.ts`
- `apps/dms-material/src/app/global/global-universe/global-universe.component.html`

### Change Log

- 2026-04-21: Story 81.2 implemented. Added Vol column as first column on Universe screen with volatility icon mapping.
