# Story 8.3: Create Stories for Full Pages with Mocked Data

Status: ready-for-dev

## Story

As a developer,
I want a Storybook story for each full page component with its data dependencies mocked,
so that pages can be visually tested without a running backend.

## Acceptance Criteria

1. **Given** each routed page component in `dms-material`,
   **When** I create a story that provides mocked SmartNgRX store data and/or Angular service stubs,
   **Then** the page renders fully (no blank screens, no unhandled injection errors) in Storybook.

2. **And** both light-mode and dark-mode variants are included in each page story.

## Tasks / Subtasks

- [ ] Identify all routed page components (AC: 1)
  - [ ] Scan `apps/dms-material/src/app/app.routes.ts` for all `loadComponent` references
  - [ ] List each page component with its route and required services/store entities
  - [ ] Document data dependencies for each page
- [ ] Create mock services for each page (AC: 1)
  - [ ] Use mock `EffectService` via `applicationConfig` — mirrors TestBed unit test pattern
  - [ ] `provideSmartFeatureSignalEntities()` cannot be used — requires live Angular Router context
  - [ ] Reuse existing mock factories from `apps/dms-material/src/test-utils/` where available
  - [ ] Create new mock services only where existing ones are insufficient
- [ ] Create story files for each page (AC: 1, 2)
  - [ ] For each page, create a co-located `{page}.stories.ts`
  - [ ] Use `applicationConfig` decorator to provide mocked services
  - [ ] Include light-mode variant
  - [ ] Include dark-mode variant (apply `.dark-theme` class in decorator)
  - [ ] Ensure no blank screens or unhandled injection errors
- [ ] Verify all pages render (AC: 1)
  - [ ] Start Storybook dev server
  - [ ] Navigate to each page story and verify it renders with data
  - [ ] Verify both light and dark mode variants render
- [ ] Build verification (AC: 1, 2)
  - [ ] `pnpm storybook:build` succeeds without errors
  - [ ] `pnpm all` passes

## Dev Notes

### Architecture Constraints (ADR-001)

- Page components: use mock `EffectService` via `applicationConfig`, mirroring TestBed unit test pattern
- `provideSmartFeatureSignalEntities()` CANNOT be used directly — it requires a live Angular Router context
- MSW (Mock Service Worker) deferred unless a specific page component cannot be stubbed via EffectService
- Both light and dark mode variants required for every page story

### Mock Provider Pattern (REQUIRED)

```typescript
import { applicationConfig } from '@storybook/angular';

export const Default: Story = {
  decorators: [
    applicationConfig({
      providers: [
        { provide: MyEffectService, useClass: MockMyEffectService },
      ],
    }),
  ],
};
```

**WRONG — never use:**
```typescript
import { TestBed } from '@angular/core/testing'; // NEVER in stories
```

### Page Components (Likely Candidates)

| Page | Route | Key Dependencies |
|------|-------|-----------------|
| Dashboard | `/dashboard` | SmartNgRX store entities |
| Accounts | `/accounts` | Account entities, trades |
| CUSIP Cache | `/global/cusip-cache` | CUSIP cache service |
| Global Screener | `/global/screener` | Screener entities |
| Global Universe | `/global/universe` | Universe entities |
| Global Error Logs | `/global/error-logs` | Error log data |

### Dark Mode Decorator

Apply `.dark-theme` class to the story wrapper for dark mode variants:
```typescript
export const DarkMode: Story = {
  decorators: [
    // Apply dark-theme class to wrapper element
  ],
};
```

### Existing Test Utils

Check `apps/dms-material/src/test-utils/` for reusable mock factories:
- `createMockConfirmDialogService()`
- `createMockMatDialog()`
- Other mock service factories

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 8, Story 8.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-001]
- [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns — E8 mock provider pattern]
- [Source: _bmad-output/project-context.md#State Management — SmartNgRX]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
