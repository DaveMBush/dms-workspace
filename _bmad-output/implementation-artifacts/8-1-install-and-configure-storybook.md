# Story 8.1: Install and Configure Storybook

Status: ready-for-dev

## Story

As a developer,
I want Storybook installed and configured for the Angular `dms-material` project,
so that stories can be created and the Storybook dev server starts without errors.

## Acceptance Criteria

1. **Given** the current Angular 21 + Vite setup in `dms-material`,
   **When** I install `@storybook/angular` (or the appropriate Storybook 8 Angular package) and run `pnpm storybook`,
   **Then** the Storybook server starts on a local port and displays the default welcome story.

2. **And** the Storybook configuration is committed (`.storybook/` folder, `package.json` script updates).

3. **And** Storybook does not interfere with the existing `pnpm all` or E2E test commands.

## Tasks / Subtasks

- [ ] Install Storybook packages (AC: 1)
  - [ ] Install `@storybook/angular` (Storybook 8)
  - [ ] Install `@storybook/builder-vite`
  - [ ] Install any other required Storybook dependencies
  - [ ] Run `pnpm install` and resolve peer dependency conflicts
- [ ] Configure `.storybook/` directory (AC: 1, 2)
  - [ ] Create `apps/dms-material/.storybook/main.ts`
    - [ ] Configure Vite builder via `@storybook/builder-vite`
    - [ ] Thread `@analogjs/vite-plugin-angular` through `viteFinal` — do NOT re-register independently
    - [ ] Set stories glob to pick up `*.stories.ts` files co-located with components
  - [ ] Create `apps/dms-material/.storybook/preview.ts`
    - [ ] Add global decorators (BrowserAnimationsModule or provideAnimations)
    - [ ] Configure theme providers if needed
  - [ ] Create `apps/dms-material/.storybook/tsconfig.json`
    - [ ] Extend root tsconfig
    - [ ] Include stories glob pattern
- [ ] Add package.json scripts (AC: 2)
  - [ ] `pnpm storybook` — start Storybook dev server
  - [ ] `pnpm storybook:build` — build static Storybook bundle
  - [ ] Output directory: `dist/storybook/` (gitignore this)
- [ ] Create a default welcome story (AC: 1)
  - [ ] Create a simple story to verify the setup works
  - [ ] Verify Storybook dev server starts and displays the story
- [ ] Verify no interference with existing commands (AC: 3)
  - [ ] `pnpm all` still passes
  - [ ] `pnpm e2e:dms-material:chromium` still passes
  - [ ] `pnpm e2e:dms-material:firefox` still passes
  - [ ] Storybook files excluded from lint/test targets if they cause issues

## Dev Notes

### Architecture Constraints (ADR-001)

- Use `@storybook/angular` with `@storybook/builder-vite`
- Thread `@analogjs/vite-plugin-angular` through `viteFinal` in `.storybook/main.ts` — do NOT re-register independently
- CI strategy: Static build → serve → Playwright (never run against live dev server)
- Static bundle output: `dist/storybook/` (gitignored, CI artifact)

### Storybook Directory Structure

```
apps/dms-material/
  .storybook/
    main.ts                    # Vite builder config + Angular plugin
    preview.ts                 # Global decorators, BrowserAnimationsModule
    tsconfig.json              # Extends root, includes stories glob
  src/
    app/
      {feature}/
        {component}/
          {component}.stories.ts    # Co-located with components
```

### Story File Naming Convention

```
{ComponentName}.stories.ts          # co-located with component
title: '{Feature}/{ComponentName}'  # e.g. 'Holdings/HoldingsTableComponent'
story export name: PascalCase        # e.g. Default, DarkTheme, EmptyState
```

### Existing Technology Stack

| Layer   | Technology                           | Version                      |
| ------- | ------------------------------------ | ---------------------------- |
| Angular | Standalone, zoneless                 | 21.2.x                       |
| Build   | Vite + @analogjs/vite-plugin-angular | 7.x / 2.1.x                  |
| UI      | Angular Material + CDK               | 21.2.x                       |
| CSS     | Tailwind CSS                         | 3.4.1 (or v4 if E6 complete) |

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 8, Story 8.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR-001]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — Storybook]

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
