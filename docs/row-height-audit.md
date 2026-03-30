# Row Height Audit

**Date:** 2026-03-29
**Story:** 29.1
**Issue:** #831

## Method

1. Searched all usages of `dms-base-table`, `cdk-virtual-scroll-viewport`, and `rowHeight` in `apps/dms-material/src/`.
2. Measured the actual rendered row height using Playwright by reading the Angular Material CSS custom property `--mat-table-row-item-container-height` at runtime. Confirmed header row renders at 56px and data row CSS is set to **52px**.
3. Cross-referenced the `BaseTableComponent.rowHeight` input default (52) against all consumer bindings.

## Angular Material Row Height

- CSS: `.mat-mdc-row { height: var(--mat-table-row-item-container-height, 52px); }`
- No theme override of `--mat-table-row-item-container-height` anywhere in the project.
- **Actual rendered data row height: 52px**
- Header row height: 56px

## Audit Results

| Screen            | Component                          | Configured rowHeight | Measured Height | Match? | Action Taken                                    |
| ----------------- | ---------------------------------- | -------------------- | --------------- | ------ | ----------------------------------------------- |
| Global Universe   | `global-universe.component.html`   | 48 (explicit)        | 52px            | **No** | Removed `[rowHeight]="48"`, now uses default 52 |
| Global Screener   | `global-screener.component.html`   | 48 (explicit)        | 52px            | **No** | Removed `[rowHeight]="48"`, now uses default 52 |
| Dividend Deposits | `dividend-deposits.component.html` | 48 (explicit)        | 52px            | **No** | Removed `[rowHeight]="48"`, now uses default 52 |
| Open Positions    | `open-positions.component.html`    | 52 (default)         | 52px            | Yes    | No change needed                                |
| Sold Positions    | `sold-positions.component.html`    | 52 (default)         | 52px            | Yes    | No change needed                                |

## Documentation Fix

The `QUICK-REFERENCE.md` listed the default `rowHeight` as `48`, but the actual component default is `52`. Updated to `52`.

## Impact

The 4px mismatch (configured 48 vs actual 52) caused the CDK virtual scroll viewport to miscalculate scroll positions. With `[itemSize]="48"` but rows rendering at 52px, the viewport would:

- Underestimate total scroll height (fewer pixels allocated than needed)
- Show slight misalignment when scrolling to specific rows
- Render slightly fewer buffer rows than intended
