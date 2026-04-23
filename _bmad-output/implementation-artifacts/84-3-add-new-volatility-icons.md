# Story 84.3: Add New Volatility Icon Categories

Status: Approved

## Story

As Dave,
I want three new volatility icon categories — flat, up-then-down, and down-then-up — added to
the "Vol" column,
so that I can recognise distribution patterns that the original four categories (steady,
increasing, decreasing, volatile) do not express.

## Acceptance Criteria

1. **Given** the backend volatility calculation service,
   **When** a symbol's distribution history shows minimal movement (below a defined "flat"
   threshold, distinct from "steady"),
   **Then** the service returns the category `flat`.

2. **Given** a symbol whose distribution rose significantly in the first half of the window and
   then returned toward the original level in the second half,
   **When** the service calculates the category,
   **Then** it returns `up-then-down`.

3. **Given** a symbol whose distribution fell significantly in the first half of the window and
   then recovered toward the original level in the second half,
   **When** the service calculates the category,
   **Then** it returns `down-then-up`.

4. **Given** the three new categories are returned by the backend,
   **When** the "Vol" column renders in the Universe screen,
   **Then** each new category has a distinct, recognisable icon (Material icon name via
   `<mat-icon>`) that is visually different from the existing four icons, with an `aria-label`
   attribute.

5. **Given** the expanded category set is committed,
   **When** a code reviewer inspects the calculation unit tests,
   **Then** at least one unit test covers each of the three new category outcomes, in addition
   to the existing four.

6. **Given** `pnpm all` is run,
   **Then** all tests pass.

## Tasks / Subtasks

