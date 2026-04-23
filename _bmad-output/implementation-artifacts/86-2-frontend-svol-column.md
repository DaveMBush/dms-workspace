# Story 86.2: Add SVol Column to Universe Screen

Status: Approved

## Story

As Dave,
I want to see a "SVol" column as the 2nd column on the Universe screen, immediately after the
"Vol" column, showing the 1-year (short-term) distribution volatility icon for each symbol,
so that I can compare short-term and long-term distribution behaviour at a glance without
leaving the Universe screen.

## Acceptance Criteria

1. **Given** the Universe screen is loaded,
   **When** the component initialises,
   **Then** the "SVol" column appears as the 2nd column in the table, immediately to the right
   of the "Vol" column (which remains the 1st column).

2. **Given** the "SVol" column header,
   **When** a user hovers over it,
   **Then** a tooltip with the text "Short-Term Volatility" is displayed.

3. **Given** a symbol with a non-null `volatilityShort` category in its row data,
   **When** its row is rendered in the "SVol" column,
   **Then** the same icon rendering pattern used by "Vol" renders the appropriate icon for
   the short-term category, with a matching `aria-label` attribute.

4. **Given** a symbol with a `null` `volatilityShort` value (insufficient data),
   **When** its row is rendered,
   **Then** the "SVol" cell shows no icon (neutral placeholder) — no error and no broken icon.

5. **Given** the Angular component uses `OnPush` change detection and `inject()`,
   **When** a code reviewer inspects the implementation,
   **Then** no constructor injection, no Zone.js workarounds, and no `detectChanges()` calls
   are present in the new column code.

6. **Given** `pnpm all` is run,
   **Then** all tests pass.

## Tasks / Subtasks

