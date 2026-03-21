# Story 9.1: Diagnose Storybook Default Export Issue

Status: Approved

## Story

As a developer,
I want to understand why Storybook stories are failing with destructure errors,
So that I can implement the correct fix for all affected stories.

## Acceptance Criteria

1. **Given** the Storybook dev server is running
   **When** I navigate to any story
   **Then** I see the error "Cannot destructure property 'id' of 'defaultExport' as it is undefined"
   **And** I can identify the root cause in the story file structure or Storybook configuration

2. **Given** I review the Storybook documentation for Angular + Vite
   **When** I compare the current story format to recommended patterns
   **Then** I can identify the missing or incorrect default export structure
   **And** I have a clear remediation approach for all story files

## Definition of Done

- [ ] Root cause of Storybook errors identified and documented
- [ ] Remediation approach documented for all story files
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Start Storybook dev server and reproduce error (AC: 1)
  - [ ] Run `pnpm storybook` or equivalent command
  - [ ] Navigate to multiple stories to confirm error is consistent
  - [ ] Document the exact error message and stack trace
- [ ] Analyze story file structure (AC: 1)
  - [ ] Examine existing `.stories.ts` files in the codebase
  - [ ] Identify the default export patterns being used
  - [ ] Compare to Storybook configuration in `.storybook/main.ts`
- [ ] Research Storybook CSF 3.0 format for Angular + Vite (AC: 2)
  - [ ] Review official Storybook documentation for Angular
  - [ ] Review Vite builder documentation
  - [ ] Identify correct default export structure for CSF 3.0
- [ ] Document root cause and remediation approach (AC: 2)
  - [ ] Create clear documentation of what's wrong
  - [ ] Provide example of correct vs incorrect export structure
  - [ ] Document step-by-step remediation plan for Story 9.2

## Dev Notes

### Context from Epic 8
- Storybook was set up in Epic 8 (Story 8.1) using `@storybook/angular` with `@analogjs/vite-plugin-angular`
- Stories were created in Story 8.2 (display-only components) and 8.3 (page components)
- Stories were not verified before merging, leading to this error

### Architecture Constraints
- **ADR-001** from architecture.md specifies:
  - Use `@storybook/angular` with `@storybook/builder-vite`
  - Thread `@analogjs/vite-plugin-angular` through `viteFinal` in `.storybook/main.ts`
  - Display-only components pass data directly via `input()` signal values
  - Page components use mock `EffectService` via `applicationConfig`

### Key Files to Examine
- `.storybook/main.ts` - Storybook configuration
- `.storybook/preview.ts` - Story preview configuration
- `apps/dms-material/src/**/*.stories.ts` - All existing story files

### Testing Standards
- This is a diagnostic story - no unit tests required
- Focus on analysis and documentation for implementation in Story 9.2

### Project Structure Notes
- Story files should be colocated with components: `apps/dms-material/src/app/components/**/*.stories.ts`
- Storybook build output: `dist/storybook`

### References
- [Source: _bmad-output/planning-artifacts/epics-2026-03-21.md#Epic 9]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-001]
- [Source: https://storybook.js.org/docs/angular/api/csf]
- [Source: https://storybook.js.org/docs/angular/builders/vite]

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_
