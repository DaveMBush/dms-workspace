# Story 51.1: Change Risk Group Dropdown `panelWidth` from `"auto"` to `""` and Verify with Playwright

Status: Approved

## Story

As a trader,
I want the Risk Group filter dropdown panel to be as wide as it needs to be to show every option on a single line,
so that I can read and select the correct risk group without text wrapping.

## Acceptance Criteria

1. **Given** the `@case ('risk_group')` block in `global-universe.component.html` currently has `panelWidth="auto"` on the `mat-select`, **When** the developer changes the value to `panelWidth=""`, **Then** the attribute in the source file reads `panelWidth=""` (empty string).
2. **Given** the updated template is served, **When** the Playwright MCP server opens the Universe screen and clicks the Risk Group filter trigger, **Then** the open dropdown panel is wide enough for all option labels to appear on a single line with no text wrapping.
3. **Given** the dropdown panel is open, **When** the Playwright MCP server measures the width of the panel overlay, **Then** the panel width equals or exceeds the width of the widest option label.
4. **Given** the Risk Group filter is in its collapsed (closed) state, **When** the Universe screen is rendered, **Then** the trigger field width remains constrained to the column width (unchanged from before).
5. **Given** all changes are applied, **When** `pnpm all` runs, **Then** all unit tests pass with no regressions.

## Tasks / Subtasks

- [ ] Change `panelWidth="auto"` to `panelWidth=""` in the `@case ('risk_group')` block (AC: #1)
  - [ ] Open `apps/dms-material/src/app/global/global-universe/global-universe.component.html`
  - [ ] Locate the `@case ('risk_group')` block (line ~117)
  - [ ] Change `panelWidth="auto"` to `panelWidth=""` on the `mat-select` element (line ~123)
  - [ ] Save the file
- [ ] Use Playwright MCP server to verify the fix (AC: #2, #3, #4)
  - [ ] Navigate to `/global/universe`
  - [ ] Click the Risk Group filter trigger to open the dropdown
  - [ ] Confirm all option labels appear on a single line with no wrapping
  - [ ] Measure the panel overlay width and confirm it exceeds the widest option label
  - [ ] Close the dropdown and confirm the trigger field is still column-constrained
- [ ] Run `pnpm all` and confirm no regressions (AC: #5)

## Dev Notes

### Key Files

- **Template to change:** `apps/dms-material/src/app/global/global-universe/global-universe.component.html`
  — `@case ('risk_group')` block at approximately line 117; the `mat-select` with `panelWidth="auto"` is at approximately line 123.
- **Existing E2E tests (do NOT modify in this story):** `apps/dms-material-e2e/src/global-universe.spec.ts`
  — contains a `Risk Group Filter` describe block (lines ~140–165) that tests option visibility.
- **Column filter width E2E tests:** `apps/dms-material-e2e/src/universe-column-filter-width.spec.ts`
  — verifies filter inputs stay within column bounds; should not be affected by this change.

### The Fix

Change one attribute value in the `@case ('risk_group')` block. **Before:**

```html
@case ('risk_group') {
<mat-form-field
  appearance="outline"
  subscriptSizing="dynamic"
  class="header-filter w-full"
>
  <mat-select
    panelWidth="auto"
    [value]="riskGroupFilter$()"
    (selectionChange)="onRiskGroupFilterChange($event.value)"
    placeholder="Select One"
  >
    <mat-option [value]="null">All</mat-option>
    @for (group of riskGroupOptions$(); track group.value) {
    <mat-option [value]="group.value">{{ group.label }}</mat-option>
    }
  </mat-select>
</mat-form-field>
}
```

**After:**

```html
@case ('risk_group') {
<mat-form-field
  appearance="outline"
  subscriptSizing="dynamic"
  class="header-filter w-full"
>
  <mat-select
    panelWidth=""
    [value]="riskGroupFilter$()"
    (selectionChange)="onRiskGroupFilterChange($event.value)"
    placeholder="Select One"
  >
    <mat-option [value]="null">All</mat-option>
    @for (group of riskGroupOptions$(); track group.value) {
    <mat-option [value]="group.value">{{ group.label }}</mat-option>
    }
  </mat-select>
</mat-form-field>
}
```

Only the `panelWidth` attribute value changes — everything else is identical.

### Why `panelWidth=""` and Not `panelWidth="auto"`

This corrects a mistake introduced in **Story 49.1**. The Angular Material docs specify:

- `panelWidth="auto"` — sizes the panel overlay to **match the trigger width**. Since the trigger
  (`mat-form-field`) has `class="header-filter w-full"` and is constrained to the column width,
  `"auto"` effectively leaves the panel the same width as the column — the same problem as before.
- `panelWidth=""` (empty string) — **removes** the width constraint on the panel overlay entirely,
  allowing the CDK overlay to grow to the natural width of its content (the widest `mat-option`
  label). The trigger field width is **not** affected; it remains governed by `w-full`.

This is a purely semantic difference between two string values of the same attribute. No other
code changes are required.

### Context and Constraints

- **Pure HTML template change** — no TypeScript changes needed whatsoever.
- **No new components, services, directives, or imports** are required.
- **Angular Material version:** 21.2.x — `panelWidth` is a stable `@Input` on `mat-select`.
- **Zoneless Angular 21** — `inject()`, `OnPush`, signal-first patterns. This change has no
  impact on change detection.
- **`w-full` on `mat-form-field` must not be removed** — it is what keeps the collapsed trigger
  contained within the column. The fix works because `panelWidth` controls the overlay panel
  independently of the trigger's CSS.
- **Tests are authoritative** — do not modify any existing passing test unless this story
  explicitly requires it. Story 51.2 handles E2E test updates.
- The Risk Group options include labels such as "Tax-Free Income", "Preferreds / Income",
  "Equities", "Income" (confirmed in existing E2E tests and runtime data). The longest label
  determines the natural panel width under `panelWidth=""`.

### Playwright MCP Verification Steps

After making the change and with the dev server running (`pnpm start:dms-material`):

1. Open the Universe screen at `http://localhost:4200/global/universe`.
2. Locate the Risk Group filter trigger in the column header filter row.
3. Click the trigger to open the dropdown panel overlay.
4. Inspect each option label: none should wrap to a second line.
5. Use `page.locator('.cdk-overlay-pane').boundingBox()` to measure the panel width.
6. Confirm the panel width is ≥ the width of the widest option text.
7. Close the dropdown (press Escape or click away).
8. Confirm the collapsed trigger still occupies only the column width.

### Key Commands

- Run all tests: `pnpm all`
- Start frontend dev server: `pnpm start:dms-material`
- Run E2E tests only: `pnpm nx e2e dms-material-e2e`

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-04-06b.md — Story 51.1]
- [Source: _bmad-output/implementation-artifacts/49-1-fix-riskgroup-dropdown-panel-width.md]
- [Source: apps/dms-material/src/app/global/global-universe/global-universe.component.html]
- [Source: apps/dms-material-e2e/src/global-universe.spec.ts]
- [Source: apps/dms-material-e2e/src/universe-column-filter-width.spec.ts]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

### Completion Notes List

### File List
