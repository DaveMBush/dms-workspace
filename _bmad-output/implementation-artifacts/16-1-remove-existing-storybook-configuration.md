# Story 16.1: Remove Existing Storybook Configuration

Status: ready-for-dev

## Story

As a developer,
I want to remove the broken Storybook setup that was created in Epics 8 and 9,
So that I can start from a clean state before applying the correct @nx/storybook approach.

## Acceptance Criteria

1. **Given** the current Storybook configuration produced by Epics 8 and 9
   **When** I remove all Storybook-related files, packages, and configuration
   **Then** the `.storybook/` directory in `apps/dms-material/` no longer exists
   **And** all `*.stories.ts` files from the Epic 8/9 implementation are removed
   **And** all `@storybook/*` and `storybook` packages added in Epics 8/9 are removed from `package.json`
   **And** any Storybook-related scripts in `package.json` (e.g., `storybook`, `storybook:build`) are removed
   **And** `pnpm install` completes successfully after package removal

2. **Given** the cleanup is complete
   **When** I run `pnpm all`
   **Then** the build, lint, and unit tests all pass without errors introduced by the removal

## Definition of Done

- [x] All `.storybook/` configuration directories removed
- [x] All `*.stories.ts` files removed
- [x] All Storybook packages removed from `package.json`
- [x] `pnpm install` succeeds
- [x] All validation commands pass:
  - [x] Run `pnpm all`
  - [x] Run `pnpm e2e:dms-material:chromium`
  - [x] Run `pnpm e2e:dms-material:firefox`
  - [x] Run `pnpm dupcheck`
  - [x] Run `pnpm format`
  - [x] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [x] Locate and remove `.storybook/` directory (AC: 1)
  - [x] Check `apps/dms-material/.storybook/` — delete if present
  - [x] Check workspace root `.storybook/` — delete if present
- [x] Find and delete all `*.stories.ts` files (AC: 1)
  - [x] Run: `find apps/dms-material -name "*.stories.ts" -type f`
  - [x] Delete every file found
- [x] Remove Storybook packages from `package.json` (AC: 1)
  - [x] Search `package.json` for any `@storybook/*`, `storybook`, `@nx/storybook` entries
  - [x] Remove them from `dependencies`, `devDependencies`, and `peerDependencies`
  - [x] Also check root `package.json` and `apps/dms-material/package.json` if it exists
- [x] Remove Storybook scripts from `package.json` (AC: 1)
  - [x] Search for keys like `storybook`, `storybook:build`, `build-storybook`
  - [x] Remove them from the `scripts` section
- [x] Check NX project.json for storybook targets (AC: 1)
  - [x] Open `apps/dms-material/project.json`
  - [x] Remove any `storybook` or `build-storybook` target entries
- [x] Run `pnpm install` to sync lockfile (AC: 1)
- [x] Run validation suite (AC: 2)
  - [x] `pnpm all`
  - [x] `pnpm e2e:dms-material:chromium`
  - [x] `pnpm e2e:dms-material:firefox`
  - [x] `pnpm dupcheck`
  - [x] `pnpm format`

## Dev Notes

### Context from Epics 8 and 9

- Epic 8 installed Storybook **without** the `@nx/storybook` NX plugin — this is the root cause of all subsequent failures.
- Epic 9 attempted to fix the "Cannot destructure property 'id' of 'defaultExport' as it is undefined" error but incorrectly diagnosed it as non-occurring. The error still affects every story.
- This story removes everything from Epics 8 and 9 so Epic 16.2 can start fresh.

### Files/Patterns to Search For and Remove

```
apps/dms-material/.storybook/          ← main config directory
apps/dms-material/src/**/*.stories.ts  ← all story files
```

**Packages to remove** (search `package.json`):

```
@storybook/addon-essentials
@storybook/angular
@storybook/blocks
@storybook/core-server
@storybook/manager-api
@storybook/react
@storybook/testing-library
@storybook/theming
storybook
@nx/storybook         ← only if present from prior attempts
```

### Key Files to Check

- Root `package.json` — scripts and devDependencies
- `apps/dms-material/project.json` — NX targets
- `apps/dms-material/.storybook/` — config directory
- All `*.stories.ts` anywhere under `apps/dms-material/src/`

### Previous Story Reference

- See `8-1-install-and-configure-storybook.md` and `9-1-diagnose-storybook-default-export-issue.md` for details of what was installed.

### Project Structure Notes

- Monorepo managed by NX 22.5.4 with pnpm 10.x
- Frontend app is at `apps/dms-material/`
- Angular 21, standalone components, zoneless change detection

### References

- [Source: _bmad-output/planning-artifacts/epics-2026-03-23.md#Epic 16]
- [Source: _bmad-output/implementation-artifacts/8-1-install-and-configure-storybook.md]
- [Source: _bmad-output/implementation-artifacts/9-1-diagnose-storybook-default-export-issue.md]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

### Completion Notes List

### File List
