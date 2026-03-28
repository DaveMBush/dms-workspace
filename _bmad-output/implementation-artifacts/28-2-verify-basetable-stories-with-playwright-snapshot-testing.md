# Story 28.2: Verify BaseTable Stories with Playwright Snapshot Testing

Status: Approved

## Story

As a developer,
I want Playwright to capture dual-theme snapshots of all BaseTable Storybook stories,
so that any visual regression in `BaseTableComponent` across light and dark themes is automatically detected.

## Acceptance Criteria

1. **Given** the Storybook stories from Story 28.1 (Default, EmptyState, UniverseTableVariation), **When** the Playwright snapshot suite runs, **Then** a light and dark screenshot is captured and stored for each story.
2. **Given** existing baseline snapshots, **When** a future code change alters the visual output of a BaseTable story in either theme, **Then** the snapshot test fails with a diff image.
3. **Given** the `captureStoryInBothThemes` helper from Story 26.2, **When** this story's tests call it, **Then** the helper is reused (not duplicated).
4. **Given** the E2E test file, **When** `pnpm e2e:dms-material:chromium` runs, **Then** all BaseTable snapshot tests pass against their baselines.

## Definition of Done

- [ ] Playwright snapshot tests for all 3 BaseTable stories (Default, EmptyState, UniverseTableVariation)
- [ ] Tests call the `captureStoryInBothThemes` helper from Story 26.2 (no duplication)
- [ ] Baseline snapshot images committed or generated on first run
- [ ] Run `pnpm e2e:dms-material:chromium`
- [ ] Run `pnpm e2e:dms-material:firefox`
- [ ] Run `pnpm format`
- [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Determine Storybook story IDs for BaseTable stories (AC: #1)
  - [ ] After Story 28.1 is complete, look up the generated story IDs
  - [ ] Storybook IDs follow the pattern: `shared-basetable--default`, `shared-basetable--empty-state`, etc. (based on `title` and export name)
- [ ] Write BaseTable snapshot tests (AC: #1, #3)
  - [ ] Create (or add to) `apps/dms-material-e2e/src/storybook-snapshots.spec.ts`
  - [ ] Import `captureStoryInBothThemes` from `../helpers/storybook-theme-snapshot`
  - [ ] Add three snapshot test calls:
    ```typescript
    test('BaseTable Default - both themes', async ({ page }) => {
      await captureStoryInBothThemes(page, 'shared-basetable--default');
    });
    test('BaseTable EmptyState - both themes', async ({ page }) => {
      await captureStoryInBothThemes(page, 'shared-basetable--empty-state');
    });
    test('BaseTable UniverseTableVariation - both themes', async ({ page }) => {
      await captureStoryInBothThemes(page, 'shared-basetable--universe-table-variation');
    });
    ```
- [ ] Validate and update baselines (AC: #4)
  - [ ] Run `pnpm e2e:dms-material:chromium` — on first run, baselines are created
  - [ ] Confirm no test failures; if there are unexpected diffs, investigate and fix the cause

## Dev Notes

### Key Files

- `apps/dms-material-e2e/src/storybook-snapshots.spec.ts` — test file (created/extended in this story)
- `apps/dms-material-e2e/src/helpers/storybook-theme-snapshot.ts` — helper from Story 26.2
- `apps/dms-material/src/app/shared/components/base-table/base-table.stories.ts` — stories from Story 28.1

### Story ID Convention

Storybook auto-generates IDs from the `title` and named exports in the stories file. With `title: 'Shared/BaseTable'` and export `Default`, the ID becomes `shared-basetable--default`. Verify the actual IDs by checking Storybook's sidebar or the story URL after Story 28.1 is deployed/running.

### Dependencies

- Depends on Story 26.2 (dual-theme helper must exist)
- Depends on Story 28.1 (BaseTable stories must exist)
- Depends on Story 26.1 (theme switcher must be configured)

### References

[Source: apps/dms-material-e2e/src/]
[Source: apps/dms-material/src/app/shared/components/base-table/base-table.stories.ts]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
