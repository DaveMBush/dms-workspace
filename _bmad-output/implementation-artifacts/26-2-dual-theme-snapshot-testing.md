# Story 26.2: Dual-Theme Snapshot Testing

Status: Approved

## Story

As a developer,
I want Playwright to capture snapshot screenshots of each Storybook story in both light and dark themes,
so that visual regressions in either theme are automatically detected in CI.

## Acceptance Criteria

1. **Given** a Storybook story, **When** the dual-theme Playwright snapshot test runs, **Then** two screenshots are captured: `{story-id}-light.png` and `{story-id}-dark.png`.
2. **Given** both screenshots exist as baseline snapshots, **When** a future run detects a pixel difference in either theme, **Then** the test fails with a diff image showing the change.
3. **Given** the Storybook theme switcher from Story 26.1, **When** Playwright switches themes, **Then** the correct CSS class is applied before the screenshot is taken (no race condition).
4. **Given** the snapshot test suite, **When** `pnpm e2e:dms-material:chromium` runs, **Then** all snapshot tests execute and pass against their baselines.
5. **Given** the first run (no baselines), **When** the test executes, **Then** it creates the baseline images and passes (standard Playwright snapshot update behavior).

## Definition of Done

- [ ] Playwright dual-theme snapshot helper/fixture written
- [ ] At least the `BaseTable` story (from Story 28) captured in both themes
- [ ] Snapshot files committed to repository (or documented path for CI)
- [ ] Test structure allows easy addition of new stories to dual-theme coverage
- [ ] Run `pnpm e2e:dms-material:chromium`
- [ ] Run `pnpm e2e:dms-material:firefox`
- [ ] Run `pnpm format`
- [ ] Repeat all of these if any fail until they all pass

## Tasks / Subtasks

- [ ] Create dual-theme snapshot helper (AC: #1, #3)
  - [ ] In `apps/dms-material-e2e/src/` add `helpers/storybook-theme-snapshot.ts`
  - [ ] Export function `captureStoryInBothThemes(page: Page, storyId: string)`:
    - Navigate to Storybook URL for `storyId` with light theme class applied
    - Wait for network idle / stable render
    - Take screenshot → save as `{storyId}-light.png`
    - Apply dark theme class (e.g., via `page.evaluate()` to toggle the CSS class)
    - Wait for render
    - Take screenshot → save as `{storyId}-dark.png`
- [ ] Write initial snapshot test file (AC: #4, #5)
  - [ ] Create `apps/dms-material-e2e/src/storybook-snapshots.spec.ts`
  - [ ] Call `captureStoryInBothThemes` for a baseline set of stories (e.g., BaseTable default story)
  - [ ] Use `expect(image).toMatchSnapshot({ name: '{storyId}-light.png' })` pattern
- [ ] Determine Storybook URL scheme for iframe navigation (AC: #3)
  - [ ] Confirm the URL pattern: `http://localhost:6006/iframe.html?id={story-id}&viewMode=story`
  - [ ] Confirm theme toggling approach (URL param vs. CSS class applied by Playwright)
- [ ] Validate (AC: #4)
  - [ ] Run `pnpm e2e:dms-material:chromium` — ensure snapshot tests pass (or create baselines)

## Dev Notes

### Key Files

- `apps/dms-material-e2e/src/` — Playwright test directory
- `apps/dms-material-e2e/src/helpers/storybook-theme-snapshot.ts` — NEW helper file
- `apps/dms-material-e2e/src/storybook-snapshots.spec.ts` — NEW test file
- `apps/dms-material/.storybook/preview.ts` — theme class names (reference from Story 26.1)

### Playwright Snapshot Pattern

```typescript
import { expect, Page } from '@playwright/test';

export async function captureStoryInBothThemes(page: Page, storyId: string) {
  const baseUrl = `http://localhost:6006/iframe.html?id=${storyId}&viewMode=story`;

  // Light theme
  await page.goto(`${baseUrl}&globals=theme:Light`); // adjust param per addon config
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot(`${storyId}-light.png`);

  // Dark theme
  await page.goto(`${baseUrl}&globals=theme:Dark`);
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot(`${storyId}-dark.png`);
}
```

Adjust `globals` parameter based on how `@storybook/addon-themes` exposes the theme switcher in the URL.

### Dependencies

- Depends on Story 26.1 (theme switcher must be configured before snapshots can switch themes)
- Story 28.2 will use the helper from this story for BaseTable stories

### References

[Source: apps/dms-material-e2e/src/]
[Source: apps/dms-material/.storybook/preview.ts]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
