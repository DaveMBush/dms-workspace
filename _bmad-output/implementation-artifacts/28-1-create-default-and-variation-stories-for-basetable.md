# Story 28.1: Create Default and Variation Stories for BaseTable

Status: Approved

## Story

As a developer,
I want `BaseTableComponent` to have a co-located Storybook stories file with a Default story and key variation stories,
so that design reviewers and developers can inspect the component in isolation across its supported configurations.

## Acceptance Criteria

1. **Given** Storybook is running, **When** the `BaseTable` story group is selected, **Then** at least three stories are available: `Default` (5–10 data rows), `EmptyState` (zero rows), and `UniverseTableVariation` (columns and data representative of the Universe screen).
2. **Given** the `Default` story, **When** it renders, **Then** it shows selectable rows (`selectable: true`), sort headers, and at least 5 mock data rows with realistic-looking content.
3. **Given** the `EmptyState` story, **When** it renders, **Then** the table displays correctly with zero rows — no JavaScript errors and an appropriate empty-state message (if the component supports one).
4. **Given** the `UniverseTableVariation` story, **When** it renders, **Then** column definitions mirror the Universe table structure (ticker, name, price, market cap, etc.) with mock data.
5. **Given** the stories file, **When** `pnpm nx run dms-material:build-storybook` executes, **Then** Storybook builds without errors.

## Definition of Done

- [ ] `base-table.stories.ts` created co-located with `base-table.component.ts`
- [ ] Three stories: Default, EmptyState, UniverseTableVariation
- [ ] Storybook build succeeds
- [ ] Run `pnpm all`
- [ ] Run `pnpm nx run dms-material:build-storybook`
- [ ] Run `pnpm format`
- [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Study `BaseTableComponent` API (AC: #1))
  - [ ] Read `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts`
  - [ ] Document all `input()` signals (rows, columns, rowHeight, selectable, bufferSize, etc.)
  - [ ] Identify the column definition type/interface used by the component
- [ ] Create stories file (AC: #1–#4)
  - [ ] Create `apps/dms-material/src/app/shared/components/base-table/base-table.stories.ts`
  - [ ] Set `title: 'Shared/BaseTable'` in the Meta
  - [ ] Write `Default` story:
    - `selectable: true`
    - 5–10 rows of mock data with string/number columns
    - Sort enabled
  - [ ] Write `EmptyState` story:
    - `rows: []`
    - Confirm component renders without crashing
  - [ ] Write `UniverseTableVariation` story:
    - Columns: ticker, name, price, marketCap, sector (or whatever Universe uses)
    - 8 rows of mock universe-like data
- [ ] Validate Storybook build (AC: #5)
  - [ ] Run `pnpm nx run dms-material:build-storybook`
  - [ ] Fix any import or type errors that surface

## Dev Notes

### Key Files

- `apps/dms-material/src/app/shared/components/base-table/base-table.component.ts` — component source
- `apps/dms-material/src/app/shared/components/base-table/base-table.stories.ts` — NEW file (co-located)
- `apps/dms-material/.storybook/` — Storybook config (reference for global setup)

### BaseTableComponent Key Inputs (known at story creation)

```typescript
rowHeight = input<number>(52);
bufferSize = input<number>(10);
selectable = input<boolean>(false);
// rows/columns inputs — verify exact names and types from source
```

### Angular Storybook Pattern

```typescript
import { Meta, StoryObj } from '@storybook/angular';
import { BaseTableComponent } from './base-table.component';

const meta: Meta<BaseTableComponent> = {
  title: 'Shared/BaseTable',
  component: BaseTableComponent,
};
export default meta;

type Story = StoryObj<BaseTableComponent>;

export const Default: Story = {
  args: {
    rows: [ /* mock data */ ],
    selectable: true,
  },
};
```

### Dependencies

- This story has no upstream dependencies
- Story 28.2 depends on this story

### References

[Source: apps/dms-material/src/app/shared/components/base-table/base-table.component.ts]
[Source: apps/dms-material/.storybook/preview.ts]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