- [ ] Task 1: Extend the `VolatilityCategory` type (AC: #1, #2, #3)
  - [ ] Read `apps/server/src/app/volatility/volatility-category.type.ts`
  - [ ] Add `'flat'`, `'up-then-down'`, and `'down-then-up'` to the union type
  - [ ] Update `apps/dms-material/src/app/global/global-universe/services/volatility-result.interface.ts`
        to include the three new categories in the `volatility1yr` and `volatility5yr` fields
  - [ ] These two files must stay in sync — both must list all 7 categories plus `null`

- [ ] Task 2: Implement `flat` detection in `calculateVolatility` (AC: #1)
  - [ ] Read `apps/server/src/app/volatility/volatility-calculation.function.ts`
  - [ ] Define a `FLAT_CV_THRESHOLD` constant (suggest a smaller threshold than
        `STEADY_CV_THRESHOLD`, e.g., `0.02` = 2% CV — near-zero movement)
  - [ ] Add `flat` detection before the `steady` check:
    - If CV < `FLAT_CV_THRESHOLD` → return `'flat'`
  - [ ] Adjust `steady` threshold if needed so that `flat` and `steady` are meaningfully
        distinct (e.g., `flat` = CV < 0.02, `steady` = CV < 0.10)
  - [ ] Document the threshold values and rationale in Dev Notes

- [ ] Task 3: Implement `up-then-down` and `down-then-up` detection (AC: #2, #3)
  - [ ] In `calculateVolatility`, after the linear regression slope check (which handles
        `increasing` and `decreasing`), add split-window analysis:
    - Split the `amounts` array in half: `firstHalf = amounts.slice(0, n/2)`,
      `secondHalf = amounts.slice(n/2)`
    - Calculate the mean of each half
    - If `firstHalf mean > secondHalf mean` by a significant margin (suggest ≥ 15% difference)
      AND the original slope is near-zero or ambiguous: return `'up-then-down'`
    - If `secondHalf mean > firstHalf mean` by a significant margin AND slope is near-zero
      or ambiguous: return `'down-then-up'`
  - [ ] Define a `HALF_WINDOW_THRESHOLD` constant (e.g., `0.15` = 15% difference)
  - [ ] These new checks must come AFTER `increasing`/`decreasing` — only fire when the
        overall trend is not clearly monotonic
  - [ ] Use named helper functions — no anonymous arrow functions
  - [ ] Document algorithm with thresholds and reasoning in Dev Notes

- [ ] Task 4: Write unit tests for all 7 categories (AC: #5)
  - [ ] Read `apps/server/src/app/volatility/volatility-calculation.function.spec.ts`
  - [ ] Add test cases for:
    - `flat`: 12+ months of near-identical amounts (e.g., all `1.00`) → `'flat'`
    - `up-then-down`: 24 months — first 12 at `2.00`, second 12 at `1.00` → `'up-then-down'`
    - `down-then-up`: 24 months — first 12 at `1.00`, second 12 at `2.00` → `'down-then-up'`
  - [ ] Existing test cases (`steady`, `increasing`, `decreasing`, `volatile`, `null`) must
        still pass — do not modify them unless the threshold changes require it
  - [ ] If existing `steady` test cases now resolve to `flat` due to threshold changes, update
        those test cases with amounts in the `flat` < CV < `steady` range instead

- [ ] Task 5: Update the Angular Vol column template (AC: #4)
  - [ ] Read `apps/dms-material/src/app/global/global-universe/global-universe.component.html`
  - [ ] Find the `@switch (column.field)` → `@case ('vol')` block
  - [ ] Add `@else if` branches for the three new categories:
    - `flat`: suggest Material icon `drag_handle` (horizontal dash / flat line)
    - `up-then-down`: suggest Material icon `north_east` + `south_east` or `change_history`
      or custom SVG — use `swap_vert` as a placeholder if a perfect icon is not available
    - `down-then-up`: suggest `vertical_align_center` or `swap_vert` with a different
      `aria-label`
  - [ ] Each `<mat-icon>` must have an `aria-label` attribute (e.g., `aria-label="Volatility: flat"`)
        and a `matTooltip` (e.g., `matTooltip="Flat"`)
  - [ ] Follow the exact same pattern as the existing four icons in the template

- [ ] Task 6: Verify icons render in the browser (AC: #4)
  - [ ] Start the dev server: `pnpm nx run server:serve` and `pnpm nx run dms-material:serve`
  - [ ] Use Playwright MCP server to navigate to the Universe screen
  - [ ] If any symbol in the live database happens to qualify for the new categories, confirm
        the icon renders
  - [ ] If no live data qualifies, manually verify the template renders by temporarily
        hardcoding a row's volatility value in the browser devtools and confirming the icon
        appears

- [ ] Task 7: Run `pnpm all` and confirm all tests pass (AC: #6)
  - [ ] Run `pnpm all` from workspace root
  - [ ] All 7 unit test categories must pass
  - [ ] All existing E2E tests must pass
  - [ ] No TypeScript errors

## Dev Notes

### Current Type (before this story)

```typescript
// apps/server/src/app/volatility/volatility-category.type.ts
export type VolatilityCategory =
  | 'decreasing'
  | 'increasing'
  | 'steady'
  | 'volatile'
  | null;
```

### Target Type (after this story)

```typescript
export type VolatilityCategory =
  | 'decreasing'
  | 'down-then-up'
  | 'flat'
  | 'increasing'
  | 'steady'
  | 'up-then-down'
  | 'volatile'
  | null;
```

### Algorithm Extension

The existing `calculateVolatility` function processes amounts in this order:
1. Insufficient data guard (< 12 items → `null`)
2. Mean = 0 guard → `null`
3. CV < `STEADY_CV_THRESHOLD` → `'steady'`
4. Linear regression slope → `'increasing'` or `'decreasing'`
5. Default → `'volatile'`

The extended order should be:
1. Insufficient data guard (< 12 items → `null`)
2. Mean = 0 guard → `null`
3. CV < `FLAT_CV_THRESHOLD` (new) → `'flat'`
4. CV < `STEADY_CV_THRESHOLD` → `'steady'`
5. Linear regression slope → `'increasing'` or `'decreasing'`
6. Split-window half-mean comparison (new) → `'up-then-down'` or `'down-then-up'`
7. Default → `'volatile'`

### Suggested Thresholds (to be validated with unit tests)

| Threshold | Constant | Suggested Value | Rationale |
| --------- | -------- | --------------- | --------- |
| Flat CV ceiling | `FLAT_CV_THRESHOLD` | `0.02` | < 2% variation = essentially no movement |
| Half-window difference | `HALF_WINDOW_THRESHOLD` | `0.15` | 15% mean difference between halves |

The developer should adjust these values so that the unit tests pass with realistic data.
Document the final values and their rationale in the Dev Agent Record.

### Icon Mapping (Suggested)

| Category | Material Icon | Rationale |
| -------- | ------------- | --------- |
| `flat` | `drag_handle` | Horizontal dash — visually flat |
| `up-then-down` | `change_history` or `expand_less` | Rose then fell |
| `down-then-up` | `expand_more` or `vertical_align_bottom` | Fell then recovered |

Use `aria-label="Volatility: flat"`, `aria-label="Volatility: up-then-down"`, and
`aria-label="Volatility: down-then-up"` — these are used by Story 84.4's E2E tests.

### Angular Code Pattern

Follow the existing template pattern in `global-universe.component.html`:
```html
@else if (row.volatility1yr === 'flat') {
<mat-icon aria-label="Volatility: flat" matTooltip="Flat">drag_handle</mat-icon>
} @else if (row.volatility1yr === 'up-then-down') {
<mat-icon aria-label="Volatility: up-then-down" matTooltip="Up then Down">change_history</mat-icon>
} @else if (row.volatility1yr === 'down-then-up') {
<mat-icon aria-label="Volatility: down-then-up" matTooltip="Down then Up">expand_more</mat-icon>
}
```

### Files to Modify

| File | Change |
| ---- | ------ |
| `apps/server/src/app/volatility/volatility-category.type.ts` | Add 3 new union members |
| `apps/server/src/app/volatility/volatility-calculation.function.ts` | Add flat, up-then-down, down-then-up logic |
| `apps/server/src/app/volatility/volatility-calculation.function.spec.ts` | Add 3 new test cases |
| `apps/dms-material/src/app/global/global-universe/services/volatility-result.interface.ts` | Add 3 new union members |
| `apps/dms-material/src/app/global/global-universe/global-universe.component.html` | Add 3 new @else if blocks |

### Key Commands

```bash
# Run only the volatility unit tests during development
pnpm nx run server:test -- --testPathPattern="volatility-calculation"

# Run full suite
pnpm all

# Start dev stack for visual verification
pnpm nx run server:serve &
pnpm nx run dms-material:serve
```

### References

- [Source: apps/server/src/app/volatility/volatility-category.type.ts]
- [Source: apps/server/src/app/volatility/volatility-calculation.function.ts]
- [Source: apps/server/src/app/volatility/volatility-calculation.function.spec.ts]
- [Source: apps/dms-material/src/app/global/global-universe/global-universe.component.html]
- [Source: apps/dms-material/src/app/global/global-universe/services/volatility-result.interface.ts]
- [Source: _bmad-output/planning-artifacts/epics-2026-04-23.md#story-843]
