# Story 33.1: Add Fixed-Size Host Wrapper to BaseTable Storybook Stories

Status: Approved

## Story

As a developer,
I want the BaseTable Storybook stories to render the component visibly within Storybook,
so that I can inspect and test the table's appearance and behaviour in isolation without the component being invisible due to an unconstrained container height.

## Acceptance Criteria

1. **Given** the current `base-table.stories.ts` where `Default`, `EmptyState`, and `UniverseTableVariation` stories render with an unconstrained container (zero or inherited height), **When** the fix is applied, **Then** each story wraps the `BaseTableComponent` in a host container with explicit dimensions (`height: 500px; width: 100%; display: block;` or equivalent) so the `cdk-virtual-scroll-viewport` has a bounded container to render into.
2. **Given** Storybook running locally (`pnpm storybook`), **When** navigating to `Shared/BaseTable → Default`, **Then** the table is visibly rendered with a header row and at least the mock data rows visible.
3. **Given** Storybook running locally, **When** navigating to `Shared/BaseTable → EmptyState`, **Then** the table renders visibly within the bounded container (no JavaScript errors, visible empty state or table structure).
4. **Given** Storybook running locally, **When** navigating to `Shared/BaseTable → UniverseTableVariation`, **Then** the full universe-column table (ticker, name, price, market cap, sector, P/E ratio) renders visibly with all 10 mock rows.
5. **Given** the fix uses the `decorators` array with an inline wrapper element, **When** the stories file is reviewed, **Then** it follows the ADR-001 Storybook pattern (no TestBed patterns, no `applicationConfig` unless needed for providers).
6. **Given** `pnpm nx run dms-material:build-storybook` runs, **Then** Storybook builds without errors.
7. **Given** all changes, **When** `pnpm all` runs, **Then** it passes.

## Definition of Done

- [ ] `base-table.stories.ts` updated with host wrapper on all three stories
- [ ] Stories visibly render in `pnpm storybook`
- [ ] `pnpm nx run dms-material:build-storybook` succeeds
- [ ] `pnpm all` passes
- [ ] Run `pnpm format`
- [ ] Repeat all if any fail

## Tasks / Subtasks

- [ ] Understand why stories are currently invisible (AC: #1)
  - [ ] `BaseTableComponent` uses `<cdk-virtual-scroll-viewport>` which requires a bounded height from its container to render rows
  - [ ] In Storybook, the story canvas provides an unconstrained / zero-height container by default
  - [ ] The fix is to add a `decorators` wrapper that provides a fixed height
- [ ] Apply host wrapper using `decorators` on the Meta (AC: #1, #5)
  - [ ] Add a `decorators` array to the `meta` object that wraps the story with a div providing explicit dimensions
  - [ ] See Dev Notes for the exact pattern to use
- [ ] Verify `Default` story renders visibly (AC: #2)
  - [ ] Open Storybook (`pnpm storybook`) and navigate to `Shared/BaseTable → Default`
  - [ ] Confirm header row visible, 8 mock data rows visible
- [ ] Verify `EmptyState` story renders visibly (AC: #3)
  - [ ] Navigate to `Shared/BaseTable → EmptyState`
  - [ ] Confirm table structure visible (even if no rows)
- [ ] Verify `UniverseTableVariation` story renders visibly (AC: #4)
  - [ ] Navigate to `Shared/BaseTable → UniverseTableVariation`
  - [ ] Confirm 10 universe rows and all 6 columns visible
- [ ] Build Storybook (AC: #6)
  - [ ] Run `pnpm nx run dms-material:build-storybook`
  - [ ] Fix any TypeScript or build errors
- [ ] Run `pnpm all` (AC: #7)

## Dev Notes

### Key File

- `apps/dms-material/src/app/shared/components/base-table/base-table.stories.ts` — THE ONLY file that needs changes

### Root Cause

`BaseTableComponent` contains a `<cdk-virtual-scroll-viewport>` which renders no rows unless its container has a defined height. In Storybook, without an explicit height, the viewport height calculates as 0, and CDK determines there is no visible area to render rows into.

### Fix Pattern — Global Decorator on Meta

The recommended approach is to add a `decorators` array at the `meta` level so all stories in the file get the wrapper automatically:

```typescript
const meta: Meta<BaseTableComponent<SampleRow>> = {
  component: BaseTableComponent,
  title: 'Shared/BaseTable',
  decorators: [
    (story) => ({
      template: `<div style="height: 500px; width: 100%; display: block;">${story().template}</div>`,
      props: story().props,
    }),
  ],
  argTypes: {
    sortChange: { action: 'sortChange' },
    rowClick: { action: 'rowClick' },
    selectionChange: { action: 'selectionChange' },
    renderedRangeChange: { action: 'renderedRangeChange' },
  },
};
```

### Alternative Fix Pattern — `moduleMetadata` + wrapper template

If the decorator approach above doesn't work well with `@storybook/angular`, use the `render` property on each story:

```typescript
export const Default: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div style="height: 500px; width: 100%; display: block;">
        <dms-base-table
          [data]="data"
          [columns]="columns"
          [tableLabel]="tableLabel"
          [rowHeight]="rowHeight"
          [loading]="loading"
          [selectable]="selectable"
          [multiSelect]="multiSelect"
          [sortColumns]="sortColumns"
        ></dms-base-table>
      </div>
    `,
  }),
  args: {
    data: sampleData,
    columns: sampleColumns,
    tableLabel: 'Sample positions table',
    rowHeight: 52,
    loading: false,
    selectable: true,
    multiSelect: false,
    sortColumns: [{ column: 'name', direction: 'asc' }],
  },
};
```

### BaseTableComponent Selector

Check the component's `selector` in `base-table.component.ts`. It is likely `dms-base-table` or `app-base-table`. Use the correct selector in any template string.

### ADR-001 Pattern Notes

From the architecture:

- Display-only components: pass data via `input()` signal values — no store wiring needed
- Use `applicationConfig` decorator with providers array if providers are needed
- Story export naming: PascalCase (Default, EmptyState, UniverseTableVariation) — already correct
- Stories file naming: `{ComponentName}.stories.ts` co-located — already correct
- Story title format: `'{Feature}/{ComponentName}'` — already set to `'Shared/BaseTable'`

### Existing Stories Data (already in file — do not regenerate)

The file already has:

- `sampleData` (8 rows: AAPL, GOOG, MSFT, AMZN, NVDA, META, TSLA, BRK.B)
- `universeData` (10 rows: AAPL, MSFT, GOOGL, AMZN, NVDA, JPM, JNJ, XOM, PG, V)
- `sampleColumns` (name, ticker, value)
- `universeColumns` (ticker, name, price, marketCap, sector, peRatio)
- Three exported stories: `Default`, `EmptyState`, `UniverseTableVariation`

The ONLY change needed is adding the host wrapper. Do not touch the data, column definitions, or story args.

### References

[Source: apps/dms-material/src/app/shared/components/base-table/base-table.stories.ts — existing file]
[Source: apps/dms-material/src/app/shared/components/base-table/base-table.component.html — uses cdk-virtual-scroll-viewport]
[Source: apps/dms-material/.storybook/preview.ts — global Storybook setup]
[Source: _bmad-output/planning-artifacts/architecture.md#Storybook (ADR-001)]
[Source: _bmad-output/planning-artifacts/epics-2026-03-30.md — Epic 33]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
