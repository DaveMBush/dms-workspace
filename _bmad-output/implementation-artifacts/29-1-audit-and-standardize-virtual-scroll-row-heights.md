# Story 29.1: Audit and Standardize Virtual Scroll Row Heights

Status: Complete

## Story

As a developer,
I want every virtual-scroll table in the application to have its `rowHeight` input value verified against the actual rendered height of a table row,
so that `CdkVirtualScrollViewport` receives an accurate `itemSize` and smooth scrolling is not broken by height mismatches.

## Acceptance Criteria

1. **Given** each screen that uses a virtual-scroll table (Universe, Screener, and any other tables), **When** the audit is performed, **Then** the actual rendered row height (measured in a browser) is recorded for each table.
2. **Given** the `BaseTableComponent` default `rowHeight = input<number>(52)`, **When** the audit is complete, **Then** it is confirmed whether `52px` matches the actual rendered row height; if not, the correct value is applied.
3. **Given** any mismatch between `rowHeight` input and actual rendered height, **When** the mismatch is corrected, **Then** the `rowHeight` input (or component-specific override) is updated to match the measured value.
4. **Given** the audit results, **When** the story completes, **Then** a `row-height-audit.md` document is created in `docs/` recording: each table, its configured `rowHeight`, the measured actual height, and whether they matched.
5. **Given** all changes, **When** `pnpm all` runs, **Then** no TypeScript errors and all tests pass.

## Definition of Done

- [ ] All virtual-scroll tables identified and measured (or measurement documented via Playwright)
- [ ] Any `rowHeight` mismatches corrected in component or template
- [ ] `docs/row-height-audit.md` created with findings
- [ ] Run `pnpm all`
- [ ] Run `pnpm format`
- [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Identify all virtual-scroll table usages (AC: #1)
  - [ ] Search `apps/dms-material/src/` for `CdkVirtualScrollViewport`, `cdk-virtual-scroll-viewport`, and `<app-base-table`
  - [ ] List each screen and its current `rowHeight` value (or the default `52` if not overridden)
- [ ] Measure actual rendered row heights (AC: #1, #2)
  - [ ] For each identified table, use one of these approaches:
    - **Playwright approach:** navigate to the page, query `document.querySelector('.mat-mdc-row')`, measure `getBoundingClientRect().height`
    - **Manual approach:** use browser DevTools to inspect a rendered row's computed height
  - [ ] Record each measured height
- [ ] Correct mismatches (AC: #3)
  - [ ] For each table where `rowHeight !== measuredHeight`, update the `rowHeight` input value:
    - If using default: add explicit `[rowHeight]="measuredValue"` binding in the parent component template
    - If already explicitly bound: update to the correct value
  - [ ] If all tables match the default `52`, no template changes needed — document the confirmation
- [ ] Write audit document (AC: #4)
  - [ ] Create `docs/row-height-audit.md`
  - [ ] Table format: | Screen | Component | Configured rowHeight | Measured Height | Match? | Action Taken |
  - [ ] Include date of audit and Angular/CDK version
- [ ] Validate (AC: #5)
  - [ ] Run `pnpm all`

## Dev Notes

### Key Files

- `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts` — `rowHeight = input<number>(52)` and `bufferSize = input<number>(10)`
- `apps/dms-material/src/app/global/global-universe/global-universe.component.ts` — likely uses BaseTable
- `apps/dms-material/src/app/global/global-screener/global-screener.component.ts` — likely uses BaseTable
- `apps/dms-material-e2e/` — Playwright if measurement is automated
- `docs/row-height-audit.md` — NEW file to create

### How CdkVirtualScrollViewport Uses rowHeight

`BaseTableComponent` passes `rowHeight` as the `itemSize` to `CdkVirtualScrollViewport`. If `itemSize` is wrong:

- If too small: scroll position jumps (viewport thinks items are smaller than they are)
- If too large: gaps appear between items

The **measured height** that matters is the full height of a `<tr class="mat-mdc-row">` element including any padding, borders, and separator lines.

### Playwright Measurement Snippet (for reference)

```typescript
const rowHeight = await page.evaluate(() => {
  const row = document.querySelector('.mat-mdc-row');
  return row ? row.getBoundingClientRect().height : null;
});
```

### Story 29.2 Dependency

Story 29.2 writes a Playwright smooth-scroll verification test. This audit (29.1) should ensure the row heights are correct before that test runs, so Story 29.2's test does not pass a broken measurement.

### References

[Source: apps/dms-material/src/app/shared/components/base-table/base-table.component.ts]
[Source: apps/dms-material/src/app/global/global-universe/]
[Source: apps/dms-material/src/app/global/global-screener/]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None required — clean implementation.

### Completion Notes List

- Audited all 4 BaseTable consumers: global-universe, global-screener, dividend-deposits, account (open-positions)
- Measured actual row height via Playwright: 52px across all tables in both themes
- 3 templates had `[rowHeight]="48"` overrides creating a 4px mismatch — removed them
- Account open-positions already used the default (no override) — confirmed correct
- Created `docs/row-height-audit.md` documenting all findings
- Updated `QUICK-REFERENCE.md` default from 48 → 52
- All validation passed: CI=1 pnpm all (1691 tests), E2E Chromium (593), E2E Firefox (593), dupcheck, format
- PR #832, closes #831

### File List

- `apps/dms-material/src/app/account-panel/dividend-deposits/dividend-deposits.component.html` — removed `[rowHeight]="48"`
- `apps/dms-material/src/app/global/global-screener/global-screener.component.html` — removed `[rowHeight]="48"`
- `apps/dms-material/src/app/global/global-universe/global-universe.component.html` — removed `[rowHeight]="48"`
- `apps/dms-material/src/app/shared/components/base-table/QUICK-REFERENCE.md` — updated default 48→52
- `docs/row-height-audit.md` — NEW audit document