- [ ] Task 1: Add SVol column definition to `UNIVERSE_COLUMNS` (AC: #1, #2)
  - [ ] Open `apps/dms-material/src/app/global/global-universe/global-universe.columns.ts`
  - [ ] Insert a new column entry immediately **after** the existing `vol` entry (index 0 → becomes index 1):
    ```typescript
    {
      field: 'svol',
      header: 'SVol',
      tooltip: 'Short-Term Volatility',
      width: '50px',
    }
    ```
  - [ ] Confirm the `ColumnDef` interface in `base-table/column-def.interface.ts` supports a `tooltip` property — if not, add it or use an existing pattern (check how `vol` column tooltip is implemented)

- [ ] Task 2: Add SVol column rendering to the template (AC: #3, #4)
  - [ ] Open `apps/dms-material/src/app/global/global-universe/global-universe.component.html`
  - [ ] Locate the `@case ('vol')` block in the `@switch (column.field)` statement
  - [ ] Add a `@case ('svol')` block immediately after the `@case ('vol')` block
  - [ ] The `svol` case must replicate the exact same `@if/@else if` chain as `vol` but read from `row.volatilityShort` instead of `row.volatilityLong`:
    ```html
    @case ('svol') {
      @if (row.volatilityShort === 'steady') {
        <mat-icon aria-label="Short-Term Volatility: steady" matTooltip="Steady (Short-Term)"
          >trending_flat</mat-icon>
      } @else if (row.volatilityShort === 'increasing') {
        <mat-icon aria-label="Short-Term Volatility: increasing" matTooltip="Increasing (Short-Term)"
          >trending_up</mat-icon>
      } @else if (row.volatilityShort === 'decreasing') {
        <mat-icon aria-label="Short-Term Volatility: decreasing" matTooltip="Decreasing (Short-Term)"
          >trending_down</mat-icon>
      } @else if (row.volatilityShort === 'volatile') {
        <mat-icon aria-label="Short-Term Volatility: volatile" matTooltip="Volatile (Short-Term)"
          >show_chart</mat-icon>
      }
      @* After Epic 84: add flat / up-then-down / down-then-up cases to match vol column *@
    }
    ```
  - [ ] Confirm the `null` case produces no icon output (default `@switch` fall-through)
  - [ ] Ensure icon names and aria-labels match those used in the `vol` column exactly (just with `Short-Term Volatility:` prefix in aria-label)

- [ ] Task 3: Confirm `EnrichedUniverse` interface has `volatilityShort` (AC: #3)
  - [ ] Open `apps/dms-material/src/app/global/global-universe/enriched-universe.interface.ts`
  - [ ] Confirm `EnrichedUniverse extends Universe` and that `Universe` (the store interface) already has `volatilityShort: string | null` from Story 86.1
  - [ ] If `EnrichedUniverse` needs to add `volatilityShort` explicitly, do so

- [ ] Task 4: Update unit tests for global-universe component (AC: #6)
  - [ ] Open `apps/dms-material/src/app/global/global-universe/global-universe.component.spec.ts`
  - [ ] Add test case: SVol column is present in column definitions
  - [ ] Confirm existing tests still pass after column order change (some tests may assert column count or order)

- [ ] Task 5: Full test run (AC: #6)
  - [ ] Run `pnpm all` and confirm all tests pass

## Dev Notes

### Column Order in `UNIVERSE_COLUMNS`

Current order (from `global-universe.columns.ts`):
1. `vol` — "Vol" (Volatility, 5-year)
2. `symbol` — "Symbol"
3. ... (remaining columns)

After this story:
1. `vol` — "Vol" (Volatility, 5-year)
2. **`svol` — "SVol" (Short-Term Volatility, 1-year)** ← insert here
3. `symbol` — "Symbol"
4. ... (remaining columns)

The `UNIVERSE_COLUMNS` constant is an array — insert at index 1.

### Template Icon Rendering Pattern

Copy the existing `vol` column rendering pattern from `global-universe.component.html`. The
key difference: `vol` reads `row.volatilityLong`, `svol` reads `row.volatilityShort`.

After Epic 84 is complete, the full category set is:
`steady`, `increasing`, `decreasing`, `volatile`, `flat`, `up-then-down`, `down-then-up`

Both `vol` and `svol` columns must handle all seven categories plus `null`.

### OnPush / inject() Compliance

No new component is being created here — we are modifying `global-universe.component.ts` and
its template. The component already uses `OnPush` and `inject()`. Confirm these remain intact
after changes. No `ChangeDetectorRef.detectChanges()` calls allowed.

### Tooltip on Column Header

The `ColumnDef` interface likely uses a `tooltip` property for the column header tooltip.
Check `apps/dms-material/src/app/shared/components/base-table/column-def.interface.ts` to
confirm the exact property name. The `vol` column already has `tooltip: 'Volatility'` — follow
the same pattern for SVol with `tooltip: 'Short-Term Volatility'`.

### aria-label Convention

For the `svol` column icons, use the pattern `"Short-Term Volatility: {category}"`:
- `aria-label="Short-Term Volatility: steady"`
- `aria-label="Short-Term Volatility: increasing"`
- etc.

This differentiates them from `vol` icons (`"Volatility: steady"`) and enables reliable E2E targeting.

### Key Commands

```bash
pnpm nx test dms-material      # Angular unit tests
pnpm nx build dms-material     # TypeScript type check
pnpm start:dms-material        # Dev server (port 4301) for manual verification
pnpm all                       # Full lint + build + test
```

### References

- [apps/dms-material/src/app/global/global-universe/global-universe.columns.ts](apps/dms-material/src/app/global/global-universe/global-universe.columns.ts) — Column definitions array
- [apps/dms-material/src/app/global/global-universe/global-universe.component.html](apps/dms-material/src/app/global/global-universe/global-universe.component.html) — Template with `@case ('vol')` block
- [apps/dms-material/src/app/global/global-universe/global-universe.component.ts](apps/dms-material/src/app/global/global-universe/global-universe.component.ts) — Component (OnPush, inject)
- [apps/dms-material/src/app/global/global-universe/enriched-universe.interface.ts](apps/dms-material/src/app/global/global-universe/enriched-universe.interface.ts) — EnrichedUniverse interface
- [apps/dms-material/src/app/shared/components/base-table/column-def.interface.ts](apps/dms-material/src/app/shared/components/base-table/column-def.interface.ts) — ColumnDef interface
- [apps/dms-material/src/app/store/universe/universe.interface.ts](apps/dms-material/src/app/store/universe/universe.interface.ts) — Frontend Universe interface
- Stories 85.3 and 86.1 must be completed before this story
