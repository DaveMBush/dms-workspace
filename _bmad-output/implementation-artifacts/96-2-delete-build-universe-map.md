# Story 96.2: Delete buildUniverseMap and Remove All Remaining References

Status: Approved

## Story

As a developer,
I want to delete `apps/dms-material/src/app/shared/build-universe-map.function.ts` and
remove all remaining imports or references to `buildUniverseMap` in the codebase,
So that the dead-code function and its dependency on the universe store are permanently
eliminated.

## Acceptance Criteria

1. **Given** Epics 94, 95, and 96.1 are complete (i.e., `buildUniverseMap` is no longer
   called from `dividend-deposits-component.service.ts`, `open-positions-component.service.ts`,
   or `sold-positions-component.service.ts`),
   **When** a repository-wide search for `buildUniverseMap` is performed,
   **Then** the only remaining occurrence is the function definition file itself.

2. **Given** `build-universe-map.function.ts` is deleted,
   **When** `pnpm all` runs,
   **Then** there are no TypeScript compilation errors referencing the deleted file.

3. **Given** a companion spec file for `buildUniverseMap` exists (e.g.,
   `build-universe-map.function.spec.ts`),
   **When** the source file is deleted,
   **Then** the spec file is also deleted.

4. **Given** the deletion is complete,
   **When** the Playwright E2E suite runs (`pnpm e2e:dms-material:chromium` and
   `pnpm e2e:dms-material:firefox`),
   **Then** all tests pass, confirming that dividend-deposits, open-positions, and
   sold-positions panels still display correctly without the universe map.

## Tasks / Subtasks

- [ ] Task 1: Verify prerequisites are met
  - [ ] Confirm Stories 94.2, 95.2, and 96.1 are complete (status: done in sprint-status.yaml)
  - [ ] Search codebase for all references to `buildUniverseMap` using grep or workspace search
  - [ ] Confirm only `build-universe-map.function.ts` (and its spec, if any) reference `buildUniverseMap`

- [ ] Task 2: Delete the function and its spec
  - [ ] Delete `apps/dms-material/src/app/shared/build-universe-map.function.ts`
  - [ ] Delete `apps/dms-material/src/app/shared/build-universe-map.function.spec.ts` (if it exists)
  - [ ] If `buildUniverseMap` is exported from a shared barrel file (`index.ts`), remove the export

- [ ] Task 3: Verify no TypeScript errors
  - [ ] Run `pnpm nx build dms-material` or `pnpm tsc` to confirm zero compilation errors
  - [ ] Run `pnpm all` to confirm all tests pass

- [ ] Task 4: E2E verification
  - [ ] `pnpm e2e:dms-material:chromium` passes
  - [ ] `pnpm e2e:dms-material:firefox` passes

## Dev Notes

### Files to Delete

```
apps/dms-material/src/app/shared/build-universe-map.function.ts
apps/dms-material/src/app/shared/build-universe-map.function.spec.ts  (if present)
```

### Current `buildUniverseMap` Location

```
apps/dms-material/src/app/shared/build-universe-map.function.ts
```

The function creates a `Map<string, Universe>` from the universe store using SmartNgRX
`selectUniverses()` and `getIdAtIndex()`. It is a `computed` signal created at module scope.

### Sequencing Requirement

This is the LAST story in the five-epic sequence. It must only be executed after:
1. Epic 94, Story 94.2: DivDeposit client no longer calls `buildUniverseMap`
2. Epic 95, Story 95.2: Open positions client no longer calls `buildUniverseMap`
3. Epic 96, Story 96.1: Sold positions client no longer calls `buildUniverseMap`

Before deleting, verify with a workspace-wide search that no other callers were missed.

### Barrel File Note

If `build-universe-map.function.ts` is re-exported from a shared index/barrel file
(e.g., `apps/dms-material/src/app/shared/index.ts`), remove that export line as well.

### Test Scope

No new tests required. Validation is through TypeScript compilation + full `pnpm all` +
Playwright E2E.

## Dev Agent Record

### Agent Notes

_To be filled in during implementation._

## File List

_To be populated during implementation._

## Change Log

_To be populated during implementation._
