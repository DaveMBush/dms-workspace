# Story 16.2: Install and Configure Storybook via @nx/storybook

Status: ready-for-dev

## Story

As a developer,
I want to install and configure Storybook for `dms-material` using the `@nx/storybook` plugin and NX generator,
So that Storybook is set up the correct way for an NX monorepo and the dev server starts without errors.

## Acceptance Criteria

1. **Given** a clean state after Story 16.1
   **When** I run the `@nx/storybook` generator to configure Storybook for the `dms-material` project
   **Then** the generator creates the correct `.storybook/` configuration directory within the NX project
   **And** the NX project configuration (`project.json`) is updated with `storybook` and `build-storybook` targets
   **And** the correct `@storybook/angular` (or `@nx/storybook`) packages are added to `package.json`

2. **Given** the @nx/storybook configuration is in place
   **When** I run `pnpm nx run dms-material:storybook` (or the equivalent NX target)
   **Then** the Storybook dev server starts without errors
   **And** the Storybook UI is accessible in a browser (verified via Playwright MCP)
   **And** no "Cannot destructure property 'id'" or related import errors appear in the browser console

3. **Given** the initial Storybook configuration
   **When** I run `pnpm nx run dms-material:build-storybook`
   **Then** a static Storybook bundle is produced without build errors

## Definition of Done

- [ ] `@nx/storybook` generator run and configuration committed
- [ ] `pnpm nx run dms-material:storybook` starts without errors
- [ ] Storybook UI accessible in browser — verified via Playwright MCP server
- [ ] No console errors on the Storybook welcome/index page
- [ ] `pnpm nx run dms-material:build-storybook` completes without errors
- [ ] All validation commands pass:
  - [ ] Run `pnpm all`
  - [ ] Run `pnpm e2e:dms-material:chromium`
  - [ ] Run `pnpm e2e:dms-material:firefox`
  - [ ] Run `pnpm dupcheck`
  - [ ] Run `pnpm format`
  - [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Verify Story 16.1 is complete — no `.storybook/` dir or `*.stories.ts` files remain (AC: 1)
- [ ] Add `@nx/storybook` to the workspace (AC: 1)
  - [ ] Run: `pnpm nx add @nx/storybook`
  - [ ] Verify it installs without conflicts
- [ ] Run the NX Storybook generator for `dms-material` (AC: 1)
  - [ ] Run: `pnpm nx g @nx/storybook:configuration dms-material --uiFramework=@storybook/angular --interactionTests=false`
  - [ ] Review what files were generated
  - [ ] Confirm `.storybook/` created inside `apps/dms-material/`
  - [ ] Confirm `project.json` updated with `storybook` and `build-storybook` targets
- [ ] Verify generated configuration is correct for Angular standalone + zoneless (AC: 1, 2)
  - [ ] Open `apps/dms-material/.storybook/main.ts` — confirm framework is `@storybook/angular`
  - [ ] Open `apps/dms-material/.storybook/preview.ts` — confirm no zone-requiring imports
- [ ] Start Storybook dev server and verify via Playwright MCP (AC: 2)
  - [ ] Run: `pnpm nx run dms-material:storybook`
  - [ ] Use Playwright MCP to open browser, navigate to `http://localhost:6006`
  - [ ] Confirm Storybook UI loads (not blank, not error screen)
  - [ ] Check browser console — zero errors
- [ ] Build static Storybook bundle (AC: 3)
  - [ ] Run: `pnpm nx run dms-material:build-storybook`
  - [ ] Confirm no build errors
- [ ] Run validation suite
  - [ ] `pnpm all`
  - [ ] `pnpm e2e:dms-material:chromium`
  - [ ] `pnpm e2e:dms-material:firefox`
  - [ ] `pnpm dupcheck`
  - [ ] `pnpm format`

## Dev Notes

### Why @nx/storybook Is Required

The official NX documentation states that `@nx/storybook` is the prescribed integration for Storybook in NX monorepos. The previous setup (Epics 8 and 9) installed Storybook directly without the NX plugin, causing the "Cannot destructure property 'id' of 'defaultExport' as it is undefined" error on every story.

Reference: https://nx.dev/docs/technologies/test-tools/storybook/introduction

### Angular Standalone + Zoneless Considerations

The app uses Angular 21 with zoneless change detection (`provideZonelessChangeDetection()`). When the NX generator creates the Storybook preview, ensure:

- `preview.ts` does NOT import Zone.js
- The Angular application config used in stories must include `provideZonelessChangeDetection()`
- If the generator adds zone.js imports, remove them

### Generator Command Reference

```bash
# Install the plugin
pnpm nx add @nx/storybook

# Run the configuration generator
pnpm nx g @nx/storybook:configuration dms-material \
  --uiFramework=@storybook/angular \
  --interactionTests=false

# Start dev server
pnpm nx run dms-material:storybook

# Build static bundle
pnpm nx run dms-material:build-storybook
```

### NX Project Structure

- App lives at: `apps/dms-material/`
- NX project config: `apps/dms-material/project.json`
- Generated Storybook config should be at: `apps/dms-material/.storybook/`
- Monorepo NX version: 22.5.4

### Angular Module Context

- All components are standalone (`standalone: true` is the Angular 21 default, no declaration needed)
- No NgModules exist — do not create any
- Use `inject()` for DI, never constructor injection
- Components use `ChangeDetectionStrategy.OnPush`

### Dependency Chain

- Depends on: Story 16.1 (complete removal of old Storybook setup)
- Enables: Story 16.3 (creating stories) and Story 16.4 (Playwright verification)

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-03-23.md#Story 16.2]
- [Source: _bmad-output/project-context.md#Technology Stack]
- NX Storybook docs: https://nx.dev/docs/technologies/test-tools/storybook/introduction

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
