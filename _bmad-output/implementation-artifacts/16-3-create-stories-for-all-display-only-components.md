# Story 16.3: Create Stories for All Display-Only Components

Status: ready-for-dev

## Story

As a developer,
I want a Storybook story for every display-only (presentational) component in `dms-material`,
So that each component can be developed and reviewed in isolation with representative data.

## Acceptance Criteria

1. **Given** each display-only component identified in the project (no route, no direct service injection, input/output or signal-based)
   **When** I create a `*.stories.ts` file using the format expected by `@nx/storybook` for Angular
   **Then** each story file has the correct default export meta object with `component`, `title`, and other required Storybook CSF3 fields
   **And** each story covers at minimum: default/normal state, and any significant visual variant (empty, loading, error where applicable)
   **And** every story compiles without TypeScript errors
   **And** `pnpm nx run dms-material:build-storybook` completes without errors

2. **Given** a story for a component with required `@Input()` (or `input.required<T>()`) properties
   **When** the story provides values for all required inputs
   **Then** the component renders with those values without any "undefined" access errors
   **And** no console errors appear for that story

## Definition of Done

- [ ] Stories created for all identified display-only components
- [ ] All stories compile without TypeScript errors
- [ ] `pnpm nx run dms-material:build-storybook` succeeds
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Inventory display-only components in `apps/dms-material/src/` (AC: 1)
  - [ ] A display-only component has NO route, NO direct service injection (no `inject(SomeService)`)
  - [ ] It communicates exclusively via `input()` / `output()` signals or `@Input()`/`@Output()`
  - [ ] List all such components found
- [ ] For each display-only component, create `<component-name>.stories.ts` co-located with the component (AC: 1)
  - [ ] Use CSF3 format (Storybook Component Story Format v3)
  - [ ] Export a default `Meta<ComponentType>` object with `component` and `title`
  - [ ] Export at least one named story (`Default`)
  - [ ] Add additional variants (e.g., `Empty`, `Loading`, `Error`) where meaningful
  - [ ] Provide all required `input.required<T>()` / `@Input()` values in each story's `args`
- [ ] Run `pnpm nx run dms-material:build-storybook` after each batch (AC: 1)
  - [ ] Fix any TypeScript compilation errors before continuing
- [ ] Run full validation suite (AC: 1, 2)
  - [ ] `pnpm all`
  - [ ] `pnpm e2e:dms-material:chromium`
  - [ ] `pnpm e2e:dms-material:firefox`
  - [ ] `pnpm dupcheck`
  - [ ] `pnpm format`

## Dev Notes

### Display-Only Component Identification Rules

A component qualifies as **display-only** if ALL of the following are true:
- No `inject(SomeService)` calls inside the component class
- No Angular router usage (`inject(Router)`, `inject(ActivatedRoute)`)
- All data comes in via `input()` signals or `@Input()` decorator
- Actions go out via `output()` signals or `@Output()` EventEmitter

### CSF3 Story Format for Angular (NX @storybook/angular)

```typescript
import type { Meta, StoryObj } from '@storybook/angular';
import { MyComponent } from './my-component.component';

const meta: Meta<MyComponent> = {
  component: MyComponent,
  title: 'Components/MyComponent',
};
export default meta;

type Story = StoryObj<MyComponent>;

export const Default: Story = {
  args: {
    someInput: 'Example value',
    anotherInput: 42,
  },
};

export const Empty: Story = {
  args: {
    someInput: '',
    anotherInput: 0,
  },
};
```

### Signal Inputs in Story Args

The project uses Angular 21 signal-based inputs (`input()` and `input.required<T>()`). Storybook's Angular integration supports signal inputs through `args`. Map each signal input name directly in `args`:

```typescript
// Component uses: myLabel = input.required<string>();
export const Default: Story = {
  args: {
    myLabel: 'Hello World',  // directly map the signal input name
  },
};
```

### Angular 21 + Zoneless Requirements

- The preview must use `provideZonelessChangeDetection()` — ensure `preview.ts` set this up in Story 16.2
- Do NOT use `async` pipe in story templates — use signals
- All component `changeDetection: ChangeDetectionStrategy.OnPush` is required (already enforced by ESLint)

### Story File Location

Story files should be co-located with their component:
```
apps/dms-material/src/app/components/my-component/
  my-component.component.ts
  my-component.component.html
  my-component.component.scss
  my-component.stories.ts     ← create here
```

### Common Angular Material Components to Watch For

The project uses Angular Material 21.2.x. When creating stories for components that rely on Angular Material:
- Import `provideAnimations()` or `provideAnimationsAsync()` in the story's `applicationConfig`
- Include required Angular Material providers

### Dependency Chain

- Depends on: Story 16.2 (Storybook configured with @nx/storybook)
- Enables: Story 16.4 (Playwright visual verification)

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-03-23.md#Story 16.3]
- [Source: _bmad-output/project-context.md#Angular — Critical Rules]
- Storybook CSF3: https://storybook.js.org/docs/writing-stories
- NX Storybook for Angular: https://nx.dev/technologies/test-tools/storybook/angular

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
