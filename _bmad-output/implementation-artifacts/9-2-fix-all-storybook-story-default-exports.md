# Story 9.2: Fix All Storybook Story Default Exports

Status: Approved

## Story

As a developer,
I want all Storybook stories to render without errors,
So that visual regression testing and component isolation development can proceed.

## Acceptance Criteria

1. **Given** all story files in the codebase
   **When** I apply the correct default export structure
   **Then** all stories render without destructuring errors
   **And** each story displays its component with the specified props

2. **Given** the Storybook build runs successfully
   **When** I run `pnpm storybook:build`
   **Then** the build completes without errors
   **And** the static build is created in `dist/storybook`

3. **Given** I use the Playwright MCP server
   **When** I verify each story renders correctly
   **Then** all stories display their components properly
   **And** no console errors appear in the browser

## Definition of Done

- [ ] All Storybook story default exports fixed
- [ ] `pnpm storybook:build` completes without errors
- [ ] All stories verified with Playwright MCP server
- [ ] No console errors in any story
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Find all story files in the codebase (AC: 1)
  - [ ] Search for `*.stories.ts` files in `apps/dms-material/src`
  - [ ] Create list of all story files to fix
- [ ] Apply remediation from Story 9.1 to all story files (AC: 1)
  - [ ] Update default export structure in each story file
  - [ ] Ensure meta object has correct `title`, `component`, and `id` properties
  - [ ] Verify named exports for each story variant
- [ ] Verify stories render in dev mode (AC: 1)
  - [ ] Run `pnpm storybook`
  - [ ] Manually check multiple stories render without errors
  - [ ] Check browser console for any warnings or errors
- [ ] Test Storybook build (AC: 2)
  - [ ] Run `pnpm storybook:build`
  - [ ] Verify build completes successfully
  - [ ] Verify `dist/storybook` directory is created
  - [ ] Serve static build and spot-check stories
- [ ] Use Playwright MCP server for comprehensive verification (AC: 3)
  - [ ] Load Storybook in Playwright browser
  - [ ] Navigate to each story programmatically
  - [ ] Capture screenshots to verify rendering
  - [ ] Check for console errors in each story
  - [ ] Document any remaining issues

## Dev Notes

### Dependencies

- Requires Story 9.1 to be complete with documented remediation approach

### Architecture Constraints

- **ADR-001** specifies Storybook setup with Angular + Vite + @analogjs
- Stories must follow CSF 3.0 format with proper default exports
- Meta object structure: `{ title: string, component: Type, id?: string }`

### Common Fixes Expected

Based on typical Storybook CSF 3.0 migration issues:

```typescript
// Incorrect - causes destructure error
export default {
  component: MyComponent,
};

// Correct - CSF 3.0 format
import type { Meta, StoryObj } from '@storybook/angular';
import { MyComponent } from './my-component';

const meta: Meta<MyComponent> = {
  title: 'Components/MyComponent',
  component: MyComponent,
};

export default meta;
type Story = StoryObj<MyComponent>;

export const Default: Story = {
  args: {
    // component inputs
  },
};
```

### Key Files to Modify

All files matching: `apps/dms-material/src/**/*.stories.ts`

### Verification with Playwright MCP Server

- Use `mcp_microsoft_pla_browser_navigate` to load Storybook
- Use `mcp_microsoft_pla_browser_snapshot` to capture story states
- Use `mcp_microsoft_pla_browser_console_messages` to check for errors

### Project Structure Notes

- Maintain story file colocation with components
- Storybook configuration in `.storybook/` should not need changes (fixed in Story 8.1)

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-03-21.md#Story 9.2]
- [Source: _bmad-output/implementation-artifacts/9-1-diagnose-storybook-default-export-issue.md]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-001]
- [Source: https://storybook.js.org/docs/angular/api/csf]

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent_
