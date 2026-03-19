# Story 8.2: Create Stories for Display-Only Components

Status: ready-for-dev

## Story

As a developer,
I want a Storybook story for every display-only (presentational) component in `dms-material`,
so that components can be developed, reviewed, and tested in isolation.

## Acceptance Criteria

1. **Given** each component identified as display-only (no route, no service injection, input/output or signal based),
   **When** I create a `*.stories.ts` file for each component,
   **Then** the story renders the component with representative data in all significant visual states (default, empty, loading, error where applicable).

2. **And** every story compiles without TypeScript errors.

3. **And** `pnpm storybook:build` produces a static Storybook bundle without errors.

## Tasks / Subtasks

- [ ] Identify all display-only components (AC: 1)
  - [ ] Scan `apps/dms-material/src/app/` for components with no route registration and no service injection
  - [ ] Components that only use `input()` / `output()` signals for data are display-only
  - [ ] Document the list of display-only components
- [ ] Create story files for each component (AC: 1)
  - [ ] For each display-only component, create a co-located `{component}.stories.ts`
  - [ ] Pass data directly via `input()` signal values — no store wiring needed
  - [ ] Include story variants for significant visual states:
    - [ ] Default state with representative data
    - [ ] Empty state (if applicable)
    - [ ] Loading state (if applicable)
    - [ ] Error state (if applicable)
  - [ ] Follow naming convention: `title: '{Feature}/{ComponentName}'`
  - [ ] Story export names in PascalCase: `Default`, `EmptyState`, etc.
- [ ] Verify TypeScript compilation (AC: 2)
  - [ ] All story files compile without TS errors
  - [ ] Run `pnpm all` to ensure no regressions
- [ ] Build static Storybook (AC: 3)
  - [ ] Run `pnpm storybook:build`
  - [ ] Verify bundle builds without errors
  - [ ] Verify all stories render in the built bundle

## Dev Notes

### Architecture Constraints (ADR-001)

- Display-only components: pass data directly via `input()` signal values — no store wiring needed
- Story files are co-located with components as `*.stories.ts`
- Do NOT use `TestBed` in stories — use `applicationConfig` decorator if providers needed
- All components use `ChangeDetectionStrategy.OnPush` and signal-based state

### Story File Pattern

```typescript
import type { Meta, StoryObj } from '@storybook/angular';
import { MyComponent } from './my-component';

const meta: Meta<MyComponent> = {
  title: 'Feature/MyComponent',
  component: MyComponent,
};

export default meta;
type Story = StoryObj<MyComponent>;

export const Default: Story = {
  args: {
    // input() signal values
    myInput: 'value',
  },
};
```

### Anti-Patterns

- NEVER use `TestBed` inside Storybook stories
- NEVER wire up real SmartNgRX store in display component stories
- Use `applicationConfig` decorator for providers if needed (not `TestBed`)

### Component Input Pattern

All components use Angular signal-based inputs:
```typescript
myInput = input.required<string>();
myOptionalInput = input<number>(0);
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 8, Story 8.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-001]
- [Source: _bmad-output/planning-artifacts/architecture.md#Structure Patterns — E8]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
